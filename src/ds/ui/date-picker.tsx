"use client"

import * as React from "react"
import { cn } from "cn"
import { CalendarDaysIcon, XIcon } from "lucide-react"
import {
  Button,
  DatePicker as AriaDatePicker,
  DatePickerStateContext,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerStateContext,
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
import { Button as KitButton, buttonVariants } from "@/ds/ui/button"
import { Calendar, RangeCalendar, type FirstDayOfWeek } from "@/ds/ui/calendar"
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

/** Empties the field. Reads whichever picker it sits in; hidden while there is nothing to clear. */
function PickerClearButton() {
  const single = React.useContext(DatePickerStateContext)
  const range = React.useContext(DateRangePickerStateContext)
  const hasValue = single ? single.value != null : Boolean(range?.value?.start || range?.value?.end)
  if (!hasValue) return null
  return (
    <KitButton
      type="button"
      variant="ghost"
      size="icon-sm"
      data-slot="date-picker-clear"
      aria-label="Clear"
      className="text-muted-foreground"
      onClick={() => {
        if (single) single.setValue(null)
        else range?.setValue(null)
      }}
    >
      <XIcon />
    </KitButton>
  )
}

// popover.tsx's surface on React Aria's Popover; padding/width match PopoverContent so chrome doesn't spill.
function PickerPopover({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Popover
      data-slot="popover-content"
      placement="bottom"
      // 4px below the pill, like popover.tsx: it anchors to the Group, 1px inside the pill's border.
      offset={5}
      className={cn(
        popoverSurfaceClassName,
        "z-(--z-popover) w-80 origin-(--trigger-anchor-point) overflow-x-hidden p-3",
        className,
      )}
    >
      <Dialog className="flex min-w-0 flex-col gap-3 outline-none">{children}</Dialog>
    </Popover>
  )
}

/** Calendar settings shared by every picker: single, range and the fiscal-year field. */
type PickerCalendarOptions = {
  /** First day of the week. Default Monday (the calendar engine's default). */
  firstDayOfWeek?: FirstDayOfWeek
  /** Hide adjacent-month days; the week grid keeps its shape. Default true in pickers. */
  hideOutsideDays?: boolean
  /** Show the weekend columns. Default true; false removes them from the grid. */
  showWeekends?: boolean
  /** Let the calendar title open the month and year grids. Default true. */
  showMonthYearSelect?: boolean
  /** Calendar grid locale (month names, day labels). Defaults to the app locale. */
  calendarLocale?: string
  /** Show a clear button in the field while it holds a value. */
  isClearable?: boolean
}

const PICKER_HIDES_OUTSIDE_DAYS = true

const NO_WEEKENDS_POPOVER_CLASS = "w-60"

type KitDatePickerProps<T extends DateValue> = DatePickerProps<T> & FieldChromeProps & PickerCalendarOptions

// Values are @internationalized/date CalendarDate (a calendar day, no time zone). Cross the API
// boundary with value.toString() → 'YYYY-MM-DD'; a JS Date round-trip shifts days across IST/UTC.
// onChange fires per keystroke as in DateField (a typed year emits 0002-… first): act on blur or
// submit, or use DatePickerField, which takes and returns ISO strings and holds partial years back.
// The DateInput is flex-1 so a click in the pill's empty part lands on a segment; on the
// bare Group React Aria would focus its last tabbable element, the calendar button.
function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  firstDayOfWeek,
  hideOutsideDays = PICKER_HIDES_OUTSIDE_DAYS,
  showWeekends,
  showMonthYearSelect,
  calendarLocale,
  isClearable = false,
  ...props
}: KitDatePickerProps<T>) {
  const { locale } = useLocale()
  const canClear = isClearable && !props.isDisabled && !props.isReadOnly
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
            {canClear && <PickerClearButton />}
            <PickerTrigger />
          </Group>
        </AriaInputGroup>
      </FieldChrome>
      <PickerPopover className={showWeekends === false ? NO_WEEKENDS_POPOVER_CLASS : undefined}>
        <I18nProvider locale={calendarLocale ?? locale}>
          <Calendar
            className="w-full max-w-full p-0"
            firstDayOfWeek={firstDayOfWeek}
            hideOutsideDays={hideOutsideDays}
            showWeekends={showWeekends}
            showMonthYearSelect={showMonthYearSelect}
          />
        </I18nProvider>
      </PickerPopover>
    </AriaDatePicker>
    </DisplayDateLocale>
  )
}

/** A one-click range under the calendar (e.g. "Apr–Mar" for a fiscal year, "This month"). */
type DateRangePreset = {
  label: string
  value: { start: DateValue; end: DateValue }
  /** Native tooltip on the preset control (no visual chrome change). */
  title?: string
}

type DateRangePickerExtras = PickerCalendarOptions & {
  presets?: DateRangePreset[]
  /**
   * Keep the popover open after day picks and show Cancel / OK.
   * Leave-style ranges leave this off (close on complete selection). This picker still reports every
   * pick through onChange; DateRangePickerField holds them as a draft that Cancel discards.
   */
  confirmSelection?: boolean
  /** When false, preset clicks set the value but leave the popover open. Default: close unless confirming. */
  closeOnPresetSelect?: boolean
  /** Optional chrome above the calendar / body (hints, bound toggles). */
  popoverHeader?: React.ReactNode
  /** Replaces the range calendar when set (e.g. free-text keyboard panel). */
  popoverBody?: React.ReactNode
  /** Extra controls on the confirm footer’s leading side (mode toggle, etc.). */
  popoverFooterStart?: React.ReactNode
  /** Enables the OK control while `confirmSelection` is on. */
  canConfirm?: boolean
  /** Called before the popover closes when the user presses OK. */
  onConfirm?: () => void
  /** Called before the popover closes when the user presses Cancel. */
  onCancel?: () => void
}

