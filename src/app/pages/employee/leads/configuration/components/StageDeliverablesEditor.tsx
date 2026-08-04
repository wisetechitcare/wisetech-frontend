import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, CircularProgress,
  DialogActions, DialogContent, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
  GlassDialog, GlassHeader, WtButton, WtIconButton, WtSwitchField,
  ToneChip, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import {
  getStageDeliverables, createStageDeliverable, updateDeliverable,
  deleteDeliverable, reorderStageDeliverables,
} from "@services/paymentPlan";
import type { PaymentPlanStageDeliverable } from "@models/leads";
import { apiErrorMessage } from "@utils/apiError";

const NAME_MAX = 100;

/** Stage identity as the editor needs it. `id` is absent for a stage the user has
 *  added but not saved yet — there is no row to hang deliverables off until then. */
export interface DeliverableStage {
  id?: string;
  name: string;
}

interface Props {
  stages: DeliverableStage[];
}

const RowAction = ({ title, icon, color, onClick }: { title: string; icon: string; color?: string; onClick: () => void }) => (
  <WtIconButton title={title} color={color} onClick={onClick} sx={{ width: 32, height: 32, borderRadius: "9px" }}>
    <KTIcon iconName={icon} className="fs-6" />
  </WtIconButton>
);

/**
 * The deliverable list for ONE stage: add / edit / delete / reorder / enable-disable.
 * Loads lazily the first time its stage is expanded — a plan with eight stages should
 * not fire eight requests on open.
 */
const StageDeliverableList: React.FC<{ stageId: string; loaded: boolean; onCountChange: (n: number) => void }> = ({
  stageId, loaded, onCountChange,
}) => {
  const [rows, setRows] = useState<PaymentPlanStageDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentPlanStageDeliverable | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const commit = useCallback((next: PaymentPlanStageDeliverable[]) => {
    setRows(next);
    onCountChange(next.length);
  }, [onCountChange]);

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setIsLoading(true);
    getStageDeliverables(stageId)
      .then((data) => { if (!cancelled) commit(data); })
      .catch(() => { if (!cancelled) toast({ icon: "error", title: "Could not load deliverables" }); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [stageId, loaded, commit]);

  const openNew = () => {
    setEditing(null); setName(""); setDescription(""); setIsActive(true);
    setFormError(null); setOpen(true);
  };
  const openEdit = (row: PaymentPlanStageDeliverable) => {
    setEditing(row); setName(row.name); setDescription(row.description ?? ""); setIsActive(row.isActive);
    setFormError(null); setOpen(true);
  };
  const close = () => { setOpen(false); setEditing(null); setFormError(null); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setFormError("Deliverable name is required."); return; }
    if (trimmed.length > NAME_MAX) { setFormError(`Name cannot exceed ${NAME_MAX} characters.`); return; }
    // Client-side duplicate check for a fast, inline message. The server (and a DB
    // unique index) is still the authority — this is comfort, not enforcement.
    const clash = rows.some((r) => r.id !== editing?.id && r.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (clash) { setFormError(`"${trimmed}" already exists in this stage.`); return; }

    setSaving(true);
    try {
      const payload = { name: trimmed, description: description.trim() || null, isActive };
      if (editing) {
        const updated = await updateDeliverable(editing.id, payload);
        commit(rows.map((r) => (r.id === updated.id ? updated : r)));
        toast({ icon: "success", title: "Deliverable updated" });
      } else {
        const created = await createStageDeliverable(stageId, payload);
        commit([...rows, created]);
        toast({ icon: "success", title: "Deliverable added" });
      }
      close();
    } catch (err: unknown) {
      const message =
        apiErrorMessage(err, "Could not save the deliverable.");
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: PaymentPlanStageDeliverable) => {
    const confirmed = await confirmDialog({
      icon: "warning",
      title: `Remove "${row.name}"?`,
      text: "It is removed from this stage's configuration. Projects created later simply won't include it.",
    });
    if (!confirmed) return;
    try {
      await deleteDeliverable(row.id);
      commit(rows.filter((r) => r.id !== row.id));
      toast({ icon: "success", title: "Deliverable removed" });
    } catch {
      toast({ icon: "error", title: "Could not remove the deliverable" });
    }
  };

  const toggleActive = async (row: PaymentPlanStageDeliverable) => {
    const next = !row.isActive;
    commit(rows.map((r) => (r.id === row.id ? { ...r, isActive: next } : r))); // optimistic
    try {
      await updateDeliverable(row.id, { isActive: next });
    } catch {
      commit(rows.map((r) => (r.id === row.id ? { ...r, isActive: row.isActive } : r)));
      toast({ icon: "error", title: "Could not update the deliverable" });
    }
  };

  /** Paint the new order immediately, then persist — otherwise the row snaps back
   *  until the response lands. On failure we re-read rather than guess. */
  const applyOrder = async (next: PaymentPlanStageDeliverable[]) => {
    const previous = rows;
    commit(next);
    try {
      await reorderStageDeliverables(stageId, next.map((r) => r.id));
    } catch {
      commit(previous);
      toast({ icon: "error", title: "Could not save the new order" });
    }
  };

  const nudge = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= rows.length) return;
    const next = rows.slice();
    [next[index], next[to]] = [next[to], next[index]];
    void applyOrder(next);
  };

  const renderRow = (row: PaymentPlanStageDeliverable, handleProps?: DragHandleProps) => {
    const index = rows.findIndex((r) => r.id === row.id);
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          px: { xs: 0.75, sm: 1 }, py: 0.75, borderRadius: "12px",
          border: "1px solid", borderColor: "divider", bgcolor: "action.hover",
          opacity: row.isActive ? 1 : 0.6,
          transition: "border-color .15s, opacity .15s",
          "&:hover": { borderColor: "text.disabled" },
        }}
      >
        <DragHandle handleProps={handleProps} disabled={rows.length < 2} onNudge={(dir) => nudge(index, dir)} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, wordBreak: "break-word" }}>
              {row.name}
            </Typography>
            {!row.isActive && <ToneChip tone="neutral" label="Disabled" dense />}
          </Stack>
          {row.description && (
            <Typography
              sx={{
                fontSize: 12, lineHeight: 1.4, color: "text.secondary", mt: 0.25,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}
            >
              {row.description}
            </Typography>
          )}
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <RowAction
            title={row.isActive ? "Disable" : "Enable"}
            icon={row.isActive ? "eye" : "eye-slash"}
            onClick={() => void toggleActive(row)}
          />
          <RowAction title="Edit" icon="pencil" onClick={() => openEdit(row)} />
          <RowAction title="Remove" icon="trash" color="#C0392B" onClick={() => void remove(row)} />
        </Stack>
      </Stack>
    );
  };

  return (
    <Box>
      {isLoading ? (
        <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} /></Stack>
      ) : rows.length === 0 ? (
        <Box
          onClick={openNew}
          sx={{
            py: 1.75, px: 1.5, borderRadius: "12px", cursor: "pointer", textAlign: "center",
            border: "1px dashed", borderColor: "divider",
            transition: "border-color .15s, background-color .15s",
            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
          }}
        >
          <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 600 }}>No deliverables yet</Typography>
          <Typography sx={{ color: "text.disabled", fontSize: 11.5, mt: 0.25 }}>Click to add the first one.</Typography>
        </Box>
      ) : (
        <ReorderableGroup
          items={rows}
          getItemId={(r) => r.id}
          axis="y"
          withHandle
          disabled={rows.length < 2}
          className="flex flex-col gap-2"
          onReorder={(next) => void applyOrder(next)}
          renderItem={renderRow}
        />
      )}

      {rows.length > 0 && (
        <WtButton
          tone="primary" size="small" ghost onClick={openNew}
          startIcon={<KTIcon iconName="plus" className="fs-6" />}
          sx={{ mt: 1, minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}
        >
          Add Deliverable
        </WtButton>
      )}

      <GlassDialog
        open={open}
        onClose={close}
        maxWidth="xs"
        header={
          <GlassHeader
            title={editing ? "Edit Deliverable" : "New Deliverable"}
            icon={<KTIcon iconName="check-square" className="fs-2" />}
            onClose={close}
          />
        }
      >
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              size="small"
              fullWidth
              autoFocus
              value={name}
              error={!!formError}
              helperText={formError ?? `${name.trim().length}/${NAME_MAX}`}
              inputProps={{ maxLength: NAME_MAX }}
              onChange={(e) => { setName(e.target.value); setFormError(null); }}
              placeholder="e.g. Site Survey"
            />
            <TextField
              label="Description (optional)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note about what this deliverable covers"
            />
            <WtSwitchField
              title="Active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <WtButton ghost onClick={close} disabled={saving}>Cancel</WtButton>
          <WtButton tone="primary" disabled={!name.trim() || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </WtButton>
        </DialogActions>
      </GlassDialog>
    </Box>
  );
};

