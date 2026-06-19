import dayjs from 'dayjs';
import { formatCompactCurrency } from '../entityUtils';

/**
 * Pure derivations for the 360° detail page. No React here — sections consume
 * these so the smart features (health, missing-info, related counts) stay
 * testable and single-sourced.
 */

export const DASH = '—';

export const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('DD MMM YYYY') : DASH);
export const fmtDateTime = (v?: string | Date | null) => (v ? dayjs(v).format('DD MMM YYYY, h:mm A') : DASH);

export const fmtMoney = (v?: any): string => {
  const n = parseFloat(v);
  return isFinite(n) && n !== 0 ? `₹${n.toLocaleString('en-IN')}` : DASH;
};
export const compactMoney = (v?: any): string => {
  const n = parseFloat(v);
  return isFinite(n) && n !== 0 ? formatCompactCurrency(n) : DASH;
};

export const employeeUserName = (rel?: any): string | null => {
  const u = rel?.users;
  if (!u) return null;
  const n = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return n || null;
};

export const employeeNameById = (list: any[], id?: string | null): string | null => {
  if (!id) return null;
  return (Array.isArray(list) ? list.find((e: any) => e.employeeId === id)?.employeeName : null) || null;
};

/**
 * Project Manager name — mirrors the edit form's fallback. The form's "Project
 * Manager" field is `project.projectManagerId || project.assignedToId`, and on
 * save it writes BOTH columns to the same value. So a project may carry the
 * manager only on assignedToId; we resolve the same chain so the detail page
 * matches what the form shows instead of rendering "—".
 */
export const projectManagerName = (project: any, list: any[]): string | null =>
  employeeUserName(project?.projectManager) ||
  employeeNameById(list, project?.projectManagerId) ||
  employeeUserName(project?.assignedTo) ||
  employeeNameById(list, project?.assignedToId) ||
  null;

// ── Commercial roll-up (lead.commercials OR project.projectCommercialMappings) ──

export interface CommercialTotals {
  totalArea: number;
  totalCost: number;
  lines: number;
}

export const sumLeadCommercials = (lead: any): CommercialTotals => {
  const rows: any[] = lead?.commercials || [];
  const totalArea = rows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
  return { totalArea, totalCost, lines: rows.length };
};

export const sumProjectCommercials = (project: any): CommercialTotals => {
  const rows: any[] = project?.projectCommercialMappings || [];
  const totalArea = rows.reduce((s, r) => s + (parseFloat(r.area) || 0), 0);
  const totalCost = rows.reduce(
    (s, r) => s + (parseFloat(r.totalCost) || parseFloat(r.rateCost) || parseFloat(r.lumpsumCost) || 0),
    0,
  );
  return { totalArea, totalCost, lines: rows.length };
};

// ── Health score ──────────────────────────────────────────────────────────────

export interface HealthFactor {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}
export interface HealthResult {
  score: number; // 0-100
  band: 'Strong' | 'Healthy' | 'At Risk' | 'Stalled';
  color: string;
  factors: HealthFactor[];
}

/**
 * Heuristic health — derived only from data we actually have (status, recency,
 * completeness, timeline). No stored/ML score. Honest and explainable.
 */
