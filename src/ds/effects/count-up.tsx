import * as React from "react"
import { useCountUp } from "@/ds/hooks/use-count-up"

// Inline styles, not classes: CountUp also renders in the live app, where the v2 token CSS is not loaded.
const visuallyHidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
  // Unselectable, so copying the number (or the tile around it) gives it once, not twice.
  userSelect: "none",
  WebkitUserSelect: "none",
}

/** A KPI number that counts up to `value` on mount and whenever it changes. Assistive tech reads only the final value. */
function CountUp({
  value,
  decimals = 0,
  duration,
  locale = "en-IN",
  format,
  style,
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
    <span data-slot="count-up" style={{ fontVariantNumeric: "tabular-nums", ...style }} {...props}>
      <span style={visuallyHidden}>{toText(value)}</span>
      <span aria-hidden="true">{toText(shown)}</span>
    </span>
  )
}

export { CountUp }
