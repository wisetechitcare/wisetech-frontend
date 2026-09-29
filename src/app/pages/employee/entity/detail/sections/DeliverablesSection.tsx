import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircularProgress, Collapse } from "@mui/material";
import { planForLeadQuery } from "@services/paymentPlan";
import { stageSrNo, type PaymentPlanStageDeliverable } from "@models/leads";
import { WtEmptyState, toneAlpha, tonePair } from "@app/modules/common/components/ui";
import { DetailCard, DetailSummaryBar } from "@app/modules/detail-page/DetailPageComponents";
import { C, FONT, RADIUS } from "@app/modules/configuration/ConfigDesignSystem";
import TaskPath from "@pages/employee/tasks/components/TaskPath";
import { stageState, type StageState } from "./deliverableStage";

const MARKER = 28;
/** Deliverable | Status inside a stage. The status sits about two-thirds across, not at the far
 *  edge, so the eye doesn't cross the whole card to get from a name to its state. */
const ROW_GRID = "minmax(0, 3fr) minmax(150px, 2fr)";

/** Colour + icon per stage state. The stage card is tinted by it, so progress reads down the page. */
const STAGE: Record<StageState, { fg: string; label: string; icon: string }> = {
  completed: { fg: tonePair("success").fg, label: "Completed", icon: "bi bi-check-circle-fill" },
  inProgress: { fg: tonePair("brand").fg, label: "In progress", icon: "bi bi-circle-half" },
  notStarted: { fg: C.textSecondary, label: "Not started", icon: "bi bi-circle" },
  empty: { fg: C.textMuted, label: "No deliverables", icon: "bi bi-dash-circle" },
};

/** The one badge shape on this tab — same tint formula as ToneChip (12% fill, 28% border). */
const Badge: React.FC<{ fg: string; icon: string; label: string }> = ({ fg, icon, label }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px 3px 8px",
      borderRadius: RADIUS.full, background: toneAlpha(fg, 0.12), border: `1px solid ${toneAlpha(fg, 0.28)}`,
      color: fg, fontFamily: FONT.body, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
    }}
  >
    <i className={icon} style={{ fontSize: 11, color: fg }} />
    {label}
  </span>
);

/** A deliverable's status: its project task's configured Task Status, or NA while none exists. */
const DeliverableBadge: React.FC<{ status: PaymentPlanStageDeliverable["taskStatus"] }> = ({ status }) =>
  status ? (
    <Badge
      // Only a hex tints cleanly (toneAlpha); anything else would paint text on its own colour.
      fg={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(status.color ?? "") ? status.color! : tonePair("brand").fg}
      icon={status.isFinal ? "bi bi-check-circle-fill" : "bi bi-circle-half"}
      label={status.name}
    />
  ) : (
    <Badge fg={C.textMuted} icon="bi bi-dash-circle" label="NA" />
  );

const StageRow: React.FC<{
  label: string;
  name: string;
  rows: PaymentPlanStageDeliverable[];
  last: boolean;
  open: boolean;
  onToggle: () => void;
}> = ({ label, name, rows, last, open, onToggle }) => {
  const state = STAGE[stageState(rows)];
  const hasRows = rows.length > 0;
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {/* The spine: number, then a line down to the next stage. */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 12 }}>
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
          background: toneAlpha(state.fg, 0.05), border: `1px solid ${toneAlpha(state.fg, 0.18)}`,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          disabled={!hasRows}
          aria-expanded={hasRows ? open : undefined}
          style={{
            all: "unset", boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center",
            gap: 12, padding: "12px 16px", cursor: hasRows ? "pointer" : "default",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{name}</div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
              {hasRows ? `${rows.length} deliverable${rows.length === 1 ? "" : "s"}` : "No deliverables configured for this stage."}
            </div>
          </div>
          {hasRows && <Badge fg={state.fg} icon={state.icon} label={state.label} />}
          <i
            className="bi bi-chevron-down"
            style={{
              fontSize: 13, color: C.textSecondary, width: 16, textAlign: "center",
              visibility: hasRows ? "visible" : "hidden",
              transform: open ? "rotate(180deg)" : "none", transition: "transform .2s ease",
            }}
          />
        </button>

        {hasRows && (
          <Collapse in={open} unmountOnExit>
            <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {rows.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "grid", gridTemplateColumns: ROW_GRID, alignItems: "center", gap: 16,
                    padding: "10px 14px", background: C.bgCard, borderRadius: RADIUS.md,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ minWidth: 0, fontFamily: FONT.body }}>
                    {d.presetTaskId ? (
                      <TaskPath path={d.name} fontSize={13} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, wordBreak: "break-word" }}>{d.name}</span>
                    )}
                    {d.description && (
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{d.description}</div>
                    )}
                  </div>
                  <div><DeliverableBadge status={d.taskStatus} /></div>
                </div>
              ))}
            </div>
          </Collapse>
        )}
      </div>
    </div>
  );
};

