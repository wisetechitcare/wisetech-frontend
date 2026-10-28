"use client"

import * as React from "react"
import { cn } from "cn"
import { CalendarDaysIcon } from "lucide-react"
import {
  Button,
  DatePicker as AriaDatePicker,
  DateRangePicker as AriaDateRangePicker,
  Dialog,
  Group,
  Popover,
  composeRenderProps,
  type DatePickerProps,
  type DateRangePickerProps,
  type DateValue,
} from "react-aria-components"

import { buttonVariants } from "@/ds/ui/button"
import { Calendar, RangeCalendar } from "@/ds/ui/calendar"
import {
  DateInput,
  FieldChrome,
  fieldClassName,
  fieldGroupClassName,
  type FieldChromeProps,
} from "@/ds/ui/date-field"

function PickerTrigger() {
  return (
    <Button
      data-slot="date-picker-trigger"
      className={buttonVariants({
        variant: "ghost",
        size: "icon-sm",
        className: "me-0.5 text-muted-foreground",
      })}
    >
      <CalendarDaysIcon />
    </Button>
  )
}

// The popover.tsx surface (radius, shadow, ring, motion) on React Aria's Popover.
function PickerPopover({ children }: { children: React.ReactNode }) {
  return (
    <Popover
      data-slot="popover-content"
      placement="bottom start"
      offset={4}
      className="z-50 origin-(--trigger-anchor-point) rounded-2xl bg-popover text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/5 outline-hidden duration-100 data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
    >
      <Dialog className="outline-none">{children}</Dialog>
    </Popover>
  )
}

// Values are @internationalized/date CalendarDate (a calendar day, no time zone). Cross the API
// boundary with value.toString() → 'YYYY-MM-DD'; a JS Date round-trip shifts days across IST/UTC.
// onChange fires per keystroke as in DateField (a typed year emits 0002-… first): act on blur or
// submit. The DateInput is flex-1 so a click in the pill's empty part lands on a segment; on the
// bare Group React Aria would focus its last tabbable element, the calendar button.
function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DatePickerProps<T> & FieldChromeProps) {
  return (
    <AriaDatePicker
      data-slot="date-picker"
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
        <Group data-slot="date-picker-group" className={fieldGroupClassName}>
          <DateInput className="flex-1" />
          <PickerTrigger />
        </Group>
      </FieldChrome>
      <PickerPopover>
        <Calendar />
      </PickerPopover>
    </AriaDatePicker>
  )
}

function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateRangePickerProps<T> & FieldChromeProps) {
  return (
    <AriaDateRangePicker
      data-slot="date-range-picker"
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
        <Group
          data-slot="date-range-picker-group"
          className={fieldGroupClassName}
        >
          <DateInput slot="start" className="pe-1" />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <DateInput slot="end" className="flex-1 ps-1" />
          <PickerTrigger />
        </Group>
      </FieldChrome>
      <PickerPopover>
        <RangeCalendar />
      </PickerPopover>
    </AriaDateRangePicker>
  )
}

export { DatePicker, DateRangePicker }
