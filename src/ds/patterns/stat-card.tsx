import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardLink, CardTitle } from "@/ds/ui/card"
import { cn } from "@/ds/lib/utils"
import type { Tone } from "@/ds/lib/tone"
import { IconBox } from "./icon-box"

/**
 * Card accent: drives the corner glow, icon tile and sparkline. Trend colour stays semantic
 * (good/bad), never the tone.
 *
 * This is the kit-wide `Tone`, not a list local to this file. The five status names (brand,
 * success, warning, info, danger) are the same ones a local record would spell out, plus the
 * hue tones and an admin-configured hex — and `toneStyle()` is what ten other components
 * already use, so a stat card cannot drift from a chip beside it.
 */
export type StatTone = Tone

/** Smooth path through the points (Catmull-Rom → cubic Bézier) in a 100×32 box. */
function sparkPath(values: number[]) {
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - min) / span) * 26] as const)
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]]
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`
  }
  return d
}

function Sparkline({ values }: { values: number[] }) {
  const id = React.useId()
  if (values.length < 2) return null
  const line = sparkPath(values)
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-24 shrink-0 overflow-visible text-(--tone)" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,32 L0,32 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * KPI tile on shadcn's Card: label, big tabular number, tinted icon, optional trend, hint and sparkline.
 * Status is never colour-only: the trend carries an arrow and text. `children` render between the
 * header and the footer (e.g. a thumbnail and actions).
 * Motion (all `motion-safe`, transform-only): the icon pops in and the value rises on mount; on hover
 * the card lifts, its glow brightens, the icon wiggles and a tone bar sweeps along the bottom edge.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  sparkline,
  tone = "brand",
  size = "default",
  href,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
  /** e.g. { direction: "up", value: "12%", good: true } */
  trend?: { direction: "up" | "down"; value: string; good?: boolean }
  hint?: React.ReactNode
  /** Recent values, oldest first; drawn as a small area chart. */
  sparkline?: number[]
  /** A status, a category hue, or an admin-configured hex colour. */
  tone?: StatTone | (string & {})
  /** `sm`: compact horizontal tile (icon, label, value) for dense rows — the live kit's StatTile. */
  size?: "default" | "sm"
  /** The list behind the number (a KPI that filters the table below it). Makes the whole card a link. */
  href?: string
  className?: string
}) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp
  const hasFooter = trend || hint || (sparkline && sparkline.length > 1)

  // The compact tile is the benchmark at a smaller size, not a different design: same glow, accent
  // bar, lift, 44px icon tile with pop and wiggle, same label style and number rise. Only what makes
  // it compact changes — one row, tighter padding, a smaller number.
  if (size === "sm") {
    return (
      <Card size="sm" tone={tone} interactive={!!href} className={cn("flex-row items-center gap-3 px-(--card-spacing)", className)}>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="heading-case truncate text-sm text-muted-foreground">{href ? <CardLink href={href}>{label}</CardLink> : label}</p>
          <p className="tabular text-2xl leading-tight font-semibold motion-safe:animate-stat-rise">{value}</p>
        </div>
        {trend && (
          <Badge variant={trend.good ? "success" : "danger"}>
            <TrendIcon data-icon="inline-start" aria-hidden />
            {trend.value}
          </Badge>
        )}
        {icon && <IconBox icon={icon} tone={tone} size="lg" />}
      </Card>
    )
  }

  return (
    // The benchmark tile lives in Card (variant="tile"): glow, accent bar, lift and icon motion are
    // drawn there once, so every tile in the kit matches this one.
    <Card {...props} variant="tile" tone={tone} interactive={!!href} className={cn("gap-4", className)}>
      <CardHeader>
        <CardDescription className="heading-case">{href ? <CardLink href={href}>{label}</CardLink> : label}</CardDescription>
        {/* min-w-0: lets a long text value truncate instead of widening the card. */}
        <CardTitle className="tabular min-w-0 text-3xl font-semibold motion-safe:animate-stat-rise">{value}</CardTitle>
        {icon && (
          <CardAction>
            {/* Card's tile variant animates the icon (pop, hover scale, wiggle). */}
            <IconBox icon={icon} tone={tone} size="lg" />
          </CardAction>
        )}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
      {hasFooter && (
        <CardFooter className="items-end justify-between gap-3 text-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {trend && (
              <Badge variant={trend.good ? "success" : "danger"}>
                <TrendIcon data-icon="inline-start" aria-hidden />
                {trend.value}
              </Badge>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
          {sparkline && <Sparkline values={sparkline} />}
        </CardFooter>
      )}
    </Card>
  )
}
