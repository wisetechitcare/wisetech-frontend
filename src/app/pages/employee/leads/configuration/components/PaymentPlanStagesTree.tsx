import React, { useCallback, useState } from "react";
import { Box, Collapse, useMediaQuery } from "@mui/material";
import { ChevronDown, Layers, Plus, Trash2, Wand2 } from "lucide-react";
import ReorderableGroup, { DragHandle, type DragHandleProps } from "@app/modules/common/components/ReorderableGroup";
import StageDeliverableList from "./StageDeliverableList";
import { autoFixPercentages, pct, stageTotal, toPlanStage, type PlanStage } from "./paymentPlanStages";
import { useStageNumberingFormats } from "@hooks/useStageNumberingFormats";
import { formatStageNo, resolveStageFormat } from "@utils/stageNumbering";
import { Button } from "@/ds/ui/button";
import { Input } from "@/ds/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { EmptyState } from "@/ds/patterns/empty-state";
import { cn } from "@/ds/lib/utils";

interface Props {
  stages: PlanStage[];
  onChange: (next: PlanStage[]) => void;
  /** The plan's own numbering format. Empty string = the default format. */
  stageNumberingFormatId?: string;
  /** Present = show the Numbering picker (plan editor); absent = read-only (lead). */
  onStageNumberingFormatChange?: (id: string) => void;
  /**
   * Whether a stage can be opened to reveal its deliverables. Deliverables are project
   * configuration: a lead shows the fee split and nothing else, so a lead-side editor
   * passes false and gets the same tree with its branches closed off.
   */
  showDeliverables?: boolean;
  /** Pre-formatted money per stage (same order as `stages`). A lead passes these so the
   *  editor IS the break-up; the plan editor has no commercial total and omits it. */
  amounts?: string[];
  /** Extra control for the header, beside Numbering / Auto-fix (e.g. a lead's "Reset to plan"). */
  headerAction?: React.ReactNode;
}

/** Indent of the deliverable branch — lines the rail up under the disclosure chevron. */
const BRANCH_INDENT = { xs: 3.25, sm: 4.25 };

/** Select has no empty value, so "follow the default format" is this sentinel. */
const DEFAULT_FORMAT = "__default__";

const PCT_W = "w-24 sm:w-28";
const AMOUNT_W = "w-21 sm:w-30";

