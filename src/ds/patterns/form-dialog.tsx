import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ds/ui/dialog"
import { ConfirmDialog } from "./confirm-dialog"
import { IconBox } from "./icon-box"

const formDialogVariants = cva("flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0", {
  variants: {
    size: {
      sm: "sm:max-w-md",
      default: "sm:max-w-xl",
      lg: "sm:max-w-3xl",
      xl: "sm:max-w-5xl",
    },
  },
  defaultVariants: { size: "default" },
})

/**
 * The dialog shell for creating or editing a record: icon + title header, a scrolling body, and a sticky
 * Cancel / Save footer. Replaces the live kit's `GlassDialog` + `GlassHeader` + `GlassDialogActions`, and
 * `UnsavedChangesModal`: while `dirty`, every way of closing (Esc, ✕, Cancel, backdrop) asks to discard first.
 *
 * Wrap the body in your own `<form>` and give it the `formId`; the Save button submits that form, so Enter
 * works and validation runs the normal way.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "brand",
  size,
  children,
  formId,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitting = false,
  submitDisabled = false,
  dirty = false,
  footerStart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone | (string & {})
  children: React.ReactNode
  /** id of the <form> inside the body; the Save button submits it. Omit for a read-only dialog (no Save). */
  formId?: string
  submitLabel?: string
  cancelLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  /** The form has unsaved changes: closing asks to discard first. */
  dirty?: boolean
  /** Left side of the footer — e.g. a "Delete" link on an edit dialog. */
  footerStart?: React.ReactNode
} & VariantProps<typeof formDialogVariants>) {
  const [askDiscard, setAskDiscard] = React.useState(false)

  const requestClose = React.useCallback(() => {
    if (submitting) return
    if (dirty) setAskDiscard(true)
    else onOpenChange(false)
  }, [dirty, submitting, onOpenChange])

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent className={cn(formDialogVariants({ size }))}>
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4 pr-14 text-left">
            {icon && <IconBox icon={icon} tone={tone} />}
            <div className="min-w-0 space-y-0.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          <DialogFooter className="items-center border-t px-6 py-4 sm:justify-between">
            <div className="hidden sm:block">{footerStart}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" disabled={submitting} onClick={requestClose}>
                {formId ? cancelLabel : "Close"}
              </Button>
              {formId && (
                <Button type="submit" form={formId} loading={submitting} disabled={submitDisabled}>
                  {submitLabel}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={askDiscard}
        onOpenChange={setAskDiscard}
        variant="discard"
        title="Discard unsaved changes?"
        description="What you've entered in this form will be lost."
        cancelLabel="Keep editing"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  )
}
