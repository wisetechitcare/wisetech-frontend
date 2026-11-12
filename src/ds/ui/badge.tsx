import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border bg-input/30 text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // WiseTech status set — one meaning per colour, soft fill + readable text, both themes.
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning-soft text-warning-foreground",
        danger: "bg-destructive-soft text-destructive-foreground",
        info: "bg-info-soft text-info-foreground",
        brand: "bg-accent text-accent-foreground",
        neutral: "bg-muted text-muted-foreground",
        // WiseTech category hues — identity (leave type, department), never a status.
        blue: "bg-tone-blue-soft text-tone-blue-foreground",
        green: "bg-tone-green-soft text-tone-green-foreground",
        amber: "bg-tone-amber-soft text-tone-amber-foreground",
        rose: "bg-tone-rose-soft text-tone-rose-foreground",
        purple: "bg-tone-purple-soft text-tone-purple-foreground",
        indigo: "bg-tone-indigo-soft text-tone-indigo-foreground",
        cyan: "bg-tone-cyan-soft text-tone-cyan-foreground",
        slate: "bg-tone-slate-soft text-tone-slate-foreground",
        // An admin-configured colour (e.g. a leave type's): pass it as style={{ "--tone": hex }}.
        // Text is mixed toward the foreground so any hue stays readable in both themes.
        custom:
          "bg-[color-mix(in_oklch,var(--tone)_16%,transparent)] text-[color-mix(in_oklch,var(--tone)_55%,var(--foreground))]",
      },
      dot: {
        true: "before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      dot: false,
    },
  }
)

function Badge({
  className,
  variant = "default",
  dot = false,
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, dot }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
