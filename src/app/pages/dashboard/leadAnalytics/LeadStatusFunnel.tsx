import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  ChartDatum,
  orderStatusForFunnel,
  resolveStatusColor,
} from "./leadAnalyticsUtils";

interface LeadStatusFunnelProps {
  data: ChartDatum[];
  /** Fired with the status label when a funnel stage is clicked (drill-down). */
  onSelect?: (label: string) => void;
  height?: number;
}

/**
 * Horizontal funnel of the lead lifecycle (Pending → Hold → Received → Not
 * Received). Replaces the old pie chart — a funnel reads as a process and makes
 * stage-to-stage comparison far easier for executives.
 */
const LeadStatusFunnel: React.FC<LeadStatusFunnelProps> = ({
  data,
  onSelect,
  height = 280,
}) => {
  const ordered = useMemo(() => orderStatusForFunnel(data), [data]);
  const total = useMemo(
    () => ordered.reduce((sum, d) => sum + (d.value || 0), 0),
    [ordered]
  );

  const option = useMemo(() => {
    const seriesData = ordered.map((d) => ({
      name: d.label,
      value: d.value,
      itemStyle: { color: resolveStatusColor(d.label, d.color) },
    }));

    return {
      tooltip: {
        trigger: "item",
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (p: any) => {
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
          return `<strong>${p.name}</strong><br/>${p.value} Leads<br/>${pct}% of total`;
        },
      },
      series: [
        {
          type: "funnel",
          orient: "horizontal",
          funnelAlign: "center",
          sort: "none", // keep our lifecycle order, not value order
          gap: 6,
          left: "4%",
          right: "4%",
          top: 10,
          bottom: 10,
          minSize: "28%",
          maxSize: "100%",
          label: {
            show: true,
            position: "inside",
            color: "#fff",
            fontWeight: 700,
            fontFamily: "Barlow, sans-serif",
            fontSize: 13,
            formatter: (p: any) => `${p.name}\n${p.value}`,
          },
          labelLine: { show: false },
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          emphasis: {
            label: { fontSize: 15 },
            itemStyle: { shadowBlur: 14, shadowColor: "rgba(0,0,0,0.25)" },
          },
          data: seriesData,
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [ordered, total]);

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

export default LeadStatusFunnel;
