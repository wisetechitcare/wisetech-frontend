import * as React from "react"
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
  className?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const selected = React.useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])

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
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(o: SearchSelectOption) => (
              <ComboboxItem key={o.value} value={o} disabled={o.disabled}>
                {o.icon != null && <OptionIcon icon={o.icon} />}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error ? <FieldError id={errorId}>{error}</FieldError> : hint ? <FieldDescription id={hintId}>{hint}</FieldDescription> : null}
    </Field>
  )
}
