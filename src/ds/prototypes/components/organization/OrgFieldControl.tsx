import { parseDate } from "@internationalized/date"

import { PhoneField } from "@/ds/patterns/phone-field"
import { Button } from "@/ds/ui/button"
import { DatePicker, DateRangePicker } from "@/ds/ui/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Textarea } from "@/ds/ui/textarea"

import { cn } from "@/ds/lib/utils"
import type { IFormField } from "@/models/company"
import { BuiltinFieldId, ProfileFieldType, ProfileInputKind, type FiscalYear } from "@/ds/prototypes/types/organization/organization"
import { aprilToMarchContaining } from "@/ds/prototypes/utils/organization/organization"

interface OrgFieldControlProps {
  field: IFormField
  value: string
  onChange: (value: string) => void
  fiscalYear: FiscalYear
  onFiscalYearChange: (fiscalYear: FiscalYear) => void
  error?: string
}

function safeDate(iso: string) {
  try {
    return iso ? parseDate(iso.slice(0, 10)) : null
  } catch {
    return null
  }
}

/** One profile field, drawn by what it holds: built-ins by their own widget, custom fields by their type. */
export function OrgFieldControl({ field, value, onChange, fiscalYear, onFiscalYearChange, error }: OrgFieldControlProps) {
  const id = `org-field-${field.id}`
  const label = field.required ? `${field.label} *` : field.label
  const errorId = error ? `${id}-error` : undefined
  const invalid = error ? true : undefined
  const longText = field.inputKind === ProfileInputKind.LONG_TEXT

  if (field.id === BuiltinFieldId.FISCAL_YEAR) {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <DateRangePicker
          label={label}
          isRequired={field.required}
          isInvalid={!!error}
          errorMessage={error}
          value={{ start: parseDate(fiscalYear.start), end: parseDate(fiscalYear.end) }}
          onChange={(range) => range && onFiscalYearChange({ start: range.start.toString(), end: range.end.toString() })}
        />
        <Button type="button" variant="link" size="xs" className="px-0" onClick={() => onFiscalYearChange(aprilToMarchContaining(new Date()))}>
          Use this April – March
        </Button>
      </div>
    )
  }

  if (field.type === ProfileFieldType.DATE) {
    return (
      <DatePicker
        label={label}
        isRequired={field.required}
        isInvalid={!!error}
        errorMessage={error}
        value={safeDate(value)}
        onChange={(date) => onChange(date?.toString() ?? "")}
      />
    )
  }

  const control = (() => {
    if (field.inputKind === ProfileInputKind.PHONE) return <PhoneField id={id} value={value} onChange={(phone) => onChange(phone)} invalid={!!error} />
    if (longText) {
      return <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={errorId} rows={2} />
    }
    if (field.type === ProfileFieldType.FILE) {
      return <Input id={id} type="file" aria-describedby={value ? `${id}-current` : errorId} onChange={(e) => onChange(e.target.files?.[0]?.name ?? value)} />
    }
    const htmlType = field.inputKind === ProfileInputKind.EMAIL ? "email" : field.inputKind === ProfileInputKind.URL ? "url" : "text"
    return (
      <Input
        id={id}
        type={htmlType}
        inputMode={field.type === ProfileFieldType.NUMBER ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-required={field.required || undefined}
        aria-describedby={errorId}
      />
    )
  })()

  return (
    <Field data-invalid={invalid} className={cn(longText && "sm:col-span-2")}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {control}
      {field.type === ProfileFieldType.FILE && value && <FieldDescription id={`${id}-current`}>Current: {value}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
