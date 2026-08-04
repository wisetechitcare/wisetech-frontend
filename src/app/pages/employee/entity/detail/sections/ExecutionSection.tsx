import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, CircularProgress, Collapse, DialogActions, DialogContent, LinearProgress,
  Menu, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
  GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton,
  IconBox, ToneChip, TRIO, toast, confirmDialog, type SemanticTone,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
  getProjectStages, createProjectDeliverable, updateProjectDeliverable,
  deleteProjectDeliverable, reorderProjectDeliverables,
  updateDeliverableStatus, updateDeliverableRemarks,
  type ProjectStage, type ProjectDeliverable, type DeliverableStatus,
} from "@services/projectExecution";

const NAME_MAX = 100;
const REMARKS_MAX = 2000;

/** Query key is local to this module — the data has no other consumer yet. */
const stagesKey = (projectId: string) => ["project-execution", "stages", projectId];

/** Single source of truth for how a status looks and reads, used for both the
 *  deliverable badge and the derived stage badge (a stage has no state of its own). */
const STATUS_META: Record<DeliverableStatus, { label: string; tone: SemanticTone; icon: string }> = {
  PENDING: { label: "Pending", tone: "neutral", icon: "abstract-8" },
  IN_PROGRESS: { label: "In Progress", tone: "warning", icon: "time" },
  COMPLETED: { label: "Completed", tone: "success", icon: "check-circle" },
};

const STATUS_ORDER: DeliverableStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const RowAction = ({ title, icon, color, onClick }: { title: string; icon: string; color?: string; onClick: () => void }) => (
  <WtIconButton title={title} color={color} onClick={onClick} sx={{ width: 32, height: 32, borderRadius: "9px" }}>
    <KTIcon iconName={icon} className="fs-6" />
  </WtIconButton>
);

/** A count pill for the stage header — dimmed at zero so the eye skips empty buckets. */
const CountPill = ({ label, value, tone }: { label: string; value: number; tone: SemanticTone }) => (
  <ToneChip tone={value > 0 ? tone : "neutral"} label={`${value} ${label}`} dense />
);

interface EditDialogState {
  stage: ProjectStage;
  editing: ProjectDeliverable | null;
}

interface RemarksDialogState {
  deliverable: ProjectDeliverable;
}

