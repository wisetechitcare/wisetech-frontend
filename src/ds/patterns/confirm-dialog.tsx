import * as React from "react"
import { CircleAlert, CircleCheck, CircleHelp, Info, Trash2, TriangleAlert, Undo2 } from "lucide-react"
import type { Tone } from "@/ds/lib/tone"
import { Button } from "@/ds/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/ds/ui/alert-dialog"
import { IconBox } from "./icon-box"

export type ConfirmVariant = "confirm" | "delete" | "discard" | "warning" | "info" | "success" | "error"

const VARIANTS: Record<
  ConfirmVariant,
  { icon: React.ReactNode; tone: Tone; button: "default" | "destructive" | "success"; confirm: string }
> = {
  confirm: { icon: <CircleHelp />, tone: "brand", button: "default", confirm: "Confirm" },
  delete: { icon: <Trash2 />, tone: "danger", button: "destructive", confirm: "Delete" },
  discard: { icon: <Undo2 />, tone: "warning", button: "destructive", confirm: "Discard changes" },
  warning: { icon: <TriangleAlert />, tone: "warning", button: "default", confirm: "Continue" },
  info: { icon: <Info />, tone: "info", button: "default", confirm: "OK" },
  success: { icon: <CircleCheck />, tone: "success", button: "success", confirm: "Done" },
  error: { icon: <CircleAlert />, tone: "danger", button: "default", confirm: "OK" },
}

/**
 * A question the user must answer before continuing — delete, discard, overwrite — or a notice they must
 * acknowledge. Replaces the live kit's `ConfirmDialog`, `confirmDialog()` / `alertDialog()` and SweetAlert.
 *
 * Name the confirm button after the action ("Delete employee"), never "Yes". `onConfirm` may return a
 * promise: the button shows a spinner and the dialog stays open until it settles (closed on success, kept
 * open on failure so the user can retry). Notices (`info`, `success`, `error`) pass `showCancel={false}`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  variant = "confirm",
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  showCancel = true,
  confirmDisabled,
  secondaryAction,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: ConfirmVariant
  title: React.ReactNode
  description?: React.ReactNode
  /** Extra content under the description (a reason field, a list of what will be affected). */
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void | Promise<unknown>
  showCancel?: boolean
  confirmDisabled?: boolean
  /** A third choice, e.g. "Save as draft" beside "Discard". */
  secondaryAction?: { label: string; onClick: () => void }
}) {
  const v = VARIANTS[variant]
  const [busy, setBusy] = React.useState(false)

  async function confirm() {
    if (!onConfirm) return onOpenChange(false)
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Stay open so the user can retry; the caller reports the failure (toast or inline message).
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-transparent">
            <IconBox icon={v.icon} tone={v.tone} size="lg" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          {showCancel && <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>}
          {secondaryAction && (
            <Button variant="outline" disabled={busy} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          <Button variant={v.button} loading={busy} disabled={confirmDisabled} onClick={confirm}>
            {confirmLabel ?? v.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
