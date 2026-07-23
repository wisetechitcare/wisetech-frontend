import React from "react";
import { motion } from "framer-motion";

interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  index?: number;
  /** Insight strings rendered as an automated insight footer. */
  insights?: string[];
  /** True when there is nothing to plot — shows the empty state instead. */
  isEmpty?: boolean;
  emptyHint?: string;
  /** Optional controls (filters / sort) rendered on the right of the header. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Premium card shell shared by every analytics chart: rounded surface, soft
 * shadow, hover-lift, Framer Motion reveal, title block, automated insight
 * footer and a graceful empty state.
 */
const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  index = 0,
  insights = [],
  isEmpty = false,
  emptyHint = "Create leads to see this visualization.",
  headerRight,
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 12px rgba(15,23,42,0.08), 0 12px 24px rgba(15,23,42,0.06)",
        padding: "clamp(20px, 4vw, 28px)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 300ms ease, transform 300ms ease",
        border: "1px solid #F0F4F8",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            width: "100%",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontFamily: "Barlow, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(16px, 4vw, 19px)",
                margin: 0,
                color: "#0F172A",
                letterSpacing: "-0.3px",
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#64748B",
                  margin: "4px 0 0",
                  lineHeight: "1.4",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {headerRight}
            </div>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div
          style={{
            flex: 1,
            minHeight: 240,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "linear-gradient(135deg, #F8FAFC 0%, #F0F4F8 100%)",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            textAlign: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#EEF2F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-bar-chart" style={{ fontSize: 28, color: "#94A3B8" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: 15, color: "#0F172A" }}>
              No data available
            </div>
            <div style={{ fontFamily: "Inter", fontSize: 13, color: "#64748B", marginTop: 4 }}>
              {emptyHint}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 240 }}>{children}</div>
      )}

      {!isEmpty && insights.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {insights.map((text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.5,
              }}
            >
              <i
                className="bi bi-lightbulb-fill"
                style={{ color: "#F59E0B", fontSize: 14, marginTop: 1, flexShrink: 0 }}
              />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AnalyticsCard;
