import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactECharts from "echarts-for-react";
import { useIsMobile } from "@components/navigation/BottomNavigation/useIsMobile";
import { ChartDatum, buildPalette, toRanked } from "./leadAnalyticsUtils";

interface RankedBarChartProps {
  data: ChartDatum[];
  onSelect?: (label: string) => void;
  /** Rows shown before "view all". Defaults to the top 10. */
  limit?: number;
  /** Show ₹ revenue (totalCost) in the tooltip. */
  showRevenue?: boolean;
  height?: number;
  /** Single flat color for ALL bars (overrides per-row/palette colors). */
  barColor?: string;
  /** Lean profile — thinner bars + lighter track for a cleaner, minimal look. */
  lean?: boolean;
  /** Show the raw count next to the % on each bar, e.g. "11 · 50%". */
  valueLabel?: boolean;
  /** Shown in the fullscreen header so the chart keeps its context. */
  title?: string;
}

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const ROW_HEIGHT = 34; // px per bar in the fullscreen view, so all rows stay readable
const DEFAULT_LIMIT = 10; // top-N shown inline; the rest live in the fullscreen view

/**
 * Ranked horizontal bar — sorted by volume, annotated with share % (and optionally the
 * raw count), revenue in tooltip, click to drill down. Shows the top `limit` rows inline
 * (default 10) with a fullscreen expander that reveals every row in a scrollable overlay,
 * so charts with many categories never look squished.
 */
