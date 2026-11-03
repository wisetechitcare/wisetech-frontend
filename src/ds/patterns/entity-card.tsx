import * as React from "react"
import { ChevronRight } from "lucide-react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardLink } from "@/ds/ui/card"
import { IconBox } from "./icon-box"

/**
 * A tile in a collection — a record (role, advert, candidate, project) or a place to go (a settings hub, a
 * module launcher). Replaces the live kit's `EntityCard` AND `NavCard`: both are the same Card, so they look
 * the same. Packed for dense grids: title, muted meta, a two-line description, actions pinned to the bottom.
 *
 * With `href` the whole tile is one link (named by its title) and shows a chevron; its own buttons stay
 * separately clickable. `disabled` keeps it visible but not clickable — say why in `status`.
 */
export function EntityCard({
  title,
  subtitle,
  description,
  icon,
  tone = "brand",
  status,
  meta,
  actions,
  href,
  disabled = false,
  children,
  className,
}: {
  title: string
  /** One line under the title: department, client, location. */
  subtitle?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone | (string & {})
  /** Badge(s) leading the meta line: a status, a count, "Not set up". */
  status?: React.ReactNode
  /** Small facts as badges or text: "3 openings", "Since 2024". */
  meta?: React.ReactNode
  actions?: React.ReactNode
  href?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}) {
  const linked = !!href && !disabled
  return (
    // The benchmark tile (same as Stat Card): glow, accent bar, lift and icon motion come from Card.
    <Card
      data-slot="entity-card"
      tone={tone}
      interactive={linked || disabled}
      aria-disabled={disabled || undefined}
      className={cn("h-full gap-3", className)}
    >
      {/* Icon top-right, in the glow corner — the card rule (Stat Card is the benchmark). */}
      <CardHeader className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-base leading-snug font-medium">
            <span className="truncate">{linked ? <CardLink href={href}>{title}</CardLink> : title}</span>
            {linked && <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
          </h3>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && <IconBox icon={icon} tone={tone} size="lg" />}
      </CardHeader>
      {(status || meta || description || children) && (
        <CardContent className="space-y-2">
          {(status || meta) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {status}
              {meta}
            </div>
          )}
          {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          {children}
        </CardContent>
      )}
      {actions && <CardFooter className="relative z-10 mt-auto gap-2">{actions}</CardFooter>}
    </Card>
  )
}
