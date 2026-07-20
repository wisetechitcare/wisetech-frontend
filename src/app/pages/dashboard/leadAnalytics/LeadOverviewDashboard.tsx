import React, { useMemo } from "react";
import KpiStatCard from "./KpiStatCard";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsHeader from "./AnalyticsHeader";
import AnalyticsTabs, { AnalyticsTab } from "./AnalyticsTabs";
import PipelinePerformance from "./PipelinePerformance";
import LeadServiceTreemap from "./LeadServiceTreemap";
import RankedBarChart from "./RankedBarChart";
import AcquisitionGauge from "./AcquisitionGauge";
import {
  ChartDatum,
  computeExecutiveKpis,
  generateServiceInsights,
} from "./leadAnalyticsUtils";

/**
 * Period-specific sections the wrapper pages (Monthly / Yearly / All Time) inject
 * into the right tab. Pass an already-gated node (or null when a chart is toggled
 * off) so empty tabs auto-hide.
 */
export interface LeadOverviewSlots {
  /** Extra Summary-tab content (e.g. Daily Inquiry Trend, Revenue Intelligence). */
  summary?: React.ReactNode;
  /** Extra Services-tab content. */
  services?: React.ReactNode;
  /** Extra Sources-tab content (e.g. Client Analysis). */
  sources?: React.ReactNode;
  /** Insights-tab content (e.g. Geographic Distribution). */
  geography?: React.ReactNode;
  /** Any additional Insights-tab content. */
  insights?: React.ReactNode;
}

export interface LeadOverviewDashboardProps {
  statusData: ChartDatum[];
  serviceData: ChartDatum[];
  categoryData: ChartDatum[];
  /** Raw subcategory analytics payload (categories with subCategories[].leads[]). */
  subcategoryRaw: any[];
  sourceData: ChartDatum[];
  referralSourceData: ChartDatum[];
  directSourceData: ChartDatum[];
  cancellationReasonData?: ChartDatum[];
  /** Redux chartSettings — controls which sections are visible. */
  settings: any;
  /**
   * Render the Executive Overview KPI section. The Yearly dashboard supplies
   * its own KPI strip (with YoY deltas + sparklines) and sets this to false to
   * avoid a duplicate KPI row. Defaults to true (Monthly behaviour unchanged).
   */
  showKpis?: boolean;
  onStatusSelect?: (label: string) => void;
  onServiceSelect?: (label: string) => void;
  onCategorySelect?: (label: string) => void;
  onSourceSelect?: (label: string) => void;
  onReferralSelect?: (label: string) => void;
  onDirectSelect?: (label: string) => void;
  onCancellationReasonSelect?: (label: string) => void;
  /** Period-specific sections injected into the matching tab. */
  slots?: LeadOverviewSlots;
  /** Persist the active tab per period view. */
  tabStorageKey?: string;
}

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

/**
 * Executive Lead-Overview analytics surface (core sections, real data only):
 *   1. Executive Overview KPIs
 *   2. Pipeline Performance (funnel)
 *   3. Service Performance (treemap + ranked contribution)
 *   4. Lead Acquisition (ranked bars: source / referral / direct)
 *   5. Category Intelligence (ranked categories by lead volume)
 *
 * Each section honours the existing chartSettings toggles and reuses the
 * shared design-system components.
 */
