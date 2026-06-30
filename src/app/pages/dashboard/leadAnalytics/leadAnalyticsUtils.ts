/**
 * Pure, framework-agnostic helpers for the Lead Analytics experience.
 *
 * Everything here is side-effect free so it can be unit-tested and reused by
 * any chart component. The dashboard feeds in the already-normalised chart
 * data ({ label, value, color, totalCost, id }) produced by
 * `convertToChartData` and gets back KPIs, colour assignments and the
 * automated business-insight strings.
 */

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
  totalCost?: number;
  id?: string;
}

/* ── Status colour system ──────────────────────────────────────────────── */

/** Brand colours for the well-known lead statuses (PHASE 3 colour system). */
export const STATUS_COLORS: Record<string, string> = {
  received: "#22C55E",
  pending: "#F59E0B",
  hold: "#06B6D4",
  notreceived: "#EF4444",
};

/** Canonical pipeline order used by the funnel: in-flow → won → lost. */
const STATUS_ORDER = ["pending", "hold", "received", "notreceived"];

const STATUS_FALLBACK = "#94A3B8";

/** Strip everything but letters so "Not Received"/"not-received" both match. */
export const normalizeStatusKey = (label: string): string =>
  (label || "").toLowerCase().replace(/[^a-z]/g, "");

/** Resolve a status colour: brand colour by name, else backend colour, else grey. */
export const resolveStatusColor = (label: string, fallback?: string): string =>
  STATUS_COLORS[normalizeStatusKey(label)] || fallback || STATUS_FALLBACK;

/* ── Dynamic service palette ───────────────────────────────────────────── */

/**
 * Curated, accessible, high-contrast enterprise palette. Beyond its length we
 * fall back to evenly-spaced HSL hues (golden-angle) so any number of services
 * still gets distinct, readable colours.
 */
const ENTERPRISE_PALETTE = [
  "#6366F1", "#0EA5E9", "#22C55E", "#F59E0B", "#EF4444",
  "#A855F7", "#14B8A6", "#F97316", "#EC4899", "#84CC16",
];

export const buildPalette = (count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < ENTERPRISE_PALETTE.length) {
      colors.push(ENTERPRISE_PALETTE[i]);
    } else {
      // Golden-angle hue rotation keeps generated colours visually distinct.
      const hue = Math.round((i * 137.508) % 360);
      colors.push(`hsl(${hue}, 65%, 55%)`);
    }
  }
  return colors;
};

/* ── KPI calculations (PHASE 1) ────────────────────────────────────────── */

