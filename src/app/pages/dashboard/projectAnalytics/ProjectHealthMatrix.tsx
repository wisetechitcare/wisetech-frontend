import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { calculateProjectHealthMetrics, ProjectStatus } from "./projectAnalyticsUtils";

interface Props {
  statusData: ProjectStatus[];
}

/**
 * Section 3: PROJECT HEALTH MATRIX
 * Most important section. Categorizes projects as: Healthy / At Risk / Delayed / Critical
 * Shows health score, risk indicators, schedule variance, budget variance.
 */
const ProjectHealthMatrix: React.FC<Props> = ({ statusData }) => {
  const metrics = useMemo(
    () => calculateProjectHealthMetrics(statusData),
    [statusData]
  );

  const statusGroups = {
    healthy: metrics.filter(m => m.status === "healthy"),
    "at-risk": metrics.filter(m => m.status === "at-risk"),
    delayed: metrics.filter(m => m.status === "delayed"),
    critical: metrics.filter(m => m.status === "critical"),
  };

  const statusCardConfig: {
    [key: string]: { bg: string; border: string; icon: string; label: string };
  } = {
    healthy: {
      bg: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)",
      border: "#10B981",
      icon: "bi-check-circle-fill",
      label: "Healthy",
    },
    "at-risk": {
      bg: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)",
      border: "#F59E0B",
      icon: "bi-exclamation-circle-fill",
      label: "At Risk",
    },
    delayed: {
      bg: "linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)",
      border: "#FB923C",
      icon: "bi-hourglass-bottom-fill",
      label: "Delayed",
    },
    critical: {
      bg: "linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)",
      border: "#EF4444",
      icon: "bi-exclamation-triangle-fill",
      label: "Critical",
    },
  };

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
            Project Health Matrix
          </h2>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
          }}>
            Categorization of projects by health status with risk indicators and variance analysis
          </p>
        </div>
      </section>

      {/* 4-Column Health Matrix */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {(Object.entries(statusGroups) as Array<[string, typeof metrics]>).map(
          ([statusKey, statusMetrics]) => {
            const config = statusCardConfig[statusKey];
            const totalProjects = statusMetrics.reduce(
              (sum, m) => sum + Math.round((m.value * statusData.reduce((s, d) => s + d.count, 0)) / 100),
              0
            );

            return (
              <motion.div
                key={statusKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div
                  style={{
                    background: config.bg,
                    border: `2px solid ${config.border}`,
                    borderRadius: "12px",
                    padding: 20,
                    minHeight: "280px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Status Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <i
                        className={`${config.icon} text-xl`}
                        style={{ color: config.border }}
                      ></i>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#1F2937",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {config.label}
                      </h3>
                    </div>
                  </div>

                  {/* Project Count */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: 700,
                        color: "#1F2937",
                      }}
                    >
                      {totalProjects}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>
                      projects
                    </div>
                  </div>

                  {/* Metrics */}
                  {statusMetrics.length > 0 && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {statusMetrics.map((metric, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: "12px",
                            color: "#374151",
                            paddingBottom: 8,
                            borderBottom:
                              idx < statusMetrics.length - 1
                                ? "1px solid rgba(0,0,0,0.1)"
                                : "none",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{metric.label}</div>
                          <div style={{ color: "#6B7280", marginTop: 2 }}>
                            {metric.value.toFixed(0)}% of workload
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {statusMetrics.length === 0 && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9CA3AF",
                        fontSize: "13px",
                        textAlign: "center",
                      }}
                    >
                      No projects in this category
                    </div>
                  )}
                </div>
              </motion.div>
            );
          }
        )}
      </div>

      {/* Analysis Footer */}
      <div
        style={{
          backgroundColor: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: 16,
        }}
      >
        <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
          <strong>Health Status Legend:</strong>
          <div style={{ marginTop: 8 }}>
            <div>🟢 <strong>Healthy:</strong> On schedule, on budget, no risk factors</div>
            <div style={{ marginTop: 4 }}>🟡 <strong>At Risk:</strong> Minor delays or budget variance detected</div>
            <div style={{ marginTop: 4 }}>🟠 <strong>Delayed:</strong> &gt;10% behind schedule</div>
            <div style={{ marginTop: 4 }}>🔴 <strong>Critical:</strong> &gt;20% behind or &gt;15% over budget</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProjectHealthMatrix);
