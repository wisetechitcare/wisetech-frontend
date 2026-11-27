"use client";

import * as React from "react";
import {
  endOfMonth,
  endOfYear,
  isWeekend,
  startOfWeek,
} from "@internationalized/date";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
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
} from "react-aria-components";

import { toneStyle } from "@/ds/lib/tone";
import { buttonVariants } from "@/ds/ui/button";
import { CalendarLegend, type DayState } from "@/ds/ui/calendar-legend";
import { CalendarTitleButton } from "@/ds/ui/calendar-title-button";

export type { DayState };

type EngineProps = {
  numberOfMonths?: number;
  getDayState?: (date: DateValue) => DayState | undefined;
  rangeStyle?: "band" | "outline";
  size?: "default" | "lg";
  /** Hide adjacent-month days visually while keeping the week grid. Default shows muted outside days. */
  hideOutsideDays?: boolean;
  /** Show the weekend columns. Default true; false removes them (weekend days follow the locale). */
  showWeekends?: boolean;
  /** Let the title open the month and year grids. Default true. */
  showMonthYearSelect?: boolean;
};

const HIDE_COLUMN_CLASS: Record<number, string> = {
  1: "[&_th:nth-child(1)]:hidden [&_td:nth-child(1)]:hidden",
  2: "[&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden",
  3: "[&_th:nth-child(3)]:hidden [&_td:nth-child(3)]:hidden",
  4: "[&_th:nth-child(4)]:hidden [&_td:nth-child(4)]:hidden",
  5: "[&_th:nth-child(5)]:hidden [&_td:nth-child(5)]:hidden",
  6: "[&_th:nth-child(6)]:hidden [&_td:nth-child(6)]:hidden",
  7: "[&_th:nth-child(7)]:hidden [&_td:nth-child(7)]:hidden",
};

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
    compoundVariants: [
      {
        isSelectionStart: true,
        isSelectionEnd: true,
        className: "after:hidden",
      },
    ],
  },
);

const calendarClassName =
  "group/calendar w-fit bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] [--range-edge:inset_0_1px_0_var(--primary),inset_0_-1px_0_var(--primary)] data-[size=lg]:w-full data-[size=lg]:[--cell-radius:var(--radius-xl)] data-[size=lg]:[--cell-size:--spacing(11)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent";

export type CalendarGranularity = "day" | "month" | "year";
export type FirstDayOfWeek = NonNullable<
  CalendarProps<DateValue>["firstDayOfWeek"]
>;
const DEFAULT_FIRST_DAY_OF_WEEK: FirstDayOfWeek = "mon";

function Calendar<
  T extends DateValue,
  M extends "single" | "multiple" = "single",
>({
  className,
  numberOfMonths = 1,
  getDayState,
  rangeStyle = "band",
  size = "default",
  granularity = "day",
  hideOutsideDays = false,
  showWeekends = true,
  showMonthYearSelect = true,
  firstDayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
  ...props
}: Omit<CalendarProps<T, M>, "visibleDuration"> &
  EngineProps & { granularity?: CalendarGranularity }) {
  return (
    <AriaCalendar
      {...props}
      firstDayOfWeek={firstDayOfWeek}
      data-slot="calendar"
      data-size={size}
      data-range-style={rangeStyle}
      data-granularity={granularity}
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) =>
        cn(calendarClassName, className),
      )}
    >
      <CalendarInner
        numberOfMonths={numberOfMonths}
        getDayState={getDayState}
        granularity={granularity}
        hideOutsideDays={hideOutsideDays}
        showWeekends={showWeekends}
        showMonthYearSelect={showMonthYearSelect}
        firstDayOfWeek={firstDayOfWeek}
      />
    </AriaCalendar>
  );
}

