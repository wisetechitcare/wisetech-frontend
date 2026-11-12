import * as React from "react"
import { cn } from "@/ds/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/ds/ui/toggle-group"

/** Segment accent. One meaning per colour, matching Badge/StatCard; `neutral` is for totals ("All"). */
export type SegmentTone = "neutral" | "brand" | "success" | "warning" | "info" | "danger"

/** The dot's colour — the one place a segment's tone shows; selection itself is the kit's brand fill. */
const DOT: Record<SegmentTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
}

export interface SegmentOption {
  value: string
  label: React.ReactNode
  count: number
  tone?: SegmentTone
  /** 0–1: this segment's share of the whole — read out in the tooltip and accessible name. */
  share?: number
  /** Extra context for the tooltip and the accessible name, e.g. a formatted amount. */
  detail?: string
}

/**
 * A status filter with counts — "All 14 · Ready to Pay 14 · Partially Paid 0".
 *
 * Drawn as the design system's counted ToggleGroup — the Filter Toolbar story's recipe for a status filter, the
 * same control as Active · Inactive · All: connected outline segments with pill ends, the selected one in the
 * kit's brand fill. A dot carries each state's colour, so the status still reads at a glance; a zero count stays
 * on screen but goes quiet — "0 Rejected" is information, and hiding empty options silently narrows a view.
 *
 * (It used to be its own design — tinted segments with a coloured share rule under each — that appeared nowhere
 * else in the kit. The share now lives in the tooltip and the accessible name.)
 *
 * Controlled; `onValueChange` receives the clicked segment's value. Toggling a selected segment back to "all" is
 * the caller's decision. Below its natural width the group scrolls rather than wraps — a wrapped group reads as
 * two controls.
 */
export function SegmentedFilter({
  options,
  value,
  onValueChange,
  size = "default",
  className,
  ...props
}: {
  options: SegmentOption[]
  value: string
  onValueChange: (value: string) => void
  /** `lg` (40px) in a filter row beside a search field and Selects; `default` (36px) elsewhere. */
  size?: "default" | "lg"
  className?: string
  "aria-label"?: string
}) {
  return (
    <ToggleGroup
      data-slot="segmented-filter"
      aria-label={props["aria-label"]}
      variant="outline"
      size={size}
      spacing={0}
      value={[value]}
      // Base UI reports [] when the pressed item is pressed again; pass that back as a click on the
      // current value, so "toggle back to All" stays the caller's decision.
      onValueChange={(next) => onValueChange(next[0] ?? value)}
      className={cn("max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      {options.map((o) => {
        const selected = o.value === value
        const empty = o.count === 0 && !selected
        const noun = o.count === 1 ? "record" : "records"
        const share = o.share !== undefined ? `${Math.round(Math.max(0, Math.min(1, o.share)) * 100)}% of the total` : ""
        const extra = [o.detail, share].filter(Boolean).join(" · ")
        return (
          <ToggleGroupItem key={o.value} value={o.value} title={extra ? `${o.count} ${noun} · ${extra}` : undefined} className="gap-1.5">
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[o.tone ?? "neutral"], empty && "opacity-35")} />
            <span>{o.label}</span>
            <span className={cn("tabular text-muted-foreground", empty && "opacity-60")}>{o.count}</span>
            {/* The accessible name is the visible text plus this — never a separate aria-label, so a
                speech user saying what they see ("click Pending 2") matches it. */}
            <span className="sr-only">
              {` ${noun}`}
              {o.detail ? `, ${o.detail}` : ""}
            </span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
