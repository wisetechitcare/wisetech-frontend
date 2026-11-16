import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"

/**
 * The row of quick filters above a list — organisation, branch, team, status — with a clear-all.
 * Replaces the live kit's `OrgFilterToolbar` (and the status `StatusCyclePill`: put a ToggleGroup with
 * counts in it instead). Put rarely used filters in a Filter Sheet, not here. Wraps on narrow screens.
 */
export function FilterToolbar({
  children,
  activeCount = 0,
  onClear,
  actions,
  className,
}: {
  /** The filters: Selects, Comboboxes, a ToggleGroup. Each must have a visible or aria label. */
  children: React.ReactNode
  activeCount?: number
  onClear?: () => void
  /** Right side: Filters button, view switch, export. */
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="toolbar"
      aria-label="Filters"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {children}
      {activeCount > 0 && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" aria-hidden />
          Clear filters ({activeCount})
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
