import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/ds/lib/utils"

/** KPI tile: label, big tabular number, optional trend and hint. Status is never colour-only. */
export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
  /** e.g. { direction: "up", value: "12%", good: true } */
  trend?: { direction: "up" | "down"; value: string; good?: boolean }
  hint?: React.ReactNode
  className?: string
}) {
  const TrendIcon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-e1", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-label font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground [&>svg]:size-4">
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-display font-semibold text-foreground">{value}</p>
      {(trend || hint) && (
        <div className="mt-2 flex items-center gap-2 text-label">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                trend.good ? "bg-success-soft text-success-foreground" : "bg-destructive-soft text-destructive-foreground",
              )}
            >
              <TrendIcon className="size-3" aria-hidden />
              {trend.value}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  )
}
