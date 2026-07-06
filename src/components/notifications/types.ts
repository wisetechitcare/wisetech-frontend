/**
 * Shared notification domain types.
 *
 * These mirror the backend Prisma `Notification` row
 * (`{ id, title?, message, path?, status?, isRead, createdAt, employeeId }`)
 * and add a small set of client-only fields (pin/dismiss) plus derived,
 * presentation-level concepts (priority, module) that the backend does not
 * store but which the UI derives from `status` / `path`.
 */

/** Seven visual priority tiers, ordered from most to least urgent. */
export type NotificationPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'success'
  | 'warning';

/** The raw shape emitted by the backend socket + REST endpoints. */
export interface RawNotification {
  id: string;
  title?: string | null;
  message: string;
  path?: string | null;
  /** Backend "type" key, e.g. `attendance_late_confirmed`. */
  status?: string | null;
  isRead: boolean;
  createdAt: string;
  employeeId?: string;
}

/** Normalised notification used throughout the notification center. */
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  path: string | null;
  status: string | null;
  isRead: boolean;
  createdAt: string;
  /** Derived from `status` (falls back to `medium`). */
  priority: NotificationPriority;
  /** Derived module descriptor (name + icon) from `status` / `path`. */
  moduleKey: string;
  moduleLabel: string;
  /** Client-only: user-pinned notifications float to the top and persist. */
  pinned: boolean;
}

/** Read-state filter for the panel. */
export type ReadFilter = 'all' | 'unread' | 'read';

/** Panel view filters (local to the panel, not persisted server-side). */
export interface NotificationFilterState {
  search: string;
  readFilter: ReadFilter;
  moduleKey: string | null;
}

/** Static descriptor for a priority tier. */
export interface PriorityMeta {
  key: NotificationPriority;
  label: string;
  /** Solid accent colour (used for dots, left accent border, chips). */
  color: string;
  /** Soft translucent background for chips / card tint. */
  soft: string;
  /** KTIcon (keenicon) name for the priority glyph. */
  icon: string;
  /** Rank for sorting — lower is more urgent. */
  rank: number;
}

/** Static descriptor for a business module a notification can belong to. */
export interface ModuleMeta {
  key: string;
  label: string;
  /** Emoji glyph reused from the existing notification visual language. */
  glyph: string;
}
