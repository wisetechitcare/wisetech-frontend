import * as React from "react"
import { cn } from "@/ds/lib/utils"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/ds/ui/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/ds/ui/field"

export type SearchSelectOption = {
  value: string
  label: string
  /** An icon element, or an image URL (e.g. a category's uploaded icon). */
  icon?: React.ReactNode
  disabled?: boolean
}

const byValue = (a: SearchSelectOption, b: SearchSelectOption) => a.value === b.value

function OptionIcon({ icon }: { icon: React.ReactNode }) {
  if (typeof icon === "string") return <img src={icon} alt="" aria-hidden className="size-5 shrink-0 object-contain" />
  return <span aria-hidden className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span>
}

/**
 * Pick ONE value from a list you can search — a project, a company, an expense category. A single value is
 * never a dialog. Replaces the live kit's `WtField searchable` / `WtSelect` (react-select + MUI).
 *
 * A complete field: floating label, the combobox, a clear button once something is chosen, then a hint or an
 * error linked to the control. Controlled by the option's `value` string ("" or null = nothing chosen), so it
 * binds to any form engine. Options keep the order you pass — sort upstream when order means something.
 */
export function SearchSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "Nothing matches.",
  hint,
  error,
  required,
  disabled,
  clearable = true,
  onBlur,
  limit = 100,
  className,
}: {
  id: string
  label: string
  value: string | null | undefined
  onValueChange: (value: string | null, option: SearchSelectOption | null) => void
  options: SearchSelectOption[]
  placeholder?: string
  emptyText?: string
  hint?: React.ReactNode
  /** Shown under the field, linked to the input and announced; also turns the field red. */
  error?: React.ReactNode
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  onBlur?: () => void
  /**
   * Rows rendered at once. A long list (hundreds of projects) is searched, not scrolled: rendering every
   * row costs a render per keystroke for rows nobody reads, so the list shows the first `limit` matches and
   * says how to reach the rest.
   */
  limit?: number
  className?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const selected = React.useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])
  // The same match Base UI applies (case-insensitive "contains" on the label), so the note's count is true.
  const [query, setQuery] = React.useState("")
  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q === selected?.label.toLowerCase()) return options.length
    return options.reduce((n, o) => (o.label.toLowerCase().includes(q) ? n + 1 : n), 0)
  }, [options, query, selected])

  return (
    <Field data-invalid={error ? true : undefined} data-disabled={disabled || undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(next: SearchSelectOption | null) => onValueChange(next?.value ?? null, next ?? null)}
        itemToStringLabel={(o: SearchSelectOption) => o.label}
        itemToStringValue={(o: SearchSelectOption) => o.value}
        isItemEqualToValue={byValue}
        disabled={disabled}
        required={required}
        limit={limit}
        onInputValueChange={(q: string) => setQuery(q)}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          showClear={clearable && !!selected && !disabled}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          onBlur={onBlur}
          title={selected?.label}
          // An input is one line, so a long chosen value ("WT/PROJECT/26-27/742 - 5th Floor Criti Care Hospital
          // at Kurla") would be cut. At rest the box shows the value as wrapped text and grows to fit; on focus
          // that copy hides and the real input is back, one line, for searching. The input stays in place
          // (transparent) underneath, so a click anywhere in the box still lands on it.
          className={selected ? cn(
            "h-auto min-h-10",
            "[&:not(:focus-within)_[data-slot=input-group-control]]:absolute [&:not(:focus-within)_[data-slot=input-group-control]]:inset-0 [&:not(:focus-within)_[data-slot=input-group-control]]:text-transparent",
          ) : undefined}
        >
          {selected && (
            <span
              aria-hidden
              data-slot="search-select-value"
              className="pointer-events-none order-first flex-1 py-2 pr-2 pl-3 text-base break-words whitespace-normal md:text-sm [:focus-within>&]:hidden"
            >
              {selected.label}
            </span>
          )}
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(o: SearchSelectOption) => (
              <ComboboxItem key={o.value} value={o} disabled={o.disabled}>
                {o.icon != null && <OptionIcon icon={o.icon} />}
                {/* Wraps: a long project or company name is read in full, never cut to "WT/PROJECT/26…". */}
                <span className="min-w-0 flex-1 break-words whitespace-normal">{o.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
          {matches > limit && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Showing {limit} of {matches} — type to narrow the list.
            </p>
          )}
        </ComboboxContent>
      </Combobox>
      {error ? <FieldError id={errorId}>{error}</FieldError> : hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
    </Field>
  )
}
