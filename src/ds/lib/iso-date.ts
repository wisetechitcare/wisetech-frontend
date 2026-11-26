import { parseDate, type CalendarDate, type DateValue } from "@internationalized/date"

/** A calendar day as ISO `YYYY-MM-DD` (no time, no time zone). `''` means no date. */
export type IsoDate = string

export type IsoDateRange = { start: IsoDate; end: IsoDate }

/** Day bounds and rules for a picker, in ISO. */
export type IsoDateConstraints = {
  /** Earliest pickable day, `YYYY-MM-DD`. */
  minValue?: IsoDate
  /** Latest pickable day, `YYYY-MM-DD`. */
  maxValue?: IsoDate
  /** Days that cannot be picked (weekends, holidays). Receives `YYYY-MM-DD`. */
  isDateUnavailable?: (date: IsoDate) => boolean
}

/** A year typed digit by digit passes through 0002, 0020, 0202 on its way to 2025. */
const MIN_COMPLETE_YEAR = 1000

/** Strict ISO → CalendarDate; null when empty, malformed or impossible (e.g. `2023-02-29`). */
export function parseIsoDate(value: IsoDate | null | undefined): CalendarDate | null {
  if (!value) return null
  try {
    return parseDate(value)
  } catch {
    return null
  }
}

/** False while the user is still typing the year. */
export function isCompleteDate(date: DateValue): boolean {
  return date.year >= MIN_COMPLETE_YEAR
}

/** ISO constraints → the CalendarDate props React Aria pickers take. */
export function toCalendarConstraints({ minValue, maxValue, isDateUnavailable }: IsoDateConstraints) {
  return {
    minValue: parseIsoDate(minValue) ?? undefined,
    maxValue: parseIsoDate(maxValue) ?? undefined,
    isDateUnavailable: isDateUnavailable
      ? (date: DateValue) => isDateUnavailable(date.toString())
      : undefined,
  }
}

/** True when `date` is inside the bounds and not blocked — the same rule the calendar applies to clicks. */
export function isAllowedDate(date: DateValue, { minValue, maxValue, isDateUnavailable }: IsoDateConstraints): boolean {
  const min = parseIsoDate(minValue)
  const max = parseIsoDate(maxValue)
  if (min && date.compare(min) < 0) return false
  if (max && date.compare(max) > 0) return false
  return !isDateUnavailable?.(date.toString())
}