function RangeCalendar<T extends DateValue>({
  className,
  numberOfMonths = 1,
  getDayState,
  rangeStyle = "band",
  size = "default",
  hideOutsideDays = false,
  showWeekends = true,
  showMonthYearSelect = true,
  firstDayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
  ...props
}: Omit<RangeCalendarProps<T>, "visibleDuration"> & EngineProps) {
  return (
    <AriaRangeCalendar
      {...props}
      firstDayOfWeek={firstDayOfWeek}
      data-slot="calendar"
      data-size={size}
      data-range-style={rangeStyle}
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) =>
        cn(calendarClassName, className),
      )}
    >
      <CalendarInner
        numberOfMonths={numberOfMonths}
        getDayState={getDayState}
        hideOutsideDays={hideOutsideDays}
        showWeekends={showWeekends}
        showMonthYearSelect={showMonthYearSelect}
        firstDayOfWeek={firstDayOfWeek}
        isRange
      />
    </AriaRangeCalendar>
  );
}

// cn, not buttonVariants({ className }): the default size's h-10 px-4 must be merged away.
const navButtonClassName = cn(
  buttonVariants({ variant: "ghost" }),
  "pointer-events-auto size-(--cell-size) p-0 select-none",
);
const pickButtonClassName = cn(
  buttonVariants({ variant: "ghost" }),
  "h-10 w-full rounded-(--radius-xl) px-2 text-sm font-normal data-[current=true]:bg-primary data-[current=true]:text-primary-foreground data-[current=true]:hover:bg-primary data-disabled:pointer-events-none data-disabled:opacity-40",
);

/** Motion for a month change (slides the way you moved) and a view switch (soft scale-in). */
const SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.7,
} as const;

type View = "days" | "months" | "years";
const FLOOR: Record<CalendarGranularity, View> = {
  day: "days",
  month: "months",
  year: "years",
};

