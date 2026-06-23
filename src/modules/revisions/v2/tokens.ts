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
  ROLLBACK: { label: 'Rollback', icon: 'bi bi-arrow-counterclockwise', accent: 'purple' },
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
