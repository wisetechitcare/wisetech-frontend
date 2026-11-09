import type * as React from "react"

/** Status tones carry meaning (good, needs attention, bad, informational). */
export type StatusTone = "brand" | "success" | "warning" | "info" | "danger" | "neutral"
/** Category hues carry identity only (leave type, department, module) — never a status. */
export type HueTone = "blue" | "green" | "amber" | "rose" | "purple" | "cyan" | "slate"
export type Tone = StatusTone | HueTone

export const STATUS_TONES: StatusTone[] = ["brand", "success", "warning", "info", "danger", "neutral"]
export const HUE_TONES: HueTone[] = ["blue", "green", "amber", "rose", "purple", "cyan", "slate"]

const STATUS_VARS: Record<StatusTone, [solid: string, ink: string]> = {
  brand: ["var(--primary)", "var(--accent-foreground)"],
  success: ["var(--success)", "var(--success-foreground)"],
  warning: ["var(--warning)", "var(--warning-foreground)"],
  info: ["var(--info)", "var(--info-foreground)"],
  danger: ["var(--destructive)", "var(--destructive-foreground)"],
  neutral: ["var(--muted-foreground)", "var(--foreground)"],
}

/**
 * The one way a pattern gets a tone: sets `--tone` (the solid) and `--tone-ink` (readable text on a
 * soft tint of it) on the element. Patterns then use `bg-[color-mix(…var(--tone)…)]` / `text-(--tone-ink)`.
 * Pass a hex string for an admin-configured colour; its ink is mixed toward the foreground to stay readable.
 */
export function toneStyle(tone: Tone | (string & {}) = "brand"): React.CSSProperties {
  if (tone in STATUS_VARS) {
    const [solid, ink] = STATUS_VARS[tone as StatusTone]
    return { "--tone": solid, "--tone-ink": ink } as React.CSSProperties
  }
  if ((HUE_TONES as string[]).includes(tone)) {
    return { "--tone": `var(--tone-${tone})`, "--tone-ink": `var(--tone-${tone}-foreground)` } as React.CSSProperties
  }
  return {
    "--tone": tone,
    "--tone-ink": `color-mix(in oklch, ${tone} 55%, var(--foreground))`,
  } as React.CSSProperties
}
