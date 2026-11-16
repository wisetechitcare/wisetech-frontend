import * as React from "react"
import { ChevronDown } from "lucide-react"
import { titleCase } from "@/ds/lib/text"
import { Button } from "@/ds/ui/button"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/ds/ui/radio-group"
import { FormDialog } from "./form-dialog"

export type PickerOption = {
  id: string
  name: string
  /** Admin-configured colour (hex) or a kit tone — shown as a dot beside the name. */
  color?: Tone | (string & {})
  /** One short line under the name, when the name alone is not enough. */
  description?: string
}

/**
 * The control that shows the current choice and opens the picker — e.g. "● Project  On Ongoing ⌄" in a record's
 * header. Tinted in the choice's own colour; the chevron says "pick from a list" (a pencil read as "type here").
 * Without `onClick` (no write access) it renders as a plain, non-interactive tag in the same look.
 */
export function OptionPickerTrigger({
  label,
  value,
  color = "neutral",
  onClick,
  busy = false,
  className,
}: {
  /** Muted caption before the value, e.g. "Project". */
  label?: string
  value: string
  color?: Tone | (string & {})
  onClick?: () => void
  busy?: boolean
  className?: string
}) {
  const look = cn(
    "max-w-full gap-2 border-[color-mix(in_oklch,var(--tone)_30%,transparent)] bg-[color-mix(in_oklch,var(--tone)_8%,transparent)] pr-2 pl-3 text-(--tone-ink)",
    className,
  )
  const content = (
    <>
      <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-(--tone) ring-4 ring-[color-mix(in_oklch,var(--tone)_20%,transparent)]" />
      {label && <span className="font-normal text-muted-foreground">{label}</span>}
      <span className="min-w-0 truncate font-semibold">{value}</span>
    </>
  )
  if (!onClick) {
    return (
      <span
        style={toneStyle(color)}
        className={cn("inline-flex h-8 items-center rounded-4xl border text-[13px]", look, "pr-3")}
      >
        {content}
      </span>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-haspopup="dialog"
      loading={busy}
      onClick={onClick}
      style={toneStyle(color)}
      className={cn(
        look,
        "hover:border-[color-mix(in_oklch,var(--tone)_55%,transparent)] hover:bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] hover:text-(--tone-ink)",
      )}
    >
      {content}
      <ChevronDown data-icon="inline-end" className="opacity-60" />
    </Button>
  )
}

/**
 * Choose one thing from a short list in a dialog — a project's status, a lead's stage, a priority. Replaces the
 * live kit's `OptionPickerDialog`. It is a `FormDialog` around a real radio group: arrow keys move, Space selects,
 * Enter confirms, and Confirm stays off until the choice differs from what was already set.
 *
 * `children` render under the list for what only some choices need (Completed asks for an end date).
 */
export function OptionPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  options,
  value,
  currentId,
  onValueChange,
  onConfirm,
  confirmLabel = "Confirm",
  confirmDisabled = false,
  loading = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  options: ReadonlyArray<PickerOption>
  value: string | null
  /** What is set today: tagged "Current" so the reader sees what they are changing from. */
  currentId?: string | null
  onValueChange: (id: string) => void
  onConfirm: () => void
  confirmLabel?: string
  confirmDisabled?: boolean
  loading?: boolean
  children?: React.ReactNode
}) {
  const formId = React.useId()
  const labelId = React.useId()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      icon={icon}
      formId={formId}
      submitLabel={confirmLabel}
      submitting={loading}
      submitDisabled={confirmDisabled}
    >
      <form
        id={formId}
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!confirmDisabled && !loading) onConfirm()
        }}
      >
        <span id={labelId} className="sr-only">{typeof title === "string" ? title : "Options"}</span>
        <RadioGroup aria-labelledby={labelId} value={value ?? ""} onValueChange={(v) => onValueChange(String(v))} className="gap-2">
          {options.map((o) => {
            const id = `${formId}-${o.id}`
            const isCurrent = currentId === o.id
            return (
              // The label is only the click target (block): Metronic's global `label` rule outranks Tailwind's layered
              // `flex`, so the row layout lives on the div inside it. Every colour below derives from the option's own.
              <label key={o.id} htmlFor={id} className="block cursor-pointer">
                <div
                  style={toneStyle(o.color ?? "neutral")}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors",
                    "hover:border-[color-mix(in_oklch,var(--tone)_35%,var(--border))] hover:bg-[color-mix(in_oklch,var(--tone)_5%,transparent)]",
                    "has-data-checked:border-[color-mix(in_oklch,var(--tone)_60%,transparent)] has-data-checked:bg-[color-mix(in_oklch,var(--tone)_10%,transparent)]",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  )}
                >
                  <RadioGroupItem
                    id={id}
                    value={o.id}
                    className="data-checked:border-(--tone) data-checked:bg-(--tone) dark:data-checked:bg-(--tone)"
                  />
                  <span
                    aria-hidden
                    className="inline-block size-2.5 shrink-0 rounded-full bg-(--tone) ring-4 ring-[color-mix(in_oklch,var(--tone)_18%,transparent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground group-has-data-checked:font-semibold group-has-data-checked:text-(--tone-ink)">
                      {titleCase(o.name)}
                    </span>
                    {o.description && <span className="block text-xs text-muted-foreground">{o.description}</span>}
                  </span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Current
                    </span>
                  )}
                </div>
              </label>
            )
          })}
        </RadioGroup>
        {children}
      </form>
    </FormDialog>
  )
}
