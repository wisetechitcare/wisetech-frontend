import * as React from "react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Badge } from "@/ds/ui/badge"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import { Label } from "@/ds/ui/label"
import { Skeleton } from "@/ds/ui/skeleton"
import { SectionHeader } from "./section-header"

/** Whether the thing this section configures is switched on, and whether it is healthy. */
export type SettingsSectionStatus = "active" | "inactive" | "warning" | "error"

const STATUS: Record<SettingsSectionStatus, { variant: "success" | "neutral" | "warning" | "danger"; label: string }> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "neutral", label: "Inactive" },
  warning: { variant: "warning", label: "Warning" },
  error: { variant: "danger", label: "Error" },
}

/**
 * One group of settings on a configuration screen (Leave policy, Attendance, Payroll…). Replaces the live
 * kit's `SettingsSection` and `ConfigSectionCard`: the frame every config engine shares, so those screens
 * stop drifting apart. Fill it with `SettingsRow`s (or any content); `divided` puts a hairline between rows.
 */
export function SettingsSection({
  title,
  description,
  icon,
  tone = "brand",
  count,
  status,
  action,
  loading = false,
  size = "default",
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
  /** A state pill beside the title. Never colour alone — each one carries its word. */
  status?: SettingsSectionStatus
  action?: React.ReactNode
  /** First paint only — see the note on `showSkeleton` below. */
  loading?: boolean
  /** `sm` tightens the padding for a dense configuration page. */
  size?: "default" | "sm"
  divided?: boolean
  children?: React.ReactNode
  className?: string
}) {
  /**
   * Skeletons are for the FIRST paint only — never for a refetch.
   *
   * Swapping `children` out on every `loading` pass UNMOUNTS them, and a section body is not a
   * dumb list: category and preset-task trees keep their expanded set in local state, so a save
   * that triggered a refetch silently collapsed the tree the user had just opened. The card also
   * shrank to three skeleton lines, which collapsed the page height and threw the scroll position
   * back to the top — so an edit made three screens down came back at screen one, tree closed.
   *
   * Once the body has rendered real content a later load keeps showing it. The header still
   * reflects `loading`, so the refresh stays visible without destroying what is on screen.
   */
  const hasRenderedBody = React.useRef(false)
  if (!loading) hasRenderedBody.current = true
  const showSkeleton = loading && !hasRenderedBody.current

  return (
    <Card tone={tone} size={size} className={className}>
      <CardHeader>
        <SectionHeader
          icon={icon}
          tone={tone}
          title={
            <span className="inline-flex items-center gap-2">
              {loading ? (
                <>
                  <Skeleton aria-hidden className="h-4 w-36 rounded-md" />
                  {/* The title is KNOWN while loading; only its pixels are pending. Without this the
                      <h2> has no accessible text at all (axe: empty-heading). */}
                  <span className="sr-only">{title}</span>
                </>
              ) : (
                title
              )}
              {!loading && count !== undefined && <Badge variant="neutral">{count}</Badge>}
              {!loading && status && (
                <Badge variant={STATUS[status].variant} dot>
                  {STATUS[status].label}
                </Badge>
              )}
            </span>
          }
          description={loading && description ? <Skeleton className="h-3 w-56 rounded-md" /> : description}
          /* An action is a write; it stays hidden until the section's real state is on screen. */
          action={loading ? undefined : action}
        />
      </CardHeader>
      {children && (
        <CardContent className={cn(divided && !showSkeleton && "divide-y [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0")}>
          {showSkeleton ? (
            <div className="flex flex-col gap-2" role="status" aria-busy aria-label="Loading section">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
              <Skeleton className="h-3.5 w-3/5 rounded-md" />
            </div>
          ) : (
            children
          )}
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
