import * as React from "react"
import { titleCaseChildren } from "@/ds/lib/text"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"

export type BreakdownSegment = {
  label: React.ReactNode
  value: number
  /** A status, a category hue or an admin-configured hex. */
  tone?: Tone | (string & {})
  /** How the value reads in the legend — e.g. "2.5 days", "₹ 4,900". Defaults to the number. */
  display?: React.ReactNode
  /** Emphasise the row (e.g. the unpaid part) — its label takes the segment's ink. */
  emphasis?: boolean
}

/**
 * How a whole splits into parts: one stacked bar plus a legend that names every part and its amount.
 * Leave allocation ("how this applies"), salary components, an attendance mix. Replaces the live screens'
 * hand-drawn stacked bars. The bar is decoration; the legend is the content, so assistive tech reads the
 * same facts the eye does. Segments grow and shrink smoothly when the numbers change.
 */
export function BreakdownBar({
  segments,
  total,
  legend = "list",
  className,
}: {
  segments: ReadonlyArray<BreakdownSegment>
  /** The whole the bar represents. Defaults to the sum of the segments (a full bar). */
  total?: number
  /** `list`: one row per part, amount on the right. `inline`: wrapping chips, for tight spaces. */
  legend?: "list" | "inline"
  className?: string
}) {
  const parts = segments.filter((s) => s.value > 0)
  const whole = total ?? parts.reduce((sum, s) => sum + s.value, 0)
  return (
    <div data-slot="breakdown-bar" className={cn("space-y-3", className)}>
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {whole > 0 &&
          parts.map((s, i) => (
            <span
              key={i}
              style={{ ...toneStyle(s.tone ?? "brand"), width: `${(s.value / whole) * 100}%` }}
              className="h-full bg-(--tone) transition-[width] duration-500 ease-spring first:rounded-l-full last:rounded-r-full"
            />
          ))}
      </div>
      <ul className={cn("text-sm", legend === "list" ? "space-y-2" : "flex flex-wrap gap-x-4 gap-y-1.5")}>
        {parts.map((s, i) => (
          <li key={i} style={toneStyle(s.tone ?? "brand")} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--tone)" />
            <span className={cn("min-w-0 truncate font-medium", legend === "list" && "flex-1", s.emphasis && "text-(--tone-ink)")}>
              {titleCaseChildren(s.label)}
            </span>
            <span className="tabular shrink-0 font-semibold">{s.display ?? s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
