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
        backgroundColor: "rgba(15,23,42,0.95)",
        textStyle: { color: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13 },
        formatter: (p: any) => `<strong style="font-size:14px">${p.name}</strong><br/><span style="color:#E2E8F0">${p.value} Leads</span>`,
        padding: [10, 14],
      },
      series: [
        {
          type: "sunburst",
          radius: ["20%", "90%"],
          nodeClick: false,
          data: nodes,
          sort: undefined,
          emphasis: {
            focus: "ancestor",
            itemStyle: { borderWidth: 3 },
          },
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 2,
            borderType: "solid",
          },
          levels: [
            {},
            {
              r0: "20%",
              r: "50%",
              label: {
                rotate: "tangential",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Inter, sans-serif",
                padding: [4, 10],
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                borderRadius: 3,
                show: true,
              },
              itemStyle: {
                borderColor: "#fff",
                borderWidth: 2,
              },
            },
            {
              r0: "50%",
              r: "90%",
              label: {
                rotate: 0,
                align: "right",
                fontSize: 11,
                fontWeight: 500,
                color: "#1E293B",
                fontFamily: "Inter, sans-serif",
                padding: [3, 8],
                backgroundColor: "rgba(248, 250, 252, 0.9)",
                borderRadius: 3,
                show: true,
              },
              itemStyle: {
                borderColor: "#fff",
                borderWidth: 1.5,
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
