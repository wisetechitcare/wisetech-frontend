import { useEffect, useRef } from 'react';

/**
 * useFocusTrap — accessible-dialog focus management for hand-rolled overlays.
 *
 * Attach the returned ref to the dialog container (give it `tabIndex={-1}`,
 * `role="dialog"` and `aria-modal="true"`). While `active`:
 *   • focus is moved into the dialog on open (first focusable, else the container);
 *   • Tab / Shift+Tab cycle **within** the dialog (WCAG 2.4.3 / 2.1.2);
 *   • Escape invokes `onEscape` (WCAG 2.1.2 — no keyboard trap without an exit);
 *   • focus is restored to the previously-focused element on close (WCAG 2.4.3);
 *   • body scroll is optionally locked.
 *
 * Deliberately does NOT force-refocus on every `focusin`: that would fight
 * portalled sub-widgets (date pickers, react-select menus) that legitimately
 * render outside the container. Tab-trapping alone satisfies the requirement
 * while staying compatible with those widgets — a design choice, not an omission.
 *
 * Cost: O(f) per Tab keystroke where f = focusable descendants; nothing runs on
 * idle. One capturing keydown + (optional) style write on mount, both reverted on
 * cleanup — no leaks across open/close cycles.
 */
export interface UseFocusTrapOptions {
  /** Called on Escape. Omit to disable Escape-to-close. */
  onEscape?: () => void;
  /** Restore focus to the trigger element on close. Default true. */
  returnFocus?: boolean;
  /** Lock `body` scroll while trapped. Default true. */
  lockScroll?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  options: UseFocusTrapOptions = {},
) {
  const { onEscape, returnFocus = true, lockScroll = true } = options;
  const containerRef = useRef<T | null>(null);
  // Keep the latest onEscape without re-running the effect (stable listener).
  const onEscapeRef = useRef<UseFocusTrapOptions['onEscape']>(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          el.getAttribute('aria-hidden') !== 'true' &&
          (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0),
      );

    // Move focus inside on open (guard against stealing focus from a child that
    // already has it, e.g. an autofocused input).
    if (!container.contains(document.activeElement)) {
      const items = focusables();
      (items[0] ?? container).focus({ preventScroll: true });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      const inside = container.contains(activeEl);
      if (e.shiftKey) {
        if (activeEl === first || !inside) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !inside) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    let restoreOverflow = '';
    if (lockScroll) {
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (lockScroll) document.body.style.overflow = restoreOverflow;
      if (returnFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, returnFocus, lockScroll]);

  return containerRef;
}

export default useFocusTrap;
