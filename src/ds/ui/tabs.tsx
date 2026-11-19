import type * as React from "react"
import { Tabs as TabsPrimitive } from "@animate-ui/react/primitives/base-ui/tabs"
import { titleCaseChildren } from "@/ds/lib/text"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-4xl p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:rounded-2xl data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-2.5 group-data-vertical/tabs:py-1.5 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        // WiseTech: the selected tab is unmistakable — a filled brand pill (default variant), brand text + brand
        // underline (line variant). It was the background colour on a muted track, barely different from its siblings.
        "data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm dark:data-active:bg-primary dark:data-active:text-primary-foreground",
        "group-data-[variant=line]/tabs-list:data-active:text-primary group-data-[variant=line]/tabs-list:data-active:shadow-none dark:group-data-[variant=line]/tabs-list:data-active:text-primary",
        "after:absolute after:bg-primary after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
      children={titleCaseChildren(children)}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

/**
 * A pill toggle on Tabs — outlined capsule track, the active option a filled brand pill — so a choice of views or
 * modes reads as a switch, not as a row of plain boxes.
 * Use `ToggleList` for the list and TOGGLE_TAB on each TabsTrigger.
 * The hover tint is limited to unselected tabs (`aria-selected`: the kit's `data-active:` is too
 * low-specificity to override it). The outline is a ring, not `border`: the app's Bootstrap `.border`
 * utility is !important and repaints a Tailwind `border` dark navy.
 */
const TOGGLE_LIST =
  "h-auto gap-1 rounded-full bg-muted p-1 ring-1 ring-border shadow-[inset_0_1px_2px_rgb(15_23_42/0.06)]";

export function ToggleList({ className, children, ...props }: React.ComponentProps<typeof TabsList>) {
  return (
    <TabsList className={cn(TOGGLE_LIST, className)} {...props}>
      {/* A custom (hidden) indicator switches off animate-ui's sliding one. That slid the blue pill
          in after the label had already turned white, so the label vanished for a moment on click;
          without it each tab paints its own pill and switches instantly. */}
      <TabsPrimitive.Indicator className="hidden" />
      {children}
    </TabsList>
  );
}
export const TOGGLE_TAB =
  "rounded-full border-0 px-4 py-1.5 text-muted-foreground not-aria-selected:hover:bg-primary/10 not-aria-selected:hover:text-primary data-active:bg-primary data-active:font-bold data-active:text-primary-foreground data-active:shadow-sm aria-selected:transition-none dark:data-active:bg-primary dark:data-active:text-primary-foreground data-active:[&>span]:bg-primary-foreground data-active:[&>span]:text-primary";

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
