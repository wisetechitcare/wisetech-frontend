/**
 * Computes the current bottom-navigation state (visible primary tabs, overflow,
 * active item) from the live route + permissions.
 */
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@redux/store'
import { BOTTOM_NAV_ITEMS } from './navConfig'
import { computeNavigation } from './utils'
import type { ComputedNavigation } from './types'

export function useBottomNavigation(): ComputedNavigation {
  const { pathname } = useLocation()

  // The visibility guards read from the authz slice (capabilities / blocked
  // sections). Subscribing here re-runs the computation whenever permissions
  // load or change — mirroring how AsideMenuMain stays in sync.
  const capabilities = useSelector(
    (state: RootState) => (state as any).authz?.capabilities
  )
  const blockedSections = useSelector(
    (state: RootState) => (state as any).authz?.blockedSections
  )

  return useMemo<ComputedNavigation>(
    () => computeNavigation(pathname, BOTTOM_NAV_ITEMS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, capabilities, blockedSections]
  )
}
