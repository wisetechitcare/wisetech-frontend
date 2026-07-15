import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import dayjs, { Dayjs } from "dayjs";
import { formatCurrencyCompact } from "@utils/currency";
import { PeriodMode } from "@app/modules/common/components/PeriodFilter";

interface ReferredLead {
  id: string;
  lead?: {
    id: string;
    title?: string;
    createdAt?: string;
    inquiryDate?: string | null;
    status?: { name: string; color?: string | null } | null;
    commercials?: Array<{ cost?: number | string | null }> | null;
  } | null;
}

/** The date a referred lead is charted under — the business-meaningful inquiry
 * date, falling back to createdAt for old rows that never had one entered. */
export const referredLeadDate = (rl: { lead?: { inquiryDate?: string | null; createdAt?: string } | null }): string | undefined =>
  rl.lead?.inquiryDate || rl.lead?.createdAt;

interface Props {
  /** Already filtered to the active period by the parent. */
  referredLeads: ReferredLead[];
  /** Total referred leads (before the period filter) — for RESULTS n/n. */
  totalCount: number;
  mode: PeriodMode;
  rangeStart: Dayjs | null;
  rangeEnd: Dayjs | null;
}

const ACCENT = "#1E3A8A";
const FALLBACK_COLORS = ["#3B5BDB", "#2F9E44", "#E8590C", "#7048E8", "#E64980", "#1098AD", "#F08C00", "#868E96"];

const leadCost = (rl: ReferredLead): number =>
  (rl.lead?.commercials || []).reduce((s, c) => s + (Number(c?.cost) || 0), 0);

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

const LeadReferralAnalytics: React.FC<Props> = ({ referredLeads, totalCount, mode, rangeStart, rangeEnd }) => {
  const { series, categories, bucketValues, totalValue } = useMemo(() => {
    const rows = referredLeads.filter((r) => referredLeadDate(r));
    const dates = rows.map((r) => dayjs(referredLeadDate(r)));
    const buckets = buildBuckets(mode, rangeStart, rangeEnd, dates);

    // Distinct statuses (preserve first-seen order) + colors.
    const statusOrder: string[] = [];
    const statusColor = new Map<string, string>();
    rows.forEach((r) => {
      const name = r.lead?.status?.name || "No status";
      if (!statusOrder.includes(name)) {
        statusOrder.push(name);
        statusColor.set(name, r.lead?.status?.color || FALLBACK_COLORS[statusOrder.length % FALLBACK_COLORS.length]);
      }
    });

    const bucketOf = (d: Dayjs) => buckets.findIndex((b) => !d.isBefore(b.start) && !d.isAfter(b.end));

    const series = statusOrder.map((name) => ({
      name,
      color: statusColor.get(name),
      data: buckets.map(() => 0),
    }));
    const bucketValues = buckets.map(() => 0);
    let totalValue = 0;

    rows.forEach((r) => {
      const idx = bucketOf(dayjs(referredLeadDate(r)));
      if (idx < 0) return;
      const name = r.lead?.status?.name || "No status";
      const s = series.find((x) => x.name === name);
      if (s) (s.data[idx] as number) += 1;
      const cost = leadCost(r);
      bucketValues[idx] += cost;
      totalValue += cost;
    });

    return { series, categories: buckets.map((b) => b.label), bucketValues, totalValue };
  }, [referredLeads, mode, rangeStart, rangeEnd]);

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
    states: { hover: { filter: { type: "darken" } } },
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
      points: categories
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
        })),
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "light",
      style: { fontSize: "12px" },
      y: { formatter: (val: number) => `${val} lead${val === 1 ? "" : "s"}` },
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
              <i className="bi bi-graph-up-arrow" style={{ fontSize: 16 }} />
            </span>
            <span className="fw-bold fs-5 text-gray-900">Referred Leads — Business</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #E2E8F0", borderRadius: 6, padding: "0 12px", background: "#F8FAFC", height: 36, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>Value:</span>
              <span style={{ fontSize: 14, color: "#1E3A8A", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>{formatCurrencyCompact(totalValue)}</span>
            </div>
            <div style={{ width: 1, height: 14, backgroundColor: "#E2E8F0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>Results:</span>
              <span style={{ fontSize: 14, color: "#1E3A8A", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>{referredLeads.length}</span>
            </div>
          </div>
        </div>

        {hasData ? (
          // Re-mount on filter change → replays a subtle CSS fade-in instead of
          // ApexCharts' heavier internal transition.
          <div key={`${mode}-${rangeStart?.valueOf() ?? "a"}-${rangeEnd?.valueOf() ?? "b"}`} className="lra-fade">
            <ReactApexChart options={options} series={series} type="bar" height={300} />
          </div>
        ) : (
          <div className="text-center text-muted py-10" style={{ fontSize: 13 }}>
            No referred leads in this period.
          </div>
        )}
        <style>{`.lra-fade{animation:lraFade .28s ease-out}@keyframes lraFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    </div>
  );
};

export default LeadReferralAnalytics;
