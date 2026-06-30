import React, { useMemo } from "react";
import KpiStatCard from "./KpiStatCard";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsHeader from "./AnalyticsHeader";
import PipelinePerformance from "./PipelinePerformance";
import LeadServiceTreemap from "./LeadServiceTreemap";
import RankedBarChart from "./RankedBarChart";
import AcquisitionGauge from "./AcquisitionGauge";
import {
  ChartDatum,
  computeExecutiveKpis,
  generateServiceInsights,
} from "./leadAnalyticsUtils";

export interface LeadOverviewDashboardProps {
  statusData: ChartDatum[];
  serviceData: ChartDatum[];
  categoryData: ChartDatum[];
  /** Raw subcategory analytics payload (categories with subCategories[].leads[]). */
  subcategoryRaw: any[];
  sourceData: ChartDatum[];
  referralSourceData: ChartDatum[];
  directSourceData: ChartDatum[];
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
  settings,
  showKpis = true,
  onStatusSelect,
  onServiceSelect,
  onCategorySelect,
  onSourceSelect,
  onReferralSelect,
  onDirectSelect,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── Section 1: Executive Overview ──────────────────────────────── */}
      {showKpis && (
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
      )}

      {/* ── Section 2: Pipeline Performance ────────────────────────────── */}
      {showStatus && (
        <PipelinePerformance statusData={statusData} onSelect={onStatusSelect} />
      )}

      {/* ── Section 3: Service Performance ─────────────────────────────── */}
      {showService && (
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
      )}

      {/* ── Section 4: Lead Acquisition ────────────────────────────────── */}
      {showAcquisition && (
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
      )}

      {/* ── Section 5: Category Intelligence ───────────────────────────── */}
      {showCategory && (
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
            <RankedBarChart data={categoryData} onSelect={onCategorySelect} limit={10} showRevenue />
          </AnalyticsCard>
        </section>
      )}
    </div>
  );
};

export default React.memo(LeadOverviewDashboard);
