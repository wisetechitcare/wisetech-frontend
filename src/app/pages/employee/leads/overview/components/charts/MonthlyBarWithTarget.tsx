import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Spinner, Form } from "react-bootstrap";
import dayjs from "dayjs";
import { getMonthlyLeadAnalytics } from "@services/lead";
import ManageTargetModal from "../modals/ManageTargetModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LabelList,
  Label,
  Line,
  ComposedChart,
} from "recharts";

interface MonthlyBarWithTargetProps {
  title?: string;
  startDate?: string;
  endDate?: string;
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

const CustomTooltip = ({ active, payload, label, showFullDigits }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white p-3 shadow-lg rounded-4 border-0"
        style={{ minWidth: "240px", border: "1px solid #F1F5F9" }}
      >
        <p
          className="fw-bold text-dark mb-3 border-bottom pb-2"
          style={{ fontSize: "13px", letterSpacing: "-0.01em" }}
        >
          <i className="bi bi-calendar3 me-2 text-primary"></i>
          {label} Performance
        </p>
        <div className="d-flex flex-column gap-2">
          {payload.map((entry: any, index: number) => {
            const count =
              entry.dataKey === "inquiry"
                ? entry.payload.inquiryCount
                : entry.dataKey === "received"
                  ? entry.payload.receivedCount
                  : null;
            const isTarget = entry.name.toLowerCase().includes("target");

            return (
              <div
                key={index}
                className="d-flex justify-content-between align-items-center"
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: entry.color,
                    }}
                  ></div>
                  <span
                    className="text-muted fw-medium"
                    style={{ fontSize: "12px" }}
                  >
                    {entry.name}
                  </span>
                </div>
                <div className="text-end">
                  <span
                    className="fw-bold text-dark d-block"
                    style={{ fontSize: "13px" }}
                  >
                    {showFullDigits
                      ? "₹" + Number(entry.value).toLocaleString("en-IN")
                      : formatLeadCount(entry.value)}
                  </span>
                  {!isTarget && count !== undefined && (
                    <span
                      className="text-muted d-block"
                      style={{ fontSize: "10px" }}
                    >
                      {count} leads
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
          <span
            className="text-muted fw-bold"
            style={{ fontSize: "10px", opacity: 0.6 }}
          >
            VALUE CONVERSION
          </span>
          <span
            className="badge rounded-pill px-2 py-1"
            style={{
              fontSize: "10px",
              backgroundColor: "#ECFDF5",
              color: "#059669",
              border: "1px solid #D1FAE5",
            }}
          >
            {payload[0]?.value > 0
              ? Math.round((payload[1]?.value / payload[0]?.value) * 100)
              : 0}
            % Efficiency
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const MonthlyBarWithTarget: React.FC<MonthlyBarWithTargetProps> = ({
  title = "Inquiry vs Received Value Performance",
  startDate: propStartDate,
  endDate: propEndDate,
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs(propStartDate));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullDigits, setShowFullDigits] = useState(false);
  const [targetTypeToEdit, setTargetTypeToEdit] = useState<
    "inquiry" | "received" | null
  >(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const year = currentDate.year();
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const response = await getMonthlyLeadAnalytics(startOfYear, endOfYear);

      if (response && response.data) {
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

        const mapped = response.data.map((item: any, index: number) => ({
          month: months[index],
          received: Number(item.receivedValue || 0),
          inquiry: Number(item.inquiryValue || 0),
          receivedCount: Number(item.receivedCount || 0),
          inquiryCount: Number(item.inquiryCount || 0),
          inquiryTarget: Number(item.inquiryTarget || 0),
          receivedTarget: Number(item.receivedTarget || 0),
        }));

        setData(mapped);
      }
    } catch (err) {
      console.error("Error in MonthlyBarWithTarget fetchData:", err);
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

  const toggleExpand = () => setIsExpanded(!isExpanded);

  if (loading) {
    return (
      <Card
        className="shadow-sm border-0 rounded-4"
        style={{ height: "580px" }}
      >
        <div className="h-100 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2 small fw-bold">Loading Analysis...</p>
          </div>
        </div>
      </Card>
    );
  }

  const yearlyTotals = {
    inquiry: data.reduce((sum, item) => sum + (item.inquiry || 0), 0),
    received: data.reduce((sum, item) => sum + (item.received || 0), 0),
    receivedTarget: data.reduce(
      (sum, item) => sum + (item.receivedTarget || 0),
      0,
    ),
  };

  return (
    <div
      className={`${isExpanded ? "fixed-top w-100 h-100 p-4 bg-white" : "w-100"}`}
      style={{ zIndex: 1070 }}
    >
      <Card
        className={`border-0 rounded-4 overflow-hidden shadow-sm transition-all ${isExpanded ? "h-100" : "mb-4"}`}
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
                {title}
              </h5>
            </div>
            <div className="d-flex align-items-center gap-2">
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
                  height: "32px",
                }}
              >
                <i className="bi bi-gear-fill"></i>
                SET TARGET
              </Button>
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
                  onClick={() =>
                    setCurrentDate((prev) => prev.subtract(1, "year"))
                  }
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
                    {currentDate.year()}
                  </span>
                </div>
                <Button
                  variant="link"
                  className="p-1 text-secondary d-flex align-items-center justify-content-center"
                  onClick={() => setCurrentDate((prev) => prev.add(1, "year"))}
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
                variant={!showFullDigits ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${!showFullDigits ? "shadow-sm fw-bold text-primary bg-white" : "text-muted opacity-75"}`}
                onClick={() => setShowFullDigits(false)}
                style={{ fontSize: "11px" }}
              >
                Compact
              </Button>
              <Button
                variant={showFullDigits ? "white" : "transparent"}
                size="sm"
                className={`rounded-pill px-3 py-1 border-0 transition-all ${showFullDigits ? "shadow-sm fw-bold text-primary bg-white" : "text-muted opacity-75"}`}
                onClick={() => setShowFullDigits(true)}
                style={{ fontSize: "11px" }}
              >
                Digits
              </Button>
            </div>
          </div>
        </div>

        <Card.Body className="p-4" style={{ height: "calc(100% - 150px)" }}>
          <div style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                barGap={4}
                margin={{ top: 20, right: 20, left: 8, bottom: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  dy={10}
                >
                  <Label
                    value="Fiscal Months"
                    offset={-23}
                    position="insideBottom"
                    fill="#64748B"
                    fontSize={12}
                    fontWeight={700}
                  />
                </XAxis>
                <YAxis
                  axisLine={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                  width={85}
                  tickFormatter={(val) => formatShort(val)}
                >
                  <Label
                    value="Financial Value (₹)"
                    angle={-90}
                    position="insideLeft"
                    offset={8}
                    fill="#64748B"
                    fontSize={11}
                    fontWeight={700}
                    style={{ textAnchor: "middle" }}
                  />
                </YAxis>
                <Tooltip
                  cursor={{ fill: "#F8FAFC", radius: 4 }}
                  content={<CustomTooltip showFullDigits={false} />}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: "30px", fontSize: "12px" }}
                />

                <Bar
                  dataKey="inquiry"
                  name="Total Inquiries"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  barSize={isExpanded ? 35 : 22}
                >
                  {/* Count above the bar */}
                  <LabelList
                    dataKey="inquiryCount"
                    position="top"
                    fill="#3B82F6"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: "5px",
                    }}
                  />
                  {/* Amount inside the bar - Vertical */}
                  <LabelList
                    dataKey="inquiry"
                    position="center"
                    fill="#FFFFFF"
                    angle={-90}
                    style={{ fontSize: 10, fontWeight: 700 }}
                    formatter={(val: any) => {
                      if (val < 1000000 && !isExpanded) return "";
                      return showFullDigits
                        ? "₹" + Number(val).toLocaleString("en-IN")
                        : formatShort(val);
                    }}
                  />
                </Bar>
                <Bar
                  dataKey="received"
                  name="Received Leads"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  barSize={isExpanded ? 35 : 22}
                >
                  {/* Count above the bar */}
                  <LabelList
                    dataKey="receivedCount"
                    position="top"
                    fill="#10B981"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: "5px",
                    }}
                  />
                  {/* Amount inside the bar - Vertical */}
                  <LabelList
                    dataKey="received"
                    position="center"
                    fill="#FFFFFF"
                    angle={-90}
                    style={{ fontSize: 10, fontWeight: 700 }}
                    formatter={(val: any) => {
                      if (val < 1000000 && !isExpanded) return "";
                      return showFullDigits
                        ? "₹" + Number(val).toLocaleString("en-IN")
                        : formatShort(val);
                    }}
                  />
                </Bar>

                {/* Target Line for Received ONLY */}
                {data.some((d) => d.receivedTarget > 0) && (
                  <Line
                    type="monotone"
                    dataKey="receivedTarget"
                    name="Received Target"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: "#EF4444" }}
                    activeDot={{ r: 5 }}
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
              You have realized{" "}
              <span className="fw-bold text-dark">
                {formatLeadCount(yearlyTotals.received)}
              </span>{" "}
              (
              {yearlyTotals.inquiry > 0
                ? Math.round(
                    (yearlyTotals.received / yearlyTotals.inquiry) * 100,
                  )
                : 0}
              % efficiency) out of{" "}
              <span className="fw-bold text-dark">
                {formatLeadCount(yearlyTotals.inquiry)}
              </span>{" "}
              total inquiry value.
              {yearlyTotals.received < yearlyTotals.inquiry && (
                <>
                  {" "}
                  You need{" "}
                  <span className="fw-bold text-danger">
                    {formatLeadCount(
                      yearlyTotals.inquiry - yearlyTotals.received,
                    )}
                  </span>{" "}
                  more to cover the current gap and maximize your portfolio
                  potential.
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

export default MonthlyBarWithTarget;
