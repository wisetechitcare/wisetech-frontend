import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box, CircularProgress, DialogActions, DialogContent, LinearProgress,
  Menu, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import {
  AutoGrid, GlassCard, GlassDialog, GlassHeader, WtButton, WtIconButton,
  IconBox, ToneChip, TRIO, toast, confirmDialog, type SemanticTone,
} from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import DeliverableFormDialog from "./DeliverableFormDialog";
import { apiErrorMessage } from "@utils/apiError";
import {
  getProjectStages, createProjectDeliverable, updateProjectDeliverable,
  deleteProjectDeliverable, reorderProjectDeliverables,
  updateDeliverableStatus, updateDeliverableRemarks,
  type ProjectStage, type ProjectDeliverable, type DeliverableStatus,
  type DeliverablePriority, type DeliverablePayload,
} from "@services/projectExecution";

const REMARKS_MAX = 2000;

/** Priority is planning metadata, so only the two that need attention get colour —
 *  a wall of chips where everything is coloured communicates nothing. */
const PRIORITY_META: Record<DeliverablePriority, { label: string; tone: SemanticTone }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "neutral" },
  HIGH: { label: "High", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};

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

/**
 * One line instead of three chips.
 *
 * The header used to render "0 completed", "0 in progress" and "0 pending" as three
 * separate pills, so an untouched stage — the common case — spent its widest row saying
 * nothing three times. A stage's deliverables have exactly one fact worth reading at a
 * glance ("how far through am I"), and it is a ratio, so it is written as one.
 * In-progress is appended only when it is non-zero, because that is the only count that
 * changes what someone would do next.
 */
