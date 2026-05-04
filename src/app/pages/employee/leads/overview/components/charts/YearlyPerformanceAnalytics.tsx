import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Spinner, Form } from "react-bootstrap";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  Label,
} from "recharts";
import { getMonthlyLeadAnalytics, getMonthlyTargets } from "@services/lead";
import ManageTargetModal from "../modals/ManageTargetModal";
import dayjs from "dayjs";

interface YearlyPerformanceAnalyticsProps {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  title?: string;
}
const formatShort = (val: number) => {
  const absVal = Math.abs(val);

  if (absVal >= 10000000)
    return (val / 10000000).toFixed(2).replace(/\.00$/, "") + "Cr";

  if (absVal >= 100000)
    return (val / 100000).toFixed(2).replace(/\.00$/, "") + "L";

  if (absVal >= 1000) return (val / 1000).toFixed(2).replace(/\.00$/, "") + "K";

  return val.toString();
};

const formatLeadCount = (num: any) => {
  const val = typeof num === "number" ? num : parseFloat(num);
  if (isNaN(val)) return num?.toString() || "";

  const absVal = Math.abs(val); // ✅ FIX
  const fullValue = val.toFixed(2);

  let short = "";
  if (absVal >= 10000000)
    short = (val / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";
  else if (absVal >= 100000)
    short = (val / 100000).toFixed(2).replace(/\.00$/, "") + " L";
  else if (absVal >= 1000)
    short = (val / 1000).toFixed(2).replace(/\.00$/, "") + " K";

  return short ? `₹${fullValue} (${short})` : `₹${fullValue}`;
};

const YearlyPerformanceAnalytics: React.FC<YearlyPerformanceAnalyticsProps> = ({
  startDate: propStartDate,
  endDate: propEndDate,
  title = "Yearly Value Performance Trend",
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs(propStartDate));
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullDigits, setShowFullDigits] = useState(false);
  const [viewMode, setViewMode] = useState<"inquiry" | "received">("inquiry");
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
      const year = currentDate.year();
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const [inqTargetsData, recTargetsData, analyticsRes] = await Promise.all([
        getMonthlyTargets(year, "inquiry"),
        getMonthlyTargets(year, "received"),
        getMonthlyLeadAnalytics(startOfYear, endOfYear),
      ]);

      setMonthlyTargets({
        inquiry: inqTargetsData.map((t: any) => ({
          month: t.month,
          target: Number(t.targetAmount),
        })),
        received: recTargetsData.map((t: any) => ({
          month: t.month,
          target: Number(t.targetAmount),
        })),
      });

      if (analyticsRes && analyticsRes.data) {
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
        const actualData = analyticsRes.data.map(
          (item: any, index: number) => ({
            month: months[index] || item.month,
            inquiry: item.inquiryValue || 0,
            received: item.receivedValue || 0,
            inquiryCount: item.inquiryCount || 0,
            receivedCount: item.receivedCount || 0,
          }),
        );
        setRawData({ data: actualData });
      } else {
        setRawData(null);
      }
    } catch (err) {
      console.error("Error in Yearly Performance fetchData:", err);
      setRawData(null);
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

    const inqTargetMap = new Array(12).fill(0);
    monthlyTargets.inquiry.forEach((t: any) => {
      if (t.month >= 0 && t.month < 12) inqTargetMap[t.month] = t.target;
    });

    const recTargetMap = new Array(12).fill(0);
    monthlyTargets.received.forEach((t: any) => {
      if (t.month >= 0 && t.month < 12) recTargetMap[t.month] = t.target;
    });

    const totalInqGoal = inqTargetMap.reduce((a, b) => a + b, 0);
    const totalRecGoal = recTargetMap.reduce((a, b) => a + b, 0);

    let cumInquiry = 0;
    let cumReceived = 0;
    let cumInqCount = 0;
    let cumRecCount = 0;
    let cumInqTarget = 0;
    let cumRecTarget = 0;
    let sumForAverage = 0;

    // Find the last index where we actually have lead activity
    const lastActiveIndex = [...rawData.data].reverse().findIndex(item => (item.inquiryCount > 0 || item.receivedCount > 0));
    const cutoffIndex = lastActiveIndex === -1 ? -1 : rawData.data.length - 1 - lastActiveIndex;

    const dataPoints = rawData.data.map((item: any, index: number) => {
      cumInquiry += item.inquiry;
      cumReceived += item.received;
      cumInqCount += item.inquiryCount;
      cumRecCount += item.receivedCount;
      cumInqTarget += inqTargetMap[index];
      cumRecTarget += recTargetMap[index];

      const currentValue = viewMode === "inquiry" ? cumInquiry : cumReceived;
      const currentTarget =
        viewMode === "inquiry" ? cumInqTarget : cumRecTarget;
      const totalGoal = viewMode === "inquiry" ? totalInqGoal : totalRecGoal;

      // Stop the line if we are past the cutoff point
      const isPastData = index > cutoffIndex;
      if (!isPastData) {
        sumForAverage += currentValue;
      }

      return {
        label: item.month,
        cumInquiry,
        cumReceived,
        currentValue: isPastData ? null : currentValue,
        currentTarget,
        totalGoal,
        totalInqGoal,
        totalRecGoal,
        inquiryCount: item.inquiryCount,
        receivedCount: item.receivedCount,
        cumInqCount,
        cumRecCount,
        gap: Number((currentValue - totalGoal).toFixed(2)),
      };
    });

    const historicalAverage = cutoffIndex >= 0 ? sumForAverage / (cutoffIndex + 1) : 0;
    let lastProjection = dataPoints[cutoffIndex]?.currentValue || 0;
    const totalMonths = 12;

    return dataPoints.map((point: any, index: number) => {
      let projectionValue = null;
      if (index === cutoffIndex) {
        projectionValue = point.currentValue;
      } else if (index > cutoffIndex) {
        lastProjection += historicalAverage;
        projectionValue = lastProjection;
      }

      // Dynamic Required Pace calculation: (Target - Current) / Remaining
      const remainingTime = totalMonths - index;
      const progress = point.currentValue ?? lastProjection;
      const targetVal = point.totalGoal;
      const requiredPace = remainingTime > 0 
        ? Math.max(0, (targetVal - progress) / remainingTime)
        : 0;

      return {
        ...point,
        projectionValue: (projectionValue !== null && projectionValue > 0) 
          ? Number(projectionValue.toFixed(2)) 
          : null,
        requiredPace: Number(requiredPace.toFixed(2)),
      };
    });
  }, [rawData, monthlyTargets, viewMode]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual =
        payload.find((p: any) => p.dataKey === "currentValue")?.value || 0;
      const actualCount =
        viewMode === "inquiry"
          ? payload[0]?.payload.cumInqCount || 0
          : payload[0]?.payload.cumRecCount || 0;
      const totalGoal = payload[0]?.payload.totalGoal || 0;
      const gap = Number((actual - totalGoal).toFixed(2));

      return (
        <div className="bg-white p-3 shadow-lg rounded-3 border">
          <p
            className="fw-bold text-dark mb-2 border-bottom pb-1"
            style={{ fontSize: "13px" }}
          >
            {label} {currentDate.format("YYYY")} Overview
          </p>

          <div className="d-flex justify-content-between gap-4 mb-2">
            <span className="text-primary fw-bold" style={{ fontSize: "12px" }}>
              Actual (Cumul.):
            </span>
            <div className="text-end">
              <span
                className="fw-bold text-dark d-block"
                style={{ fontSize: "12px" }}
              >
                {formatLeadCount(actual)}
              </span>
              <span className="text-muted d-block" style={{ fontSize: "10px" }}>
                {actualCount} leads
              </span>
            </div>
          </div>

          <div className="d-flex justify-content-between gap-4 mb-2">
            <span className="text-danger fw-bold" style={{ fontSize: "12px" }}>
              Yearly Goal:
            </span>
            <span className="fw-bold text-dark" style={{ fontSize: "12px" }}>
              {formatLeadCount(totalGoal)}
            </span>
          </div>

          <div className="mt-2 pt-2 border-top d-flex justify-content-between gap-4">
            <span className="text-info fw-bold" style={{ fontSize: "11px" }}>
              <i className="bi bi-lightning-charge-fill me-1"></i>
              Required Monthly Pace:
            </span>
            <span className="text-info fw-bold" style={{ fontSize: "11px" }}>
              {formatLeadCount(payload[0]?.payload.requiredPace)}
            </span>
          </div>

          {payload.find((p: any) => p.dataKey === "projectionValue") && (
            <div className="d-flex justify-content-between gap-4 mb-2">
              <span className="fw-bold" style={{ fontSize: "12px", color: "#8B5CF6" }}>Smart Forecast:</span>
              <span className="fw-bold" style={{ fontSize: "12px", color: "#8B5CF6" }}>
                {formatLeadCount(payload.find((p: any) => p.dataKey === "projectionValue").value)}
              </span>
            </div>
          )}

          <div className="mt-2 pt-2 border-top d-flex justify-content-between gap-4">
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
              style={{ fontSize: "12px" }}
            >
              Gap to Goal:
            </span>
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
              style={{ fontSize: "12px" }}
            >
              {gap > 0
                ? `+${formatLeadCount(gap)}`
                : formatLeadCount(gap)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading)
    return (
      <Card
        className="border-0 shadow-sm rounded-4 p-5 text-center"
        style={{ height: "400px" }}
      >
        <div className="m-auto">
          <Spinner animation="border" variant="primary" />
          <p className="text-muted mt-2 small">Compiling Yearly Data...</p>
        </div>
      </Card>
    );

  const finalSummary = transformedData[transformedData.length - 1] || {
    cumInquiry: 0,
    cumReceived: 0,
    currentValue: 0,
    currentTarget: 0,
    totalInqGoal: 0,
    totalRecGoal: 0,
  };

  return (
    <div
      className={`${isExpanded ? "fixed-top w-100 h-100 p-4 bg-white" : "w-100"}`}
      style={{ zIndex: 1070 }}
    >
      <Card
        className={`border-0 rounded-4 overflow-hidden shadow-sm ${isExpanded ? "h-100" : "mb-4"}`}
        style={{
          background: "#FFFFFF",
          border: "1px solid #F1F5F9",
          height: isExpanded ? "100%" : "550px",
        }}
      >
        <div className="px-4 py-3 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <h5
                className="fw-bold m-0 text-dark"
                style={{ letterSpacing: "-0.02em", fontSize: "18px" }}
              >
                {title}
              </h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex gap-2">
                {viewMode === "inquiry" ? (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="d-flex align-items-center gap-2 px-3 fw-bold border-0 shadow-sm"
                    onClick={() => setTargetTypeToEdit("inquiry")}
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#EEF2FF",
                      color: "#4F46E5",
                      borderRadius: "8px",
                      height: "32px",
                    }}
                  >
                    <i className="bi bi-gear-fill"></i>
                    SET INQUIRY GOAL
                  </Button>
                ) : (
                  <Button
                    variant="outline-success"
                    size="sm"
                    className="d-flex align-items-center gap-2 px-3 fw-bold border-0 shadow-sm"
                    onClick={() => setTargetTypeToEdit("received")}
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#ECFDF5",
                      color: "#059669",
                      borderRadius: "8px",
                      height: "32px",
                    }}
                  >
                    <i className="bi bi-gear-fill"></i>
                    SET RECEIVED GOAL
                  </Button>
                )}
              </div>
              <div
                className="vr mx-1 my-1 text-muted opacity-25"
                style={{ height: "20px" }}
              ></div>
              <Button
                variant="light"
                size="sm"
                className="border shadow-sm rounded-3 p-0 bg-white d-flex align-items-center justify-content-center"
                onClick={toggleExpand}
                style={{ width: "32px", height: "32px" }}
              >
                <i
                  className={`bi ${isExpanded ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`}
                  style={{ fontSize: "12px" }}
                ></i>
              </Button>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center bg-light rounded-3 p-1 border shadow-sm"
              style={{ height: "32px" }}
            >
              <Button
                variant="link"
                className="p-1 text-secondary d-flex align-items-center justify-content-center"
                onClick={() => navigateYear("prev")}
                style={{
                  height: "100%",
                  width: "30px",
                  textDecoration: "none",
                }}
              >
                <i
                  className="bi bi-chevron-left"
                  style={{ fontSize: "12px" }}
                ></i>
              </Button>
              <div className="px-3 border-start border-end">
                <span
                  className="fw-bold text-primary"
                  style={{
                    fontSize: "12px",
                    minWidth: "60px",
                    textAlign: "center",
                    display: "inline-block",
                  }}
                >
                  {currentDate.format("YYYY")}
                </span>
              </div>
              <Button
                variant="link"
                className="p-1 text-secondary d-flex align-items-center justify-content-center"
                onClick={() => navigateYear("next")}
                style={{
                  height: "100%",
                  width: "30px",
                  textDecoration: "none",
                }}
              >
                <i
                  className="bi bi-chevron-right"
                  style={{ fontSize: "12px" }}
                ></i>
              </Button>
            </div>

            <div
              className="bg-light p-1 rounded-pill d-flex gap-1 border shadow-sm"
              style={{ backgroundColor: "#F8FAFC !important" }}
            >
              <Button
                variant={viewMode === "inquiry" ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${viewMode === "inquiry" ? "shadow-sm fw-bold text-primary bg-white" : "text-muted opacity-75"}`}
                onClick={() => {
                  setViewMode("inquiry");
                }}
                style={{ fontSize: "11px" }}
              >
                Inquiry Value
              </Button>
              <Button
                variant={viewMode === "received" ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${viewMode === "received" ? "shadow-sm fw-bold text-success bg-white" : "text-muted opacity-75"}`}
                onClick={() => {
                  setViewMode("received");
                }}
                style={{ fontSize: "11px" }}
              >
                Received Value
              </Button>
            </div>
          </div>
        </div>

        <Card.Body className="p-4">
          <div
            style={{
              width: "100%",
              height: isExpanded ? "calc(100% - 150px)" : "420px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={transformedData}
                margin={{ top: 20, right: 40, left: 35, bottom: 3 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: "#CBD5F5", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#475569", fontSize: 12 }}
                  dy={10}
                >
                  <Label
                    value="Months"
                    offset={-25}
                    position="insideBottom"
                    fill="#64748B"
                    fontSize={11}
                    fontWeight={700}
                  />
                </XAxis>
                <YAxis
                  axisLine={{ stroke: "#CBD5F5", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  width={55}
                  tickFormatter={(val) => formatShort(val)}
                >
                  <Label
                    value="Cumulative Value (₹)"
                    angle={-90}
                    position="insideLeft"
                    offset={-20}
                    fill="#64748B"
                    fontSize={11}
                    fontWeight={700}
                    style={{ textAnchor: "middle" }}
                  />
                </YAxis>
                <Tooltip
                  content={<CustomTooltip showFullDigits={showFullDigits} />}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "30px", fontSize: "12px" }}
                />

                <Line
                  type="monotone"
                  dataKey="currentValue"
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

                {finalSummary.totalInqGoal > 0 && viewMode === "inquiry" && (
                  <Line
                    type="monotone"
                    dataKey="currentTarget"
                    name="Inquiry Goal Path"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}

                {finalSummary.totalRecGoal > 0 && viewMode === "received" && (
                  <Line
                    type="monotone"
                    dataKey="currentTarget"
                    name="Received Goal Path"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="projectionValue"
                  name="Smart Forecast"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
        <div className="px-4 pb-4">
          <div className="mt-3 pt-3 border-top">
            <p
              className="m-0 text-muted"
              style={{ fontSize: "11px", lineHeight: "1.6" }}
            >
              For {currentDate.format("YYYY")}, you have realized{" "}
              <span className="fw-bold text-dark">
                {formatLeadCount(finalSummary.currentValue)}
              </span>{" "}
              {finalSummary.currentTarget > 0 ? (
                <>
                  {" "}
                  (
                  {Math.round(
                    (finalSummary.currentValue / finalSummary.currentTarget) *
                      100,
                  )}
                  % of yearly goal path) out of{" "}
                  <span className="fw-bold text-dark">
                    {formatLeadCount(finalSummary.currentTarget)}
                  </span>{" "}
                  {viewMode} target.
                  {finalSummary.currentValue < finalSummary.currentTarget && (
                    <>
                      {" "}
                      Current gap to target path is{" "}
                      <span className="fw-bold text-danger">
                        {formatLeadCount(
                          finalSummary.currentTarget -
                            finalSummary.currentValue,
                        )}
                      </span>
                      .
                    </>
                  )}
                </>
              ) : (
                <> against the current {viewMode} landscape.</>
              )}
            </p>
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

export default YearlyPerformanceAnalytics;
