import { cn } from "cn"

/**
 * The kit's one loader: six dots chasing round a ring (styles: `[data-slot="spinner"]` in tokens.css).
 * `size-*` sizes it (default size-4, icon size), and it takes the text colour — so inside a filled button it
 * is white, and `text-primary` makes it brand. A spinner standing alone is a `status` named "Loading" (or
 * your `aria-label`); inside a button that already says "Saving…", pass `aria-hidden` and let the text speak.
 */
function Spinner({ className, "aria-hidden": ariaHidden, "aria-label": ariaLabel = "Loading", ...props }: React.ComponentProps<"span">) {
  const hidden = ariaHidden === true || ariaHidden === "true"
  return (
    <span
      data-slot="spinner"
      role={hidden ? undefined : "status"}
      aria-label={hidden ? undefined : ariaLabel}
      aria-hidden={hidden || undefined}
      className={cn("relative inline-block size-4 shrink-0 align-[-0.125em]", className)}
      {...props}
    >
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

export { Spinner }
