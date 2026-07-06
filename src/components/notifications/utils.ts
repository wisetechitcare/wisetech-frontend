import type {
  AppNotification,
  NotificationFilterState,
  NotificationPriority,
  RawNotification,
} from './types';
import {
  DEFAULT_MODULE_KEY,
  DEFAULT_PRIORITY,
  IMPORTANT_MODULES,
  IMPORTANT_STATUSES,
  MODULE_META,
  PATH_MODULE_RULES,
  PINNED_STORAGE_KEY,
  PRIORITY_META,
  STATUS_PRIORITY,
} from './constants';

/** Resolve the visual priority for a raw notification. */
export function derivePriority(status?: string | null): NotificationPriority {
  if (status && STATUS_PRIORITY[status]) return STATUS_PRIORITY[status];
  return DEFAULT_PRIORITY;
}

/**
 * Whether a notification is "important" enough for the floating center.
 * Everything else is left to the header notification bell.
 */
export function isImportant(n: AppNotification): boolean {
  if (n.status && IMPORTANT_STATUSES.has(n.status)) return true;
  if (IMPORTANT_MODULES.has(n.moduleKey)) return true;
  if (n.priority === 'critical') return true;
  // Heuristic: a pending-approval message with no explicit status key.
  if (/pending\s+approval|approval\s+pending|awaiting\s+approval/i.test(n.message)) return true;
  return false;
}

/** Resolve a module key from `status` prefix, then `path`. */
export function deriveModuleKey(status?: string | null, path?: string | null): string {
  if (status) {
    const prefix = status.split('_')[0];
    if (prefix && MODULE_META[prefix]) return prefix;
    if (/^attendance/.test(status)) return 'attendance';
  }
  if (path) {
    for (const [re, key] of PATH_MODULE_RULES) {
      if (re.test(path)) return key;
    }
  }
  return DEFAULT_MODULE_KEY;
}

/** Strip a stray leading "?" some backend titles carry. */
function cleanTitle(title?: string | null): string {
  return (title ?? '').replace(/^\?\s*/, '').trim();
}

/** Normalise a raw backend notification into the UI model. */
export function normalize(raw: RawNotification, pinnedIds: Set<string>): AppNotification {
  const moduleKey = deriveModuleKey(raw.status, raw.path);
  const module = MODULE_META[moduleKey] ?? MODULE_META[DEFAULT_MODULE_KEY];
  const title = cleanTitle(raw.title) || module.label;
  return {
    id: raw.id,
    title,
    message: raw.message ?? '',
    path: raw.path ?? null,
    status: raw.status ?? null,
    isRead: Boolean(raw.isRead),
    createdAt: raw.createdAt,
    priority: derivePriority(raw.status),
    moduleKey,
    moduleLabel: module.label,
    pinned: pinnedIds.has(raw.id),
  };
}

/** Coerce whatever the list endpoint returns into a raw array. */
export function extractRawList(payload: unknown): RawNotification[] {
  if (Array.isArray(payload)) return payload as RawNotification[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as RawNotification[];
    if (Array.isArray(obj.notifications)) return obj.notifications as RawNotification[];
  }
  return [];
}

/** Sort: pinned first, then unread, then priority rank, then most recent. */
export function sortNotifications(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    const pr = PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank;
    if (pr !== 0) return pr;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Apply the panel filter state to the notification list. */
export function applyFilters(
  list: AppNotification[],
  f: NotificationFilterState,
): AppNotification[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((n) => {
    if (f.readFilter === 'unread' && n.isRead) return false;
    if (f.readFilter === 'read' && !n.isRead) return false;
    if (f.moduleKey && n.moduleKey !== f.moduleKey) return false;
    if (q) {
      const hay = `${n.title} ${n.message} ${n.moduleLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Date-group row model (for the virtualized list) ──────────────────────────

export type ListRow =
  | { kind: 'header'; id: string; label: string; count: number }
  | { kind: 'item'; id: string; notification: AppNotification };

const DAY = 86_400_000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupLabel(createdAt: string): string {
  const today = startOfDay(Date.now());
  const day = startOfDay(new Date(createdAt).getTime());
  const diff = Math.round((today - day) / DAY);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  if (diff < 30) return 'This month';
  return 'Earlier';
}

/**
 * Flatten a sorted list into header + item rows grouped by recency.
 * Pinned notifications are collected under a leading "Pinned" group.
 */
export function buildRows(list: AppNotification[]): ListRow[] {
  const rows: ListRow[] = [];
  const pinned = list.filter((n) => n.pinned);
  const rest = list.filter((n) => !n.pinned);

  if (pinned.length) {
    rows.push({ kind: 'header', id: 'grp-pinned', label: 'Pinned', count: pinned.length });
    pinned.forEach((n) => rows.push({ kind: 'item', id: n.id, notification: n }));
  }

  let currentLabel = '';
  let headerIndex = -1;
  rest.forEach((n) => {
    const label = groupLabel(n.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      rows.push({ kind: 'header', id: `grp-${label}`, label, count: 0 });
      headerIndex = rows.length - 1;
    }
    const header = rows[headerIndex];
    if (header && header.kind === 'header') header.count += 1;
    rows.push({ kind: 'item', id: n.id, notification: n });
  });

  return rows;
}

// ── Pin persistence (client-only) ────────────────────────────────────────────

export function loadPinnedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function savePinnedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — pins simply won't persist */
  }
}

// ── Dev preview seed ─────────────────────────────────────────────────────────

/** localStorage flag that enables the dev-only demo dataset. */
export const DEMO_FLAG_KEY = 'wt_noti_demo';

export function isDemoEnabled(): boolean {
  try {
    return localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Sample notifications for previewing the UI without a live backend push.
 * Only used when `localStorage.wt_noti_demo === '1'` in a dev build.
 */
export function makeDemoNotifications(): RawNotification[] {
  const now = Date.now();
  const min = 60_000;
  const mk = (
    id: string,
    status: string,
    title: string,
    message: string,
    path: string,
    ageMs: number,
  ): RawNotification => ({
    id: `demo-${id}`,
    title,
    message,
    path,
    status,
    isRead: false,
    createdAt: new Date(now - ageMs).toISOString(),
    employeeId: 'demo',
  });

  return [
    mk('1', 'attendance_salary_deduction', 'Salary deduction applied',
      'A deduction was applied for repeated late check-ins this week. Review your attendance record.',
      '/employee/attendance-and-leaves', 2 * min),
    mk('2', 'attendance_late_confirmed', 'Late check-in confirmed',
      'Your check-in at 03:31 PM was recorded as late against the 09:00 AM policy.',
      '/employee/attendance-and-leaves', 18 * min),
    mk('3', 'attendance_missing_checkout', 'Missing checkout yesterday',
      'You did not check out yesterday. Please submit a correction request.',
      '/employee/attendance-and-leaves', 26 * 60 * min),
    mk('4', 'attendance_checkin_reminder', 'Reimbursement approved',
      'Your travel expense claim of $240.00 has been approved by your manager.',
      '/finance/reimbursements', 3 * 60 * min),
    mk('5', 'attendance_early_checkin', 'Early check-in recorded',
      'Great start! You checked in early today at 08:42 AM.',
      '/employee/attendance-and-leaves', 5 * 60 * min),
    mk('6', 'attendance_checkout_reminder', 'Timesheet due tomorrow',
      'Submit your weekly timesheet before end of day tomorrow.',
      '/tasks/timesheet', 8 * 60 * min),
  ];
}
