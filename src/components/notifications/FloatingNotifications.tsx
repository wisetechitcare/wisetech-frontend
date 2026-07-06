import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNotificationCenter } from './NotificationProvider';
import { NotificationSnackbar } from './components/NotificationSnackbar';
import { NotificationPanel } from './components/NotificationPanel';
import './notifications.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * Root of the floating notification system: renders the collapsed snackbar and
 * the expandable panel into a body portal, and owns cross-cutting concerns —
 * click-outside, Escape, focus management and focus trapping.
 */
export function FloatingNotifications() {
  const { isOpen, open, close, unreadCount, criticalCount } = useNotificationCenter();
  const reduce = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const snackRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Consistent summary pill — shown whenever there are unread important alerts.
  const showSnack = !isOpen && unreadCount > 0;

  const handleOpen = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    open();
  }, [open]);

  // Click outside the panel closes it.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen, close]);

  // Global Escape + focus trap while the panel is open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  // Move focus into the panel on open; restore it on close.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        target?.focus();
      }, 40);
      return () => clearTimeout(t);
    }
    returnFocusRef.current?.focus?.();
  }, [isOpen]);

  const spring = reduce
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 340, damping: 30 };

  return createPortal(
    <div className="wt-noti-root" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.div
            key="panel"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={spring}
            style={{ transformOrigin: 'bottom right', pointerEvents: 'auto' }}
          >
            <NotificationPanel ref={panelRef} />
          </motion.div>
        ) : showSnack ? (
          <motion.div
            key="snack"
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
            transition={spring}
            style={{ pointerEvents: 'auto' }}
          >
            <NotificationSnackbar
              ref={snackRef}
              unreadCount={unreadCount}
              criticalCount={criticalCount}
              onOpen={handleOpen}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
