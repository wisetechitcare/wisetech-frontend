import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Card } from "react-bootstrap";

type TaskChartDataItem = {
  label: string;
  value: number;
  color?: string;
  id?: string;
};

interface TaskCustomChartProps {
  data: TaskChartDataItem[];
  height?: number;
  width?: number;
  title?: string;
  chartType?:
    | "pie"
    | "donut";
  loading?: boolean;
}

const TaskCustomChart: React.FC<TaskCustomChartProps> = ({
  data,
  height = 380,
  width = 380,
  title = "",
  chartType = "pie",
  loading = false,
}) => {
  const filteredData = useMemo(() => {
    return data || [];
  }, [data]);

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
  const colors = filteredData.map((item) => item.color || "#3B82F6");

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: chartType,
      width: '100%',
      height: '100%',
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
      y: {
        formatter: (val: number) => `${val} Tasks`,
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
                size: chartType === 'donut' ? '35%' : '0%',
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
            position: 'bottom',
            horizontalAlign: 'center'
          }
        }
      },
    ],
  };

  if (loading) {
    return (
      <Card className="shadow-sm h-100 w-100 overflow-hidden">
        <Card.Body className="d-flex flex-column justify-content-center align-items-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm h-100 w-100 overflow-hidden">
      <Card.Body className="d-flex flex-column" style={{ gap: '26px' }}>
        {/* Header with title */}
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
        </div>

        {(!data || data.length === 0) ? (
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
                <i className="bi bi-info-circle" style={{ fontSize: "24px", color: "#9CAFC9" }}></i>
              </div>
              <div
                style={{
                  fontFamily: "Barlow",
                  fontWeight: 500,
                  fontStyle: "normal",
                  fontSize: "13px",
                  textAlign: "center",
                  color: "#9CAFC9"
                }}
              >
                Nothing to see here yet, <br /> add data to view
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
              className="custom-scroll d-flex flex-column align-items-start gap-3 mt-3"
              style={{
                overflowY: "auto",
                maxHeight: "200px",
                width: "100%",
                scrollbarWidth: "thin",
                scrollbarColor: "#9D4141 #f0f0f0",
              }}
            >
              {uniqueFilteredData.map((item, index) => (
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
                    <span
                      style={{
                        fontFamily: "Inter",
                        fontSize: "12px",
                        color: "#808A98",
                      }}
                    >
                      {item.value} task{item.value !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TaskCustomChart;