import * as React from "react"
import { ChevronRight } from "lucide-react"
import type { Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/ds/ui/item"
import { IconBox } from "./icon-box"

/**
 * A tile that opens another screen — settings hubs, module launchers. Replaces the live kit's `NavCard`.
 * Always a real link (`href`), so it opens in a new tab and works with the keyboard; a disabled card says
 * why in `meta`.
 */
export function NavCard({
  title,
  description,
  icon,
  tone = "brand",
  meta,
  href,
  disabled = false,
  className,
}: {
  title: string
  description?: string
  icon: React.ReactNode
  tone?: Tone | (string & {})
  /** Right-hand detail: a count, "Not set up", a badge. */
  meta?: React.ReactNode
  href: string
  disabled?: boolean
  className?: string
}) {
  const content = (
    <>
      <ItemMedia>
        <IconBox icon={icon} tone={tone} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{title}</ItemTitle>
        {description && <ItemDescription className="line-clamp-2">{description}</ItemDescription>}
      </ItemContent>
      <ItemActions className="text-sm text-muted-foreground">
        {meta}
        <ChevronRight className="size-4" aria-hidden />
      </ItemActions>
    </>
  )
  if (disabled) {
    return (
      <Item variant="outline" aria-disabled className={cn("opacity-70", className)}>
        {content}
      </Item>
    )
  }
  return (
    <Item variant="outline" className={cn("bg-card", className)} render={<a href={href} />}>
      {content}
    </Item>
  )
}
