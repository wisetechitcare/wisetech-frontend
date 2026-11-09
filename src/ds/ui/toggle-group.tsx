import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cn } from "cn"

/**
 * A row of pressable toggles, one (or, with `multiple`, several) pressed at a time. Base UI owns the
 * behaviour: `aria-pressed`/`data-pressed`, roving focus with arrow keys, loop focus. Unstyled
 * beyond the essentials — patterns (e.g. SegmentedFilter) dress it.
 */
function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex shrink-0 items-center justify-center outline-none select-none disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
