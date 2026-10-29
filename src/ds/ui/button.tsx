import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2 } from "lucide-react"

// WiseTech override of shadcn's base-maia Button: the live app's WtButton recipe, exactly
// (src/app/modules/common/components/ui/buttons.tsx), finalised 2026-10-28.
//   • size: 40px default, 44px lg (the live heights); shape stays shadcn's pill
//   • tones: default = live "accent" (bright brand → brand), the one CTA look: every action uses it
//     (2026-10-28, "default always"; the navy "primary" variant was retired). destructive and success
//     = the live danger / success gradients
//   • depth: neutral elevation by default (adjacent glows bloom into each other); `glow` opts a
//     single hero action into the long coloured glow
//   • motion: lift on hover, press to .975, spring easing; focus = 2px outline in the tone colour
//   • outline = live "ghost" (the standard Cancel), inverted = brand text on white
//   • tinted = the live tinted icon button (ActionIconButton / WtIconButton / WtCloseButton on headers)
// API is stock shadcn plus the `success` / `tinted` variants, `glow` and `loading`.
const CTA: Array<"default" | "destructive" | "success"> = ["default", "destructive", "success"]

const ctaClass =
  "bg-linear-135/srgb font-bold text-white hover:brightness-[1.04] motion-safe:hover:-translate-y-[1.5px] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-white/40"

const buttonVariantClasses = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm leading-[1.2] font-medium tracking-[-0.01em] whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,filter] duration-160 ease-spring outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--glow,var(--ring)) motion-safe:active:not-aria-[haspopup]:translate-y-0 motion-safe:active:not-aria-[haspopup]:scale-[.975] disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: cn(ctaClass, "bg-(--brand) from-(--brand-bright) to-(--brand) [--glow:var(--brand-bright)]"),
        destructive: cn(ctaClass, "bg-(--cta-danger) from-(--cta-danger) to-(--cta-danger-deep) [--glow:var(--cta-danger)]"),
        success: cn(ctaClass, "bg-(--cta-success) from-(--cta-success) to-(--cta-success-deep) [--glow:var(--cta-success)]"),
        // Live "ghost": white on a visible border; hover goes darker, never toward the surface.
        outline:
          "border-slate-300 bg-white font-[650] text-slate-700 [--glow:var(--color-slate-400)] hover:border-slate-400 hover:bg-slate-200 hover:text-slate-900 hover:shadow-[0_4px_10px_rgb(16_24_40/0.1)] motion-safe:hover:-translate-y-px aria-expanded:bg-slate-200 aria-expanded:text-slate-900 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 dark:border-white/16 dark:bg-white/6 dark:text-white/78 dark:[--glow:var(--color-slate-400)] dark:hover:border-white/26 dark:hover:bg-white/11 dark:hover:text-white dark:hover:shadow-[0_4px_10px_rgb(0_0_0/0.35)] dark:aria-expanded:bg-white/11 dark:aria-expanded:text-white dark:disabled:border-white/10 dark:disabled:bg-white/4 dark:disabled:text-white/30",
        // Live "inverted": brand text on white with a brand-tinted edge.
        inverted:
          "border-[color-mix(in_oklch,var(--brand)_15%,white)] bg-white font-bold text-(--brand) shadow-[0_1px_2px_rgb(16_24_40/0.06)] [--glow:var(--brand)] hover:border-[color-mix(in_oklch,var(--brand)_25%,white)] hover:bg-[color-mix(in_oklch,var(--brand)_8%,white)] hover:shadow-[0_8px_18px_color-mix(in_oklch,var(--brand)_18%,transparent)] motion-safe:hover:-translate-y-[1.5px] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none dark:border-primary/30 dark:bg-white/10 dark:text-primary dark:[--glow:var(--primary)] dark:hover:border-primary/50 dark:hover:bg-white/16 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground disabled:opacity-50",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground disabled:opacity-50 dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
        // Live tinted icon button (ActionIconButton / WtIconButton): a pastel of --tint at rest that
        // deepens toward the same colour on hover. Ink is --tint held dark enough (light) / light enough
        // (dark) for 4.5:1 on its own pastel. Set --tint per use (style={{ "--tint": color }}); on a
        // coloured header use --tint and --tint-ink white.
        tinted:
          "border-[color-mix(in_oklch,var(--tint)_28%,transparent)] bg-[color-mix(in_oklch,var(--tint)_12%,transparent)] text-(--tint-ink) [--glow:var(--tint)] [--tint:var(--primary)] [--tint-ink:oklch(from_var(--tint)_min(l,0.5)_c_h)] dark:[--tint-ink:oklch(from_var(--tint)_max(l,0.8)_c_h)] hover:border-[color-mix(in_oklch,var(--tint)_45%,transparent)] hover:bg-[color-mix(in_oklch,var(--tint)_28%,transparent)] hover:shadow-[0_5px_12px_color-mix(in_oklch,var(--tint)_28%,transparent)] motion-safe:hover:-translate-y-px motion-safe:active:not-aria-[haspopup]:scale-[.93] disabled:opacity-50 dark:border-[color-mix(in_oklch,var(--tint)_40%,transparent)] dark:bg-[color-mix(in_oklch,var(--tint)_22%,transparent)] dark:hover:border-[color-mix(in_oklch,var(--tint)_62%,transparent)] dark:hover:bg-[color-mix(in_oklch,var(--tint)_40%,transparent)]",
      },
      size: {
        default:
          "h-10 gap-[7px] px-4 text-[13.5px] has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-11 gap-[7px] px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
      glow: { false: "", true: "" },
    },
    compoundVariants: [
      { variant: CTA, glow: false, class: "shadow-cta hover:shadow-cta-hover" },
      { variant: CTA, glow: true, class: "shadow-glow hover:shadow-glow-hover" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: false,
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariantClasses> & {
    /** Busy: disabled, announced as busy, with a spinner (replacing the glyph on icon-only sizes). */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  glow = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const iconOnly = typeof size === "string" && size.startsWith("icon")
  const spinner = <Loader2 data-icon={iconOnly ? undefined : "inline-start"} className="animate-spin" aria-hidden />
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={buttonVariants({ variant, size, glow, className })}
      {...props}
    >
      {loading && iconOnly ? spinner : <>{loading && spinner}{children}</>}
    </ButtonPrimitive>
  )
}

/**
 * The button's classes, conflicts resolved (cva only concatenates: the base's border-transparent and
 * text-sm would sit beside a variant's border colour and a size's text size, and whichever Tailwind
 * emits later wins). Use this for links that look like buttons: <a className={buttonVariants({...})}>.
 */
const buttonVariants = (props?: Parameters<typeof buttonVariantClasses>[0]) => cn(buttonVariantClasses(props))

export { Button, buttonVariants, type ButtonProps }
