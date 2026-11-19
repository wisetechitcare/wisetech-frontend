import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Pencil, SquareCheckBig } from "lucide-react";
import { Button, buttonVariants } from "@/ds/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ds/ui/popover";
import { Spinner } from "@/ds/ui/spinner";
import { Textarea } from "@/ds/ui/textarea";
import { FormDialog } from "@/ds/patterns/form-dialog";
import { cn } from "@/ds/lib/utils";
import { toast } from "@app/modules/common/components/ui";
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
 * task forms. The task LIST is a popover per row that has tasks; its body (and its query) only exists while open.
 */

export const ACTION_COLUMN_WIDTH = 300;

type Row = Pick<BillingTrackerRow, "leadId" | "projectNumber" | "projectName" | "billingNote" | "taskCount">;

const subtitleOf = (row: Row) => [row.projectNumber, row.projectName].filter(Boolean).join(" · ") || "Project";

// ─── The cell ────────────────────────────────────────────────────────────────

interface ActionsCellProps {
  row: Row;
  onNote: (row: Row) => void;
  /** Open the "add a task" dialog for this row. */
  onTasks: (row: Row) => void;
}

export const TrackerActionsCell: React.FC<ActionsCellProps> = ({ row, onNote, onTasks }) => {
  const note = row.billingNote || "";
  const count = row.taskCount || 0;
  return (
    // The row navigates to the project on click; the page's row handler skips clicks inside `data-row-actions`.
    // One control per job: an empty row shows two quiet icons and no placeholder text (it repeated on
    // every row); a set note IS its own edit button, and a task count IS the way into the list.
    // 280 = ACTION_COLUMN_WIDTH (300) less the cell's padding.
    <div data-row-actions className="flex w-[280px] min-w-0 items-center gap-1.5">
      {count ? (
        <TaskListPopover row={row} count={count} onAdd={onTasks} />
      ) : (
        <ActionIconButton size="sm" tone="success" iconName="check-square" title="Assign a task" onClick={() => onTasks(row)} />
      )}

      {note ? (
        <Button
          type="button"
          variant="tinted"
          size="sm"
          onClick={() => onNote(row)}
          title={note}
          aria-label={`Note: ${note}. Edit note`}
          className="h-auto min-h-8 min-w-0 flex-1 justify-between gap-1.5 py-1 text-left font-medium whitespace-normal [--tint:var(--warning)]"
        >
          {/* Two lines at most, so a long note never sets the row's height; the whole text is the tooltip.
              In an element, not bare text: the note is the user's own words, not a label to Title Case. */}
          <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{note}</span>
          <Pencil data-icon="inline-end" aria-hidden className="opacity-60" />
        </Button>
      ) : (
        <ActionIconButton size="sm" iconName="notepad-edit" title="Add note" onClick={() => onNote(row)} />
      )}
    </div>
  );
};

// ─── Note dialog ─────────────────────────────────────────────────────────────

const NOTE_FORM_ID = "billing-tracker-note-form";

const NoteDialog: React.FC<{ row: Row | null; onClose: () => void; onSaved: () => void }> = ({ row, onClose, onSaved }) => {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(row?.billingNote || ""), [row]);
  const unchanged = text.trim() === (row?.billingNote || "");

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
    <FormDialog
      open={!!row}
      onOpenChange={(open) => { if (!open && !saving) onClose(); }}
      title="Note"
      description={row ? subtitleOf(row) : undefined}
      icon={<NotebookPen aria-hidden />}
      size="sm"
      formId={NOTE_FORM_ID}
      submitLabel={saving ? "Saving…" : "Save note"}
      submitting={saving}
      submitDisabled={unchanged}
      dirty={!unchanged}
      footerStart={row?.billingNote ? (
        <Button type="button" variant="tinted" className="[--tint:var(--cta-danger)]" disabled={saving} onClick={() => void save("")}>
          Clear note
        </Button>
      ) : undefined}
    >
      <form id={NOTE_FORM_ID} noValidate onSubmit={(e) => { e.preventDefault(); void save(text); }} className="space-y-1.5 p-6">
        <Textarea
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Client asked to resend the invoice to their accounts team"
          aria-label="Note"
          maxLength={BILLING_NOTE_MAX}
        />
        <p className="text-right text-xs text-muted-foreground">{text.length} / {BILLING_NOTE_MAX}</p>
      </form>
    </FormDialog>
  );
};

// ─── Task list popover ───────────────────────────────────────────────────────

const TaskListPopover: React.FC<{ row: Row; count: number; onAdd: (row: Row) => void }> = ({ row, count, onAdd }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${count} task${count > 1 ? "s" : ""}. View or add`}
        title="View tasks or add another"
        className={cn(buttonVariants({ variant: "tinted", size: "sm" }), "shrink-0 font-bold [--tint:var(--cta-success)]")}
      >
        <SquareCheckBig data-icon="inline-start" aria-hidden />
        <span>{count} task{count > 1 ? "s" : ""}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <TaskList row={row} onAdd={() => { setOpen(false); onAdd(row); }} />
      </PopoverContent>
    </Popover>
  );
};

/** Mounted only while the popover is open, so the query runs on demand — never once per row. */
const TaskList: React.FC<{ row: Row; onAdd: () => void }> = ({ row, onAdd }) => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["billing-tracker-tasks", row.leadId],
    queryFn: () => listTrackerTasks(row.leadId),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Tasks</p>
          <p className="truncate text-xs text-muted-foreground">{subtitleOf(row)}</p>
        </div>
        <Button type="button" size="sm" onClick={onAdd}>+ Add task</Button>
      </div>
      <div className="max-h-80 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner className="size-5" aria-label="Loading tasks" /></div>
        ) : tasks.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          tasks.map((t) => (
            <Button
              key={t.id}
              type="button"
              variant="ghost"
              onClick={() => navigate(`/tasks/${t.id}`)}
              className="h-auto w-full flex-col items-stretch gap-0.5 rounded-none px-4 py-2 text-left font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                  {t.taskNo ? `#${t.taskNo} ` : ""}{t.taskName}
                </span>
                {t.status?.name ? <SolidChip label={t.status.name} color={t.status.color} /> : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {[t.assigneeName, t.dueDate ? `Due ${formatDate(t.dueDate)}` : null].filter(Boolean).join(" · ") || "Unassigned"}
              </span>
            </Button>
          ))
        )}
      </div>
    </>
  );
};

// ─── Page wiring ─────────────────────────────────────────────────────────────

/** One set of dialogs for the whole page, and the handlers each row's cell calls. */
export const useTrackerActions = () => {
  const queryClient = useQueryClient();
  const [noteRow, setNoteRow] = useState<Row | null>(null);
  const [taskRow, setTaskRow] = useState<Row | null>(null);

  const refresh = (leadId?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["billing-tracker"] });
    if (leadId) void queryClient.invalidateQueries({ queryKey: ["billing-tracker-tasks", leadId] });
  };

  const onNote = (row: Row) => setNoteRow(row);
  const onTasks = (row: Row) => setTaskRow(row);

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
