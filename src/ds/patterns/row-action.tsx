import * as React from "react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

const TINT = {
  default: undefined,
  danger: "[--tint:var(--cta-danger)]",
  success: "[--tint:var(--cta-success)]",
  muted: "[--tint:var(--muted-foreground)]",
} as const

/**
 * One icon action on a row or card (edit, delete, open, view people): the Button `Tinted` recipe with
 * its label in a Tooltip AND as the accessible name — the kit's rule for every icon-only control.
 * `tint` takes the CTA colours from the Button story (`danger` for destructive actions).
 *
 * The click never reaches the row underneath, so a clickable row can carry actions of its own.
 * For toolbar on/off tools use `ToolButton` (outline at rest) instead.
 */
export function RowAction({
  label,
  onClick,
  tint = "default",
  disabled,
  size = "icon",
  className,
  children,
}: {
  label: string
  onClick: () => void
  tint?: keyof typeof TINT
  disabled?: boolean
  size?: "icon" | "icon-sm"
  className?: string
  /** The icon (Lucide, `aria-hidden`). */
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="tinted"
            size={size}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className={cn(TINT[tint], className)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
