import React, { useId, useMemo } from "react";
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
  /**
   * Period-over-period change (e.g. YoY %). When provided, a coloured trend
   * pill is shown beneath the value. `null`/`undefined` hides the pill.
   */
  delta?: number | null;
  /** Unit shown after the delta number (default "%"). */
  deltaSuffix?: string;
  /** Caption next to the delta (default "vs last year"). */
  deltaLabel?: string;
  /** When false, a positive delta is rendered red (cost / loss metrics). */
  deltaPositiveIsGood?: boolean;
  /** Tiny inline sparkline drawn under the value. */
  sparkline?: number[];
  /**
   * Optional formatter for the big number (e.g. compact ₹). When given, the
   * value is shown formatted (CountUp still animates via formattingFn).
   */
  valueFormatter?: (n: number) => string;
}

/* ── Inline SVG sparkline (no extra dependency) ─────────────────────────── */

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const gradId = useId();
  const W = 96;
  const H = 28;
  const path = useMemo(() => {
    const pts = (data || []).filter((n) => typeof n === "number");
    if (pts.length < 2) return null;
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const span = max - min || 1;
    const step = W / (pts.length - 1);
    const coords = pts.map((v, i) => {
      const x = i * step;
      const y = H - 3 - ((v - min) / span) * (H - 6);
      return [x, y] as const;
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${W},${H} L0,${H} Z`;
    return { line, area };
  }, [data]);

  if (!path) return null;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }} aria-hidden>
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#spark-${gradId})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * A single premium KPI tile. The number animates from 0 → value with
 * react-countup, the card reveals with Framer Motion and lifts on hover.
 * Optionally shows a YoY trend pill and an inline sparkline.
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
  delta,
  deltaSuffix = "%",
  deltaLabel = "vs last year",
  deltaPositiveIsGood = true,
  sparkline,
  valueFormatter,
}) => {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const good = up === deltaPositiveIsGood;
  const deltaColor = good ? "#16A34A" : "#EF4444";
  const hasSpark = Array.isArray(sparkline) && sparkline.filter((n) => n > 0).length >= 2;

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
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: accent }} />
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
          paddingRight: 22,
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
        <CountUp
          end={value}
          duration={1.2}
          decimals={decimals}
          separator=","
          formattingFn={valueFormatter}
        />
        {suffix}
      </div>

      {(hasDelta || hasSpark) && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {hasDelta ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  background: `${deltaColor}14`,
                  color: deltaColor,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                <i className={`bi ${up ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} style={{ fontSize: 11 }} />
                {Math.abs(delta as number)}
                {deltaSuffix}
              </span>
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10.5,
                  color: "#94A3B8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {deltaLabel}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: "#CBD5E1" }}>
              No prior data
            </span>
          )}
          {hasSpark && <Sparkline data={sparkline as number[]} color={accent} />}
        </div>
      )}
    </motion.div>
  );
};

export default KpiStatCard;
