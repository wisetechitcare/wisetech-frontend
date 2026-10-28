"use client"

import { cva } from "class-variance-authority"
import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  Button,
  Calendar as AriaCalendar,
  CalendarGridHeader as AriaCalendarGridHeader,
  RangeCalendar as AriaRangeCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarHeading,
  composeRenderProps,
  type CalendarProps,
  type DateValue,
  type RangeCalendarProps,
} from "react-aria-components"

import { buttonVariants } from "@/ds/ui/button"

// shadcn's aria-maia Calendar. The month/year dropdown caption is left out: the date fields
// already take a typed year, and a second (React Aria) Select would duplicate select.tsx.
// Departures from upstream: the range band is a primary tint edged in primary (--range-edge; the
// muted band was ~1.1:1 against the popover, the edges give the 3:1 WCAG 1.4.11 asks of a state),
// start/end draw only the ::after half-band so the tint never paints twice, selected days keep
// their fill under ghost's dark hover, and the focus ring is keyboard-only like Button's.
const cellVariants = cva(
  "group/day relative mt-2 aspect-square h-full w-full cursor-default rounded-(--cell-radius) p-0 text-center outline-none select-none [&:is(:first-child>[data-selected=true])>div]:rounded-l-(--cell-radius) [&:is(:last-child>[data-selected=true])>div]:rounded-r-(--cell-radius)",
  {
    variants: {
      isToday: {
        true: "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
      },
      isSelectionStart: {
        true: "relative isolate z-0 after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary/20 after:shadow-(--range-edge) [:last-child>&]:after:hidden",
      },
      isSelectionEnd: {
        true: "relative isolate z-0 after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary/20 after:shadow-(--range-edge) [:first-child>&]:after:hidden",
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
      { isSelectionStart: true, isSelectionEnd: true, className: "after:hidden" },
    ],
  }
)

const calendarClassName =
  "group/calendar w-fit bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] [--range-edge:inset_0_1px_0_var(--primary),inset_0_-1px_0_var(--primary)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent"

// Values are @internationalized/date CalendarDate (a calendar day, no time zone). Cross the API
// boundary with value.toString() → 'YYYY-MM-DD'; a JS Date round-trip shifts days across IST/UTC.
function Calendar<
  T extends DateValue,
  M extends "single" | "multiple" = "single",
>({
  className,
  numberOfMonths = 1,
  ...props
}: Omit<CalendarProps<T, M>, "visibleDuration"> & { numberOfMonths?: number }) {
  return (
    <AriaCalendar
      {...props}
      data-slot="calendar"
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) =>
        cn(calendarClassName, className)
      )}
    >
      <CalendarInner numberOfMonths={numberOfMonths} />
    </AriaCalendar>
  )
}

function RangeCalendar<T extends DateValue>({
  className,
  numberOfMonths = 1,
  ...props
}: Omit<RangeCalendarProps<T>, "visibleDuration"> & { numberOfMonths?: number }) {
  return (
    <AriaRangeCalendar
      {...props}
      data-slot="calendar"
      visibleDuration={{ months: numberOfMonths }}
      className={composeRenderProps(className, (className) =>
        cn(calendarClassName, className)
      )}
    >
      <CalendarInner numberOfMonths={numberOfMonths} isRange />
    </AriaRangeCalendar>
  )
}

// cn, not buttonVariants({ className }): the default size's h-9 px-3 must be merged away.
const navButtonClassName = cn(
  buttonVariants({ variant: "ghost" }),
  "size-(--cell-size) p-0 select-none"
)

function CalendarInner({
  numberOfMonths,
  isRange,
}: {
  numberOfMonths: number
  isRange?: boolean
}) {
  return (
    <div className="relative flex flex-col gap-4 md:flex-row">
      <div className="absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1">
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
      </div>
      {Array.from({ length: numberOfMonths }, (_, i) => (
        <div key={i} className="flex w-full flex-col gap-4">
          <div className="flex h-(--cell-size) w-full items-center justify-center gap-1 px-(--cell-size)">
            <CalendarHeading
              offset={{ months: i }}
              className="text-sm font-medium select-none"
            />
          </div>
          <CalendarGrid className="w-full border-collapse" offset={{ months: i }}>
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
                  className={(renderProps) => cellVariants(renderProps)}
                >
                  {(renderProps) => (
                    <div
                      data-selected-single={renderProps.isSelected && !isRange}
                      data-range-start={renderProps.isSelectionStart && isRange}
                      data-range-end={renderProps.isSelectionEnd && isRange}
                      data-range-middle={
                        renderProps.isSelected &&
                        !renderProps.isSelectionStart &&
                        !renderProps.isSelectionEnd &&
                        isRange
                      }
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "relative isolate z-10 flex aspect-square h-full w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focus-visible=true]/day:relative group-data-[focus-visible=true]/day:z-10 group-data-[focus-visible=true]/day:border-ring group-data-[focus-visible=true]/day:ring-[3px] group-data-[focus-visible=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-primary/20 data-[range-middle=true]:text-foreground data-[range-middle=true]:shadow-(--range-edge) data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground hover:data-[range-end=true]:bg-primary hover:data-[range-middle=true]:bg-primary/20 hover:data-[range-start=true]:bg-primary hover:data-[selected-single=true]:bg-primary [&>span]:text-xs [&>span]:opacity-70"
                      )}
                    >
                      {renderProps.defaultChildren}
                    </div>
                  )}
                </CalendarCell>
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </div>
      ))}
    </div>
  )
}

export { Calendar, RangeCalendar }
