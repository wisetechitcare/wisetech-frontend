import * as React from "react"
import { titleCase } from "@/ds/lib/text"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { IconSlot, type IconSource } from "@/ds/ui/dynamic-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"

export type PageTabItem = {
  value: string
  label: string
  /** Shorter name for the phone bar's icon-over-name mode. Omitted: the full label. */
  shortLabel?: string
  /** A Lucide component, or a stored icon name. */
  icon?: IconSource | null
  /** A count pill beside the label (hidden at 0). */
  badge?: number
  /** The panel shown under the bar while this tab is selected. */
  content?: React.ReactNode
  /** Access-gated tabs: skipped entirely, as if not passed. */
  hidden?: boolean
}

/**
 * How much the phone bar can say, from its measured width, in four steps (same order and thresholds as the
 * live `MaterialHeaderTab`):
 *   row   - every tab fits as icon + name on one line
 *   nav   - room for every tab at NAV_CELL: icon over a short name
 *   icons - icon squares, and the SELECTED tab also shows its name
 *   bare  - icons only, the selected tab marked by its fill
 * Width 0 (not measured yet) assumes `nav`, never `row`: `row` would claim everything fits on first paint
 * and shove the header action off the edge.
 */
export type PhoneTabMode = "row" | "nav" | "icons" | "bare"

export const PHONE_TAB_METRICS = { iconCell: 36, gap: 4, nameRoom: 92, navCell: 64, rowChrome: 46 } as const

export function pickPhoneTabMode(available: number, count: number, rowNeeded: number): PhoneTabMode {
  const { iconCell, gap, nameRoom, navCell } = PHONE_TAB_METRICS
  const gaps = Math.max(0, count - 1) * gap
  if (available === 0) return "nav"
  if (available >= rowNeeded + gaps) return "row"
  if (available >= count * navCell + gaps) return "nav"
  if (available >= count * iconCell + gaps + nameRoom) return "icons"
  return "bare"
}

/** Width of every name at the phone row's bold 12.5px, plus each tab's padding, icon and gap. */
function measureRowNeeded(names: string[]): number {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null
  } catch {
    ctx = null // jsdom: no canvas
  }
  if (!ctx) return Infinity
  ctx.font = "700 12.5px Inter, sans-serif"
  return names.reduce((sum, name) => sum + Math.ceil(ctx.measureText(name).width) + PHONE_TAB_METRICS.rowChrome, 0)
}

/**
 * A module's top-level tab bar: a primary-coloured strip that sticks under the app header, icon + label
 * tabs, and a `headerAction` slot on the right (where the `SensitiveToggle variant="onPrimary"` eye sits).
 * Replaces the live `MaterialHeaderTab`. Composes `ui/tabs`.
 *
 * Phone: the bar says as much as fits, measured from its real width (see `pickPhoneTabMode`). The strip
 * scrolls sideways if tabs still do not fit, while `headerAction` stays pinned.
 *
 * Sticky offset: the bar sticks at `var(--page-tabs-offset, 0px)`. A host whose app header is fixed sets
 * that variable on the bar via `className` (e.g. `min-[992px]:[--page-tabs-offset:74px]`).
 *
 * Controlled with `value` + `onValueChange`, or uncontrolled (opens on the first visible tab). A `value`
 * pointing at a `hidden` tab falls back to the first visible one and reports it through `onValueChange`.
 * Changing tab scrolls the page to the top (`scrollOnChange`), instantly under reduced motion.
 */
/** Overflow state of the tab strip, from its scroll metrics. 1px of slack absorbs sub-pixel rounding. */
export function scrollEdges(scrollLeft: number, scrollWidth: number, clientWidth: number) {
  const overflow = scrollWidth - clientWidth > 1
  return { overflow, atStart: scrollLeft <= 1, atEnd: scrollLeft + clientWidth >= scrollWidth - 1 }
}