type KitDateRangePickerProps<T extends DateValue> = DateRangePickerProps<T> & FieldChromeProps & DateRangePickerExtras

/**
 * WiseTech: quick ranges in the popover, below the calendar. Picking one sets the whole range through the
 * picker's own state (so validation, onChange and the typed fields all follow). Closing is optional.
 */
function RangePresets({
  presets,
  closeOnSelect = true,
  className,
}: {
  presets?: DateRangePreset[]
  closeOnSelect?: boolean
  className?: string
}) {
  const state = React.useContext(DateRangePickerStateContext)
  if (!presets?.length || !state) return null
  return (
    <div data-slot="date-range-presets" className={cn("flex flex-wrap gap-1.5", className)}>
      {presets.map((preset) => (
        <KitButton
          key={preset.label}
          variant="outline"
          size="xs"
          title={preset.title}
          onClick={() => {
            state.setValue(preset.value)
            if (closeOnSelect) state.close()
          }}
        >
          {preset.label}
        </KitButton>
      ))}
    </div>
  )
}

function RangeConfirmFooter({
  presets,
  closeOnPresetSelect,
  footerStart,
  canConfirm = false,
  onConfirm,
  onCancel,
}: {
  presets?: DateRangePreset[]
  closeOnPresetSelect: boolean
  footerStart?: React.ReactNode
  canConfirm?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}) {
  const state = React.useContext(DateRangePickerStateContext)
  if (!state) return null

  return (
    <div
      data-slot="date-range-confirm-footer"
      className="flex items-center gap-2 border-t border-border pt-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {footerStart}
        <RangePresets presets={presets} closeOnSelect={closeOnPresetSelect} />
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <KitButton
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            onCancel?.()
            state.close()
          }}
        >
          Cancel
        </KitButton>
        <KitButton
          type="button"
          variant="link"
          size="sm"
          disabled={!canConfirm}
          onClick={() => {
            onConfirm?.()
            state.close()
          }}
        >
          OK
        </KitButton>
      </div>
    </div>
  )
}

function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  presets,
  firstDayOfWeek,
  hideOutsideDays = PICKER_HIDES_OUTSIDE_DAYS,
  showWeekends,
  showMonthYearSelect,
  calendarLocale,
  isClearable = false,
  confirmSelection = false,
  closeOnPresetSelect = !confirmSelection,
  popoverHeader,
  popoverBody,
  popoverFooterStart,
  canConfirm = false,
  onConfirm,
  onCancel,
  shouldCloseOnSelect,
  ...props
}: KitDateRangePickerProps<T>) {
  const { locale } = useLocale()
  const keepOpen = confirmSelection || shouldCloseOnSelect === false
  const canClear = isClearable && !props.isDisabled && !props.isReadOnly

  return (
    <DisplayDateLocale>
    <AriaDateRangePicker
      data-slot="date-range-picker"
      className={composeRenderProps(className, (className) =>
        cn(fieldVariants(), className)
      )}
      shouldCloseOnSelect={keepOpen ? false : shouldCloseOnSelect}
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
            <DateInput slot="start" className="min-w-0 flex-1 pe-1" literal={DISPLAY_DATE_SEPARATOR} />
            <span aria-hidden="true" className="shrink-0 text-muted-foreground">
              –
            </span>
            <DateInput slot="end" className="min-w-0 flex-1 ps-1" literal={DISPLAY_DATE_SEPARATOR} />
            {canClear && <PickerClearButton />}
            <PickerTrigger />
          </Group>
        </AriaInputGroup>
      </FieldChrome>
      <PickerPopover className={showWeekends === false ? NO_WEEKENDS_POPOVER_CLASS : undefined}>
        {popoverHeader ? <div className="min-w-0">{popoverHeader}</div> : null}
        <div className="min-w-0">
          {popoverBody !== undefined ? (
            popoverBody
          ) : (
            <I18nProvider locale={calendarLocale ?? locale}>
              <RangeCalendar
                className="w-full max-w-full p-0"
                firstDayOfWeek={firstDayOfWeek}
                hideOutsideDays={hideOutsideDays}
                showWeekends={showWeekends}
                showMonthYearSelect={showMonthYearSelect}
              />
            </I18nProvider>
          )}
        </div>
        {confirmSelection ? (
          <RangeConfirmFooter
            presets={presets}
            closeOnPresetSelect={closeOnPresetSelect}
            footerStart={popoverFooterStart}
            canConfirm={canConfirm}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : (
          <RangePresets
            presets={presets}
            closeOnSelect={closeOnPresetSelect}
            className="border-t border-border pt-3"
          />
        )}
      </PickerPopover>
    </AriaDateRangePicker>
    </DisplayDateLocale>
  )
}

export {
  DatePicker,
  DateRangePicker,
  type DateRangePreset,
  type KitDatePickerProps,
  type KitDateRangePickerProps,
  type PickerCalendarOptions,
}
