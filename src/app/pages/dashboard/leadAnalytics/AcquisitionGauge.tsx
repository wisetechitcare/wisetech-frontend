import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartDatum, buildPalette, toRanked } from "./leadAnalyticsUtils";

interface AcquisitionGaugeProps {
  data: ChartDatum[];
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
 * Semi-circle gauge (half-donut) for lead-acquisition splits. The top half-ring is
 * divided proportionally by share; the total lead count sits in the center and a
 * compact legend lists each source with its share %. A distinct, executive-friendly
 * alternative to the repeated ranked bars — ideal for the 2–3 category breakdowns
 * (By Source / By Referral Source / By Direct Source).
 */
const AcquisitionGauge: React.FC<AcquisitionGaugeProps> = ({
  data,
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
      // carry extras for the tooltip
      share: r.share,
      totalCost: r.totalCost,
      itemStyle: { color: r.color || palette[i] },
    }));

    return {
      // ECharts maps the sum of values across the (startAngle → endAngle) span, so a
      // 180° span turns the donut into a half-ring split by share.
      tooltip: {
        trigger: "item",
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (p: any) => {
          const rev = showRevenue && p.data?.totalCost ? `<br/>${formatINR(p.data.totalCost)}` : "";
          return `<strong>${p.name}</strong><br/>${p.value} Leads · ${p.data?.share ?? p.percent}%${rev}`;
        },
      },
      legend: {
        bottom: 0,
        left: "center",
        itemWidth: 10,
        itemHeight: 10,
        icon: "roundRect",
        textStyle: { color: "#475569", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 12 },
      },
      // Total in the center, just under the arc.
      title: {
        text: String(total),
        subtext: "Total Leads",
        left: "center",
        top: "46%",
        textAlign: "center",
        textStyle: { color: "#0F172A", fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 26 },
        subtextStyle: { color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500 },
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "88%"],
          center: ["50%", "68%"],
          startAngle: 180,
          endAngle: 0,
          clockwise: true,
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 2,
            borderRadius: 4,
          },
          label: {
            show: true,
            position: "outside",
            formatter: (p: any) => `${p.data?.share ?? p.percent}%`,
            color: "#64748B",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 11,
          },
          labelLine: { length: 8, length2: 8, lineStyle: { color: "#CBD5E1" } },
          emphasis: {
            scaleSize: 6,
            itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.25)" },
          },
          data: slices,
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [ranked, total, showRevenue]);

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

export default React.memo(AcquisitionGauge);
