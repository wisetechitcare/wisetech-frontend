/**
 * Unified Entity (Lead-as-Master) helpers.
 *
 * One rule drives the whole unified experience:
 *   lead.status.isProjectTrigger === true  →  Project view enabled.
 *
 * `projectId` is kept as a fallback so legacy rows linked before the flag
 * existed (and rows mid-sync) still render their project data.
 */

export type EntityView = 'all' | 'leads' | 'projects' | 'ongoing' | 'completed' | 'onhold';

export const ENTITY_VIEWS: { key: EntityView; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'leads', label: 'Leads' },
  { key: 'projects', label: 'Projects' },
  { key: 'ongoing', label: 'On Going' },
  { key: 'completed', label: 'Completed' },
  { key: 'onhold', label: 'On Hold' },
];

/** Views in which project-specific columns/filters are relevant. */
export const isProjectView = (view: EntityView): boolean =>
  view === 'projects' || view === 'ongoing' || view === 'completed' || view === 'onhold';

/** Project View Enabled — the single source of truth for the unified UI. */
export const isProjectEntity = (lead: any): boolean =>
  lead?.isProject === true || // precomputed on transformed table rows
  lead?.status?.isProjectTrigger === true || !!lead?.projectId || !!lead?.project;

export type ProjectPhase = 'ongoing' | 'completed' | 'onhold' | 'none';

/**
 * Coarse project phase derived from the linked project's status name with
 * isProjectOpen as fallback. Used for view tabs and row styling only —
 * the authoritative status stays visible in the Project Status column.
 */
export const getProjectPhase = (lead: any): ProjectPhase => {
  // Transformed table rows carry the phase precomputed from the raw lead.
  if (lead?.entityPhase) return lead.entityPhase as ProjectPhase;
  if (!isProjectEntity(lead)) return 'none';
  // Lead-as-master: the live project status lives on the 1:1 execution extension.
  // Keep the legacy `project.status` / `projectStatus` reads as transitional
  // fallbacks, but execution wins — otherwise the phase is always stuck "ongoing".
  const name: string = (
    lead?.execution?.projectStatus?.name ||
    lead?.project?.status?.name ||
    lead?.projectStatus?.name ||
    ''
  ).toLowerCase();
  // "Partly Completed" is an in-progress state — test before the completed match.
  if (/(partly|partial)/.test(name)) return 'ongoing';
  if (/(complete|finish|closed|delivered|handover)/.test(name)) return 'completed';
  if (/(hold|paused|stalled|suspend)/.test(name)) return 'onhold';
  const open = lead?.execution?.isProjectOpen ?? lead?.project?.isProjectOpen;
  if (open === false) return 'completed';
  return 'ongoing';
};

export const matchesView = (lead: any, view: EntityView): boolean => {
  switch (view) {
    case 'all':
      return true;
    case 'leads':
      return !isProjectEntity(lead);
    case 'projects':
      return isProjectEntity(lead);
    case 'ongoing':
      return getProjectPhase(lead) === 'ongoing';
    case 'completed':
      return getProjectPhase(lead) === 'completed';
    case 'onhold':
      return getProjectPhase(lead) === 'onhold';
    default:
      return true;
  }
};

/** Indian-format compact currency (matches existing leads KPI bar). */
export const formatCompactCurrency = (amount: number): string => {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Timeline progress % between project start and end dates (time elapsed).
 * Returns null when dates are missing — callers must hide the widget then,
 * never render a fake 0%.
 */
export const getTimelineProgress = (startDate?: string | Date | null, endDate?: string | Date | null): number | null => {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  if (!isFinite(s) || !isFinite(e) || e <= s) return null;
  const now = Date.now();
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
};

/** True when the project end date is in the past but the phase is still ongoing. */
export const isDelayedProject = (lead: any): boolean => {
  if (getProjectPhase(lead) !== 'ongoing') return false;
  // Timeline dates live on the lead scalars now (project row is a fallback).
  const end = lead?.endDate || lead?.project?.endDate;
  return !!end && new Date(end).getTime() < Date.now();
};

export const PHASE_THEMES: Record<ProjectPhase, { bg: string; fg: string; label: string }> = {
  ongoing: { bg: '#FFFBEB', fg: '#92400E', label: 'On Going' },
  completed: { bg: '#EDFDF3', fg: '#0A5C2A', label: 'Completed' },
  onhold: { bg: '#F5F3FF', fg: '#4C1D95', label: 'On Hold' },
  none: { bg: '#F1F5F9', fg: '#475569', label: 'Lead' },
};
