import * as React from "react"
import { SlidersHorizontal } from "lucide-react"
import { useIsMobile } from "@/ds/hooks/use-mobile"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/ds/ui/sheet"
import { ToolButton } from "./tool-button"

/** How many fields differ from the empty filter — the number shown on the Filters button. */
export function countActiveFilters<T extends object>(value: T, empty: T): number {
  return (Object.keys(empty) as Array<keyof T>).filter(
    (k) => JSON.stringify(value[k]) !== JSON.stringify(empty[k]),
  ).length
}

/**
 * Opens the filter sheet; says how many filters are applied, in text as well as the count badge.
 * `iconOnly`: the table toolbar form — the kit `ToolButton` (outline, tinted while filters apply, count badge).
 */
export function FilterSheetButton({
  count,
  onClick,
  iconOnly = false,
}: {
  count: number
  onClick: () => void
  iconOnly?: boolean
}) {
  if (iconOnly) {
    return (
      <ToolButton label="Filters" active={count > 0} count={count} onClick={onClick}>
        <SlidersHorizontal aria-hidden />
      </ToolButton>
    )
  }
  return (
    <Button variant={count > 0 ? "tinted" : "outline"} onClick={onClick}>
      <SlidersHorizontal data-icon="inline-start" aria-hidden />
      Filters
      {count > 0 && (
        <Badge variant="brand" className="ml-0.5">
          {count}
          <span className="sr-only"> applied</span>
        </Badge>
      )}
    </Button>
  )
}

/**
 * The table filter workspace. Edits a draft copy; **Apply** commits it, **Reset** clears and applies in one
 * click. Replaces the live kit's `FilterSheet` + `FilterSheetButton` (same draft / set contract).
 */
export function FilterSheet<T extends object>({
  open,
  onOpenChange,
  value,
  empty,
  title = "Filters",
  description,
  onApply,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Applied filters. */
  value: T
  /** Reset target; a field counts as active when it differs from this. */
  empty: T
  title?: string
  description?: React.ReactNode
  onApply: (next: T) => void
  /** Fields bound to the draft. */
  children: (draft: T, set: <K extends keyof T>(key: K, next: T[K]) => void) => React.ReactNode
}) {
  const [draft, setDraft] = React.useState(value)
  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const set = React.useCallback(<K extends keyof T>(key: K, next: T[K]) => {
    setDraft((d) => ({ ...d, [key]: next }))
  }, [])

  function apply(next: T) {
    onApply(next)
    onOpenChange(false)
  }

  const isPhone = useIsMobile()
  const draftCount = countActiveFilters(draft, empty)
  // Nothing picked and nothing applied: Reset would do nothing, so it says so instead of being a dead click.
  const nothingToReset = draftCount === 0 && countActiveFilters(value, empty) === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/*
        Always full height, so the footer never moves while cascading fields come and go (Apply/Reset stay under
        the thumb). Phones get a full-width bottom sheet; tablet and up a fixed 384px right panel. The width is
        fixed on purpose: a panel that grows with its content shifts under the pointer as options change.
      */}
      <SheetContent
        side={isPhone ? "bottom" : "right"}
        fit="full"
        className="flex flex-col data-[side=bottom]:h-[calc(100dvh-6rem)]"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">{children(draft, set)}</div>
        <SheetFooter className="flex-row border-t">
          <Button variant="outline" className="flex-1" disabled={nothingToReset} onClick={() => apply(empty)}>
            Reset
          </Button>
          <Button className="flex-1" onClick={() => apply(draft)}>
            {draftCount > 0 ? `Apply (${draftCount})` : "Apply"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
