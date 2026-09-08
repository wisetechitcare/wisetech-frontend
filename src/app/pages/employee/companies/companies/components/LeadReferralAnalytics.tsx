import React, { useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import dayjs, { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrencyCompact } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { PeriodMode } from "@app/modules/common/components/PeriodFilter";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui';

/**
 * The one relationship chart, shared by all six analytics tabs (Lead Reference,
 * Company References and Projects, on both the Company and the Contact page).
 *
 * It reads normalised rows rather than leads, because the three questions differ only
 * in what a bar counts: leads referred, projects running, companies referred. Keeping
 * one chart keeps one grammar — same buckets, same stacking, same money treatment —
 * so a reader who learns the Lead Reference tab can already read the other two.
 *
 * Money is optional. A dataset with no value dimension (company referrals carry no
 * amount) simply drops the ₹ pill and the per-bar labels instead of printing ₹0.
 *
 * NOTE: the file name is historical. It stays put because the path is in
 * `.eslint-ui-baseline.cjs` — renaming it turns its legacy `card-body` / `<style>`
 * markup from warnings into build-breaking errors.
 */

/** One charted record, already resolved by the caller. */
export interface AnalyticsRow {
  /** The date this row is charted under. Rows without one are dropped. */
  date?: string | null;
  /** Money this row contributes. Omit or 0 for datasets with no value dimension. */
  value?: number;
  /** Stack label — a status, a type, whatever splits the bar meaningfully. */
  series: string;
  /** Stack colour. Prefer the admin-configured colour so the chart matches its table. */
  color?: string | null;
  /** What this record is called, for the drill-down list. */
  label?: string;
  /** Where the record lives, so the drill-down list can go there. */
  href?: string;
}

/** The date a referred lead is charted under — the business-meaningful inquiry
 * date, falling back to createdAt for old rows that never had one entered. */
export const referredLeadDate = (rl: { lead?: { inquiryDate?: string | null; createdAt?: string } | null }): string | undefined =>
  rl.lead?.inquiryDate || rl.lead?.createdAt;

interface Props {
  /** Already filtered to the active period by the parent. */
  rows: AnalyticsRow[];
  /** Card heading, e.g. "Referred Leads — Business". */
  title: string;
  /** Keenicon/bi name for the heading tile. */
  icon?: string;
  /** Singular noun for the tooltip and empty state: "lead", "project", "company". */
  noun: string;
  mode: PeriodMode;
  rangeStart: Dayjs | null;
  rangeEnd: Dayjs | null;
}

/** "lead" → "leads", "company" → "companies". A bare +"s" gave us "2 companys".
 *  Consonant-before-y only, so a "day"-shaped noun stays "days". */
const plural = (noun: string, n: number): string =>
  n === 1 ? noun : /[^aeiou]y$/i.test(noun) ? `${noun.slice(0, -1)}ies` : `${noun}s`;

const ACCENT = "#1E3A8A";
const FALLBACK_COLORS = ["#3B5BDB", "#2F9E44", "#E8590C", "#7048E8", "#E64980", "#1098AD", "#F08C00", "#868E96"];

// Build the time buckets for the x-axis from the active mode + range (falling
// back to the data's own min/max date when the range is open-ended).
const buildBuckets = (
  mode: PeriodMode,
  start: Dayjs | null,
  end: Dayjs | null,
  dates: Dayjs[]
): Array<{ label: string; start: Dayjs; end: Dayjs }> => {
  let from = start;
  let to = end;
  if (!from || !to) {
    if (!dates.length) return [];
    from = dates.reduce((a, b) => (a.isBefore(b) ? a : b)).startOf("day");
    to = dates.reduce((a, b) => (a.isAfter(b) ? a : b)).endOf("day");
  }

  // Pick the bucket granularity per mode.
  let unit: "day" | "month" | "year";
  if (mode === "yearly") unit = "month";
  else if (mode === "allyear") unit = "year";
  else if (mode === "custom") unit = to.diff(from, "day") > 45 ? "month" : "day";
  else unit = "day"; // daily / weekly / monthly

  const fmt = unit === "day" ? "DD MMM" : unit === "month" ? "MMM YY" : "YYYY";
  const buckets: Array<{ label: string; start: Dayjs; end: Dayjs }> = [];
  let cursor = from.startOf(unit);
  const last = to.endOf(unit);
  let guard = 0;
  while ((cursor.isBefore(last) || cursor.isSame(last)) && guard < 400) {
    buckets.push({ label: cursor.format(fmt), start: cursor.startOf(unit), end: cursor.endOf(unit) });
    cursor = cursor.add(1, unit);
    guard++;
  }
  return buckets;
};

const LeadReferralAnalytics: React.FC<Props> = ({ rows, title, icon = "bi-graph-up-arrow", noun, mode, rangeStart, rangeEnd }) => {
  const navigate = useNavigate();
  // Which bar was clicked. A bar is a period, so the drill-down shows the whole
  // period rather than only the segment under the cursor — "what is in 2024" is the
  // question a stacked bar provokes, and answering half of it would be a tease.
  const [openBucket, setOpenBucket] = useState<number | null>(null);
  const { series, categories, bucketValues, bucketRows, totalValue, hasValue } = useMemo(() => {
    const dated = rows.filter((r) => r.date);
    const dates = dated.map((r) => dayjs(r.date as string));
    const buckets = buildBuckets(mode, rangeStart, rangeEnd, dates);

    // Distinct series (preserve first-seen order) + colours.
    const seriesOrder: string[] = [];
    const seriesColor = new Map<string, string>();
    dated.forEach((r) => {
      if (!seriesOrder.includes(r.series)) {
        seriesOrder.push(r.series);
        seriesColor.set(r.series, r.color || FALLBACK_COLORS[seriesOrder.length % FALLBACK_COLORS.length]);
      }
    });

    const bucketOf = (d: Dayjs) => buckets.findIndex((b) => !d.isBefore(b.start) && !d.isAfter(b.end));

    const series = seriesOrder.map((name) => ({
      name,
      color: seriesColor.get(name),
      data: buckets.map(() => 0),
    }));
    const bucketValues = buckets.map(() => 0);
    // The records behind each bar, kept so a click can show what the bar is made of.
    const bucketRows: AnalyticsRow[][] = buckets.map(() => []);
    let totalValue = 0;

    dated.forEach((r) => {
      const idx = bucketOf(dayjs(r.date as string));
      if (idx < 0) return;
      const s = series.find((x) => x.name === r.series);
      if (s) (s.data[idx] as number) += 1;
      const v = Number(r.value) || 0;
      bucketValues[idx] += v;
      bucketRows[idx].push(r);
      totalValue += v;
    });

    return {
      series,
      categories: buckets.map((b) => b.label),
      bucketValues,
      bucketRows,
      totalValue,
      hasValue: totalValue > 0,
    };
  }, [rows, mode, rangeStart, rangeEnd]);

  const seriesColor = useMemo(
    () => new Map(series.map((s) => [s.name, s.color as string])),
    [series]
  );

  // What the open bar contains, newest first. Indexed defensively: changing the period
  // rebuilds the buckets, and the dialog may still be holding an index from the old set.
  const drill = useMemo(() => {
    const records =
      openBucket === null
        ? []
        : [...(bucketRows[openBucket] || [])].sort(
            (a, b) => dayjs(b.date as string).valueOf() - dayjs(a.date as string).valueOf()
          );
    const value = records.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    const count = `${records.length} ${plural(noun, records.length)}`;
    return { records, subtitle: value > 0 ? `${count} · ${formatCurrencyCompact(value)}` : count };
  }, [openBucket, bucketRows, noun]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
      parentHeightOffset: 0,
      // ApexCharts' own (re)draw animation feels laggy; turn it off and use a
      // light CSS fade on the wrapper instead (see below).
      animations: { enabled: false },
      events: {
        dataPointSelection: (_e: any, _ctx: any, cfg: any) => setOpenBucket(cfg?.dataPointIndex ?? null),
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: categories.length > 12 ? "62%" : "38%",
        borderRadius: 6,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
      },
    },
    colors: series.map((s) => s.color as string),
    fill: {
      type: "gradient",
      gradient: { shade: "light", type: "vertical", shadeIntensity: 0.25, opacityFrom: 1, opacityTo: 0.88, stops: [0, 100] },
    },
    // `active` off: Apex would otherwise leave the clicked bar visibly selected after
    // the dialog closes, which reads as a filter nobody applied.
    states: { hover: { filter: { type: "darken" } }, active: { filter: { type: "none" } } },
    dataLabels: { enabled: false },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12.5px",
      fontWeight: 600,
      markers: { radius: 12 } as any,
      itemMargin: { horizontal: 10 },
      labels: { colors: "#46505d" },
    },
    grid: {
      borderColor: "#eef0f3",
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      padding: { top: 10, right: 8, left: 4 },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: "#8b95a5" }, rotate: -45, hideOverlappingLabels: true },
    },
    yaxis: {
      labels: { style: { fontSize: "11px", colors: "#8b95a5" }, formatter: (v) => `${Math.round(v)}` },
    },
    annotations: {
      // Money labels only where there IS money — a row of ₹0 chips over a referral
      // count would be noise pretending to be data.
      points: hasValue
        ? categories
            .map((label, i) => ({ label, i }))
            .filter(({ i }) => bucketValues[i] > 0)
            .map(({ label, i }) => ({
              x: label,
              y: series.reduce((sum, s) => sum + (s.data[i] as number), 0),
              marker: { size: 0 },
              label: {
                text: formatCurrencyCompact(bucketValues[i]),
                offsetY: -8,
                borderWidth: 0,
                borderRadius: 6,
                style: {
                  background: "#fbf3f3",
                  color: ACCENT,
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: { left: 7, right: 7, top: 3, bottom: 3 },
                },
              },
            }))
        : [],
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light",
      style: { fontSize: "12px" },
      y: { formatter: (val: number) => `${val} ${plural(noun, val)}` },
    },
  };

  const hasData = series.length > 0 && categories.length > 0;

  return (
    <div className="card border shadow-sm mb-4" style={{ borderRadius: 14 }}>
      <div className="card-body">
        {/* VALUE / RESULTS bar */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4" style={{ gap: 12 }}>
          <div className="d-flex align-items-center" style={{ gap: 10 }}>
            <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 34, height: 34, borderRadius: 10, background: "#fbf3f3", color: ACCENT }}>
              <AppIcon name={icon} className="fs-4" />
            </span>
            <span className="fw-bold fs-5 text-gray-900">{title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #E2E8F0", borderRadius: 6, padding: "0 12px", background: "#F8FAFC", height: 36, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {hasValue && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>Value:</span>
                  <span style={{ fontSize: 14, color: "#1E3A8A", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>{formatCurrencyCompact(totalValue)}</span>
                </div>
                <div style={{ width: 1, height: 14, backgroundColor: "#E2E8F0" }} />
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>Results:</span>
              <span style={{ fontSize: 14, color: "#1E3A8A", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>{rows.length}</span>
            </div>
          </div>
        </div>

        {hasData ? (
          // Re-mount on filter change → replays a subtle CSS fade-in instead of
          // ApexCharts' heavier internal transition.
          <div
            key={`${mode}-${rangeStart?.valueOf() ?? "a"}-${rangeEnd?.valueOf() ?? "b"}`}
            className="lra-fade"
            style={{ cursor: "pointer" }}
          >
            <ReactApexChart options={options} series={series} type="bar" height={300} />
          </div>
        ) : (
          <div className="text-center text-muted py-10" style={{ fontSize: 13 }}>
            No {plural(noun, 0)} in this period.
          </div>
        )}
        <style>{`.lra-fade{animation:lraFade .28s ease-out}@keyframes lraFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>

      {/* Drill-down: what the clicked bar is actually made of. */}
      <GlassDialog
        open={openBucket !== null}
        onClose={() => setOpenBucket(null)}
        maxWidth="sm"
        fullWidth
        header={
          <GlassHeader
            title={openBucket !== null ? categories[openBucket] : ""}
            subtitle={drill.subtitle}
            icon={<AppIcon name={icon} className="fs-1" />}
            onClose={() => setOpenBucket(null)}
          />
        }
      >
        <Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {drill.records.map((r, i) => (
            <Box
              key={`${r.label}-${i}`}
              onClick={r.href ? () => { setOpenBucket(null); navigate(r.href as string); } : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                cursor: r.href ? "pointer" : "default",
                "&:hover": r.href ? { bgcolor: "action.hover" } : undefined,
              }}
            >
              {/* The legend's colour, so a row is traceable back to its stack segment. */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: seriesColor.get(r.series) || "text.disabled",
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {r.label || "Untitled"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.series}
                </Typography>
              </Box>
              <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                {hasValue && Number(r.value) > 0 && (
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrencyCompact(Number(r.value))}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {formatDate(r.date)}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </GlassDialog>
    </div>
  );
};

export default LeadReferralAnalytics;
