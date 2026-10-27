import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/ds/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        // WiseTech status set — one meaning per colour, soft fill + readable text, both themes.
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning-soft text-warning-foreground",
        danger: "bg-destructive-soft text-destructive-foreground",
        info: "bg-info-soft text-info-foreground",
        brand: "bg-accent text-accent-foreground",
        neutral: "bg-muted text-muted-foreground",
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

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }
>(function Badge({ className, variant = "default", dot = false, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, dot }), className)}
      {...props}
    />
  )
})

export { Badge, badgeVariants }
