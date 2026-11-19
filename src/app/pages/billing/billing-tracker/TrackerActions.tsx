import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Popover, Stack, TextField, Tooltip, Typography, alpha } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, toast } from "@app/modules/common/components/ui";
import ActionIconButton from "@app/modules/common/components/ui/ActionIconButton";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import { TaskFormDialog } from "@app/pages/employee/tasks/components/TaskFormDialog";
import { apiErrorMessage } from "@app/pages/employee/tasks/taskDomain";
import { formatDate } from "@utils/dateFormats";
import {
  BILLING_NOTE_MAX, linkTrackerTask, listTrackerTasks, setBillingTrackerFields, type BillingTrackerRow,
} from "@services/billingTrackers";

/**
 * The Bill Status sheet's Action column: one shared NOTE per project and the GENERAL tasks raised from the row.
 *
 * Tasks are GENERAL on purpose: a project task can only be created by the project's managers, and the people working
 * this sheet are usually accounts, not them. The task is created through the normal task dialog (its own rules and
 * notifications), then linked to the row so the row can count and list it.
 *
 * The dialogs live once on the page (`useTrackerActions`), not once per row — a 25-row page would otherwise mount 25
 * task forms.
 */

export const ACTION_COLUMN_WIDTH = 300;

type Row = Pick<BillingTrackerRow, "leadId" | "projectNumber" | "projectName" | "billingNote" | "taskCount">;

const subtitleOf = (row: Row) => [row.projectNumber, row.projectName].filter(Boolean).join(" · ") || "Project";

// ─── The cell ────────────────────────────────────────────────────────────────

interface ActionsCellProps {
  row: Row;
  onNote: (row: Row) => void;
  onTasks: (row: Row, anchor: HTMLElement | null) => void;
}

