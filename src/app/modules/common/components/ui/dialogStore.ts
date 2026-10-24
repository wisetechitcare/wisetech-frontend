import type { ReactNode } from "react";
import DOMPurify from "dompurify";
import type { ConfirmDialogDismissReason, ConfirmDialogVariant } from "./ConfirmDialog";

/**
 * The ONE imperative dialog in the app — `await showDialog({...})` from anywhere, including
 * plain `.ts` helpers that cannot render JSX. Every confirm / alert / prompt renders the kit
 * `ConfirmDialog`; there is no second dialog skin.
 *
 * It replaces SweetAlert2. `DialogResult` is a superset of the SweetAlert result fields callers
 * read (`isConfirmed` / `isDenied` / `isDismissed` / `value` / `dismiss`), so helpers that used to
 * return `Swal.fire(...)` keep their return shape.
 *
 * The store is UI-free on purpose: utils/modal.ts and feedback.ts import it from plain .ts code
 * (including Redux slices), so it must not drag the kit/Metronic in. The renderer is
 * <DialogServiceHost /> in dialogService.tsx, mounted once as `<DialogServiceHost />` in App.tsx, inside the theme, so dialogs follow
 * light/dark and glass/material like every other kit dialog. Calls made before the host mounts
 * are queued and shown as soon as it does. One dialog at a time, first in first out.
 */

export type DialogDismissReason = ConfirmDialogDismissReason;

export interface DialogInputOptions {
  placeholder?: string;
  label?: string;
  defaultValue?: string;
  /** Confirm stays disabled until the (trimmed) value is non-empty. */
  required?: boolean;
}

export interface DialogOptions {
  variant?: ConfirmDialogVariant;
  title: string;
  /** Plain text body. */
  message?: string;
  /** Markup body — sanitised here before it is rendered. Wins over `message`. */
  html?: string;
  /** Rich body node (already React, so nothing to sanitise). Wins over `html` and `message`. */
  messageNode?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `false` = a single acknowledge button. Default true. */
  showCancel?: boolean;
  /** Adds a third, outlined button; choosing it resolves `isDenied: true`. */
  denyLabel?: string;
  /** Danger CTA regardless of variant (a destructive confirm with a warning icon). */
  danger?: boolean;
  /** Renders a text field; its value comes back on `DialogResult.value` when confirmed. */
  input?: DialogInputOptions;
}

export interface DialogResult {
  isConfirmed: boolean;
  isDenied: boolean;
  isDismissed: boolean;
  /** The input's value — only when the dialog had an `input` and was confirmed. */
  value?: string;
  dismiss?: DialogDismissReason;
}

/**
 * Strip anything executable from dialog markup.
 *
 * Deliberately NOT a tag whitelist: dialogs legitimately carry `<b>`, `<ul>`, `<br>` and inline
 * layout, and a whitelist would need revisiting every time one gains a layout. DOMPurify's
 * default profile removes scripts, event handlers and `javascript:` URLs, which is the property
 * needed. Build the string with `safeHtml` as well — that escapes at the point of interpolation;
 * this is the net underneath.
 *
 * `undefined` passes straight through so `html` stays optional.
 */
export function sanitizeHtml(html: string | undefined): string | undefined {
  if (html === undefined) return undefined;
  // No DOM (SSR / node tests) means nothing can execute, and DOMPurify has nothing to work on.
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html);
}

export interface DialogEntry {
  id: number;
  opts: DialogOptions;
  resolve: (result: DialogResult) => void;
}

let queue: readonly DialogEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

export function setQueue(next: readonly DialogEntry[]) {
  queue = next;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getSnapshot = () => queue;

export function settle(id: number, result: DialogResult) {
  const entry = queue.find((e) => e.id === id);
  if (!entry) return;
  setQueue(queue.filter((e) => e.id !== id));
  entry.resolve(result);
}

export const dismissed = (dismiss: DialogDismissReason): DialogResult => ({
  isConfirmed: false,
  isDenied: false,
  isDismissed: true,
  dismiss,
});

/** Queue a dialog. Resolves when the user confirms, denies or dismisses it. */
export function showDialog(opts: DialogOptions): Promise<DialogResult> {
  return new Promise<DialogResult>((resolve) => {
    seq += 1;
    setQueue([...queue, { id: seq, opts, resolve }]);
  });
}

/** Dismiss the dialog on screen (`dismiss: 'close'`) — the `Swal.close()` equivalent. */
export function closeDialog(): void {
  const head = queue[0];
  if (head) settle(head.id, dismissed("close"));
}

/** Patch the dialog on screen in place — the `Swal.update()` equivalent (e.g. a live countdown). */
export function updateDialog(patch: Partial<DialogOptions>): void {
  const head = queue[0];
  if (!head) return;
  setQueue([{ ...head, opts: { ...head.opts, ...patch } }, ...queue.slice(1)]);
}
