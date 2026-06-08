import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { FilterDropdown } from "./FilterDropdown";
import { clamp } from "lodash";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";

interface BarChartData {
  label: string;
  value?: number | string;
  color?: string;
  totalCost?: number;
  budget?: number | string;
  [key: string]: string | number | undefined;
}

// Add type for dataKey and nameKey props
interface BarChartKeys {
  dataKey: keyof BarChartData;
  nameKey: keyof BarChartData;
}

interface CustomBarChartProps {
  data: any[];
  width?: string | number;
  height?: number;
  title: string;
  showLegend?: boolean;
  showGrid?: boolean;
  dataKey?: keyof BarChartData;
  nameKey?: keyof BarChartData;
  yAxisLabel?: string;
  xAxisLabel?: string;
  barRadius?: number;
  showTooltip?: boolean;
  customTooltip?: React.ComponentType<any>;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  showFilter?: boolean;
  filterKey?: string;
  filterOptions?: string[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  isThisProjectToolTip?: boolean;
  onChartClick?: (selectedLabel: string) => void;
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  width = 400,
  height = 400,
  title,
  showLegend = false,
  showGrid = true,
  dataKey = "value",
  nameKey = "label",
  yAxisLabel = "",
  xAxisLabel = "",
  barRadius = 4,
  showTooltip = true,
  customTooltip,
  margin = { top: 20, right: 30, left: 20, bottom: 60 },
  showFilter = false,
  filterKey,
  filterOptions = [],
  filterValue = "",
  onFilterChange = () => {},
  filterPlaceholder = "All Categories",
  isThisProjectToolTip = false,
  onChartClick = () => {},
}) => {
  // Handle empty data - but let it pass through to show the improved empty state below
  // if (!data || data.length === 0) {
  //   return (
  //     <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
  //       <div className="p-4 border-b border-gray-200">
  //         <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
  //       </div>
  //       <div className="flex items-center justify-center h-64">
  //         <div className="text-center">
  //           <div className="text-gray-400 text-4xl mb-2">📊</div>
  //           <p className="text-gray-500">No data available</p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }



  const [sortOption, setSortOption] = useState("");

  // Create sorted data based on sort option
  const sortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    let result = [...data];

    switch (sortOption) {
      case "budget-asc":
        return result.sort((a, b) => {
          const valA = Number(a.totalCost || 0);
          const valB = Number(b.totalCost || 0);
          return valA - valB;
        });
      case "budget-desc":
        return result.sort((a, b) => {
          const valA = Number(a.totalCost || 0);
          const valB = Number(b.totalCost || 0);
          return valB - valA;
        });
      case "title-asc":
        return result.sort((a, b) =>
          (a.label || "").toLowerCase().localeCompare((b.label || "").toLowerCase())
        );
      case "title-desc":
        return result.sort((a, b) =>
          (b.label || "").toLowerCase().localeCompare((a.label || "").toLowerCase())
        );
      default:
        return result;
    }
  }, [data, sortOption]);

  const handleSort = (e: SelectChangeEvent<string>) => {
    setSortOption(e.target.value);
  };


  // console.log("items in bar chart =========================> in barchart lead", items)
  // console.log("dataKey in bar chart =========================> in barchart lead", dataKey)


  // Prepare data for ApexCharts with colors from API
  const chartData = sortedData.map((item) => ({
    x: item[nameKey],
    y: item[dataKey],
    fillColor: item.color || "#3b82f6", // Fallback to blue if no color provided
    totalCost: item.totalCost,
    projectCount: item.value,
  }));

  // Extract colors for the chart
  const barColors = sortedData.map((item) => item.color || "#3b82f6");
  // console.log("dataAASS", data);

  // Fixed series - using the correct dataKey logic



  // API se aaya data (yahi aapke actual response hoga)

  // const extendedData = items.length > 0
  // ? [
  //     ...items.map((item, index) => ({
  //       id: item.id || `item-${index}`,
  //       label: item.label,
  //       budget: item.budget,
  //       value: item.value,
  //     }))
  //   ]
  // : [];

  // const series = extendedData.length
  //   ? [
  //       {
  //         name: "Budget",
  //         data: extendedData.map((item) =>
  //             Number(
  //               item[
  //                 dataKey !== "value"
  //                   ? dataKey as keyof BarChartData
  //                   : ("value" as keyof BarChartData)
  //               ]
  //             )
  //           ),
  //         },
  //       ]
  //     : [];

  const series = sortedData.length
    ? [
      {
        name: "Budget",
        data: sortedData.map((item) =>
          Number(
            item[
            dataKey !== "value"
              ? dataKey as keyof BarChartData
              : ("value" as keyof BarChartData)
            ]
          )
        ),
      },
    ]
    : [];



  // const series = data 
  //   ? [
  //     {
  //       name: "",
  //       data: data.map((item) =>
  //         Number(
  //           item[
  //           dataKey !== "value"
  //             ? dataKey as keyof BarChartData
  //             : ("value" as keyof BarChartData)
  //           ]
  //         )
  //       ),
  //     },
  //   ]
  //   : [];




  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: height,
      toolbar: { show: false },
      background: "transparent",
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          // Get the data point index from the click
          const dataPointIndex = config.dataPointIndex;

          // Get the selected label from the sorted data array using the index
          const selectedLabel = sortedData[dataPointIndex]?.[nameKey];

          console.log("selectedLabelINChart", selectedLabel);
          console.log("dataPointIndex", dataPointIndex);

          if (selectedLabel) {
            onChartClick(selectedLabel);
          }
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: barRadius,
        // columnWidth: "40%",
        distributed: true,
        // borderRadius: 4,
        columnWidth: sortedData.length === 1 ? '10%' : '40%',

        dataLabels: { position: "center" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        const dataPointIndex = opts.dataPointIndex;
        const item = sortedData[dataPointIndex];
        if (!item || val === 0) return "";
        return (item.value || item.count || 0).toString();
        // if (!item) return "";
        // // if (!item || val === 0) return ""; // Commented out to show zero values
        
        // // Check if this item has totalCost (budget), display it in currency format
        // if (item.totalCost !== undefined) {
        //   const budgetValue = item.totalCost || 0;
        //   return `₹${budgetValue.toLocaleString()}`; // Show currency format even for ₹0
        // }
        
        // // Fallback to count/value for other charts
        // const displayValue = item.value || item.count || 0;
        // return displayValue.toString();
      },
      offsetY: 0,
      style: {
        fontSize: "14px", // Base size
        fontWeight: "600",
        fontFamily: "Inter",
        colors: ["#ffffff"],
      },
    },
    annotations: {
      points: sortedData
        .filter((item) => {
          const totalCost = item.totalCost ?? item.budget ?? 0;
          const count = item.value || item.count || 0;
          // return totalCost > 0 && count > 0; // Original condition that hides ₹0
          return count > 0; // Show annotation even when totalCost is 0, as long as there are items
        })
        .map((item) => {
          const totalCost = item.totalCost ?? item.budget ?? 0;
          const count = item.value || item.count || 0;
          const costDisplay = totalCost.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
          });

          return {
            x: item[nameKey],
            y: count,
            marker: { size: 0 },
            label: {
              text: costDisplay,
              offsetY: -10,
              style: {
                background: "transparent",
                color: "#374151",
                fontSize: "12px", // Base size
                fontWeight: "500",
                fontFamily: "Inter",
              },
              borderWidth: 0,
            },
          };
        }),
    },
    colors: barColors,
    xaxis: {
      categories: sortedData?.map((item) => item[nameKey]) || [],
      labels: {
        style: {
          fontSize: "12px", // Base size
          fontFamily: "Inter",
          fontWeight: "400",
        },
        rotate: -45, // Rotate labels for better readability
        trim: true,
        maxHeight: 120,
        formatter: function(val: string) {
          // Truncate long labels and add tooltip
          if (typeof val === 'string' && val.length > 15) {
            return val.slice(0, 12) + '...';
          }
          return val;
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Base size
          fontFamily: "Inter",
          fontWeight: "400",
        },
        formatter: (val: number) => Math.floor(val).toString(),
      },
      title: {
        text: yAxisLabel,
        style: {
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: "500",
        },
      },
      forceNiceScale: true,
      min: 0,
      decimalsInFloat: 0,
    },
    grid: {
      show: showGrid,
      borderColor: "#e0e0e0",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    row: { colors: ['#f3f3f3','#ffffff'], opacity: 0.5 },
    },
    legend: {
      show: showLegend,
      position: "top",
      horizontalAlign: "center",
      fontSize: "14px",
    },
    tooltip: {
      enabled: showTooltip,
      custom: customTooltip
        ? (options: any) => React.createElement(customTooltip, { options })
        : undefined,
      y: {
        formatter: (val: number, opts: any) => {
          const dataPointIndex = opts.dataPointIndex;
          const dataPoint = sortedData?.[dataPointIndex];
          const amount = dataPoint?.totalCost ?? dataPoint?.budget ?? 0;
          const name = dataPoint?.[nameKey] || dataPoint?.name || "";
          const count = dataPoint?.value || dataPoint?.count || 0;

          return isThisProjectToolTip
            ? `<div class="apex-tooltip">
               <div class="tooltip-title" style="font-weight: bold; margin-bottom: 8px; word-wrap: break-word; max-width: 200px;">${name}</div>
               <div class="tooltip-row">
                 <span>Projects:</span>
                 <strong>${count}</strong>
               </div>
               <div class="tooltip-row">
                 <span>Total:</span>
                 <strong>₹${amount.toLocaleString("en-IN") || "0"}</strong>
               </div>
             </div>`
            : `<div class="apex-tooltip">
               <div class="tooltip-title" style="font-weight: bold; margin-bottom: 8px; word-wrap: break-word; max-width: 200px;">${name}</div>
               <div class="tooltip-row">
                 <span>Count:</span>
                 <strong>${count}</strong>
               </div>
               <div class="tooltip-row">
                 <span>Total:</span>
                 <strong>₹${amount.toLocaleString("en-IN") || "0"}</strong>
               </div>
             </div>`;
        },
      },
    },
    responsive: [
      {
        breakpoint: 768, // Tablet
        options: {
          dataLabels: {
            style: { fontSize: "10px" }
          },
          annotations: {
            points: [{
              label: { style: { fontSize: "10px" } }
            }]
          },
          xaxis: {
            labels: {
              style: { fontSize: "10px" },
              rotate: -45,
              formatter: function(val: string) {
                if (typeof val === 'string' && val.length > 10) {
                  return val.slice(0, 8) + '...';
                }
                return val;
              }
            }
          },
          yaxis: {
            labels: { style: { fontSize: "10px" } },
            title: { style: { fontSize: "12px" } }
          },
          plotOptions: {
            bar: { columnWidth: "50%" }
          }
        }
      },
      {
        breakpoint: 480, // Mobile
        options: {
          dataLabels: {
            style: { fontSize: "8px" }
          },
          annotations: {
            points: [{
              label: { style: { fontSize: "8px" } }
            }]
          },
          xaxis: {
            labels: {
              style: { fontSize: "8px" },
              rotate: -45,
              formatter: function(val: string) {
                if (typeof val === 'string' && val.length > 8) {
                  return val.slice(0, 6) + '...';
                }
                return val;
              }
            }
          },
          yaxis: {
            labels: { style: { fontSize: "8px" } },
            title: { style: { fontSize: "10px" } }
          },
          plotOptions: {
            bar: { columnWidth: "60%" }
          },
          legend: {
            fontSize: "12px",
            position: "bottom"
          }
        }
      }
    ]
  };
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4">
        {showFilter && (
          <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-start align-items-md-center px-5">
            <div
              className="text-start"
              style={{
                fontFamily: "Barlow",
                fontWeight: "600",
                fontSize: "19px",
              }}
            >
              {title}
            </div>
            <div className="w-auto h-auto d-flex justify-content-end align-items-center pt-3" style={{ gap: "16px" }}>
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel
                  id="sort-label"
                  sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
                >
                  Sort By
                </InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortOption}
                  label="Sort By"
                  onChange={handleSort}
                  sx={{
                    color: '#9D4141',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-icon': {
                      color: '#9D4141',
                    },
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="budget-asc">Budget (Low → High)</MenuItem>
                  <MenuItem value="budget-desc">Budget (High → Low)</MenuItem>
                  <MenuItem value="title-asc">Title (A → Z)</MenuItem>
                  <MenuItem value="title-desc">Title (Z → A)</MenuItem>
                </Select>
              </FormControl>

              <FilterDropdown
                filterKey={filterKey || ""}
                options={filterOptions || []}
                value={filterValue || ""}
                onChange={onFilterChange}
                placeholder={filterPlaceholder || "All"}
              />
            </div>
          </div>
        )}
        {!showFilter && (
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center px-5">
              <div
                style={{
                  fontFamily: "Barlow",
                  fontWeight: "600",
                  fontSize: "19px",
                }}
              >
                {title}
              </div>
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel
                  id="sort-label-simple"
                  sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
                >
                  Sort By
                </InputLabel>
                <Select
                  labelId="sort-label-simple"
                  value={sortOption}
                  label="Sort By"
                  onChange={handleSort}
                  sx={{
                    color: '#9D4141',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-icon': {
                      color: '#9D4141',
                    },
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="budget-asc">Budget (Low → High)</MenuItem>
                  <MenuItem value="budget-desc">Budget (High → Low)</MenuItem>
                  <MenuItem value="title-asc">Title (A → Z)</MenuItem>
                  <MenuItem value="title-desc">Title (Z → A)</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>
        )}
        {
          !sortedData || sortedData.length === 0 || sortedData.every(item => {
            const value = item[dataKey] || item.value;
            return !value || value === 0 || value === null || value === undefined;
          })?(
            <div style={{ backgroundColor: "#f8faff", margin: 0, border: "2px solid #EAEEF5" }} className="rounded-2 m-6">
              <div

                style={{
                  height: "270px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "12px",
                  color: "#6c757d",
                }}
              >
                <div>
                  <i className="bi bi-bar-chart" style={{ fontSize: "32px", color: "#9CAFC9" }}></i>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      fontFamily: "Barlow",
                      fontWeight: 600,
                      fontSize: "14px",
                      textAlign: "center",
                      color: "#6B7280"
                    }}>
                    No data available
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontWeight: 400,
                      fontSize: "12px",
                      textAlign: "center",
                      color: "#9CAFC9"
                    }}>
                    {title.toLowerCase().includes('subcategory') ? 'Add project subcategories to view breakdown' :
                     'Data will appear here once available'}
                  </div>
                </div>
              </div>
            </div>):(<div className="ms-3">

              <Chart options={options} series={series} type="bar" height={height} />
            </div>)
        }

      </div>
    </div>
  );
};

export default CustomBarChart;