export const TrackerActionsCell: React.FC<ActionsCellProps> = ({ row, onNote, onTasks }) => {
  const note = row.billingNote || "";
  const count = row.taskCount || 0;
  return (
    // The row navigates to the project on click; nothing in this cell should.
    // One control per job: an empty row shows two quiet icons and no placeholder text (it repeated on
    // every row); a set note IS its own edit button, and a task count IS the way into the list.
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      onClick={(e) => e.stopPropagation()}
      sx={{ width: ACTION_COLUMN_WIDTH - 20, minWidth: 0 }}
    >
      {count ? (
        <Tooltip title="View tasks or add another" placement="top">
          <Box
            component="button"
            type="button"
            onClick={(e: React.MouseEvent<HTMLElement>) => onTasks(row, e.currentTarget)}
            aria-label={`${count} task${count > 1 ? "s" : ""}. View or add`}
            sx={(t) => ({
              ...PILL, flexShrink: 0, gap: 0.5, color: "success.main", fontWeight: 700,
              bgcolor: alpha(t.palette.success.main, 0.1), borderColor: alpha(t.palette.success.main, 0.3),
              "&:hover": { bgcolor: alpha(t.palette.success.main, 0.18) },
            })}
          >
            <KTIcon iconName="check-square" className="fs-6" />
            {count} task{count > 1 ? "s" : ""}
          </Box>
        </Tooltip>
      ) : (
        <ActionIconButton size="sm" tone="success" iconName="check-square" title="Assign a task" onClick={() => onTasks(row, null)} />
      )}

      {note ? (
        <Tooltip title={note} placement="top-start" enterDelay={300}>
          <Box
            component="button"
            type="button"
            onClick={() => onNote(row)}
            aria-label={`Note: ${note}. Edit note`}
            sx={(t) => ({
              ...PILL, flex: 1, minWidth: 0, gap: 0.75, justifyContent: "space-between", textAlign: "left",
              color: "text.primary", fontWeight: 500,
              bgcolor: alpha(t.palette.warning.main, 0.1), borderColor: alpha(t.palette.warning.main, 0.35),
              "&:hover": { bgcolor: alpha(t.palette.warning.main, 0.18) },
              "& .note-edit": { opacity: 0.55 }, "&:hover .note-edit": { opacity: 1 },
            })}
          >
            {/* Two lines at most, so a long note never sets the row's height; the whole text is on the tooltip. */}
            <Box component="span" sx={{
              minWidth: 0, whiteSpace: "normal", lineHeight: 1.35,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {note}
            </Box>
            <KTIcon iconName="pencil" className="fs-7 note-edit" />
          </Box>
        </Tooltip>
      ) : (
        <ActionIconButton size="sm" iconName="notepad-edit" title="Add note" onClick={() => onNote(row)} />
      )}
    </Stack>
  );
};

/** The shared shape of the task chip and the note pill — same height as the kit's small action button. */
const PILL = {
  display: "inline-flex", alignItems: "center", minHeight: 30, px: 1.25, py: 0.5,
  border: "1px solid", borderRadius: "8px", cursor: "pointer", fontSize: 12.5, fontFamily: "inherit",
  transition: "background-color 0.15s ease",
} as const;

// ─── Note dialog ─────────────────────────────────────────────────────────────

const NoteDialog: React.FC<{ row: Row | null; onClose: () => void; onSaved: () => void }> = ({ row, onClose, onSaved }) => {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(row?.billingNote || ""), [row]);

  const save = async (value: string) => {
    if (!row) return;
    setSaving(true);
    try {
      await setBillingTrackerFields(row.leadId, { billingNote: value.trim() || null });
      toast({ icon: "success", title: value.trim() ? "Note saved" : "Note cleared", timer: 1800 });
      onSaved();
      onClose();
    } catch (e) {
      toast({ icon: "error", title: "Could not save the note", text: apiErrorMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassDialog
      open={!!row}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      header={
        <GlassHeader
          title="Note"
          subtitle={row ? subtitleOf(row) : ""}
          icon={<KTIcon iconName="notepad-edit" className="fs-1" />}
          onClose={saving ? undefined : onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Client asked to resend the invoice to their accounts team"
          inputProps={{ "aria-label": "Note", maxLength: BILLING_NOTE_MAX }}
        />
        <Typography sx={{ mt: 0.75, fontSize: 12, color: "text.secondary", textAlign: "right" }}>
          {text.length} / {BILLING_NOTE_MAX}
        </Typography>
      </Box>
      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        spacing={1}
        justifyContent="flex-end"
        sx={{ px: 2.5, py: 1.75, borderTop: "1px solid", borderColor: "divider" }}
      >
        {row?.billingNote ? (
          <WtButton tone="danger" ghost onClick={() => save("")} disabled={saving} sx={{ mr: { sm: "auto" } }}>
            clear note
          </WtButton>
        ) : null}
        <WtButton ghost onClick={onClose} disabled={saving}>cancel</WtButton>
        <WtButton
          onClick={() => save(text)}
          disabled={saving || text.trim() === (row?.billingNote || "")}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ minWidth: 120 }}
        >
          {saving ? "saving…" : "save note"}
        </WtButton>
      </Stack>
    </GlassDialog>
  );
};

// ─── Task list popover ───────────────────────────────────────────────────────

const TasksPopover: React.FC<{
  row: Row | null; anchor: HTMLElement | null; onClose: () => void; onAdd: (row: Row) => void;
}> = ({ row, anchor, onClose, onAdd }) => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["billing-tracker-tasks", row?.leadId],
    queryFn: () => listTrackerTasks(row!.leadId),
    enabled: !!row && !!anchor,
  });

  return (
    <Popover
      open={!!row && !!anchor}
      anchorEl={anchor}
      onClose={onClose}
      onClick={(e) => e.stopPropagation()}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{ paper: { sx: { width: 360, maxWidth: "calc(100vw - 32px)", borderRadius: 2 } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Tasks</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>{row ? subtitleOf(row) : ""}</Typography>
        </Box>
        <WtButton onClick={() => { if (row) onAdd(row); onClose(); }}>+ add task</WtButton>
      </Stack>
      <Box sx={{ maxHeight: 320, overflowY: "auto", py: 0.5 }}>
        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={20} /></Stack>
        ) : tasks.length === 0 ? (
          <Typography sx={{ px: 2, py: 2, fontSize: 13, color: "text.secondary" }}>No open tasks.</Typography>
        ) : (
          tasks.map((t) => (
            <Box
              key={t.id}
              component="button"
              type="button"
              onClick={() => navigate(`/tasks/${t.id}`)}
              sx={{
                display: "block", width: "100%", textAlign: "left", border: 0, background: "none",
                px: 2, py: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                  {t.taskNo ? `#${t.taskNo} ` : ""}{t.taskName}
                </Typography>
                {t.status?.name ? <SolidChip label={t.status.name} color={t.status.color} /> : null}
              </Stack>
              <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.25 }}>
                {[t.assigneeName, t.dueDate ? `Due ${formatDate(t.dueDate)}` : null].filter(Boolean).join(" · ") || "Unassigned"}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Popover>
  );
};

// ─── Page wiring ─────────────────────────────────────────────────────────────

/** One set of dialogs for the whole page, and the handlers each row's cell calls. */
export const useTrackerActions = () => {
  const queryClient = useQueryClient();
  const [noteRow, setNoteRow] = useState<Row | null>(null);
  const [listRow, setListRow] = useState<{ row: Row; anchor: HTMLElement } | null>(null);
  const [taskRow, setTaskRow] = useState<Row | null>(null);

  const refresh = (leadId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["billing-tracker"] });
    if (leadId) void queryClient.invalidateQueries({ queryKey: ["billing-tracker-tasks", leadId] });
  };

  const onNote = (row: Row) => setNoteRow(row);
  const onTasks = (row: Row, anchor: HTMLElement | null) => (anchor ? setListRow({ row, anchor }) : setTaskRow(row));

  const onTaskSaved = async (saved?: { id: string } | null) => {
    const row = taskRow;
    if (!row || !saved?.id) return;
    try {
      await linkTrackerTask(row.leadId, saved.id);
    } catch (e) {
      // The task exists; only the row link failed. Say so rather than implying the task was lost.
      toast({ icon: "warning", title: "Task created, but not linked to this row", text: apiErrorMessage(e, "Please try again.") });
    }
    refresh(row.leadId);
  };

  const dialogs = (
    <>
      <NoteDialog row={noteRow} onClose={() => setNoteRow(null)} onSaved={() => refresh()} />
      <TasksPopover
        row={listRow?.row ?? null}
        anchor={listRow?.anchor ?? null}
        onClose={() => setListRow(null)}
        onAdd={(row) => setTaskRow(row)}
      />
      <TaskFormDialog
        open={!!taskRow}
        onClose={() => setTaskRow(null)}
        onSaved={onTaskSaved}
        defaultScope="GENERAL"
      />
    </>
  );

  return { onNote, onTasks, dialogs };
};
