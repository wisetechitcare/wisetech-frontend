import * as React from "react"
import { CircleAlert, Inbox, SearchX } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/ds/ui/empty"
import { IconBox } from "./icon-box"

const VARIANT_ICON = {
  empty: <Inbox />,
  "no-match": <SearchX />,
  error: <CircleAlert />,
} as const

/**
 * Every empty view says what this is and what to do next — never just "No data". Built on shadcn's
 * Empty; replaces the live kit's `WtEmptyState`.
 *
 * - `empty` (default): nothing exists yet — the action creates the first one.
 * - `no-match`: a search or filter found nothing — the remedy is a different search, so offer
 *   "Clear filters", not "Create".
 * - `error`: loading failed — say what failed and offer Retry.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "empty",
  size = "default",
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "empty" | "no-match" | "error"
  /** `sm`: inside a card or table body, with less padding. */
  size?: "default" | "sm"
  className?: string
}) {
  return (
    <Empty
      data-variant={variant}
      className={cn("border border-dashed", size === "sm" && "gap-3 p-6", className)}
      role={variant === "error" ? "alert" : undefined}
    >
      <EmptyHeader>
        <EmptyMedia>
          <IconBox
            icon={icon ?? VARIANT_ICON[variant]}
            tone={variant === "error" ? "danger" : "neutral"}
            size={size === "sm" ? "default" : "lg"}
          />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