export function PageTabs({
  items,
  value,
  onValueChange,
  headerAction,
  className,
  scrollOnChange = true,
}: {
  items: PageTabItem[]
  value?: string
  onValueChange?: (value: string, event?: Event) => void
  /** Pinned to the right of the bar, vertically centred. */
  headerAction?: React.ReactNode
  /** Classes for the sticky bar (sticky offset variable, extra spacing). */
  className?: string
  /** Scroll the page to the top when the tab changes. */
  scrollOnChange?: boolean
}) {
  const shown = items.filter((item) => !item.hidden)
  const [internal, setInternal] = React.useState(shown[0]?.value)
  const requested = value !== undefined ? value : internal
  const selected = shown.some((item) => item.value === requested) ? requested : shown[0]?.value

  // Standing on a tab that just got hidden: report the move to the first one still open.
  React.useEffect(() => {
    if (value !== undefined && selected !== undefined && selected !== value) onValueChange?.(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selected])

  const change = (next: string, event?: Event) => {
    if (value === undefined) setInternal(next)
    if (scrollOnChange && typeof window !== "undefined" && typeof window.scrollTo === "function") {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    }
    onValueChange?.(next, event)
  }

  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const [edges, setEdges] = React.useState({ overflow: false, atStart: true, atEnd: true })
  const measureEdges = React.useCallback(() => {
    const el = listRef.current
    if (!el) return
    const next = scrollEdges(el.scrollLeft, el.scrollWidth, el.clientWidth)
    setEdges((prev) => (prev.overflow === next.overflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next))
  }, [])
  const itemsKey = shown.map((item) => `${item.value}:${item.label}:${item.badge ?? ""}`).join("|")
  React.useLayoutEffect(() => {
    measureEdges()
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(measureEdges)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [measureEdges, itemsKey, headerAction])
  // Scroll by about one viewport of tabs; the arrows are a mouse affordance (keyboard moves with the arrow keys).
  const scrollTabs = (direction: -1 | 1) => {
    const el = listRef.current
    if (!el) return
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 120), behavior: reduced ? "auto" : "smooth" })
  }
  // The selected tab must be on screen, whatever moved the selection (URL, click, keyboard).
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ inline: "nearest", block: "nearest" })
  }, [selected])
  const namesKey = shown.map((item) => titleCase(item.shortLabel ?? item.label)).join("|")
  const rowNeeded = React.useMemo(() => measureRowNeeded(namesKey.split("|")), [namesKey])
  const mode = pickPhoneTabMode(width, shown.length, rowNeeded)

  return (
    <Tabs
      value={selected}
      onValueChange={(next, details) => change(next as string, (details as { event?: Event } | undefined)?.event)}
      className="gap-0"
    >
      <div
        data-slot="page-tabs-bar"
        data-phone-mode={mode}
        className={cn(
          // z-[99]: above page content, below the app chrome (header, drawers, dropdowns).
          "sticky top-(--page-tabs-offset,0px) z-[99] flex min-h-[52px] w-full min-w-0 items-center bg-primary text-primary-foreground max-sm:gap-1.5 max-sm:px-1.5",
          className,
        )}
      >
        {edges.overflow && (
          <ScrollButton direction={-1} disabled={edges.atStart} onClick={() => scrollTabs(-1)} />
        )}
        <div
          ref={listRef}
          onScroll={measureEdges}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList
            aria-label="Sections"
            className="h-auto w-max justify-start gap-1 rounded-none bg-transparent px-3 py-[9px] max-sm:w-full max-sm:min-w-max max-sm:justify-between max-sm:px-0 max-sm:py-[8px]"
          >
            {shown.map((item) => (
              <PageTab key={item.value} item={item} selected={item.value === selected} mode={mode} />
            ))}
          </TabsList>
        </div>
        {edges.overflow && (
          <ScrollButton direction={1} disabled={edges.atEnd} onClick={() => scrollTabs(1)} />
        )}
        {headerAction && (
          <div className="flex shrink-0 items-center gap-2 pr-3 pl-2.5 max-sm:ml-0.5 max-sm:self-stretch max-sm:border-l max-sm:border-primary-foreground/20 max-sm:pr-1 max-sm:pl-2 sm:pr-6">
            {headerAction}
          </div>
        )}
      </div>
      {shown.map((item) =>
        item.content === undefined ? null : (
          <TabsContent key={item.value} value={item.value} className="px-3 pt-3 sm:px-5 sm:pt-7 lg:px-9">
            {item.content}
          </TabsContent>
        ),
      )}
    </Tabs>
  )
}

