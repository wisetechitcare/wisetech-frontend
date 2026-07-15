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
        backgroundColor: "rgba(15,23,42,0.92)",
        borderWidth: 0,
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (p: any) => {
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
          return `<strong>${p.name}</strong><br/>${p.value} Leads<br/>${pct}% of total`;
        },
      },
      legend: {
        top: 'bottom',
        type: 'scroll',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontFamily: "Inter, sans-serif", color: "#64748b" }
      },
      series: [
        {
          name: 'Service Mix',
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold',
              fontFamily: "Inter, sans-serif",
              color: '#334155',
              formatter: '{b}\n{c} ({d}%)'
            }
          },
          labelLine: {
            show: false
          },
          data: seriesData
        }
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
