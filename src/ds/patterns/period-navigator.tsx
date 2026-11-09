import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { ButtonGroup } from "@/ds/ui/button-group"

/**
 * Step through periods — ‹ October 2026 › — on attendance, payroll and timesheet screens. Replaces the
 * live `PeriodNavigator`. The label is announced when it changes; "Today" jumps back to the current period.
 */
export function PeriodNavigator({
  label,
  secondaryLabel,
  onPrevious,
  onNext,
  onToday,
  disablePrevious,
  disableNext,
  unit = "month",
  className,
}: {
  label: string
  /** e.g. "22 working days" */
  secondaryLabel?: string
  onPrevious: () => void
  onNext: () => void
  /** Shows a "Today" button when given. */
  onToday?: () => void
  disablePrevious?: boolean
  disableNext?: boolean
  /** Names the buttons: "Previous month", "Next week"… */
  unit?: "day" | "week" | "month" | "year" | "period"
  className?: string
}) {
  return (
    <div data-slot="period-navigator" className={cn("flex items-center gap-3", className)}>
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label={`Previous ${unit}`} disabled={disablePrevious} onClick={onPrevious}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="outline" size="icon" aria-label={`Next ${unit}`} disabled={disableNext} onClick={onNext}>
          <ChevronRight aria-hidden />
        </Button>
      </ButtonGroup>
      <div className="min-w-0" aria-live="polite">
        <p className="truncate text-base font-semibold tabular">{label}</p>
        {secondaryLabel && <p className="truncate text-xs text-muted-foreground">{secondaryLabel}</p>}
      </div>
      {onToday && (
        <Button variant="ghost" size="sm" onClick={onToday}>
          Today
        </Button>
      )}
    </div>
  )
}
