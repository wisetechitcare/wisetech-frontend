import React from "react";
import { motion } from "framer-motion";
import AnalyticsHeader from "./AnalyticsHeader";
import { toneColor } from "./leadAnalyticsUtils";
import { YearlyInsight } from "./yearlyAnalyticsUtils";

interface YearlyInsightsPanelProps {
  insights: YearlyInsight[];
}

/**
 * Executive Insights — AI-style, auto-generated takeaways for the year. Each
 * card is derived from the real yearly numbers (growth, conversion, top
 * service / channel / geography) and tone-coloured for instant scanning.
 */
const YearlyInsightsPanel: React.FC<YearlyInsightsPanelProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Executive Insights"
        subtitle="Auto-generated takeaways from this year's performance"
        icon="bi-stars"
        accent="#F59E0B"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {insights.map((ins, i) => {
          const c = toneColor(ins.tone);
          return (
            <motion.div
              key={ins.text}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -3 }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                borderLeft: `4px solid ${c}`,
                padding: "16px 18px",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: `${c}1A`,
                  color: c,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className={`bi ${ins.icon}`} style={{ fontSize: 16 }} />
              </span>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: "#334155",
                }}
              >
                {ins.text}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default React.memo(YearlyInsightsPanel);
