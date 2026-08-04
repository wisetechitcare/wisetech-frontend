import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, CircularProgress, Collapse, DialogActions, DialogContent, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
  GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton,
  IconBox, ToneChip, TRIO, toast, confirmDialog,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import {
  getProjectStages, createProjectDeliverable, updateProjectDeliverable,
  deleteProjectDeliverable, reorderProjectDeliverables,
  type ProjectStage, type ProjectDeliverable,
} from "@services/projectExecution";

const NAME_MAX = 100;

/** Query key is local to this module — the data has no other consumer yet. */
const stagesKey = (projectId: string) => ["project-execution", "stages", projectId];

const RowAction = ({ title, icon, color, onClick }: { title: string; icon: string; color?: string; onClick: () => void }) => (
  <WtIconButton title={title} color={color} onClick={onClick} sx={{ width: 32, height: 32, borderRadius: "9px" }}>
    <KTIcon iconName={icon} className="fs-6" />
  </WtIconButton>
);

interface DialogState {
  stage: ProjectStage;
  editing: ProjectDeliverable | null;
}

/**
 * Project Execution — stage management.
 *
 * Stages are READ ONLY: they were snapshotted from the lead's payment plan when the
 * project was created and the UI offers no way to add, rename, reorder or remove one.
 * Everything editable here lives inside a stage — its deliverables.
 *
 * Editing these never touches Payment Plan Configuration, and later edits to that
 * configuration never reach this project.
 */