export interface LeadStatusKpis {
  total: number;
  received: number;
  pending: number;
  hold: number;
  notReceived: number;
  /** Received / Total × 100 */
  conversionRate: number;
  /** Not Received / Total × 100 */
  lostRate: number;
  /** Hold / Total × 100 */
  holdRate: number;
  /** Pending + Hold */
  pipeline: number;
  /** Active pipeline as a share of all leads */
  pipelinePct: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export const computeLeadStatusKpis = (data: ChartDatum[]): LeadStatusKpis => {
  const safe = Array.isArray(data) ? data : [];
  const total = safe.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const countFor = (key: string): number =>
    safe
      .filter((d) => normalizeStatusKey(d.label) === key)
      .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const received = countFor("received");
  const pending = countFor("pending");
  const hold = countFor("hold");
  const notReceived = countFor("notreceived");
  const pipeline = pending + hold;

  const pct = (n: number): number => (total > 0 ? round1((n / total) * 100) : 0);

  return {
    total,
    received,
    pending,
    hold,
    notReceived,
    conversionRate: pct(received),
    lostRate: pct(notReceived),
    holdRate: pct(hold),
    pipeline,
    pipelinePct: pct(pipeline),
  };
};

/* ── Funnel ordering ───────────────────────────────────────────────────── */

/**
 * Order the status data along the lead lifecycle (Pending → Hold → Received →
 * Not Received). Any unrecognised statuses are appended afterwards so nothing
 * is silently dropped.
 */
export const orderStatusForFunnel = (data: ChartDatum[]): ChartDatum[] => {
  const safe = Array.isArray(data) ? data : [];
  const known: ChartDatum[] = [];
  const seen = new Set<ChartDatum>();

  STATUS_ORDER.forEach((key) => {
    safe
      .filter((d) => normalizeStatusKey(d.label) === key)
      .forEach((d) => {
        known.push(d);
        seen.add(d);
      });
  });

  const rest = safe.filter((d) => !seen.has(d));
  return [...known, ...rest];
};

/* ── Automated business insights (PHASE 9) ─────────────────────────────── */

export const generateStatusInsights = (kpis: LeadStatusKpis): string[] => {
  if (kpis.total === 0) return [];

  const insights: string[] = [];
  insights.push(
    `Received leads represent ${kpis.conversionRate}% of all leads.`
  );
  insights.push(
    `Pending + Hold leads account for ${kpis.pipelinePct}% of total leads (active pipeline of ${kpis.pipeline}).`
  );

  if (kpis.notReceived > 0) {
    insights.push(
      `${kpis.lostRate}% of leads were not received${
        kpis.lostRate >= 40 ? " — worth investigating drop-off." : "."
      }`
    );
  }

  return insights;
};

/* ── Executive overview KPIs (Lead Overview page) ──────────────────────── */

export interface ExecutiveKpis extends LeadStatusKpis {
  /** Sum of all lead budgets (₹). */
  totalRevenue: number;
  /** totalRevenue / total leads. */
  avgLeadValue: number;
  /**
   * 0–100 concentration-aware diversity score derived from the service mix
   * (1 − Herfindahl index). 100 = perfectly spread across services, low =
   * business depends on a single service.
   */
  serviceDiversity: number;
}

export const computeExecutiveKpis = (
  statusData: ChartDatum[],
  serviceData: ChartDatum[]
): ExecutiveKpis => {
  const base = computeLeadStatusKpis(statusData);

  const totalRevenue = (Array.isArray(statusData) ? statusData : []).reduce(
    (sum, d) => sum + (Number(d.totalCost) || 0),
    0
  );
  const avgLeadValue = base.total > 0 ? Math.round(totalRevenue / base.total) : 0;

  const services = (Array.isArray(serviceData) ? serviceData : []).filter(
    (d) => d.value > 0
  );
  const serviceTotal = services.reduce((s, d) => s + d.value, 0);
  const hhi =
    serviceTotal > 0
      ? services.reduce((s, d) => s + Math.pow(d.value / serviceTotal, 2), 0)
      : 1;
  const serviceDiversity = round1((1 - hhi) * 100);

  return { ...base, totalRevenue, avgLeadValue, serviceDiversity };
};

/* ── Ranked transform (for horizontal bars / contribution analysis) ─────── */

export interface RankedDatum extends ChartDatum {
  /** Share of the total, 0–100. */
  share: number;
}

export const toRanked = (data: ChartDatum[], limit?: number): RankedDatum[] => {
  const safe = (Array.isArray(data) ? data : []).filter((d) => d.value > 0);
  const total = safe.reduce((s, d) => s + d.value, 0);
  const ranked = safe
    .map((d) => ({ ...d, share: total > 0 ? round1((d.value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
};

/* ── Category → Sub-category hierarchy (sunburst) ──────────────────────── */

export interface SunburstNode {
  name: string;
  value?: number;
  itemStyle?: { color: string };
  children?: SunburstNode[];
}

/**
 * Build a 2-level sunburst (Category → Sub-category) from the subcategory
 * analytics payload (array of categories, each with `subCategories[].leads[]`).
 */
export const buildCategorySunburst = (raw: any[]): SunburstNode[] => {
  const cats = Array.isArray(raw) ? raw : [];
  const palette = buildPalette(cats.length);

  return cats
    .map((cat, i): SunburstNode => {
      const color = cat.color || palette[i];
      const children = (cat.subCategories || [])
        .map((sc: any) => ({
          name: sc.name,
          value: Array.isArray(sc.leads) ? sc.leads.length : sc.value || 0,
        }))
        .filter((c: SunburstNode) => (c.value || 0) > 0);

      const catTotal = children.reduce((s: number, c: SunburstNode) => s + (c.value || 0), 0);

      return {
        name: cat.name,
        itemStyle: { color },
        ...(children.length ? { children } : { value: catTotal }),
      };
    })
    .filter((node) => (node.children?.length || 0) > 0 || (node.value || 0) > 0);
};

/* ── Pipeline Performance: status distribution model (PHASE 4 redesign) ──── */

export type StatusGroup = "active" | "won" | "lost";

interface StatusMeta {
  /** bootstrap-icons class. */
  icon: string;
  /** Lifecycle bucket used for the Active / Won / Lost roll-up. */
  group: StatusGroup;
}

/** Presentation metadata for the well-known lead statuses. */
const STATUS_META: Record<string, StatusMeta> = {
  pending: { icon: "bi-hourglass-split", group: "active" },
  hold: { icon: "bi-pause-circle", group: "active" },
  received: { icon: "bi-check2-circle", group: "won" },
  notreceived: { icon: "bi-x-circle", group: "lost" },
};

const STATUS_GROUP_META: Record<StatusGroup, { label: string; color: string; icon: string }> = {
  active: { label: "Active Pipeline", color: "#F59E0B", icon: "bi-hourglass-split" },
  won: { label: "Converted", color: "#22C55E", icon: "bi-check2-circle" },
  lost: { label: "Lost", color: "#EF4444", icon: "bi-x-circle" },
};

export const groupMeta = (group: StatusGroup) => STATUS_GROUP_META[group];

export interface StatusDistributionRow extends ChartDatum {
  /** Normalised status key (letters only). */
  key: string;
  /** Share of all leads, 0–100. */
  pct: number;
  /** Resolved brand / backend / fallback colour. */
  color: string;
  /** bootstrap-icons class. */
  icon: string;
  /** Lifecycle bucket. */
  group: StatusGroup;
}

/**
 * Turn raw status data into ordered, presentation-ready distribution rows
 * (lifecycle order, share %, colour, icon, group). This is the data model
 * behind the horizontal progress pipeline that replaces the old funnel.
 */
export const buildStatusDistribution = (
  data: ChartDatum[]
): StatusDistributionRow[] => {
  const ordered = orderStatusForFunnel(data);
  const total = ordered.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return ordered.map((d) => {
    const key = normalizeStatusKey(d.label);
    const meta = STATUS_META[key];
    const value = Number(d.value) || 0;
    return {
      ...d,
      value,
      key,
      pct: total > 0 ? round1((value / total) * 100) : 0,
      color: resolveStatusColor(d.label, d.color),
      icon: meta?.icon || "bi-circle",
      group: meta?.group || "active",
    };
  });
};

export interface PipelineGroupSummary {
  active: number;
  activePct: number;
  won: number;
  wonPct: number;
  lost: number;
  lostPct: number;
  total: number;
}

/** Roll the status rows up into the three executive buckets. */
export const summarizeStatusGroups = (
  rows: StatusDistributionRow[]
): PipelineGroupSummary => {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const sumOf = (g: StatusGroup) =>
    rows.filter((r) => r.group === g).reduce((s, r) => s + r.value, 0);
  const active = sumOf("active");
  const won = sumOf("won");
  const lost = sumOf("lost");
  const pct = (n: number) => (total > 0 ? round1((n / total) * 100) : 0);
  return {
    active,
    activePct: pct(active),
    won,
    wonPct: pct(won),
    lost,
    lostPct: pct(lost),
    total,
  };
};

/* ── Pipeline health score ─────────────────────────────────────────────── */

export type InsightTone = "positive" | "warning" | "critical" | "neutral";

const TONE_COLORS: Record<InsightTone, string> = {
  positive: "#22C55E",
  warning: "#F59E0B",
  critical: "#EF4444",
  neutral: "#64748B",
};

export const toneColor = (tone: InsightTone): string => TONE_COLORS[tone];

export interface PipelineHealth {
  /** Composite 0–100 index. */
  score: number;
  /** Human grade: Excellent / Healthy / Fair / At Risk / No Data. */
  label: string;
  tone: InsightTone;
  color: string;
}

/**
 * A single 0–100 pipeline-health index blending three signals around a neutral
 * baseline of 50:
 *   • conversion (received share) rewards won business        (weight 0.5)
 *   • loss drag  (not-received share) penalises lost leads    (weight 0.3)
 *   • stagnation (hold share) penalises stuck leads           (weight 0.2)
 * Pending is healthy in-flight, so it neither rewards nor penalises.
 */
export const computePipelineHealth = (kpis: LeadStatusKpis): PipelineHealth => {
  if (kpis.total === 0) {
    return { score: 0, label: "No Data", tone: "neutral", color: TONE_COLORS.neutral };
  }
  const raw =
    50 + kpis.conversionRate * 0.5 - kpis.lostRate * 0.3 - kpis.holdRate * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let label: string;
  let tone: InsightTone;
  if (score >= 80) {
    label = "Excellent";
    tone = "positive";
  } else if (score >= 60) {
    label = "Healthy";
    tone = "positive";
  } else if (score >= 40) {
    label = "Fair";
    tone = "warning";
  } else {
    label = "At Risk";
    tone = "critical";
  }
  return { score, label, tone, color: TONE_COLORS[tone] };
};

/* ── Smart insights (tone-aware, dynamic) ──────────────────────────────── */

export interface PipelineInsight {
  tone: InsightTone;
  text: string;
  /** bootstrap-icons class. */
  icon: string;
}

const TONE_ICONS: Record<InsightTone, string> = {
  positive: "bi-check-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  critical: "bi-exclamation-octagon-fill",
  neutral: "bi-info-circle-fill",
};

/**
 * Generate prioritised, tone-tagged insights for the Pipeline Performance
 * section. Returns up to `limit` of the most decision-relevant observations.
 */
export const generatePipelineInsights = (
  kpis: LeadStatusKpis,
  rows: StatusDistributionRow[],
  health: PipelineHealth,
  limit = 4
): PipelineInsight[] => {
  if (kpis.total === 0) return [];

  const push = (tone: InsightTone, text: string): PipelineInsight => ({
    tone,
    text,
    icon: TONE_ICONS[tone],
  });

  // Priority-ordered candidate pool; we slice the top `limit`.
  const pool: PipelineInsight[] = [];

  // 1) Health headline.
  pool.push(
    push(
      health.tone,
      `Overall, your leads are doing ${health.label.toLowerCase()} — a score of ${health.score} out of 100.`
    )
  );

  // 2) Conversion (leads that turned into work).
  if (kpis.conversionRate >= 25) {
    pool.push(push("positive", `Good news — ${kpis.conversionRate}% of your leads turned into work.`));
  } else if (kpis.conversionRate > 0) {
    pool.push(push("neutral", `So far, ${kpis.conversionRate}% of your leads turned into work.`));
  } else {
    pool.push(push("warning", "None of your leads have turned into work yet."));
  }

  // 3) Lost leads.
  if (kpis.notReceived > 0) {
    if (kpis.lostRate >= 30) {
      pool.push(push("critical", `${kpis.lostRate}% of leads were lost — worth finding out why.`));
    } else if (kpis.lostRate <= 10) {
      pool.push(push("positive", `Only ${kpis.lostRate}% of leads were lost — that's well under control.`));
    } else {
      pool.push(push("warning", `${kpis.lostRate}% of leads were lost.`));
    }
  }

  // 4) Still-in-progress pressure.
  if (kpis.pipelinePct >= 60) {
    pool.push(push("warning", `${kpis.pipelinePct}% of your leads are still in progress — keep following up.`));
  }

  // 5) Dominant status.
  const top = [...rows].sort((a, b) => b.value - a.value)[0];
  if (top && top.value > 0 && top.pct >= 40) {
    const dominanceTone: InsightTone = top.group === "lost" ? "critical" : "warning";
    pool.push(push(dominanceTone, `Most of your leads (${top.pct}%) are in "${top.label}".`));
  }

  // 6) Hold follow-up.
  if (kpis.hold > 0) {
    pool.push(push("warning", `${kpis.hold} lead${kpis.hold === 1 ? "" : "s"} on hold — time for a follow-up.`));
  }

  // De-duplicate by text, keep priority order, cap at `limit`.
  const seen = new Set<string>();
  return pool.filter((i) => !seen.has(i.text) && seen.add(i.text)).slice(0, limit);
};

export const generateServiceInsights = (data: ChartDatum[]): string[] => {
  const safe = (Array.isArray(data) ? data : []).filter((d) => d.value > 0);
  if (safe.length === 0) return [];

  const total = safe.reduce((sum, d) => sum + d.value, 0);
  const sorted = [...safe].sort((a, b) => b.value - a.value);
  const insights: string[] = [];

  const top = sorted[0];
  const topPct = total > 0 ? round1((top.value / total) * 100) : 0;
  insights.push(
    `${top.label} contributes ${topPct}% of total business opportunities.`
  );

  if (sorted[1]) {
    insights.push(`${sorted[1].label} is the second most requested service.`);
  }

  if (sorted.length > 2) {
    insights.push(`${sorted.length} active services are currently generating leads.`);
  }

  return insights;
};
