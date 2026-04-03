import { FilterDropdown } from "@pages/employee/projects/commonComponents/FilterDropdown";
import React, { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import Chart from "react-apexcharts";
import { Col, Card, Form } from "react-bootstrap";
import LeadsConfigForm from "../../configuration/components/LeadsConfigForm";
import { ConfigItem } from "../../configuration/components/LeadsConfigForm";
import ProjectConfigForm from "@pages/employee/projects/configure/components/ProjectConfigForm";
import { ProjectItem } from "@models/clientProject";
import { getAllProjectServices } from "@services/projects";
import CompanyConfigForm from "@pages/employee/companies/companyConfig/components/CompanyConfigForm";

type PieChartDataItem = {
  label: string;
  value: number;
  color?: string;
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
  // ===============================all statas============
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ConfigItem | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);

  const [showReferralTypeModal, setShowReferralTypeModal] = useState(false);
  const [editingReferralType, setEditingReferralType] = useState<ProjectItem | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);

  const [showDirectSourceModal, setShowDirectSourceModal] = useState(false);
  const [editingDirectSource, setEditingDirectSource] = useState<ProjectItem | null>(null);

  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false);
  const [editingCompanyType, setEditingCompanyType] = useState<ProjectItem | null>(null);

  //  ===============close handle=============
  const handleStatusModalClose = () => {
    setShowStatusModal(false);
    setEditingStatus(null);
  };
  const handleDirectSourceModalClose = () => {
    setShowDirectSourceModal(false);
    setEditingDirectSource(null);
  };

  const handleReferralTypeModalClose = () => {
    setShowReferralTypeModal(false);
    setEditingReferralType(null);
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleServiceModalClose = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };

  const handleCompanyTypeModalClose = () => {
    setShowCompanyTypeModal(false);
    setEditingCompanyType(null);
  };

  //  ===============open handle=============
  const handleDirectSourceModalOpen = () => {
    setShowDirectSourceModal(true);
  };


  const handleStatusModalOpen = () => {
    setShowStatusModal(true);
  };

  const handleReferralTypeModalOpen = () => {
    setShowReferralTypeModal(true);
  };

  const handleServiceModalOpen = () => {
    setShowServiceModal(true);
  };

  const handleCategoryModalOpen = () => {
    setShowCategoryModal(true);
  };

  const handleCompanyTypeModalOpen = () => {
    setShowCompanyTypeModal(true);
  };

  // ===================success handle===================

  const handleStatusSuccess = () => {
    handleStatusModalClose();
  };

  const handleDirectSourceSuccess = () => {
    handleDirectSourceModalClose();
  };

  const handleReferralTypeSuccess = () => {
    handleReferralTypeModalClose();
  };

  const handleServiceSuccess = () => {
    handleServiceModalClose();
  };

  const handleCategorySuccess = () => {
    handleCategoryModalClose();
  };

  const handleCompanyTypeSuccess = () => {
    handleCompanyTypeModalClose();
  };

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
    switch (detectedMode) {
      case "internal":
        // Apply internal filtering - filter the provided data
        if (!filterValue || filterValue === "" || filterValue === "all") {
          return data;
        }
        const internalFiltered = data.filter(
          (item) => item.label === filterValue
        );
        return internalFiltered;

      case "external":
        // External filtering - data is already filtered, just return as-is
        return data;

      case "none":
      default:
        // No filtering - return all data
        return data;
    }
  }, [data, filterValue, externalFilterValue, filterOptions, filterMode]);

  const uniqueFilteredData = useMemo(() => {
    const map = new Map();
    filteredData.forEach((item) => {
      const key = `${item.id}-${item.value}`;
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
        fontSize: 'clamp(12px, 2.5vw, 18px)',
        fontWeight: 'bold',
        colors: ['#fff'],
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

          dataLabels: { style: { fontSize: '16px' } }
        },
      },
      {
        breakpoint: 768,
        options: {
          chart: { width: '100%', height: '100%' },
          dataLabels: { style: { fontSize: '14px' } },
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
          <div className="mt-4 d-flex gap-3 align-items-start justify-content-center">
            {title.toLowerCase().includes("status") && (
              <button
                style={{
                  fontSize: "11px",
                  border: "1px solid #9D4141",
                  color: "#9D4141",
                  backgroundColor: "transparent",
                  borderRadius: "3px",
                  // padding: "0px !importana",
                  // margin:"0px !important",
                  alignItems:"center",
                  justifyContent:"center",
                  display:"flex",
                  padding: "9px 12px",
                  lineHeight: "1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  whiteSpace: "nowrap",
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
            {(title.toLowerCase().includes("service") || title.toLowerCase().includes("services")) && (
              <button
                style={{
                  fontSize: "11px",
                  border: "1px solid #9D4141",
                  color: "#9D4141",
                  backgroundColor: "transparent",
                  borderRadius: "3px",
                  padding: "9px 12px",
                  lineHeight: "1",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  whiteSpace: "nowrap",
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
                New Services
              </button>
            )}
            {
              title.toLowerCase().includes("category") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
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
              title.toLowerCase().includes("direct sources")  && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                onClick={handleDirectSourceModalOpen}
                >
                  New Direct Sources
                </button>
              )
            }
            {
              title.toLowerCase().includes("referral source") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                  onClick={handleReferralTypeModalOpen}
                >
                  New Referral Type
                </button>
              )
            }

            {
              title.toLowerCase().includes("by source") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                  onClick={handleDirectSourceModalOpen}
                >
                  New Source Type
                </button>
              )
            }
            {
              title.toLowerCase().includes("by company type") && (
                <button
                  style={{
                    fontSize: "11px",
                    border: "1px solid #9D4141",
                    color: "#9D4141",
                    backgroundColor: "transparent",
                    borderRadius: "3px",
                    padding: "9px 12px",
                    lineHeight: "1",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#9D4141";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9D4141";
                  }}
                  onClick={handleCompanyTypeModalOpen}
                >
                  New Company Type
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
          (!data || data.length === 0 || data.every(item => item.value === 0 || item.value === null || item.value === undefined)) ? (

            <div style={{ backgroundColor: "#f8faff", margin: 0, border: "2px solid #EAEEF5" }} className="rounded-2">
              <div

                style={{
                  height: "200px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "10px",
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
                    {title?.toLowerCase().includes('status') ? 'Create leads to see status breakdown' :
                     title?.toLowerCase().includes('service') ? ' to see lead distribution' :
                     title?.toLowerCase().includes('category') ? 'Create project categories to view lead breakdown' :
                     title?.toLowerCase().includes('source') && !title?.toLowerCase().includes('referral') && !title?.toLowerCase().includes('direct') ? 'Add lead sources to see distribution' :
                     title?.toLowerCase().includes('referral') ? 'Add referral sources to see lead origins' :
                     title?.toLowerCase().includes('direct') ? 'Add direct sources to track lead channels' :
                     title?.toLowerCase().includes('company') ? 'Add company types to see lead distribution' :
                     'Create leads to see data visualization'}
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
                  const totalCost = item?.totalCost || 0;
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
                        {totalCost > 0 ? (
                          <span
                            style={{
                              fontFamily: "Inter",
                              fontSize: "12px",
                              color: "#808A98",
                            }}
                          >
                            {totalCost.toLocaleString("en-IN", {
                              style: "currency",
                              currency: "INR",
                            })}
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: "Inter",
                            fontSize: "12px",
                            color: "#808A98",
                          }}>N/A</span>
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
      <LeadsConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        onSuccess={handleStatusSuccess}
        initialData={editingStatus}
        isEditing={!!editingStatus}
        type="status"
        title="Lead Status"
      />
      <LeadsConfigForm
        show={showDirectSourceModal}
        onClose={handleDirectSourceModalClose}
        onSuccess={handleDirectSourceSuccess}
        initialData={editingDirectSource}
        isEditing={!!editingDirectSource}
        type="direct-source"
        title="Direct Source"
      />
       <LeadsConfigForm
        show={showReferralTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={handleReferralTypeSuccess}
        initialData={editingReferralType}
        isEditing={!!editingReferralType}
        type="referral"
        title="Referral Type"
      />
      {/* <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={handleServiceSuccess}
        type="service"
        title="Service"
        isEditing={!!editingService}
        initialData={editingService}
      /> */}
       <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={handleServiceSuccess}
        type="service"
        title="Service"
        isEditing={!!editingService}
        initialData={editingService}
      />
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={handleCategorySuccess}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="category"
        title="Category"
      />
      <CompanyConfigForm
        show={showCompanyTypeModal}
        onClose={handleCompanyTypeModalClose}
        onSuccess={handleCompanyTypeSuccess}
        initialData={editingCompanyType}
        isEditing={!!editingCompanyType}
        type="company-type"
        title="Company Type"
      />
    </Card>


  );
};

export default CustomPieCharts;
