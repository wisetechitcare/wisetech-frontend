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
  I18nProvider,
  useLocale,
  type DatePickerProps,
  type DateRangePickerProps,
  type DateValue,
} from "@animate-ui/react/primitives/react-aria"

import { AriaInputGroup, FieldChrome, type FieldChromeProps } from "@/ds/ui/aria-field"
import { buttonVariants } from "@/ds/ui/button"
import { Calendar, RangeCalendar } from "@/ds/ui/calendar"
import { DateInput, DisplayDateLocale, DISPLAY_DATE_SEPARATOR } from "@/ds/ui/date-field"
import { fieldVariants } from "@/ds/ui/field"
import { popoverSurfaceClassName } from "@/ds/ui/popover"

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

// popover.tsx's surface on React Aria's Popover; only the motion classes are React Aria's own.
function PickerPopover({ children }: { children: React.ReactNode }) {
  return (
    <Popover
      data-slot="popover-content"
      placement="bottom start"
      // 4px below the pill, like popover.tsx: it anchors to the Group, 1px inside the pill's border.
      offset={5}
      className={cn(popoverSurfaceClassName, "z-[1400] origin-(--trigger-anchor-point)")}
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
  const { locale } = useLocale()
  return (
    <DisplayDateLocale>
    <AriaDatePicker
      data-slot="date-picker"
      className={composeRenderProps(className, (className) =>
        cn(fieldVariants(), className)
      )}
      {...props}
    >
      <FieldChrome
        label={label}
        description={description}
        errorMessage={errorMessage}
      >
        <AriaInputGroup>
          <Group data-slot="date-picker-group" className="flex h-full w-full min-w-0 items-center">
            <DateInput className="flex-1" literal={DISPLAY_DATE_SEPARATOR} />
            <PickerTrigger />
          </Group>
        </AriaInputGroup>
      </FieldChrome>
      <PickerPopover>
        <I18nProvider locale={locale}><Calendar /></I18nProvider>
      </PickerPopover>
    </AriaDatePicker>
    </DisplayDateLocale>
  )
}

function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateRangePickerProps<T> & FieldChromeProps) {
  const { locale } = useLocale()
  return (
    <DisplayDateLocale>
    <AriaDateRangePicker
      data-slot="date-range-picker"
      className={composeRenderProps(className, (className) =>
        cn(fieldVariants(), className)
      )}
      {...props}
    >
      <FieldChrome
        label={label}
        description={description}
        errorMessage={errorMessage}
      >
        <AriaInputGroup>
          <Group
            data-slot="date-range-picker-group"
            className="flex h-full w-full min-w-0 items-center"
          >
            <DateInput slot="start" className="pe-1" literal={DISPLAY_DATE_SEPARATOR} />
            <span aria-hidden="true" className="text-muted-foreground">
              –
            </span>
            <DateInput slot="end" className="flex-1 ps-1" literal={DISPLAY_DATE_SEPARATOR} />
            <PickerTrigger />
          </Group>
        </AriaInputGroup>
      </FieldChrome>
      <PickerPopover>
        <I18nProvider locale={locale}><RangeCalendar /></I18nProvider>
      </PickerPopover>
    </AriaDateRangePicker>
    </DisplayDateLocale>
  )
}

export { DatePicker, DateRangePicker }