/** Start/end scroll arrow for an overflowing tab strip (tablet and up; a phone swipes). */
function ScrollButton({ direction, disabled, onClick }: { direction: -1 | 1; disabled: boolean; onClick: () => void }) {
  const Icon = direction === -1 ? ChevronLeft : ChevronRight
  return (
    <Button
      variant="tinted"
      size="icon-sm"
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === -1 ? "Scroll tabs left" : "Scroll tabs right"}
      data-slot="page-tabs-scroll"
      // White ink on the primary bar (the Button story's on-dark tint); faded at the end it cannot go past.
      className="[--tint:white] [--tint-ink:white] shrink-0 disabled:opacity-30 max-sm:hidden"
    >
      <Icon aria-hidden />
    </Button>
  )
}

function PageTab({ item, selected, mode }: { item: PageTabItem; selected: boolean; mode: PhoneTabMode }) {
  const label = titleCase(item.label)
  const shortLabel = titleCase(item.shortLabel ?? item.label)
  const count = typeof item.badge === "number" && item.badge > 0 ? (item.badge > 99 ? "99+" : String(item.badge)) : null
  const nav = mode === "nav"
  // Does the phone bar show the full name beside the icon? row: always; icons: the selected tab only.
  const named = mode === "row" || (mode === "icons" && selected)
  return (
    <TabsTrigger
      value={item.value}
      title={label}
      className={cn(
        // The bar is primary, so the tab ink is the bar's own foreground at different alphas.
        "group/page-tab h-[34px] flex-none gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-primary-foreground/90 shadow-none",
        "hover:bg-primary-foreground/8 hover:text-primary-foreground",
        "data-active:bg-primary-foreground/16 data-active:font-bold data-active:text-primary-foreground data-active:shadow-none data-active:hover:bg-primary-foreground/20",
        "dark:text-primary-foreground/90 dark:hover:text-primary-foreground dark:data-active:bg-primary-foreground/16 dark:data-active:text-primary-foreground",
        "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
        // Phone: 36px cells; the mode decides what they say.
        "max-sm:relative max-sm:h-[36px] max-sm:min-h-[36px] max-sm:rounded-[10px] max-sm:px-0 max-sm:data-active:bg-primary-foreground/18",
        mode === "row" && "max-sm:min-w-0 max-sm:flex-[1_1_auto] max-sm:gap-1.5 max-sm:px-2.5 max-sm:text-[12.5px]",
        nav && "max-sm:h-auto max-sm:min-w-0 max-sm:flex-[1_1_0] max-sm:flex-col max-sm:gap-[3px] max-sm:px-1 max-sm:py-1.5",
        mode === "icons" && (selected ? "max-sm:min-w-0 max-sm:flex-[0_1_auto] max-sm:px-3" : "max-sm:w-[36px]"),
        mode === "bare" && "max-sm:w-[36px]",
      )}
    >
      {item.icon && <IconSlot icon={item.icon} className="size-[19px] max-sm:size-[21px]" />}
      {/* Full name: desktop only visually; on a phone it stays for screen readers (the tab's accessible name). */}
      <span className="max-sm:sr-only">{label}</span>
      {/* Phone: what the bar can say is the SHORT name (the one measured), in nav under the icon or beside it. */}
      {(nav || named) && (
        <span
          aria-hidden
          className={cn(
            "sm:hidden",
            nav
              ? "line-clamp-2 max-w-full text-center text-[10.5px] leading-[1.15] font-semibold group-data-active/page-tab:font-bold"
              : "min-w-0 truncate",
          )}
        >
          {shortLabel}
        </span>
      )}
      {count && (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-foreground/25 px-1 text-[11px] leading-none font-bold text-primary-foreground group-data-active/page-tab:bg-primary-foreground group-data-active/page-tab:text-primary max-sm:absolute max-sm:-top-0.5 max-sm:-right-0.5 max-sm:h-4 max-sm:min-w-4 max-sm:bg-primary-foreground max-sm:text-[10px] max-sm:text-primary">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
