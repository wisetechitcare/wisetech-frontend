import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartDatum, buildPalette } from "./leadAnalyticsUtils";

interface LocationBubbleChartProps {
  data: ChartDatum[];
  onSelect?: (label: string) => void;
  /** Show ₹ revenue (totalCost) in the tooltip. */
  showRevenue?: boolean;
  height?: number;
}

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/**
 * Packed bubble cluster for geographic distribution — each location is a floating
 * circle whose AREA scales with lead volume, colored per item, click to drill down.
 * A distinct alternative to the ranked bars: it reads as a "map of weight" and
 * handles non-mappable buckets (e.g. "Unknown") that a real choropleth can't place.
 */
const LocationBubbleChart: React.FC<LocationBubbleChartProps> = ({
  data,
  onSelect,
  showRevenue = false,
  height = 360,
}) => {
  const option = useMemo(() => {
    const rows = (data || []).filter((d) => (d.value || 0) > 0);
    const total = rows.reduce((s, d) => s + (d.value || 0), 0);
    const max = rows.reduce((m, d) => Math.max(m, d.value || 0), 0) || 1;
    const palette = buildPalette(rows.length);

    // Area ∝ value → radius ∝ sqrt(value). Map to a pleasant pixel range.
    const MIN = 34;
    const MAX = 120;
    const sizeOf = (v: number) => MIN + (MAX - MIN) * Math.sqrt(v / max);

    const nodes = rows.map((d, i) => {
      const share = total > 0 ? Math.round((d.value / total) * 1000) / 10 : 0;
      const size = sizeOf(d.value || 0);
      return {
        name: d.label,
        value: d.value,
        symbolSize: size,
        share,
        totalCost: d.totalCost,
        itemStyle: {
          color: d.color || palette[i],
          shadowBlur: 14,
          shadowColor: "rgba(15,23,42,0.18)",
          borderColor: "rgba(255,255,255,0.85)",
          borderWidth: 2,
        },
        label: {
          show: size >= 46,
          // Name on top, count below — only inside bubbles big enough to read.
          formatter: () => `{n|${d.label}}\n{v|${d.value}}`,
          rich: {
            n: { color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: size >= 70 ? 13 : 11, textShadowColor: "rgba(0,0,0,0.25)", textShadowBlur: 2 },
            v: { color: "rgba(255,255,255,0.92)", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: size >= 70 ? 18 : 13, padding: [2, 0, 0, 0] },
          },
        },
      };
    });

    return {
      tooltip: {
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (p: any) => {
          const rev = showRevenue && p.data?.totalCost ? `<br/>${formatINR(p.data.totalCost)}` : "";
          return `<strong>${p.name}</strong><br/>${p.value} Leads · ${p.data?.share}%${rev}`;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: false,
          draggable: true,
          force: {
            repulsion: 220,
            gravity: 0.12,
            edgeLength: 10,
            friction: 0.2,
          },
          data: nodes,
          edges: [],
          emphasis: { scale: true, focus: "self", itemStyle: { shadowBlur: 22 } },
          cursor: "pointer",
        },
      ],
      animationDuration: 900,
      animationEasingUpdate: "cubicInOut",
    };
  }, [data, showRevenue]);

  const onEvents = useMemo(
    () => ({
      click: (params: any) => {
        if (params?.dataType === "node" && params?.name && onSelect) onSelect(params.name);
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

export default React.memo(LocationBubbleChart);
