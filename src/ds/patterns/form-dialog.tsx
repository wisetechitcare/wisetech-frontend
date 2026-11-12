import * as React from "react"
import { titleCase } from "@/ds/lib/text"
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
 *
 * Without `formId` it is a read-only dialog with one Close button — the live `DrillDownDialog` (use `xl`).
 * With `subheader` + `footer` it is a wizard (Stepper above, Back / Next / Finish below) — the live
 * `WtWizardDialog`.
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
  submitVariant = "default",
  cancelLabel = "Cancel",
  submitting = false,
  submitDisabled = false,
  dirty = false,
  footerStart,
  sections,
  subheader,
  footer,
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
  /** `destructive` when saving ends something (Reject, Delete): the Button story's red CTA. */
  submitVariant?: "default" | "destructive"
  cancelLabel?: string
  submitting?: boolean
  submitDisabled?: boolean
  /** The form has unsaved changes: closing asks to discard first. */
  dirty?: boolean
  /** Left side of the footer — e.g. a "Delete" link on an edit dialog. */
  footerStart?: React.ReactNode
  /**
   * Long forms: a nav rail (wide screens) that jumps to each part. Give each part an element with the
   * matching `id`. Replaces the live `WtFormDialog` section nav.
   */
  sections?: Array<{ id: string; label: string; icon?: React.ReactNode }>
  /** Under the title — a wizard's Stepper. */
  subheader?: React.ReactNode
  /**
   * Replace the Cancel / Save buttons (a wizard's Back / Next / Finish). `requestClose` is the guarded
   * close: it asks to discard while `dirty`.
   */
  footer?: (requestClose: () => void) => React.ReactNode
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
          <DialogHeader className="flex-row items-center gap-3 border-b border-border px-6 py-4 pr-14 text-left">
            {icon && <IconBox icon={icon} tone={tone} />}
            <div className="min-w-0 space-y-0.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </DialogHeader>
          {subheader && <div className="border-b border-border px-6 py-3">{subheader}</div>}
          <div className="flex min-h-0 flex-1">
            {sections && sections.length > 0 && (
              <nav aria-label="Form sections" className="hidden w-52 shrink-0 overflow-y-auto border-r border-border p-3 lg:block">
                <ul className="space-y-0.5">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:size-4"
                      >
                        {sec.icon}
                        {titleCase(sec.label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="min-h-0 flex-1 scroll-smooth overflow-y-auto px-6 py-5">{children}</div>
          </div>
          <DialogFooter className="items-center border-t border-border px-6 py-4 sm:justify-between">
            {footer ? (
              footer(requestClose)
            ) : (
              <>
                <div className="hidden sm:block">{footerStart}</div>
                {/* DialogFooter stretches its children; the group pins the buttons to the right edge. */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" disabled={submitting} onClick={requestClose}>
                    {formId ? cancelLabel : "Close"}
                  </Button>
                  {formId && (
                    <Button type="submit" form={formId} variant={submitVariant} loading={submitting} disabled={submitDisabled}>
                      {submitLabel}
                    </Button>
                  )}
                </div>
              </>
            )}
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
