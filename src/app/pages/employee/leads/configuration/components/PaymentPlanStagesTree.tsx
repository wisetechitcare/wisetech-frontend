import React, { useCallback, useState } from "react";
import { alpha, Box, Collapse, InputAdornment, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import { WtButton, WtIconButton } from "@app/modules/common/components/ui";
import StageDeliverableList from "./StageDeliverableList";
import { autoFixPercentages, pct, stageTotal, toPlanStage, type PlanStage } from "./paymentPlanStages";

interface Props {
  stages: PlanStage[];
  onChange: (next: PlanStage[]) => void;
  /**
   * Whether a stage can be opened to reveal its deliverables. Deliverables are project
   * configuration: a lead shows the fee split and nothing else, so a lead-side editor
   * passes false and gets the same tree with its branches closed off.
   */
  showDeliverables?: boolean;
}

/** Indent of the deliverable branch — lines the rail up under the disclosure chevron. */
const BRANCH_INDENT = { xs: 3.25, sm: 4.25 };

const PaymentPlanStagesTree: React.FC<Props> = ({ stages, onChange, showDeliverables = true }) => {
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  // A branch keeps its list mounted once opened, so closing and reopening doesn't refetch.
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const setCount = useCallback((stageId: string, n: number) => {
    setCounts((prev) => (prev[stageId] === n ? prev : { ...prev, [stageId]: n }));
  }, []);

  const total = stageTotal(stages);
  const isValid = total === 100;

  const patch = (uid: string, changes: Partial<PlanStage>) =>
    onChange(stages.map((s) => (s.uid === uid ? { ...s, ...changes } : s)));

  const addStage = () => onChange([...stages, toPlanStage("", "")]);

  const removeStage = (uid: string) => {
    if (expandedUid === uid) setExpandedUid(null);
    onChange(stages.filter((s) => s.uid !== uid));
  };

  const nudge = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= stages.length) return;
    const next = stages.slice();
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  const autoFix = () => {
    const fixed = autoFixPercentages(stages.map((s) => pct(s.percentage)));
    onChange(stages.map((s, i) => ({ ...s, percentage: fixed[i] })));
  };

  const toggle = (stage: PlanStage) => {
    const opening = expandedUid !== stage.uid;
    setExpandedUid(opening ? stage.uid : null);
    if (opening && stage.id) setVisited((v) => ({ ...v, [stage.id as string]: true }));
  };

  const renderStage = (stage: PlanStage, handleProps?: DragHandleProps) => {
    const index = stages.findIndex((s) => s.uid === stage.uid);
    const isOpen = showDeliverables && expandedUid === stage.uid;
    const count = stage.id ? counts[stage.id] : undefined;

    return (
      <Box
        sx={{
          borderRadius: "14px", border: "1px solid", bgcolor: "background.paper",
          borderColor: isOpen ? "primary.main" : "divider",
          transition: reduceMotion ? "none" : "border-color .15s",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 0.75 }} sx={{ px: { xs: 0.75, sm: 1 }, py: 0.75 }}>
          <DragHandle handleProps={handleProps} disabled={stages.length < 2} onNudge={(dir) => nudge(index, dir)} />

          {showDeliverables && (
            <WtIconButton
              title={isOpen ? "Hide deliverables" : "Show deliverables"}
              aria-expanded={isOpen}
              onClick={() => toggle(stage)}
              sx={{ width: 28, height: 28, borderRadius: "9px", flexShrink: 0 }}
            >
              {/* The chevron IS the tree's open/closed state — rotate it rather than swap glyphs. */}
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  transform: isOpen ? "none" : "rotate(-90deg)",
                  transition: reduceMotion ? "none" : "transform .18s ease",
                }}
              >
                <KTIcon iconName="down" className="fs-7" />
              </Box>
            </WtIconButton>
          )}

          <Typography sx={{ width: 18, flexShrink: 0, textAlign: "center", fontSize: 12, fontWeight: 700, color: "text.disabled" }}>
            {index + 1}
          </Typography>

          <TextField
            size="small"
            fullWidth
            value={stage.name}
            error={!stage.name.trim()}
            onChange={(e) => patch(stage.uid, { name: e.target.value })}
            placeholder="e.g. Design Concept"
            inputProps={{ "aria-label": `Stage ${index + 1} name` }}
            sx={{ minWidth: 0, "& .MuiInputBase-input": { fontSize: 13.5, fontWeight: 600 } }}
          />

          <TextField
            size="small"
            type="number"
            value={stage.percentage}
            error={pct(stage.percentage) < 0}
            onChange={(e) => patch(stage.uid, { percentage: e.target.value })}
            placeholder="0"
            inputProps={{ "aria-label": `Stage ${index + 1} percentage`, min: 0 }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={{
              width: { xs: 88, sm: 104 }, flexShrink: 0,
              "& .MuiInputBase-input": { fontSize: 13.5, fontWeight: 700, textAlign: "right" },
            }}
          />

          {count !== undefined && count > 0 && (
            <Typography sx={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "text.secondary", minWidth: 34, textAlign: "center" }}>
              {count} item{count === 1 ? "" : "s"}
            </Typography>
          )}

          <WtIconButton
            title="Remove stage"
            color="#C0392B"
            disabled={stages.length < 2}
            onClick={() => removeStage(stage.uid)}
            sx={{ width: 32, height: 32, borderRadius: "9px", flexShrink: 0 }}
          >
            <KTIcon iconName="trash" className="fs-6" />
          </WtIconButton>
        </Stack>

        {showDeliverables && (
          <Collapse in={isOpen} mountOnEnter timeout={reduceMotion ? 0 : "auto"}>
            {/* The branch rail: the border-left every deliverable row ticks back to. */}
            <Box sx={{ ml: BRANCH_INDENT, mr: { xs: 1, sm: 1.5 }, pl: "14px", pb: 1.25, borderLeft: "2px solid", borderColor: "divider" }}>
              {stage.id ? (
                <StageDeliverableList
                  stageId={stage.id}
                  loaded={!!visited[stage.id]}
                  onCountChange={(n) => setCount(stage.id as string, n)}
                />
              ) : (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", py: 1 }}>
                  Save the plan first — deliverables attach to a saved stage.
                </Typography>
              )}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>Payment Stages</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {showDeliverables
              ? "Each stage is a % of the total commercial cost. Open one to configure its deliverables."
              : "Each stage is a % of the total commercial cost."}
          </Typography>
        </Box>
        {!isValid && stages.length > 0 && (
          <WtButton
            tone="primary" size="small" ghost onClick={autoFix}
            startIcon={<KTIcon iconName="wrench" className="fs-6" />}
            sx={{ flexShrink: 0, minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}
          >
            Auto-fix to 100%
          </WtButton>
        )}
      </Stack>

      {stages.length === 0 ? (
        <Box
          onClick={addStage}
          sx={{
            py: 2, px: 1.5, borderRadius: "14px", cursor: "pointer", textAlign: "center",
            border: "1px dashed", borderColor: "divider",
            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
          }}
        >
          <Typography sx={{ color: "text.secondary", fontSize: 13, fontWeight: 600 }}>No stages yet</Typography>
          <Typography sx={{ color: "text.disabled", fontSize: 12, mt: 0.25 }}>Click to add the first one.</Typography>
        </Box>
      ) : (
        <ReorderableGroup
          items={stages}
          getItemId={(s) => s.uid}
          axis="y"
          withHandle
          disabled={stages.length < 2}
          className="flex flex-col gap-2"
          onReorder={onChange}
          renderItem={renderStage}
        />
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 1.25 }}>
        <WtButton
          tone="primary" size="small" ghost onClick={addStage}
          startIcon={<KTIcon iconName="plus" className="fs-6" />}
          sx={{ minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}
        >
          Add Stage
        </WtButton>
        <Stack
          direction="row" alignItems="center" spacing={1}
          sx={{
            px: 1.5, py: 0.75, borderRadius: "10px", border: "1px solid",
            borderColor: isValid ? "success.main" : "error.main",
            bgcolor: (t) => alpha(isValid ? t.palette.success.main : t.palette.error.main, 0.08),
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Total</Typography>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: isValid ? "success.main" : "error.main" }}>
            {total}%
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: isValid ? "success.main" : "error.main" }}>
            {isValid ? "✓" : "must equal 100%"}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default PaymentPlanStagesTree;
