import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, Collapse, DialogActions, DialogContent, LinearProgress, Stack, TextField } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  addCustomDeliverable, addCustomStage, deleteCustomDeliverable, deleteCustomStage, deliverableBoardQuery,
  type BoardDeliverable, type BoardStage, type BoardTaskStatus,
} from "@services/projectExecution";
import { stageSrNo } from "@models/leads";
import {
  GlassDialog, GlassHeader, WtButton, WtEmptyState, WtIconButton, confirmDialog, toast, toneAlpha, tonePair,
} from "@app/modules/common/components/ui";
import { DetailCard, DetailSummaryBar } from "@app/modules/detail-page/DetailPageComponents";
import { C, FONT, RADIUS } from "@app/modules/configuration/ConfigDesignSystem";
import { apiErrorMessage } from "@utils/apiError";
import type { PresetTaskLike } from "@utils/presetTaskHierarchy";
import { usePresetTasks } from "@pages/employee/tasks/useTaskQueries";
import TaskPath from "@pages/employee/tasks/components/TaskPath";
import TaskPathSelect, { buildTaskPathOptions, type TaskPathOption } from "@pages/employee/tasks/components/TaskPathSelect";
import { stageState, type StageState } from "./deliverableStage";
import StatusGlyph from "@pages/employee/tasks/components/StatusGlyph";

const MARKER = 28;
const NAME_MAX = 100;
const SUCCESS = tonePair("success").fg;
const BRAND = tonePair("brand").fg;
const DANGER = tonePair("danger").fg;

/**
 * Colour + icon per stage state, and how strongly the stage card wears it. Traffic-light on
 * purpose — green done, blue moving, red untouched — so progress reads down the page from
 * across the room. Only a stage with nothing to do stays grey.
 */
const STAGE: Record<StageState, { fg: string; label: string; glyph: string | null; tint: number }> = {
  completed: { fg: SUCCESS, label: "Completed", glyph: "completed", tint: 0.1 },
  inProgress: { fg: BRAND, label: "In progress", glyph: "in_progress", tint: 0.06 },
  notStarted: { fg: DANGER, label: "Not started", glyph: "on_hold", tint: 0.05 },
  empty: { fg: C.textMuted, label: "No deliverables", glyph: null, tint: 0.04 },
};

/** Progress colour: done, moving, or untouched. */
const progressColor = (p: number) => (p >= 100 ? SUCCESS : p > 0 ? BRAND : DANGER);

/** Only a hex tints cleanly (toneAlpha); anything else would paint text on its own colour. */
const safeHex = (c: string | null | undefined, fallback: string) =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c ?? "") ? (c as string) : fallback;

/**
 * The one badge shape on this tab — same tint formula as ToneChip (12% fill, 28% border). Leads
 * with a status's animated glyph (`glyph`, a TaskStatus.icon key) or a plain icon class.
 */
const Badge: React.FC<{ fg: string; label: string; icon?: string; glyph?: string | null }> = ({ fg, label, icon, glyph }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 11px 3px 7px",
      borderRadius: RADIUS.full, background: toneAlpha(fg, 0.12), border: `1px solid ${toneAlpha(fg, 0.28)}`,
      color: fg, fontFamily: FONT.body, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}
  >
    {icon ? <i className={icon} style={{ fontSize: 11, color: fg }} /> : <StatusGlyph icon={glyph} color={fg} size={15} />}
    {label}
  </span>
);

/** Marks what was added to this project alone, as opposed to the plan's configuration. */
const ProjectTag = () => (
  <span
    style={{
      fontFamily: FONT.body, fontSize: 10.5, fontWeight: 600, color: C.purple, padding: "1px 7px",
      borderRadius: RADIUS.full, background: toneAlpha(C.purple, 0.1), whiteSpace: "nowrap",
    }}
  >
    This project
  </span>
);

/**
 * A deliverable's status: its task's Task Status exactly as configured in Settings — the same
 * name, colour and animated glyph the task itself shows — or "Not started" while it has none.
 */
const StatusBadge: React.FC<{ status: BoardTaskStatus | null }> = ({ status }) =>
  status ? (
    <Badge key={status.id} fg={safeHex(status.color, BRAND)} glyph={status.icon} label={status.name} />
  ) : (
    <Badge fg={DANGER} glyph="on_hold" label="Not started" />
  );

