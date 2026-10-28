import { useCallback, useRef, useState, type ReactNode } from "react";
import { TextField } from "@mui/material";
import { ConfirmDialog } from "./ConfirmDialog";

export type AskPromptOptions = {
  title?: string;
  message: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string | ReactNode;
};

type Pending = AskPromptOptions & {
  resolve: (value: string | null) => void;
};

/**
 * Promise-style text prompt on ConfirmDialog (replaces `window.prompt`).
 *
 * @example
 * const { askText, dialog } = usePromptDialog();
 * const name = await askText({ message: "New name", defaultValue: "Copy" });
 * if (!name) return;
 */
export function usePromptDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const pendingRef = useRef<Pending | null>(null);
  const valueRef = useRef("");
  pendingRef.current = pending;
  valueRef.current = value;

  const askText = useCallback((opts: AskPromptOptions) => {
    return new Promise<string | null>((resolve) => {
      const initial = opts.defaultValue ?? "";
      setValue(initial);
      valueRef.current = initial;
      setPending({ ...opts, resolve });
    });
  }, []);

  const finish = useCallback((ok: boolean) => {
    const cur = pendingRef.current;
    if (!cur) return;
    const trimmed = valueRef.current.trim();
    setPending(null);
    cur.resolve(ok && trimmed ? trimmed : null);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      variant="confirm"
      title={pending?.title}
      message={pending?.message ?? ""}
      icon={pending?.icon}
      confirmLabel={pending?.confirmLabel ?? "Continue"}
      cancelLabel={pending?.cancelLabel}
      confirmDisabled={!value.trim()}
      onClose={() => finish(false)}
      onConfirm={() => finish(true)}
    >
      <TextField
        autoFocus
        fullWidth
        size="small"
        label={pending?.label ?? "Name"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            finish(true);
          }
        }}
      />
    </ConfirmDialog>
  );

  return { askText, dialog };
}

export default usePromptDialog;
