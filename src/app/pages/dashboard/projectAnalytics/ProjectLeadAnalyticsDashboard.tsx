import React, { useMemo } from "react";
import AnalyticsCard from "../leadAnalytics/AnalyticsCard";
import AnalyticsHeader from "../leadAnalytics/AnalyticsHeader";
import PipelinePerformance from "../leadAnalytics/PipelinePerformance";
import LeadServiceTreemap from "../leadAnalytics/LeadServiceTreemap";
import RankedBarChart from "../leadAnalytics/RankedBarChart";
import AcquisitionGauge from "../leadAnalytics/AcquisitionGauge";
import {
  ChartDatum,
  computeExecutiveKpis,
  generateServiceInsights,
} from "../leadAnalytics/leadAnalyticsUtils";

export interface ProjectLeadAnalyticsDashboardProps {
  statusData: ChartDatum[];
  serviceData: ChartDatum[];
  categoryData: ChartDatum[];
  sourceData: ChartDatum[];
  companyTypeData: ChartDatum[];
  locationData: ChartDatum[];
  /** Redux chartSettings — controls which sections are visible. */
  settings: any;
  showKpis?: boolean;
  onStatusSelect?: (label: string) => void;
  onServiceSelect?: (label: string) => void;
  onCategorySelect?: (label: string) => void;
  onSourceSelect?: (label: string) => void;
  onCompanyTypeSelect?: (label: string) => void;
  onLocationSelect?: (label: string) => void;
}

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

/**
 * Project Analytics Dashboard (Received Leads).
 *
 * Every chart here is sourced from the lead table but restricted to
 * project-trigger ("Received") leads via the backend `receivedOnly` flag.
 *
 * Sections:
 *   1. Pipeline Performance (project status distribution)
 *   2. Service Performance (services used by projects)
 *   3. Project Acquisition (by source, company type, location)
 *   4. Category Intelligence (ranked project categories)
 *
 * Reuses lead analytics components for consistency.
 */
const ProjectLeadAnalyticsDashboard: React.FC<ProjectLeadAnalyticsDashboardProps> = ({
  statusData,
  serviceData,
  categoryData,
  sourceData,
  companyTypeData,
  locationData,
  settings,
  showKpis = true,
  onStatusSelect,
  onServiceSelect,
  onCategorySelect,
  onSourceSelect,
  onCompanyTypeSelect,
  onLocationSelect,
}) => {
  const kpis = useMemo(
    () => computeExecutiveKpis(statusData, serviceData),
    [statusData, serviceData]
  );
  const serviceInsights = useMemo(() => generateServiceInsights(serviceData), [serviceData]);

  // Transform service data for revenue ranking: swap value (volume) and totalCost (revenue)
  const serviceDataByRevenue = useMemo(
    () =>
      serviceData.map((s) => ({
        ...s,
        volumeValue: s.value,
        value: s.totalCost || 0,
      })),
    [serviceData]
  );

  const showStatus = settings?.showLeadsStatusChart;
  const showService = settings?.showLeadsByServiceChart;
  const showCategory = settings?.showLeadsByProjectCategory;
  const showSource = settings?.showLeadsBySource;
  const showCompanyType = settings?.showLeadsByCompanyType;
  const showLocation = settings?.showLeadsByLocationAnalytics;
  const showAcquisition = showSource || showCompanyType || showLocation;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── Section 1: Pipeline Performance ────────────────────────────── */}
      {showStatus && (
        <PipelinePerformance statusData={statusData} onSelect={onStatusSelect} />
      )}

      {/* ── Section 2: Service Performance ─────────────────────────────── */}
      {showService && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AnalyticsHeader
            title="Service Performance"
            subtitle="Services used across active projects"
            icon="bi-grid-1x2"
            accent="#22C55E"
          />
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <AnalyticsCard
                title="Service Mix"
                subtitle="Distribution by project count"
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
                subtitle="Ranked by project value · project count in tooltip"
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

      {/* ── Section 3: Project Acquisition ────────────────────────────────── */}
      {showAcquisition && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AnalyticsHeader
            title="Project Acquisition"
            subtitle="Where projects are coming from"
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
            {showCompanyType && (
              <div className="col-12 col-lg-4">
                <AnalyticsCard title="By Company Type" index={1} isEmpty={isEmpty(companyTypeData)} emptyHint="No company-type data.">
                  <AcquisitionGauge data={companyTypeData} onSelect={onCompanyTypeSelect} limit={8} height={260} />
                </AnalyticsCard>
              </div>
            )}
            {showLocation && (
              <div className="col-12 col-lg-4">
                <AnalyticsCard title="By Location" index={2} isEmpty={isEmpty(locationData)} emptyHint="No location data.">
                  <AcquisitionGauge data={locationData} onSelect={onLocationSelect} limit={8} height={260} />
                </AnalyticsCard>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Section 4: Category Intelligence ───────────────────────────── */}
      {showCategory && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AnalyticsHeader
            title="Category Intelligence"
            subtitle="Top project categories ranked by volume"
            icon="bi-diagram-3"
            accent="#8B5CF6"
          />
          <AnalyticsCard
            title="Top Categories"
            subtitle="Ranked by project count · value in tooltip"
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

export default React.memo(ProjectLeadAnalyticsDashboard);
