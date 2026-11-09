import * as React from "react"
import { parseDate, type CalendarDate } from "@internationalized/date"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/ds/ui/button-group"
import { Calendar, type CalendarGranularity } from "@/ds/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/ds/ui/popover"

export type PeriodUnit = "day" | "week" | "month" | "year" | "period"

/** 'YYYY-MM-DD' → CalendarDate, or null for empty/invalid input (never throws into a render). */
function toCalendarDate(value?: string): CalendarDate | null {
  if (!value) return null
  try {
    return parseDate(value.slice(0, 10))
  } catch {
    return null
  }
}

const CHOOSE: Record<CalendarGranularity, string> = { day: "choose a date", month: "choose a month", year: "choose a year" }

/**
 * Step through periods — ‹ October 2026 › — on attendance, payroll, timesheet and reimbursement screens.
 *
 * One connected control: the arrows step, the label in the middle says where you are. Give `onPick` and
 * the label becomes a button that opens the kit Calendar at the matching `pickGranularity` — the month
 * grid for a monthly view, the year grid for a yearly one — so October → January is one click, not three.
 * Picks are emitted as 'YYYY-MM-DD' at the START of the period (the 1st of the month, 1 Jan), so callers can
 * use the value as an anchor directly. The label is announced when it changes.
 *
 * Below `sm` it fills its row (the label takes the slack) so the arrows stay at the thumb's reach.
 */
export function PeriodNavigator({
  label,
  secondaryLabel,
  onPrevious,
  onNext,
  onToday,
  disablePrevious,
  disableNext,
  unit = "month",
  previousLabel,
  nextLabel,
  onPick,
  pickValue,
  pickGranularity = "day",
  pickMin,
  pickMax,
  className,
  labelClassName,
}: {
  label: string
  /** e.g. "22 working days" */
  secondaryLabel?: string
  onPrevious: () => void
  onNext: () => void
  /** Shows a "Today" button when given. */
  onToday?: () => void
  disablePrevious?: boolean
  disableNext?: boolean
  /** Names the buttons: "Previous month", "Next week"… */
  unit?: PeriodUnit
  /** Overrides the arrow names, e.g. "Previous fortnight". */
  previousLabel?: string
  nextLabel?: string
  /** Makes the label a jump picker; receives 'YYYY-MM-DD' at the start of the picked period. */
  onPick?: (value: string) => void
  /** The current period as 'YYYY-MM-DD' — what the picker opens on and highlights. */
  pickValue?: string
  pickGranularity?: CalendarGranularity
  /** 'YYYY-MM-DD' bounds; periods wholly outside them are disabled in the picker. */
  pickMin?: string
  pickMax?: string
  className?: string
  /** Width/colour of the middle segment, e.g. `min-w-40` so the arrows don't shift as labels change. */
  labelClassName?: string
}) {
  const [open, setOpen] = React.useState(false)
  const middle = cn(
    "min-w-32 flex-1 justify-center px-3 text-sm font-semibold tabular sm:flex-none",
    labelClassName,
  )

  return (
    <div data-slot="period-navigator" className={cn("flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:w-fit", className)}>
      <ButtonGroup className="w-full min-w-0 sm:w-fit">
        <Button variant="outline" size="icon" aria-label={previousLabel ?? `Previous ${unit}`} disabled={disablePrevious} onClick={onPrevious}>
          <ChevronLeft aria-hidden />
        </Button>

        {onPick ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={<Button variant="outline" className={cn(middle, "min-w-0 gap-1.5")} />}
              data-slot="period-navigator-label"
            >
              {/* The visible label starts the accessible name, so "click October 2026" works by voice. */}
              <span className="truncate" aria-live="polite">
                {label}
              </span>
              <span className="sr-only">, {CHOOSE[pickGranularity]}</span>
              <ChevronDown aria-hidden className="size-3.5 opacity-60" />
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-0">
              <Calendar
                aria-label={`${label}, ${CHOOSE[pickGranularity]}`}
                granularity={pickGranularity}
                value={toCalendarDate(pickValue)}
                minValue={toCalendarDate(pickMin)}
                maxValue={toCalendarDate(pickMax)}
                autoFocus
                onChange={(next) => {
                  if (!next) return
                  onPick(next.toString())
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <ButtonGroupText data-slot="period-navigator-label" className={cn(middle, "min-w-0")}>
            <span className="truncate" aria-live="polite">
              {label}
            </span>
          </ButtonGroupText>
        )}

        <Button variant="outline" size="icon" aria-label={nextLabel ?? `Next ${unit}`} disabled={disableNext} onClick={onNext}>
          <ChevronRight aria-hidden />
        </Button>
      </ButtonGroup>

      {secondaryLabel && <span className="truncate text-xs text-muted-foreground">{secondaryLabel}</span>}
      {onToday && (
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
      )}
    </div>
  )
}
