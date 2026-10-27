import * as React from "react"
import { cn } from "@/ds/lib/utils"

/** Every empty view says what this is and what to do next — never just "No data". */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      {icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground [&>svg]:size-6">
          {icon}
        </span>
      )}
      <h3 className="text-title font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-body text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
