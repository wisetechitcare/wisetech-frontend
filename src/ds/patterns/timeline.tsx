import * as React from "react"
import { Check, CircleAlert, Clock } from "lucide-react"
import { cn } from "@/ds/lib/utils"

export type TimelineState = "done" | "current" | "upcoming" | "failed"

export type TimelineSubEvent = {
  key: string
  message: React.ReactNode
  /** Muted line under the message — actor, timestamp. Supplied display-ready. */
  meta?: React.ReactNode
}

export type TimelineItem = {
  key: string
  title: string
  /** Muted second line — a formatted date, a short detail, or both. Supplied display-ready. */
  meta?: React.ReactNode
  /** Defaults to `done`: a history of things that happened is the common case. */
  state?: TimelineState
  /** What happened while this entry was current, on its own hairline rail beneath it. */
  events?: TimelineSubEvent[]
}

/**
 * What happened to a record, in order — raised, approved, invoiced, paid.
 *
 * NOT the Stepper. A Stepper is a control: it says where you are in a task you are
 * performing, is keyboard-navigable and carries `aria-current="step"`. A Timeline is a
 * read-only `<ol>` of history, with timestamps and optional nested events. Reaching for a
 * Stepper to render history gives a screen reader "Progress, step 3 of 5" for a list of
 * past events, which is wrong — hence two patterns.
 *
 * It borrows the Stepper's state-marker vocabulary on purpose (solid primary for the step
 * in progress, soft success for finished, soft destructive for failed), so a marker means
 * the same thing wherever it appears.
 *
 * Titles are rendered as given, with no case transform — timeline labels are frequently
 * admin-configured (Billing's stage names come from Billing to Configure) and re-casing
 * someone's wording is not ours to do.
 */
export function Timeline({
  items,
  dense = false,
  className,
}: {
  items: TimelineItem[]
  /** Tighter rows, for a side panel or a card. */
  dense?: boolean
  className?: string
}) {
  return (
    <ol data-slot="timeline" className={cn("flex list-none flex-col", className)}>
      {items.map((item, index) => {
        const state = item.state ?? "done"
        const isLast = index === items.length - 1
        return (
          <li
            key={item.key}
            className={cn("flex flex-row gap-2.5", dense ? "min-h-11" : "min-h-14")}
          >
            {/* Rail: marker, then the connector down to the next marker. The connector is
                skipped on the last entry so the line ends at the final marker instead of
                trailing into empty space. */}
            <div className="flex w-6 shrink-0 flex-col items-center">
              <Marker state={state} />
              {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
            </div>

            <div className={cn("min-w-0 flex-1", !isLast && "pb-2.5")}>
              <p
                className={cn(
                  "text-sm leading-snug break-words",
                  state === "current" ? "font-semibold" : "font-medium",
                  state === "upcoming" && "text-muted-foreground",
                )}
              >
                {item.title}
                {state === "done" && <span className="sr-only"> (completed)</span>}
                {state === "failed" && <span className="sr-only"> (failed)</span>}
              </p>
              {item.meta != null && item.meta !== "" && (
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              )}

              {!!item.events?.length && (
                <ol className="mt-2 flex list-none flex-col gap-1.5 border-l border-border pl-3">
                  {item.events.map((event) => (
                    <li key={event.key} className="relative">
                      {/* Pulled out onto the hairline so the dot sits ON the rail. A SOLID dot,
                          not a ring: a ring needs the surface colour behind it, and `bg-card` both
                          assumes the timeline sits on a card and reads to the consistency guard as
                          a hand-drawn card (`bg-card` + a border or radius). */}
                      <span
                        aria-hidden
                        className="absolute top-1.5 -left-[15px] size-2 rounded-full bg-muted-foreground"
                      />
                      <p className="text-xs leading-normal break-words">{event.message}</p>
                      {event.meta != null && event.meta !== "" && (
                        <p className="text-xs text-muted-foreground">{event.meta}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** The state markers, in the Stepper's vocabulary so one shape means one thing kit-wide. */
function Marker({ state }: { state: TimelineState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border [&>svg]:size-3.5",
        state === "current" && "border-primary bg-primary text-primary-foreground",
        state === "done" && "border-transparent bg-success-soft text-success-foreground",
        state === "failed" && "border-transparent bg-destructive-soft text-destructive-foreground",
        state === "upcoming" && "border-border bg-background text-muted-foreground",
      )}
    >
      {state === "done" ? (
        <Check />
      ) : state === "current" ? (
        <Clock />
      ) : state === "failed" ? (
        <CircleAlert />
      ) : (
        /* A dot, not an icon — and deliberately a <span>: the container's `[&>svg]:size-3.5`
           compiles to `.marker > svg`, which outranks a `size-*` class on the svg itself, so a
           Lucide Circle here would render at the icon size however it was classed. */
        <span data-slot="timeline-dot" className="size-2 rounded-full bg-current" />
      )}
    </span>
  )
}
