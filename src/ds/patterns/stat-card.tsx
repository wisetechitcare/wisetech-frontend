import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ds/ui/card"

/** KPI tile on shadcn's Card: label, big tabular number, optional trend and hint. Status is never colour-only. */
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
    <Card className={className}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="tabular text-3xl font-semibold">{value}</CardTitle>
        {icon && (
          <CardAction>
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground [&>svg]:size-4">
              {icon}
            </span>
          </CardAction>
        )}
      </CardHeader>
      {(trend || hint) && (
        <CardFooter className="gap-2 text-xs">
          {trend && (
            <Badge variant={trend.good ? "success" : "danger"}>
              <TrendIcon data-icon="inline-start" aria-hidden />
              {trend.value}
            </Badge>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </CardFooter>
      )}
    </Card>
  )
}
