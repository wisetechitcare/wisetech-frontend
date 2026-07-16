import { memo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BottomNavBadge } from './BottomNavBadge'
import type { BottomNavItemConfig } from './types'

interface Props {
  open: boolean
  onClose: () => void
  items: BottomNavItemConfig[]
  activeId: string | null
  badges: Record<string, number>
}

/**
 * Bottom-sheet overflow menu. Renders remaining destinations in a scrollable
 * grid, closes on backdrop tap / Escape / route change, traps initial focus,
 * and honours the iOS home-indicator safe area. Portalled to <body> so it
 * escapes any transformed ancestor and layers above app content.
 */
function BottomNavMoreBase({ open, onClose, items, activeId, badges }: Props) {
  const reduce = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Lock body scroll and wire Escape while the sheet is open.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Move focus into the sheet for screen-reader / keyboard users.
    sheetRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="bottom-nav-more"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
        >
          <div
            className="bottom-nav-more__backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={sheetRef}
            className="bottom-nav-more__sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div className="bottom-nav-more__grabber" aria-hidden="true" />
            <div className="bottom-nav-more__header">
              <span className="bottom-nav-more__title">More</span>
              <button
                type="button"
                className="bottom-nav-more__close"
                onClick={onClose}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="bottom-nav-more__grid">
              {items.map((item) => {
                const active = item.id === activeId
                const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    onClick={onClose}
                    className={clsx('bottom-nav-more__item', {
                      'bottom-nav-more__item--active': active,
                    })}
                    aria-current={active ? 'page' : undefined}
                    data-analytics-id={`bottomnav_more_${item.id}`}
                  >
                    <span className="bottom-nav-more__icon-wrap">
                      <i className={clsx('bi', item.icon, 'bottom-nav-more__bi')} />
                      <BottomNavBadge count={count} />
                    </span>
                    <span className="bottom-nav-more__label">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(sheet, document.body)
}

export const BottomNavMore = memo(BottomNavMoreBase)