/**
 * Deliverable configuration for every stage of a payment plan — one collapsible
 * section per stage.
 *
 * CONFIGURATION ONLY. Nothing here is rendered inside a lead: a lead still shows its
 * payment plan and stages and nothing more. These rows are the template a project will
 * copy from when a lead is received.
 */
const StageDeliverablesEditor: React.FC<Props> = ({ stages }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Stages keep their panel mounted once opened, so switching back doesn't refetch.
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});

  const setCount = useCallback((stageId: string, n: number) => {
    setCounts((prev) => (prev[stageId] === n ? prev : { ...prev, [stageId]: n }));
  }, []);

  const saved = stages.filter((s) => !!s.id);
  const unsavedCount = stages.length - saved.length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>Deliverables</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          Work items configured under each stage. Not shown on leads.
        </Typography>
      </Stack>

      {saved.length === 0 ? (
        <Box sx={{ py: 1.75, px: 1.5, borderRadius: "12px", border: "1px dashed", borderColor: "divider" }}>
          <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
            Save the plan first — deliverables attach to a saved stage.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {saved.map((stage) => {
            const stageId = stage.id as string;
            const isOpen = expanded === stageId;
            const count = counts[stageId];
            return (
              <Accordion
                key={stageId}
                expanded={isOpen}
                disableGutters
                elevation={0}
                onChange={() => {
                  setExpanded(isOpen ? null : stageId);
                  if (!isOpen) setVisited((v) => ({ ...v, [stageId]: true }));
                }}
                sx={{
                  border: "1px solid", borderColor: "divider", borderRadius: "12px",
                  bgcolor: "background.paper", "&::before": { display: "none" },
                  "&.Mui-expanded": { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<KTIcon iconName="down" className="fs-5" />}
                  sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75, alignItems: "center", gap: 1 } }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: 13.5, flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                    {stage.name}
                  </Typography>
                  {count !== undefined && (
                    <ToneChip tone={count > 0 ? "brand" : "neutral"} label={`${count}`} dense />
                  )}
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <StageDeliverableList
                    stageId={stageId}
                    loaded={!!visited[stageId]}
                    onCountChange={(n) => setCount(stageId, n)}
                  />
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {unsavedCount > 0 && saved.length > 0 && (
        <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 1 }}>
          {unsavedCount} unsaved {unsavedCount === 1 ? "stage is" : "stages are"} hidden here — save the plan to configure them.
        </Typography>
      )}
    </Box>
  );
};

export default StageDeliverablesEditor;
