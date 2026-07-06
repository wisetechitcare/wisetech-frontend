/**
 * Pure helpers for the YEARLY Lead-Overview experience.
 *
 * The yearly dashboard is built around the time dimension, so everything here
 * turns the `getMonthlyLeadAnalytics` payload (one row per month, with inquiry/
 * received counts + values + targets) into trend series, executive KPIs with
 * year-over-year deltas, and automated executive insights.
 *
 * Side-effect free → unit-testable and reusable by any chart component.
 */

import {
  ChartDatum,
  computeLeadStatusKpis,
  InsightTone,
} from "./leadAnalyticsUtils";

const round1 = (n: number): number => Math.round(n * 10) / 10;

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ── Indian short-form money / number formatting ────────────────────────── */

/** "₹1.25Cr" / "₹3.4L" / "₹12K" / "₹420" — compact, executive-friendly. */
export const formatINRShort = (val: number): string => {
  const n = Number(val) || 0;
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${round1(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}₹${round1(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}₹${round1(a / 1e3)}K`;
  return `${sign}₹${Math.round(a)}`;
};

/** "1.2K" / "12.4M"-style for counts (rare, but keeps axes tidy). */
export const formatCountShort = (val: number): string => {
  const n = Number(val) || 0;
  const a = Math.abs(n);
  if (a >= 1e7) return `${round1(n / 1e7)}Cr`;
  if (a >= 1e5) return `${round1(n / 1e5)}L`;
  if (a >= 1e3) return `${round1(n / 1e3)}K`;
  return `${n}`;
};

/* ── Monthly trend series ───────────────────────────────────────────────── */

export interface YearlyMonthPoint {
  /** Raw key, e.g. "2025-04". */
  key: string;
  /** Short month label, e.g. "Apr". */
  label: string;
  /** Leads created (inquiryCount). */
  created: number;
  /** Leads converted / received (receivedCount). */
  converted: number;
  /** Inquiry value (₹). */
  inquiryValue: number;
  /** Received value (₹). */
  receivedValue: number;
  /** Conversion % for the month (converted ÷ created). */
  conversion: number;
  inquiryTarget: number;
  receivedTarget: number;
}

/**
 * Normalise the `getMonthlyLeadAnalytics` payload into an ordered trend series.
 * Tolerant of both calendar ("YYYY-MM") and pre-labelled month rows.
 */
export const buildYearlySeries = (raw: any[]): YearlyMonthPoint[] => {
  const safe = Array.isArray(raw) ? raw : [];
  return safe.map((m, i) => {
    let label = `M${i + 1}`;
    if (typeof m.month === "string" && m.month.includes("-")) {
      const idx = parseInt(m.month.split("-")[1], 10) - 1;
      label = MONTH_SHORT[idx] ?? m.month;
    } else if (typeof m.month === "number") {
      label = MONTH_SHORT[m.month - 1] ?? `M${m.month}`;
    } else if (typeof m.month === "string") {
      label = m.month.slice(0, 3);
    }

    const created = Number(m.inquiryCount) || 0;
    const converted = Number(m.receivedCount) || 0;

    return {
      key: String(m.month ?? i),
      label,
      created,
      converted,
      inquiryValue: Number(m.inquiryValue) || 0,
      receivedValue: Number(m.receivedValue) || 0,
      conversion: created > 0 ? round1((converted / created) * 100) : 0,
      inquiryTarget: Number(m.inquiryTarget) || 0,
      receivedTarget: Number(m.receivedTarget) || 0,
    };
  });
};

export interface SeriesTotals {
  leads: number;
  converted: number;
  inquiryValue: number;
  receivedValue: number;
}

export const sumSeries = (s: YearlyMonthPoint[]): SeriesTotals => ({
  leads: s.reduce((a, b) => a + b.created, 0),
  converted: s.reduce((a, b) => a + b.converted, 0),
  inquiryValue: s.reduce((a, b) => a + b.inquiryValue, 0),
  receivedValue: s.reduce((a, b) => a + b.receivedValue, 0),
});

/** % change cur vs prev, or null when there is no comparable prior value. */
export const pctChange = (cur: number, prev: number): number | null =>
  prev > 0 ? round1(((cur - prev) / prev) * 100) : null;

/* ── Executive KPI model (feeds the extended KpiStatCard) ───────────────── */

export interface YearlyKpi {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: string;
  icon: string;
  /** YoY change; null hides the trend pill. */
  delta: number | null;
  /** Unit shown after the delta (default "%"). */
  deltaSuffix?: string;
  /** When false, a positive delta is rendered red (e.g. cost / loss metrics). */
  deltaPositiveIsGood?: boolean;
  /** Tiny inline trend; usually the matching monthly series. */
  sparkline: number[];
  /** Optional compact formatter for large ₹ values. */
  valueFormatter?: (n: number) => string;
}

/**
 * Build the 8 executive KPIs for the year. `statusData` (period aggregate)
 * drives the precise counts; the current & previous monthly series drive the
 * YoY deltas and sparklines on a consistent basis.
 */
export const computeYearlyKpis = (
  current: YearlyMonthPoint[],
  previous: YearlyMonthPoint[],
  statusData: ChartDatum[]
): YearlyKpi[] => {
  const kpis = computeLeadStatusKpis(statusData);
  const cur = sumSeries(current);
  const prev = sumSeries(previous);

  const pipelineValue = (Array.isArray(statusData) ? statusData : []).reduce(
    (s, d) => s + (Number(d.totalCost) || 0),
    0
  );

  const total = kpis.total || cur.leads;
  const received = kpis.received || cur.converted;
  const settled = received + kpis.notReceived; // decided leads (won + lost)
  const winRate = settled > 0 ? round1((received / settled) * 100) : 0;
  const avgDeal = received > 0 ? Math.round(cur.receivedValue / received) : 0;
  const prevAvgDeal =
    prev.converted > 0 ? Math.round(prev.receivedValue / prev.converted) : 0;

  const curConv = cur.leads > 0 ? round1((cur.converted / cur.leads) * 100) : 0;
  const prevConv =
    prev.leads > 0 ? round1((prev.converted / prev.leads) * 100) : 0;

  const sparkCreated = current.map((m) => m.created);
  const sparkConverted = current.map((m) => m.converted);
  const sparkReceivedValue = current.map((m) => m.receivedValue);
  const sparkInquiryValue = current.map((m) => m.inquiryValue);

  return [
    {
      label: "Total Leads",
      value: total,
      accent: "#6366F1",
      icon: "bi-people",
      delta: pctChange(cur.leads, prev.leads),
      sparkline: sparkCreated,
    },
    {
      label: "Converted",
      value: received,
      accent: "#22C55E",
      icon: "bi-check2-circle",
      delta: pctChange(cur.converted, prev.converted),
      sparkline: sparkConverted,
    },
    {
      label: "Conversion Rate",
      value: kpis.conversionRate,
      suffix: "%",
      decimals: 1,
      accent: "#0EA5E9",
      icon: "bi-graph-up-arrow",
      delta: prevConv > 0 ? round1(curConv - prevConv) : null,
      deltaSuffix: "pts",
      sparkline: sparkConverted,
    },
    {
      label: "Yearly Revenue",
      value: cur.receivedValue,
      accent: "#8B5CF6",
      icon: "bi-cash-stack",
      delta: pctChange(cur.receivedValue, prev.receivedValue),
      sparkline: sparkReceivedValue,
      valueFormatter: formatINRShort,
    },
    {
      label: "Avg Deal Size",
      value: avgDeal,
      accent: "#14B8A6",
      icon: "bi-tag",
      delta: pctChange(avgDeal, prevAvgDeal),
      sparkline: sparkReceivedValue,
      valueFormatter: formatINRShort,
    },
    {
      label: "Win Rate",
      value: winRate,
      suffix: "%",
      decimals: 1,
      accent: "#F59E0B",
      icon: "bi-trophy",
      delta: null,
      sparkline: sparkConverted,
    },
    {
      label: "Active Pipeline",
      value: kpis.pipeline,
      accent: "#EC4899",
      icon: "bi-hourglass-split",
      delta: null,
      sparkline: sparkCreated,
    },
    {
      label: "Inquiry Value",
      value: cur.inquiryValue || pipelineValue,
      accent: "#0EA5E9",
      icon: "bi-wallet2",
      delta: pctChange(cur.inquiryValue, prev.inquiryValue),
      sparkline: sparkInquiryValue,
      valueFormatter: formatINRShort,
    },
  ];
};

/* ── Automated executive insights ───────────────────────────────────────── */

export interface YearlyInsight {
  tone: InsightTone;
  text: string;
  icon: string;
}

const TONE_ICON: Record<InsightTone, string> = {
  positive: "bi-graph-up-arrow",
  warning: "bi-exclamation-triangle-fill",
  critical: "bi-exclamation-octagon-fill",
  neutral: "bi-info-circle-fill",
};

const topOf = (data: ChartDatum[]): ChartDatum | null => {
  const safe = (Array.isArray(data) ? data : []).filter((d) => d.value > 0);
  if (!safe.length) return null;
  return [...safe].sort((a, b) => b.value - a.value)[0];
};

const shareOf = (item: ChartDatum, data: ChartDatum[]): number => {
  const total = (Array.isArray(data) ? data : []).reduce(
    (s, d) => s + (Number(d.value) || 0),
    0
  );
  return total > 0 ? round1((item.value / total) * 100) : 0;
};

/**
 * Generate prioritised, tone-tagged executive insights from the year's data.
 * Every line is derived from real numbers — no placeholders.
 */
export const generateYearlyInsights = (
  current: YearlyMonthPoint[],
  previous: YearlyMonthPoint[],
  statusData: ChartDatum[],
  serviceData: ChartDatum[],
  sourceData: ChartDatum[],
  locationData: ChartDatum[],
  limit = 6
): YearlyInsight[] => {
  const out: YearlyInsight[] = [];
  const push = (tone: InsightTone, text: string) =>
    out.push({ tone, text, icon: TONE_ICON[tone] });

  const cur = sumSeries(current);
  const prev = sumSeries(previous);
  const kpis = computeLeadStatusKpis(statusData);

  // 1) YoY lead growth.
  const leadGrowth = pctChange(cur.leads, prev.leads);
  if (leadGrowth !== null) {
    push(
      leadGrowth >= 0 ? "positive" : "critical",
      `Lead volume ${leadGrowth >= 0 ? "grew" : "declined"} ${Math.abs(
        leadGrowth
      )}% versus last year (${cur.leads} vs ${prev.leads}).`
    );
  }

  // 2) YoY revenue growth.
  const revGrowth = pctChange(cur.receivedValue, prev.receivedValue);
  if (revGrowth !== null) {
    push(
      revGrowth >= 0 ? "positive" : "critical",
      `Realized revenue ${revGrowth >= 0 ? "rose" : "fell"} ${Math.abs(
        revGrowth
      )}% YoY to ${formatINRShort(cur.receivedValue)}.`
    );
  }

  // 3) Best-performing month by lead volume.
  const best = [...current].sort((a, b) => b.created - a.created)[0];
  if (best && best.created > 0) {
    push("neutral", `${best.label} was the strongest month with ${best.created} new leads.`);
  }

  // 4) Conversion headline.
  if (kpis.total > 0) {
    const tone: InsightTone = kpis.conversionRate >= 25 ? "positive" : "neutral";
    push(tone, `Year-to-date conversion stands at ${kpis.conversionRate}% (${kpis.received} converted).`);
  }

  // 5) Top service contribution.
  const topService = topOf(serviceData);
  if (topService) {
    push("neutral", `${topService.label} generated ${shareOf(topService, serviceData)}% of yearly opportunities.`);
  }

  // 6) Top acquisition channel.
  const topSource = topOf(sourceData);
  if (topSource) {
    push("neutral", `${topSource.label} is your top channel with ${topSource.value} leads this year.`);
  }

  // 7) Top geography.
  const topLoc = topOf(locationData);
  if (topLoc) {
    push("neutral", `${topLoc.label} contributed the highest lead volume (${topLoc.value}).`);
  }

  // 8) Loss-rate watch-out.
  if (kpis.notReceived > 0 && kpis.lostRate >= 30) {
    push("warning", `Loss rate is high at ${kpis.lostRate}% — worth investigating drop-off.`);
  }

  // 9) Active pipeline reminder.
  if (kpis.pipeline > 0) {
    push("warning", `${kpis.pipeline} leads are still active and worth following up before year-end.`);
  }

  // De-dupe by text, keep priority order.
  const seen = new Set<string>();
  return out.filter((i) => !seen.has(i.text) && seen.add(i.text)).slice(0, limit);
};
