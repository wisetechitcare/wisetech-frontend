import * as React from "react"
import { titleCase } from "@/ds/lib/text"
import { ChevronRight } from "lucide-react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardLink } from "@/ds/ui/card"
import { IconBox } from "./icon-box"

/**
 * A tile in a collection — a record (role, advert, candidate, project) or a place to go (a settings hub, a
 * module launcher). Replaces the live kit's `EntityCard` AND `NavCard`: both are the same Card, so they look
 * the same. Packed for dense grids: title, muted meta, a two-line description, actions pinned to the bottom.
 *
 * With `href` the whole tile is one link (named by its title) and shows a chevron; its own buttons stay
 * separately clickable. With `onOpen` the whole tile is one button instead — for a record that opens in a
 * dialog rather than on a page. `disabled` keeps it visible but not clickable — say why in `status`.
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
  onOpen,
  openLabel,
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
  /** The whole tile opens something (an edit dialog). Ignored when `href` is set. */
  onOpen?: () => void
  /** Accessible name of the open action. Default: the title. */
  openLabel?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}) {
  const linked = !!href && !disabled
  const opens = !linked && !!onOpen && !disabled
  return (
    // The benchmark tile (same as Stat Card): glow, accent bar, lift and icon motion come from Card.
    <Card
      data-slot="entity-card"
      tone={tone}
      interactive={linked || opens || disabled}
      aria-disabled={disabled || undefined}
      className={cn("h-full gap-3", className)}
    >
      {/* Icon top-right, in the glow corner — the card rule (Stat Card is the benchmark). */}
      <CardHeader className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 data-slot="entity-title" className="flex items-center gap-1 text-base leading-snug">
            <span className="truncate">
              {linked ? (
                <CardLink href={href}>{titleCase(title)}</CardLink>
              ) : opens ? (
                // CardLink's button twin: the title stretches over the whole tile (::after), so a click anywhere
                // opens it; the footer's own buttons sit above it (relative z-10) and stay separate.
                <Button
                  variant="link"
                  aria-label={openLabel}
                  onClick={onOpen}
                  className="h-auto p-0 text-base leading-snug font-semibold text-foreground outline-none after:absolute after:inset-0 after:content-[''] hover:no-underline"
                >
                  {titleCase(title)}
                </Button>
              ) : (
                titleCase(title)
              )}
            </span>
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
