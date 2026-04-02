import { FilterDropdown } from "@pages/employee/projects/commonComponents/FilterDropdown";
import React, { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import Chart from "react-apexcharts";
import { Col, Card, Form } from "react-bootstrap";
import ProjectConfigForm from "../configure/components/ProjectConfigForm";
import { ProjectItem } from "@models/clientProject";

type PieChartDataItem = {
  label: string;
  value: number;
  color?: string;
  showTotalProject?: boolean;
  totalCost?: number;
  id?: string;
  onChartClick?: (selectedLabel: string) => void;
  chartType?:
  | "pie"
  | "line"
  | "area"
  | "bar"
  | "histogram"
  | "donut"
  | "radialBar"
  | "scatter"
  | "bubble"
  | "heatmap"
  | "candlestick"
  | "boxPlot"
  | "radar"
  | "polarArea"
  | "rangeBar"
  | "treemap";
};

type FilterMode = "internal" | "external" | "none";

interface CustomPieChartProps {
  data: PieChartDataItem[];
  height?: number;
  width?: number;
  title?: string;
  totalCost?: number;
  showTotalProject?: boolean;
  onChartClick?: (selectedLabel: string) => void;

  chartType?:
  | "pie"
  | "line"
  | "area"
  | "bar"
  | "histogram"
  | "donut"
  | "radialBar"
  | "scatter"
  | "bubble"
  | "heatmap"
  | "candlestick"
  | "boxPlot"
  | "radar"
  | "polarArea"
  | "rangeBar"
  | "treemap";
  showFilter?: boolean;
  filterOptions?: string[];
  filterValue?: string;
  filterKey?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  externalFilterValue?: string;
  filterMode?: FilterMode;
}

const CustomPieCharts: React.FC<CustomPieChartProps> = ({
  data,
  height = 380,
  width = 380,
  title = "",
  showTotalProject = true,
  chartType = "pie",
  showFilter = false,
  filterOptions = [],
  filterValue = "",
  filterKey,
  onFilterChange,
  filterPlaceholder = "All",
  externalFilterValue = "",
  filterMode = "auto",
  onChartClick,
}) => {
  // if (!data || data.length === 0) {
  //   return (
  //     <Card className="shadow-sm h-100 w-100">
  //       <Card.Body className="d-flex flex-column justify-content-center align-items-center">
  //         <div>No data to display</div>
  //       </Card.Body>
  //     </Card>
  //   ); 
  // }

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectItem | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);

  const filteredData = useMemo(() => {
    // Auto-detect filtering mode if not specified
    let detectedMode: FilterMode = filterMode as FilterMode;

    if (filterMode === "auto") {
      // If external filter is active, don't apply internal filtering
      if (externalFilterValue) {
        detectedMode = "external";
      }
      // If filter value exists and matches one of the data labels, use internal filtering
      else if (filterValue && filterValue !== "" && filterValue !== "all") {
        const hasMatchingLabel = data.some(
          (item) => item.label === filterValue
        );
        detectedMode = hasMatchingLabel ? "internal" : "external";
      }
      // Default to none if no filter value
      else {
        detectedMode = "none";
      }
    }

    // Apply filtering based on detected/specified mode
    let result;
    switch (detectedMode) {
      case "internal":
        // Apply internal filtering - filter the provided data
        if (!filterValue || filterValue === "" || filterValue === "all") {
          result = data;
        } else {
          const internalFiltered = data.filter(
            (item) => item.label === filterValue
          );
          result = internalFiltered;
        }
        break;

      case "external":
        // External filtering - data is already filtered, just return as-is
        result = data;
        break;

      case "none":
      default:
        // No filtering - return all data
        result = data;
        break;
    }

    // Filter out items with zero or null values to prevent chart rendering issues
    return result.filter(item => item.value && item.value > 0);
  }, [data, filterValue, externalFilterValue, filterOptions, filterMode]);

  const uniqueFilteredData = useMemo(() => {
    const map = new Map();
    filteredData.forEach((item, index) => {
      const key = `${item.id || item.label}-${item.value}-${index}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [filteredData]);

  const series = filteredData.map((item) => item.value);
  const labels = filteredData.map((item) => item.label);
  const colors = filteredData.map((item) => item.color || "#ccc");

  const total = filteredData.reduce((sum, d) => sum + d.value, 0);


  const options: ApexCharts.ApexOptions = {
    chart: {
      type: chartType,
      width: '100%',
      height: '100%',
      events: {
        dataPointSelection: (event, chartContext, config) => {
          const clickedIndex = config.dataPointIndex;
          const clickedItem = filteredData[clickedIndex];
          if (clickedItem) {
            if (onChartClick) {
              onChartClick(clickedItem.label);
            }
            if (onFilterChange) {
              onFilterChange(clickedItem.id || clickedItem.label);
            }
          }
        },
      },
    },
    labels,
    colors,
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '24px',
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        colors: ['#fff'],
      },
      formatter: function(val, opts) {
        return opts.w.config.series[opts.seriesIndex];
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: chartType === 'donut' ? '50%' : '0%',
          labels: {
            show: false,
            name: {
              fontSize: 'clamp(10px, 2vw, 14px)',
              fontWeight: 'bold',
            },
            value: {
              fontSize: 'clamp(14px, 3vw, 20px)',
              fontWeight: 'bold',
            },
            total: {
              fontSize: 'clamp(12px, 2.5vw, 16px)',
            }
          }
        },
        dataLabels: {
          offset: chartType === 'pie' ? -15 : 0,
        },
      },
    },
    legend: {
      fontSize: 'clamp(10px, 2vw, 14px)',
      markers: {
        width: 12,
        height: 12,
        radius: 6,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    tooltip: {
      enabled: true,
      style: {
        fontSize: 'clamp(12px, 2vw, 14px)',
      },
      x: {
        formatter: (val: number) => `${val} Leads`,
      },
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          chart: { width: '100%', height: '100%' },

          dataLabels: { style: { fontSize: '18px', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' } }
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: { width: '100%', height: '100%' },
          dataLabels: { style: { fontSize: '16px', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' } },
          legend: { fontSize: '12px' }
        },
      },
      {
        breakpoint: 480,
        options: {
          plotOptions: {
            pie: {
              donut: {
                size: chartType === 'donut' ? '35%' : '0%', // Your specified mobile size
                labels: {
                  name: { fontSize: '10px' },
                  value: { fontSize: '12px' },
                  total: { fontSize: '11px' }
                }

              },
              dataLabels: {
                offset: chartType === 'pie' ? -15 : -2,
              },

            }
          },
          dataLabels: { 
            style: { fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 'bold' } 
          },
          legend: {
            position: 'bottom', // Better for mobile
            horizontalAlign: 'center'
          }
        }
      },
    ],
  };


  const handleFilterChange = (value: string) => {
    if (onFilterChange) {
      onFilterChange(value);
    }
  };



  const handleStatusModalClose = () => {
    setShowStatusModal(false);
    setEditingStatus(null);
  };

  const handleStatusSuccess = (data: ProjectItem) => {
    setEditingStatus(data);
    setShowStatusModal(true);
  };

  const handleStatusModalOpen = () => {
    setShowStatusModal(true);
  };

  const handleCategoryModalOpen = () => {
    setShowCategoryModal(true);
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleCategorySuccess = (data: ProjectItem) => {
    setEditingCategory(data);
    setShowCategoryModal(true);
  };

  const handleServiceModalOpen = () => {
    setShowServiceModal(true);
  };

  const handleServiceModalClose = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleServiceSuccess = (data: ProjectItem) => {
    setEditingService(data);
    setShowServiceModal(true);
  };

  return (
    <Card className="shadow-sm h-100 w-100 overflow-hidden ">
      <Card.Body className="d-flex flex-column" style={{ gap: '26px' }}>
        {/* Header with title and filter */}
        <div className="d-flex justify-content-between align-items-center">
          <h1
            className="text-start"
            style={{
              fontFamily: "Barlow, sans-serif",
              fontWeight: "600",
              fontSize: "clamp(1rem, 4vw, 1.5rem)",
              lineHeight: "1.3",
              margin: "0.5rem 0",
            }}
          >
            {title} 
          </h1>
          <div className="d-flex align-items-center gap-2">
            {title.toLowerCase().includes("projects by status") && (
              <button
                style={{
                  fontSize: "11px",
                  border: "1px solid #9D4141",
                  color: "#9D4141",
                  backgroundColor: "transparent",
                  borderRadius: "3px",
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                  padding: "9px 12px",
                  lineHeight: "1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#9D4141";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#9D4141";
                }}
                onClick={handleStatusModalOpen}
              >
                New Status
              </button>
            )}

            {
              title.toLowerCase().includes("projects by category") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    alignItems: "center",
                    justifyContent: "center",
                    display: "flex",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                  onClick={handleCategoryModalOpen}
                >
                  New Category
                </button>
              )
            }

            {
              title.toLowerCase().includes("projects by service") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    alignItems: "center",
                    justifyContent: "center",
                    display: "flex",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                  onClick={handleServiceModalOpen}
                >
                  New Service
                </button>
              )
            }
            {showFilter && filterOptions.length > 0 && (
              <FilterDropdown
                filterKey={filterKey || "defaultFilter"}
                options={filterOptions || []}
                value={filterValue || ""}
                onChange={handleFilterChange}
                placeholder={filterPlaceholder || "All"}
              />
            )}
          </div>
        </div>
        {
          (!data || data.length === 0 || filteredData.length === 0) ? (

            <div style={{ backgroundColor: "#f8faff", margin: 0, border: "2px solid #EAEEF5" }} className="rounded-2">
              <div

                style={{
                  height: "200px",
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
                    {title.toLowerCase().includes('status') ? 'Create projects to see status breakdown' :
                     title.toLowerCase().includes('category') ? 'Add project categories to view distribution' :
                     title.toLowerCase().includes('service') ? 'Assign services to projects for insights' :
                     title.toLowerCase().includes('team') ? 'Assign teams to projects to see allocation' :
                     title.toLowerCase().includes('company') ? 'Create companies to see project distribution' :
                     'Data will appear here once available'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between justify-content-lg-between pe-4 align-items-lg-center justify-content-xxl-between gap-3">
              {/* Chart */}

              <div>
                <ReactApexChart
                  options={{ ...options, legend: { show: false } }}
                  series={series}
                  type={chartType}
                  width={width}
                  height={height}
                />
              </div>


              {/* Custom Legend */}
              <div
                className="custom-scroll d-flex flex-column align-items-start gap-3 mt-3 "
                style={{
                  overflowY: "auto",
                  maxHeight: "200px",
                  width: "100%",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#9D4141 #f0f0f0",
                }}
              >

                {uniqueFilteredData.map((item, index) => {
                  const percent = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div
                      key={`${item.label}-${index}`}
                      className="d-flex align-items-start gap-1 mb-2"
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: item.color || "#ccc",
                          borderRadius: "50%",
                          marginTop: "4px",
                          marginRight: "8px",
                          flexShrink: 0,
                        }}
                      />
                      <div className="d-flex flex-column gap-1">
                        <span
                          style={{
                            fontWeight: 500,
                            fontFamily: "Inter",
                            fontSize: "14px",
                            color: "#000",
                            lineHeight: "1.2",
                          }}
                          title={item.label}
                        >
                          {item.label.length > 20
                            ? `${item.label.slice(0, 18)}...`
                            : item.label}
                        </span>
                        {percent !== null && percent !== undefined ? (
                          <span
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              color: "#808A98",
                            }}
                          >
                            {percent}%
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              color: "#808A98",
                            }}
                          >
                            N/A
                          </span>
                        )}


                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          )

        }
      </Card.Body>


      <ProjectConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        // onSuccess={handleStatusSuccess}
        type="status"
        title="Status"
        isEditing={!!editingStatus}
        initialData={editingStatus}
      />
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        // onSuccess={fetchProjectCategories}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="category"
        title="Category"
      />

      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        // onSuccess={fetchProjectServices}
        initialData={editingService}
        isEditing={!!editingService}
        type="service"
        title="Service"
      />
    </Card>
  );
};

export default CustomPieCharts;