const DeliverableSummary = ({ done, inProgress, total }: { done: number; inProgress: number; total: number }) => {
  if (total === 0) {
    return (
      <Typography sx={{ fontSize: 11.5, color: "text.disabled", fontWeight: 600 }}>
        No deliverables
      </Typography>
    );
  }
  return (
    <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 600 }}>
      <Box component="strong" sx={{ color: "text.primary" }}>{done} of {total}</Box> done
      {inProgress > 0 ? ` · ${inProgress} in progress` : ""}
    </Typography>
  );
};

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

  /** One stage at a time. The deliverables panel is a single full-width surface below the
   *  board, so two stages open at once has nowhere to render. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<EditDialogState | null>(null);
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
    mutationFn: async (payload: DeliverablePayload) => {
      if (!dialog) return;
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
        apiErrorMessage(err, "Could not save the deliverable."),
      );
    },
  });

  const openNew = (stage: ProjectStage) => { setDialog({ stage, editing: null }); setFormError(null); };
  const openEdit = (stage: ProjectStage, row: ProjectDeliverable) => {
    setDialog({ stage, editing: row });
    setFormError(null);
  };
  const closeDialog = () => { setDialog(null); setFormError(null); };

  const remove = async (stage: ProjectStage, row: ProjectDeliverable) => {
    const share = Number(row.percentage) || 0;
    const confirmed = await confirmDialog({
      icon: "warning",
      title: `Remove "${row.name}"?`,
      // Say what it costs the stage. The remaining percentages are NOT redistributed, so
      // the stage drops out of balance and the user has to reallocate deliberately.
      text: share > 0
        ? `The stage will drop to ${Math.round((stage.allocation.percentageTotal - share) * 1000) / 1000}% and must be brought back to 100%.`
        : row.isCustom
          ? "This removes it from this project."
          : "This removes it from this project only — the payment plan configuration is unchanged.",
    });
    if (!confirmed) return;
    try {
      const { allocation } = await deleteProjectDeliverable(row.id);
      if (allocation && !allocation.isBalanced) {
        toast({ icon: "warning", title: `Stage is now ${allocation.percentageTotal}% — reallocate to 100%` });
      } else {
        toast({ icon: "success", title: "Deliverable removed" });
      }
    } catch {
      toast({ icon: "error", title: "Could not remove the deliverable" });
    }
    // Always refetch: removing a row changes progress and amounts, which only the
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
    const priorityMeta = PRIORITY_META[row.priority] ?? PRIORITY_META.MEDIUM;
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

          {/* Money line: percentage and its derived amount always travel together, so the
              relationship between them is visible without opening the editor. */}
          <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.35 }}>
            <ToneChip tone="indigo" label={`${Number(row.percentage) || 0}%`} dense />
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
              {formatCurrencyDecimal(Number(row.calculatedAmount) || 0)}
            </Typography>
            {priorityMeta.tone !== "neutral" && (
              <ToneChip tone={priorityMeta.tone} label={priorityMeta.label} dense />
            )}
            {row.category && <ToneChip tone="cyan" label={row.category} dense />}
            {row.estimatedDays != null && (
              <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                {row.estimatedDays}d
              </Typography>
            )}
            {/* Only the exceptions are labelled — billable + mandatory is the default, and
                chipping every row with "Billable YES" would be noise. */}
            {!row.isBillable && <ToneChip tone="neutral" label="Non-billable" dense />}
            {!row.isMandatory && <ToneChip tone="neutral" label="Optional" dense />}
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

  // Resolved from the live list, never held in state — a refetch that drops or reorders a
  // stage then closes the panel instead of leaving it pointing at a stale row.
  const selectedIndex = stages.findIndex((s) => s.id === selectedId);
  const selectedStage = selectedIndex >= 0 ? stages[selectedIndex] : null;
  const panelId = `stage-deliverables-${projectId}`;

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
            Read-only. Progress is calculated from deliverables.
          </Typography>
        </Box>
        {/* Two figures, same treatment, read left to right: how much of the contract is
            done, and what the contract is worth. The completion number used to be buried
            mid-sentence in the subtitle, where the one number people open this tab for
            was the least prominent thing on the row. */}
        <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ flexShrink: 0 }}>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 600 }}>Complete</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{overallPercent}%</Typography>
          </Box>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", fontWeight: 600 }}>Contract Value</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{formatCurrencyDecimal(totalAmount)}</Typography>
          </Box>
        </Stack>
      </Stack>

      {/* Two stages per row above ~1060px, one below — `min` is the track floor, so the
          column count falls out of the available width rather than being pinned to
          breakpoints.

          Selecting a stage does NOT expand it in place. Inline expansion inside a
          two-column grid strands a dead half-row beside the opened card, and a
          deliverable row — drag handle, four actions, chips, description — is unreadable
          at half width. So the board stays a regular board and the selected stage opens
          in ONE full-width panel below it. */}
      <AutoGrid min={520} gap={12}>
      {stages.map((stage, stageIndex) => {
        const isOpen = selectedId === stage.id;
        const progress = stage.progress;
        const allocation = stage.allocation ?? { percentageTotal: 0, isBalanced: true, remaining: 0 };
        const stageMeta = STATUS_META[progress?.status ?? "PENDING"] ?? STATUS_META.PENDING;
        const percent = progress?.completionPercentage ?? 0;
        const doneCount = progress?.completedCount ?? 0;
        const inProgressCount = progress?.inProgressCount ?? 0;
        const totalCount = doneCount + inProgressCount + (progress?.pendingCount ?? 0);
        return (
          <GlassCard
            key={stage.id}
            preset="section"
            sx={{
              p: { xs: 1.25, sm: 1.75 },
              // The ring is the only selection cue that does not move anything. Drawn on
              // an always-present transparent outline so selecting never shifts layout.
              outline: "2px solid",
              outlineColor: isOpen ? "primary.main" : "transparent",
              transition: "outline-color .15s",
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={1}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              onClick={() => setSelectedId(isOpen ? null : stage.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(isOpen ? null : stage.id);
                }
              }}
              sx={{
                cursor: "pointer", userSelect: "none", borderRadius: "10px",
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }}
            >
              <Box
                sx={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: "9px", mt: 0.25,
                  display: "grid", placeItems: "center",
                  bgcolor: isOpen ? "primary.main" : "action.selected",
                  color: isOpen ? "primary.contrastText" : "text.secondary",
                  fontSize: 12.5, fontWeight: 700, transition: "background-color .15s",
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

                {/* Progress bar — the number and the bar read the same derived value.
                    The neutral track matters: a global `!important` in main.css used to
                    paint every track red-200, so a stage at 0% showed a full-width red
                    wash that read as FAILED rather than not-started. That rule is gone;
                    the track colour is set here. */}
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
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
                    {Math.round(percent)}%
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.75} sx={{ mt: 0.6 }}>
                  <DeliverableSummary done={doneCount} inProgress={inProgressCount} total={totalCount} />
                  {/* Allocation is only meaningful once something has been allocated. An
                      empty stage used to show "0% allocated ✓" in success green, which
                      claimed a stage with nothing in it was correctly balanced. Balanced
                      stays visible when there ARE deliverables, so the 100% is
                      reassurance rather than only ever an error. */}
                  {totalCount > 0 && (
                    <ToneChip
                      tone={allocation.isBalanced ? "success" : "danger"}
                      label={
                        allocation.isBalanced
                          ? `${allocation.percentageTotal}% allocated`
                          : `${allocation.percentageTotal}% allocated — must be 100%`
                      }
                      dense
                    />
                  )}
                </Stack>
              </Box>

              <Box sx={{ pt: 0.5, color: isOpen ? "primary.main" : "text.disabled" }}>
                <KTIcon iconName={isOpen ? "up" : "down"} className="fs-4" />
              </Box>
            </Stack>
          </GlassCard>
        );
      })}
      </AutoGrid>

      {/* The work surface. One panel, full width, for whichever stage is selected — so a
          deliverable row always has the room it needs regardless of the board's column
          count, and the board above never reflows. */}
      {selectedStage && (
        <GlassCard id={panelId} preset="section" sx={{ p: { xs: 1.25, sm: 1.75 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <IconBox icon="element-11" trio={TRIO.blue} size={32} fs="fs-5" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3, wordBreak: "break-word" }}>
                {selectedStage.name}
              </Typography>
              {/* Repeats the card's figures on purpose: the panel can sit a full screen
                  below its card once there are several stages. */}
              <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.15 }}>
                Stage {selectedIndex + 1} · {selectedStage.percentage}% · {formatCurrencyDecimal(selectedStage.amount)}
              </Typography>
            </Box>
            {selectedStage.deliverables.length > 0 && (
              <WtButton
                tone="primary" size="small" ghost onClick={() => openNew(selectedStage)}
                startIcon={<KTIcon iconName="plus" className="fs-6" />}
                sx={{ minHeight: 32, fontSize: 12.5, borderRadius: "9px", flexShrink: 0 }}
              >
                Add Deliverable
              </WtButton>
            )}
            <WtIconButton
              title="Close"
              onClick={() => setSelectedId(null)}
              sx={{ width: 32, height: 32, borderRadius: "9px", flexShrink: 0 }}
            >
              <KTIcon iconName="cross" className="fs-5" />
            </WtIconButton>
          </Stack>

          {selectedStage.deliverables.length === 0 ? (
            <Box
              role="button"
              tabIndex={0}
              onClick={() => openNew(selectedStage)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openNew(selectedStage); }
              }}
              sx={{
                py: 2.25, px: 1.5, borderRadius: "12px", cursor: "pointer", textAlign: "center",
                border: "1px dashed", borderColor: "divider",
                transition: "border-color .15s, background-color .15s",
                "&:hover, &:focus-visible": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
            >
              <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 600 }}>
                Add the first deliverable
              </Typography>
              <Typography sx={{ color: "text.disabled", fontSize: 11.5, mt: 0.25 }}>
                Deliverables carry the stage&apos;s percentages, and must total 100%.
              </Typography>
            </Box>
          ) : (
            <ReorderableGroup
              items={selectedStage.deliverables}
              getItemId={(d) => d.id}
              axis="y"
              withHandle
              disabled={selectedStage.deliverables.length < 2}
              className="flex flex-col gap-2"
              onReorder={(next) => void applyOrder(selectedStage, next)}
              renderItem={renderDeliverable(selectedStage)}
            />
          )}
        </GlassCard>
      )}

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

      {/* Add / edit deliverable — all nine configurable fields live in this dialog. */}
      <DeliverableFormDialog
        open={!!dialog}
        onClose={closeDialog}
        onSubmit={(payload) => saveMut.mutate(payload)}
        saving={saveMut.isPending}
        serverError={formError}
        editing={dialog?.editing ?? null}
        stageName={dialog?.stage.name ?? ""}
        stageAmount={dialog?.stage.amount ?? 0}
        siblings={dialog?.stage.deliverables ?? []}
      />
    </Stack>
  );
};

export default ExecutionSection;
