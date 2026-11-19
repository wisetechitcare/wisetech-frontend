"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { motion } from "motion/react"
import {
  Button,
  Calendar as AriaCalendar,
  CalendarGridHeader as AriaCalendarGridHeader,
  RangeCalendar as AriaRangeCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarStateContext,
  RangeCalendarStateContext,
  composeRenderProps,
  useLocale,
  type CalendarProps,
  type DateValue,
  type RangeCalendarProps,
} from "react-aria-components"

import { toneStyle, type Tone } from "@/ds/lib/tone"
import { buttonVariants } from "@/ds/ui/button"

/**
 * THE calendar engine. Every calendar in the kit — Calendar, RangeCalendar, DatePicker, DateRangePicker,
 * the Fiscal Year picker, the Apply Leave month — renders this one grid and only adds its own parts:
 *
 * - `getDayState(date)` decorates days: a `tone` (any kit status, category hue or hex), a dashed `pattern`
 *   (e.g. team off), a corner `marker` (e.g. sandwich-unpaid) and a `label` (the tooltip). The engine knows
 *   nothing about leave, holidays or payroll — consumers map their rules to tones.
 * - The title is a button: days → month grid → year grid, so a far month or year is two clicks, not twenty.
 * - Month changes and view switches move smoothly (Motion; nothing moves under reduced motion).
 * - `rangeStyle`: "band" (default) — a continuous tinted band between the ends; "outline" — days keep their
 *   own tone and the range ends get a strong ring (Apply Leave, where the tone IS the information).
 * - `size`: "default" (compact pickers) or "lg" (roomy tiles for a full-screen planner).
 * - `granularity` (Calendar only): "day" (default), "month" or "year". The jump grids then COMMIT instead of
 *   drilling down: a month picker opens on the month grid and a click selects the 1st of that month; a year
 *   picker is the year grid alone. Months/years wholly outside minValue/maxValue are disabled.
 *
 * Values are @internationalized/date CalendarDate (a calendar day, no time zone). Cross the API boundary with
 * value.toString() → 'YYYY-MM-DD'; a JS Date round-trip shifts days across IST/UTC.
 */
export type DayState = {
  tone?: Tone | (string & {})
  pattern?: "solid" | "dashed"
  marker?: boolean
  label?: string
}

type EngineProps = {
  numberOfMonths?: number
  getDayState?: (date: DateValue) => DayState | undefined
  rangeStyle?: "band" | "outline"
  size?: "default" | "lg"
}

const cellVariants = cva(
  "group/day relative mt-2 aspect-square h-full w-full cursor-default rounded-(--cell-radius) p-0 text-center outline-none select-none [&:is(:first-child>[data-selected=true])>div]:rounded-l-(--cell-radius) [&:is(:last-child>[data-selected=true])>div]:rounded-r-(--cell-radius)",
  {
    variants: {
      isSelectionStart: {
        true: "relative isolate z-0 group-data-[range-style=band]/calendar:after:absolute group-data-[range-style=band]/calendar:after:inset-y-0 group-data-[range-style=band]/calendar:after:right-0 group-data-[range-style=band]/calendar:after:w-4 group-data-[range-style=band]/calendar:after:bg-primary/20 group-data-[range-style=band]/calendar:after:shadow-(--range-edge) [:last-child>&]:after:hidden",
      },
      isSelectionEnd: {
        true: "relative isolate z-0 group-data-[range-style=band]/calendar:after:absolute group-data-[range-style=band]/calendar:after:inset-y-0 group-data-[range-style=band]/calendar:after:left-0 group-data-[range-style=band]/calendar:after:w-4 group-data-[range-style=band]/calendar:after:bg-primary/20 group-data-[range-style=band]/calendar:after:shadow-(--range-edge) [:first-child>&]:after:hidden",
      },
      isUnavailable: {
        true: "text-muted-foreground opacity-50 [&>div]:line-through",
      },
      isDisabled: {
        true: "text-muted-foreground opacity-50",
      },
      isOutsideMonth: {
        true: "text-muted-foreground aria-selected:text-muted-foreground",
      },
    },
    // A one-day range has no band to join.
    compoundVariants: [{ isSelectionStart: true, isSelectionEnd: true, className: "after:hidden" }],
  }
)

