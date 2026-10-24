import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Box } from "@mui/material";
import { ConfirmDialog } from "./ConfirmDialog";
import { WtField } from "./WtField";
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

/**
 * Above every modal layer already open underneath: MUI dialogs (1300), react-bootstrap modals
 * (1055) and the 1500-level legacy modals. A dialog opened from inside another dialog must never
 * land behind it, or the awaited promise never settles because its buttons are unreachable.
 */
const DIALOG_Z_INDEX = 2000;

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
  const lastRef = useRef<DialogEntry | null>(null);
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
