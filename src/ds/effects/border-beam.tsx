import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"

// The app's ONE border beam, CSS keyframes only (no per-frame JS; keyframes in globals.css).
// card: Magic UI's technique (magicui.design/r/border-beam.json) — a gradient dot rides an offset-path
// round the rounded rect. circle: the orbit Zakaullah Ansari built in main.css (4245bfaa) — a conic comet
// rotated with `transform` under a ring mask; no @property (Safari gaps). Circles of ~64px and up only:
// on smaller discs the comet's head reads as a smudge (9520111a).
function BorderBeam({
  shape = "card",
  size = 50,
  duration = shape === "circle" ? 2.8 : 6,
  delay = 0,
  reverse = false,
  borderWidth = shape === "circle" ? 2.5 : 1,
  colorFrom = "var(--primary)",
  colorTo = "color-mix(in oklch, var(--primary) 40%, white)",
  className,
}: {
  /** card: any rounded rect (the parent must be `relative`). circle: a disc of ~64px or more. */
  shape?: "card" | "circle"
  /** card: length of the beam, px. */
  size?: number
  /** Seconds per lap. */
  duration?: number
  /** Seconds into the lap to start at. */
  delay?: number
  reverse?: boolean
  /** px. */
  borderWidth?: number
  /** card: head colour. circle: the comet uses `currentColor` — set it with a text-* class. */
  colorFrom?: string
  /** card: tail colour. */
  colorTo?: string
  className?: string
}) {
  // Decorative and looping, so under reduced motion it is not drawn at all (a frozen comet reads as a glitch).
  if (useReducedMotion()) return null

  const vars = {
    "--beam-width": `${borderWidth}px`,
    "--beam-size": `${size}px`,
    "--beam-duration": `${duration}s`,
    "--beam-delay": `${-delay}s`,
    "--beam-direction": reverse ? "reverse" : "normal",
    "--beam-from": colorFrom,
    "--beam-to": colorTo,
  } as React.CSSProperties

  if (shape === "circle") {
    return (
      <span
        data-slot="border-beam"
        data-shape="circle"
        aria-hidden="true"
        style={vars}
        className={cn(
          "pointer-events-none absolute -inset-(--beam-width) animate-border-beam-orbit rounded-full text-primary",
          "bg-[conic-gradient(from_0deg,transparent_0_72%,currentColor_96%,transparent_100%)]",
          "mask-[radial-gradient(farthest-side,transparent_calc(100%-var(--beam-width)),black_calc(100%-var(--beam-width)))]",
          className
        )}
      />
    )
  }

  return (
    <div
      data-slot="border-beam"
      data-shape="card"
      aria-hidden="true"
      style={vars}
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(black,black)] mask-intersect [mask-clip:padding-box,border-box]"
    >
      <div
        className={cn(
          "absolute aspect-square w-(--beam-size) animate-border-beam bg-linear-to-l from-(--beam-from) via-(--beam-to) to-transparent [offset-path:rect(0_auto_auto_0_round_var(--beam-size))]",
          className
        )}
      />
    </div>
  )
}

export { BorderBeam }
