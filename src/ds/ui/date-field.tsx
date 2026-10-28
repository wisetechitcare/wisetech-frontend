"use client"

import { cn } from "cn"
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
  TimeField as AriaTimeField,
  composeRenderProps,
  type DateFieldProps,
  type DateInputProps,
  type DateValue,
  type TimeFieldProps,
  type TimeValue,
} from "react-aria-components"

import { AriaInputGroup, FieldChrome, type FieldChromeProps } from "@/ds/ui/aria-field"
import { fieldVariants } from "@/ds/ui/field"

// Segments are the pill's text control: data-slot="input-group-control" turns on InputGroup's focus
// ring (they are contenteditable, so a click counts as focus-visible) and their aria-invalid its error ring.
function DateInput({ className, ...props }: Omit<DateInputProps, "children">) {
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
          segment={segment}
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
    <AriaDateField
      data-slot="date-field"
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
    </AriaDateField>
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