/**
 * Project → Deliverables. The stages and deliverables configured for this lead's project type
 * (Tasks → Configure → Deliverables), read LIVE from that configuration — so an edit there
 * shows here on the next visit, with no copy to drift. The plan is chosen server-side by the
 * same rule the New Task preset list uses. A deliverable's status is its project task's
 * configured Task Status (Settings → Task Statuses); NA until that task exists.
 */
const DeliverablesSection: React.FC<{ lead: any }> = ({ lead }) => {
  const planQuery = useQuery(planForLeadQuery(lead?.id ?? ""));
  // Stages start open; this holds the ones the user folded away.
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const plan = planQuery.data;
  const stages = plan?.stages ?? [];

  if (planQuery.isLoading) return <div className="d-flex justify-content-center py-10"><CircularProgress size={24} /></div>;
  if (planQuery.isError) {
    return <WtEmptyState variant="error" title="Couldn't load the deliverables" actionLabel="Try again" onAction={() => void planQuery.refetch()} />;
  }
  if (!plan || stages.length === 0) {
    return (
      <WtEmptyState
        title="No deliverables configured"
        hint="Set up a payment plan for this project's category under Tasks → Configure → Deliverables."
      />
    );
  }

  const rowsByStage = stages.map((s) => s.deliverables ?? []);
  const total = rowsByStage.reduce((n, rows) => n + rows.length, 0);
  const done = rowsByStage.filter((rows) => stageState(rows) === "completed").length;
  const labels = plan.paymentStageGroup?.labels;
  const toggle = (key: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div>
      <DetailSummaryBar
        items={[
          { label: "Payment Plan", value: plan.name || "—", icon: "bi bi-diagram-3", accentColor: "primary" },
          { label: "Stages", value: stages.length, icon: "bi bi-signpost-split", accentColor: "blue" },
          { label: "Deliverables", value: total, icon: "bi bi-list-check", accentColor: "green" },
          { label: "Stages Completed", value: `${done} of ${stages.length}`, icon: "bi bi-check2-circle", accentColor: "amber" },
        ]}
      />

      <DetailCard
        title="Deliverables by Stage"
        subtitle="Configured under Tasks → Configure → Deliverables, tracked through this project's tasks"
        icon="bi bi-list-check"
        actions={<Badge fg={C.primary} icon="bi bi-list-check" label={`${total} Deliverable${total === 1 ? "" : "s"}`} />}
        bodyStyle={{ padding: "16px 20px 20px" }}
      >
        {stages.map((stage, index) => {
          const key = stage.id ?? String(index);
          return (
            <StageRow
              key={key}
              label={stageSrNo(index, labels)}
              name={stage.name}
              rows={rowsByStage[index]}
              last={index === stages.length - 1}
              open={!folded.has(key)}
              onToggle={() => toggle(key)}
            />
          );
        })}
      </DetailCard>
    </div>
  );
};

export default DeliverablesSection;
