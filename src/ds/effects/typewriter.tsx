import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"

/**
 * A headline that types itself out once, with a blinking caret. For moments only — the sign-in
 * brand panel. Never in tables, forms, wizards or approvals, where text must be readable the instant
 * it renders.
 *
 * - Assistive tech reads the full sentence once; the typing letters are hidden from it (the React
 *   Bits TextType it replaces exposed every half-typed frame).
 * - Under reduced motion the sentence renders whole, with no caret.
 * - The full sentence reserves its own space (an invisible copy underneath), so typing never
 *   reflows the layout around it.
 */
function Typewriter({
  text,
  speed = 55,
  delay = 300,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  text: string
  /** Milliseconds per character. */
  speed?: number
  /** Milliseconds before the first character. */
  delay?: number
}) {
  const reduced = useReducedMotion()
  const [count, setCount] = React.useState(reduced ? text.length : 0)

  React.useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    setCount(0)
    let timer: ReturnType<typeof setTimeout>
    const step = (n: number) => {
      setCount(n)
      if (n < text.length) timer = setTimeout(() => step(n + 1), speed)
    }
    timer = setTimeout(() => step(1), delay)
    return () => clearTimeout(timer)
  }, [text, speed, delay, reduced])

  const done = count >= text.length

  return (
    <span data-slot="typewriter" className={cn("relative inline-block", className)} {...props}>
      <span className="sr-only">{text}</span>
      {/* Reserves the finished sentence's box, so the line never grows while typing. */}
      <span aria-hidden="true" className="invisible">{text}</span>
      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, count)}
        {!reduced && (
          <span
            data-slot="typewriter-caret"
            data-done={done || undefined}
            className="ml-0.5 inline-block h-[0.9em] w-[0.08em] translate-y-[0.1em] rounded-full bg-primary animate-caret-blink"
          />
        )}
      </span>
    </span>
  )
}

export { Typewriter }
