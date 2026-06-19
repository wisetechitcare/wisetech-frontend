import React, { useState } from "react";
import { motion } from "framer-motion";
import { StatusDistributionRow, groupMeta } from "./leadAnalyticsUtils";

interface PipelineDistributionProps {
  rows: StatusDistributionRow[];
  /** Fired with the original status label on click / Enter (drill-down). */
  onSelect?: (label: string) => void;
}

/**
 * Horizontal progress pipeline — the modern replacement for the funnel chart.
 *
 * Every status is one full-width row: icon + label, an animated proportional
 * bar (width = share of all leads), and the count + percentage. Rows are
 * keyboard-focusable and clickable to drill into the filtered lead list, and a
 * lightweight hover tooltip surfaces the exact breakdown. Honest, dense and
 * instantly comparable — no misleading funnel taper.
 */
const PipelineDistribution: React.FC<PipelineDistributionProps> = ({
  rows,
  onSelect,
}) => {
  const [hover, setHover] = useState<string | null>(null);
  const interactive = typeof onSelect === "function";

  const select = (row: StatusDistributionRow) => {
    if (interactive) onSelect!(row.label);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((row, i) => {
        const isHover = hover === row.key;
        // Non-zero statuses always keep a sliver of bar so they stay visible
        // and clickable; zero statuses render an empty track.
        const barWidth =
          row.value > 0 ? `${Math.max(row.pct, 3)}%` : "0%";

        return (
          <div
            key={row.key || i}
            role={interactive ? "button" : "group"}
            tabIndex={interactive ? 0 : -1}
            aria-label={`${row.label}: ${row.value} leads, ${row.pct}% of total`}
            onClick={() => select(row)}
            onKeyDown={(e) => {
              if (interactive && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                select(row);
              }
            }}
            onMouseEnter={() => setHover(row.key)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(row.key)}
            onBlur={() => setHover(null)}
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "minmax(108px, 150px) 1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "8px 10px",
              borderRadius: 12,
              cursor: interactive ? "pointer" : "default",
              background: isHover ? `${row.color}12` : "transparent",
              outline: "none",
              transition: "background 180ms ease",
            }}
          >
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${row.color}1A`,
                  color: row.color,
                }}
              >
                <i className={`bi ${row.icon}`} style={{ fontSize: 13 }} />
              </span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.label}
              </span>
            </div>

            {/* Track + animated fill */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(row.pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                position: "relative",
                height: 12,
                borderRadius: 999,
                background: "#F1F5F9",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: barWidth }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${row.color}CC, ${row.color})`,
                  boxShadow: isHover ? `0 0 0 2px ${row.color}40` : "none",
                  transition: "box-shadow 180ms ease",
                }}
              />
            </div>

            {/* Count + percentage */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                justifyContent: "flex-end",
                minWidth: 78,
              }}
            >
              <span
                style={{
                  fontFamily: "Barlow, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#0F172A",
                }}
              >
                {row.value}
              </span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: row.color,
                  minWidth: 38,
                  textAlign: "right",
                }}
              >
                {row.pct}%
              </span>
            </div>

            {/* Hover tooltip */}
            {isHover && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute",
                  top: -6,
                  left: 150,
                  transform: "translateY(-100%)",
                  zIndex: 5,
                  background: "rgba(15,23,42,0.95)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                }}
              >
                <strong>{row.label}</strong>
                <br />
                {row.value} Leads · {row.pct}% of total
                <br />
                <span style={{ color: groupMeta(row.group).color }}>
                  {groupMeta(row.group).label}
                </span>
                {interactive && (
                  <>
                    <br />
                    <span style={{ opacity: 0.7 }}>Click to view leads →</span>
                  </>
                )}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PipelineDistribution;
