import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
} from "recharts";
import AnalyticsCard from "./AnalyticsCard";
import {
  YearlyMonthPoint,
  formatINRShort,
  formatCountShort,
  sumSeries,
} from "./yearlyAnalyticsUtils";

interface YearlyGrowthChartProps {
  series: YearlyMonthPoint[];
  /** Fiscal-year caption shown in the subtitle, e.g. "2025 - 2026". */
  periodLabel?: string;
}

type Mode = "volume" | "value";

const TogglePill: React.FC<{
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, color, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      border: "none",
      cursor: "pointer",
      fontFamily: "Inter, sans-serif",
      fontSize: 11.5,
      fontWeight: 600,
      padding: "5px 12px",
      borderRadius: 999,
      transition: "all 180ms ease",
      background: active ? "#fff" : "transparent",
      color: active ? color : "#94A3B8",
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
    }}
  >
    {children}
  </button>
);

const Tip: React.FC<any> = ({ active, payload, label, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const fmt = mode === "value" ? formatINRShort : (n: number) => `${n}`;
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(15,23,42,0.18)",
        border: "1px solid #F1F5F9",
        padding: "12px 14px",
        fontFamily: "Inter, sans-serif",
        minWidth: 180,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", marginBottom: 8 }}>{label}</div>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 4 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color }} />
            {p.name}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Yearly Lead Growth — the hero trend visualization. A premium area+line combo
 * that tells the year's story month by month: leads created vs converted (with
 * a one-click switch to inquiry vs realized value, plus the target path).
 */
const YearlyGrowthChart: React.FC<YearlyGrowthChartProps> = ({ series, periodLabel }) => {
  const [mode, setMode] = useState<Mode>("volume");

  const totals = useMemo(() => sumSeries(series), [series]);
  const hasTarget = useMemo(() => series.some((m) => m.receivedTarget > 0), [series]);
  const isEmpty = !series.length || (totals.leads === 0 && totals.inquiryValue === 0);

  const created = mode === "volume" ? "created" : "inquiryValue";
  const converted = mode === "volume" ? "converted" : "receivedValue";
  const createdName = mode === "volume" ? "Leads Created" : "Inquiry Value";
  const convertedName = mode === "volume" ? "Leads Converted" : "Received Value";
  const axisFmt = mode === "value" ? formatINRShort : formatCountShort;

  const subtitle =
    mode === "volume"
      ? `${totals.leads} created · ${totals.converted} converted${periodLabel ? ` · ${periodLabel}` : ""}`
      : `${formatINRShort(totals.inquiryValue)} inquired · ${formatINRShort(totals.receivedValue)} realized${
          periodLabel ? ` · ${periodLabel}` : ""
        }`;

  return (
    <AnalyticsCard
      title="Yearly Lead Growth"
      subtitle={subtitle}
      isEmpty={isEmpty}
      emptyHint="No monthly lead activity recorded for this year."
      headerRight={
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 4,
            borderRadius: 999,
            background: "#F1F5F9",
          }}
        >
          <TogglePill active={mode === "volume"} color="#6366F1" onClick={() => setMode("volume")}>
            Volume
          </TogglePill>
          <TogglePill active={mode === "value"} color="#8B5CF6" onClick={() => setMode("value")}>
            Value
          </TogglePill>
        </div>
      }
    >
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 16, right: 16, left: 6, bottom: 20 }}>
            <defs>
              <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-converted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-inquiry" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-received" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11, fontFamily: "Inter" }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Inter" }}
              width={52}
              tickFormatter={(v) => axisFmt(v)}
            >
              <Label
                value={mode === "value" ? "Value (₹)" : "Lead Count"}
                angle={-90}
                position="insideLeft"
                offset={-2}
                fill="#94A3B8"
                fontSize={10.5}
                fontWeight={600}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<Tip mode={mode} />} cursor={{ stroke: "#CBD5E1", strokeDasharray: "4 4" }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingBottom: 12 }}
            />

            <Area
              type="monotone"
              dataKey={created}
              name={createdName}
              stroke={mode === "volume" ? "#6366F1" : "#0EA5E9"}
              strokeWidth={2.5}
              fill={mode === "volume" ? "url(#grad-created)" : "url(#grad-inquiry)"}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={900}
            />
            <Area
              type="monotone"
              dataKey={converted}
              name={convertedName}
              stroke={mode === "volume" ? "#22C55E" : "#8B5CF6"}
              strokeWidth={2.5}
              fill={mode === "volume" ? "url(#grad-converted)" : "url(#grad-received)"}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={1100}
            />

            {mode === "value" && hasTarget && (
              <Line
                type="monotone"
                dataKey="receivedTarget"
                name="Received Target"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
};

export default React.memo(YearlyGrowthChart);
