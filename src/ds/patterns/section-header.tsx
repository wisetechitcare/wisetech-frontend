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
    // Wraps on a narrow card: the action drops to its own line instead of running off the edge (on a phone
    // a Settings Section's "Add" button and half its description used to sit outside the card, unreachable).
    <div data-slot="section-header" className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="min-w-0 flex-1 basis-48">
        <Heading data-slot="section-title" className="heading-case line-clamp-2 text-base leading-snug break-words sm:line-clamp-none sm:truncate">{titleCaseChildren(title)}</Heading>
        {description && <p data-slot="section-description" className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{description}</p>}
      </div>
      {/* Icon top-right — the card rule (cards right, rows left, dialogs left); it stays beside the title when the
          action wraps below. */}
      {icon && <IconBox icon={icon} tone={tone} size="lg" className="order-2 sm:order-3" />}
      {action && <div className="order-3 max-w-full shrink-0 sm:order-2">{action}</div>}
    </div>
  )
}
