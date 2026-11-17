import * as React from "react"
import { titleCaseChildren } from "@/ds/lib/text"
import { cn } from "cn"
import { toneStyle, type Tone } from "@/ds/lib/tone"

// WiseTech: Card is the ONE surface in the kit. Every tile, panel and selectable option renders it, so
// radius, ring, hover, focus, selected and disabled look the same everywhere. `interactive` turns on the
// states a clickable card needs; a radio or checkbox inside it drives the selected look (has-data-checked).
const interactiveClass =
  "cursor-pointer transition-[box-shadow,background-color] duration-150 hover:shadow-md has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-data-checked:bg-accent/40 has-data-checked:ring-2 has-data-checked:ring-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-70 aria-disabled:hover:shadow-none"

// WiseTech: the benchmark tile (Stat Card's design) — a tone glow in the top-right corner, an accent bar
// that grows along the bottom, a spring lift on hover, and the icon tile popping in, scaling with a tone
// shadow and wiggling on hover. It is every card's default look, clickable or not. `panel` (same surface,
// no glow or motion) is for a frame around a table or a chart — a lifting, glowing frame competes with
// the data inside it (and with the chart's own hover), so data surfaces stay still — and for the sign-in
// form (Auth Layout): a form is a place to type, not a tile to hover (decided 2026-11-14).
const tileClass =
  "isolate transition-[box-shadow,translate] duration-300 ease-spring hover:shadow-md motion-safe:hover:-translate-y-0.5 [&_[data-slot=icon-box]]:transition-[scale,box-shadow] [&_[data-slot=icon-box]]:duration-300 hover:[&_[data-slot=icon-box]]:scale-110 hover:[&_[data-slot=icon-box]]:shadow-[0_8px_18px_-8px_var(--tone)] motion-safe:[&_[data-slot=icon-box]]:animate-stat-pop motion-safe:hover:[&_[data-slot=icon-box]>*]:animate-stat-wiggle"

function Card({
  className,
  size = "default",
  variant = "tile",
  tone,
  interactive = false,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  /** `tile` (default): the Stat Card benchmark. `panel`: no glow or motion — the frame around a table or a chart, and the sign-in form. */
  variant?: "panel" | "tile"
  /** A tile's accent (glow, bar, icon): a status, a category hue or a hex. Defaults to brand. */
  tone?: Tone | (string & {})
  interactive?: boolean
}) {
  const tile = variant === "tile"
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-interactive={interactive || undefined}
      className={cn(
        "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        tile && tileClass,
        interactive && interactiveClass,
        className
      )}
      style={tile || tone ? { ...toneStyle(tone ?? "brand"), ...style } : style}
      {...props}
    >
      {tile && (
        <>
          <div
            aria-hidden
            data-slot="card-glow"
            className="pointer-events-none absolute -top-20 -right-20 -z-10 size-52 group-data-[size=sm]/card:-top-14 group-data-[size=sm]/card:-right-14 group-data-[size=sm]/card:size-36 rounded-full bg-(--tone) opacity-[0.13] blur-3xl transition-[opacity,scale] duration-500 group-hover/card:scale-125 group-hover/card:opacity-[0.22] dark:opacity-[0.2] dark:group-hover/card:opacity-[0.3]"
          />
          <div
            aria-hidden
            data-slot="card-accent"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-0.5 origin-left scale-x-0 bg-(--tone) transition-transform duration-500 ease-spring group-hover/card:scale-x-100"
          />
        </>
      )}
      {children}
    </div>
  )
}

/**
 * WiseTech: makes the whole card a link while keeping it one link (its text is the card's name). Put it
 * around the title; buttons elsewhere in the card stay separately clickable (give their container
 * `relative z-10`). Use with `interactive`.
 */
function CardLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="card-link"
      className={cn("outline-none after:absolute after:inset-0 after:content-['']", className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // WiseTech: no `@container/card-header` — a container captures absolutely positioned children, which
        // trapped CardLink's whole-card click area inside the header. Nothing used its container queries.
        "group/card-header grid auto-rows-min items-start gap-2 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-base font-medium", className)}
      {...props}
      children={titleCaseChildren(children)}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardLink,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
