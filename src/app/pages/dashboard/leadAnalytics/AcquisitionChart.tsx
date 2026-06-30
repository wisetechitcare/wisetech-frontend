import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartDatum, buildPalette, toRanked } from "./leadAnalyticsUtils";

export type AcquisitionVariant = "gauge" | "donut" | "rose";

interface AcquisitionChartProps {
  data: ChartDatum[];
  variant: AcquisitionVariant;
  onSelect?: (label: string) => void;
  /** Limit to top-N rows (default: all). */
  limit?: number;
  /** Show ₹ revenue (totalCost) in the tooltip. */
  showRevenue?: boolean;
  height?: number;
}

const formatINR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/**
 * Lead-acquisition composition chart with three interchangeable looks so the
 * By Source / By Referral / By Direct cards each read differently instead of
 * repeating one chart type:
 *   - "gauge" : top half-donut split by share, total in the center
 *   - "donut" : full ring, total in the center
 *   - "rose"  : Nightingale rose (petal length scales with volume)
 * All variants share the legend, tooltip, palette and click-to-drill behaviour.
 */
const AcquisitionChart: React.FC<AcquisitionChartProps> = ({
  data,
  variant,
  onSelect,
  limit,
  showRevenue = false,
  height = 260,
}) => {
  const ranked = useMemo(() => toRanked(data, limit), [data, limit]);
  const total = useMemo(() => ranked.reduce((s, r) => s + (r.value || 0), 0), [ranked]);

  const option = useMemo(() => {
    const palette = buildPalette(ranked.length);
    const slices = ranked.map((r, i) => ({
      name: r.label,
      value: r.value,
      share: r.share,
      totalCost: r.totalCost,
      itemStyle: { color: r.color || palette[i] },
    }));

    const tooltip = {
      trigger: "item",
      confine: true,
      borderWidth: 0,
      backgroundColor: "rgba(15,23,42,0.92)",
      textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
      formatter: (p: any) => {
        const rev = showRevenue && p.data?.totalCost ? `<br/>${formatINR(p.data.totalCost)}` : "";
        return `<strong>${p.name}</strong><br/>${p.value} Leads · ${p.data?.share ?? p.percent}%${rev}`;
      },
    };

    const legend = {
      bottom: 0,
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      icon: "roundRect",
      textStyle: { color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 12 },
    };

    const sharedLabel = {
      color: "#64748B",
      fontFamily: "Inter, sans-serif",
      fontWeight: 600,
      fontSize: 11,
    };

    // Center total — used by gauge + donut (rose has no hollow center).
    const centerTitle = (top: string) => ({
      text: String(total),
      subtext: "Total Leads",
      left: "center",
      top,
      textAlign: "center",
      textStyle: { color: "#0F172A", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 26 },
      subtextStyle: { color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500 },
    });

    const baseSeries = {
      type: "pie",
      avoidLabelOverlap: true,
      itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
      emphasis: { scaleSize: 6, itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.25)" } },
      labelLine: { length: 8, length2: 8, lineStyle: { color: "#CBD5E1" } },
      data: slices,
    };

    if (variant === "gauge") {
      return {
        tooltip,
        legend,
        title: centerTitle("46%"),
        series: [
          {
            ...baseSeries,
            radius: ["58%", "88%"],
            center: ["50%", "68%"],
            startAngle: 180,
            endAngle: 0,
            clockwise: true,
            label: { show: true, position: "outside", formatter: (p: any) => `${p.data?.share ?? p.percent}%`, ...sharedLabel },
          },
        ],
        animationDuration: 800,
        animationEasing: "cubicOut",
      };
    }

    if (variant === "donut") {
      return {
        tooltip,
        legend,
        title: centerTitle("40%"),
        series: [
          {
            ...baseSeries,
            radius: ["52%", "78%"],
            center: ["50%", "46%"],
            label: { show: true, position: "outside", formatter: (p: any) => `${p.data?.share ?? p.percent}%`, ...sharedLabel },
          },
        ],
        animationDuration: 800,
        animationEasing: "cubicOut",
      };
    }

    // rose — Nightingale: equal angles, radius scales with volume.
    return {
      tooltip,
      legend,
      series: [
        {
          ...baseSeries,
          roseType: "area",
          radius: ["18%", "80%"],
          center: ["50%", "46%"],
          itemStyle: { ...baseSeries.itemStyle, borderRadius: 6 },
          label: {
            show: true,
            position: "outside",
            formatter: (p: any) => `${p.name}\n${p.data?.share ?? p.percent}%`,
            ...sharedLabel,
          },
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [ranked, total, showRevenue, variant]);

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

export default React.memo(AcquisitionChart);
