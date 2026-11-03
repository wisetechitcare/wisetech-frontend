import * as React from "react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/ds/ui/card"
import { IconBox } from "./icon-box"

/**
 * A record as a tile in a collection — roles, adverts, candidates, projects. Replaces the live kit's
 * `EntityCard`. Packed for dense grids: title, muted meta, a two-line description, actions pinned to the
 * bottom so tiles in a row line up. With `href` the whole tile is a link (the title carries the name; the
 * tile's actions stay separately clickable).
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
  children,
  className,
}: {
  title: string
  /** One line under the title: department, client, location. */
  subtitle?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone | (string & {})
  /** Status badge(s), top right. */
  status?: React.ReactNode
  /** Small facts as badges or text: "3 openings", "Since 2024". */
  meta?: React.ReactNode
  actions?: React.ReactNode
  href?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <Card
      data-slot="entity-card"
      size="sm"
      className={cn("relative h-full gap-3", href && "transition-shadow hover:shadow-md has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50", className)}
    >
      <CardHeader className="flex items-start gap-3">
        {icon && <IconBox icon={icon} tone={tone} />}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base leading-snug font-medium">
            {href ? (
              <a href={href} className="outline-none after:absolute after:inset-0 after:content-['']">
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {status && <div className="flex shrink-0 gap-1">{status}</div>}
      </CardHeader>
      {(meta || description || children) && (
        <CardContent className="space-y-2">
          {meta && <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">{meta}</div>}
          {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          {children}
        </CardContent>
      )}
      {actions && <CardFooter className="relative z-10 mt-auto gap-2">{actions}</CardFooter>}
    </Card>
  )
}