export const computeHealth = (lead: any, missingCount: number): HealthResult => {
  const factors: HealthFactor[] = [];
  let score = 55;

  const statusName: string = (lead?.status?.name || '').toLowerCase();
  const isTrigger = !!lead?.status?.isProjectTrigger || !!lead?.project;

  if (lead?.isCancelled || /cancel/.test(statusName)) {
    score -= 45;
    factors.push({ label: 'Cancelled', impact: 'negative', detail: 'Lead is cancelled' });
  } else if (isTrigger) {
    score += 25;
    factors.push({ label: 'Converted to project', impact: 'positive', detail: 'Reached a project-trigger status' });
  } else if (/not received|lost|reject/.test(statusName)) {
    score -= 25;
    factors.push({ label: 'Not received', impact: 'negative', detail: 'Marked not received' });
  } else if (/received|won|design|tender/.test(statusName)) {
    score += 12;
    factors.push({ label: 'Advancing', impact: 'positive', detail: `Status: ${lead?.status?.name}` });
  }

  // Activity recency
  const conns: any[] = lead?.connections || [];
  if (conns.length) {
    const last = conns
      .map(c => new Date(c.date || c.createdAt).getTime())
      .filter(t => isFinite(t))
      .sort((a, b) => b - a)[0];
    const days = last ? Math.round((Date.now() - last) / 86400000) : 999;
    if (days <= 14) {
      score += 12;
      factors.push({ label: 'Recent activity', impact: 'positive', detail: `Last touch ${days}d ago` });
    } else if (days > 45) {
      score -= 12;
      factors.push({ label: 'Going cold', impact: 'negative', detail: `No activity for ${days}d` });
    }
  } else {
    score -= 8;
    factors.push({ label: 'No logged activity', impact: 'negative', detail: 'No connections recorded' });
  }

  // Commercial signal
  const { totalCost } = sumLeadCommercials(lead);
  if (totalCost > 0) {
    score += 8;
    factors.push({ label: 'Commercials defined', impact: 'positive', detail: compactMoney(totalCost) });
  }

  // Completeness
  if (missingCount === 0) {
    score += 6;
    factors.push({ label: 'Complete record', impact: 'positive', detail: 'All key fields filled' });
  } else if (missingCount >= 6) {
    score -= 10;
    factors.push({ label: 'Sparse record', impact: 'negative', detail: `${missingCount} key fields empty` });
  }

  // Timeline slippage
  const end = lead?.project?.endDate || lead?.endDate;
  if (end && isTrigger && !lead?.isCancelled) {
    const overdue = new Date(end).getTime() < Date.now();
    const open = lead?.project?.isProjectOpen !== false;
    if (overdue && open) {
      score -= 15;
      factors.push({ label: 'Past expected closure', impact: 'negative', detail: `Due ${fmtDate(end)}` });
    }
  }

  score = Math.max(2, Math.min(100, Math.round(score)));
  const band: HealthResult['band'] =
    score >= 75 ? 'Strong' : score >= 55 ? 'Healthy' : score >= 35 ? 'At Risk' : 'Stalled';
  const color =
    band === 'Strong' ? '#16a34a' : band === 'Healthy' ? '#0d9488' : band === 'At Risk' ? '#f5a623' : '#f1416c';
  return { score, band, color, factors };
};

/** Lightweight conversion probability for leads not yet converted (0-100). */
export const conversionProbability = (lead: any, health: HealthResult): number | null => {
  if (lead?.status?.isProjectTrigger || lead?.project) return null; // already converted
  if (lead?.isCancelled) return 0;
  return Math.max(0, Math.min(100, Math.round(health.score * 0.85)));
};

// ── Missing-information detector ────────────────────────────────────────────────

export interface MissingItem {
  label: string;
  step: number; // wizard step index to deep-link the edit form
}

/** Important fields a healthy 360° record should carry. Step = wizard page. */
export const computeMissingInfo = (lead: any): MissingItem[] => {
  const has = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';
  const out: MissingItem[] = [];

  const team = lead?.leadTeams?.[0];
  if (!has(lead?.assignedToId)) out.push({ label: 'Lead owner', step: 0 });
  if (!has(lead?.statusId)) out.push({ label: 'Status', step: 0 });
  if (!(lead?.services?.length)) out.push({ label: 'Service', step: 0 });
  if (!(lead?.leadCategories?.length)) out.push({ label: 'Category', step: 0 });
  if (!has(team?.company?.companyName) && !has(lead?.company?.companyName))
    out.push({ label: 'Client company', step: 1 });
  if (!has(team?.contact?.fullName) && !has(lead?.contact?.fullName))
    out.push({ label: 'Contact person', step: 1 });
  if (!has(lead?.leadSourceType) && !has(lead?.leadDirectSourceId))
    out.push({ label: 'Lead source', step: 1 });
  if (!(lead?.commercials?.length)) out.push({ label: 'Commercials', step: 3 });
  if (!has(lead?.additionalDetails?.city) && !has(lead?.addresses?.length))
    out.push({ label: 'Address / location', step: 4 });
  if (!has(lead?.inquiryDate)) out.push({ label: 'Inquiry date', step: 0 });

  // Project-stage extras
  if (lead?.status?.isProjectTrigger) {
    const p = lead?.project;
    if (!has(p?.projectManagerId)) out.push({ label: 'Project manager', step: 6 });
    if (!has(p?.startDate)) out.push({ label: 'Start date', step: 6 });
    if (!has(p?.endDate)) out.push({ label: 'Expected closure', step: 6 });
  }
  return out;
};

// ── Related-records counts (right rail) ─────────────────────────────────────────

export interface RelatedCounts {
  activities: number;
  proposals: number;
  commercials: number;
  team: number;
  referrals: number;
  tasks: number;
  files: number | null; // DMS not in payload → null = "open tab"
}

export const relatedCounts = (lead: any): RelatedCounts => ({
  activities: lead?.connections?.length || 0,
  proposals: lead?.generatedProposals?.length || 0,
  commercials: lead?.commercials?.length || 0,
  team: lead?.leadTeams?.length || 0,
  referrals: lead?.referrals?.length || 0,
  tasks: lead?.project?._count?.tasks ?? 0,
  files: null,
});
