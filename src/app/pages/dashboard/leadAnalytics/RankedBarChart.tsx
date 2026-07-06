import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartDatum, buildPalette, toRanked } from "./leadAnalyticsUtils";

interface RankedBarChartProps {
  data: ChartDatum[];
  onSelect?: (label: string) => void;
  /** Limit to top-N rows (default: all). */
  limit?: number;
  /** Show ₹ revenue (totalCost) in the tooltip. */
  showRevenue?: boolean;
  height?: number;
  /** Single flat color for ALL bars (overrides per-row/palette colors). */
  barColor?: string;
  /** Lean profile — thinner bars + lighter track for a cleaner, minimal look. */
  lean?: boolean;
}

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/**
 * Ranked horizontal bar — replaces source/referral/direct donuts. Sorted by
 * volume, annotated with share %, revenue in tooltip, click to drill down.
 */
const RankedBarChart: React.FC<RankedBarChartProps> = ({
  data,
  onSelect,
  limit,
  showRevenue = false,
  height = 280,
  barColor,
  lean = false,
}) => {
  const ranked = useMemo(() => toRanked(data, limit), [data, limit]);

  const option = useMemo(() => {
    const palette = buildPalette(ranked.length);
    // ECharts y-axis renders bottom-up, so reverse to show the leader on top.
    const rows = [...ranked].reverse();

    return {
      grid: { left: 8, right: 56, top: 10, bottom: 10, containLabel: true },
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
              color: barColor || r.color || palette[ranked.length - 1 - i],
              borderRadius: lean ? [4, 4, 4, 4] : [0, 6, 6, 0],
            },
          })),
          barWidth: lean ? "38%" : "60%",
          // Lean mode draws a faint full-width track behind each bar so short bars
          // stay readable without heavy gridlines.
          showBackground: lean,
          backgroundStyle: lean ? { color: "#F1F5F9", borderRadius: 4 } : undefined,
          label: {
            show: true,
            position: "right",
            formatter: (p: any) => `${rows[p.dataIndex].share}%`,
            color: "#64748B",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 11,
          },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
      animationDuration: 700,
      animationEasing: "cubicOut",
    };
  }, [ranked, showRevenue, barColor, lean]);

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.name && onSelect) onSelect(params.name);
      },
    }),
    [onSelect]
  );

  return (
    <ReactECharts
      option={option}
      onEvents={onEvents}
      style={{ height, width: "100%", cursor: "pointer" }}
      opts={{ renderer: "svg" }}
    />
  );
};

export default React.memo(RankedBarChart);