const ProgressBar: React.FC<{ value: number; width?: number | string }> = ({ value, width = "100%" }) => {
  const fg = progressColor(value);
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ width, minWidth: 0 }}>
      <LinearProgress
        variant="determinate"
        value={value}
        aria-label={`${value}% complete`}
        sx={{
          flex: 1, height: 6, borderRadius: 99, bgcolor: toneAlpha(fg, 0.15),
          "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: fg },
        }}
      />
      <span style={{ fontFamily: FONT.body, fontSize: 11.5, fontWeight: 700, color: C.textSecondary, width: 34, textAlign: "right" }}>
        {value}%
      </span>
    </Stack>
  );
};

/** Deliverable row: name | progress | status | remove — stacking to two lines on a phone. */
const ROW_SX = {
  display: "grid",
  alignItems: "center",
  columnGap: 2,
  rowGap: 1,
  gridTemplateColumns: { xs: "minmax(0, 1fr) 32px", md: "minmax(0, 3fr) minmax(140px, 1.4fr) minmax(130px, 1fr) 32px" },
  gridTemplateAreas: { xs: '"name action" "progress status"', md: '"name progress status action"' },
} as const;

const DeliverableRow: React.FC<{ d: BoardDeliverable; onRemove: () => void }> = ({ d, onRemove }) => (
  <Box sx={{ ...ROW_SX, px: 1.75, py: 1.25, bgcolor: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
    <Box sx={{ gridArea: "name", minWidth: 0, fontFamily: FONT.body }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        {d.presetTaskId ? (
          <TaskPath path={d.name} fontSize={13} />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, wordBreak: "break-word" }}>{d.name}</span>
        )}
        {d.source === "project" && <ProjectTag />}
      </Stack>
      {(d.description || d.taskCount > 1) && (
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
          {[d.description, d.taskCount > 1 ? `${d.taskCount} tasks` : null].filter(Boolean).join(" · ")}
        </div>
      )}
    </Box>
    <Box sx={{ gridArea: "progress", minWidth: 0 }}><ProgressBar value={d.progress} /></Box>
    <Box sx={{ gridArea: "status" }}><StatusBadge status={d.taskStatus} /></Box>
    <Box sx={{ gridArea: "action", justifySelf: "end" }}>
      {d.source === "project" && (
        <WtIconButton title="Remove from this project" color="#C0392B" onClick={onRemove} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
          <KTIcon iconName="trash" className="fs-6" />
        </WtIconButton>
      )}
    </Box>
  </Box>
);

const StageRow: React.FC<{
  label: string;
  stage: BoardStage;
  last: boolean;
  open: boolean;
  onToggle: () => void;
  onAddDeliverable: () => void;
  onRemoveStage: () => void;
  onRemoveDeliverable: (d: BoardDeliverable) => void;
}> = ({ label, stage, last, open, onToggle, onAddDeliverable, onRemoveStage, onRemoveDeliverable }) => {
  const state = STAGE[stageState(stage)];
  const count = stage.deliverables.length;
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* The spine: number, then a line down to the next stage. */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 14 }}>
        <div
          style={{
            width: MARKER, height: MARKER, borderRadius: RADIUS.full, display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: FONT.heading, fontSize: 13,
            fontWeight: 700, color: C.primary, background: C.primaryLight, border: `1px solid ${toneAlpha(C.primary, 0.2)}`,
          }}
        >
          {label}
        </div>
        {!last && <div style={{ flex: 1, width: 2, background: C.border, marginTop: 4 }} />}
      </div>

      <div
        style={{
          flex: 1, minWidth: 0, marginBottom: last ? 0 : 12, borderRadius: RADIUS.lg,
          background: toneAlpha(state.fg, state.tint), border: `1px solid ${toneAlpha(state.fg, 0.3)}`,
          // A solid stripe in the state colour — the part that's readable at a glance.
          borderLeft: `4px solid ${state.fg}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, flexWrap: { xs: "wrap", md: "nowrap" } }}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <span style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{stage.name}</span>
              {stage.source === "project" && <ProjectTag />}
            </Stack>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
              {count ? `${count} deliverable${count === 1 ? "" : "s"}` : "No deliverables yet"}
            </div>
          </button>
          {count > 0 && (
            <Box sx={{ width: { xs: "100%", md: 200 }, order: { xs: 3, md: 0 } }}>
              <ProgressBar value={stage.progress} />
            </Box>
          )}
          {count > 0 && <Badge fg={state.fg} glyph={state.glyph} label={state.label} />}
          {stage.source === "project" && (
            <WtIconButton title="Remove stage from this project" color="#C0392B" onClick={onRemoveStage} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
              <KTIcon iconName="trash" className="fs-6" />
            </WtIconButton>
          )}
          <WtIconButton title={open ? "Collapse" : "Expand"} onClick={onToggle} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
            <i
              className="bi bi-chevron-down"
              style={{ fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}
            />
          </WtIconButton>
        </Box>

        <Collapse in={open} unmountOnExit>
          <Stack spacing={0.75} sx={{ px: 1.5, pb: 1.5 }}>
            {stage.deliverables.map((d) => (
              <DeliverableRow key={`${d.source}-${d.id}`} d={d} onRemove={() => onRemoveDeliverable(d)} />
            ))}
            <button
              type="button"
              onClick={onAddDeliverable}
              style={{
                all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: RADIUS.md, border: `1px dashed ${C.borderDark}`,
                fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textSecondary,
              }}
            >
              <i className="bi bi-plus-lg" /> Add deliverable
            </button>
          </Stack>
        </Collapse>
      </div>
    </div>
  );
};

/** Add a project-only stage: just a name. */
const AddStageDialog: React.FC<{ open: boolean; onClose: () => void; onSave: (name: string) => Promise<void> }> = ({ open, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setName(""); setError(null); onClose(); };
  const save = async () => {
    setSaving(true);
    try { await onSave(name.trim()); close(); } catch (err) { setError(apiErrorMessage(err, "Could not add the stage.")); } finally { setSaving(false); }
  };
  return (
    <GlassDialog open={open} onClose={close} maxWidth="xs" header={<GlassHeader title="Add Stage" icon={<KTIcon iconName="plus-square" className="fs-2" />} onClose={close} />}>
      <DialogContent>
        <TextField
          sx={{ mt: 1 }} label="Stage name" size="small" fullWidth autoFocus required value={name}
          error={!!error} helperText={error ?? "Added to this project only — the payment plan is unchanged."}
          inputProps={{ maxLength: 200 }}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) void save(); }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={close} disabled={saving}>Cancel</WtButton>
        <WtButton tone="primary" disabled={!name.trim() || saving} onClick={() => void save()}>{saving ? "Adding…" : "Add Stage"}</WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

/** Add a project-only deliverable to a stage: a Project Task, like a configured one. */
const AddDeliverableDialog: React.FC<{
  stage: BoardStage | null;
  onClose: () => void;
  onSave: (task: TaskPathOption, description: string) => Promise<void>;
}> = ({ stage, onClose, onSave }) => {
  const presetsQuery = usePresetTasks("PROJECT");
  const options = useMemo(
    () => buildTaskPathOptions((presetsQuery.data?.presetTaskStatuses ?? []) as PresetTaskLike[]),
    [presetsQuery.data],
  );
  const [task, setTask] = useState<TaskPathOption | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => { setTask(null); setDescription(""); setError(null); onClose(); };
  const save = async () => {
    if (!task) return;
    if (task.name.length > NAME_MAX) { setError(`This task path is longer than ${NAME_MAX} characters — shorten a task name in Project Tasks.`); return; }
    setSaving(true);
    try { await onSave(task, description.trim()); close(); } catch (err) { setError(apiErrorMessage(err, "Could not add the deliverable.")); } finally { setSaving(false); }
  };
  return (
    <GlassDialog
      open={!!stage} onClose={close} maxWidth="xs"
      header={<GlassHeader title="Add Deliverable" icon={<KTIcon iconName="check-square" className="fs-2" />} onClose={close} />}
    >
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TaskPathSelect
            value={task?.id ?? ""} options={options} loading={presetsQuery.isLoading} required autoFocus error={!!error}
            helperText={error ?? `Added to "${stage?.name ?? ""}" on this project only.`}
            onChange={(next) => { setTask(next); setError(null); }}
          />
          <TextField
            label="Description (optional)" size="small" fullWidth multiline minRows={2} value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={close} disabled={saving}>Cancel</WtButton>
        <WtButton tone="primary" disabled={!task || saving} onClick={() => void save()}>{saving ? "Adding…" : "Add Deliverable"}</WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

/**
 * Project → Deliverables. The payment plan's stages and deliverables (read LIVE from
 * Tasks → Configure → Deliverables) plus stages and deliverables added to this project alone.
 * Progress and status come from the project's tasks: a deliverable moves with its task's
 * progress, and a stage with the average of its deliverables — each an equal share.
 */
const DeliverablesSection: React.FC<{ lead: any }> = ({ lead }) => {
  const projectId: string = lead?.id ?? "";
  const queryClient = useQueryClient();
  const boardQuery = useQuery(deliverableBoardQuery(projectId));
  // Stages start open; this holds the ones the user folded away.
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [addingStage, setAddingStage] = useState(false);
  const [addingTo, setAddingTo] = useState<BoardStage | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: deliverableBoardQuery(projectId).queryKey });

  if (boardQuery.isLoading) return <div className="d-flex justify-content-center py-10"><CircularProgress size={24} /></div>;
  if (boardQuery.isError || !boardQuery.data) {
    return <WtEmptyState variant="error" title="Couldn't load the deliverables" actionLabel="Try again" onAction={() => void boardQuery.refetch()} />;
  }

  const { planName, stageLabels, stages } = boardQuery.data;
  const total = stages.reduce((n, s) => n + s.deliverables.length, 0);
  const withRows = stages.filter((s) => s.deliverables.length);
  const overall = withRows.length ? Math.round(withRows.reduce((n, s) => n + s.progress, 0) / withRows.length) : 0;
  const done = stages.filter((s) => stageState(s) === "completed").length;

  const toggle = (key: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const removeStage = async (stage: BoardStage) => {
    const ok = await confirmDialog({
      icon: "warning",
      title: `Remove "${stage.name}"?`,
      text: "It and the deliverables added under it are removed from this project. Tasks are not affected.",
    });
    if (!ok) return;
    try { await deleteCustomStage(stage.id); toast({ icon: "success", title: "Stage removed" }); void refresh(); }
    catch (err) { toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the stage") }); }
  };

  const removeDeliverable = async (d: BoardDeliverable) => {
    const ok = await confirmDialog({
      icon: "warning",
      title: "Remove this deliverable?",
      text: "It is removed from this project only. Tasks are not affected.",
    });
    if (!ok) return;
    try { await deleteCustomDeliverable(d.id); toast({ icon: "success", title: "Deliverable removed" }); void refresh(); }
    catch (err) { toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the deliverable") }); }
  };

  const addStageButton = (
    <WtButton tone="primary" size="small" ghost onClick={() => setAddingStage(true)} startIcon={<KTIcon iconName="plus" className="fs-6" />}
      sx={{ minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}>
      Add Stage
    </WtButton>
  );

  return (
    <div>
      <DetailSummaryBar
        items={[
          { label: "Payment Plan", value: planName || "None", icon: "bi bi-diagram-3", accentColor: "primary" },
          { label: "Stages", value: `${done} of ${stages.length} completed`, icon: "bi bi-signpost-split", accentColor: "blue" },
          { label: "Deliverables", value: total, icon: "bi bi-list-check", accentColor: "green" },
          { label: "Overall Progress", value: `${overall}%`, icon: "bi bi-graph-up-arrow", accentColor: "amber" },
        ]}
      />

      <DetailCard
        title="Deliverables by Stage"
        subtitle="From the payment plan, plus what's added to this project — progress follows its tasks"
        icon="bi bi-list-check"
        actions={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Badge fg={C.primary} icon="bi bi-list-check" label={`${total} Deliverable${total === 1 ? "" : "s"}`} />
            {addStageButton}
          </Stack>
        }
        bodyStyle={{ padding: "16px 20px 20px" }}
      >
        {stages.length === 0 ? (
          <WtEmptyState
            title="No stages yet"
            hint="Set up a payment plan for this project's category under Tasks → Configure → Deliverables, or add a stage to this project."
            actionLabel="Add Stage"
            onAction={() => setAddingStage(true)}
          />
        ) : (
          stages.map((stage, index) => {
            const key = `${stage.source}-${stage.id}`;
            return (
              <StageRow
                key={key}
                label={stageSrNo(index, stageLabels)}
                stage={stage}
                last={index === stages.length - 1}
                open={!folded.has(key)}
                onToggle={() => toggle(key)}
                onAddDeliverable={() => setAddingTo(stage)}
                onRemoveStage={() => void removeStage(stage)}
                onRemoveDeliverable={(d) => void removeDeliverable(d)}
              />
            );
          })
        )}
      </DetailCard>

      <AddStageDialog
        open={addingStage}
        onClose={() => setAddingStage(false)}
        onSave={async (name) => { await addCustomStage(projectId, name); toast({ icon: "success", title: "Stage added" }); await refresh(); }}
      />
      <AddDeliverableDialog
        stage={addingTo}
        onClose={() => setAddingTo(null)}
        onSave={async (task, description) => {
          if (!addingTo) return;
          await addCustomDeliverable(projectId, {
            stageId: addingTo.id, stageSource: addingTo.source, presetTaskId: task.id, name: task.name, description: description || null,
          });
          toast({ icon: "success", title: "Deliverable added" });
          await refresh();
        }}
      />
    </div>
  );
};

export default DeliverablesSection;
