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

export type ConfirmDialogVariant = "confirm" | "delete";

const VARIANT_DEFAULTS: Record<
  ConfirmDialogVariant,
  {
    title: string;
    confirmLabel: string;
    cancelLabel: string;
    iconName: string;
    submitTone: WtCtaTone;
    /** Icon-box accent — brand navy for confirm, rose for delete. */
    mediaColor: string;
  }
> = {
  confirm: {
    title: "Confirm",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    iconName: "bi-check-circle",
    submitTone: "primary",
    mediaColor: T.color.brand,
  },
  delete: {
    title: "Confirm Deletion",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    iconName: "bi-trash",
    submitTone: "danger",
    mediaColor: TRIO.rose.c,
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** `confirm` = primary CTA; `delete` = danger CTA + trash media. */
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
}: ConfirmDialogProps) {
  const theme = useTheme();
  const defaults = VARIANT_DEFAULTS[variant];
  const accent = defaults.mediaColor;
  const resolvedTitle = title ?? defaults.title;
  const resolvedConfirm = confirmLabel ?? defaults.confirmLabel;
  const resolvedCancel = cancelLabel ?? defaults.cancelLabel;
  const isDark = theme.palette.mode === "dark";

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
      onClose={() => !loading && onClose()}
      maxWidth="xs"
      fullWidth
      plain
      mobileFullScreen={false}
    >
      <DialogContent sx={{ pt: 3, pb: 1.5, px: 3, position: "relative" }}>
        <Box sx={{ position: "absolute", top: 10, right: 10 }}>
          <WtCloseButton
            variant="plain"
            size={34}
            onClick={onClose}
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
              sx={{ lineHeight: 1.55 }}
            >
              {message}
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
        }}
      >
        <WtButton ghost onClick={onClose} disabled={loading}>
          {resolvedCancel}
        </WtButton>
        <WtButton
          tone={defaults.submitTone}
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
