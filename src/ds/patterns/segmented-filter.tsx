import * as React from "react"
import { cn } from "@/ds/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/ds/ui/toggle-group"

/** Segment accent. One meaning per colour, matching Badge/StatCard; `neutral` is for totals ("All"). */
export type SegmentTone = "neutral" | "brand" | "success" | "warning" | "info" | "danger"

const TONE: Record<SegmentTone, string> = {
  // --seg paints the dot and rule; --seg-ink is the same hue held to 4.5:1 for the selected label.
  neutral: "[--seg:var(--muted-foreground)] [--seg-ink:var(--foreground)]",
  brand: "[--seg:var(--primary)] [--seg-ink:var(--accent-foreground)]",
  success: "[--seg:var(--success)] [--seg-ink:var(--success-foreground)]",
  warning: "[--seg:var(--warning)] [--seg-ink:var(--warning-foreground)]",
  info: "[--seg:var(--info)] [--seg-ink:var(--info-foreground)]",
  danger: "[--seg:var(--destructive)] [--seg-ink:var(--destructive-foreground)]",
}

export interface SegmentOption {
  value: string
  label: React.ReactNode
  count: number
  tone?: SegmentTone
  /** 0–1: this segment's share of the whole, drawn as the seat rule when `showShare` is on. */
  share?: number
  /** Extra context for the tooltip and the accessible name, e.g. a formatted amount. */
  detail?: string
}

/**
 * A filter as one connected rail of counted segments — "All 14 · Ready to Pay 14 · Partially Paid 0".
 *
 * Three signals, one job each: the dot says which state, weight + tint say which one is selected,
 * and (with `showShare`) a 3px rule under each segment fills to that state's share, so the shape of
 * the period reads before any digit does. A zero count stays on screen but goes quiet — "0 Rejected"
 * is information, and hiding empty options is how a view ends up silently narrowed.
 *
 * Controlled; `onValueChange` receives the clicked segment's value. Toggling a selected segment back
 * to "all" is the caller's decision. Below its natural width the rail scrolls rather than wraps — a
 * wrapped rail reads as two controls.
 */
export function SegmentedFilter({
  options,
  value,
  onValueChange,
  showShare = false,
  className,
  ...props
}: {
  options: SegmentOption[]
  value: string
  onValueChange: (value: string) => void
  showShare?: boolean
  className?: string
  "aria-label"?: string
}) {
  return (
    <ToggleGroup
      data-slot="segmented-filter"
      aria-label={props["aria-label"]}
      // Connected: no gap between segments. ToggleGroup's default spacing (2) rendered separate pills with an
      // 8px gap — five floating chips instead of one rail.
      spacing={0}
      value={[value]}
      // Base UI reports [] when the pressed item is pressed again; pass that back as a click on the
      // current value, so "toggle back to All" stays the caller's decision.
      onValueChange={(next) => onValueChange(next[0] ?? value)}
      className={cn(
        // A control's shell, not a card's: `border-input bg-input/30` is what Input and the selected
        // Tabs segment use, so this track lifts off the page in both themes without claiming to be a
        // card surface (which `bg-card` + a radius does, and which the kit guard rightly rejects).
        "h-8 w-fit max-w-full items-stretch overflow-x-auto overflow-y-hidden rounded-lg border border-input bg-input/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((o) => {
        const selected = o.value === value
        const empty = o.count === 0 && !selected
        const noun = o.count === 1 ? "record" : "records"
        const share = Math.max(0, Math.min(1, o.share ?? 0))
        return (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            title={o.detail ? `${o.count} ${noun} · ${o.detail}` : undefined}
            className={cn(
              // Selected, the neutral total ("All") reads in the brand colour — grey said "nothing chosen".
              TONE[selected && (o.tone ?? "neutral") === "neutral" ? "brand" : o.tone ?? "neutral"],
              // Segments of the rail, not toggles: square (the rail owns the rounding and clips), and exactly the
              // rail's height — the toggle defaults (36px, fully rounded) spilled out of a 32px rail as pills.
              "relative inline-flex h-auto min-w-0 shrink-0 items-center gap-1.5 self-stretch rounded-none border-l border-border px-3 text-xs leading-none whitespace-nowrap transition-colors first:border-l-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--seg) motion-reduce:transition-none",
              // The tint keys off the pressed state, so the toggle's own `aria-pressed:bg-muted` cannot win; mixed in
              // OKLab — OKLCH has no hue for `transparent`, and the mix came out wrong (the tint never showed). 10% is the
              // tint the tokens are tuned for (tokens.css: "text on its own /10 tint" ≥ 4.5:1); 12–18% failed contrast.
              selected
                // The rail's own pressed recipe — a tint and the tone's ink — overriding the Toggle's filled-brand
                // pressed state (fill, white text, brand border), which belongs to stand-alone toggles.
                ? "font-bold text-(--seg-ink) aria-pressed:border-border aria-pressed:text-(--seg-ink) aria-pressed:bg-[color-mix(in_oklab,var(--seg)_10%,transparent)] aria-pressed:hover:bg-[color-mix(in_oklab,var(--seg)_14%,transparent)] aria-pressed:hover:text-(--seg-ink)"
                : "font-semibold text-muted-foreground hover:bg-muted",
            )}
          >
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-(--seg)", empty && "opacity-35")} />
            <span>{o.label}</span>
            <span className={cn("tabular font-bold", selected ? "text-inherit" : "text-foreground", empty && "opacity-40")}>
              {o.count}
            </span>
            {/* The accessible name is the visible text plus this — never a separate aria-label, so a
                speech user saying what they see ("click Pending 2") matches it. */}
            <span className="sr-only">
              {` ${noun}`}
              {o.detail ? `, ${o.detail}` : ""}
            </span>
            {showShare ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-[color-mix(in_oklch,var(--seg)_14%,transparent)]">
                <span
                  className={cn("block h-full bg-(--seg) transition-[width] duration-300 motion-reduce:transition-none", selected ? "opacity-100" : "opacity-60")}
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
              </span>
            ) : (
              selected && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-(--seg)" />
            )}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
