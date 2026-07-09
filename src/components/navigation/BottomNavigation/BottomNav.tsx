import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useIsMobile } from './useIsMobile'
import { useBottomNavigation } from './useBottomNavigation'
import { BottomNavProvider, useBottomNavBadges } from './BottomNavProvider'
import { BottomNavItem } from './BottomNavItem'
import { BottomNavMore } from './BottomNavMore'
import { BottomNavQuickActions } from './BottomNavQuickActions'
import { BottomNavBadge } from './BottomNavBadge'
import { sumBadges } from './utils'
import './BottomNav.css'

const INDICATOR_LAYOUT_ID = 'bottom-nav-active-pill'

/** Inner bar — assumes it is only rendered on mobile (guarded by the wrapper). */
function BottomNavBar() {
  const reduce = useReducedMotion()
  const { primary, overflow, activeId, isMoreActive } = useBottomNavigation()
  const badges = useBottomNavBadges()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)

  // Close the More sheet / quick-actions sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false)
    setQuickActionsOpen(false)
  }, [location.pathname])

  const hasOverflow = overflow.length > 0
  const overflowBadge = sumBadges(overflow, badges)

  const leftItems = primary.slice(0, 2)
  const rightItems = primary.slice(2, 4)

  return (
    <>
      <nav
        className="bottom-nav"
        role="navigation"
        aria-label="Primary"
        data-kt-bottom-nav="true"
      >
        <motion.div
          className="bottom-nav__bar"
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{ overflow: 'visible' }}
        >
          {leftItems.map((item) => (
            <BottomNavItem
              key={item.id}
              item={item}
              active={item.id === activeId && !isMoreActive}
              badgeCount={item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
              indicatorLayoutId={INDICATOR_LAYOUT_ID}
            />
          ))}

          {/* Raised Center '+' button */}
          <div className="bottom-nav__center-btn-wrapper">
            <button
              type="button"
              className="bottom-nav__center-btn"
              aria-label="Quick actions"
              aria-haspopup="dialog"
              aria-expanded={quickActionsOpen}
              onClick={() => setQuickActionsOpen(true)}
            >
              <i className="bi bi-plus-lg" />
            </button>
          </div>

          {rightItems.map((item) => (
            <BottomNavItem
              key={item.id}
              item={item}
              active={item.id === activeId && !isMoreActive}
              badgeCount={item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
              indicatorLayoutId={INDICATOR_LAYOUT_ID}
            />
          ))}
        </motion.div>
      </nav>

      <BottomNavQuickActions open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </>
  )
}

/**
 * Public entry. Renders nothing on desktop (the sidebar owns navigation there),
 * so there is never a duplicate nav system and no wasted work / badge polling
 * above the `lg` breakpoint.
 */
export function BottomNav() {
  const isMobile = useIsMobile()
  if (!isMobile) return null

  return (
    <BottomNavProvider enabled={isMobile}>
      <BottomNavBar />
    </BottomNavProvider>
  )
}
