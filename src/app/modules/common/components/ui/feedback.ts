import { createElement, type ReactNode } from 'react';
import { toast as toastify, type ToastOptions } from 'react-toastify';
import type { ConfirmDialogVariant } from './ConfirmDialog';
import { sanitizeHtml, showDialog, type DialogResult } from './dialogStore';

/**
 * Kit feedback helpers — toast, alert and confirm — for code that wants a one-liner.
 *
 * `alertDialog` / `confirmDialog` render the kit ConfirmDialog through the dialog service
 * (`showDialog`), so there is one dialog skin app-wide. `toast` goes to react-toastify, which
 * is mounted once as <ToastContainer> in main.tsx.
 *
 * Any `html` is sanitised before it renders (DOMPurify, in dialogService). Build the string
 * with `safeHtml` as well — that escapes at the point of interpolation, where the intent is
 * visible; the sanitiser is the net underneath.
 */

/** The notice kinds the helpers accept. `question` reads as `info`. */
export type FeedbackIcon = 'success' | 'error' | 'warning' | 'info' | 'question';

export interface FeedbackOptions {
  icon?: FeedbackIcon;
  title: string;
  text?: string;
  html?: string;
}

const VARIANT_FOR_ICON: Record<FeedbackIcon, ConfirmDialogVariant> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
  question: 'info',
};

/** Read at fire time — the toast container lives outside the MUI theme. */
const isDark = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

function toastBody(opts: FeedbackOptions): ReactNode {
  const html = sanitizeHtml(opts.html);
  const detail = html !== undefined
    ? createElement('div', { style: { opacity: 0.8, fontSize: '0.9em' }, dangerouslySetInnerHTML: { __html: html } })
    : opts.text
      ? createElement('div', { style: { opacity: 0.8, fontSize: '0.9em' } }, opts.text)
      : null;
  return createElement(
    'div',
    { style: { overflowWrap: 'anywhere' } },
    createElement('div', { style: { fontWeight: 600 } }, opts.title),
    detail,
  );
}

/**
 * Auto-dismissing notice. Hovering pauses the timer — a notice that vanishes while being read
 * is worse than no notice. 3200ms default: long enough to read back a reference like
 * BILL/2026/0004, which is exactly what these notices carry.
 *
 * Resolves immediately (it no longer waits for the toast to close), so `await toast(...)`
 * still compiles and runs; nothing after it is held up by the notice.
 */
export function toast(opts: FeedbackOptions & { timer?: number }): Promise<void> {
  const options: ToastOptions = {
    autoClose: opts.timer ?? 3200,
    pauseOnHover: true,
    theme: isDark() ? 'dark' : 'light',
  };
  const body = toastBody(opts);
  switch (opts.icon) {
    case 'success': toastify.success(body, options); break;
    case 'error': toastify.error(body, options); break;
    case 'warning': toastify.warning(body, options); break;
    case 'info':
    case 'question': toastify.info(body, options); break;
    default: toastify(body, options);
  }
  return Promise.resolve();
}

/** Alert with a single acknowledge button. */
export function alertDialog(opts: FeedbackOptions & { confirmText?: string }): Promise<DialogResult> {
  return showDialog({
    variant: opts.icon ? VARIANT_FOR_ICON[opts.icon] : 'info',
    title: opts.title,
    message: opts.text,
    html: opts.html,
    confirmLabel: opts.confirmText ?? 'OK',
    showCancel: false,
  });
}

/** Confirm — resolves true when confirmed. Pass `danger` for destructive actions. */
export async function confirmDialog(
  opts: FeedbackOptions & { confirmText?: string; cancelText?: string; danger?: boolean },
): Promise<boolean> {
  const res = await showDialog({
    variant: opts.danger ? 'delete' : VARIANT_FOR_ICON[opts.icon ?? 'warning'],
    title: opts.title,
    message: opts.text,
    html: opts.html,
    confirmLabel: opts.confirmText ?? 'Confirm',
    cancelLabel: opts.cancelText ?? 'Cancel',
    danger: opts.danger,
  });
  return res.isConfirmed;
}
