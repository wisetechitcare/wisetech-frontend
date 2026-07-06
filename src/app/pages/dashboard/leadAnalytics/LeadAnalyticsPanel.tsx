import React, { useMemo } from "react";
import KpiStatCard from "./KpiStatCard";
import AnalyticsCard from "./AnalyticsCard";
import LeadStatusFunnel from "./LeadStatusFunnel";
import LeadServiceTreemap from "./LeadServiceTreemap";
import {
  ChartDatum,
  computeLeadStatusKpis,
  generateStatusInsights,
  generateServiceInsights,
} from "./leadAnalyticsUtils";

interface LeadAnalyticsPanelProps {
  statusData: ChartDatum[];
  serviceData: ChartDatum[];
  /** Drill-down handlers — wired to the existing ChartDialogModal. */
  onStatusSelect?: (label: string) => void;
  onServiceSelect?: (label: string) => void;
}

/**
 * Premium, enterprise-grade Lead Analytics block:
 *   • KPI header row (animated counters)
 *   • Lead-status funnel + lead-service treemap (side-by-side, responsive)
 *   • Automated business insights under each chart
 *
 * Replaces the two pie/donut charts that previously lived in DashboardGraph.
 */
const LeadAnalyticsPanel: React.FC<LeadAnalyticsPanelProps> = ({
  statusData,
  serviceData,
  onStatusSelect,
  onServiceSelect,
}) => {
  const kpis = useMemo(() => computeLeadStatusKpis(statusData), [statusData]);
  const statusInsights = useMemo(() => generateStatusInsights(kpis), [kpis]);
  const serviceInsights = useMemo(
    () => generateServiceInsights(serviceData),
    [serviceData]
  );

  const statusEmpty = kpis.total === 0;
  const serviceEmpty =
    !serviceData || serviceData.every((d) => !d.value || d.value <= 0);

  const kpiCards = [
    { label: "Total Leads", value: kpis.total, accent: "#6366F1" },
    { label: "Received", value: kpis.received, accent: "#22C55E" },
    { label: "Conversion", value: kpis.conversionRate, suffix: "%", decimals: 1, accent: "#0EA5E9" },
    { label: "Pipeline", value: kpis.pipeline, accent: "#F59E0B" },
    { label: "Lost Rate", value: kpis.lostRate, suffix: "%", decimals: 1, accent: "#EF4444" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── KPI header row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        {kpiCards.map((c, i) => (
          <KpiStatCard
            key={c.label}
            label={c.label}
            value={c.value}
            suffix={c.suffix}
            decimals={c.decimals}
            accent={c.accent}
            index={i}
          />
        ))}
      </div>

      {/* ── Charts: 2-up on desktop, stacked below ─────────────────────── */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Leads by Status"
            subtitle="Lead lifecycle funnel — click a stage to drill down"
            index={0}
            insights={statusInsights}
            isEmpty={statusEmpty}
            emptyHint="Create leads to see the status funnel."
          >
            <LeadStatusFunnel data={statusData} onSelect={onStatusSelect} />
          </AnalyticsCard>
        </div>

        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Leads by Service"
            subtitle="Service dominance treemap — click a tile to drill down"
            index={1}
            insights={serviceInsights}
            isEmpty={serviceEmpty}
            emptyHint="Add services to see the lead distribution."
          >
            <LeadServiceTreemap data={serviceData} onSelect={onServiceSelect} />
          </AnalyticsCard>
        </div>
      </div>
    </div>
  );
};

export default LeadAnalyticsPanel;
