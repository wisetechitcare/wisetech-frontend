import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import ManageTargetModal from "../modals/ManageTargetModal";
import dayjs from "dayjs";

interface YearlyCumulativePerformanceProps {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  title?: string;
}

const YearlyCumulativePerformance: React.FC<
  YearlyCumulativePerformanceProps
> = ({
  startDate: propStartDate,
  endDate: propEndDate,
  title = "Yearly Performance Analytics",
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs(propStartDate));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"inquiry" | "received">("received");
  const [isExpanded, setIsExpanded] = useState(false);
  const [targetTypeToEdit, setTargetTypeToEdit] = useState<
    "inquiry" | "received" | null
  >(null);
  const [rawData, setRawData] = useState<any>(null);
  const [monthlyTargets, setMonthlyTargets] = useState<{
    inquiry: any[];
    received: any[];
  }>({
    inquiry: [],
    received: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // For now, using robust dummy targets for each month as requested
      const year = currentDate.year();

      const mockInqTargets = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        target: 150 + Math.floor(Math.sin(i / 2) * 30 + Math.random() * 20),
      }));

      const mockRecTargets = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        target: 100 + Math.floor(Math.sin(i / 2) * 20 + Math.random() * 15),
      }));

      setMonthlyTargets({
        inquiry: mockInqTargets,
        received: mockRecTargets,
      });

      // Fetching actual lead data (also dummy for now)
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const actualData = months.map((m, index) => {
        const inqTarget = mockInqTargets[index].target;
        const recTarget = mockRecTargets[index].target;

        // Actual values slightly above/below targets for visual interest
        return {
          month: m,
          inquiry: Math.floor(inqTarget * (0.8 + Math.random() * 0.4)),
          received: Math.floor(recTarget * (0.75 + Math.random() * 0.5)),
        };
      });

      setRawData({
        data: actualData,
      });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (err) {
      console.error("Error in Yearly Performance fetchData:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentDate(dayjs(propStartDate));
  }, [propStartDate]);

  const navigateYear = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    setCurrentDate((prev) => prev.add(offset, "year"));
  };

  const transformedData = useMemo(() => {
    if (!rawData || !rawData.data) return [];

    const activeTargets =
      viewMode === "inquiry" ? monthlyTargets.inquiry : monthlyTargets.received;
    const monthsCount = rawData.data.length;

    // Sort / Ensure targets map correctly to months 0-11
    const targetMap = new Array(12).fill(viewMode === "inquiry" ? 150 : 100);
    activeTargets.forEach((t: any) => {
      if (t.month >= 0 && t.month < 12) {
        targetMap[t.month] = t.target;
      }
    });

    let cumulativeActual = 0;
    let cumulativeTarget = 0;
    const totalYearlyTarget = targetMap.reduce((a, b) => a + b, 0);

    return rawData.data.map((item: any, index: number) => {
      const monthlyActual =
        viewMode === "inquiry" ? item.inquiry : item.received;
      cumulativeActual += monthlyActual;
      cumulativeTarget += targetMap[index];

      // Linear ideal pace reference
      const runRate = ((index + 1) / monthsCount) * totalYearlyTarget;

      return {
        label: item.month,
        actual: monthlyActual,
        cumulativeValue: cumulativeActual,
        target: cumulativeTarget,
        runRate: Number(runRate.toFixed(2)),
        gap: Number((cumulativeActual - runRate).toFixed(2)),
        totalYearlyTarget,
      };
    });
  }, [rawData, viewMode, monthlyTargets]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual =
        payload.find((p: any) => p.dataKey === "cumulativeValue")?.value || 0;
      const targetPath =
        payload.find((p: any) => p.dataKey === "target")?.value || 0;
      const runRate =
        payload.find((p: any) => p.dataKey === "runRate")?.value || 0;
      const gap = Number((actual - runRate).toFixed(2));

      return (
        <div className="bg-white p-3 shadow-lg rounded-3 border">
          <p className="fw-bold text-dark mb-2 border-bottom pb-1">
            {label} {currentDate.format("YYYY")} - {viewMode.toUpperCase()}
          </p>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span
              className="text-primary font-weight-bold"
              style={{ fontSize: "13px" }}
            >
              Actual (Cumul.):
            </span>
            <span className="fw-bold" style={{ fontSize: "13px" }}>
              {actual}
            </span>
          </div>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span
              className="text-secondary font-weight-bold"
              style={{ fontSize: "13px" }}
            >
              Cumulative Target:
            </span>
            <span className="fw-bold" style={{ fontSize: "13px" }}>
              {targetPath}
            </span>
          </div>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span
              className="text-info font-weight-bold"
              style={{ fontSize: "13px" }}
            >
              Reference Pace:
            </span>
            <span className="fw-bold" style={{ fontSize: "13px" }}>
              {runRate}
            </span>
          </div>

          <div className="mt-2 pt-2 border-top d-flex justify-content-between gap-4">
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
              style={{ fontSize: "13px" }}
            >
              Pace Variance:
            </span>
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
              style={{ fontSize: "13px" }}
            >
              {gap > 0 ? `+${gap}` : gap}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const finalYearlyTarget =
    transformedData[transformedData.length - 1]?.totalYearlyTarget || 0;

  return (
    <div
      className={`${isExpanded ? "fixed-top w-100 h-100 p-4 bg-white" : "w-100"}`}
      style={{ zIndex: 1070 }}
    >
      <Card
        className={`border-0 rounded-4 overflow-hidden shadow-sm ${isExpanded ? "h-100" : "mb-4"}`}
        style={{ background: "#FFFFFF", border: "1px solid #F1F5F9" }}
      >
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex flex-column gap-1">
            <h5
              className="fw-bold m-0 text-dark"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </h5>
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center bg-light rounded-3 p-1 border shadow-sm">
                <Button
                  variant="link"
                  className="p-1 text-secondary d-flex align-items-center justify-content-center hover-bg-white rounded-2 transition-all"
                  onClick={() => navigateYear("prev")}
                  style={{ textDecoration: "none" }}
                >
                  <i
                    className="bi bi-chevron-left"
                    style={{ fontSize: "14px", fontWeight: "800" }}
                  ></i>
                </Button>
                <div className="px-3 border-start border-end">
                  <span
                    className="fw-bold text-primary m-0"
                    style={{
                      fontSize: "13px",
                      minWidth: "80px",
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {currentDate.format("YYYY")}
                  </span>
                </div>
                <Button
                  variant="link"
                  className="p-1 text-secondary d-flex align-items-center justify-content-center hover-bg-white rounded-2 transition-all"
                  onClick={() => navigateYear("next")}
                  style={{ textDecoration: "none" }}
                >
                  <i
                    className="bi bi-chevron-right"
                    style={{ fontSize: "14px", fontWeight: "800" }}
                  ></i>
                </Button>
              </div>
              <p
                className="text-muted m-0"
                style={{ fontSize: "11px", opacity: 0.8 }}
              >
                Dynamic Yearly Performance Analytics
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            {viewMode === "inquiry" ? (
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-2 px-3 fw-bold border-0 shadow-sm"
                onClick={() => setTargetTypeToEdit("inquiry")}
                style={{
                  fontSize: "11px",
                  backgroundColor: "#EEF2FF",
                  color: "#4F46E5",
                  borderRadius: "8px",
                }}
              >
                <i className="bi bi-gear-fill"></i>
                SET INQUIRY TARGET
              </Button>
            ) : (
              <Button
                variant="outline-success"
                size="sm"
                className="d-flex align-items-center gap-2 px-3 fw-bold border-0 shadow-sm"
                onClick={() => setTargetTypeToEdit("received")}
                style={{
                  fontSize: "11px",
                  backgroundColor: "#ECFDF5",
                  color: "#059669",
                  borderRadius: "8px",
                }}
              >
                <i className="bi bi-gear-fill"></i>
                SET RECEIVED TARGET
              </Button>
            )}

            <div className="bg-light p-1 rounded-pill d-flex gap-1 border shadow-sm">
              <Button
                variant={viewMode === "inquiry" ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${viewMode === "inquiry" ? "shadow-sm fw-bold text-primary" : "text-muted opacity-75"}`}
                onClick={() => setViewMode("inquiry")}
                style={{ fontSize: "12px" }}
              >
                Inquiry
              </Button>
              <Button
                variant={viewMode === "received" ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${viewMode === "received" ? "shadow-sm fw-bold text-success" : "text-muted opacity-75"}`}
                onClick={() => setViewMode("received")}
                style={{ fontSize: "12px" }}
              >
                Received
              </Button>
            </div>

            <Button
              variant="light"
              size="sm"
              className="border shadow-sm rounded-3 p-2 bg-white"
              onClick={toggleExpand}
            >
              <i
                className={`bi ${isExpanded ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`}
                style={{ fontSize: "14px" }}
              ></i>
            </Button>
          </div>
        </div>

        <Card.Body className="p-4">
          <div
            style={{
              width: "100%",
              height: isExpanded ? "calc(100% - 140px)" : "380px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={transformedData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "30px", fontSize: "12px" }}
                />

                {/* FINAL YEARLY GOAL REFERENCE LINE */}
                <ReferenceLine
                  y={finalYearlyTarget}
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `GOAL: ${finalYearlyTarget}`,
                    position: "right",
                    fill: "#EF4444",
                    fontSize: 11,
                    fontWeight: 800,
                    offset: 10,
                  }}
                />

                <Line
                  type="stepAfter"
                  dataKey="target"
                  name="Cumulative Goal Path"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                  opacity={0.8}
                />

                <Line
                  type="monotone"
                  dataKey="cumulativeValue"
                  name={`Actual ${viewMode === "inquiry" ? "Inquiries" : "Received"} (Cumul.)`}
                  stroke={viewMode === "inquiry" ? "#2563EB" : "#10B981"}
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: viewMode === "inquiry" ? "#2563EB" : "#10B981",
                  }}
                  activeDot={{ r: 6 }}
                  animationDuration={1500}
                />

                <Line
                  type="linear"
                  dataKey="runRate"
                  name="Run Rate (Average Pace)"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  strokeDasharray="8 8"
                  dot={false}
                  opacity={0.6}
                  animationDuration={2000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
        <div className="px-4 pb-4">
          <div className="bg-light rounded p-3 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <span className="fw-bold text-dark">
                {viewMode === "received" ? "Yearly Goal: " : "Yearly Goal: "}
              </span>
              {finalYearlyTarget}
            </div>
            <div className="text-muted small">
              <span className="fw-bold text-dark">Current Actual: </span>
              {transformedData[transformedData.length - 1]?.cumulativeValue ||
                0}
            </div>
            <div className="text-muted small">
              <span className="fw-bold text-dark">Success Rate: </span>
              <span
                className={
                  viewMode === "received"
                    ? "text-success fw-bold"
                    : "text-primary fw-bold"
                }
              >
                {finalYearlyTarget > 0
                  ? Math.round(
                      (transformedData[transformedData.length - 1]
                        ?.cumulativeValue /
                        finalYearlyTarget) *
                        100,
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </Card>

      <ManageTargetModal
        show={!!targetTypeToEdit}
        onHide={() => setTargetTypeToEdit(null)}
        targetType={targetTypeToEdit || undefined}
        initialYear={currentDate.year()}
        onSave={() => fetchData()}
      />
    </div>
  );
};

export default YearlyCumulativePerformance;
