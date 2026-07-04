import type {
  NotificationPriority,
  PriorityMeta,
  ModuleMeta,
} from './types';

/**
 * Priority visual system.
 *
 * Colours are picked from the app's semantic palette (matching
 * `utils/notificationStyles.ts`) and are theme-agnostic hexes that read
 * correctly on both light and dark card surfaces. `soft` values are the
 * translucent tints used behind chips and the card accent.
 */
export const PRIORITY_META: Record<NotificationPriority, PriorityMeta> = {
  critical: { key: 'critical', label: 'Critical', color: '#DC2626', soft: 'rgba(220,38,38,0.12)',  icon: 'shield-cross',    rank: 0 },
  high:     { key: 'high',     label: 'High',     color: '#EF4444', soft: 'rgba(239,68,68,0.12)',  icon: 'arrow-up',        rank: 1 },
  warning:  { key: 'warning',  label: 'Warning',  color: '#F97316', soft: 'rgba(249,115,22,0.12)', icon: 'information-4',   rank: 2 },
  medium:   { key: 'medium',   label: 'Medium',   color: '#F59E0B', soft: 'rgba(245,158,11,0.12)', icon: 'abstract-26',     rank: 3 },
  info:     { key: 'info',     label: 'Info',     color: '#3B82F6', soft: 'rgba(59,130,246,0.12)', icon: 'information-5',    rank: 4 },
  success:  { key: 'success',  label: 'Success',  color: '#10B981', soft: 'rgba(16,185,129,0.12)', icon: 'check-circle',    rank: 5 },
  low:      { key: 'low',      label: 'Low',      color: '#6B7280', soft: 'rgba(107,114,128,0.12)',icon: 'time',            rank: 6 },
};

/** Priority order for the filter chip row + sorting. */
export const PRIORITY_ORDER: NotificationPriority[] = [
  'critical', 'high', 'warning', 'medium', 'info', 'success', 'low',
];

/**
 * Maps a backend `status` (attendance type key) to a visual priority.
 * Unknown / null statuses fall back to `medium`.
 */
export const STATUS_PRIORITY: Record<string, NotificationPriority> = {
  attendance_salary_deduction:  'critical',
  attendance_checkin_anomaly:   'critical',
  attendance_missing_checkin:   'high',
  attendance_late_confirmed:    'high',
  attendance_missing_checkout:  'high',
  approval_pending:             'high',
  attendance_late_warning:      'warning',
  attendance_checkin_reminder:  'info',
  attendance_checkout_reminder: 'info',
  attendance_early_checkin:     'success',
};

/**
 * Only these notifications are important enough to surface in the floating
 * snackbar / center. Everything else stays in the header notification bell.
 * Match is by `status` key, by module, or by critical priority (see isImportant).
 */
export const IMPORTANT_STATUSES = new Set<string>([
  'attendance_salary_deduction', // salary deducted
  'attendance_missing_checkout', // no checkout recorded
  'attendance_missing_checkin',  // no check-in recorded
  'attendance_checkin_anomaly',  // check-in after cutoff → likely checkout-as-checkin
  'approval_pending',            // an approval awaits action
]);

/** Modules whose notifications are always treated as important. */
export const IMPORTANT_MODULES = new Set<string>(['approvals']);

export const DEFAULT_PRIORITY: NotificationPriority = 'medium';

/**
 * Business-module taxonomy (mirrors the app's section keys). A notification's
 * module is derived first from its `status` prefix, then from its deep-link
 * `path`. Glyphs reuse the emoji visual language already used by the bell.
 */
export const MODULE_META: Record<string, ModuleMeta> = {
  attendance: { key: 'attendance', label: 'Attendance & Leaves', glyph: '🕑' },
  approvals:  { key: 'approvals',  label: 'Approvals',           glyph: '✅' },
  tasks:      { key: 'tasks',      label: 'Tasks',               glyph: '🗂️' },
  timesheets: { key: 'timesheets', label: 'TimeSheet',           glyph: '⏱️' },
  finance:    { key: 'finance',    label: 'Finance',             glyph: '💰' },
  crm:        { key: 'crm',        label: 'Projects & CRM',      glyph: '📈' },
  projects:   { key: 'projects',   label: 'Projects',            glyph: '📁' },
  people:     { key: 'people',     label: 'People',              glyph: '👥' },
  reports:    { key: 'reports',    label: 'Reports',             glyph: '📊' },
  settings:   { key: 'settings',   label: 'Organization',        glyph: '⚙️' },
  calendar:   { key: 'calendar',   label: 'Calendar',            glyph: '📅' },
  general:    { key: 'general',    label: 'General',             glyph: '🔔' },
};

export const DEFAULT_MODULE_KEY = 'general';

/**
 * Ordered rules matching a deep-link `path` fragment to a module key.
 * First match wins.
 */
export const PATH_MODULE_RULES: Array<[RegExp, string]> = [
  [/attendance|leave/i,            'attendance'],
  [/approval|my-team/i,            'approvals'],
  [/timesheet/i,                   'timesheets'],
  [/task/i,                        'tasks'],
  [/finance|loan|reimburs|salary|increment/i, 'finance'],
  [/lead|compan|contact/i,         'crm'],
  [/project/i,                     'projects'],
  [/employee|people|document|user/i, 'people'],
  [/report|kpi/i,                  'reports'],
  [/calendar/i,                    'calendar'],
  [/company|organi[sz]ation|announcement|setting|team/i, 'settings'],
];

/** Brand accent (matches the bottom-nav center button gradient). */
export const BRAND = {
  color:    '#9D4141',
  gradient: 'linear-gradient(135deg, #b94a4a 0%, #8c3232 100%)',
} as const;

/** localStorage key for client-only pinned notification ids. */
export const PINNED_STORAGE_KEY = 'wt_notification_pins';

/** Auto-hide delay (ms) for the collapsed snackbar after a new push. */
export const SNACKBAR_AUTOHIDE_MS = 7000;
