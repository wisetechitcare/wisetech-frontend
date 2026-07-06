/**
 * Pure helpers for the Bottom Navigation — active-route resolution and the
 * primary/overflow split. Kept side-effect free so they are trivially testable
 * and cheap to memoize.
 */
import type { BottomNavItemConfig, ComputedNavigation } from './types'
import { MAX_PRIMARY_TABS } from './navConfig'

/** Normalize a pathname: strip trailing slash (except root) and query/hash. */
function normalizePath(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0]
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1)
  return clean
}

/** True when `pathname` is `prefix` or a nested route beneath it. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  const p = normalizePath(prefix)
  return pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`)
}

/**
 * Resolve the active item for a pathname across ALL visible items (primary and
 * overflow). Uses longest-matching-prefix so nested and sibling routes resolve
 * to the correct owner (e.g. `/tasks/timesheet` → Timesheet, not Tasks).
 */
export function resolveActiveId(
  pathname: string,
  items: BottomNavItemConfig[]
): string | null {
  const current = normalizePath(pathname)
  let bestId: string | null = null
  let bestLen = -1

  for (const item of items) {
    for (const prefix of item.match) {
      if (matchesPrefix(current, prefix) && prefix.length > bestLen) {
        bestLen = prefix.length
        bestId = item.id
      }
    }
  }
  return bestId
}

/**
 * Filter by visibility, split into primary (top `MAX_PRIMARY_TABS` by order)
 * and overflow, and compute the active state for the current route.
 */
export function computeNavigation(
  pathname: string,
  allItems: BottomNavItemConfig[]
): ComputedNavigation {
  const visible = allItems
    .filter((item) => {
      try {
        return item.isVisible()
      } catch {
        // A failing guard (e.g. store not ready) hides the item rather than
        // crashing the whole bar.
        return false
      }
    })
    .sort((a, b) => a.order - b.order)

  const primary = visible.slice(0, MAX_PRIMARY_TABS)
  const overflow = visible.slice(MAX_PRIMARY_TABS)

  const activeId = resolveActiveId(pathname, visible)
  const isMoreActive =
    activeId !== null && overflow.some((item) => item.id === activeId)

  return { primary, overflow, activeId, isMoreActive }
}

/** Sum the badge counts for a set of items given the live badge map. */
export function sumBadges(
  items: BottomNavItemConfig[],
  badges: Record<string, number>
): number {
  return items.reduce((total, item) => {
    if (!item.badgeKey) return total
    return total + (badges[item.badgeKey] ?? 0)
  }, 0)
}
