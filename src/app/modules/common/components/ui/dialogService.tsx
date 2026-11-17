import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ConfirmDialog } from "@/ds/patterns/confirm-dialog";
import { Field, FieldLabel } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import {
  dismissed,
  getSnapshot,
  sanitizeHtml,
  settle,
  subscribe,
  type DialogEntry,
  type DialogOptions,
} from "./dialogStore";

// The imperative API lives in the UI-free store; re-exported so existing imports keep working.
export {
  closeDialog,
  sanitizeHtml,
  showDialog,
  updateDialog,
  type DialogDismissReason,
  type DialogInputOptions,
  type DialogOptions,
  type DialogResult,
} from "./dialogStore";

/** A rich body: a node as given, or sanitised markup. Lists inside it keep their bullets and indent. */
function bodyFor(opts: DialogOptions): ReactNode | undefined {
  if (opts.messageNode !== undefined) return opts.messageNode;
  if (opts.html === undefined) return undefined;
  return (
    <div
      className="text-sm text-muted-foreground [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-left [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-left"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(opts.html) ?? "" }}
    />
  );
}

/**
 * Renders the head of the dialog queue with the design system's ConfirmDialog — the one dialog skin for every
 * `showDialog` / `successConfirmation` / `errorConfirmation` / `deleteConfirmation`… call (160 files), on the
 * kit's `alert` layer so a dialog opened from inside any modal is never behind it. Mount ONCE (App.tsx).
 */
export function DialogServiceHost() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const head = current[0] ?? null;
  // Keep the last dialog rendered (closed) after the queue empties, so the exit animation can run
  // instead of the dialog vanishing mid-frame.
  const lastRef = useRef<DialogEntry | null>(null);
  if (head) lastRef.current = head;
  const shown = head ?? lastRef.current;
  const [draft, setDraft] = useState<{ id: number; value: string } | null>(null);

  if (!shown) return null;
  const { opts } = shown;
  const input = opts.input;
  const value = draft?.id === shown.id ? draft.value : input?.defaultValue ?? "";
  const blocked = Boolean(input?.required) && !value.trim();
  const body = bodyFor(opts);
  const inputId = `dialog-input-${shown.id}`;

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
      // A new key per dialog: a chained dialog (confirm → success) mounts fresh, with its own focus and
      // entrance, instead of morphing the previous one's content.
      key={shown.id}
      layer="alert"
      open={head !== null}
      // Settling is done by onConfirm / onDismiss / the deny action; closing itself needs nothing more.
      onOpenChange={() => {}}
      onDismiss={(reason) => settle(shown.id, dismissed(reason))}
      variant={opts.variant ?? "confirm"}
      title={opts.title}
      description={body === undefined && opts.message ? opts.message : undefined}
      confirmLabel={opts.confirmLabel}
      cancelLabel={opts.cancelLabel}
      showCancel={opts.showCancel ?? true}
      danger={opts.danger}
      confirmDisabled={blocked}
      onConfirm={confirm}
      secondaryAction={
        opts.denyLabel
          ? {
              label: opts.denyLabel,
              onClick: () => settle(shown.id, { isConfirmed: false, isDenied: true, isDismissed: false }),
            }
          : undefined
      }
    >
      {body}
      {input ? (
        <Field>
          <FieldLabel htmlFor={inputId}>{input.label ?? opts.title}</FieldLabel>
          <Input
            id={inputId}
            autoFocus
            placeholder={input.placeholder}
            required={input.required}
            value={value}
            onChange={(e) => setDraft({ id: shown.id, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirm();
              }
            }}
          />
        </Field>
      ) : null}
    </ConfirmDialog>
  );
}

export default DialogServiceHost;
