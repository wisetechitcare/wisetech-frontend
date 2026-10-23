import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Box } from "@mui/material";
import DOMPurify from "dompurify";
import {
  ConfirmDialog,
  type ConfirmDialogDismissReason,
  type ConfirmDialogVariant,
} from "./ConfirmDialog";
import { WtField } from "./WtField";

/**
 * The ONE imperative dialog in the app — `await showDialog({...})` from anywhere, including
 * plain `.ts` helpers that cannot render JSX. Every confirm / alert / prompt renders the kit
 * `ConfirmDialog`; there is no second dialog skin.
 *
 * It replaces SweetAlert2. `DialogResult` is a superset of the SweetAlert result fields callers
 * read (`isConfirmed` / `isDenied` / `isDismissed` / `value` / `dismiss`), so helpers that used to
 * return `Swal.fire(...)` keep their return shape.
 *
 * Mounted once as `<DialogServiceHost />` in App.tsx, inside the theme, so dialogs follow
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
 * Above every modal layer already open underneath: MUI dialogs (1300), react-bootstrap modals
 * (1055) and the 1500-level legacy modals (GlobalTimerModal, TaskConfigForm). Same layer the
 * SweetAlert container was lifted to — a dialog opened from inside another dialog must never
 * land behind it, or the awaited promise never settles because its buttons are unreachable.
 */
const DIALOG_Z_INDEX = 2000;

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

interface Entry {
  id: number;
  opts: DialogOptions;
  resolve: (result: DialogResult) => void;
}

let queue: readonly Entry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function setQueue(next: readonly Entry[]) {
  queue = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => queue;

function settle(id: number, result: DialogResult) {
  const entry = queue.find((e) => e.id === id);
  if (!entry) return;
  setQueue(queue.filter((e) => e.id !== id));
  entry.resolve(result);
}

const dismissed = (dismiss: DialogDismissReason): DialogResult => ({
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

function bodyFor(opts: DialogOptions): ReactNode | undefined {
  if (opts.messageNode !== undefined) return opts.messageNode;
  if (opts.html === undefined) return undefined;
  return (
    <Box
      component="span"
      sx={{ display: "block", "& ul, & ol": { textAlign: "left", pl: 2.5, my: 1 } }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(opts.html) ?? "" }}
    />
  );
}

/** Renders the head of the dialog queue. Mount ONCE, inside the theme (App.tsx). */
export function DialogServiceHost() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const head = current[0] ?? null;
  // Keep the last dialog rendered (closed) after the queue empties, so MUI can run the exit
  // transition instead of the sheet vanishing mid-frame.
  const lastRef = useRef<Entry | null>(null);
  if (head) lastRef.current = head;
  const shown = head ?? lastRef.current;
  const [draft, setDraft] = useState<{ id: number; value: string } | null>(null);

  if (!shown) return null;
  const { opts } = shown;
  const input = opts.input;
  const value = draft?.id === shown.id ? draft.value : input?.defaultValue ?? "";
  const blocked = Boolean(input?.required) && !value.trim();

  const confirm = () => {
    if (blocked) return;
    settle(shown.id, {
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
      ...(input ? { value } : {}),
    });
  };

  return (
    <ConfirmDialog
      // A new key per dialog: a chained dialog (confirm → success) mounts fresh, with its own
      // focus and enter transition, instead of morphing the previous one's content.
      key={shown.id}
      open={head !== null}
      zIndex={DIALOG_Z_INDEX}
      variant={opts.variant ?? "confirm"}
      title={opts.title}
      message={opts.message ?? ""}
      messageNode={bodyFor(opts)}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      showCancel={opts.showCancel ?? true}
      confirmTone={opts.danger ? "danger" : undefined}
      confirmDisabled={blocked}
      secondaryAction={
        opts.denyLabel
          ? {
              label: opts.denyLabel,
              onClick: () =>
                settle(shown.id, { isConfirmed: false, isDenied: true, isDismissed: false }),
            }
          : undefined
      }
      onConfirm={confirm}
      onClose={() => settle(shown.id, dismissed("close"))}
      onDismiss={(reason) => settle(shown.id, dismissed(reason))}
    >
      {input ? (
        <Box
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirm();
            }
          }}
        >
          <WtField
            autoFocus
            fullWidth
            label={input.label}
            ariaLabel={input.label ? undefined : opts.title}
            placeholder={input.placeholder}
            required={input.required}
            value={value}
            onChange={(next: string) => setDraft({ id: shown.id, value: next })}
          />
        </Box>
      ) : null}
    </ConfirmDialog>
  );
}

export default DialogServiceHost;