const PaymentPlanStagesTree: React.FC<Props> = ({
  stages, onChange, showDeliverables = true,
  stageNumberingFormatId = "", onStageNumberingFormatChange, amounts, headerAction,
}) => {
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  // A branch keeps its list mounted once opened, so closing and reopening doesn't refetch.
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Resolved from the live list, so editing a format on Configure shows here without
  // reopening the plan. No choice = the default, so a new plan is numbered straight away.
  const { formats } = useStageNumberingFormats();
  const activeFormat = resolveStageFormat(formats, stageNumberingFormatId);
  const defaultFormat = formats.find((f) => f.isDefault) ?? null;

  const setCount = useCallback((stageId: string, n: number) => {
    setCounts((prev) => (prev[stageId] === n ? prev : { ...prev, [stageId]: n }));
  }, []);

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

  // Rescales the split to whole points totalling exactly 100 — see autoFixPercentages.
  const autoFix = () => {
    const fixed = autoFixPercentages(stages.map((s) => pct(s.percentage)));
    onChange(stages.map((s, i) => ({ ...s, percentage: String(fixed[i]) })));
  };

  const toggle = (stage: PlanStage) => {
    const opening = expandedUid !== stage.uid;
    setExpandedUid(opening ? stage.uid : null);
    if (opening && stage.id) setVisited((v) => ({ ...v, [stage.id as string]: true }));
  };

  const renderStage = (stage: PlanStage, handleProps?: DragHandleProps) => {
    const index = stages.findIndex((s) => s.uid === stage.uid);
    const isOpen = showDeliverables && expandedUid === stage.uid;
    // Live tally first (this branch has been opened and edited), else the figure the server
    // sent with the plan. Undefined only for a stage that has never been saved, which cannot
    // hold deliverables at all.
    const count = stage.id ? counts[stage.id] ?? stage.deliverableCount ?? 0 : undefined;
    const hasDeliverables = (count ?? 0) > 0;

    return (
      <div className={cn("rounded-2xl bg-card ring-1 transition-[box-shadow]", isOpen ? "ring-primary" : "ring-border")}>
        <div className="flex items-center gap-1.5 p-2 sm:gap-2">
          <DragHandle handleProps={handleProps} disabled={stages.length < 2} onNudge={(dir) => nudge(index, dir)} />

          {showDeliverables && (
            // THE indicator for the whole row: filled = this stage's work is broken down, plain =
            // nothing yet. Which stages still need work is the read that matters here.
            <Button
              type="button"
              variant={hasDeliverables ? "tinted" : "ghost"}
              size="icon-xs"
              title={
                count === undefined
                  ? "Save the plan to add deliverables"
                  : hasDeliverables
                    ? `${count} deliverable${count === 1 ? "" : "s"} — click to ${isOpen ? "hide" : "show"}`
                    : "No deliverables yet — click to add"
              }
              aria-expanded={isOpen}
              aria-label={
                count === undefined
                  ? `Deliverables for stage ${index + 1}`
                  : `${isOpen ? "Hide" : "Show"} deliverables for stage ${index + 1} — ${count} configured`
              }
              onClick={() => toggle(stage)}
              className="shrink-0"
            >
              {/* The chevron IS the tree's open/closed state — rotate it rather than swap glyphs. */}
              <ChevronDown className={cn("transition-transform", !reduceMotion && "duration-200", !isOpen && "-rotate-90")} />
            </Button>
          )}

          {/* The Sr No. Read-only by design: it is the plan's format applied to the position, so it
              cannot be set per stage and a plan is never half-numbered. */}
          <span className="min-w-6 shrink-0 px-0.5 text-center text-xs font-bold whitespace-nowrap text-foreground">
            {formatStageNo(activeFormat, index)}
          </span>

          <Input
            value={stage.name}
            aria-invalid={!stage.name.trim() || undefined}
            onChange={(e) => patch(stage.uid, { name: e.target.value })}
            placeholder="e.g. Design Concept"
            aria-label={`Stage ${index + 1} name`}
            className="h-9 min-w-0 flex-1 font-semibold"
          />

          <InputGroup className={cn("h-9 shrink-0", PCT_W)}>
            <InputGroupInput
              type="number"
              min={0}
              value={stage.percentage}
              aria-invalid={pct(stage.percentage) < 0 || undefined}
              onChange={(e) => patch(stage.uid, { percentage: e.target.value })}
              placeholder="0"
              aria-label={`Stage ${index + 1} percentage`}
              className="text-right font-bold"
            />
            <InputGroupAddon align="inline-end">%</InputGroupAddon>
          </InputGroup>

          {amounts && (
            <span
              title="This stage's share of the total commercial cost"
              className={cn("shrink-0 pr-1 text-right text-[13px] font-bold text-foreground tabular-nums", AMOUNT_W)}
            >
              {amounts[index]}
            </span>
          )}

          <Button
            type="button"
            variant="tinted"
            size="icon-sm"
            title="Remove stage"
            aria-label={`Remove stage ${index + 1}`}
            style={{ "--tint": "var(--cta-danger)" } as React.CSSProperties}
            disabled={stages.length < 2}
            onClick={() => removeStage(stage.uid)}
            className="shrink-0"
          >
            <Trash2 />
          </Button>
        </div>

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
                <p className="m-0 py-2 text-xs text-muted-foreground">
                  Save the plan first — deliverables attach to a saved stage.
                </p>
              )}
            </Box>
          </Collapse>
        )}
      </div>
    );
  };

  const total = stageTotal(stages);
  const exact = total === 100;
  const formatItems = [
    {
      value: DEFAULT_FORMAT,
      label: `Default (${[0, 1].map((i) => formatStageNo(defaultFormat, i)).join(", ")}…)`,
    },
    ...formats.filter((f) => !f.isDefault).map((f) => ({
      value: f.id,
      label: [0, 1, 2].map((i) => formatStageNo(f, i)).join(", "),
    })),
  ];
  const formatValue = formats.some((f) => f.id === stageNumberingFormatId) ? stageNumberingFormatId : DEFAULT_FORMAT;

  return (
    // data-slot: gives the kit's px spacing scale even where no kit ancestor exists (the plan modal).
    <div data-slot="payment-plan-stages" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-foreground">Payment Stages</h3>
          <p className="m-0 text-xs text-muted-foreground">
            {showDeliverables ? "Open a stage to configure its deliverables." : "The stages a project is billed in."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {/* ONE choice for the whole plan. The default follows Configure, so changing it re-numbers
              every plan that never picked. Hidden until there is something to choose between. */}
          {onStageNumberingFormatChange && formats.length > 1 && (
            <Select
              items={formatItems}
              value={formatValue}
              onValueChange={(v) => onStageNumberingFormatChange(v === DEFAULT_FORMAT ? "" : String(v))}
            >
              <SelectTrigger className="h-9 min-w-44" aria-label="Numbering">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatItems.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {stages.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Layers />}
          title="No stages yet"
          description="Add the first stage of the payment split."
          action={
            <Button type="button" variant="outline" size="sm" onClick={addStage}>
              <Plus data-icon="inline-start" />
              Add Stage
            </Button>
          }
        />
      ) : (
        <>
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

          {/* Same padding, gaps and column widths as a stage row, so the total sits under the
              percentage boxes instead of floating at the edge. */}
          <div className="flex items-center gap-1.5 px-2 sm:gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {!exact && (
                <Button type="button" variant="outline" size="sm" onClick={autoFix}>
                  <Wand2 data-icon="inline-start" />
                  Auto-fix to 100%
                </Button>
              )}
              <span className="text-xs font-semibold text-muted-foreground">Total</span>
            </div>
            <span
              className={cn("shrink-0 pr-3.5 text-right text-[13.5px] font-extrabold tabular-nums", PCT_W, exact ? "text-success-foreground" : "text-destructive")}
            >
              {total}%
            </span>
            {amounts && <span aria-hidden className={cn("shrink-0", AMOUNT_W)} />}
            <span aria-hidden className="size-8 shrink-0" />
          </div>

          <div>
            <Button type="button" variant="outline" size="sm" onClick={addStage}>
              <Plus data-icon="inline-start" />
              Add Stage
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentPlanStagesTree;