const ExecutionSection: React.FC<{ projectId: string }> = ({ projectId }) => {
  const qc = useQueryClient();
  const queryKey = useMemo(() => stagesKey(projectId), [projectId]);
  const { data: stages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getProjectStages(projectId),
    enabled: !!projectId,
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey }), [qc, queryKey]);

  /** Write straight into the cache — the cache IS the rendered list, so a reorder or an
   *  add paints immediately instead of waiting on a refetch. */
  const patchStage = useCallback(
    (stageId: string, next: ProjectDeliverable[]) => {
      qc.setQueryData<ProjectStage[]>(queryKey, (prev) =>
        (prev ?? []).map((s) => (s.id === stageId ? { ...s, deliverables: next } : s)),
      );
    },
    [qc, queryKey],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!dialog) return;
      const payload = { name: name.trim(), description: description.trim() || null };
      return dialog.editing
        ? updateProjectDeliverable(dialog.editing.id, payload)
        : createProjectDeliverable(projectId, dialog.stage.id, payload);
    },
    onSuccess: () => {
      toast({ icon: "success", title: dialog?.editing ? "Deliverable updated" : "Deliverable added" });
      closeDialog();
      void invalidate();
    },
    onError: (err: unknown) => {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Could not save the deliverable.",
      );
    },
  });

  const openNew = (stage: ProjectStage) => {
    setDialog({ stage, editing: null });
    setName(""); setDescription(""); setFormError(null);
  };
  const openEdit = (stage: ProjectStage, row: ProjectDeliverable) => {
    setDialog({ stage, editing: row });
    setName(row.name); setDescription(row.description ?? ""); setFormError(null);
  };
  const closeDialog = () => { setDialog(null); setFormError(null); };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setFormError("Deliverable name is required."); return; }
    if (trimmed.length > NAME_MAX) { setFormError(`Name cannot exceed ${NAME_MAX} characters.`); return; }
    const siblings = dialog?.stage.deliverables ?? [];
    if (siblings.some((d) => d.id !== dialog?.editing?.id && d.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setFormError(`"${trimmed}" already exists in this stage.`);
      return;
    }
    saveMut.mutate();
  };

  const remove = async (stage: ProjectStage, row: ProjectDeliverable) => {
    const confirmed = await confirmDialog({
      icon: "warning",
      title: `Remove "${row.name}"?`,
      text: row.isCustom
        ? "This removes it from this project."
        : "This removes it from this project only — the payment plan configuration is unchanged.",
    });
    if (!confirmed) return;
    try {
      await deleteProjectDeliverable(row.id);
      patchStage(stage.id, stage.deliverables.filter((d) => d.id !== row.id));
      toast({ icon: "success", title: "Deliverable removed" });
    } catch {
      toast({ icon: "error", title: "Could not remove the deliverable" });
      void invalidate();
    }
  };

  const applyOrder = async (stage: ProjectStage, next: ProjectDeliverable[]) => {
    const previous = stage.deliverables;
    patchStage(stage.id, next);
    try {
      await reorderProjectDeliverables(stage.id, next.map((d) => d.id));
    } catch {
      patchStage(stage.id, previous);
      toast({ icon: "error", title: "Could not save the new order" });
    }
  };

  const nudge = (stage: ProjectStage, index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= stage.deliverables.length) return;
    const next = stage.deliverables.slice();
    [next[index], next[to]] = [next[to], next[index]];
    void applyOrder(stage, next);
  };

  const renderDeliverable = (stage: ProjectStage) => (row: ProjectDeliverable, handleProps?: DragHandleProps) => {
    const index = stage.deliverables.findIndex((d) => d.id === row.id);
    return (
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          px: { xs: 0.75, sm: 1 }, py: 0.75, borderRadius: "12px",
          border: "1px solid", borderColor: "divider", bgcolor: "action.hover",
          transition: "border-color .15s",
          "&:hover": { borderColor: "text.disabled" },
        }}
      >
        <DragHandle
          handleProps={handleProps}
          disabled={stage.deliverables.length < 2}
          onNudge={(dir) => nudge(stage, index, dir)}
        />
        <Typography sx={{ width: 22, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "text.disabled" }}>
          {index + 1}
        </Typography>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, wordBreak: "break-word" }}>
              {row.name}
            </Typography>
            {row.isCustom && <ToneChip tone="brand" label="Custom" dense />}
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

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <RowAction title="Edit" icon="pencil" onClick={() => openEdit(stage, row)} />
          <RowAction title="Remove" icon="trash" color="#C0392B" onClick={() => void remove(stage, row)} />
        </Stack>
      </Stack>
    );
  };

  if (isLoading) {
    return <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={26} /></Stack>;
  }

  if (stages.length === 0) {
    return (
      <GlassCard preset="section" sx={{ p: { xs: 2, sm: 3 }, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>No execution stages yet</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
          Stages are copied from the lead&apos;s payment plan when it becomes a project.
          Select a payment plan on the lead, then reopen this tab.
        </Typography>
      </GlassCard>
    );
  }

  const totalAmount = stages.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.25}
        sx={{ px: 0.5 }}
      >
        <IconBox icon="chart-simple" trio={TRIO.purple} size={38} fs="fs-3" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16 }, lineHeight: 1.3 }}>
            Stage Management
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
            Stages come from the lead&apos;s payment plan and are read-only. Deliverables belong to this project.
          </Typography>
        </Box>
        <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 600 }}>Contract Value</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{formatCurrencyDecimal(totalAmount)}</Typography>
        </Stack>
      </Stack>

      {stages.map((stage, stageIndex) => {
        const isOpen = !!expanded[stage.id];
        return (
          <GlassCard key={stage.id} preset="section" sx={{ p: { xs: 1.25, sm: 1.75 } }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={() => setExpanded((e) => ({ ...e, [stage.id]: !isOpen }))}
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Box
                sx={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: "9px",
                  display: "grid", placeItems: "center",
                  bgcolor: "action.selected", color: "text.secondary",
                  fontSize: 12.5, fontWeight: 700,
                }}
              >
                {stageIndex + 1}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35, wordBreak: "break-word" }}>
                  {stage.name}
                </Typography>
                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.35 }}>
                  <ToneChip tone="indigo" label={`${stage.percentage}%`} dense />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>
                    {formatCurrencyDecimal(stage.amount)}
                  </Typography>
                  <ToneChip
                    tone={stage.deliverables.length > 0 ? "success" : "neutral"}
                    label={`${stage.deliverables.length} deliverable${stage.deliverables.length === 1 ? "" : "s"}`}
                    dense
                  />
                </Stack>
              </Box>

              <KTIcon iconName={isOpen ? "up" : "down"} className="fs-4" />
            </Stack>

            <Collapse in={isOpen} unmountOnExit>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                {stage.deliverables.length === 0 ? (
                  <Box
                    onClick={() => openNew(stage)}
                    sx={{
                      py: 1.75, px: 1.5, borderRadius: "12px", cursor: "pointer", textAlign: "center",
                      border: "1px dashed", borderColor: "divider",
                      transition: "border-color .15s, background-color .15s",
                      "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                    }}
                  >
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 600 }}>
                      No deliverables in this stage
                    </Typography>
                    <Typography sx={{ color: "text.disabled", fontSize: 11.5, mt: 0.25 }}>
                      Click to add the first one.
                    </Typography>
                  </Box>
                ) : (
                  <ReorderableGroup
                    items={stage.deliverables}
                    getItemId={(d) => d.id}
                    axis="y"
                    withHandle
                    disabled={stage.deliverables.length < 2}
                    className="flex flex-col gap-2"
                    onReorder={(next) => void applyOrder(stage, next)}
                    renderItem={renderDeliverable(stage)}
                  />
                )}

                {stage.deliverables.length > 0 && (
                  <WtButton
                    tone="primary" size="small" ghost onClick={() => openNew(stage)}
                    startIcon={<KTIcon iconName="plus" className="fs-6" />}
                    sx={{ mt: 1, minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}
                  >
                    Add Deliverable
                  </WtButton>
                )}
              </Box>
            </Collapse>
          </GlassCard>
        );
      })}

      <GlassDialog
        open={!!dialog}
        onClose={closeDialog}
        maxWidth="xs"
        header={
          <GlassHeader
            title={dialog?.editing ? "Edit Deliverable" : "Add Deliverable"}
            icon={<KTIcon iconName="check-square" className="fs-2" />}
            onClose={closeDialog}
          />
        }
      >
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog && (
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                Stage: <strong>{dialog.stage.name}</strong>
              </Typography>
            )}
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
              placeholder="e.g. Fire NOC"
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <WtButton ghost onClick={closeDialog} disabled={saveMut.isPending}>Cancel</WtButton>
          <WtButton tone="primary" disabled={!name.trim() || saveMut.isPending} onClick={submit}>
            {saveMut.isPending ? "Saving…" : "Save"}
          </WtButton>
        </DialogActions>
      </GlassDialog>
    </Stack>
  );
};

export default ExecutionSection;
