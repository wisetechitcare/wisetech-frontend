import React from "react";
import { motion } from "framer-motion";

interface AnalyticsHeaderProps {
  title: string;
  subtitle?: string;
  /** bootstrap-icons class, e.g. "bi-funnel". */
  icon?: string;
  accent?: string;
}

/** Section heading for the executive dashboard — consistent typographic rhythm. */
const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  title,
  subtitle,
  icon,
  accent = "#6366F1",
}) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    style={{ display: "flex", alignItems: "flex-start", gap: 14, margin: "0 0 2px" }}
  >
    {icon && (
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${accent}15`,
          color: accent,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${accent}10`,
          marginTop: 2,
        }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: 20, fontWeight: 600 }} />
      </span>
    )}
    <div style={{ flex: 1 }}>
      <h2
        style={{
          fontFamily: "Barlow, sans-serif",
          fontWeight: 700,
          fontSize: "clamp(18px, 4.5vw, 22px)",
          margin: "0 0 6px 0",
          color: "#0F172A",
          letterSpacing: "-0.4px",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "#64748B",
            margin: 0,
            lineHeight: "1.5",
            fontWeight: 400,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  </motion.div>
);

export default AnalyticsHeader;
