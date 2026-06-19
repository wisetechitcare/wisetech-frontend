import React, { useMemo } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import AnalyticsHeader from "./AnalyticsHeader";
import AnalyticsCard from "./AnalyticsCard";
import PipelineDistribution from "./PipelineDistribution";
import PipelineHealthRing from "./PipelineHealthRing";
import {
  ChartDatum,
  StatusDistributionRow,
  buildStatusDistribution,
  computeLeadStatusKpis,
  computePipelineHealth,
  generatePipelineInsights,
  summarizeStatusGroups,
  toneColor,
} from "./leadAnalyticsUtils";

interface PipelinePerformanceProps {
  statusData: ChartDatum[];
  /** Drill-down: fires with the status label → opens the filtered lead list. */
  onSelect?: (label: string) => void;
  /** Stagger order for the reveal animation. */
  index?: number;
  /** Show skeletons instead of data. */
  loading?: boolean;
}

/* ── Compact KPI pill ───────────────────────────────────────────────────── */

interface PillProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  share?: number; // 0–100, drives the micro progress bar
  color: string;
  icon: string;
  onClick?: () => void;
  index: number;
}

const KpiPill: React.FC<PillProps> = ({
  label,
  value,
  suffix = "",
  decimals = 0,
  share,
  color,
  icon,
  onClick,
  index,
}) => {
  const clickable = typeof onClick === "function";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={clickable ? { y: -3 } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={share != null ? `${label}: ${value}${suffix} · ${share}% of total` : label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick!();
        }
      }}
      style={{
        flex: "1 1 150px",
        minWidth: 150,
        background: "#fff",
        border: "1px solid #EEF2F7",
        borderRadius: 14,
        padding: "12px 14px",
        cursor: clickable ? "pointer" : "default",
        outline: "none",
        transition: "box-shadow 220ms ease, border-color 220ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}1A`,
            color,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className={`bi ${icon}`} style={{ fontSize: 14 }} />
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: "#64748B",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "Barlow, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1,
            color: "#0F172A",
          }}
        >
          <CountUp end={value} duration={1.1} decimals={decimals} separator="," />
          {suffix}
        </span>
        {share != null && (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 600, color }}>
            {share}%
          </span>
        )}
      </div>

      {share != null && (
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 999,
            background: "#F1F5F9",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(share, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.1 + index * 0.06, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 999, background: color }}
          />
        </div>
      )}
    </motion.div>
  );
};

/* ── Stacked Active / Converted / Lost summary bar ──────────────────────── */

const GroupSummaryBar: React.FC<{
  segments: { label: string; value: number; pct: number; color: string }[];
}> = ({ segments }) => {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          height: 14,
          borderRadius: 999,
          overflow: "hidden",
          background: "#F1F5F9",
        }}
      >
        {visible.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: "easeOut" }}
            title={`${s.label}: ${s.value} · ${s.pct}%`}
            style={{ background: s.color, height: "100%" }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#475569" }}>
              {s.label}
            </span>
            <span
              style={{
                fontFamily: "Barlow, sans-serif",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              {s.value}
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: s.color, fontWeight: 600 }}>
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Conversion analytics mini-stat ─────────────────────────────────────── */

const AnalyticStat: React.FC<{
  label: string;
  value: number;
  suffix: string;
  color: string;
  hint: string;
}> = ({ label, value, suffix, color, hint }) => (
  <div
    title={hint}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderRadius: 12,
      background: "#F8FAFC",
      border: "1px solid #EEF2F7",
    }}
  >
    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 500, color: "#475569" }}>
      {label}
    </span>
    <span style={{ fontFamily: "Barlow, sans-serif", fontSize: 17, fontWeight: 700, color }}>
      <CountUp end={value} duration={1.1} decimals={value % 1 === 0 ? 0 : 1} />
      {suffix}
    </span>
  </div>
);

/* ── Skeleton ───────────────────────────────────────────────────────────── */

const shimmer: React.CSSProperties = {
  background: "linear-gradient(90deg, #EEF2F7 25%, #F6F8FB 50%, #EEF2F7 75%)",
  backgroundSize: "200% 100%",
  animation: "pp-shimmer 1.3s ease-in-out infinite",
  borderRadius: 10,
};

