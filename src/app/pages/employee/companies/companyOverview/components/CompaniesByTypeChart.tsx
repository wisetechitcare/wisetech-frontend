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
  }

  interface Props {
    data: DataItem[];
    onBarClick: (
      typeId: string | null,
      isOthers?: boolean,
      top10Ids?: string[],
    ) => void;
  }

  const CompaniesByTypeChart: React.FC<Props> = ({ data, onBarClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sortBy, setSortBy] = useState<"countDesc" | "countAsc" | "nameAZ">(
      "nameAZ",
    );

    const { chartData, top10Ids } = useMemo(() => {
      let sorted = [...data];

      // Apply sorting
      if (sortBy === "countDesc") {
        sorted.sort((a, b) => b.companyCount - a.companyCount);
      } else if (sortBy === "countAsc") {
        sorted.sort((a, b) => a.companyCount - b.companyCount);
      } else if (sortBy === "nameAZ") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      }

      const top10 = sorted.slice(0, 10);
      const others = sorted.slice(10);
      const top10Ids = top10.map((item) => item.id);

      if (isExpanded || others.length === 0) {
        return { chartData: sorted, top10Ids };
      }

      const othersSum = others.reduce((acc, curr) => acc + curr.companyCount, 0);
      const combinedData = [
        ...top10,
        {
          id: "others",
          name: "Others",
          companyCount: othersSum,
          color: "#94a3b8", // Slate-400
        },
      ];

      return { chartData: combinedData, top10Ids };
    }, [data, isExpanded, sortBy]);

    const handleSortChange = (event: SelectChangeEvent) => {
      setSortBy(event.target.value as any);
    };

    const options: ApexOptions = {
      chart: {
        type: "bar",
        toolbar: { show: false },
        events: {
          dataPointSelection: (event, chartContext, config) => {
            const selectedItem = chartData[config.dataPointIndex];
            if (selectedItem.id === "others") {
              onBarClick(null, true, top10Ids);
            } else {
              onBarClick(selectedItem.id);
            }
          },
        },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
        },
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
      colors: chartData.map((item) => item.color),
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
        categories: chartData.map((item) => item.name),
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
          const item = chartData[dataPointIndex];
          return `
            <div style="padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 13px;">${item.name}</div>
              <div style="color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.color}; display: inline-block;"></span>
                Count: <span style="font-weight: 600; color: #334155;">${item.companyCount}</span>
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
      data: chartData.map((item) => item.companyCount),
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
          height={isExpanded ? Math.max(400, chartData.length * 45) : 400}
        />
      </Box>
    </Box>
  );
};

export default CompaniesByTypeChart;
