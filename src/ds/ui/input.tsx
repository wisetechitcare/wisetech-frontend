import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/** Control heights: `default` 40px; `lg` 44px with 16px text — Button `lg`'s height, for a form that is the
 * whole page (sign-in). The floating label follows the size (styles/components.css). */
export type InputSize = "default" | "lg"

// WiseTech: the placeholder defaults to one space, so CSS can tell an empty field (:placeholder-shown) from a
// filled one — what floating labels key on (styles/globals.css). Invisible; a real placeholder still wins.
// `size` is the kit's control size, not the HTML attribute (character width), which no kit field uses.
function Input({
  className,
  type,
  size = "default",
  placeholder = " ",
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & { size?: InputSize }) {
  return (
    <InputPrimitive
      type={type}
      placeholder={placeholder}
      data-slot="input"
      data-size={size}
      className={cn(
        "h-10 w-full min-w-0 rounded-4xl border border-input bg-input/30 px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        size === "lg" && "h-11 px-4 md:text-base",
        className
      )}
      {...props}
    />
  )
}

export { Input }
