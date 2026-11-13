import * as React from "react"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

/**
 * One icon tool in a toolbar's tool group (the Tooltip + ButtonGroup story recipes): `outline` at rest, `tinted`
 * while ON, the label in a tooltip and as the accessible name. The Data Table's tools and the Filter Sheet's
 * icon-only trigger are both this button — one recipe for every table toolbar.
 *
 * `count` adds a number badge (filters applied). The number is visible text, so it is also part of the
 * accessible name ("Filters 3 applied") — what you see is what a screen reader says.
 */
export function ToolButton({
  label,
  active,
  pressed,
  count,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  /** For on/off tools: exposes aria-pressed. */
  pressed?: boolean
  count?: number
  onClick: () => void
  children: React.ReactNode
}) {
  const shown = count && count > 0 ? count : 0
  const name = shown ? `${label} ${shown} applied` : label
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "tinted" : "outline"}
            size="icon"
            aria-label={name}
            aria-pressed={pressed}
            onClick={onClick}
            className={shown ? "relative" : undefined}
          />
        }
      >
        {children}
        {shown > 0 && (
          <Badge variant="brand" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]">
            {shown}
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  )
}
