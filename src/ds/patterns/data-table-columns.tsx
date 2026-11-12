import * as React from "react"
import { ArrowLeftToLine, ArrowRightToLine, Eye } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { Label } from "@/ds/ui/label"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ds/ui/popover"
import { Switch } from "@/ds/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

/** Where a column is pinned: kept at the start (left) or end (right) edge while the rest scrolls sideways. */
export type ColumnPin = false | "start" | "end"

/** One column as the panel shows it — in the table's current order. */
export interface ColumnsPanelItem {
  id: string
  label: string
  visible: boolean
  pin: ColumnPin
}

/** A small on/off pin tool with its own tooltip (the table's ToolButton recipe, row size). */
function PinButton({ label, pressed, onClick, children }: {
  label: string
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={pressed ? "tinted" : "ghost"}
            size="icon-xs"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={cn(!pressed && "text-muted-foreground")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The DataTable's "Show or hide columns" tool: one row per column — a switch to show it, two pins to keep it at the
 * left or right edge — and Hide All / Show All underneath.
 *
 * Switches, not menu checkboxes: each row is a setting that applies the moment it flips and the panel stays open
 * for the next one (a menu closes per pick). The LAST visible column cannot be switched off and Hide All keeps the
 * first one — a table with no columns shows nothing and offers no way back but this panel. Column ORDER is changed
 * by dragging a header in the table itself; the list follows that order.
 */
export function ColumnsPanel({
  items,
  onToggle,
  onShowAll,
  onHideAll,
  onPin,
  pinnable = true,
  reorderable = true,
}: {
  items: ColumnsPanelItem[]
  onToggle: (id: string, visible: boolean) => void
  onShowAll: () => void
  onHideAll: () => void
  onPin: (id: string, pin: ColumnPin) => void
  pinnable?: boolean
  reorderable?: boolean
}) {
  const baseId = React.useId()
  const visibleCount = items.filter((i) => i.visible).length
  const hint = reorderable && pinnable
    ? "Drag a header to reorder; pin a column to keep it in view."
    : reorderable ? "Drag a header to reorder." : pinnable ? "Pin a column to keep it in view." : null
  return (
    <Popover>
      {/* A tooltip like every other table tool: the Tooltip and Popover triggers compose onto one Button. */}
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Show or hide columns" />} />}>
          <Eye aria-hidden />
        </TooltipTrigger>
        <TooltipContent>Show or hide columns</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <PopoverHeader className="px-4 pt-4 pb-2">
          <PopoverTitle>Columns</PopoverTitle>
          {hint && <PopoverDescription className="text-xs">{hint}</PopoverDescription>}
        </PopoverHeader>
        <ul data-slot="columns-panel-list" aria-label="Columns" className="max-h-[min(60vh,420px)] overflow-y-auto px-2 pb-2">
          {items.map((c) => {
            const id = `${baseId}-${c.id}`
            const onlyOne = c.visible && visibleCount <= 1
            return (
              <li key={c.id} data-slot="columns-panel-item" className="flex min-h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-muted/60">
                <Switch
                  id={id}
                  size="sm"
                  checked={c.visible}
                  disabled={onlyOne}
                  onCheckedChange={(on) => onToggle(c.id, !!on)}
                />
                <Label htmlFor={id} className={cn("min-w-0 flex-1 truncate font-normal", !c.visible && "text-muted-foreground")}>
                  {c.label}
                </Label>
                {pinnable && (
                  <span className="flex shrink-0 items-center gap-0.5">
                    <PinButton
                      label={c.pin === "start" ? `Unpin ${c.label}` : `Pin ${c.label} to the left`}
                      pressed={c.pin === "start"}
                      onClick={() => onPin(c.id, c.pin === "start" ? false : "start")}
                    >
                      <ArrowLeftToLine aria-hidden />
                    </PinButton>
                    <PinButton
                      label={c.pin === "end" ? `Unpin ${c.label}` : `Pin ${c.label} to the right`}
                      pressed={c.pin === "end"}
                      onClick={() => onPin(c.id, c.pin === "end" ? false : "end")}
                    >
                      <ArrowRightToLine aria-hidden />
                    </PinButton>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
          <Button variant="ghost" size="sm" disabled={visibleCount <= 1} onClick={onHideAll}>
            Hide All
          </Button>
          <Button variant="ghost" size="sm" disabled={visibleCount === items.length} onClick={onShowAll}>
            Show All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
