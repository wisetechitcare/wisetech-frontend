import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildCategorySunburst } from "./leadAnalyticsUtils";

interface CategorySunburstProps {
  /** Raw subcategory analytics payload: categories with `subCategories[].leads[]`. */
  raw: any[];
  /** Fired with the clicked node name (category or sub-category) for drill-down. */
  onSelect?: (label: string) => void;
  height?: number;
}

/**
 * Category → Sub-category sunburst. Inner ring = categories, outer ring =
 * sub-categories. Click any arc to drill down. Replaces the flat category pie
 * and the disconnected sub-category bar with a single hierarchical view.
 */
const CategorySunburst: React.FC<CategorySunburstProps> = ({ raw, onSelect, height = 320 }) => {
  const nodes = useMemo(() => buildCategorySunburst(raw), [raw]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15,23,42,0.92)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif" },
        formatter: (p: any) => `<strong>${p.name}</strong><br/>${p.value} Leads`,
      },
      series: [
        {
          type: "sunburst",
          radius: ["18%", "95%"],
          nodeClick: false, // emit click event instead of zooming
          data: nodes,
          sort: undefined,
          emphasis: { focus: "ancestor" },
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          levels: [
            {},
            {
              r0: "18%",
              r: "55%",
              label: {
                rotate: "tangential",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Inter, sans-serif",
                padding: [3, 8],
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: 2,
              },
            },
            {
              r0: "55%",
              r: "95%",
              label: {
                rotate: 0,
                align: "right",
                fontSize: 11,
                fontWeight: 500,
                color: "#334155",
                fontFamily: "Inter, sans-serif",
                padding: [2, 6],
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                borderRadius: 2,
              },
            },
          ],
        },
      ],
      animationDuration: 800,
      animationEasing: "cubicOut",
    }),
    [nodes]
  );

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

export default React.memo(CategorySunburst);
