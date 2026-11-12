import * as React from "react"
import { titleCase } from "@/ds/lib/text"
import { cn } from "@/ds/lib/utils"
import { IconSlot, type IconSource } from "@/ds/ui/dynamic-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"

export type PageTabItem = {
  value: string
  label: string
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
 * A module's top-level tab bar: a primary-coloured strip that sticks under the app header, icon + label
 * tabs, and a `headerAction` slot on the right (where the `SensitiveToggle variant="onPrimary"` eye sits).
 * Replaces the live `MaterialHeaderTab`. Composes `ui/tabs`.
 *
 * On a phone the labels drop and every tab is an icon square (the name stays for screen readers and as the
 * tab's `title`); the selected tab is marked by its fill. The strip scrolls sideways if tabs still do not
 * fit, while `headerAction` stays pinned.
 *
 * Sticky offset: the bar sticks at `var(--page-tabs-offset, 0px)`. A host whose app header is fixed sets
 * that variable on the bar via `className` (e.g. `min-[992px]:[--page-tabs-offset:74px]`).
 *
 * Controlled with `value` + `onValueChange`, or uncontrolled (opens on the first visible tab).
 */
export function PageTabs({
  items,
  value,
  onValueChange,
  headerAction,
  className,
}: {
  items: PageTabItem[]
  value?: string
  onValueChange?: (value: string, event: Event) => void
  /** Pinned to the right of the bar, vertically centred. */
  headerAction?: React.ReactNode
  /** Classes for the sticky bar (sticky offset variable, extra spacing). */
  className?: string
}) {
  const shown = items.filter((item) => !item.hidden)
  const selected = value ?? shown[0]?.value

  return (
    <Tabs
      value={selected}
      onValueChange={(next, details) => onValueChange?.(next as string, (details as { event: Event }).event)}
      className="gap-0"
    >
      <div
        data-slot="page-tabs-bar"
        className={cn(
          // z-[99]: above page content, below the app chrome (header, drawers, dropdowns).
          "sticky top-(--page-tabs-offset,0px) z-[99] flex min-h-[52px] w-full min-w-0 items-center bg-primary text-primary-foreground",
          className,
        )}
      >
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList
            aria-label="Sections"
            className="h-auto w-max justify-start gap-1 rounded-none bg-transparent px-3 py-[9px] max-sm:px-1.5 max-sm:py-[8px]"
          >
            {shown.map((item) => (
              <PageTab key={item.value} item={item} />
            ))}
          </TabsList>
        </div>
        {headerAction && (
          <div className="flex shrink-0 items-center gap-2 pr-3 pl-2.5 max-sm:ml-0.5 max-sm:self-stretch max-sm:border-l max-sm:border-primary-foreground/20 max-sm:pr-1.5 sm:pr-6">
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

function PageTab({ item }: { item: PageTabItem }) {
  const label = titleCase(item.label)
  const count = typeof item.badge === "number" && item.badge > 0 ? (item.badge > 99 ? "99+" : String(item.badge)) : null
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
        // Phone: a 36px icon square; the label is kept for assistive tech.
        "max-sm:relative max-sm:size-[36px] max-sm:rounded-[10px] max-sm:px-0 max-sm:data-active:bg-primary-foreground/18",
      )}
    >
      {item.icon && <IconSlot icon={item.icon} className="size-[19px] max-sm:size-[21px]" />}
      <span className="max-sm:sr-only">{label}</span>
      {count && (
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-foreground/25 px-1 text-[11px] leading-none font-bold text-primary-foreground group-data-active/page-tab:bg-primary-foreground group-data-active/page-tab:text-primary max-sm:absolute max-sm:-top-0.5 max-sm:-right-0.5 max-sm:h-4 max-sm:min-w-4 max-sm:bg-primary-foreground max-sm:text-[10px] max-sm:text-primary">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
