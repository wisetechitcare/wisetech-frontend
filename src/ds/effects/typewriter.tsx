import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"
import type { HueTone } from "@/ds/lib/tone"

/**
 * A line: plain text, or parts where key words wear a module hue (the launcher's department colours).
 *   ['Effortless ', { text: 'HR', tone: 'blue' }, ', End to End']
 */
export type TypewriterLine = string | ReadonlyArray<string | { text: string; tone: HueTone }>

/** Static class names, so Tailwind sees every one. The solid hue — the launcher tile's icon colour. */
const HUE_CLASS: Record<HueTone, string> = {
  blue: "text-(--tone-blue)",
  green: "text-(--tone-green)",
  amber: "text-(--tone-amber)",
  rose: "text-(--tone-rose)",
  purple: "text-(--tone-purple)",
  indigo: "text-(--tone-indigo)",
  cyan: "text-(--tone-cyan)",
  slate: "text-(--tone-slate)",
}

/**
 * The sign-in headline: lines that type themselves out, hold, backspace and rotate to the next,
 * landing on the last — then rest. For moments only (the sign-in brand panel). Never in tables,
 * forms, wizards or approvals.
 *
 * One motion idea, on purpose: typing — as a person types. Key words wear their module's hue; the rest
 * is the heading's own ink. The original Login typewriter's pace and caret: 55ms per character after a
 * 300ms delay, a 2s hold, backspace at 30ms; the gradient caret (0.09em × 0.92em, 0.06em radius, sat
 * 0.1em low, 0.25rem from the text, purple glow) with its hard 1s on/off blink.
 *
 * What makes it read as real typing:
 * - **The caret holds still while keys are pressed** and blinks only when idle (before the first key,
 *   while a line is held, once landed) — how every text cursor behaves.
 * - **Human rhythm.** Each key lands a little early or late around the pace, spaces come quicker, and a
 *   comma or "&" earns a beat. Derived from the character's position, not Math.random, so every run is
 *   identical (and testable).
 * - **Backspace like a held key**: a short pause on the first press, then key-repeat at 30ms; then a beat
 *   before the next line starts.
 *
 * Also:
 * - **Plays once.** It lands and rests; `settled` (e.g. once a sign-in field is focused) jumps to the
 *   landing line with no further motion — it never competes with typing a password (WCAG 2.2.2).
 * - **Accessible.** Assistive tech reads only the landing line, once. Reduced motion: the landing line,
 *   still, in its colours, no caret.
 * - **No reflow.** Every line is laid out invisibly in the same grid cell, so the box is the largest
 *   line's size from the start and the page never moves.
 */
