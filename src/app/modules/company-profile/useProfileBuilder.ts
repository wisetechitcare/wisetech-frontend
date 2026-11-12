import { startTransition, useMemo, useState } from "react"
import { isHexColor } from "@app/modules/common/components/ui/WtColorPicker"
import { MAX_SLIDES, type ProfileData, type ProjectSection, type Section } from "./profile"
import { deckOf, fitToCap, generatedCount, reorderSlides, toggleSlide } from "./profileBuilder"

const LIMIT_MESSAGE = `A presentation shows at most ${MAX_SLIDES} slides. Hide another slide first.`

/** The deck background is the one thing remembered across reloads (this browser only). */
const BG_KEY = "company-profile.slide-bg"
const savedBg = () => {
  try {
    const v = localStorage.getItem(BG_KEY)
    return isHexColor(v) ? v : "#ffffff"
  } catch {
    return "#ffffff"
  }
}

/**
 * Builder state: the sections, the presentation derived from them, the slide on the stage and the deck's
 * background colour. Local only; just the background is kept in localStorage. Every change that could show more than MAX_SLIDES is refused through `notify`, never trimmed.
 */
export function useProfileBuilder(data: ProfileData, initial: Section[], notify: (message: string) => void, initialSlideId?: string) {
  const [start] = useState(() => fitToCap(initial, data))
  const [sections, setSections] = useState(start)
  const slides = useMemo(() => deckOf(sections, data), [sections, data])
  const [index, setIndex] = useState(() => Math.max(0, slides.findIndex((s) => s.id === initialSlideId)))
  const current = Math.min(index, Math.max(0, slides.length - 1))
  const [bg, setBgState] = useState(savedBg)
  const setBg = (c: string) => {
    // A transition: dragging the custom colour sends dozens of colours a second, and each one repaints every
    // slide and thumbnail. React drops the stale repaints instead of freezing the picker.
    startTransition(() => setBgState(c))
    try {
      localStorage.setItem(BG_KEY, c)
    } catch {
      /* private mode: the colour still applies, it just is not remembered */
    }
  }

  const replace = (s: Section) => sections.map((x) => (x.id === s.id ? s : x))
  /** Applies a change; refused when it would show more than MAX_SLIDES. Returns the new deck, or null. */
  const apply = (next: Section[]) => {
    const deck = deckOf(next, data)
    if (deck.length > MAX_SLIDES) {
      notify(LIMIT_MESSAGE)
      return null
    }
    setSections(next)
    return deck
  }
  const go = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)))

  return {
    sections,
    slides,
    current,
    go,
    /** Background of every slide but the cover, as a hex. */
    bg,
    setBg,
    /** Anything changed since the deck opened (order, visibility, picks or background)? */
    changed: sections !== start || bg !== "#ffffff",
    /** Back to the starting deck: default sections, order and picks, white background, first slide. */
    reset: () => {
      setSections(start)
      setBg("#ffffff")
      setIndex(0)
    },
    /** Every slide the sections generate, shown or hidden. */
    generated: generatedCount(sections, data),
    /** Shows a section's first shown slide, or its slide `n`. */
    open: (s: Section, n?: number) => {
      const i = slides.findIndex((x) => x.section.id === s.id && (n === undefined || x.n === n))
      if (i >= 0) setIndex(i)
    },
    /** Section order never changes how many slides are shown. */
    reorder: setSections,
    toggle: (s: Section) => apply(replace({ ...s, enabled: !s.enabled })),
    toggleSlide: (s: Section, key: string) => apply(replace(toggleSlide(s, key))),
    reorderSlides: (s: ProjectSection, order: string[]) => setSections(replace(reorderSlides(s, order))),
    /** Slides `s` may show without the presentation passing MAX_SLIDES. */
    budgetFor: (s: Section) => MAX_SLIDES - deckOf(sections.filter((x) => x.id !== s.id), data).length,
    /** Saves an edited or new section (new ones go before the maps and contact slide) and shows its first slide. */
    save: (s: Section) => {
      const at = sections.findIndex((x) => x.kind === "map" || x.kind === "contact")
      const next = sections.some((x) => x.id === s.id) ? replace(s) : at < 0 ? [...sections, s] : [...sections.slice(0, at), s, ...sections.slice(at)]
      const deck = apply(next)
      if (deck) setIndex(Math.max(0, deck.findIndex((x) => x.section.id === s.id)))
      return !!deck
    },
  }
}