const PipelineSkeleton: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <style>{`@keyframes pp-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ ...shimmer, flex: "1 1 150px", height: 88 }} />
      ))}
    </div>
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      <div style={{ ...shimmer, flex: "1 1 240px", height: 220 }} />
      <div style={{ ...shimmer, flex: "2 1 360px", height: 220 }} />
    </div>
  </div>
);

/* ── Section ────────────────────────────────────────────────────────────── */

/**
 * Pipeline Performance — a modern CRM analytics surface that replaces the
 * outdated funnel chart. It answers the executive questions at a glance: how
 * many leads are active / converted / lost, the conversion rate, what needs
 * attention and the overall pipeline health — all drill-down enabled.
 */
const PipelinePerformance: React.FC<PipelinePerformanceProps> = ({
  statusData,
  onSelect,
  index = 0,
  loading = false,
}) => {
  const rows = useMemo(() => buildStatusDistribution(statusData), [statusData]);
  const kpis = useMemo(() => computeLeadStatusKpis(statusData), [statusData]);
  const groups = useMemo(() => summarizeStatusGroups(rows), [rows]);
  const health = useMemo(() => computePipelineHealth(kpis), [kpis]);
  const insights = useMemo(
    () => generatePipelineInsights(kpis, rows, health),
    [kpis, rows, health]
  );

  const isEmpty = kpis.total === 0;

  // Resolve the real backend labels so pill drill-down hits the right status.
  const labelFor = (key: string): string | undefined =>
    rows.find((r) => r.key === key)?.label;
  const drill = (key: string) => {
    const label = labelFor(key);
    if (label && onSelect) onSelect(label);
  };

  const pct = (n: number) => (kpis.total > 0 ? Math.round((n / kpis.total) * 1000) / 10 : 0);

  const pills: PillProps[] = [
    {
      label: "Active Pipeline",
      value: kpis.pipeline,
      share: groups.activePct,
      color: "#F59E0B",
      icon: "bi-hourglass-split",
      index: 0,
    },
    {
      label: "Converted",
      value: kpis.received,
      share: pct(kpis.received),
      color: "#22C55E",
      icon: "bi-check2-circle",
      onClick: labelFor("received") ? () => drill("received") : undefined,
      index: 1,
    },
    {
      label: "Lost",
      value: kpis.notReceived,
      share: pct(kpis.notReceived),
      color: "#EF4444",
      icon: "bi-x-circle",
      onClick: labelFor("notreceived") ? () => drill("notreceived") : undefined,
      index: 2,
    },
    {
      label: "Conversion Rate",
      value: kpis.conversionRate,
      suffix: "%",
      decimals: 1,
      color: "#0EA5E9",
      icon: "bi-graph-up-arrow",
      index: 3,
    },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Pipeline Performance"
        subtitle="Lead distribution, conversion health & what needs attention"
        icon="bi-bar-chart-steps"
        accent="#F59E0B"
      />

      <AnalyticsCard
        title="Lead Distribution"
        subtitle="Share of every status · click a row to drill into the leads"
        index={index}
        isEmpty={!loading && isEmpty}
        emptyHint="Create leads to see the pipeline distribution."
      >
        {loading ? (
          <PipelineSkeleton />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* ── KPI pills ──────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {pills.map((p) => (
                <KpiPill key={p.label} {...p} />
              ))}
            </div>

            {/* ── Health + analytics  |  distribution ────────────────── */}
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {/* Left column */}
              <div
                style={{
                  flex: "1 1 240px",
                  maxWidth: 300,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    width: "100%",
                  }}
                >
                  <PipelineHealthRing health={health} />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11.5,
                      color: "#94A3B8",
                      textAlign: "center",
                    }}
                  >
                    Pipeline Health Score
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  <AnalyticStat
                    label="Conversion"
                    value={kpis.conversionRate}
                    suffix="%"
                    color="#22C55E"
                    hint="Received ÷ Total leads"
                  />
                  <AnalyticStat
                    label="Loss Rate"
                    value={kpis.lostRate}
                    suffix="%"
                    color="#EF4444"
                    hint="Not Received ÷ Total leads"
                  />
                  <AnalyticStat
                    label="Active Pipeline"
                    value={kpis.pipelinePct}
                    suffix="%"
                    color="#F59E0B"
                    hint="(Pending + Hold) ÷ Total leads"
                  />
                </div>
              </div>

              {/* Right column */}
              <div
                style={{
                  flex: "2 1 360px",
                  minWidth: 300,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <PipelineDistribution rows={rows} onSelect={onSelect} />

                <div style={{ paddingTop: 6, borderTop: "1px solid #EEF2F7" }}>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11.5,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      color: "#94A3B8",
                      margin: "10px 0 12px",
                    }}
                  >
                    Lifecycle roll-up
                  </div>
                  <GroupSummaryBar
                    segments={[
                      { label: "Active", value: groups.active, pct: groups.activePct, color: "#F59E0B" },
                      { label: "Converted", value: groups.won, pct: groups.wonPct, color: "#22C55E" },
                      { label: "Lost", value: groups.lost, pct: groups.lostPct, color: "#EF4444" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* ── Smart insights ─────────────────────────────────────── */}
            {insights.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingTop: 16,
                  borderTop: "1px solid #EEF2F7",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    color: "#94A3B8",
                  }}
                >
                  <i className="bi bi-stars" style={{ color: "#F59E0B" }} />
                  Smart Insights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {insights.map((ins, i) => {
                    const c = toneColor(ins.tone);
                    return (
                      <motion.div
                        key={ins.text}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.08 }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 9,
                          padding: "9px 12px",
                          borderRadius: 10,
                          background: `${c}10`,
                          borderLeft: `3px solid ${c}`,
                        }}
                      >
                        <i className={`bi ${ins.icon}`} style={{ color: c, fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 13,
                            color: "#334155",
                            lineHeight: 1.4,
                          }}
                        >
                          {ins.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </AnalyticsCard>
    </section>
  );
};

export default React.memo(PipelinePerformance);
