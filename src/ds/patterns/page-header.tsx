import * as React from "react"
import { titleCaseChildren } from "@/ds/lib/text"
import { cn } from "@/ds/lib/utils"

/**
 * The one page header every template uses: optional eyebrow, title, description, actions.
 * Title is the page's single h1.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p data-slot="page-eyebrow" className="heading-case text-xs font-medium text-muted-foreground">{titleCaseChildren(eyebrow)}</p>
        )}
        <h1 data-slot="page-title" className="heading-case text-2xl text-foreground">{titleCaseChildren(title)}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