/**
 * Project Execution — stage management and deliverable execution.
 *
 * Stages are READ ONLY: snapshotted from the lead's payment plan at project creation,
 * with no add / rename / reorder / delete anywhere in this UI.
 *
 * Stage progress and stage status are DERIVED — the server recomputes them from the
 * deliverables on every read and this component only renders what it is given. There is
 * deliberately no way to type a percentage or set a stage status by hand.
 *
 * No billing and no task actions: those are separate modules.
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
  const [dialog, setDialog] = useState<EditDialogState | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [remarksDialog, setRemarksDialog] = useState<RemarksDialogState | null>(null);
  const [remarks, setRemarks] = useState("");

  const [statusMenu, setStatusMenu] = useState<{ anchor: HTMLElement; row: ProjectDeliverable } | null>(null);

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey }), [qc, queryKey]);

  /** Write straight into the cache — the cache IS the rendered list, so a reorder or a
   *  status flip paints immediately instead of waiting on a refetch. */
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
      toast({ icon: "success", title: "Deliverable removed" });
    } catch {
      toast({ icon: "error", title: "Could not remove the deliverable" });
    }
    // Always refetch: removing a row changes the stage's progress, which only the
    // server computes.
    void invalidate();
  };

  /** Status changes always refetch — the stage rollup is derived, so guessing the new
   *  percentage client-side would be a second implementation of the progress rules. */
  const changeStatus = async (row: ProjectDeliverable, status: DeliverableStatus) => {
    setStatusMenu(null);
    if (status === row.status) return;
    try {
      await updateDeliverableStatus(row.id, status);
      toast({ icon: "success", title: `Marked ${STATUS_META[status].label.toLowerCase()}` });
    } catch {
      toast({ icon: "error", title: "Could not update the status" });
    }
    void invalidate();
  };

  const openRemarks = (row: ProjectDeliverable) => {
    setRemarksDialog({ deliverable: row });
    setRemarks(row.remarks ?? "");
  };

  const saveRemarks = async () => {
    if (!remarksDialog) return;
    try {
      await updateDeliverableRemarks(remarksDialog.deliverable.id, remarks.trim() || null);
      toast({ icon: "success", title: "Remarks saved" });
      setRemarksDialog(null);
      void invalidate();
    } catch {
      toast({ icon: "error", title: "Could not save the remarks" });
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
    const meta = STATUS_META[row.status] ?? STATUS_META.PENDING;
    return (
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={0.75}
        sx={{
          px: { xs: 0.75, sm: 1 }, py: 0.85, borderRadius: "12px",
          border: "1px solid", borderColor: "divider", bgcolor: "action.hover",
          transition: "border-color .15s",
          "&:hover": { borderColor: "text.disabled" },
        }}
      >
        <Box sx={{ pt: 0.25 }}>
          <DragHandle
            handleProps={handleProps}
            disabled={stage.deliverables.length < 2}
            onNudge={(dir) => nudge(stage, index, dir)}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, wordBreak: "break-word" }}>
              {row.name}
            </Typography>
            <ToneChip tone={meta.tone} label={meta.label} dense />
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

          {/* Execution trail — only rendered once there is something to show, so an
              untouched deliverable stays a single clean line. */}
          {(row.startedAt || row.completedAt) && (
            <Stack direction="row" flexWrap="wrap" spacing={1.25} sx={{ mt: 0.4 }}>
              {row.startedAt && (
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  Started <strong>{formatDate(row.startedAt)}</strong>
                </Typography>
              )}
              {row.completedAt && (
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  Completed <strong>{formatDate(row.completedAt)}</strong>
                  {row.completedByName ? ` by ${row.completedByName}` : ""}
                </Typography>
              )}
            </Stack>
          )}

          {row.remarks && (
            <Typography
              sx={{
                fontSize: 11.5, lineHeight: 1.45, color: "text.secondary", mt: 0.4,
                pl: 1, borderLeft: "2px solid", borderColor: "divider",
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}
            >
              {row.remarks}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <WtIconButton
            title="Change status"
            onClick={(e) => setStatusMenu({ anchor: e.currentTarget, row })}
            sx={{ width: 32, height: 32, borderRadius: "9px" }}
          >
            <KTIcon iconName={meta.icon} className="fs-6" />
          </WtIconButton>
          <RowAction title="Remarks" icon="notepad-edit" onClick={() => openRemarks(row)} />
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
  // Overall completion is weighted by stage value, not a mean of percentages — five
  // deliverables in a 5% stage must not count as much as five in a 30% stage.
  const overallPercent = Math.round(
    stages.reduce((sum, s) => sum + (s.progress?.completionPercentage ?? 0) * (s.percentage || 0), 0) /
      (stages.reduce((sum, s) => sum + (s.percentage || 0), 0) || 1),
  );

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
            Stages are read-only. Progress is calculated from deliverables — {overallPercent}% of contract value complete.
          </Typography>
        </Box>
        <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 600 }}>Contract Value</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{formatCurrencyDecimal(totalAmount)}</Typography>
        </Stack>
      </Stack>

      {stages.map((stage, stageIndex) => {
        const isOpen = !!expanded[stage.id];
        const progress = stage.progress;
        const stageMeta = STATUS_META[progress?.status ?? "PENDING"] ?? STATUS_META.PENDING;
        const percent = progress?.completionPercentage ?? 0;
        return (
          <GlassCard key={stage.id} preset="section" sx={{ p: { xs: 1.25, sm: 1.75 } }}>
            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={1}
              onClick={() => setExpanded((e) => ({ ...e, [stage.id]: !isOpen }))}
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              <Box
                sx={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: "9px", mt: 0.25,
                  display: "grid", placeItems: "center",
                  bgcolor: "action.selected", color: "text.secondary",
                  fontSize: 12.5, fontWeight: 700,
                }}
              >
                {stageIndex + 1}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.35, wordBreak: "break-word" }}>
                    {stage.name}
                  </Typography>
                  <ToneChip tone={stageMeta.tone} label={stageMeta.label} dense />
                </Stack>

                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.35 }}>
                  <ToneChip tone="indigo" label={`${stage.percentage}%`} dense />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>
                    {formatCurrencyDecimal(stage.amount)}
                  </Typography>
                </Stack>

                {/* Progress bar — the number and the bar read the same derived value. */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, percent))}
                    sx={{
                      flex: 1, minWidth: 0, height: 7, borderRadius: 99,
                      bgcolor: "action.selected",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 99,
                        bgcolor: percent >= 100 ? "success.main" : "primary.main",
                      },
                    }}
                  />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, minWidth: 44, textAlign: "right" }}>
                    {Math.round(percent)}%
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.6 }}>
                  <CountPill label="completed" value={progress?.completedCount ?? 0} tone="success" />
                  <CountPill label="in progress" value={progress?.inProgressCount ?? 0} tone="warning" />
                  <CountPill label="pending" value={progress?.pendingCount ?? 0} tone="neutral" />
                </Stack>
              </Box>

              <Box sx={{ pt: 0.5 }}>
                <KTIcon iconName={isOpen ? "up" : "down"} className="fs-4" />
              </Box>
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

      {/* Status picker. Three fixed options rather than a next/previous toggle, so a
          completion can be reopened in one click instead of cycling round. */}
      <Menu
        open={!!statusMenu}
        anchorEl={statusMenu?.anchor ?? null}
        onClose={() => setStatusMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const current = statusMenu?.row.status === status;
          return (
            <MenuItem
              key={status}
              selected={current}
              onClick={() => statusMenu && void changeStatus(statusMenu.row, status)}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <KTIcon iconName={meta.icon} className="fs-6" />
              {meta.label}
              {current && <KTIcon iconName="check" className="fs-7" />}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Remarks */}
      <GlassDialog
        open={!!remarksDialog}
        onClose={() => setRemarksDialog(null)}
        maxWidth="xs"
        header={
          <GlassHeader
            title="Remarks"
            icon={<KTIcon iconName="notepad-edit" className="fs-2" />}
            onClose={() => setRemarksDialog(null)}
          />
        }
      >
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {remarksDialog && (
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                <strong>{remarksDialog.deliverable.name}</strong>
              </Typography>
            )}
            <TextField
              label="Remarks"
              size="small"
              fullWidth
              multiline
              minRows={3}
              autoFocus
              value={remarks}
              helperText={`${remarks.trim().length}/${REMARKS_MAX} — leave empty to clear`}
              inputProps={{ maxLength: REMARKS_MAX }}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes on this deliverable"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <WtButton ghost onClick={() => setRemarksDialog(null)}>Cancel</WtButton>
          <WtButton tone="primary" onClick={() => void saveRemarks()}>Save</WtButton>
        </DialogActions>
      </GlassDialog>

      {/* Add / edit deliverable */}
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
