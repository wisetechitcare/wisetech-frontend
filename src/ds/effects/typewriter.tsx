import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"

/**
 * The sign-in headline: lines that type themselves out, hold, backspace and rotate to the next,
 * landing on the last — then rest. For moments only (the sign-in brand panel). Never in tables,
 * forms, wizards or approvals.
 *
 * One motion idea on one surface, on purpose: typing, in brand ink. The original Login typewriter's
 * timing and caret, exactly — 55ms per character after a 300ms delay, deleting at 30ms, a 2s hold;
 * the gradient caret (0.09em × 0.92em, 0.06em radius, sat 0.1em low, 0.25rem from the text, purple
 * glow) blinking hard on/off every second, still blinking once landed.
 *
 * Enhanced:
 * - **Brand ink.** A smooth gradient from the tenant's brand to a lighter, violet-leaning brand, with a
 *   soft halo. It spans the headline's box, so letters keep their colour while typing and deleting.
 * - **Plays once.** It lands and rests; `settled` (e.g. once a sign-in field is focused) jumps to the
 *   landing line with no further motion — the headline never competes with typing a password.
 * - **Accessible.** Assistive tech reads only the landing line, once. Reduced motion: the landing
 *   line, still, in brand ink, no caret.
 * - **No reflow.** Every line is laid out invisibly in the same grid cell, so the box is the largest
 *   line's size from the start and the page never moves.
 *
 * Colours and the blink live in tokens.css (--typewriter-*, animate-typewriter-caret).
 */
function Typewriter({
  text,
  speed = 55,
  deleteSpeed = 30,
  hold = 2000,
  delay = 300,
  settled = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** One line, or lines to rotate through; the last is where it lands. */
  text: string | readonly string[]
  /** Milliseconds per typed character. */
  speed?: number
  /** Milliseconds per deleted character. */
  deleteSpeed?: number
  /** Milliseconds a finished line is held before it is deleted. */
  hold?: number
  /** Milliseconds before the first character. */
  delay?: number
  /** Jump to the landing line and stop. */
  settled?: boolean
}) {
  const lines = React.useMemo(() => (typeof text === "string" ? [text] : [...text]), [text])
  const last = lines.length - 1
  const landing = lines[last]

  const reduced = useReducedMotion()
  const still = reduced || settled
  const [index, setIndex] = React.useState(still ? last : 0)
  const [count, setCount] = React.useState(still ? landing.length : 0)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (still) {
      setIndex(last)
      setCount(landing.length)
      setDeleting(false)
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    if (deleting) {
      if (count > 0) timer = setTimeout(() => setCount((c) => c - 1), deleteSpeed)
      else {
        setDeleting(false)
        setIndex((i) => i + 1)
      }
    } else if (count < lines[index].length) {
      timer = setTimeout(() => setCount((c) => c + 1), index === 0 && count === 0 ? delay : speed)
    } else if (index < last) {
      timer = setTimeout(() => setDeleting(true), hold)
    }
    return () => clearTimeout(timer)
  }, [still, index, count, deleting, lines, last, landing, speed, deleteSpeed, hold, delay])

  const landed = index === last && count === landing.length && !deleting

  return (
    <span data-slot="typewriter" className={cn("inline-grid whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{landing}</span>
      {/* Every line, invisible, in one cell: the box is the largest line's from the start. */}
      {lines.map((line, i) => (
        <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1">
          {line}
          {!reduced && <Caret />}
        </span>
      ))}
      <span
        aria-hidden="true"
        data-slot="typewriter-text"
        data-landed={landed || undefined}
        className="col-start-1 row-start-1 bg-linear-to-r from-(--typewriter-ink-from) to-(--typewriter-ink-to) bg-clip-text text-transparent [filter:drop-shadow(0_0_0.35em_var(--typewriter-ink-glow))]"
      >
        {lines[index].slice(0, count)}
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
