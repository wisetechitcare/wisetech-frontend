import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import SVG from 'react-inlinesvg'
import { motion, useReducedMotion } from 'framer-motion'
import { BottomNavBadge } from './BottomNavBadge'
import type { BottomNavItemConfig } from './types'

interface Props {
  item: BottomNavItemConfig
  active: boolean
  badgeCount: number
  /** Shared layoutId owner — the sliding active pill animates between items. */
  indicatorLayoutId: string
}

/**
 * A single tab in the bar. Renders the active/inactive icon, label and badge.
 * The active pill is a shared-layout element so selection glides between tabs.
 * Uses a real anchor (NavLink) for semantics, keyboard and middle-click.
 */
function BottomNavItemBase({ item, active, badgeCount, indicatorLayoutId }: Props) {
  const reduce = useReducedMotion()
  const iconSrc = active ? item.activeIcon ?? item.icon : item.icon

  return (
    <NavLink
      to={item.to}
      className={clsx('bottom-nav__item', { 'bottom-nav__item--active': active })}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      data-analytics-id={`bottomnav_${item.id}`}
    >
      {active && (
        <motion.span
          layoutId={reduce ? undefined : indicatorLayoutId}
          className="bottom-nav__pill"
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
          aria-hidden="true"
        />
      )}

      <span className="bottom-nav__icon-wrap">
        <motion.span
          className="bottom-nav__icon"
          animate={reduce ? undefined : { y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          aria-hidden="true"
        >
          <SVG src={iconSrc} className="bottom-nav__svg" />
        </motion.span>
        <BottomNavBadge count={badgeCount} />
      </span>

      <span className="bottom-nav__label">{item.label}</span>
    </NavLink>
  )
}

export const BottomNavItem = memo(BottomNavItemBase)
