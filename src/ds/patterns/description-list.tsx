import * as React from "react"
import { cn } from "@/ds/lib/utils"

export type DescriptionRow = {
  label: React.ReactNode
  /** Empty values render as an em dash so a missing field reads as missing, not as a layout gap. */
  value: React.ReactNode
  /** Emphasise the value (a total, the key figure of the section). */
  strong?: boolean
  /** Span both columns (long text such as an address). */
  wide?: boolean
}

/**
 * Read-only label / value pairs for a record — personal details, bank details, a request's facts.
 * Replaces the live kit's `KeyValueList`, `KeyValueRow` and `DetailGrid`. A real <dl>, so assistive tech
 * reads each label with its value. Put it inside a Card with a SectionHeader for the `DetailCard` look.
 */
export function DescriptionList({
  rows,
  columns = 2,
  emptyText = "Nothing recorded yet.",
  className,
}: {
  rows: ReadonlyArray<DescriptionRow>
  /** 2 columns from `sm` up; always 1 on phones. */
  columns?: 1 | 2
  emptyText?: string
  className?: string
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <dl
      data-slot="description-list"
      className={cn("grid gap-x-8 gap-y-4 text-sm", columns === 2 && "sm:grid-cols-2", className)}
    >
      {rows.map((row, i) => {
        const empty = row.value === null || row.value === undefined || row.value === ""
        return (
          <div key={i} className={cn("min-w-0 space-y-1", row.wide && "sm:col-span-2")}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "break-words",
                row.strong ? "tabular text-base font-semibold" : "font-medium",
                empty && "font-normal text-muted-foreground",
              )}
            >
              {empty ? "—" : row.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
