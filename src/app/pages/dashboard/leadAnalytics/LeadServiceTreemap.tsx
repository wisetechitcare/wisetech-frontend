import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartDatum, buildPalette } from "./leadAnalyticsUtils";

interface LeadServiceTreemapProps {
  data: ChartDatum[];
  /** Fired with the service label when a tile is clicked (drill-down). */
  onSelect?: (label: string) => void;
  height?: number;
}

/**
 * Treemap of leads by service. Replaces the donut chart — area encodes volume,
 * so service dominance is readable at a glance and space is used efficiently.
 */
const LeadServiceTreemap: React.FC<LeadServiceTreemapProps> = ({
  data,
  onSelect,
  height = 280,
}) => {
  const items = useMemo(
    () => (Array.isArray(data) ? data.filter((d) => d.value > 0) : []),
    [data]
  );
  const total = useMemo(() => items.reduce((s, d) => s + d.value, 0), [items]);

  const option = useMemo(() => {
    const palette = buildPalette(items.length);
    const seriesData = items.map((d, i) => ({
      name: d.label,
      value: d.value,
      itemStyle: { color: d.color || palette[i] },
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
          type: "treemap",
          roam: false,
          nodeClick: false, // clicks drill down instead of zooming
          breadcrumb: { show: false },
          width: "100%",
          height: "100%",
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          label: {
            show: true,
            fontFamily: "Barlow, sans-serif",
            fontWeight: 600,
            color: "#fff",
            formatter: (p: any) => `${p.name}\n${p.value}`,
          },
          itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2, borderRadius: 6 },
          emphasis: { itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,0,0,0.3)" } },
          data: seriesData,
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    };
  }, [items, total]);

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

export default LeadServiceTreemap;