function Typewriter({
  lines: input,
  speed = 55,
  deleteSpeed = 30,
  hold = 2000,
  delay = 300,
  settled = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** The lines to rotate through; the last is where it lands. One line: `[line]`. */
  lines: readonly TypewriterLine[]
  /** Average milliseconds per typed character. */
  speed?: number
  /** Milliseconds per deleted character, once the key repeats. */
  deleteSpeed?: number
  /** Milliseconds a finished line is held before it is deleted. */
  hold?: number
  /** Milliseconds before the first character. */
  delay?: number
  /** Jump to the landing line and stop. */
  settled?: boolean
}) {
  const lines = React.useMemo(() => input.map(flatten), [input])
  const last = lines.length - 1
  const landing = lines[last]

  const reduced = useReducedMotion()
  const still = reduced || settled
  const [index, setIndex] = React.useState(still ? last : 0)
  const [count, setCount] = React.useState(still ? landing.text.length : 0)
  const [deleting, setDeleting] = React.useState(false)
  /** A key is being pressed right now (typing or deleting) — the caret holds still. */
  const [pressing, setPressing] = React.useState(false)

  React.useEffect(() => {
    if (still) {
      setIndex(last)
      setCount(landing.text.length)
      setDeleting(false)
      setPressing(false)
      return
    }
    const line = lines[index]
    let timer: ReturnType<typeof setTimeout> | undefined
    if (deleting) {
      if (count > 0) {
        setPressing(true)
        // A held Backspace: the first press, then the key repeats.
        const wait = count === line.text.length ? deleteSpeed * 4 : deleteSpeed
        timer = setTimeout(() => setCount((c) => c - 1), wait)
      } else {
        setPressing(false)
        // A beat before the next line, as a person would pause.
        timer = setTimeout(() => {
          setDeleting(false)
          setIndex((i) => i + 1)
        }, Math.round(speed * 6))
      }
    } else if (count < line.text.length) {
      const first = index === 0 && count === 0
      setPressing(!first)
      timer = setTimeout(() => {
        setPressing(true)
        setCount((c) => c + 1)
      }, first ? delay : keystroke(line.text, count, speed))
    } else {
      setPressing(false)
      if (index < last) timer = setTimeout(() => setDeleting(true), hold)
    }
    return () => clearTimeout(timer)
  }, [still, index, count, deleting, lines, last, landing, speed, deleteSpeed, hold, delay])

  const landed = index === last && count === landing.text.length && !deleting

  return (
    <span data-slot="typewriter" className={cn("inline-grid whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{landing.text}</span>
      {/* Every line, invisible, in one cell: the box is the largest line's from the start. */}
      {lines.map((line, i) => (
        <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1">
          <Runs line={line} count={line.text.length} />
          {!reduced && <Caret blinking={false} />}
        </span>
      ))}
      <span aria-hidden="true" data-slot="typewriter-text" data-landed={landed || undefined} className="col-start-1 row-start-1">
        <Runs line={lines[index]} count={count} />
        {!reduced && <Caret blinking={!pressing} />}
      </span>
    </span>
  )
}

/**
 * How long until character `i` of `text` is typed: the pace, nudged early or late by up to 30% (from
 * the character and its position — deterministic), quicker for a space, with a beat after a comma,
 * "&" or full stop.
 */
function keystroke(text: string, i: number, speed: number): number {
  const ch = text[i]
  const prev = text[i - 1]
  const jitter = 0.7 + (((ch.charCodeAt(0) * 31 + i * 17) % 61) / 100)
  let wait = speed * jitter
  if (ch === " ") wait *= 0.6
  if (prev === "," || prev === "&" || prev === ".") wait += speed * 3
  return Math.round(wait)
}

type Flat = { text: string; tones: (HueTone | null)[] }

/** A line as its plain text plus a hue per character (null = the heading's own ink). */
function flatten(line: TypewriterLine): Flat {
  const parts = typeof line === "string" ? [line] : line
  let text = ""
  const tones: (HueTone | null)[] = []
  for (const part of parts) {
    const [s, tone] = typeof part === "string" ? [part, null] : [part.text, part.tone]
    text += s
    for (let i = 0; i < s.length; i++) tones.push(tone)
  }
  return { text, tones }
}

/** The first `count` characters, as runs of one hue each: key words in colour, the rest plain. */
function Runs({ line, count }: { line: Flat; count: number }) {
  const out: React.ReactNode[] = []
  let start = 0
  for (let i = 1; i <= count; i++) {
    if (i === count || line.tones[i] !== line.tones[start]) {
      const tone = line.tones[start]
      const s = line.text.slice(start, i)
      out.push(tone ? <span key={start} data-tone={tone} className={HUE_CLASS[tone]}>{s}</span> : s)
      start = i
    }
  }
  return <>{out}</>
}

/** The original Login caret, to the hundredth of an em. Blinks only when idle; holds still while typing. */
function Caret({ blinking }: { blinking: boolean }) {
  return (
    <span
      data-slot="typewriter-caret"
      data-blinking={blinking || undefined}
      className={cn(
        "ml-1 inline-block h-[0.92em] w-[0.09em] rounded-[0.06em] align-[-0.1em] [background:var(--typewriter-caret)] shadow-(--typewriter-caret-glow)",
        blinking && "animate-typewriter-caret",
      )}
    />
  )
}

export { Typewriter }
