import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/ds/lib/utils"
import { toneStyle, type Tone } from "@/ds/lib/tone"

const iconBoxVariants = cva(
  "grid shrink-0 place-items-center bg-[color-mix(in_oklch,var(--tone)_14%,transparent)] text-(--tone-ink) ring-1 ring-[color-mix(in_oklch,var(--tone)_22%,transparent)] ring-inset",
  {
    variants: {
      size: {
        sm: "size-8 rounded-lg [&>svg]:size-4",
        default: "size-10 rounded-xl [&>svg]:size-5",
        lg: "size-12 rounded-2xl [&>svg]:size-6",
      },
    },
    defaultVariants: { size: "default" },
  },
)

/**
 * A tinted tile holding one icon — the visual anchor of a stat, a section head, a list row. Replaces the
 * live kit's `IconBox` (and its `trio` colours). `tone` is a status, a category hue, or a hex colour an
 * admin configured. Decorative: the icon is hidden from assistive tech; the text beside it carries meaning.
 */
export function IconBox({
  icon,
  tone = "brand",
  size,
  className,
  style,
}: {
  icon: React.ReactNode
  tone?: Tone | (string & {})
  className?: string
  style?: React.CSSProperties
} & VariantProps<typeof iconBoxVariants>) {
  return (
    <span
      data-slot="icon-box"
      aria-hidden
      className={cn(iconBoxVariants({ size }), className)}
      style={{ ...toneStyle(tone), ...style }}
    >
      {icon}
    </span>
  )
}
