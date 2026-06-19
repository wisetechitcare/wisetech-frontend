import React from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";

export interface KpiStatCardProps {
  label: string;
  value: number;
  /** Appended after the animated number, e.g. "%". */
  suffix?: string;
  /** Prepended before the animated number, e.g. "₹". */
  prefix?: string;
  /** Decimal places for the CountUp animation (default 0). */
  decimals?: number;
  /** Accent colour for the value + left rail. */
  accent?: string;
  /** bootstrap-icons class shown top-right, e.g. "bi-people". */
  icon?: string;
  /** Animation order, used to stagger the reveal. */
  index?: number;
}

/**
 * A single premium KPI tile. The number animates from 0 → value with
 * react-countup, the card reveals with Framer Motion and lifts on hover.
 */
const KpiStatCard: React.FC<KpiStatCardProps> = ({
  label,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  accent = "#6366F1",
  icon,
  index = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        padding: "18px 20px",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 300ms ease",
      }}
    >
      {/* Accent rail */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background: accent,
        }}
      />
      {icon && (
        <i
          className={`bi ${icon}`}
          style={{ position: "absolute", top: 16, right: 18, fontSize: 18, color: `${accent}99` }}
        />
      )}
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: "#64748B",
          marginBottom: 6,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Barlow, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.1,
          color: accent,
        }}
      >
        {prefix}
        <CountUp end={value} duration={1.2} decimals={decimals} separator="," />
        {suffix}
      </div>
    </motion.div>
  );
};

export default KpiStatCard;
