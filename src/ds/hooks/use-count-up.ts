import * as React from "react"
import { prefersReducedMotion } from "@/ds/lib/motion"

/** Counts from 0 up to `target`, easing out — and again whenever `target` changes. Jumps straight there for reduced motion. */
export function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = React.useState(prefersReducedMotion() ? target : 0)
  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      // A frame that began before the effect ran stamps `now` earlier than `start`; clamp so it never shows a negative.
      const p = Math.min(1, Math.max(0, (now - start) / ms))
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}
