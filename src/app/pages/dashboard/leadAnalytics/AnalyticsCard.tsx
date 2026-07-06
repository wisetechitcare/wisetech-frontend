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
        borderRadius: 20,
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        padding: "22px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 300ms ease",
      }}
    >
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "Barlow, sans-serif",
              fontWeight: 600,
              fontSize: 18,
              margin: 0,
              color: "#0F172A",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 12,
                color: "#94A3B8",
                margin: "2px 0 0",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {headerRight && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {headerRight}
          </div>
        )}
      </div>

      {isEmpty ? (
        <div
          style={{
            flex: 1,
            minHeight: 220,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "#F8FAFF",
            border: "2px solid #EAEEF5",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <i className="bi bi-bar-chart" style={{ fontSize: 32, color: "#9CAFC9" }} />
          <div style={{ fontFamily: "Barlow", fontWeight: 600, fontSize: 14, color: "#6B7280" }}>
            No data available
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: "#9CAFC9" }}>{emptyHint}</div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 240 }}>{children}</div>
      )}

      {!isEmpty && insights.length > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid #EEF2F7",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {insights.map((text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                color: "#475569",
                lineHeight: 1.4,
              }}
            >
              <i
                className="bi bi-lightbulb-fill"
                style={{ color: "#F59E0B", fontSize: 13, marginTop: 1, flexShrink: 0 }}
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
