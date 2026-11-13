import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"

/**
 * A headline that types itself out once, with a blinking caret. For moments only — the sign-in
 * brand panel. Never in tables, forms, wizards or approvals, where text must be readable the instant
 * it renders.
 *
 * The original Login typewriter, exactly: 55ms per character after a 300ms delay, typed once; the
 * gradient caret (0.09em × 0.92em, 0.06em radius, sat 0.1em low, 0.25rem from the text, purple glow)
 * blinking hard on/off every second, and still blinking once the sentence is done. Colours and blink
 * live in tokens.css (--typewriter-caret*, animate-typewriter-caret). Enhanced over the React Bits
 * TextType it replaces:
 * - assistive tech reads the full sentence once (TextType exposed every half-typed frame);
 * - under reduced motion the sentence renders whole, with no caret;
 * - the finished sentence reserves its own space (an invisible copy underneath), so typing never
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
    <span data-slot="typewriter" className={cn("relative inline-block whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{text}</span>
      {/* Reserves the finished sentence's box (caret included), so the line never grows while typing. */}
      <span aria-hidden="true" className="invisible">
        {text}
        {!reduced && <Caret />}
      </span>
      <span aria-hidden="true" className="absolute inset-0" data-done={done || undefined}>
        {text.slice(0, count)}
        {!reduced && <Caret />}
      </span>
    </span>
  )
}

/** The original Login caret, to the hundredth of an em. */
function Caret() {
  return (
    <span
      data-slot="typewriter-caret"
      className="ml-1 inline-block h-[0.92em] w-[0.09em] rounded-[0.06em] align-[-0.1em] [background:var(--typewriter-caret)] shadow-(--typewriter-caret-glow) animate-typewriter-caret"
    />
  )
}

export { Typewriter }
