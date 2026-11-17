import * as React from "react"
import { ListTree } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Label } from "@/ds/ui/label"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ds/ui/popover"
import { Switch } from "@/ds/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

/** One column the rows can be grouped by. `level` is its place in the grouping (1 = outermost), or null. */
export interface GroupingPanelItem {
  id: string
  label: string
  level: number | null
}

/**
 * The DataTable's "Group rows" tool (the live table's Group by): one switch per column that rows can be grouped by.
 * Switching several on nests the groups in the order they were switched on — the level number says which is
 * outermost. Same shape as the Columns panel (switches, not menu items: the panel stays open for the next pick),
 * with Expand All / Collapse All and Clear underneath.
 */
export function GroupingPanel({
  items,
  onToggle,
  onClear,
  onExpandAll,
  allExpanded,
}: {
  items: GroupingPanelItem[]
  onToggle: (id: string, on: boolean) => void
  onClear: () => void
  onExpandAll: (expanded: boolean) => void
  allExpanded: boolean
}) {
  const baseId = React.useId()
  const levels = items.filter((i) => i.level !== null).length
  // The count is visible text, so it is also the accessible name (the ToolButton rule).
  const name = levels ? `Group rows ${levels} applied` : "Group rows"
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button variant={levels ? "tinted" : "outline"} size="icon" aria-label={name} className={levels ? "relative" : undefined} />}
            />
          }
        >
          <ListTree aria-hidden />
          {levels > 0 && (
            <Badge variant="brand" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]">
              {levels}
            </Badge>
          )}
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        <PopoverHeader className="px-4 pt-4 pb-2">
          <PopoverTitle>Group rows</PopoverTitle>
          <PopoverDescription className="text-xs">Turn on a column to group rows by its value. Several nest in order.</PopoverDescription>
        </PopoverHeader>
        <ul data-slot="grouping-panel-list" aria-label="Group by" className="max-h-[min(60vh,420px)] overflow-y-auto px-2 pb-2">
          {items.map((c) => {
            const id = `${baseId}-${c.id}`
            return (
              <li key={c.id} data-slot="grouping-panel-item" className="flex min-h-9 items-center gap-2.5 rounded-lg px-2 hover:bg-muted/60">
                <Switch id={id} size="sm" checked={c.level !== null} onCheckedChange={(on) => onToggle(c.id, !!on)} />
                <Label htmlFor={id} className={cn("min-w-0 flex-1 truncate font-normal", c.level === null && "text-muted-foreground")}>
                  {c.label}
                </Label>
                {c.level !== null && levels > 1 && (
                  <Badge variant="neutral" className="shrink-0">Level {c.level}</Badge>
                )}
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
          <Button variant="ghost" size="sm" disabled={!levels} onClick={() => onExpandAll(!allExpanded)}>
            {allExpanded ? "Collapse All" : "Expand All"}
          </Button>
          <Button variant="ghost" size="sm" disabled={!levels} onClick={onClear}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
