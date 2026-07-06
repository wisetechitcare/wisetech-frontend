import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  count: number
  /** Render as a small dot instead of a number (for dense overflow indicator). */
  dot?: boolean
}

/**
 * Notification badge. Hidden at zero, caps at "99+", animates in with a subtle
 * spring (respecting reduced-motion), and is announced to screen readers.
 */
function BottomNavBadgeBase({ count, dot = false }: Props) {
  const reduce = useReducedMotion()
  if (!count || count <= 0) return null

  const label = count > 99 ? '99+' : String(count)
  const a11y = `${count} pending`

  if (dot) {
    return (
      <motion.span
        className="bottom-nav__badge bottom-nav__badge--dot"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        role="status"
        aria-label={a11y}
      />
    )
  }

  return (
    <motion.span
      className="bottom-nav__badge"
      initial={reduce ? false : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      role="status"
      aria-label={a11y}
    >
      {label}
    </motion.span>
  )
}

export const BottomNavBadge = memo(BottomNavBadgeBase)
