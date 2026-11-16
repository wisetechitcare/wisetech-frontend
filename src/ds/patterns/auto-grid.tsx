import * as React from "react"
import { cn } from "@/ds/lib/utils"

/**
 * The standard collection layout: tiles fill wide screens and collapse to one column on phones, with no
 * breakpoints to write. Replaces the live kit's `AutoGrid`. Tiles stop growing at `max` so a short list
 * does not stretch into full-width bars; pass `stretch` only when tiles must absorb leftover width.
 */
export function AutoGrid({
  children,
  min = 280,
  max = 420,
  stretch = false,
  className,
}: {
  children: React.ReactNode
  /** Smallest tile width in px before the grid drops a column. */
  min?: number
  /** Largest tile width in px (ignored with `stretch`). */
  max?: number
  stretch?: boolean
  className?: string
}) {
  return (
    <div
      data-slot="auto-grid"
      className={cn(
        "grid gap-4",
        stretch
          ? "grid-cols-[repeat(auto-fit,minmax(min(100%,var(--grid-min)),1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(min(100%,var(--grid-min)),var(--grid-max)))]",
        className,
      )}
      style={{ "--grid-min": `${min}px`, "--grid-max": `${max}px` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