const RankedBarChart: React.FC<RankedBarChartProps> = ({
  data,
  onSelect,
  limit,
  showRevenue = false,
  height = 280,
  barColor,
  lean = false,
  valueLabel = false,
  title,
}) => {
  const [isFull, setIsFull] = useState(false);
  const [sortBy, setSortBy] = useState<"volume" | "name">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const isMobile = useIsMobile();
  // Tall charts (e.g. height 400) waste vertical space and force scrolling on
  // phones — cap the inline height on small screens while keeping desktop as-is.
  const inlineHeight = isMobile ? Math.min(height, 260) : height;

  // Rank the FULL dataset (share is % of the total, computed before any slicing).
  let rankedAll = useMemo(() => toRanked(data), [data]);

  // Apply sorting to both inline and fullscreen
  rankedAll = [...rankedAll].sort((a, b) => {
    let aVal = sortBy === "volume" ? (a.volumeValue !== undefined ? a.volumeValue : a.value) : (a.label || "");
    let bVal = sortBy === "volume" ? (b.volumeValue !== undefined ? b.volumeValue : b.value) : (b.label || "");

    const comparison = sortBy === "volume"
      ? (aVal as number) - (bVal as number)
      : (aVal as string).localeCompare(bVal as string);

    return sortDir === "asc" ? comparison : -comparison;
  });

  const cap = typeof limit === "number" ? limit : DEFAULT_LIMIT;
  const expandable = rankedAll.length > cap;

  // Lock body scroll + wire Escape while the fullscreen overlay is open.
  useEffect(() => {
    if (!isFull) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFull(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFull]);

  // Build an ECharts option for a given slice of ranked rows.
  const makeOption = (rankedRows: any[]) => {
    const palette = buildPalette(rankedRows.length);
    // ECharts y-axis renders bottom-up, so reverse to show the leader on top.
    const rows = [...rankedRows].reverse();

    return {
      grid: { left: 8, right: valueLabel ? 84 : 56, top: 10, bottom: 10, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const row = rows[p.dataIndex];
          const volume = row?.volumeValue !== undefined ? row.volumeValue : row?.value;
          const rev = showRevenue && row?.totalCost ? `<br/>${formatINR(row.totalCost)}` : "";
          const volumeText = row?.volumeValue !== undefined ? `${volume} Leads · ` : "";
          return `<strong>${row?.label}</strong><br/>${volumeText}${row?.share}%${rev}`;
        },
      },
      xAxis: {
        type: "value",
        splitLine: { show: !lean, lineStyle: { color: "#F1F5F9" } },
        axisLabel: { show: !lean, color: "#94A3B8" },
      },
      yAxis: {
        type: "category",
        data: rows.map((r) => r.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: 500 },
      },
      series: [
        {
          type: "bar",
          data: rows.map((r, i) => ({
            value: r.value,
            itemStyle: {
              color: barColor || r.color || palette[rankedRows.length - 1 - i],
              borderRadius: lean ? [4, 4, 4, 4] : [0, 6, 6, 0],
            },
          })),
          barWidth: lean ? "38%" : "60%",
          showBackground: lean,
          backgroundStyle: lean ? { color: "#F1F5F9", borderRadius: 4 } : undefined,
          label: {
            show: true,
            position: "right",
            formatter: (p: any) => {
              const row = rows[p.dataIndex];
              return valueLabel ? `${row.share}% (${row.value})` : `${row.share}%`;
            },
            color: "#64748B",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 11,
          },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
      animationDuration: 500,
      animationEasing: "cubicOut",
    };
  };

  const inlineOption = useMemo(
    () => makeOption(rankedAll.slice(0, cap)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankedAll, cap, showRevenue, barColor, lean, valueLabel, sortBy, sortDir]
  );

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.name && onSelect) onSelect(params.name);
      },
    }),
    [onSelect]
  );

  const fullChartHeight = Math.max(360, rankedAll.length * ROW_HEIGHT);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Compact sort controls for inline view */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "volume" | "name")}
            style={{
              padding: "4px 6px",
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              background: "#fff",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 500,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <option value="volume">Volume</option>
            <option value="name">A-Z</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            style={{
              padding: "4px 8px",
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              background: "#fff",
              color: "#475569",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
          >
            <i className={`bi ${sortDir === "asc" ? "bi-sort-up" : "bi-sort-down"}`} />
          </button>
        </div>

        {/* Fullscreen expander — only when there are more rows than the inline cap. */}
        {expandable && (
          <button
            type="button"
            title="Expand to fullscreen"
            onClick={() => setIsFull(true)}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #E2E8F0",
              borderRadius: 6,
              background: "#fff",
              boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
              cursor: "pointer",
              color: "#475569",
              padding: 0,
            }}
          >
            <i className="bi bi-arrows-fullscreen" style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      <ReactECharts
        option={inlineOption}
        onEvents={onEvents}
        style={{ height: inlineHeight, width: "100%", cursor: "pointer" }}
        opts={{ renderer: "svg" }}
      />

      {expandable && (
        <div style={{ textAlign: "center", marginTop: 2 }}>
          <button
            type="button"
            onClick={() => setIsFull(true)}
            className="btn btn-sm btn-link text-primary fw-semibold p-0"
            style={{ fontSize: 12, textDecoration: "none" }}
          >
            View all {rankedAll.length} <i className="bi bi-arrows-fullscreen" style={{ fontSize: 10 }} />
          </button>
        </div>
      )}

      {/* ── Fullscreen overlay: every row, scrollable ─────────────────────────── */}
      {isFull &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              padding: "16px clamp(12px, 4vw, 24px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                borderBottom: "1px solid #EEF2F7",
                paddingBottom: 12,
                flexWrap: "wrap",
                rowGap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "Barlow, sans-serif",
                    fontWeight: 600,
                    fontSize: "clamp(15px, 4vw, 18px)",
                    color: "#0F172A",
                  }}
                >
                  {title || "All items"}
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#94A3B8" }}>
                  {rankedAll.length} items · sorted {sortBy === "volume" ? "by volume" : "alphabetically"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* Compact Sort Controls */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "volume" | "name")}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 6,
                    background: "#fff",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  <option value="volume">Volume</option>
                  <option value="name">A-Z</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 6,
                    background: "#fff",
                    color: "#475569",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
                >
                  <i className={`bi ${sortDir === "asc" ? "bi-sort-up" : "bi-sort-down"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFull(false)}
                  className="d-flex align-items-center gap-2"
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    background: "#fff",
                    padding: "7px 14px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  <i className="bi bi-fullscreen-exit" style={{ fontSize: 13 }} /> Close
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              <ReactECharts
                option={makeOption(rankedAll)}
                onEvents={onEvents}
                style={{ height: fullChartHeight, width: "100%", cursor: "pointer" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default React.memo(RankedBarChart);
