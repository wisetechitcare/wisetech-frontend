"use client"

import * as React from "react"
import type { CalendarDate } from "@internationalized/date"
import type { RangeValue } from "@animate-ui/react/primitives/react-aria"

import {
  DatePicker,
  DateRangePicker,
  type KitDatePickerProps,
  type KitDateRangePickerProps,
} from "@/ds/ui/date-picker"

import {
  isCompleteDate,
  parseIsoDate,
  toCalendarConstraints,
  type IsoDate,
  type IsoDateConstraints,
  type IsoDateRange,
} from "@/ds/lib/iso-date"

/**
 * The kit pickers with ISO strings in and out — the everyday way to put a date on a form:
 *
 *   <DatePickerField value={date} onChange={setDate} />            // "2026-10-28", "" when cleared
 *   <DateRangePickerField value={range} onChange={setRange} />     // { start, end } or null
 *
 * Same calendar, popover and props as DatePicker / DateRangePicker; only the value-shaped props
 * (value, min/max, unavailable days, placeholder, presets) take `YYYY-MM-DD` instead of CalendarDate.
 * A year typed digit by digit (0002 → 2025) is held back until complete, so forms never see it.
 */

type CalendarDateProps =
  | "value"
  | "defaultValue"
  | "onChange"
  | "minValue"
  | "maxValue"
  | "isDateUnavailable"
  | "placeholderValue"
  | "granularity"
  | "hourCycle"
  | "hideTimeZone"

interface IsoPickerProps extends IsoDateConstraints {
  /** Day the calendar opens on while empty, `YYYY-MM-DD`. */
  placeholderValue?: IsoDate
}

export interface DatePickerFieldProps
  extends Omit<KitDatePickerProps<CalendarDate>, CalendarDateProps>,
    IsoPickerProps {
  /** `YYYY-MM-DD`; empty, null or undefined shows an empty field. */
  value: IsoDate | null | undefined
  /** `YYYY-MM-DD`, or `''` once cleared. */
  onChange: (value: IsoDate) => void
}

export type IsoDateRangePreset = {
  label: string
  value: IsoDateRange
  /** Native tooltip on the preset control. */
  title?: string
}

export interface DateRangePickerFieldProps
  extends Omit<KitDateRangePickerProps<CalendarDate>, CalendarDateProps | "presets" | "canConfirm">,
    IsoPickerProps {
  value: IsoDateRange | null | undefined
  /** Both ends as `YYYY-MM-DD`, or null once cleared. With `confirmSelection`, only on OK. */
  onChange: (value: IsoDateRange | null) => void
  /** One-click ranges under the calendar, in ISO. */
  presets?: IsoDateRangePreset[]
}

const toCalendarRange = (range: IsoDateRange | null | undefined): RangeValue<CalendarDate> | null => {
  const start = parseIsoDate(range?.start)
  const end = parseIsoDate(range?.end)
  return start && end ? { start, end } : null
}

const isCompleteRange = (range: RangeValue<CalendarDate> | null): boolean =>
  Boolean(range && isCompleteDate(range.start) && isCompleteDate(range.end))

function useCalendarConstraints({ minValue, maxValue, isDateUnavailable, placeholderValue }: IsoPickerProps) {
  return React.useMemo(
    () => ({
      ...toCalendarConstraints({ minValue, maxValue, isDateUnavailable }),
      placeholderValue: parseIsoDate(placeholderValue) ?? undefined,
    }),
    [minValue, maxValue, isDateUnavailable, placeholderValue],
  )
}

function DatePickerField({
  value,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  placeholderValue,
  onBlur,
  ...props
}: DatePickerFieldProps) {
  const constraints = useCalendarConstraints({ minValue, maxValue, isDateUnavailable, placeholderValue })
  const committed = React.useMemo(() => parseIsoDate(value), [value])
  // `undefined` follows `value`; otherwise a half-typed year the form must not see yet.
  const [typing, setTyping] = React.useState<CalendarDate | null | undefined>(undefined)

  return (
    <DatePicker<CalendarDate>
      {...props}
      {...constraints}
      value={typing !== undefined ? typing : committed}
      onChange={(next) => {
        if (next && !isCompleteDate(next)) {
          setTyping(next)
          return
        }
        setTyping(undefined)
        onChange(next ? next.toString() : "")
      }}
      onBlur={(event) => {
        setTyping(undefined)
        onBlur?.(event)
      }}
    />
  )
}

function DateRangePickerField({
  value,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  placeholderValue,
  presets,
  confirmSelection = false,
  onOpenChange,
  onConfirm,
  onBlur,
  ...props
}: DateRangePickerFieldProps) {
  const constraints = useCalendarConstraints({ minValue, maxValue, isDateUnavailable, placeholderValue })
  const startIso = value?.start
  const endIso = value?.end
  const committed = React.useMemo(
    () => toCalendarRange(startIso && endIso ? { start: startIso, end: endIso } : null),
    [startIso, endIso],
  )
  const kitPresets = React.useMemo(
    () =>
      presets?.flatMap(({ label, value: range, title }) => {
        const calendarRange = toCalendarRange(range)
        return calendarRange ? [{ label, title, value: calendarRange }] : []
      }),
    [presets],
  )

  // `undefined` follows `value`; otherwise a half-typed year, or the confirm-mode draft awaiting OK.
  const [local, setLocal] = React.useState<RangeValue<CalendarDate> | null | undefined>(undefined)
  const localRef = React.useRef<RangeValue<CalendarDate> | null | undefined>(undefined)
  const openRef = React.useRef<boolean>(false)
  const confirmedRef = React.useRef<boolean>(false)
  const current = local !== undefined ? local : committed

  const hold = (next: RangeValue<CalendarDate> | null | undefined) => {
    localRef.current = next
    setLocal(next)
  }

  const commit = (next: RangeValue<CalendarDate> | null) => {
    hold(undefined)
    onChange(next ? { start: next.start.toString(), end: next.end.toString() } : null)
  }

  return (
    <DateRangePicker<CalendarDate>
      {...props}
      {...constraints}
      presets={kitPresets}
      confirmSelection={confirmSelection}
      canConfirm={isCompleteRange(current)}
      value={current}
      onChange={(next) => {
        const isDraft = confirmSelection && openRef.current
        if (isDraft || (next && !isCompleteRange(next))) hold(next)
        else commit(next)
      }}
      onOpenChange={(isOpen) => {
        openRef.current = isOpen
        if (isOpen) {
          confirmedRef.current = false
        } else if (confirmSelection) {
          const draft = localRef.current
          if (confirmedRef.current && draft !== undefined) commit(draft)
          else hold(undefined)
        }
        onOpenChange?.(isOpen)
      }}
      onConfirm={() => {
        confirmedRef.current = true
        onConfirm?.()
      }}
      onBlur={(event) => {
        if (!openRef.current) hold(undefined)
        onBlur?.(event)
      }}
    />
  )
}

export { DatePickerField, DateRangePickerField }
