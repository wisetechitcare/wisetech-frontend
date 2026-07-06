/**
 * Supplies live badge counts to the Bottom Navigation.
 *
 * Badge sources are fetched ONCE here (not per item) and shared via context so
 * items re-render only when their own count changes. Reuses the existing
 * `fetchPendingApprovals` service and `can()` guard — no new endpoints.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { can } from '@utils/can'
import { fetchPendingApprovals } from '@services/employee'
import { BADGE_KEYS } from './navConfig'
import type { BadgeMap } from './types'

const BadgeContext = createContext<BadgeMap>({})

/** Access the live badge map (empty object outside the provider). */
export const useBottomNavBadges = (): BadgeMap => useContext(BadgeContext)

/** Poll interval for badge refresh (ms). Kept modest to avoid battery drain. */
const REFRESH_MS = 60_000

interface Props {
  children: ReactNode
  /** When false, no polling occurs (e.g. on desktop). */
  enabled?: boolean
}

export function BottomNavProvider({ children, enabled = true }: Props) {
  const [badges, setBadges] = useState<BadgeMap>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const loadApprovals = async () => {
      if (!can('approvals.approve.team')) {
        if (mounted.current) {
          setBadges((prev) => ({ ...prev, [BADGE_KEYS.approvals]: 0 }))
        }
        return
      }
      try {
        const res: any = await fetchPendingApprovals()
        const records = res?.data ?? res ?? []
        const count = Array.isArray(records) ? records.length : 0
        if (mounted.current) {
          setBadges((prev) => ({ ...prev, [BADGE_KEYS.approvals]: count }))
        }
      } catch {
        // Network hiccups shouldn't blank an existing badge — leave prior value.
      }
    }

    loadApprovals()
    const timer = setInterval(loadApprovals, REFRESH_MS)

    // Refresh when the tab regains focus (returns fresh after being backgrounded).
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadApprovals()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])

  const value = useMemo(() => badges, [badges])

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
}
