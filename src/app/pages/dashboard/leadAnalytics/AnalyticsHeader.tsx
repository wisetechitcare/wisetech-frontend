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
    style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 2px 2px" }}
  >
    {icon && (
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${accent}1A`,
          color: accent,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: 18 }} />
      </span>
    )}
    <div>
      <h2
        style={{
          fontFamily: "Barlow, sans-serif",
          fontWeight: 700,
          fontSize: 20,
          margin: 0,
          color: "#0F172A",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#94A3B8", margin: 0 }}>
          {subtitle}
        </p>
      )}
    </div>
  </motion.div>
);

export default AnalyticsHeader;