function CalendarInner({
  numberOfMonths,
  isRange,
  getDayState,
  granularity = "day",
  hideOutsideDays = false,
  showWeekends = true,
  showMonthYearSelect = true,
  firstDayOfWeek = DEFAULT_FIRST_DAY_OF_WEEK,
}: {
  numberOfMonths: number;
  isRange?: boolean;
  getDayState?: EngineProps["getDayState"];
  granularity?: CalendarGranularity;
  hideOutsideDays?: boolean;
  showWeekends?: boolean;
  showMonthYearSelect?: boolean;
  firstDayOfWeek?: FirstDayOfWeek;
}) {
  const single = React.useContext(CalendarStateContext);
  const range = React.useContext(RangeCalendarStateContext);
  const state = isRange ? range : single;
  const { locale } = useLocale();
  // A month grid names 24 months per render; build each formatter once per locale.
  const monthFormatters = React.useMemo(
    () => ({
      long: new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }),
      short: new Intl.DateTimeFormat(locale, {
        month: "short",
        timeZone: "UTC",
      }),
    }),
    [locale],
  );
  // The lowest view this calendar goes to; the title cycles floor -> ... -> years -> back to the floor.
  const floor = FLOOR[granularity];
  const [view, setViewState] = React.useState<View>(floor);
  // Only a view the user SWITCHED to scales in; the view a picker opens on just appears (its popover
  // already animates, and a second entrance on mount would read as lag).
  const [switched, setSwitched] = React.useState<boolean>(false);
  const setView = (next: View) => {
    setSwitched(true);
    setViewState(next);
  };

  // Which way the month moved, so the grid slides in from that side.
  // Hooks stay above any early return (rules-of-hooks).
  const monthKey = state
    ? state.focusedDate.year * 12 + state.focusedDate.month
    : 0;
  const prevKey = React.useRef(monthKey);
  const direction =
    monthKey === prevKey.current ? 0 : monthKey > prevKey.current ? 1 : -1;
  React.useEffect(() => {
    prevKey.current = monthKey;
  }, [monthKey]);

  if (!state) return null;

  const focused = state.focusedDate;
  // In a month/year picker the highlighted tile is the VALUE; in a day calendar it is the focused month.
  const raw = !isRange && floor !== "days" ? single?.value : null;
  // React Aria types `value` as `T | T[] | null` (multiple selection); month/year pickers are single-value.
  const picked = raw && !Array.isArray(raw) ? (raw as DateValue) : null;
  const { minValue, maxValue } = state;
  // A period is pickable unless it lies wholly outside [minValue, maxValue].
  const outOfRange = (start: DateValue, end: DateValue) =>
    (minValue != null && end.compare(minValue) < 0) ||
    (maxValue != null && start.compare(maxValue) > 0);
  const commit = (fields: { year: number; month: number }) => {
    const date = focused.set({ ...fields, day: 1 });
    state.setFocusedDate(date);
    single?.selectDate(date);
  };

  const monthName = (m: number, style: "long" | "short") =>
    monthFormatters[style].format(new Date(Date.UTC(2000, m - 1, 1)));
  const title = (offset: number) => {
    const d = focused.add({ months: offset });
    return `${monthName(d.month, "long")} ${d.year}`;
  };
  // The year grid centres on the current year (5 before, 6 after), so nearby years are one click either way.
  const decadeStart = focused.year - 5;
  const decadeTitle = `${decadeStart} – ${decadeStart + 11}`;
  // The jump arrows move a year on the month grid and a whole 12-year page on the year grid.
  const jumpYears = view === "months" ? 1 : 12;

  const goTo = (fields: { year?: number; month?: number }) => {
    state.setFocusedDate(focused.set(fields));
  };

  // Jump views (months / years) replace the day grid; one month only — a multi-month range keeps plain titles.
  const canJump =
    numberOfMonths === 1 && (showMonthYearSelect || floor !== "days");
  const weekStart = startOfWeek(focused, locale, firstDayOfWeek);
  // Grid columns (1-7) that fall on a weekend in this locale and week start.
  const hiddenColumns = showWeekends
    ? []
    : Array.from({ length: 7 }, (_, i) => i + 1).filter((column) =>
        isWeekend(weekStart.add({ days: column - 1 }), locale),
      );
  // A year picker has nowhere above its grid to go: the title is a plain label.
  const titleIsButton = canJump && floor !== "years";

  return (
    <div className="relative flex flex-col gap-4 md:flex-row">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex w-full items-center justify-between gap-1">
        {view === "days" ? (
          <>
            <Button
              slot="previous"
              data-slot="calendar-previous"
              className={navButtonClassName}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              slot="next"
              data-slot="calendar-next"
              className={navButtonClassName}
            >
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
              aria-label={
                view === "months" ? "Previous year" : "Previous years"
              }
              className={navButtonClassName}
              onPress={() => goTo({ year: focused.year - jumpYears })}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              slot={null}
              data-slot="calendar-next"
              aria-label={view === "months" ? "Next year" : "Next years"}
              className={navButtonClassName}
              onPress={() => goTo({ year: focused.year + jumpYears })}
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
              <div className="flex items-center gap-1">
                {view === "days" && floor === "days" && (
                  <CalendarTitleButton
                    label={`${title(0)}, choose a month`}
                    onPress={() => setView("months")}
                  >
                    {monthName(focused.month, "long")}
                  </CalendarTitleButton>
                )}
                <CalendarTitleButton
                  label={
                    view === "years"
                      ? floor === "months"
                        ? "Back to months"
                        : "Back to days"
                      : `${focused.year}, choose a year`
                  }
                  onPress={() => setView(view === "years" ? floor : "years")}
                >
                  {view === "years" ? decadeTitle : focused.year}
                </CalendarTitleButton>
              </div>
            ) : (
              <span
                data-slot="calendar-title"
                className="text-sm font-semibold select-none"
              >
                {view === "years" ? decadeTitle : title(i)}
              </span>
            )}
          </div>

          {view === "days" ? (
            <motion.div
              key={`${monthKey}-${i}`}
              initial={
                direction === 0 ? false : { opacity: 0, x: direction * 16 }
              }
              animate={{ opacity: 1, x: 0 }}
              transition={SPRING}
            >
              <CalendarGrid
                // Band style: cells touch so the range reads as one continuous band. Outline style: tiles get
                // breathing room, each one a distinct day.
                className={cn(
                  "w-full border-collapse group-data-[range-style=outline]/calendar:border-separate group-data-[range-style=outline]/calendar:[border-spacing:0.375rem_0]",
                  // A week left with no visible day (only hidden weekend days) would show as a blank row.
                  hiddenColumns.length > 0 &&
                    "[&_tbody_tr:not(:has([data-day]))]:hidden",
                  ...hiddenColumns.map((column) => HIDE_COLUMN_CLASS[column]),
                )}
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
                    <CalendarCell
                      date={date}
                      className={(renderProps) =>
                        cn(
                          cellVariants(renderProps),
                          hideOutsideDays &&
                            renderProps.isOutsideMonth &&
                            "invisible pointer-events-none",
                        )
                      }
                    >
                      {(renderProps) => {
                        if (hideOutsideDays && renderProps.isOutsideMonth) {
                          return (
                            <div
                              aria-hidden
                              className="aspect-square h-full w-full min-w-(--cell-size)"
                            />
                          );
                        }
                        const isHiddenWeekend =
                          !showWeekends && isWeekend(date, locale);
                        const day = renderProps.isOutsideMonth
                          ? undefined
                          : getDayState?.(date);
                        const isMiddle =
                          renderProps.isSelected &&
                          !renderProps.isSelectionStart &&
                          !renderProps.isSelectionEnd &&
                          isRange;
                        return (
                          <div
                            title={day?.label}
                            data-day={isHiddenWeekend ? undefined : ""}
                            data-today={renderProps.isToday || undefined}
                            data-tone={day?.tone ? "" : undefined}
                            data-pattern={day?.pattern}
                            data-marker={day?.marker || undefined}
                            data-selected-single={
                              renderProps.isSelected && !isRange
                            }
                            data-range-start={
                              renderProps.isSelectionStart && isRange
                            }
                            data-range-end={
                              renderProps.isSelectionEnd && isRange
                            }
                            data-range-middle={isMiddle}
                            style={day?.tone ? toneStyle(day.tone) : undefined}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "icon",
                              }),
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
                              "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground hover:data-[selected-single=true]:bg-primary [&>span]:text-xs [&>span]:opacity-70",
                            )}
                          >
                            {renderProps.defaultChildren}
                          </div>
                        );
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
                    const start = focused.set({ month: m + 1, day: 1 });
                    const current = picked
                      ? picked.year === focused.year && picked.month === m + 1
                      : m + 1 === focused.month;
                    return (
                      <Button
                        key={m}
                        slot={null}
                        data-slot="calendar-month"
                        data-current={current || undefined}
                        aria-current={picked && current ? "date" : undefined}
                        isDisabled={outOfRange(start, endOfMonth(start))}
                        className={pickButtonClassName}
                        onPress={() => {
                          if (floor === "months")
                            return commit({ year: focused.year, month: m + 1 });
                          goTo({ month: m + 1 });
                          setView("days");
                        }}
                      >
                        {/* Shows "Jan", is named "January 2026": the abbreviation is hidden from the accessible name and
                            the full name is screen-reader text, so the name never contradicts what is on screen. */}
                        <span aria-hidden>{monthName(m + 1, "short")}</span>
                        <span className="sr-only">{`${monthName(m + 1, "long")} ${focused.year}`}</span>
                      </Button>
                    );
                  })
                : Array.from({ length: 12 }, (_, k) => {
                    const year = decadeStart + k;
                    const start = focused.set({ year, month: 1, day: 1 });
                    const current = picked
                      ? picked.year === year
                      : year === focused.year;
                    return (
                      <Button
                        key={year}
                        slot={null}
                        data-slot="calendar-year"
                        data-current={current || undefined}
                        aria-current={picked && current ? "date" : undefined}
                        isDisabled={outOfRange(start, endOfYear(start))}
                        className={pickButtonClassName}
                        onPress={() => {
                          if (floor === "years")
                            return commit({ year, month: 1 });
                          goTo({ year });
                          setView("months");
                        }}
                      >
                        {year}
                      </Button>
                    );
                  })}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

export { Calendar, RangeCalendar, CalendarLegend };
