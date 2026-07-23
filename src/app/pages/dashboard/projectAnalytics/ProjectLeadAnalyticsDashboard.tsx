import React from "react";
import AnalyticsCard from "../leadAnalytics/AnalyticsCard";
import AnalyticsHeader from "../leadAnalytics/AnalyticsHeader";
import AnalyticsTabs, { AnalyticsTab } from "../leadAnalytics/AnalyticsTabs";
import PipelinePerformance from "../leadAnalytics/PipelinePerformance";
import RankedBarChart from "../leadAnalytics/RankedBarChart";
import AcquisitionGauge from "../leadAnalytics/AcquisitionGauge";
import ServiceCategoryTabs, { BreakdownTab } from "../leadAnalytics/ServiceCategoryTabs";
import { ChartDatum } from "../leadAnalytics/leadAnalyticsUtils";

/**
 * Period-specific sections the Project Overview page injects into the matching
 * sub-tab. Pass an already-gated node (or null when a chart is toggled off) so
 * empty tabs auto-hide. Mirrors LeadOverviewSlots.
 */
export interface ProjectOverviewSlots {
  /** Extra Summary-tab content (e.g. Monthly Projects Trend). */
  summary?: React.ReactNode;
  /** Extra Services-tab content. */
  services?: React.ReactNode;
  /** Extra Sources-tab content. */
  sources?: React.ReactNode;
  /** Teams-tab content (Projects by Internal Team + External Team). */
  teams?: React.ReactNode;
  /** Insights-tab content (e.g. Projects By Location). */
  geography?: React.ReactNode;
  /** Any additional Insights-tab content. */
  insights?: React.ReactNode;
}

export interface ProjectLeadAnalyticsDashboardProps {
  statusData: ChartDatum[];
  serviceData: ChartDatum[];
  categoryData: ChartDatum[];
  subcategoryData?: ChartDatum[];
  subcategoryRaw?: any[];
  locationData: ChartDatum[];
  /** Redux chartSettings — controls which sections are visible. */
  settings: any;
  /** Kept for API parity with the leads dashboard; the project view has no KPI strip. */
  showKpis?: boolean;
  onStatusSelect?: (label: string) => void;
  onServiceSelect?: (label: string) => void;
  onCategorySelect?: (label: string) => void;
  onSubcategorySelect?: (label: string) => void;
  onLocationSelect?: (label: string) => void;
  /** Period-specific sections injected into the matching tab. */
  slots?: ProjectOverviewSlots;
  /** Persist the active tab per period view. */
  tabStorageKey?: string;
  /** DOM id to portal the sub-tab bar into (period-filter row). */
  portalTargetId?: string;
}

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

/**
 * Project Analytics Dashboard (Received Leads).
 *
 * Every chart here is sourced from the lead table but restricted to
 * project-trigger ("Received") leads via the backend `receivedOnly` flag; the
 * status chart specifically groups by PROJECT status (execution.projectStatusId).
 *
 * Regrouped — like the Leads Overview — into focused sub-tabs so only one group
 * renders at a time:
 *   • Summary   — Pipeline Performance (project status) + injected trend
 *   • Services  — Service Performance + Category Intelligence
 *   • Sources   — Project Acquisition (source / company type)
 *   • Insights  — injected geography (Projects By Location) + extras
 *
 * Reuses the shared leadAnalytics components for a consistent design system.
 */
const ProjectLeadAnalyticsDashboard: React.FC<ProjectLeadAnalyticsDashboardProps> = ({
  statusData,
  serviceData,
  categoryData,
  subcategoryData,
  subcategoryRaw,
  settings,
  onStatusSelect,
  onServiceSelect,
  onCategorySelect,
  onSubcategorySelect,
  slots,
  tabStorageKey = "projectOverviewActiveTab",
  portalTargetId = "projectOverviewTabSlot",
}) => {
  // Transform service data for revenue ranking: swap value (volume) and totalCost (revenue)
  const serviceDataByRevenue = React.useMemo(
    () =>
      serviceData.map((s) => ({
        ...s,
        volumeValue: s.value,
        value: s.totalCost || 0,
      })),
    [serviceData]
  );

  const showStatus = settings?.showProjectsStatus ?? true;
  const showService = settings?.showProjectsByService ?? true;
  const showCategory = settings?.showProjectsByCategory ?? true;



  // ── Section fragments (charts unchanged — only regrouped into tabs) ──────────
  const pipelineSection = showStatus ? (
    <PipelinePerformance statusData={statusData} onSelect={onStatusSelect} context="projects" />
  ) : null;

  const breakdownTabs: BreakdownTab[] = [];
  if (showService) {
    breakdownTabs.push({
      id: "services",
      label: "Services",
      cardTitle: "Service Mix",
      cardSubtitle: "Distribution by project volume · revenue in tooltip",
      data: serviceData,
      onSelect: onServiceSelect,
      emptyHint: "Add services to see the distribution.",
    });
  }
  if (showCategory) {
    breakdownTabs.push({
      id: "categories",
      label: "Categories",
      cardTitle: "Top Categories",
      cardSubtitle: "Ranked by project count · value in tooltip",
      data: categoryData,
      onSelect: onCategorySelect,
      emptyHint: "Create project categories to view the ranking.",
    });
    breakdownTabs.push({
      id: "subcategories",
      label: "Sub-Categories",
      cardTitle: "Top Sub Categories",
      cardSubtitle: "Ranked by project count · value in tooltip",
      data: subcategoryData || [],
      onSelect: onSubcategorySelect,
      emptyHint: "Create sub categories to view the ranking.",
    });
  }

  const serviceSection = breakdownTabs.length ? (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Service & Category Mix"
        subtitle="Project volume by service and category"
        icon="bi-grid-1x2"
        accent="#22C55E"
      />
      <div className="row g-3">
        <div className="col-12">
          <ServiceCategoryTabs tabs={breakdownTabs} />
        </div>
      </div>
    </section>
  ) : null;





  // ── Group the fragments into focused sub-tabs (mirrors LeadOverviewDashboard) ──
  const summaryHasContent = !!(pipelineSection || slots?.summary);
  const servicesHasContent = !!(serviceSection || slots?.services);
  const insightsHasContent = !!(slots?.geography || slots?.insights);

  const tabs: AnalyticsTab[] = [
    {
      id: "summary",
      label: "Summary",
      icon: "bi-speedometer2",
      accent: "#6366F1",
      content: summaryHasContent ? (
        <>
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
      content: (servicesHasContent || insightsHasContent) ? (
        <>
          {serviceSection}
          {slots?.services}
          {slots?.geography}
          {slots?.insights}
        </>
      ) : null,
    },

    {
      id: "teams",
      label: "Teams",
      icon: "bi-people",
      accent: "#F59E0B",
      content: slots?.teams ?? null,
    },

  ];

  return <AnalyticsTabs tabs={tabs} storageKey={tabStorageKey} portalTargetId={portalTargetId} />;
};

export default React.memo(ProjectLeadAnalyticsDashboard);
