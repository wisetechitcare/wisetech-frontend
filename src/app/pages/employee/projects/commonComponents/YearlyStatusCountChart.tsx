import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Col, Card } from "react-bootstrap";
import { ChartDialogModal } from "../../leads/overview/components/ChartDialogModal";
import { ProjectDialogModal } from "../overview/components/ProjectDialogModal";
import { Dayjs } from "dayjs";

type TransformedSeriesItem = {
  label: string;
  color: string;
  data: { x: string; y: number; totalBudget?: number }[];
  id?: string;
  location?: string;
};

interface YearlyStatusCountChartProps {
  data: TransformedSeriesItem[];
  height?: number;
  title?: string;
  stacked?: boolean;
  showBudget?: boolean;
  isThisLead?: boolean;
  isThisBelongsToLead?: boolean;
  isThisProjectModal?: boolean;
  isThisCompanyTypeModal?: boolean; 
  startDate?: Dayjs;
  endDate?: Dayjs;
}

const YearlyStatusCountChart: React.FC<YearlyStatusCountChartProps> = ({
  data,
  height = 400,
  title = "Yearly Status Count",
  stacked = false,
  showBudget = false,
  isThisLead = false,
  isThisBelongsToLead = false,
  isThisProjectModal = false,
  isThisCompanyTypeModal = false, // Add this new prop
  startDate,
  endDate,
}) => {
  
  // Transform data for ApexCharts
  const series = data.map((item) => ({
    name: item.label,
    data: item.data.map((point) => point.y),
    color: item.color,  
    id: item.id,
  }));

  const categories = data[0]?.data.map((point) => point.x) || [];

  const [openMonthlyLeadByStatus, setOpenMonthlyLeadByStatus] = useState(false);
  const [monthlyStatusName, setMonthlyStatusName] = useState<string | null>(null);
  const [monthlyStatusId, setMonthlyStatusId] = useState<string | null>(null);

  const [openCompanyType, setOpenCompanyType] = useState(false);
  const [companyTypeName, setCompanyTypeName] = useState<string | null>(null);
  const [companyTypeId, setCompanyTypeId] = useState<string | null>(null);

  const handleLocationChartClick = (selectedLabel: string, selectedId: string) => {
    
    if (isThisCompanyTypeModal) {
      const companyTypeData = data?.find((item: any) => item.id === selectedId || item.label === selectedId);
      
      if (companyTypeData) {
        setCompanyTypeName(selectedLabel);
        setCompanyTypeId(selectedId);
      } else {
        setCompanyTypeName(selectedLabel);
        setCompanyTypeId(selectedId);
      }
      setOpenCompanyType(true);
      return;
    }

    const monthlyStatus: any = data?.find(
      (location: any) => location.location === selectedLabel
    );
    if (monthlyStatus) {
      setMonthlyStatusName(monthlyStatus.location);
      setMonthlyStatusId(monthlyStatus.id);
    } else {
      setMonthlyStatusName(selectedLabel);
      setMonthlyStatusId(selectedId);
    }
    setOpenMonthlyLeadByStatus(true);
  };

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: stacked,
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const { seriesIndex, dataPointIndex } = config;
      
          const selectedLabel = categories[dataPointIndex]; // Month (x-axis)
          const selectedSeries = data[seriesIndex]; // Series (status)
      
          const selectedStatusId = selectedSeries?.id || selectedSeries?.label; 
      
          if (selectedLabel && selectedStatusId) {
            handleLocationChartClick(selectedLabel, selectedStatusId);
          }
        },
      },
      
      toolbar: {
        show: false,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        },
      },
    },
    colors: data.map((item) => item.color),
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        dataLabels: {
          position: "center",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        if (val === 0) return "";
        return val.toString();
      },
      offsetY: 0,
      style: {
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: "Inter",
        colors: ["#ffffff"],
      },
    },
    xaxis: {
      categories: categories,
      title: {
        text: "Months",
        style: {
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: "500",
        },
      },
      labels: {
        style: {
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: "400",
        },
      },
    },
    yaxis: {
      title: {
        style: {
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: "500",
        },
      },
      labels: {
        style: {
          fontSize: "14px",
          fontFamily: "Inter",
          fontWeight: "400",
        },
        formatter: function (val: number) {
          return Math.floor(val).toString();
        },
      },
      forceNiceScale: true,
      min: 0,
      decimalsInFloat: 0,
    },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "14px",
      fontFamily: "Barlow",
      offsetX: 10, // This creates left gap (in pixels)
      markers: {
        width: 12,
        height: 12,
        radius: 12,
      },
      itemMargin: {
        horizontal: 10, // Space between legend items
      }
    },
    responsive: [
      {
        breakpoint: 1200,
        options: {
          dataLabels: {
            style: {
              fontSize: "13px"
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: "13px"
              }
            }
          },
          yaxis: {
            labels: {
              style: {
                fontSize: "13px"
              }
            }
          },
          legend: {
            fontSize: "13px"
          }
        }
      },
      {
        breakpoint: 992,
        options: {
          dataLabels: {
            style: {
              fontSize: "12px"
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: "12px"
              }
            }
          },
          yaxis: {
            labels: {
              style: {
                fontSize: "12px"
              }
            }
          },
          legend: {
            fontSize: "12px",
            markers: {
              width: 10,
              height: 10
            }
          }
        }
      },
      {
        breakpoint: 768,
        options: {
          dataLabels: {
            style: {
              fontSize: "11px"
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: "11px"
              }
            }
          },
          yaxis: {
            labels: {
              style: {
                fontSize: "11px"
              }
            }
          },
          legend: {
            fontSize: "11px",
            markers: {
              width: 8,
              height: 8
            }
          }
        }
      },
      {
        breakpoint: 576,
        options: {
          dataLabels: {
            style: {
              fontSize: "10px"
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: "10px"
              }
            }
          },
          yaxis: {
            labels: {
              style: {
                fontSize: "10px"
              }
            }
          },
          legend: {
            fontSize: "10px",
            markers: {
              width: 6,
              height: 6
            }
          },
          plotOptions: {
            bar: {
              columnWidth: "65%" // Wider bars on small screens
            }
          }
        }
      }
    ]
  };

  return (
    <>
      <Card className="shadow-sm h-100 w-100">
        <Card.Body className="d-flex flex-column">
          <div
            className="mb-3 text-start"
            style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "19px" }}
          >
            {title}
          </div>
          {
            data && data.length > 0 && data.some(item => item.data && item.data.some(point => point.y > 0)) ? (
              <div className="align-items-center">
                <ReactApexChart
                  options={options}
                  series={series}
                  type="bar"
                  width="100%"
                  height={height}
                />
              </div>
            ) : (
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
                      {title?.toLowerCase().includes('status') ? 'Create projects to see monthly status trends' :
                       title?.toLowerCase().includes('company') ? 'Create projects to see company type distribution over time' :
                       'Data will appear here once available'}
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        </Card.Body>
      </Card>

      {/* Location Modal */}
      {isThisBelongsToLead && ( 
        <ChartDialogModal
          open={openMonthlyLeadByStatus}
          onClose={() => setOpenMonthlyLeadByStatus(false)}
          monthlyStatusName={monthlyStatusName || undefined}
          monthlyStatusId={monthlyStatusId || undefined}
        />
      )}

      {/* Project Modal */}
      {isThisProjectModal && ( 
        <ProjectDialogModal
          open={openMonthlyLeadByStatus}
          onClose={() => setOpenMonthlyLeadByStatus(false)}
          monthlyStatusName={monthlyStatusName || undefined}
          monthlyStatusId={monthlyStatusId || undefined}
        />
      )}

      {/* Company Type Modal */}
      {isThisCompanyTypeModal && (
        <ProjectDialogModal
          open={openCompanyType}
          onClose={() => setOpenCompanyType(false)}
          projectCompanyTypeName={companyTypeName || undefined}
          projectCompanyTypeId={companyTypeId || undefined}
        />
      )}
    </>
  );
};

export default YearlyStatusCountChart;