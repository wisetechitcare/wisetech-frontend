  import React, { useMemo, useState } from "react";
  import ReactApexChart from "react-apexcharts";
  import {
    Box,
    Button,
    Typography,
    FormControl,
    Select,
    MenuItem,
    SelectChangeEvent,
  } from "@mui/material";
  import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
  import ExpandLessIcon from "@mui/icons-material/ExpandLess";
  import SortIcon from "@mui/icons-material/Sort";
  import { ApexOptions } from "apexcharts";

  interface DataItem {
    id: string;
    name: string;
    companyCount: number;
    color: string;
    parentTypeId?: string | null;
  }

  interface Props {
    data: DataItem[];
    onBarClick: (
      typeId: string | null,
      isOthers?: boolean,
      top10Ids?: string[],
    ) => void;
  }

  // One rendered bar. `kind: "group"` is a collapsible parent header (click toggles);
  // `kind: "leaf"` is a clickable type that filters the table below.
  interface Row {
    id: string;
    name: string;       // display label (may carry a ▸/▾ prefix or indentation)
    rawName: string;    // plain type name (for tooltip)
    value: number;
    color: string;
    kind: "group" | "leaf";
  }

  const INDENT = "  "; // two en-spaces for child/self rows

  const CompaniesByTypeChart: React.FC<Props> = ({ data, onBarClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sortBy, setSortBy] = useState<"countDesc" | "countAsc" | "nameAZ" | "nameZA">(
      "nameAZ",
    );
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (id: string) =>
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });

    const { rows, top10Ids } = useMemo(() => {
      const byId = new Map(data.map((d) => [d.id, d]));

      // Group children under their (in-data) parent.
      const childrenByParent = new Map<string, DataItem[]>();
      data.forEach((d) => {
        if (d.parentTypeId && byId.has(d.parentTypeId)) {
          const arr = childrenByParent.get(d.parentTypeId) || [];
          arr.push(d);
          childrenByParent.set(d.parentTypeId, arr);
        }
      });

      // Top-level entries = everything that isn't a child of an in-data parent.
      let topLevel = data
        .filter((d) => !(d.parentTypeId && byId.has(d.parentTypeId)))
        .map((d) => {
          const children = childrenByParent.get(d.id) || [];
          const total = d.companyCount + children.reduce((s, c) => s + c.companyCount, 0);
          return { item: d, children, isGroup: children.length > 0, total };
        });

      // Sort top-level rows (groups sort by their total; standalone by their own count).
      const cmp = {
        countDesc: (a: any, b: any) => b.total - a.total,
        countAsc: (a: any, b: any) => a.total - b.total,
        nameAZ: (a: any, b: any) => a.item.name.localeCompare(b.item.name),
        nameZA: (a: any, b: any) => b.item.name.localeCompare(a.item.name),
      }[sortBy];
      topLevel.sort(cmp);
      // Sort children A–Z inside each group.
      topLevel.forEach((g) => g.children.sort((a, b) => a.name.localeCompare(b.name)));

      // Collapse the long tail into "Others" (top 10 top-level rows) unless expanded.
      let visibleTop = topLevel;
      let othersSum = 0;
      if (!isExpanded && topLevel.length > 10) {
        visibleTop = topLevel.slice(0, 10);
        othersSum = topLevel.slice(10).reduce((s, g) => s + g.total, 0);
      }

      // Flat list of every type id in the visible top-level rows (for the "Others" filter).
      const top10Ids = visibleTop.flatMap((g) => [g.item.id, ...g.children.map((c) => c.id)]);

      const rows: Row[] = [];
      visibleTop.forEach((g) => {
        if (!g.isGroup) {
          rows.push({ id: g.item.id, name: g.item.name, rawName: g.item.name, value: g.item.companyCount, color: g.item.color, kind: "leaf" });
          return;
        }
        const expanded = expandedGroups.has(g.item.id);
        rows.push({
          id: g.item.id,
          name: `${expanded ? "▾" : "▸"} ${g.item.name}`,
          rawName: g.item.name,
          value: g.total,
          color: g.item.color,
          kind: "group",
        });
        if (expanded) {
          // The parent's own direct count (only when it has any).
          if (g.item.companyCount > 0) {
            rows.push({ id: g.item.id, name: `${INDENT}${g.item.name}`, rawName: g.item.name, value: g.item.companyCount, color: g.item.color, kind: "leaf" });
          }
          g.children.forEach((c) =>
            rows.push({ id: c.id, name: `${INDENT}${c.name}`, rawName: c.name, value: c.companyCount, color: c.color, kind: "leaf" }),
          );
        }
      });

      if (othersSum > 0) {
        rows.push({ id: "others", name: "Others", rawName: "Others", value: othersSum, color: "#94a3b8", kind: "leaf" });
      }

      return { rows, top10Ids };
    }, [data, isExpanded, sortBy, expandedGroups]);

    const handleSortChange = (event: SelectChangeEvent) => {
      setSortBy(event.target.value as any);
    };

    const options: ApexOptions = {
      chart: {
        type: "bar",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const row = rows[config.dataPointIndex];
            if (!row) return;
            if (row.kind === "group") {
              toggleGroup(row.id); // expand / collapse — don't filter
            } else if (row.id === "others") {
              onBarClick(null, true, top10Ids);
            } else {
              onBarClick(row.id);
            }
          },
        },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
        } as any,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "65%",
          distributed: true,
          borderRadius: 4,
          dataLabels: {
            position: "top",
          },
        },
      },
      colors: rows.map((r) => r.color),
      dataLabels: {
        enabled: true,
        textAnchor: "start",
        style: {
          colors: ["#334155"],
          fontSize: "12px",
          fontWeight: 600,
        },
        formatter: function (val: string | number | number[]) {
          return Array.isArray(val) ? val[0] : val;
        },
        offsetX: 10,
      },
      xaxis: {
        categories: rows.map((r) => r.name),
        title: {
          text: "Number of Companies",
          style: {
            color: "#475569",
            fontSize: "13px",
            fontWeight: 800,
          },
          offsetY: 5,
        },
        labels: {
          style: {
            fontSize: "11px",
            fontWeight: 500,
            colors: "#64748b",
          },
        },
        axisBorder: {
          show: true,
          color: '#cbd5e1',
          strokeWidth: 2,
        },
        axisTicks: { show: true, color: '#cbd5e1' },
      },
      yaxis: {
        title: {
          text: "Company Types",

          style: {
            color: "#475569",
            fontSize: "13px",
            fontWeight: 800,
          },
          offsetX: 30,
        },
        labels: {
          show: true,
          minWidth: 150,
          maxWidth: 400,
          style: {
            fontSize: "12px",
            fontWeight: 500,
            colors: "#334155",
          },
          formatter: (val: string | number | number[]) => {
            return Array.isArray(val) ? String(val[0]) : String(val);
          },
        },
        axisBorder: {
          show: true,
          color: '#cbd5e1',
          width: 2,
        },
        axisTicks: {
          show: true,
          color: '#cbd5e1',
        },
      },
      grid: {
        borderColor: "#f1f5f9",
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: {
          right: 50,
          left: 60,
          top: 0,
          bottom: 10,
        },
      },
      tooltip: {
        theme: "light",
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const row = rows[dataPointIndex];
          if (!row) return "";
          const hint = row.kind === "group" ? " (click to expand)" : "";
          return `
            <div style="padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 13px;">${row.rawName}${hint}</div>
              <div style="color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${row.color}; display: inline-block;"></span>
                Count: <span style="font-weight: 600; color: #334155;">${row.value}</span>
              </div>
            </div>
        `;
      },
    },
    legend: { show: false },
  };

  const series = [
    {
      name: "Companies",
      data: rows.map((r) => r.value),
    },
  ];

  return (
    <Box
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: "#1e293b", fontWeight: 700, fontSize: "1.1rem" }}
        >
          Companies by Type
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" variant="outlined" sx={{ minWidth: 160 }}>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              startAdornment={
                <SortIcon
                  sx={{ color: "#64748b", mr: 1, fontSize: "1.2rem" }}
                />
              }
              sx={{
                borderRadius: "8px",
                fontSize: "0.875rem",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e2e8f0",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#cbd5e1",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#6366f1",
                },
              }}
            >
              <MenuItem value="countDesc">Sort by Count (Desc)</MenuItem>
              <MenuItem value="countAsc">Sort by Count (Asc)</MenuItem>
              <MenuItem value="nameAZ">Sort by Name (A–Z)</MenuItem>
              <MenuItem value="nameZA">Sort by Name (Z–A)</MenuItem>
            </Select>
          </FormControl>

          {data.length > 10 && (
            <Button
              variant="text"
              size="small"
              startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{
                textTransform: "none",
                color: "#6366f1",
                fontWeight: 600,
                fontSize: "0.875rem",
                "&:hover": { bgcolor: "rgba(99, 102, 241, 0.04)" },
              }}
            >
              {isExpanded ? "Show Top 10" : `Show All (${data.length})`}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={Math.max(400, rows.length * 42)}
        />
      </Box>
    </Box>
  );
};

export default CompaniesByTypeChart;
