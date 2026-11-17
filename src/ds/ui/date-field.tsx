"use client"

import { cn } from "cn"
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
  TimeField as AriaTimeField,
  composeRenderProps,
  I18nProvider,
  type DateFieldProps,
  type DateInputProps,
  type DateValue,
  type TimeFieldProps,
  type TimeValue,
} from "react-aria-components"

import { AriaInputGroup, FieldChrome, type FieldChromeProps } from "@/ds/ui/aria-field"
import { fieldVariants } from "@/ds/ui/field"

/**
 * Dates a user types or reads in a field follow the COMPANY standard, `YYYY.MM.DD` (src/utils/dateFormats.ts:
 * `DATE_FORMATS.DISPLAY`, one fixed constant, not a per-tenant setting). React Aria takes segment order from
 * the locale, so date fields wrap themselves in this locale (en-CA is year-month-day) and show "." between the
 * segments. The kit locale (en-IN / en-GB) still governs everything else: the picker puts it back around its
 * calendar popover (month names, first day of the week, day labels).
 */
export const DISPLAY_DATE_LOCALE = "en-CA"
export const DISPLAY_DATE_SEPARATOR = "."

/** Wraps a React Aria date field so its segments read year . month . day. */
export function DisplayDateLocale({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale={DISPLAY_DATE_LOCALE}>{children}</I18nProvider>
}

// Segments are the pill's text control: data-slot="input-group-control" turns on InputGroup's focus
// ring (they are contenteditable, so a click counts as focus-visible) and their aria-invalid its error ring.
const DATE_LITERAL = /^\s*[-/.]\s*$/

function DateInput({
  className,
  literal,
  ...props
}: Omit<DateInputProps, "children"> & { literal?: string }) {
  return (
    <AriaDateInput
      data-slot="date-input"
      className={composeRenderProps(className, (className) =>
        cn("flex h-full min-w-0 items-center px-3 text-base md:text-sm", className)
      )}
      {...props}
    >
      {(segment) => (
        <DateSegment
          data-slot="input-group-control"
          // Only the DATE separators ("-" in en-CA, "/" elsewhere) become the company ".". A time
          // separator (":") or a date-time joiner (", ") stays, so a minute-granularity field reads
          // "2026.11.13, 14:30" rather than "2026.11.13.14.30". The ", 14:30" shape assumes `hourCycle={24}`: the
          // en-CA default is 12-hour ("2:30 p.m."), and React Aria's built-in range messages format with hyphens.
          // No live consumer is affected yet.
          segment={literal && segment.type === "literal" && DATE_LITERAL.test(segment.text) ? { ...segment, text: literal } : segment}
          className="rounded-md px-0.5 tabular-nums outline-none data-disabled:opacity-50 data-focused:bg-primary data-focused:text-primary-foreground data-placeholder:not-data-focused:text-muted-foreground data-[type=literal]:px-0 data-[type=literal]:whitespace-pre"
        />
      )}
    </AriaDateInput>
  )
}

// Values are @internationalized/date CalendarDate (a calendar day, no time zone). Cross the API
// boundary with value.toString() → 'YYYY-MM-DD'; a JS Date round-trip shifts days across IST/UTC.
// onChange fires per keystroke once every segment is filled, so a year typed digit by digit emits
// 0002-…, 0020-… first (minValue marks those invalid but still reports them). Act on blur or
// submit, not on every change.
function DateField<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateFieldProps<T> & FieldChromeProps) {
  return (
    <DisplayDateLocale>
    <AriaDateField
      data-slot="date-field"
      className={composeRenderProps(className, (className) =>
        cn(fieldVariants(), className)
      )}
      {...props}
    >
      <FieldChrome label={label} description={description} errorMessage={errorMessage}>
        <AriaInputGroup>
          <DateInput className="flex-1" literal={DISPLAY_DATE_SEPARATOR} />
        </AriaInputGroup>
      </FieldChrome>
    </AriaDateField>
    </DisplayDateLocale>
  )
}

/** Pass the user's 12/24-hour display setting as `hourCycle`; the value is a `Time` either way. */
function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: TimeFieldProps<T> & FieldChromeProps) {
  return (
    <AriaTimeField
      data-slot="time-field"
      className={composeRenderProps(className, (className) =>
        cn(fieldVariants(), className)
      )}
      {...props}
    >
      <FieldChrome label={label} description={description} errorMessage={errorMessage}>
        <AriaInputGroup>
          <DateInput className="flex-1" />
        </AriaInputGroup>
      </FieldChrome>
    </AriaTimeField>
  )
}

export { DateField, DateInput, TimeField }
