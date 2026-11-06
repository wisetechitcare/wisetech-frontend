import type { KeyboardEvent, ReactNode, RefObject } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/ds/ui/button"
import type { SlideSpec } from "./profileBuilder"

const STEP: Partial<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, " ": 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }

/*
 * Sizes are one step up from the Storybook prototype's: the app's root font is 13px (Metronic), Storybook's
 * the browser's 16px, and every rem-based token shrinks with it. Raw <button>s carry no text size: the app's
 * unlayered `button { font-size: inherit }` outranks Tailwind's, so text sizes sit on spans inside.
 */

/**
 * The slide preview: the current slide (focus it and use the arrow keys, Home and End; it is also what Present
 * takes fullscreen), previous / next, and a filmstrip of every shown slide.
 */
export function DeckStage({
  slides,
  current,
  onGo,
  render,
  stageRef,
}: {
  slides: SlideSpec[]
  current: number
  onGo: (i: number) => void
  render: (s: SlideSpec) => ReactNode
  stageRef: RefObject<HTMLElement | null>
}) {
  const slide = slides[current]
  const onKey = (e: KeyboardEvent) => {
    const step = STEP[e.key]
    if (step) onGo(current + step)
    else if (e.key === "Home") onGo(0)
    else if (e.key === "End") onGo(slides.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-6">
      <section
        ref={stageRef}
        tabIndex={0}
        onKeyDown={onKey}
        aria-roledescription="slide"
        aria-label={slide ? `${current + 1} of ${slides.length}: ${slide.title}` : "No slides"}
        className="w-full max-w-7xl rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring [&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:rounded-none [&:fullscreen]:bg-black [&:fullscreen>div]:w-[min(100vw,177.78vh)]"
      >
        <div>{slide ? render(slide) : <p className="py-20 text-center text-base text-muted-foreground">Switch on a section to start the deck.</p>}</div>
      </section>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Previous slide" disabled={current === 0} onClick={() => onGo(current - 1)}>
          <ChevronLeft />
        </Button>
        <span className="min-w-20 text-center text-base tabular-nums" data-testid="slide-counter">
          {slides.length ? current + 1 : 0} / {slides.length}
        </span>
        <Button variant="outline" size="icon" aria-label="Next slide" disabled={current >= slides.length - 1} onClick={() => onGo(current + 1)}>
          <ChevronRight />
        </Button>
      </div>
      <nav aria-label="Slides" className="w-full max-w-7xl overflow-x-auto pb-2">
        <ol className="flex gap-3">
          {slides.map((s, i) => (
            <li key={s.id} className="w-44 shrink-0">
              {/* A filmstrip thumbnail, not an action button: an approved "tile" (docs/BUTTONS.md). */}
              <button
                type="button"
                data-wt-control="tile"
                onClick={() => onGo(i)}
                aria-current={i === current ? "true" : undefined}
                className="group w-full rounded-lg! p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-accent"
              >
                <div aria-hidden inert className="pointer-events-none">
                  {render(s)}
                </div>
                <span className="mt-1 block truncate text-sm text-muted-foreground group-aria-[current]:font-semibold group-aria-[current]:text-accent-foreground">
                  {i + 1}. {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
