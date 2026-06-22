import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { buildProjectPipelineStages, ProjectStatus, formatINRShort } from "./projectAnalyticsUtils";

interface Props {
  statusData: ProjectStatus[];
}

/**
 * Section 2: PROJECT PIPELINE BOARD
 * Visualizes project lifecycle flow: Received → Planning → Execution → QA → Billing → Completed
 * NOT a sales funnel. Shows: count, value, duration, bottlenecks.
 */
const ProjectPipelineBoard: React.FC<Props> = ({ statusData }) => {
  const stages = useMemo(
    () => buildProjectPipelineStages(statusData),
    [statusData]
  );

  const stageColors: { [key: string]: { bg: string; border: string; text: string } } = {
    Received: { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF" },
    Planning: { bg: "#F0F4FF", border: "#8B5CF6", text: "#5B21B6" },
    Execution: { bg: "#FEF3C7", border: "#F59E0B", text: "#B45309" },
    QA: { bg: "#DDD6FE", border: "#6366F1", text: "#312E81" },
    Billing: { bg: "#DBEAFE", border: "#06B6D4", text: "#0369A1" },
    Completed: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
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
            Project Pipeline
          </h2>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
          }}>
            Project lifecycle flow with count, value, duration, and bottleneck analysis
          </p>
        </div>
      </section>

      {/* Process Flow */}
      <div style={{
        display: "flex",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 12,
      }}>
        {stages.map((stage, idx) => {
          const color = stageColors[stage.stage] || stageColors.Received;
          const hasBottleneck = stage.bottleneck;

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              style={{
                flex: "0 0 auto",
                width: "200px",
                minWidth: "200px",
              }}
            >
              <div
                style={{
                  backgroundColor: color.bg,
                  border: `2px solid ${color.border}`,
                  borderRadius: "12px",
                  padding: 16,
                  position: "relative",
                }}
              >
                {/* Bottleneck Badge */}
                {hasBottleneck && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 8,
                      backgroundColor: "#EF4444",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    ⚠️ Bottleneck
                  </div>
                )}

                {/* Stage Name */}
                <div style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: color.text,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  {stage.stage}
                </div>

                {/* Project Count (Large) */}
                <div style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: color.text,
                  marginBottom: 8,
                }}>
                  {stage.projectCount}
                </div>

                {/* Value */}
                <div style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: 8,
                }}>
                  Value: <strong>{formatINRShort(stage.totalValue)}</strong>
                </div>

                {/* Duration */}
                <div style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  paddingTop: 8,
                  borderTop: `1px solid ${color.border}`,
                }}>
                  Avg Duration: <strong>{stage.avgDuration}d</strong>
                </div>
              </div>

              {/* Arrow to next stage */}
              {idx < stages.length - 1 && (
                <div style={{
                  textAlign: "center",
                  margin: "8px 0",
                  color: "#9CA3AF",
                  fontSize: "20px",
                }}>
                  ↓
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        backgroundColor: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        padding: 12,
        fontSize: "12px",
        color: "#6B7280",
      }}>
        <strong>Legend:</strong> Count = projects in stage | Value = total contract value | Duration = average days in stage | ⚠️ Bottleneck = &gt;50 projects queued
      </div>
    </div>
  );
};

export default React.memo(ProjectPipelineBoard);
