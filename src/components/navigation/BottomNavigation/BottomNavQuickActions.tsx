import { memo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

interface QuickAction {
  id: string
  label: string
  icon: string
  to: string
  quickAction: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'markAttendance', label: 'Mark Attendance', icon: 'bi-fingerprint', to: '/employee/attendance-and-leaves', quickAction: 'markAttendance' },
  { id: 'newExpense', label: 'New Expense', icon: 'bi-receipt', to: '/finance/bills', quickAction: 'newExpense' },
  { id: 'newTask', label: 'New Task', icon: 'bi-list-check', to: '/tasks', quickAction: 'newTask' },
]

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Quick-actions bottom sheet for the "+" button. Visually and behaviourally
 * matches `BottomNavMore` (slides up from the very bottom of the screen, not
 * from the button's own raised position) so the two sheets feel like one
 * system. Each tile navigates to the destination page and passes a
 * `quickAction` nav-state flag that the target page reads on mount to
 * auto-open its own existing "create" modal (see TasksMainTable.tsx,
 * Reimbursement.tsx, MarkAttendance.tsx).
 */
function BottomNavQuickActionsBase({ open, onClose }: Props) {
  const reduce = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    sheetRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const handleSelect = (action: QuickAction) => {
    onClose()
    navigate(action.to, { state: { quickAction: action.quickAction } })
  }

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
            aria-label="Quick actions"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div className="bottom-nav-more__grabber" aria-hidden="true" />
            <div className="bottom-nav-more__header">
              <span className="bottom-nav-more__title">Quick Actions</span>
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
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="bottom-nav-more__item"
                  onClick={() => handleSelect(action)}
                  data-analytics-id={`bottomnav_quickaction_${action.id}`}
                >
                  <span className="bottom-nav-more__icon-wrap">
                    <i className={`bi ${action.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
                  </span>
                  <span className="bottom-nav-more__label">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(sheet, document.body)
}

export const BottomNavQuickActions = memo(BottomNavQuickActionsBase)
