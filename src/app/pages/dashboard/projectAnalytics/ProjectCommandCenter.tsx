import React, { useMemo } from "react";
import ProjectCommandCenterKpi from "./ProjectCommandCenterKpi";
import { buildProjectCommandCenterKpis, ProjectStatus } from "./projectAnalyticsUtils";

interface Props {
  statusData: ProjectStatus[];
}

/**
 * Section 1: PROJECT COMMAND CENTER
 * Large executive overview with operational KPIs.
 * Focus: Active projects, completion, delays, contract value, billing, collections.
 */
const ProjectCommandCenter: React.FC<Props> = ({ statusData }) => {
  const kpis = useMemo(
    () => buildProjectCommandCenterKpis(statusData),
    [statusData]
  );

  if (!kpis || kpis.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No project data available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#1F2937",
            marginBottom: "4px",
          }}>
            Project Command Center
          </h2>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
          }}>
            Real-time operational dashboard for project execution and delivery
          </p>
        </div>
      </section>

      {/* KPI Grid: 2 columns on desktop, responsive */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {kpis.map((kpi, i) => (
          <ProjectCommandCenterKpi key={kpi.label} {...kpi} index={i} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ProjectCommandCenter);
