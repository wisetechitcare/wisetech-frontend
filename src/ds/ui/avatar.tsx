import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { avatarInitials } from "./smart-avatar"

import { cn } from "cn"

const NO_NAME = "N/A"

export enum AvatarSize {
  SM = "sm",
  DEFAULT = "default",
  LG = "lg",
}

interface AvatarProps extends AvatarPrimitive.Root.Props {
  size?: `${AvatarSize}`
}

function Avatar({ className, size = AvatarSize.DEFAULT, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  )
}

interface AvatarFallbackProps extends AvatarPrimitive.Fallback.Props {
  /** Shows the name's initials (first + last word), or "N/A" when there is no name. */
  name?: string | null
}

function initialsOrNoName(name: string | null): string {
  return name?.trim() ? avatarInitials(name) : NO_NAME
}

function AvatarFallback({ className, name, children, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground group-data-[size=lg]/avatar:text-base group-data-[size=sm]/avatar:text-xs group-data-[size=sm]/avatar:tracking-tighter",
        className
      )}
      {...props}
    >
      {name === undefined ? children : initialsOrNoName(name)}
    </AvatarPrimitive.Fallback>
  )
}

/** A status dot or small icon on the avatar's corner. Colour it with a status token (`bg-success`). */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 has-data-[size=sm]:-space-x-1 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge }
