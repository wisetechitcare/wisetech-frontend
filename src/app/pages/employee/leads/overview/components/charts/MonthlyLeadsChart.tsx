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
  ReferenceLine,
  Label,
} from "recharts";
import {
  getMonthlyLeadAnalytics,
  getMonthlyTargets,
  getDailyMonthlyRunRate,
} from "@services/lead";
import ManageTargetModal from "../modals/ManageTargetModal";
import dayjs from "dayjs";

interface PerformanceData {
  day: string;
  inquiry: number;
  received: number;
}

interface ApiResponse {
  data: PerformanceData[];
  monthlyTargetInquiry: number;
  monthlyTargetReceived: number;
}

interface MonthlyLeadsChartProps {
  startDate: string;
  endDate: string;
  title?: string;
}

const formatIndianNumber = (num: any) => {
  const val = typeof num === "number" ? num : parseFloat(num);
  if (isNaN(val)) return num?.toString() || "";

  const absVal = Math.abs(val);
  const fullValue = val.toFixed(2);

  let short = "";
  if (absVal >= 10000000)
    short = (val / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";
  else if (absVal >= 100000)
    short = (val / 100000).toFixed(2).replace(/\.00$/, "") + " L";
  else if (absVal >= 1000)
    short = (val / 1000).toFixed(2).replace(/\.00$/, "") + " K";

  return short
    ? `${val < 0 ? "-" : ""}₹${Math.abs(val).toFixed(2)} (${short.replace("-", "")})`
    : `${val < 0 ? "-" : ""}₹${Math.abs(val).toFixed(2)}`;
};
const formatShort = (val: number) => {
  const absVal = Math.abs(val);

  if (absVal >= 10000000)
    return (val / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";

  if (absVal >= 100000)
    return (val / 100000).toFixed(2).replace(/\.00$/, "") + " L";

  if (absVal >= 1000)
    return (val / 1000).toFixed(2).replace(/\.00$/, "") + " K";

  return val.toString();
};

const MonthlyLeadsChart: React.FC<MonthlyLeadsChartProps> = ({
  startDate: propStartDate,
  endDate: propEndDate,
  title = "Monthly Value Performance Analytics",
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs(propStartDate));
  const [rawData, setRawData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"inquiry" | "received">("inquiry");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullDigits, setShowFullDigits] = useState(false);
  const [targetTypeToEdit, setTargetTypeToEdit] = useState<
    "inquiry" | "received" | null
  >(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const year = currentDate.year();
      const month = currentDate.month() + 1; // 1-indexed for backend

      console.log(`Fetching daily performance data for ${year}-${month}`);

      const response = await getDailyMonthlyRunRate(year, month);
      console.log("Daily Monthly Revenue Projection Response:", response);

      if (response && response.data) {
        setRawData({
          data: response.data,
          monthlyTargetInquiry: response.monthlyTargetInquiry || 0,
          monthlyTargetReceived: response.monthlyTargetReceived || 0,
        });
      } else {
        console.warn("No data received for daily Revenue Projection");
        setRawData(null);
      }
    } catch (err) {
      console.error("Error fetching daily Revenue Projection:", err);
      setError("Failed to load daily performance data");
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

  const navigateMonth = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    setCurrentDate((prev) => prev.add(offset, "month"));
  };

  const transformedData = useMemo(() => {
    if (!rawData || !rawData.data || rawData.data.length === 0) return [];

    const { data, monthlyTargetInquiry, monthlyTargetReceived } = rawData;
    const monthlyTarget =
      viewMode === "inquiry" ? monthlyTargetInquiry : monthlyTargetReceived;
    const daysInMonth = data.length;
    let cumulativeValue = 0;
    let cumulativeCount = 0;

    return data.map((item: any, index: number) => {
      const dailyValue = viewMode === "inquiry" ? item.inquiry : item.received;
      const dailyCount =
        viewMode === "inquiry" ? item.inquiryCount : item.receivedCount;
      cumulativeValue += dailyValue;
      cumulativeCount += dailyCount;

      // Run Rate is cumulative linear progress towards the monthly target
      const runRate = ((index + 1) / daysInMonth) * monthlyTarget;

      return {
        label: item.day, // Show day number on X-axis
        fullDate: item.date,
        value: dailyValue,
        cumulativeValue: cumulativeValue,
        cumulativeCount: cumulativeCount,
        target: monthlyTarget, // Horizontal target line
        runRate: Number(runRate.toFixed(2)),
        gap: Number((cumulativeValue - runRate).toFixed(2)),
      };
    });
  }, [rawData, viewMode]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const CustomTooltip = ({ active, payload, label, showFullDigits }: any) => {
    if (active && payload && payload.length) {
      // Find the items in payload
      const actual =
        payload.find((p: any) => p.dataKey === "cumulativeValue")?.value || 0;
      const actualCount =
        payload.find((p: any) => p.dataKey === "cumulativeValue")?.payload
          .cumulativeCount || 0;
      const target =
        payload.find((p: any) => p.dataKey === "target")?.value || 0;
      const runRate =
        payload.find((p: any) => p.dataKey === "runRate")?.value || 0;
      const gap = Number((actual - runRate).toFixed(2));

      return (
        <div className="bg-white p-3 shadow-lg rounded-3 border">
          <p className="fw-bold text-dark mb-2 border-bottom pb-1">
            {label} {currentDate.format("MMM YYYY")} -{" "}
            {viewMode === "inquiry" ? "INQUIRY VALUE" : "RECEIVED VALUE"}
          </p>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span className="text-primary font-weight-bold">
              Actual (Cumul.):
            </span>
            <div className="text-end">
              <span className="fw-bold d-block">
                {formatIndianNumber(actual)}
              </span>
              <span className="text-muted d-block" style={{ fontSize: "10px" }}>
                {actualCount} leads till date
              </span>
            </div>
          </div>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span className="text-danger font-weight-bold">
              Current Target:
            </span>
            <span className="fw-bold">{formatIndianNumber(target)}</span>
          </div>

          <div className="d-flex justify-content-between gap-4 mb-1">
            <span className="text-info font-weight-bold">
              Revenue Projection:
            </span>
            <span className="fw-bold">{formatIndianNumber(runRate)}</span>
          </div>

          <div className="mt-2 pt-2 border-top d-flex justify-content-between gap-4">
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
            >
              Gap from Revenue Projection:
            </span>
            <span
              className={
                gap >= 0 ? "text-success fw-bold" : "text-danger fw-bold"
              }
            >
              {gap > 0
                ? `+${formatIndianNumber(gap)}`
                : formatIndianNumber(gap)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-0" style={{ height: "400px" }}>
        <div className="h-100 d-flex justify-content-center align-items-center">
          <Spinner animation="border" variant="primary" />
        </div>
      </Card>
    );
  }

  if (error && !rawData) {
    return (
      <Card className="shadow-sm border-0" style={{ height: "400px" }}>
        <div className="h-100 d-flex justify-content-center align-items-center text-danger">
          {error}
        </div>
      </Card>
    );
  }

  if (!transformedData || transformedData.length === 0) {
    return (
      <Card className="shadow-sm border-0" style={{ height: "400px" }}>
        <div className="h-100 d-flex justify-content-center align-items-center text-muted">
          No data available for this period.
        </div>
      </Card>
    );
  }

  const currentTarget = transformedData[0]?.target || 0;
  const showRunRate = currentTarget > 0;

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
          height: isExpanded ? "100%" : "580px",
        }}
      >
        <div className="px-4 py-3 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <h5
                className="fw-bold m-0 text-dark"
                style={{ letterSpacing: "-0.02em", fontSize: "18px" }}
              >
                {viewMode === "inquiry"
                  ? "Daily Inquiry Trend"
                  : "Daily Received Trend"}
              </h5>
            </div>
            <div className="d-flex align-items-center gap-2">
              {/* SET TARGET BUTTON */}
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
                  SET TARGET
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
                  SET TARGET
                </Button>
              )}

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

          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center bg-light rounded-3 p-1 border shadow-sm"
                style={{ height: "32px" }}
              >
                <Button
                  variant="link"
                  className="p-1 text-secondary d-flex align-items-center justify-content-center"
                  onClick={() => navigateMonth("prev")}
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
                      minWidth: "90px",
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {currentDate.format("MMMM YYYY")}
                  </span>
                </div>
                <Button
                  variant="link"
                  className="p-1 text-secondary d-flex align-items-center justify-content-center"
                  onClick={() => navigateMonth("next")}
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

        <Card.Body className="p-4" style={{ height: "calc(100% - 160px)" }}>
          <div style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={transformedData}
                margin={{ top: 20, right: 20, left: -18, bottom: 23 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                  tickLine={{ stroke: "#E2E8F0" }}
                  tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                  dy={10}
                >
                  <Label
                    value="Days"
                    offset={-20}
                    position="insideBottom"
                    fill="#64748B"
                    fontSize={11}
                    fontWeight={700}
                  />
                </XAxis>
                <YAxis
                  axisLine={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  width={85}
                  tickFormatter={(val) => formatShort(val)}
                >
                  <Label
                    value="Cumulative Value (₹)"
                    angle={-90}
                    position="insideLeft"
                    offset={40}
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
                  wrapperStyle={{ paddingBottom: "20px", fontSize: "12px" }}
                />

                {currentTarget > 0 && (
                  <Line
                    type="monotone"
                    dataKey="target"
                    name={`${viewMode === "inquiry" ? "Inquiry" : "Received"} Target`}
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                  />
                )}

                {/* ACTUAL LEADS - Requirement 8: Solid Line (Cumulative) */}
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

                {/* RUN RATE - Requirement 8: Blue Dashed Linear Upward */}
                {showRunRate && (
                  <Line
                    type="linear"
                    dataKey="runRate"
                    name="Revenue Projection"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                    animationDuration={2000}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
        <div className="px-4 pb-4">
          <div className="pt-3 border-top">
            <p
              className="m-0 text-muted"
              style={{ fontSize: "11px", lineHeight: "1.6" }}
            >
              For {currentDate.format("MMMM")}, you have realized{" "}
              <span className="fw-bold text-dark">
                {formatIndianNumber(
                  transformedData[transformedData.length - 1]
                    ?.cumulativeValue || 0,
                )}
              </span>
              {currentTarget > 0 ? (
                <>
                  {" "}
                  (
                  {Math.round(
                    ((transformedData[transformedData.length - 1]
                      ?.cumulativeValue || 0) /
                      currentTarget) *
                      100,
                  )}
                  % of monthly target) out of{" "}
                  <span className="fw-bold text-dark">
                    {formatIndianNumber(currentTarget)}
                  </span>{" "}
                  {viewMode} goal.
                  {(transformedData[transformedData.length - 1]
                    ?.cumulativeValue || 0) < currentTarget && (
                    <>
                      {" "}
                      You need{" "}
                      <span className="fw-bold text-danger">
                        {formatIndianNumber(
                          currentTarget -
                            (transformedData[transformedData.length - 1]
                              ?.cumulativeValue || 0),
                        )}
                      </span>{" "}
                      more to achieve this month's objective.
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
        onSave={() => {
          fetchData(); // Just refresh this chart
        }}
      />
    </div>
  );
};

export default MonthlyLeadsChart;
