import * as React from "react"
import { SlidersHorizontal } from "lucide-react"
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

/** How many fields differ from the empty filter — the number shown on the Filters button. */
export function countActiveFilters<T extends object>(value: T, empty: T): number {
  return (Object.keys(empty) as Array<keyof T>).filter(
    (k) => JSON.stringify(value[k]) !== JSON.stringify(empty[k]),
  ).length
}

/** Opens the filter sheet; says how many filters are applied, in text as well as the count badge. */
export function FilterSheetButton({ count, onClick }: { count: number; onClick: () => void }) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4">{children(draft, set)}</div>
        <SheetFooter className="flex-row border-t">
          <Button variant="outline" className="flex-1" onClick={() => apply(empty)}>
            Reset
          </Button>
          <Button className="flex-1" onClick={() => apply(draft)}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
