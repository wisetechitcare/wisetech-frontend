"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@animate-ui/react/primitives/base-ui/checkbox"
import { cn } from "cn"
import { CheckIcon, MinusIcon } from "lucide-react"

function Checkbox({ className, onCheckedChange, ...props }: CheckboxPrimitive.Root.Props) {
  const [bounce, setBounce] = React.useState<"in" | "out" | null>(null)

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-bounce={bounce ?? undefined}
      onCheckedChange={(checked, eventDetails) => {
        setBounce(checked ? "in" : "out")
        onCheckedChange?.(checked, eventDetails)
      }}
      onAnimationEnd={() => setBounce(null)}
      className={cn(
        "peer relative flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 border-muted-foreground/45 transition-shadow outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-muted-foreground/45 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary motion-safe:data-[bounce=in]:animate-checkbox-bounce-in motion-safe:data-[bounce=out]:animate-checkbox-bounce-out",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-4"
        animation="pop"
        transition={{ type: "spring", stiffness: 500, damping: 24 }}
        exitTransition={{ duration: 0.15, ease: "easeOut" }}
      >
        <CheckIcon strokeWidth={3} className="in-data-indeterminate:hidden" />
        <MinusIcon strokeWidth={3} className="hidden in-data-indeterminate:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
