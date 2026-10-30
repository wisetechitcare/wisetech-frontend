import * as React from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"
import { cn } from "@/ds/lib/utils"

/** Card accent: drives the corner glow, icon tile and sparkline. Trend colour stays semantic (good/bad), never the tone. */
export type StatTone = "brand" | "success" | "warning" | "info" | "danger"

const TONES: Record<StatTone, React.CSSProperties> = {
  brand: { "--tone": "var(--primary)", "--tone-ink": "var(--accent-foreground)" } as React.CSSProperties,
  success: { "--tone": "var(--success)", "--tone-ink": "var(--success-foreground)" } as React.CSSProperties,
  warning: { "--tone": "var(--warning)", "--tone-ink": "var(--warning-foreground)" } as React.CSSProperties,
  info: { "--tone": "var(--info)", "--tone-ink": "var(--info-foreground)" } as React.CSSProperties,
  danger: { "--tone": "var(--destructive)", "--tone-ink": "var(--destructive-foreground)" } as React.CSSProperties,
}

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
 * Status is never colour-only: the trend carries an arrow and text.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  sparkline,
  tone = "brand",
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
  /** e.g. { direction: "up", value: "12%", good: true } */
  trend?: { direction: "up" | "down"; value: string; good?: boolean }
  hint?: React.ReactNode
  /** Recent values, oldest first; drawn as a small area chart. */
  sparkline?: number[]
  tone?: StatTone
  className?: string
}) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp
  const hasFooter = trend || hint || (sparkline && sparkline.length > 1)
  return (
    <Card className={cn("relative gap-4 transition-shadow hover:shadow-md", className)} style={TONES[tone]}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-(--tone) opacity-[0.13] blur-3xl dark:opacity-[0.2]"
      />
      <CardHeader className="relative">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="tabular text-3xl font-semibold">{value}</CardTitle>
        {icon && (
          <CardAction>
            <span className="grid size-11 place-items-center rounded-2xl bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] text-(--tone-ink) ring-1 ring-[color-mix(in_oklch,var(--tone)_22%,transparent)] [&>svg]:size-5">
              {icon}
            </span>
          </CardAction>
        )}
      </CardHeader>
      {hasFooter && (
        <CardFooter className="relative items-end justify-between gap-3 text-xs">
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
