import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ConfirmDialog,
  type ConfirmDialogVariant,
} from "./ConfirmDialog";

export type AskConfirmOptions = {
  variant?: ConfirmDialogVariant;
  title?: string;
  message: string;
  icon?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
};

type Pending = AskConfirmOptions & {
  resolve: (ok: boolean) => void;
};

/**
 * Promise-style confirm/delete dialog for click handlers (replaces `window.confirm`).
 *
 * @example
 * const { ask, dialog } = useConfirmDialog();
 * // …
 * if (await ask({ variant: "delete", message: `Delete “${name}”?` })) { … }
 * return <>{dialog}…</>;
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  const ask = useCallback((opts: AskConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const finish = useCallback((ok: boolean) => {
    const cur = pendingRef.current;
    if (!cur) return;
    setPending(null);
    cur.resolve(ok);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      variant={pending?.variant ?? "confirm"}
      title={pending?.title}
      message={pending?.message ?? ""}
      icon={pending?.icon}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      onClose={() => finish(false)}
      onConfirm={() => finish(true)}
    >
      {pending?.children}
    </ConfirmDialog>
  );

  return { ask, dialog };
}

export default useConfirmDialog;
