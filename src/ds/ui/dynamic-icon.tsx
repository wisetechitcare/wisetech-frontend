import type * as React from 'react'
import type { LucideProps } from 'lucide-react'
import { cn } from 'cn'
import { iconFor } from '@/ds/lib/icons/registry'
import { DEFAULT_ICON_PX, hasSizeClass } from '@/ds/lib/icons/size'

/** Any component that draws an icon: a Lucide icon, a brand mark, or a custom SVG component. */
export type IconComponent = React.ComponentType<{
  className?: string
  style?: React.CSSProperties
  'aria-hidden'?: boolean | 'true' | 'false'
  'aria-label'?: string
}>

/** What a shared component's `icon` prop accepts: a component, or a stored/legacy registry name. */
export type IconSource = IconComponent | string

/**
 * The ONLY way to draw an icon whose name is data (DB columns, persisted config).
 * Static icons are imported from `lucide-react` directly. An unknown name renders nothing
 * and warns in DEV only.
 *
 * Without a `size-*` class it gets the app default (18px). The literal below must stay a
 * complete class string: Tailwind's scanner cannot see `size-[${DEFAULT_ICON_PX}px]`.
 * The assertion keeps it in step with DEFAULT_ICON_PX.
 */
const DEFAULT_SIZE_CLASS = 'size-[18px]'
if (import.meta.env.DEV && DEFAULT_SIZE_CLASS !== `size-[${DEFAULT_ICON_PX}px]`) {
  console.warn('[DynamicIcon] DEFAULT_SIZE_CLASS is out of step with DEFAULT_ICON_PX')
}

export function DynamicIcon({ name, className, ...rest }: { name: string } & LucideProps) {
  const Glyph = iconFor(name)
  if (!Glyph) {
    if (import.meta.env.DEV) console.warn(`[DynamicIcon] no icon registered for "${name}"`)
    return null
  }
  return <Glyph {...rest} className={hasSizeClass(className) ? className : cn(DEFAULT_SIZE_CLASS, className)} />
}

/**
 * Renders an {@link IconSource}. FOR SHARED COMPONENTS' INTERNALS ONLY — call sites pass a
 * Lucide component or a data name to the shared component, they never render an IconSlot.
 */
export function IconSlot({ icon, className }: { icon: IconSource | null | undefined; className?: string }) {
  if (!icon) return null
  if (typeof icon === 'string') return <DynamicIcon name={icon} className={className} />
  const Icon = icon
  return <Icon className={className} />
}
