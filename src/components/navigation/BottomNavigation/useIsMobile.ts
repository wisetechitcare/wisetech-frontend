import { useEffect, useState } from 'react'

/**
 * Mobile breakpoint. Matches the existing Metronic aside drawer, which becomes
 * a drawer below `lg` (992px). Reusing the same boundary guarantees exactly one
 * navigation system is ever active — sidebar on desktop, bottom nav below it —
 * with no duplication. Tablets (768–991px) therefore get the bottom nav too.
 */
const MOBILE_QUERY = '(max-width: 991.98px)'

/**
 * Reactively reports whether the viewport is at/below the mobile breakpoint.
 * CSS still hides the bar on desktop as a belt-and-suspenders guard, but this
 * hook lets React skip rendering the bar (and its badge polling) entirely on
 * desktop, avoiding any wasted work.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(MOBILE_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    // Sync in case the viewport changed between initial state and effect.
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
