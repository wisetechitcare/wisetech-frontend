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

    const recTargetMap = new Array(12).fill(0);
    monthlyTargets.received.forEach((t: any) => {
      if (t.month >= 0 && t.month < 12) recTargetMap[t.month] = t.target;
    });

    let cumInquiry = 0;
    let cumReceived = 0;
    let cumRecTarget = 0;
    const totalRecGoal = recTargetMap.reduce((a, b) => a + b, 0);

    return rawData.data.map((item: any, index: number) => {
      cumInquiry += item.inquiry;
      cumReceived += item.received;
      cumRecTarget += recTargetMap[index];

      return {
        label: item.month,
        cumInquiry,
        cumReceived,
        cumRecTarget,
        totalRecGoal,
        inquiryCount: item.inquiryCount,
        receivedCount: item.receivedCount,
      };
    });
  }, [rawData, monthlyTargets]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const CustomTooltip = ({ active, payload, label, showFullDigits }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-3 border">
          <p className="fw-bold text-dark mb-2 border-bottom pb-1">
            {label} {currentDate.format("YYYY")} Progress
          </p>
          <div className="d-flex flex-column gap-1">
            <div className="d-flex justify-content-between gap-4">
              <span
                className="text-primary fw-bold"
                style={{ fontSize: "12px" }}
              >
                Total Inquiry Value (Sum):
              </span>
              <div className="text-end">
                <span className="fw-bold d-block" style={{ fontSize: "12px" }}>
                  {formatLeadCount(
                    payload.find((p: any) => p.dataKey === "cumInquiry")
                      ?.value || 0,
                  )}
                </span>
                <span
                  className="text-muted d-block"
                  style={{ fontSize: "10px" }}
                >
                  {payload[0]?.payload.inquiryCount} leads in {label}
                </span>
              </div>
            </div>
            <div className="d-flex justify-content-between gap-4">
              <span
                className="text-success fw-bold"
                style={{ fontSize: "12px" }}
              >
                Total Received Value (Sum):
              </span>
              <div className="text-end">
                <span className="fw-bold d-block" style={{ fontSize: "12px" }}>
                  {formatLeadCount(
                    payload.find((p: any) => p.dataKey === "cumReceived")
                      ?.value || 0,
                  )}
                </span>
                <span
                  className="text-muted d-block"
                  style={{ fontSize: "10px" }}
                >
                  {payload[0]?.payload.receivedCount} leads in {label}
                </span>
              </div>
            </div>
            <div className="d-flex justify-content-between gap-4 mt-1 border-top pt-1">
              <span
                className="text-danger fw-bold"
                style={{ fontSize: "12px" }}
              >
                Goal Path:
              </span>
              <span className="fw-bold" style={{ fontSize: "12px" }}>
                {formatLeadCount(
                  payload.find((p: any) => p.dataKey === "cumRecTarget")
                    ?.value || 0,
                )}
              </span>
            </div>
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
    totalRecGoal: 0,
  };

  return (
    <div
      className={`${isExpanded ? "fixed-top w-100 h-100 p-4 bg-white" : "w-100"}`}
      style={{ zIndex: 1070 }}
    >
      <Card
        className={`border-0 rounded-4 overflow-hidden shadow-sm ${isExpanded ? "h-100" : "mb-4"}`}
        style={{ background: "#FFFFFF", border: "1px solid #F1F5F9" }}
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
          </div>
        </div>

        <Card.Body className="p-4">
          <div
            style={{
              width: "100%",
              height: isExpanded ? "calc(100% - 150px)" : "350px",
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
                  dataKey="cumInquiry"
                  name="Yearly Inquiry Value (Sum)"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3B82F6" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumReceived"
                  name="Yearly Received Value (Sum)"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10B981" }}
                  activeDot={{ r: 6 }}
                />

                {finalSummary.totalRecGoal > 0 && (
                  <Line
                    type="monotone"
                    dataKey="cumRecTarget"
                    name="Received Goal Path"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
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
              Annual progress stands at{" "}
              <span className="fw-bold text-dark">
                {formatLeadCount(finalSummary.cumReceived)}
              </span>{" "}
              realized out of{" "}
              <span className="fw-bold text-dark">
                {formatLeadCount(finalSummary.cumInquiry)}
              </span>{" "}
              total volume.
              {finalSummary.totalRecGoal > 0 && (
                <>
                  {" "}
                  You have achieved{" "}
                  <span className="fw-bold text-success">
                    {Math.round(
                      (finalSummary.cumReceived / finalSummary.totalRecGoal) *
                        100,
                    )}
                    %
                  </span>{" "}
                  of your target goal path. Current gap to target is{" "}
                  <span className="fw-bold text-danger">
                    {formatLeadCount(
                      Number(
                        (
                          finalSummary.totalRecGoal - finalSummary.cumReceived
                        ).toFixed(2),
                      ),
                    )}
                  </span>
                  .
                </>
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
