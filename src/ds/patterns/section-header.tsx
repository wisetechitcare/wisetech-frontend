import * as React from "react"
import { titleCaseChildren } from "@/ds/lib/text"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { IconBox } from "./icon-box"

/**
 * Title row for a region inside a page or card: icon tile, title, one line of description, an action.
 * Replaces the live kit's `SectionHead` and the header of `DetailCard` / `SettingsSection`.
 * The page's own title is PageHeader (the only h1); sections use h2, nested regions h3.
 */
export function SectionHeader({
  title,
  description,
  icon,
  tone = "brand",
  action,
  as: Heading = "h2",
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone | (string & {})
  action?: React.ReactNode
  as?: "h2" | "h3"
  className?: string
}) {
  return (
    <div data-slot="section-header" className={cn("flex items-center gap-3", className)}>
      <div className="min-w-0 flex-1">
        <Heading data-slot="section-title" className="heading-case truncate text-base leading-snug">{titleCaseChildren(title)}</Heading>
        {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {/* Icon top-right — the card rule (cards right, rows left, dialogs left). */}
      {icon && <IconBox icon={icon} tone={tone} size="lg" />}
    </div>
  )
}
