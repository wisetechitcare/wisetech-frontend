import * as React from "react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Badge } from "@/ds/ui/badge"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import { Label } from "@/ds/ui/label"
import { SectionHeader } from "./section-header"

/**
 * One group of settings on a configuration screen (Leave policy, Attendance, Payroll…). Replaces the live
 * kit's `SettingsSection`: the frame every config engine shares, so those screens stop drifting apart.
 * Fill it with `SettingsRow`s (or any content); `divided` puts a hairline between rows.
 */
export function SettingsSection({
  title,
  description,
  icon,
  tone = "brand",
  count,
  action,
  divided = true,
  children,
  className,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  tone?: Tone | (string & {})
  /** How many items the section holds (rules, types…). */
  count?: number | string
  action?: React.ReactNode
  divided?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Card tone={tone} className={className}>
      <CardHeader>
        <SectionHeader
          icon={icon}
          tone={tone}
          title={
            <span className="inline-flex items-center gap-2">
              {title}
              {count !== undefined && <Badge variant="neutral">{count}</Badge>}
            </span>
          }
          description={description}
          action={action}
        />
      </CardHeader>
      {children && (
        <CardContent className={cn(divided && "divide-y [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0")}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * A single setting: what it is and what it does on the left, its control on the right (stacked on phones).
 * Give the control the `id` you pass as `htmlFor` so the label names it.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  control,
  className,
}: {
  label: React.ReactNode
  description?: React.ReactNode
  htmlFor?: string
  control: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8", className)}>
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}
