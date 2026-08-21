import React, { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrencyCompact } from "@utils/currency";
import { ChartMetric, StatusDistributionRow, groupMeta } from "./leadAnalyticsUtils";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

interface PipelineDistributionProps {
  rows: StatusDistributionRow[];
  /** Fired with the original status label on click / Enter (drill-down). */
  onSelect?: (label: string) => void;
  /** Context: 'leads' | 'projects' — filters displayed statuses */
  context?: 'leads' | 'projects';
  /** Whether `row.value` is a count or money — money renders as compact ₹. */
  metric?: ChartMetric;
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
  context = 'leads',
  metric = 'count',
}) => {
  const [hover, setHover] = useState<string | null>(null);
  const interactive = typeof onSelect === "function";
  // In amount mode the bar value is money, so a bare number would read as a
  // count. Compact ₹ (Cr / L) keeps long budgets from overflowing the row.
  const showValue = (n: number) => (metric === 'amount' ? formatCurrencyCompact(n) : String(n));

  const select = (row: StatusDistributionRow) => {
    if (interactive) onSelect!(row.label);
  };

  // Filter out lead-only statuses when showing projects
  const displayRows = context === 'projects'
    ? rows.filter(row => {
        const label = row.label?.toLowerCase() || '';
        // Hide lead-specific statuses: Pending, Hold (old lead status), Received, Not Received
        return !['pending', 'received', 'not received'].includes(label) &&
               !(label === 'hold' && row.label === 'Hold'); // Hide "Hold" if it's the lead version
      })
    : rows;

  const entityType = context === 'projects' ? 'Projects' : 'Leads';

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {displayRows.map((row, i) => {
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
            aria-label={
              metric === 'amount'
                ? `${row.label}: ${showValue(row.value)}, ${row.pct}% of total value`
                : `${row.label}: ${row.value} ${entityType.toLowerCase()}, ${row.pct}% of total`
            }
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
              padding: "6px 10px",
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
                <AppIcon name={row.icon} className="fs-7" />
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
                // "₹24,947.01 Cr" needs far more room than "444", so widen the
                // value gutter in amount mode instead of letting it wrap.
                minWidth: metric === 'amount' ? 132 : 78,
              }}
            >
              <span
                style={{
                  fontFamily: "Barlow, sans-serif",
                  fontWeight: 700,
                  fontSize: metric === 'amount' ? 14 : 16,
                  color: "#0F172A",
                  whiteSpace: "nowrap",
                }}
              >
                {showValue(row.value)}
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
                {metric === 'amount' ? (
                  <>
                    {showValue(row.value)} · {row.pct}% of total value
                    {/* The count still rides along as volumeValue, so amount mode
                        can show both measures rather than hiding the count. */}
                    {row.volumeValue !== undefined && (
                      <>
                        <br />
                        {row.volumeValue} {entityType}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {row.value} {entityType} · {row.pct}% of total
                  </>
                )}
                <br />
                <span style={{ color: groupMeta(row.group).color }}>
                  {groupMeta(row.group).label}
                </span>
                {interactive && (
                  <>
                    <br />
                    <span style={{ opacity: 0.7 }}>Click to view {entityType.toLowerCase()} →</span>
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
