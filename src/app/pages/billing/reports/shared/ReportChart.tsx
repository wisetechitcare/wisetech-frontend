import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { GlassCard, TRIO } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { BillingEmptyState } from "../../components";

/**
 * Report chart — one component covers line/bar/area/pie/donut, so every report
 * page draws from the same visual system instead of hand-rolling recharts.
 *
 * Color follows the app's own fixed categorical order (`TRIO`), never a
 * generated hue — the same palette every Billing status chip already uses, so
 * a chart's colors read consistently with the rest of the module. Single-series
 * charts use one hue (blue) throughout, matching the "sequential = one hue"
 * rule; multi-category breakdowns cycle the fixed order below.
 */

const CATEGORICAL_ORDER = [
  TRIO.blue.c, TRIO.green.c, TRIO.purple.c, TRIO.amber.c,
  TRIO.rose.c, TRIO.cyan.c, TRIO.slate.c,
];

const isCurrency = (unit?: "currency" | "number") => unit !== "number";

const CustomTooltip: React.FC<any> = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
        borderRadius: "10px", boxShadow: 3, px: 1.5, py: 1,
      }}
    >
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, mb: 0.5 }}>{label}</Typography>
      {payload.map((p: any, i: number) => (
        <Typography key={i} sx={{ fontSize: 12, color: p.color, fontWeight: 600 }}>
          {p.name}: {isCurrency(unit) ? formatCurrencyDecimal(p.value) : p.value}
        </Typography>
      ))}
    </Box>
  );
};

export interface ReportChartProps {
  title: string;
  subtitle?: string;
  type: "line" | "bar" | "stackedBar" | "pie" | "donut" | "area";
  data: Array<Record<string, any>>;
  /** Field to read the x-axis / slice label from. Default: "label" (or "date" for time series). */
  xKey?: string;
  /** Series to plot. For pie/donut, only the first is used (value field). Default: single "value" series. */
  series?: { key: string; label: string; color?: string }[];
  unit?: "currency" | "number";
  height?: number;
  onSliceClick?: (point: Record<string, any>) => void;
  emptyLabel?: string;
}

const axisTick = { fontSize: 11 };

const ReportChart: React.FC<ReportChartProps> = ({
  title, subtitle, type, data, xKey, series, unit = "currency", height = 300, onSliceClick, emptyLabel,
}) => {
  const theme = useTheme();
  const gridColor = theme.palette.divider;
  const textColor = theme.palette.text.secondary;
  const resolvedX = xKey ?? (data[0]?.date ? "date" : "label");
  const resolvedSeries = series ?? [{ key: "value", label: title, color: TRIO.blue.c }];
  const showLegend = resolvedSeries.length > 1;

  const isEmpty = !data.length || data.every((d) => resolvedSeries.every((s) => !d[s.key]));

  return (
    <GlassCard preset="section" sx={{ p: 2, height: "100%" }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 11.5, color: "text.secondary", mb: 1 }}>{subtitle}</Typography>
      )}

      {isEmpty ? (
        <Box sx={{ height, display: "grid", placeItems: "center" }}>
          <BillingEmptyState title={emptyLabel ?? "No data for this period"} />
        </Box>
      ) : (
        <Box sx={{ height, mt: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey={resolvedX} tick={{ ...axisTick, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis tick={{ ...axisTick, fill: textColor }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {showLegend && <Legend wrapperStyle={{ fontSize: 11.5 }} />}
                {resolvedSeries.map((s, i) => (
                  <Line
                    key={s.key} type="monotone" dataKey={s.key} name={s.label}
                    stroke={s.color ?? CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]}
                    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : type === "area" ? (
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey={resolvedX} tick={{ ...axisTick, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis tick={{ ...axisTick, fill: textColor }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {showLegend && <Legend wrapperStyle={{ fontSize: 11.5 }} />}
                {resolvedSeries.map((s, i) => (
                  <Area
                    key={s.key} type="monotone" dataKey={s.key} name={s.label}
                    stroke={s.color ?? CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]}
                    fill={s.color ?? CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]} fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : type === "bar" || type === "stackedBar" ? (
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey={resolvedX} tick={{ ...axisTick, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
                <YAxis tick={{ ...axisTick, fill: textColor }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<CustomTooltip unit={unit} />} />
                {showLegend && <Legend wrapperStyle={{ fontSize: 11.5 }} />}
                {resolvedSeries.map((s, i) => (
                  <Bar
                    key={s.key} dataKey={s.key} name={s.label}
                    fill={s.color ?? CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]}
                    stackId={type === "stackedBar" ? "stack" : undefined}
                    radius={type === "stackedBar" ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    cursor={onSliceClick ? "pointer" : undefined}
                    onClick={(point: any) => onSliceClick?.(point)}
                  />
                ))}
              </BarChart>
            ) : (
              <PieChart>
                <Tooltip content={<CustomTooltip unit={unit} />} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <Pie
                  data={data}
                  dataKey={resolvedSeries[0].key}
                  nameKey={resolvedX}
                  innerRadius={type === "donut" ? "55%" : 0}
                  outerRadius="80%"
                  paddingAngle={2}
                  cursor={onSliceClick ? "pointer" : undefined}
                  onClick={(point: any) => onSliceClick?.(point)}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={CATEGORICAL_ORDER[i % CATEGORICAL_ORDER.length]} stroke={theme.palette.background.paper} strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </Box>
      )}
    </GlassCard>
  );
};

export default ReportChart;
