import * as React from "react"
import { cn } from "cn"
import { useReducedMotion } from "@/ds/lib/motion"
import type { HueTone } from "@/ds/lib/tone"
import { GradientText } from "@/ds/effects/gradient-text"

/**
 * A line: plain text, or parts where key words wear a module hue (the launcher's department colours).
 *   ['Effortless ', { text: 'HR', tone: 'blue' }, ', End to End']
 */
export type TypewriterLine = string | ReadonlyArray<string | { text: string; tone: HueTone }>

/**
 * The sign-in headline: lines that type themselves out, hold, backspace and rotate to the next,
 * landing on the last — then rest. For moments only (the sign-in brand panel). Never in tables,
 * forms, wizards or approvals.
 *
 * Typing, as a person types. Key words wear their module's hue as a gradient into a neighbouring hue, with a soft
 * light shimmer swept across them — looping while it types, two passes once landed, then still (all motion ends
 * within 5s: WCAG 2.2.2). The rest is the heading's own ink. The original Login typewriter's pace and caret:
 * 55ms per character after a 300ms delay, a 2s hold, backspace at 30ms; the gradient caret (0.09em × 0.92em, 0.06em radius, sat
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
  onLanded,
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
  /** Called once when the headline lands (or settles) — e.g. to settle an animated background with it. */
  onLanded?: () => void
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
  const onLandedRef = React.useRef(onLanded)
  onLandedRef.current = onLanded
  React.useEffect(() => {
    if (landed || still) onLandedRef.current?.()
  }, [landed, still])
  const rootRef = React.useRef<HTMLSpanElement>(null)
  const textRef = React.useRef<HTMLSpanElement>(null)
  const reveal = useReveal(rootRef, textRef, lines[index].text, count)

  return (
    <span ref={rootRef} data-slot="typewriter" className={cn("relative inline-grid whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{landing.text}</span>
      {/* Every line, invisible, in one cell: the box is the largest line's from the start. */}
      {lines.map((line, i) => (
        <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1">
          <Runs line={line} />
        </span>
      ))}
      {/* The WHOLE current line, laid out exactly like its copy (same structure, so the same kerning and the same
          line breaks), revealed up to the typed character by a clip. Splitting the text at the caret instead loses
          the kerning pair it cuts — up to ~2px — so the line, and centred text with it, would twitch per key. */}
      <span
        ref={textRef}
        aria-hidden="true"
        data-slot="typewriter-text"
        data-typed={count}
        data-landed={landed || undefined}
        className="relative col-start-1 row-start-1"
        style={{ clipPath: reveal.clip }}
      >
        <Runs line={lines[index]} shimmer={reduced || settled ? "off" : landed ? "twice" : "loop"} />
      </span>
      {/* Positioned from the root, so it stays on the text however a parent aligns the line (e.g. self-end). */}
      {!reduced && reveal.caret && <Caret blinking={!pressing} left={reveal.caret.left} top={reveal.caret.top} />}
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

/**
 * The line as runs of one hue each: key words in their gradient, the rest plain. `shimmer` sweeps a light band
 * across the key words — "loop" while typing, "twice" once landed (then still), "off" when settled, reduced
 * motion, or for the invisible copies.
 */
function Runs({ line, shimmer = "off" }: { line: Flat; shimmer?: "loop" | "twice" | "off" }) {
  const count = line.text.length
  const out: React.ReactNode[] = []
  let start = 0
  for (let i = 1; i <= count; i++) {
    if (i === count || line.tones[i] !== line.tones[start]) {
      const tone = line.tones[start]
      const s = line.text.slice(start, i)
      out.push(
        tone ? (
          <GradientText key={start} tone={tone} shimmer={shimmer}>
            {s}
          </GradientText>
        ) : (
          s
        ),
      )
      start = i
    }
  }
  return <>{out}</>
}

/**
 * Where the typed characters are, measured from the browser's own text layout: the clip that reveals them
 * (one rectangle per line fragment, so multi-line phrases reveal line by line) and the caret's position. Runs
 * before paint and again whenever the text box resizes (wrapping changes).
 */
function useReveal(
  rootRef: React.RefObject<HTMLSpanElement | null>,
  ref: React.RefObject<HTMLSpanElement | null>,
  text: string,
  count: number,
) {
  const [reveal, setReveal] = React.useState<{ clip: string; caret: { left: number; top: number } | null }>({
    clip: "inset(0 100% 0 0)",
    caret: null,
  })
  const [layoutTick, setLayoutTick] = React.useState(0)
  /** Baseline offset from a line fragment's top, measured once per layout (font metrics, not assumed). */
  const baselineRef = React.useRef<{ tick: number; text: string; offset: number } | null>(null)

  React.useEffect(() => {
    const el = ref.current
    const root = rootRef.current
    if (!el || !root || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => setLayoutTick((t) => t + 1))
    observer.observe(el)
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef, ref])

  React.useLayoutEffect(() => {
    const el = ref.current
    const root = rootRef.current
    if (!el || !root) return
    const box = el.getBoundingClientRect()
    const rootBox = root.getBoundingClientRect()
    const em = parseFloat(getComputedStyle(el).fontSize) || 16
    const rects = count > 0 ? charRects(el, 0, count) : []
    if (!baselineRef.current || baselineRef.current.tick !== layoutTick || baselineRef.current.text !== text) {
      // A zero-size inline-block sits ON the baseline; insert one for a moment (before paint), read it, remove it.
      const probe = document.createElement("span")
      probe.style.cssText = "display:inline-block;width:0;height:0"
      el.insertBefore(probe, el.firstChild)
      const first = charRects(el, 0, 1)[0]
      const offset = first ? probe.getBoundingClientRect().top - first.top : em
      probe.remove()
      baselineRef.current = { tick: layoutTick, text, offset }
    }
    const baseline = baselineRef.current.offset
    // A typed character's ink may run past its advance (a bold "f", "y"); reveal that only where nothing
    // follows on the line, so the next — untyped — letter never shows a sliver.
    const tail = count >= text.length || text[count] === " " ? 0.15 * em : 0
    const path = rects
      .map((r, i) => {
        const x = r.left - box.left
        const y = r.top - box.top
        const w = r.width + (i === rects.length - 1 ? tail : 0)
        return `M${x} ${y}H${x + w}V${y + r.height}H${x}Z`
      })
      .join("")
    // Before the first key the caret waits where the first letter will appear.
    const at = rects.length ? rects[rects.length - 1] : charRects(el, 0, Math.min(1, text.length))[0]
    const caret = at
      ? {
          left: (rects.length ? at.right : at.left) - rootBox.left + 0.25 * 16,
          // The bar (0.92em) ends 0.1em below the baseline.
          top: at.top - rootBox.top + baseline + 0.1 * em - 0.92 * em,
        }
      : null
    setReveal({ clip: path ? `path("${path}")` : "inset(0 100% 0 0)", caret })
  }, [rootRef, ref, text, count, layoutTick])

  return reveal
}

/** The client rects of characters [start, end) of the element's text, one per line fragment. */
function charRects(root: HTMLElement, start: number, end: number): DOMRect[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let offset = 0
  let started = false
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0
    if (!started && start < offset + len) {
      range.setStart(node, start - offset)
      started = true
    }
    if (started && end <= offset + len) {
      range.setEnd(node, end - offset)
      return [...range.getClientRects()].filter((r) => r.width > 0 || r.height > 0)
    }
    offset += len
  }
  return []
}

/**
 * The original Login caret, to the hundredth of an em: 0.25rem after the last typed letter, 0.09em × 0.92em,
 * sat 0.1em below the baseline. It is painted over the text, never part of it — a caret inside the line splits
 * the text (and its kerning) and gives the browser a place to break a word. Blinks only when idle.
 */
function Caret({ blinking, left, top }: { blinking: boolean; left: number; top: number }) {
  return (
    <span
      data-slot="typewriter-caret"
      data-blinking={blinking || undefined}
      className={cn(
        "pointer-events-none absolute h-[0.92em] w-[0.09em] rounded-[0.06em] [background:var(--typewriter-caret)] shadow-(--typewriter-caret-glow)",
        blinking && "animate-typewriter-caret",
      )}
      style={{ left, top }}
    />
  )
}

export { Typewriter }
