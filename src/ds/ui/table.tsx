"use client"
import { titleCaseChildren } from "@/ds/lib/text"

import * as React from "react"
import { cn } from "cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={className}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      // Drop the last row's hairline so it doesn't sit against the frame / footer.
      className={cn("[&_tr:last-child>td]:border-b-0! [&_tr:last-child>th]:border-b-0!", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-foreground/10 bg-muted/50 font-medium dark:border-foreground/15 [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // Hairlines live on th/td — `border-collapse` paints tr borders as 0px in Chromium.
        "transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        // The same tints as a variable, for opaque cells (a frozen column) that would otherwise hide them.
        "hover:[--row-hover:color-mix(in_oklab,var(--muted)_50%,transparent)] has-aria-expanded:[--row-hover:color-mix(in_oklab,var(--muted)_50%,transparent)] data-[state=selected]:[--row-hover:var(--muted)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Shared row hairline — horizontal only (SaaS list pattern, not a spreadsheet grid).
 * `!` beats the app Metronic/Tailwind table reset (`td/th { border-width: 0 }`) that otherwise
 * eats ordinary `border-b` utilities. Prefer border over inset shadow so pinned-column shadows stay intact.
 */
const ROW_RULE =
  "border-b! border-foreground/12! dark:border-foreground/18!"

function TableHead({ className, children, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        ROW_RULE,
        "heading-case h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
      children={titleCaseChildren(children)}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        ROW_RULE,
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