const calendarClassName =
  "group/calendar w-fit bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] [--range-edge:inset_0_1px_0_var(--primary),inset_0_-1px_0_var(--primary)] data-[size=lg]:w-full data-[size=lg]:[--cell-radius:var(--radius-xl)] data-[size=lg]:[--cell-size:--spacing(11)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent"

export type CalendarGranularity = "day" | "month" | "year"

function Calendar<T extends DateValue, M extends "single" | "multiple" = "single">({
  className,
  numberOfMonths = 1,
  getDayState,
  rangeStyle = "band",
  size = "default",
  granularity = "day",
  ...props
}: Omit<CalendarProps<T, M>, "visibleDuration"> & EngineProps & { granularity?: CalendarGranularity }) {
  return (
    <AriaCalendar
      {...props}
      data-slot="calendar"
      data-size={size}
      data-range-style={rangeStyle}
      data-granularity={granularity}
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) => cn(calendarClassName, className))}
    >
      <CalendarInner numberOfMonths={numberOfMonths} getDayState={getDayState} granularity={granularity} />
    </AriaCalendar>
  )
}

function RangeCalendar<T extends DateValue>({
  className,
  numberOfMonths = 1,
  getDayState,
  rangeStyle = "band",
  size = "default",
  ...props
}: Omit<RangeCalendarProps<T>, "visibleDuration"> & EngineProps) {
  return (
    <AriaRangeCalendar
      {...props}
      data-slot="calendar"
      data-size={size}
      data-range-style={rangeStyle}
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) => cn(calendarClassName, className))}
    >
      <CalendarInner numberOfMonths={numberOfMonths} getDayState={getDayState} isRange />
    </AriaRangeCalendar>
  )
}

// cn, not buttonVariants({ className }): the default size's h-10 px-4 must be merged away.
const navButtonClassName = cn(buttonVariants({ variant: "ghost" }), "size-(--cell-size) p-0 select-none")
const pickButtonClassName = cn(
  buttonVariants({ variant: "ghost" }),
  "h-10 w-full rounded-(--radius-xl) px-2 text-sm font-normal data-[current=true]:bg-primary data-[current=true]:text-primary-foreground data-[current=true]:hover:bg-primary data-disabled:pointer-events-none data-disabled:opacity-40"
)

/** Motion for a month change (slides the way you moved) and a view switch (soft scale-in). */
const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.7 } as const

type View = "days" | "months" | "years"
const FLOOR: Record<CalendarGranularity, View> = { day: "days", month: "months", year: "years" }

