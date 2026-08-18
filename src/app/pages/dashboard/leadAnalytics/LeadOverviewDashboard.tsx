import React, { useMemo } from "react";
import KpiStatCard from "./KpiStatCard";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsHeader from "./AnalyticsHeader";
import AnalyticsTabs, { AnalyticsTab } from "./AnalyticsTabs";
import PipelinePerformance from "./PipelinePerformance";
import RankedBarChart from "./RankedBarChart";
import ServiceCategoryTabs, { BreakdownTab } from "./ServiceCategoryTabs";
import AcquisitionGauge from "./AcquisitionGauge";
import {
  ChartDatum,
  ChartMetric,
  applyMetric,
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
  subcategoryData?: ChartDatum[];
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
  onSubcategorySelect?: (label: string) => void;
  onSourceSelect?: (label: string) => void;
  onReferralSelect?: (label: string) => void;
  onDirectSelect?: (label: string) => void;
  onCancellationReasonSelect?: (label: string) => void;
  /** Period-specific sections injected into the matching tab. */
  slots?: LeadOverviewSlots;
  /** Persist the active tab per period view. */
  tabStorageKey?: string;
  /**
   * Plot lead COUNT or lead VALUE. Amount reads the `totalCost` every datum
   * already carries, so switching needs no extra fetch.
   */
  metric?: ChartMetric;
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
  subcategoryData,
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
  onSubcategorySelect,
  onSourceSelect,
  onReferralSelect,
  onDirectSelect,
  onCancellationReasonSelect,
  slots,
  tabStorageKey = "leadOverviewActiveTab",
  metric = "count",
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

  const isAmount = metric === "amount";
  // Re-point each dataset at the chosen measure. Every chart below plots `value`
  // and derives share % from it, so this one mapping switches the whole page.
  // (Replaces an unused serviceDataByRevenue that did the same swap for services
  // only and was never rendered.)
  const statusByMetric = useMemo(() => applyMetric(statusData, metric), [statusData, metric]);
  const serviceByMetric = useMemo(() => applyMetric(serviceData, metric), [serviceData, metric]);
  const categoryByMetric = useMemo(() => applyMetric(categoryData, metric), [categoryData, metric]);
  const subcategoryByMetric = useMemo(
    () => applyMetric(subcategoryData || [], metric),
    [subcategoryData, metric]
  );
  const sourceByMetric = useMemo(() => applyMetric(sourceData, metric), [sourceData, metric]);
  const referralByMetric = useMemo(
    () => applyMetric(referralSourceData, metric),
    [referralSourceData, metric]
  );
  const directByMetric = useMemo(
    () => applyMetric(directSourceData, metric),
    [directSourceData, metric]
  );
  const cancellationByMetric = useMemo(
    () => applyMetric(cancellationReasonData, metric),
    [cancellationReasonData, metric]
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
    <PipelinePerformance
      statusData={statusByMetric}
      // Health stays scored on counts — a few high-value leads shouldn't swing it.
      healthData={statusData}
      metric={metric}
      onSelect={onStatusSelect}
    />
  ) : null;

  // Service / Category / Sub-Category folded into ONE ranked-bar card with a tab
  // switcher (replaces the old donut + the two separate category cards). Each tab
  // is gated by the same chartSettings toggles the individual cards used before.
  const breakdownTabs: BreakdownTab[] = [];
  if (showService) {
    breakdownTabs.push({
      id: "services",
      label: "Services",
      cardTitle: "Service Mix",
      cardSubtitle: isAmount
        ? "Distribution by lead value · count in tooltip"
        : "Distribution by lead volume · revenue in tooltip",
      data: serviceByMetric,
      onSelect: onServiceSelect,
      emptyHint: "Add services to see the distribution.",
    });
  }
  if (showCategory) {
    breakdownTabs.push({
      id: "categories",
      label: "Categories",
      cardTitle: "Top Categories",
      cardSubtitle: isAmount
        ? "Ranked by lead value · count in tooltip"
        : "Ranked by lead volume · revenue in tooltip",
      data: categoryByMetric,
      onSelect: onCategorySelect,
      emptyHint: "Create project categories to view the ranking.",
    });
    breakdownTabs.push({
      id: "subcategories",
      label: "Sub-Categories",
      cardTitle: "Top Sub Categories",
      cardSubtitle: isAmount
        ? "Ranked by lead value · count in tooltip"
        : "Ranked by lead volume · revenue in tooltip",
      data: subcategoryByMetric,
      onSelect: onSubcategorySelect,
      emptyHint: "Create sub categories to view the ranking.",
    });
  }

  const serviceSection = breakdownTabs.length ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row g-3">
        <div className="col-12">
          <ServiceCategoryTabs tabs={breakdownTabs} metric={metric} entityLabel="Leads" />
        </div>
      </div>
      {showCancellation && (
        <>
          <AnalyticsHeader
            title="Cancellation Intelligence"
            subtitle="Why leads are being cancelled"
            icon="bi-x-octagon"
            accent="#EF4444"
          />
          <AnalyticsCard
            title="Cancellation Reasons"
            subtitle={isAmount ? "Ranked by lost value · count in tooltip" : "Ranked by volume"}
            index={0}
            isEmpty={isEmpty(cancellationByMetric)}
            emptyHint={
              isAmount
                ? "No value attached to cancelled leads in this period."
                : "No cancelled leads in this period."
            }
          >
            <RankedBarChart
              data={cancellationByMetric}
              onSelect={onCancellationReasonSelect}
              valueLabel
              title="Cancellation Reasons"
              metric={metric}
            />
          </AnalyticsCard>
        </>
      )}
    </section>
  ) : null;

  const acquisitionSection = showAcquisition ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <div className="row g-3">
        {showSource && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard
              title="By Source"
              subtitle={isAmount ? "By lead value" : undefined}
              index={0}
              isEmpty={isEmpty(sourceByMetric)}
              emptyHint="No source data."
            >
              <AcquisitionGauge data={sourceByMetric} onSelect={onSourceSelect} limit={8} height={260} metric={metric} />
            </AnalyticsCard>
          </div>
        )}
        {showReferral && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard
              title="By Referral Source"
              subtitle={isAmount ? "By lead value" : undefined}
              index={1}
              isEmpty={isEmpty(referralByMetric)}
              emptyHint="No referral data."
            >
              <AcquisitionGauge data={referralByMetric} onSelect={onReferralSelect} limit={8} height={260} metric={metric} />
            </AnalyticsCard>
          </div>
        )}
        {showDirect && (
          <div className="col-12 col-lg-4">
            <AnalyticsCard
              title="By Direct Source"
              subtitle={isAmount ? "By lead value" : undefined}
              index={2}
              isEmpty={isEmpty(directByMetric)}
              emptyHint="No direct-source data."
            >
              <AcquisitionGauge data={directByMetric} onSelect={onDirectSelect} limit={8} height={260} metric={metric} />
            </AnalyticsCard>
          </div>
        )}
      </div>
    </section>
  ) : null;


  // ── Group the fragments into focused sub-tabs ───────────────────────────────
  const summaryHasContent = !!(kpiSection || pipelineSection || slots?.summary);
  const servicesHasContent = !!(serviceSection || slots?.services);
  const sourcesHasContent = !!(acquisitionSection || slots?.sources);
  const locationHasContent = !!(slots?.geography);

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
      label: "Services & Insights",
      icon: "bi-grid-1x2",
      accent: "#22C55E",
      content: (servicesHasContent) ? (
        <>
          {serviceSection}
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
      id: "location",
      label: "Location",
      icon: "bi-geo-alt",
      accent: "#14B8A6",
      content: locationHasContent ? (
        <>
          {slots?.geography}
          {slots?.insights}
        </>
      ) : null,
    },
  ];

  return <AnalyticsTabs tabs={tabs} storageKey={tabStorageKey} />;
};

export default React.memo(LeadOverviewDashboard);