const LeadOverviewDashboard: React.FC<LeadOverviewDashboardProps> = ({
  statusData,
  serviceData,
  categoryData,
  subcategoryRaw,
  sourceData,
  referralSourceData,
  directSourceData,
  cancellationReasonData = [],
  settings,
  showKpis = true,
  onStatusSelect,
  onServiceSelect,
  onCategorySelect,
  onSourceSelect,
  onReferralSelect,
  onDirectSelect,
  onCancellationReasonSelect,
  slots,
  tabStorageKey = "leadOverviewActiveTab",
}) => {
  const kpis = useMemo(
    () => computeExecutiveKpis(statusData, serviceData),
    [statusData, serviceData]
  );
  const serviceInsights = useMemo(() => generateServiceInsights(serviceData), [serviceData]);

  const kpiCards = useMemo(
    () => [
      { label: "Total Revenue", value: kpis.totalRevenue, prefix: "₹", accent: "#22C55E", icon: "bi-cash-stack" },
      { label: "New Leads", value: kpis.received, accent: "#0EA5E9", icon: "bi-plus-circle" },
      { label: "Conversion Rate", value: kpis.conversionRate, suffix: "%", decimals: 1, accent: "#10B981", icon: "bi-graph-up-arrow" },
      { label: "Avg Deal Value", value: kpis.avgLeadValue, prefix: "₹", accent: "#F59E0B", icon: "bi-tag" },
      { label: "Success Rate", value: 100 - (kpis.lostRate || 0), suffix: "%", decimals: 1, accent: "#6366F1", icon: "bi-check-circle" },
      { label: "Active Opportunities", value: kpis.pipeline, accent: "#8B5CF6", icon: "bi-hourglass-split" },
    ],
    [kpis]
  );

  // Transform service data for revenue ranking: swap value (volume) and totalCost (revenue)
  const serviceDataByRevenue = useMemo(
    () =>
      serviceData.map((s) => ({
        ...s,
        volumeValue: s.value, // Store original volume
        value: s.totalCost || 0, // Use revenue as ranking value
      })),
    [serviceData]
  );

  const showStatus = settings?.showLeadsStatusChart;
  const showService = settings?.showLeadsByServiceChart;
  const showCategory = settings?.showLeadsByProjectCategory;
  const showSource = settings?.showLeadsBySource;
  const showReferral = settings?.showLeadsFromReferral;
  const showDirect = settings?.showLeadsFromDirect;
  const showAcquisition = showSource || showReferral || showDirect;
  const showCancellation = settings?.showLeadsByCancellationReason !== false; // Default to true if undefined

  // ── Section fragments (charts unchanged — only regrouped into tabs) ──────────
  const kpiSection = showKpis ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Executive Overview"
        subtitle="Complete business snapshot for the selected period"
        icon="bi-speedometer2"
        accent="#6366F1"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {kpiCards.map((c, i) => (
          <KpiStatCard key={c.label} {...c} index={i} />
        ))}
      </div>
    </section>
  ) : null;

  const pipelineSection = showStatus ? (
    <PipelinePerformance statusData={statusData} onSelect={onStatusSelect} />
  ) : null;

  const serviceSection = showService ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Service Performance"
        subtitle="Where the business is concentrated"
        icon="bi-grid-1x2"
        accent="#22C55E"
      />
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Service Mix"
            subtitle="Distribution by lead volume"
            index={0}
            isEmpty={isEmpty(serviceData)}
            emptyHint="Add services to see the distribution."
          >
            <LeadServiceTreemap data={serviceData} onSelect={onServiceSelect} />
          </AnalyticsCard>
        </div>
        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Service Value"
            subtitle="Ranked by revenue · lead count in tooltip"
            index={1}
            isEmpty={isEmpty(serviceDataByRevenue)}
            emptyHint="Add services to see the ranking."
          >
            <RankedBarChart data={serviceDataByRevenue} onSelect={onServiceSelect} showRevenue />
          </AnalyticsCard>
        </div>
      </div>
    </section>
  ) : null;

  const acquisitionSection = showAcquisition ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Lead Acquisition"
        subtitle="Where leads are coming from"
        icon="bi-broadcast"
        accent="#0EA5E9"
      />
      <div className="row g-3">
        {showSource && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard title="By Source" index={0} isEmpty={isEmpty(sourceData)} emptyHint="No source data.">
              <AcquisitionGauge data={sourceData} onSelect={onSourceSelect} limit={8} height={260} />
            </AnalyticsCard>
          </div>
        )}
        {showReferral && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard title="By Referral Source" index={1} isEmpty={isEmpty(referralSourceData)} emptyHint="No referral data.">
              <AcquisitionGauge data={referralSourceData} onSelect={onReferralSelect} limit={8} height={260} />
            </AnalyticsCard>
          </div>
        )}
        {showDirect && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard title="By Direct Source" index={2} isEmpty={isEmpty(directSourceData)} emptyHint="No direct-source data.">
              <AcquisitionGauge data={directSourceData} onSelect={onDirectSelect} limit={8} height={260} />
            </AnalyticsCard>
          </div>
        )}
      </div>
    </section>
  ) : null;

  const categorySection = showCategory ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Category Intelligence"
        subtitle="Top project categories ranked by lead volume"
        icon="bi-diagram-3"
        accent="#8B5CF6"
      />
      <AnalyticsCard
        title="Top Categories"
        subtitle="Ranked by lead volume · revenue in tooltip"
        index={0}
        isEmpty={isEmpty(categoryData)}
        emptyHint="Create project categories to view the ranking."
      >
        <RankedBarChart data={categoryData} onSelect={onCategorySelect} showRevenue valueLabel title="Top Categories" />
      </AnalyticsCard>
    </section>
  ) : null;

  const cancellationSection = showCancellation ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Cancellation Intelligence"
        subtitle="Why leads are being cancelled"
        icon="bi-x-octagon"
        accent="#EF4444"
      />
      <AnalyticsCard
        title="Cancellation Reasons"
        subtitle="Ranked by volume"
        index={0}
        isEmpty={isEmpty(cancellationReasonData)}
        emptyHint="No cancelled leads in this period."
      >
        <RankedBarChart data={cancellationReasonData} onSelect={onCancellationReasonSelect} valueLabel title="Cancellation Reasons" />
      </AnalyticsCard>
    </section>
  ) : null;

  // ── Group the fragments into focused sub-tabs ───────────────────────────────
  const summaryHasContent = !!(kpiSection || pipelineSection || slots?.summary);
  const servicesHasContent = !!(serviceSection || categorySection || slots?.services);
  const sourcesHasContent = !!(acquisitionSection || slots?.sources);
  const insightsHasContent = !!(slots?.geography || cancellationSection || slots?.insights);

  const tabs: AnalyticsTab[] = [
    {
      id: "summary",
      label: "Summary",
      icon: "bi-speedometer2",
      accent: "#6366F1",
      content: summaryHasContent ? (
        <>
          {kpiSection}
          {pipelineSection}
          {slots?.summary}
        </>
      ) : null,
    },
    {
      id: "services",
      label: "Services",
      icon: "bi-grid-1x2",
      accent: "#22C55E",
      content: servicesHasContent ? (
        <>
          {serviceSection}
          {categorySection}
          {slots?.services}
        </>
      ) : null,
    },
    {
      id: "sources",
      label: "Sources",
      icon: "bi-broadcast",
      accent: "#0EA5E9",
      content: sourcesHasContent ? (
        <>
          {acquisitionSection}
          {slots?.sources}
        </>
      ) : null,
    },
    {
      id: "insights",
      label: "Insights",
      icon: "bi-geo-alt",
      accent: "#14B8A6",
      content: insightsHasContent ? (
        <>
          {slots?.geography}
          {cancellationSection}
          {slots?.insights}
        </>
      ) : null,
    },
  ];

  return <AnalyticsTabs tabs={tabs} storageKey={tabStorageKey} />;
};

export default React.memo(LeadOverviewDashboard);
