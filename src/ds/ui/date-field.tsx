"use client"

import * as React from "react"
import { cn } from "cn"
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
  FieldError,
  Label,
  Text,
  TimeField as AriaTimeField,
  composeRenderProps,
  type DateFieldProps,
  type DateInputProps,
  type DateValue,
  type TimeFieldProps,
  type TimeValue,
  type ValidationResult,
} from "react-aria-components"

// Chrome shared by the kit's React Aria fields (date-picker.tsx and number-field.tsx use it too)
// so they look identical to a Base UI field: the layout, label, description and error classes of
// field.tsx, and the pill of input-group.tsx driven by React Aria's data-* states.
// Requires an ancestor I18nProvider (react-aria-components); without one React Aria uses
// navigator.language, so an en-US browser shows and parses dates month-first.
const fieldClassName =
  "group/field flex w-full flex-col gap-3 data-[invalid=true]:text-destructive"

// Like InputGroup, the pill rings while its text control (a segment or the input) has focus, not
// while a button inside it does (the button draws its own ring), and an invalid pill stays red.
const fieldGroupClassName =
  "relative flex h-9 w-full min-w-0 items-center rounded-4xl border border-input bg-input/30 transition-colors outline-none has-[[role=spinbutton]:focus,input:focus]:not-data-invalid:border-ring has-[[role=spinbutton]:focus,input:focus]:not-data-invalid:ring-[3px] has-[[role=spinbutton]:focus,input:focus]:not-data-invalid:ring-ring/50 data-invalid:border-destructive data-invalid:ring-[3px] data-invalid:ring-destructive/20 data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:data-invalid:ring-destructive/40"

type FieldChromeProps = {
  label?: React.ReactNode
  description?: React.ReactNode
  /** Overrides the built-in validation message (e.g. "Value must be 01/04/2026 or later"). */
  errorMessage?:
    | React.ReactNode
    | ((validation: ValidationResult) => React.ReactNode)
}

function FieldChrome({
  label,
  description,
  errorMessage,
  children,
}: FieldChromeProps & { children: React.ReactNode }) {
  return (
    <>
      {label && (
        <Label
          data-slot="field-label"
          className="flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50"
        >
          {label}
        </Label>
      )}
      {children}
      {description && (
        <Text
          slot="description"
          data-slot="field-description"
          className="text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary"
        >
          {description}
        </Text>
      )}
      <FieldError
        data-slot="field-error"
        className="text-sm font-normal text-destructive"
      >
        {(validation) => {
          const message =
            typeof errorMessage === "function"
              ? errorMessage(validation)
              : (errorMessage ?? validation.defaultChildren)
          // React Aria's FieldError drops role, so the live region goes inside it, mounting with
          // the message like field.tsx's role="alert".
          return message == null ? null : <span role="alert">{message}</span>
        }}
      </FieldError>
    </>
  )
}

function DateInput({ className, ...props }: Omit<DateInputProps, "children">) {
  return (
    <AriaDateInput
      data-slot="date-input"
      className={composeRenderProps(className, (className) =>
        cn("flex min-w-0 items-center px-3 text-base md:text-sm", className)
      )}
      {...props}
    >
      {(segment) => (
        <DateSegment
          data-slot="date-segment"
          segment={segment}
          className="rounded-md px-0.5 tabular-nums outline-none data-focused:bg-primary data-focused:text-primary-foreground data-placeholder:not-data-focused:text-muted-foreground data-[type=literal]:px-0 data-[type=literal]:whitespace-pre"
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
        cn(fieldClassName, className)
      )}
      {...props}
    >
      <FieldChrome
        label={label}
        description={description}
        errorMessage={errorMessage}
      >
        <DateInput className={fieldGroupClassName} />
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
        cn(fieldClassName, className)
      )}
      {...props}
    >
      <FieldChrome
        label={label}
        description={description}
        errorMessage={errorMessage}
      >
        <DateInput className={fieldGroupClassName} />
      </FieldChrome>
    </AriaTimeField>
  )
}

export {
  DateField,
  DateInput,
  FieldChrome,
  TimeField,
  fieldClassName,
  fieldGroupClassName,
  type FieldChromeProps,
}