function CalendarInner({
  numberOfMonths,
  isRange,
  getDayState,
  granularity = "day",
}: {
  numberOfMonths: number
  isRange?: boolean
  getDayState?: EngineProps["getDayState"]
  granularity?: CalendarGranularity
}) {
  const single = React.useContext(CalendarStateContext)
  const range = React.useContext(RangeCalendarStateContext)
  const state = (isRange ? range : single)!
  const { locale } = useLocale()
  // The lowest view this calendar goes to; the title cycles floor -> ... -> years -> back to the floor.
  const floor = FLOOR[granularity]
  const [view, setViewState] = React.useState<View>(floor)
  // Only a view the user SWITCHED to scales in; the view a picker opens on just appears (its popover
  // already animates, and a second entrance on mount would read as lag).
  const [switched, setSwitched] = React.useState(false)
  const setView = (next: View) => {
    setSwitched(true)
    setViewState(next)
  }
  const focused = state.focusedDate
  // In a month/year picker the highlighted tile is the VALUE; in a day calendar it is the focused month.
  const raw = !isRange && floor !== "days" ? single?.value : null
  // Multiple-selection calendars hold an array; a month/year picker is single-value only.
  const picked = raw && !Array.isArray(raw) ? (raw as DateValue) : null
  const { minValue, maxValue } = state
  // A period is pickable unless it lies wholly outside [minValue, maxValue].
  const outOfRange = (start: DateValue, end: DateValue) =>
    (minValue != null && end.compare(minValue) < 0) || (maxValue != null && start.compare(maxValue) > 0)
  const commit = (fields: { year: number; month: number }) => {
    const date = focused.set({ ...fields, day: 1 })
    state.setFocusedDate(date)
    single?.selectDate(date)
  }

  // Which way the month moved, so the grid slides in from that side.
  const monthKey = focused.year * 12 + focused.month
  const prevKey = React.useRef(monthKey)
  const direction = monthKey === prevKey.current ? 0 : monthKey > prevKey.current ? 1 : -1
  React.useEffect(() => {
    prevKey.current = monthKey
  }, [monthKey])

  const monthName = (m: number, style: "long" | "short") =>
    new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC" }).format(new Date(Date.UTC(2000, m - 1, 1)))
  const title = (offset: number) => {
    const d = focused.add({ months: offset })
    return `${monthName(d.month, "long")} ${d.year}`
  }
  // The year grid centres on the current year (5 before, 6 after), so nearby years are one click either way.
  const decadeStart = focused.year - 5

  const goTo = (fields: { year?: number; month?: number }) => {
    state.setFocusedDate(focused.set(fields))
  }

  // Jump views (months / years) replace the day grid; one month only — a multi-month range keeps plain titles.
  const canJump = numberOfMonths === 1
  const nextView: Record<View, View> = { days: "months", months: "years", years: floor }
  // A year picker has nowhere above its grid to go: the title is a plain label.
  const titleIsButton = canJump && floor !== "years"

  return (
    <div className="relative flex flex-col gap-4 md:flex-row">
      <div className="absolute inset-x-0 top-0 z-10 flex w-full items-center justify-between gap-1">
        {view === "days" ? (
          <>
            <Button slot="previous" data-slot="calendar-previous" className={navButtonClassName}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button slot="next" data-slot="calendar-next" className={navButtonClassName}>
              <ChevronRightIcon className="size-4" />
            </Button>
          </>
        ) : (
          <>
            {/* data-slot on every kit button: it is what opts it out of Bootstrap's Reboot (`button { border-radius: 0 }`
                and friends) in the app. Without it the month/year tiles rendered square. */}
            <Button
              slot={null}
              data-slot="calendar-previous"
              aria-label={view === "months" ? "Previous year" : "Previous years"}
              className={navButtonClassName}
              onPress={() => goTo({ year: focused.year - (view === "months" ? 1 : 12) })}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              slot={null}
              data-slot="calendar-next"
              aria-label={view === "months" ? "Next year" : "Next years"}
              className={navButtonClassName}
              onPress={() => goTo({ year: focused.year + (view === "months" ? 1 : 12) })}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </>
        )}
      </div>

      {Array.from({ length: numberOfMonths }, (_, i) => (
        <div key={i} className="flex w-full flex-col gap-4">
          <div className="flex h-(--cell-size) w-full items-center justify-center gap-1 px-(--cell-size)">
            {titleIsButton ? (
              <Button
                slot={null}
                data-slot="calendar-title"
                aria-label={
                  view === "days"
                    ? `${title(0)}, choose a month`
                    : view === "months"
                      ? `${focused.year}, choose a year`
                      : floor === "months"
                        ? "Back to months"
                        : "Back to days"
                }
                className="rounded-lg px-2 py-1 text-sm font-semibold outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                onPress={() => setView(nextView[view])}
              >
                {view === "days" ? title(0) : view === "months" ? focused.year : `${decadeStart} – ${decadeStart + 11}`}
              </Button>
            ) : (
              <span data-slot="calendar-title" className="text-sm font-semibold select-none">
                {view === "years" ? `${decadeStart} – ${decadeStart + 11}` : title(i)}
              </span>
            )}
          </div>

          {view === "days" ? (
            <motion.div
              key={`${monthKey}-${i}`}
              initial={direction === 0 ? false : { opacity: 0, x: direction * 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={SPRING}
            >
              <CalendarGrid
                // Band style: cells touch so the range reads as one continuous band. Outline style: tiles get
                // breathing room, each one a distinct day.
                className="w-full border-collapse group-data-[range-style=outline]/calendar:border-separate group-data-[range-style=outline]/calendar:[border-spacing:0.375rem_0]"
                offset={{ months: i }}
              >
                <AriaCalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </AriaCalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell date={date} className={(renderProps) => cellVariants(renderProps)}>
                      {(renderProps) => {
                        const day = renderProps.isOutsideMonth ? undefined : getDayState?.(date)
                        const isMiddle =
                          renderProps.isSelected && !renderProps.isSelectionStart && !renderProps.isSelectionEnd && isRange
                        return (
                          <div
                            title={day?.label}
                            data-today={renderProps.isToday || undefined}
                            data-tone={day?.tone ? "" : undefined}
                            data-pattern={day?.pattern}
                            data-marker={day?.marker || undefined}
                            data-selected-single={renderProps.isSelected && !isRange}
                            data-range-start={renderProps.isSelectionStart && isRange}
                            data-range-end={renderProps.isSelectionEnd && isRange}
                            data-range-middle={isMiddle}
                            style={day?.tone ? toneStyle(day.tone) : undefined}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "relative isolate z-10 flex aspect-square h-full w-full min-w-(--cell-size) flex-col gap-1 rounded-(--cell-radius) border-0 leading-none font-normal transition-[background-color,box-shadow,color] duration-150",
                              "group-data-[size=lg]/calendar:text-sm",
                              // Today: a ring (the legend's "Today"), never a fill — a fill means selected.
                              "data-today:ring-2 data-today:ring-primary data-today:ring-inset",
                              // Decorated days: a soft tint of their tone, readable ink, a hairline edge.
                              "data-tone:bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] data-tone:text-(--tone-ink) data-tone:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--tone)_28%,transparent)]",
                              "data-[pattern=dashed]:shadow-none data-[pattern=dashed]:outline-1 data-[pattern=dashed]:-outline-offset-1 data-[pattern=dashed]:outline-dashed data-[pattern=dashed]:outline-[color-mix(in_oklch,var(--tone)_60%,transparent)]",
                              // Marker: a small corner flag (e.g. sandwich-unpaid).
                              "data-marker:after:absolute data-marker:after:top-0 data-marker:after:right-0 data-marker:after:size-2.5 data-marker:after:rounded-tr-(--cell-radius) data-marker:after:bg-(--tone) data-marker:after:[clip-path:polygon(0_0,100%_0,100%_100%)]",
                              "group-data-[focus-visible=true]/day:relative group-data-[focus-visible=true]/day:z-10 group-data-[focus-visible=true]/day:border-ring group-data-[focus-visible=true]/day:ring-[3px] group-data-[focus-visible=true]/day:ring-ring/50",
                              // Band style: filled ends, a continuous tinted band between them.
                              "group-data-[range-style=band]/calendar:data-[range-end=true]:bg-primary group-data-[range-style=band]/calendar:data-[range-end=true]:text-primary-foreground group-data-[range-style=band]/calendar:data-[range-start=true]:bg-primary group-data-[range-style=band]/calendar:data-[range-start=true]:text-primary-foreground group-data-[range-style=band]/calendar:data-[range-middle=true]:rounded-none group-data-[range-style=band]/calendar:data-[range-middle=true]:bg-primary/20 group-data-[range-style=band]/calendar:data-[range-middle=true]:text-foreground group-data-[range-style=band]/calendar:data-[range-middle=true]:shadow-(--range-edge)",
                              // Outline style: days keep their tone; the ends get a strong ring.
                              "group-data-[range-style=outline]/calendar:data-[range-start=true]:ring-2 group-data-[range-style=outline]/calendar:data-[range-start=true]:ring-foreground group-data-[range-style=outline]/calendar:data-[range-start=true]:font-semibold group-data-[range-style=outline]/calendar:data-[range-end=true]:ring-2 group-data-[range-style=outline]/calendar:data-[range-end=true]:ring-foreground group-data-[range-style=outline]/calendar:data-[range-end=true]:font-semibold",
                              "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground hover:data-[selected-single=true]:bg-primary [&>span]:text-xs [&>span]:opacity-70"
                            )}
                          >
                            {renderProps.defaultChildren}
                          </div>
                        )
                      }}
                    </CalendarCell>
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </motion.div>
          ) : (
            <motion.div
              key={view}
              data-slot={`calendar-${view}`}
              initial={switched ? { opacity: 0, scale: 0.96 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING}
              className="grid grid-cols-3 gap-2"
            >
              {view === "months"
                ? Array.from({ length: 12 }, (_, m) => {
                    const start = focused.set({ month: m + 1, day: 1 })
                    const current = picked
                      ? picked.year === focused.year && picked.month === m + 1
                      : m + 1 === focused.month
                    return (
                      <Button
                        key={m}
                        slot={null}
                        data-slot="calendar-month"
                        data-current={current || undefined}
                        aria-current={picked && current ? "date" : undefined}
                        isDisabled={outOfRange(start, start.add({ months: 1 }).subtract({ days: 1 }))}
                        className={pickButtonClassName}
                        onPress={() => {
                          if (floor === "months") return commit({ year: focused.year, month: m + 1 })
                          goTo({ month: m + 1 })
                          setView("days")
                        }}
                      >
                        {/* Shows "Jan", is named "January 2026": the abbreviation is hidden from the accessible name and
                            the full name is screen-reader text, so the name never contradicts what is on screen. */}
                        <span aria-hidden>{monthName(m + 1, "short")}</span>
                        <span className="sr-only">{`${monthName(m + 1, "long")} ${focused.year}`}</span>
                      </Button>
                    )
                  })
                : Array.from({ length: 12 }, (_, k) => {
                    const year = decadeStart + k
                    const start = focused.set({ year, month: 1, day: 1 })
                    const current = picked ? picked.year === year : year === focused.year
                    return (
                      <Button
                        key={year}
                        slot={null}
                        data-slot="calendar-year"
                        data-current={current || undefined}
                        aria-current={picked && current ? "date" : undefined}
                        isDisabled={outOfRange(start, start.set({ month: 12, day: 31 }))}
                        className={pickButtonClassName}
                        onPress={() => {
                          if (floor === "years") return commit({ year, month: 1 })
                          goTo({ year })
                          setView("months")
                        }}
                      >
                        {year}
                      </Button>
                    )
                  })}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * The calendar's legend: one row per day state, drawn with the same tones the engine paints, so a legend can
 * never disagree with the grid. `today` draws the today ring.
 */
function CalendarLegend({
  items,
  className,
}: {
  items: Array<{ label: string; tone?: DayState["tone"]; pattern?: DayState["pattern"]; marker?: boolean; today?: boolean }>
  className?: string
}) {
  return (
    <ul data-slot="calendar-legend" className={cn("flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            style={item.tone ? toneStyle(item.tone) : undefined}
            className={cn(
              "relative size-3.5 shrink-0 overflow-hidden rounded-[4px]",
              item.today && "ring-2 ring-primary ring-inset",
              item.tone &&
                "bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--tone)_28%,transparent)]",
              item.pattern === "dashed" &&
                "shadow-none outline-1 -outline-offset-1 outline-dashed outline-[color-mix(in_oklch,var(--tone)_60%,transparent)]",
              item.marker &&
                "after:absolute after:top-0 after:right-0 after:size-2 after:bg-(--tone) after:[clip-path:polygon(0_0,100%_0,100%_100%)]"
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export { Calendar, RangeCalendar, CalendarLegend }
