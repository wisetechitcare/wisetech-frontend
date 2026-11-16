import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { SmartAvatar, avatarInitials } from "@/ds/ui/smart-avatar"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"

/** The kit's one initials rule (see SmartAvatar). */
export const initials = avatarInitials

/**
 * A person in a table cell or list: avatar, name, code or role. Replaces the live `EmployeeIdentityCell`.
 * An inactive person is labelled in text, never by greying alone.
 */
export function PersonCell({
  name,
  code,
  subtitle,
  avatarUrl,
  inactive = false,
  size = "default",
  showAvatar = true,
  className,
}: {
  name: string
  code?: string | null
  subtitle?: string | null
  avatarUrl?: string | null
  inactive?: boolean
  size?: "default" | "sm"
  /** `false` for text-first tables (money, payments) where the face adds width but no information. */
  showAvatar?: boolean
  className?: string
}) {
  const secondary = [code, subtitle].filter(Boolean).join(" · ")
  return (
    <div data-slot="person-cell" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {showAvatar && (
        <SmartAvatar
          name={name}
          seed={code || name}
          src={avatarUrl}
          size={size === "sm" ? 28 : "default"}
          decorative
          className={cn(inactive && "grayscale")}
        />
      )}
      <div className="min-w-0">
        <p data-slot="person-name" className="flex items-center gap-1.5 truncate font-medium">
          <span className="truncate">{name}</span>
          {inactive && <Badge variant="neutral">Inactive</Badge>}
        </p>
        {secondary && size !== "sm" && <p data-slot="person-secondary" className="truncate text-xs text-muted-foreground">{secondary}</p>}
      </div>
    </div>
  )
}

/**
 * The identity block at the top of a record page or wizard: avatar, name (the page's h1), facts, status
 * badges, contact links and actions. Replaces the live kit's `EntityIdentityHeader`.
 */
export function PersonHeader({
  name,
  avatarUrl,
  meta = [],
  badges,
  links,
  actions,
  onBack,
  backLabel = "Back",
  className,
}: {
  name: string
  avatarUrl?: string | null
  /** Short facts, joined with dots: designation, department, location, code. */
  meta?: React.ReactNode[]
  badges?: React.ReactNode
  /** Contact links (mail, phone) — real links so they work with the keyboard and on phones. */
  links?: Array<{ href: string; label: string; icon?: React.ReactNode }>
  actions?: React.ReactNode
  onBack?: () => void
  backLabel?: string
  className?: string
}) {
  return (
    <header data-slot="person-header" className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" aria-label={backLabel} onClick={onBack}>
            <ArrowLeft aria-hidden />
          </Button>
        )}
        <SmartAvatar name={name} src={avatarUrl} size="lg" shape="rounded" preview decorative />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
            {badges}
          </div>
          {meta.length > 0 && (
            <p data-slot="person-meta" className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {meta.map((m, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden>·</span>}
                  <span>{m}</span>
                </React.Fragment>
              ))}
            </p>
          )}
          {links && links.length > 0 && (
            <p data-slot="person-meta" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline [&>svg]:size-3.5">
                  {l.icon}
                  {l.label}
                </a>
              ))}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
