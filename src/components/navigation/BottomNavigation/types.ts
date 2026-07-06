/**
 * Types for the mobile Bottom Navigation system.
 *
 * The navigation is fully configuration-driven (see `navConfig.tsx`). Adding,
 * reordering or gating a destination is a data change, never a component change.
 */

/** A single navigation destination. */
export interface BottomNavItemConfig {
  /** Stable identifier — also used as the analytics id and badge key. */
  id: string
  /** Human-readable label (kept short for the tab bar). */
  label: string
  /** Default (inactive) icon — an SVG url consumed by react-inlinesvg. */
  icon: string
  /** Optional active-state icon. Falls back to `icon` when absent. */
  activeIcon?: string
  /** The route this item navigates to. */
  to: string
  /**
   * Route prefixes that should mark this item active, including the primary
   * `to`. The most specific (longest) matching prefix across all items wins, so
   * `/tasks/timesheet` can beat `/tasks` deterministically.
   */
  match: string[]
  /**
   * Lower number = higher priority. The visible primary tabs are the
   * highest-priority items that pass `isVisible()`; the rest overflow into More.
   */
  order: number
  /**
   * Permission / feature-flag gate. Evaluated against the live Redux store, so
   * it reuses the exact same guards as the sidebar (can / hasPermission /
   * isSectionBlocked). Return false to hide the item entirely.
   */
  isVisible: () => boolean
  /**
   * Optional badge source key. The provider maps this key to a live count
   * (e.g. pending approvals). Zero / undefined hides the badge.
   */
  badgeKey?: string
}

/** Live badge counts keyed by `badgeKey`. */
export type BadgeMap = Record<string, number>

/** Result of the navigation computation for the current route + permissions. */
export interface ComputedNavigation {
  /** Up to 4 primary items rendered directly in the bar. */
  primary: BottomNavItemConfig[]
  /** Items that did not fit — surfaced through the More sheet. */
  overflow: BottomNavItemConfig[]
  /** Id of the currently active item, or null if none match. */
  activeId: string | null
  /** True when the active route lives inside the overflow (More) set. */
  isMoreActive: boolean
}
