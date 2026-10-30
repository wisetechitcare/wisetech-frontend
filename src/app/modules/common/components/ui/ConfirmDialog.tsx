import type { ReactNode } from "react";
import {
  Box,
  DialogContent,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { GlassDialog } from "./glass";
import { GlassDialogActions } from "./GlassDialogActions";
import { AppIcon } from "./AppIcon";
import { WtButton, type WtCtaTone } from "./buttons";
import { WtCloseButton } from "./tw/WtCloseButton";
import { T } from "./tokens";
import { TRIO } from "./patterns";

export type ConfirmDialogVariant =
  | "confirm"
  | "delete"
  | "discard"
  /** Notices — usually paired with `showCancel={false}` (one acknowledge button). */
  | "success"
  | "error"
  | "info"
  | "warning";

/**
 * How the dialog was dismissed. `cancel` = the Cancel button, `close` = the corner X,
 * `backdrop` = a click outside, `esc` = the Escape key.
 */
export type ConfirmDialogDismissReason = "cancel" | "close" | "backdrop" | "esc";

const VARIANT_DEFAULTS: Record<
  ConfirmDialogVariant,
  {
    title: string;
    confirmLabel: string;
    cancelLabel: string;
    iconName: string;
    submitTone: WtCtaTone;
    /** Icon-box accent. A getter: TRIO is read at render, not at import (import cycle via patterns). */
    mediaColor: () => string;
  }
> = {
  confirm: {
    title: "Confirm",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    iconName: "check-circle",
    submitTone: "accent",
    mediaColor: () => T.color.brand,
  },
  delete: {
    title: "Confirm Deletion",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    iconName: "trash",
    submitTone: "danger",
    mediaColor: () => TRIO.rose.c,
  },
  /** Leaving a form with unsaved edits. Cancel keeps the user where they are. */
  discard: {
    title: "Discard unsaved changes?",
    confirmLabel: "Discard",
    cancelLabel: "Keep editing",
    iconName: "warning",
    submitTone: "danger",
    mediaColor: () => TRIO.amber.c,
  },
  success: {
    title: "Done",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    iconName: "check-circle",
    submitTone: "success",
    mediaColor: () => TRIO.green.c,
  },
  error: {
    title: "That Didn't Work",
    confirmLabel: "Close",
    cancelLabel: "Cancel",
    iconName: "cross-circle",
    submitTone: "danger",
    mediaColor: () => TRIO.rose.c,
  },
  info: {
    title: "Notice",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    iconName: "information-5",
    submitTone: "accent",
    mediaColor: () => TRIO.blue.c,
  },
  warning: {
    title: "Warning",
    confirmLabel: "OK",
    cancelLabel: "Cancel",
    iconName: "warning",
    submitTone: "accent",
    mediaColor: () => TRIO.amber.c,
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** `confirm` = the default CTA; `delete` = danger CTA + trash media. */
  variant?: ConfirmDialogVariant;
  /** Overrides variant default title. */
  title?: string;
  /** Main body copy. */
  message: string;
  /** AppIcon name, or a custom node. Defaults from variant. */
  icon?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Shown on the confirm CTA while `loading` is true. */
  loadingLabel?: string;
  confirmDisabled?: boolean;
  /** Extra content under the message (lists, hints). */
  children?: ReactNode;
  /**
   * Rich body rendered in place of `message` (sanitised HTML from the dialog service, or any
   * node). `message` is ignored when this is set.
   */
  messageNode?: ReactNode;
  /** `false` = a single acknowledge button (notices). Default true. */
  showCancel?: boolean;
  /** A third, outlined action between Cancel and Confirm (e.g. "Update Only"). */
  secondaryAction?: { label: string; onClick: () => void };
  /** Overrides the variant's CTA tone — e.g. a warning icon with a danger button. */
  confirmTone?: WtCtaTone;
  /**
   * Told HOW the dialog was dismissed. When set it is called INSTEAD of `onClose` for the
   * Cancel button, the corner X, a backdrop click and Escape.
   */
  onDismiss?: (reason: ConfirmDialogDismissReason) => void;
  /** Stacking override — the dialog service lifts itself above already-open modals. */
  zIndex?: number;
}

/**
 * Small alert-style dialog (shadcn AlertDialog “media” layout) on our Glass + WtButton kit.
 *
 * @example
 * <ConfirmDialog
 *   open={open}
 *   variant="delete"
 *   message={`Delete “${name}”?`}
 *   onClose={() => setOpen(false)}
 *   onConfirm={doDelete}
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  variant = "confirm",
  title,
  message,
  icon,
  confirmLabel,
  cancelLabel,
  loading = false,
  loadingLabel = "Please wait…",
  confirmDisabled = false,
  children,
  messageNode,
  showCancel = true,
  secondaryAction,
  confirmTone,
  onDismiss,
  zIndex,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const defaults = VARIANT_DEFAULTS[variant];
  const accent = defaults.mediaColor();
  const resolvedTitle = title ?? defaults.title;
  const resolvedConfirm = confirmLabel ?? defaults.confirmLabel;
  const resolvedCancel = cancelLabel ?? defaults.cancelLabel;
  const isDark = theme.palette.mode === "dark";
  const dismiss = (reason: ConfirmDialogDismissReason) => {
    if (onDismiss) onDismiss(reason);
    else onClose();
  };

  const media =
    typeof icon === "string" || icon === undefined ? (
      <AppIcon
        name={typeof icon === "string" ? icon : defaults.iconName}
        className="fs-2"
      />
    ) : (
      icon
    );

  return (
    <GlassDialog
      open={open}
      onClose={(_event, reason) => {
        if (loading) return;
        dismiss(reason === "escapeKeyDown" ? "esc" : "backdrop");
      }}
      maxWidth="xs"
      fullWidth
      plain
      mobileFullScreen={false}
      sx={zIndex === undefined ? undefined : { zIndex }}
    >
      <DialogContent sx={{ pt: 3, pb: 1.5, px: 3, position: "relative" }}>
        <Box sx={{ position: "absolute", top: 10, right: 10 }}>
          <WtCloseButton
            variant="plain"
            size={34}
            onClick={() => dismiss("close")}
            disabled={loading}
          />
        </Box>

        <Stack spacing={2} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              display: "grid",
              placeItems: "center",
              color: accent,
              bgcolor: alpha(accent, isDark ? 0.22 : 0.12),
              border: `1px solid ${alpha(accent, 0.35)}`,
            }}
          >
            {media}
          </Box>
          <Box sx={{ px: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
              {resolvedTitle}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              component={messageNode ? "div" : "p"}
              sx={{ lineHeight: 1.55, overflowWrap: "anywhere" }}
            >
              {messageNode ?? message}
            </Typography>
          </Box>
          {children ? (
            <Box sx={{ width: "100%", textAlign: "left" }}>{children}</Box>
          ) : null}
        </Stack>
      </DialogContent>
      <GlassDialogActions
        sx={{
          px: 2.5,
          py: 2,
          gap: 1.25,
          // 50/50 footer — both CTAs share the modal width equally
          "& > *": { flex: 1, minWidth: 0 },
          // Three CTAs do not fit one row at 360px — wrap rather than crush the labels.
          ...(secondaryAction && {
            flexWrap: "wrap",
            "& > *": { flex: "1 1 96px", minWidth: 0 },
            "& > :not(style) ~ :not(style)": { ml: 0 },
          }),
        }}
      >
        {showCancel ? (
          <WtButton ghost onClick={() => dismiss("cancel")} disabled={loading}>
            {resolvedCancel}
          </WtButton>
        ) : null}
        {secondaryAction ? (
          <WtButton inverted onClick={secondaryAction.onClick} disabled={loading}>
            {secondaryAction.label}
          </WtButton>
        ) : null}
        <WtButton
          tone={confirmTone ?? defaults.submitTone}
          onClick={onConfirm}
          disabled={loading || confirmDisabled}
        >
          {loading ? loadingLabel : resolvedConfirm}
        </WtButton>
      </GlassDialogActions>
    </GlassDialog>
  );
}

export default ConfirmDialog;
