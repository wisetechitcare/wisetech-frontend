import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"
import type { HueTone } from "@/ds/lib/tone"

/** A module hue (the launcher's department colours), or `brand`: blue → indigo → purple, the landing line's span. */
export type GradientTone = HueTone | "brand"

/**
 * Display ink — the solid hues, each flowing into a neighbouring kit hue (HR blue → indigo, CRM green → cyan,
 * Projects purple → rose, Finance rose → amber…). Vivid; for large display text only (the sign-in headline).
 * Static classes (Tailwind sees every one) setting --hue-gradient; light and dark come with the tokens.
 */
const DISPLAY: Record<GradientTone, string> = {
  blue: "[--hue-gradient:linear-gradient(90deg,var(--tone-blue),var(--tone-indigo))]",
  green: "[--hue-gradient:linear-gradient(90deg,var(--tone-green),var(--tone-cyan))]",
  amber: "[--hue-gradient:linear-gradient(90deg,var(--tone-amber),var(--tone-rose))]",
  rose: "[--hue-gradient:linear-gradient(90deg,var(--tone-rose),var(--tone-amber))]",
  purple: "[--hue-gradient:linear-gradient(90deg,var(--tone-purple),var(--tone-rose))]",
  indigo: "[--hue-gradient:linear-gradient(90deg,var(--tone-indigo),var(--tone-purple))]",
  cyan: "[--hue-gradient:linear-gradient(90deg,var(--tone-cyan),var(--tone-blue))]",
  slate: "[--hue-gradient:linear-gradient(90deg,var(--tone-slate),var(--tone-blue))]",
  brand: "[--hue-gradient:linear-gradient(90deg,var(--tone-blue),var(--tone-indigo),var(--tone-purple))]",
}

/**
 * Text ink — the same gradients in the hues' readable text tokens (--tone-<hue>-foreground, ≥ 4.5:1 on the page
 * and cards in both themes), so it can carry body-size text such as a 16px heading.
 */
const TEXT: Record<GradientTone, string> = {
  blue: "[--hue-gradient:linear-gradient(90deg,var(--tone-blue-foreground),var(--tone-indigo-foreground))]",
  green: "[--hue-gradient:linear-gradient(90deg,var(--tone-green-foreground),var(--tone-cyan-foreground))]",
  amber: "[--hue-gradient:linear-gradient(90deg,var(--tone-amber-foreground),var(--tone-rose-foreground))]",
  rose: "[--hue-gradient:linear-gradient(90deg,var(--tone-rose-foreground),var(--tone-amber-foreground))]",
  purple: "[--hue-gradient:linear-gradient(90deg,var(--tone-purple-foreground),var(--tone-rose-foreground))]",
  indigo: "[--hue-gradient:linear-gradient(90deg,var(--tone-indigo-foreground),var(--tone-purple-foreground))]",
  cyan: "[--hue-gradient:linear-gradient(90deg,var(--tone-cyan-foreground),var(--tone-blue-foreground))]",
  slate: "[--hue-gradient:linear-gradient(90deg,var(--tone-slate-foreground),var(--tone-blue-foreground))]",
  brand: "[--hue-gradient:linear-gradient(90deg,var(--tone-blue-foreground),var(--tone-indigo-foreground),var(--tone-purple-foreground))]",
}

/**
 * Text in a hue gradient with a soft light shimmer swept across it — the sign-in headline's key words and the
 * sign-in pages' headings. For moments only; never in tables, forms' fields, wizards or approvals, never on
 * buttons (a gradient on a filled button can't hold contrast).
 *
 * - `ink`: `display` (vivid hues — large text only) or `text` (readable hues — any size).
 * - `shimmer`: `twice` (default — two passes, under 5s, then still: WCAG 2.2.2), `loop` (only while something
 *   else is visibly in motion, e.g. the Typewriter typing), or `off`. Always off under reduced motion.
 * - The gradient is clipped to the letters; the text stays real text (selectable, read by assistive tech).
 */
export function GradientText({
  tone,
  ink = "display",
  shimmer = "twice",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  tone: GradientTone
  ink?: "display" | "text"
  shimmer?: "loop" | "twice" | "off"
}) {
  const reduced = useReducedMotion()
  const sweep = reduced ? "off" : shimmer
  return (
    <span
      data-slot="gradient-text"
      data-tone={tone}
      data-shimmer={sweep === "off" ? undefined : sweep}
      className={cn(
        (ink === "text" ? TEXT : DISPLAY)[tone],
        // The shimmer band (first layer, tokens.css) over the gradient, both clipped to the letters.
        "bg-clip-text text-transparent [background-image:var(--text-shimmer-band),var(--hue-gradient)] [background-size:250%_100%,100%_100%] [background-position:150%_0,0_0] [background-repeat:no-repeat]",
        sweep !== "off" && "animate-text-shimmer",
        sweep === "twice" && "[animation-iteration-count:2]",
        className,
      )}
      {...props}
    />
  )
}
