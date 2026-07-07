import { C, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';

/**
 * Audit-specific semantic tokens — all derived from the existing ConfigDesignSystem
 * palette (no new color language, per Phase 13.5). Category → icon/accent, change
 * type → icon/color, and diff add/remove/modify colors.
 */

export interface CategoryMeta {
  label: string;
  icon: string;
  accent: keyof typeof ICON_COLORS;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  STATUS: { label: 'Status', icon: 'bi bi-flag-fill', accent: 'blue' },
  FINANCIAL: { label: 'Financial', icon: 'bi bi-currency-rupee', accent: 'green' },
  TEAM: { label: 'Team', icon: 'bi bi-people-fill', accent: 'purple' },
  LOCATION: { label: 'Location', icon: 'bi bi-geo-alt-fill', accent: 'danger' },
  DATES: { label: 'Dates', icon: 'bi bi-calendar-event', accent: 'amber' },
  CONTACT: { label: 'Contact', icon: 'bi bi-person-vcard', accent: 'teal' },
  COMMERCIAL: { label: 'Commercial', icon: 'bi bi-receipt', accent: 'blue' },
  BASIC_INFO: { label: 'Basic Info', icon: 'bi bi-info-circle-fill', accent: 'primary' },
  MULTIPLE: { label: 'Multiple', icon: 'bi bi-collection', accent: 'primary' },
};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.BASIC_INFO;
}

export interface ChangeTypeMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

const CHANGE_TYPE_META: Record<string, ChangeTypeMeta> = {
  ADDED: { label: 'Added', icon: 'bi bi-plus-circle-fill', color: '#16a34a', bg: C.successLight },
  REMOVED: { label: 'Removed', icon: 'bi bi-dash-circle-fill', color: C.danger, bg: C.dangerLight },
  MODIFIED: { label: 'Modified', icon: 'bi bi-pencil-fill', color: C.amber, bg: C.amberLight },
};

export function changeTypeMeta(changeType: string): ChangeTypeMeta {
  return CHANGE_TYPE_META[changeType] ?? CHANGE_TYPE_META.MODIFIED;
}

/** Diff value colors (a11y: always paired with an icon/label, never color-only). */
export const DIFF = {
  removed: C.danger,
  removedBg: '#fff5f8',
  added: '#16a34a',
  addedBg: C.successLight,
  modified: C.amber,
  muted: C.textMuted,
};

export const IMPACT_COLOR: Record<string, string> = {
  CRITICAL: C.danger,
  MAJOR: C.amber,
  MINOR: C.textMuted,
};

/** Initials for an avatar from a name. */
export function initials(first?: string | null, last?: string | null): string {
  const a = (first ?? '').trim();
  const b = (last ?? '').trim();
  const i = (a[0] ?? '') + (b[0] ?? '');
  return (i || '?').toUpperCase();
}

export function displayActor(first?: string | null, last?: string | null): string {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name || 'System';
}

/* ─── Value hygiene ──────────────────────────────────────────────────────────
 * Audit values are formatted at capture time and persisted. Older rows can carry
 * a raw machine identifier (uuid / cuid / long hex) where a human label failed to
 * resolve — e.g. a Status change reading "(empty) → d0ca15dc-…". These helpers
 * make sure a raw id is NEVER shown to a user: we detect id-shaped strings and
 * replace them with a clean, honest placeholder, and we rebuild any summary that
 * leaked an id from the change set's own field labels.
 * ---------------------------------------------------------------------------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{20,}$/i;
const LONGHEX_RE = /^[0-9a-f]{24,}$/i;

/** True when a value looks like a machine identifier rather than human content. */
export function isIdLike(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (s.length < 16) return false;
  return UUID_RE.test(s) || CUID_RE.test(s) || LONGHEX_RE.test(s);
}

export interface ResolvedValue {
  /** Display text, guaranteed free of raw identifiers. */
  text: string;
  /** True when the text is a neutral placeholder (empty / unresolved reference). */
  placeholder: boolean;
}

/**
 * Turn a (rawValue, formattedValue) pair into safe display text.
 * Priority: a clean formatted label → the raw scalar → a neutral placeholder.
 */
export function resolveValue(value: unknown, formatted?: string | null): ResolvedValue {
  const f = (formatted ?? '').trim();
  if (f && f !== '(empty)' && !isIdLike(f)) return { text: f, placeholder: false };
  if (value === null || value === undefined || value === '') {
    return { text: 'Empty', placeholder: true };
  }
  if (typeof value === 'object') {
    return {
      text: Array.isArray(value) ? `${value.length} item(s)` : 'Details',
      placeholder: true,
    };
  }
  if (isIdLike(value) || isIdLike(f)) return { text: 'Reference', placeholder: true };
  return { text: String(value), placeholder: false };
}

/**
 * A clean, human one-line summary for a change set. Trusts the backend summary
 * unless it leaked an identifier, in which case it is rebuilt from the change
 * field labels / dominant category — so the timeline never shows "(empty) → uuid".
 */
export function humanizeSummary(cs: {
  summary?: string | null;
  category?: string | null;
  changes?: Array<{ fieldLabel?: string | null }> | null;
}): string {
  const s = (cs.summary ?? '').trim();

  // Normalize backend's raw-enum summary, e.g. "BASIC_INFO Information Modified".
  const enumMatch = s.match(/^([A-Z][A-Z_]+)\s+Information\s+Modified$/i);
  if (enumMatch) return `${categoryMeta(enumMatch[1].toUpperCase()).label} information updated`;

  const leaked = !s || isIdLike(s) || s.split(/\s+/).some(isIdLike);
  if (!leaked) return s;

  const changes = cs.changes ?? [];
  const labels = changes.map((c) => (c?.fieldLabel ?? '').trim()).filter(Boolean);
  if (labels.length === 1) return `${labels[0]} updated`;
  const cat = categoryMeta(cs.category ?? '').label;
  if (labels.length > 1) return `${cat} information updated`;
  return `${cat} updated`;
}

export type ActorKind = 'user' | 'system';

/** Distinguish automated/system actors from real people for visual treatment. */
export function actorKind(opts: {
  first?: string | null;
  last?: string | null;
  changeSource?: string | null;
  summary?: string | null;
}): ActorKind {
  const name = displayActor(opts.first, opts.last).toLowerCase();
  const src = (opts.changeSource ?? '').toUpperCase();
  if (!name || name === 'system' || name.includes('system') || name.includes('backfill')) {
    return 'system';
  }
  if (src === 'SYSTEM' || src === 'WEBHOOK') return 'system';
  return 'user';
}

/** True when a change set is an automated pre-audit baseline / backfill marker. */
export function isBaselineEntry(cs: {
  summary?: string | null;
  changedByFirstName?: string | null;
  changedByLastName?: string | null;
}): boolean {
  const s = (cs.summary ?? '').toLowerCase();
  if (s.includes('baseline') || s.includes('backfill') || s.includes('pre-audit')) return true;
  const actor = displayActor(cs.changedByFirstName, cs.changedByLastName).toLowerCase();
  return actor.includes('backfill');
}
