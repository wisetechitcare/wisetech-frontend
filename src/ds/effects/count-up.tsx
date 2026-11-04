import * as React from "react"
import { cn } from "cn"
import { useCountUp } from "@/ds/hooks/use-count-up"

/** A KPI number that counts up to `value` on mount and whenever it changes. Assistive tech reads only the final value. */
function CountUp({
  value,
  decimals = 0,
  duration,
  locale = "en-IN",
  format,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  value: number
  decimals?: number
  /** Milliseconds; defaults to useCountUp's. */
  duration?: number
  /** Decides the digit grouping: en-IN writes 4,82,500, en-US 482,500. */
  locale?: string
  /** Replaces the number formatting entirely, e.g. a compact "₹3.4L". */
  format?: (n: number) => string
}) {
  const shown = useCountUp(value, duration)
  const toText = React.useMemo(() => {
    if (format) return format
    const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    return (n: number) => nf.format(n)
  }, [format, locale, decimals])

  return (
    <span data-slot="count-up" className={cn("tabular-nums", className)} {...props}>
      {/* Unselectable, so copying the number (or the tile around it) gives it once, not twice. */}
      <span className="sr-only select-none">{toText(value)}</span>
      <span aria-hidden="true">{toText(shown)}</span>
    </span>
  )
}

export { CountUp }
