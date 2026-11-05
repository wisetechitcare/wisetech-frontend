import { useMemo, useState } from "react"
import { toast } from "@app/modules/common/components/ui"
import { MAX_SLIDES, type ProfileData, type ProjectSection } from "@app/modules/company-profile/profile"
import { deckOf, initialSections, reorderSlides, toggleSlide, type BuilderSection, type EditableSection } from "./profileBuilder"

/** Builder state: the sections, the deck derived from them and the slide on the stage. Local only, no persistence. */
export function useProfileBuilder(data: ProfileData) {
  const [sections, setSections] = useState(() => initialSections(data))
  const [index, setIndex] = useState(0)
  const slides = useMemo(() => deckOf(sections, data), [sections, data])
  const current = Math.min(index, Math.max(0, slides.length - 1))

  const replace = (s: BuilderSection) => sections.map((x) => (x.id === s.id ? s : x))
  /** Applies a change that can add slides; refused when the deck would pass MAX_SLIDES. Returns the new deck, or null. */
  const apply = (next: BuilderSection[]) => {
    const deck = deckOf(next, data)
    if (deck.length > MAX_SLIDES) {
      void toast({ icon: "warning", title: `The deck is capped at ${MAX_SLIDES} slides`, text: "Hide a section or slide first." })
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
    /** Shows a section's first shown slide, or its slide `n`. */
    open: (s: BuilderSection, n?: number) => {
      const i = slides.findIndex((x) => x.section.id === s.id && (n === undefined || x.n === n))
      if (i >= 0) setIndex(i)
    },
    reorder: setSections,
    toggle: (s: BuilderSection) => apply(replace({ ...s, enabled: !s.enabled })),
    toggleSlide: (s: BuilderSection, n: number) => apply(replace(toggleSlide(s, n))),
    reorderSlides: (s: ProjectSection, order: number[]) => setSections(replace(reorderSlides(s, order, data.projects))),
    remove: (s: ProjectSection) => setSections(sections.filter((x) => x.id !== s.id)),
    /** Slides `s` may use without the deck passing MAX_SLIDES. */
    budgetFor: (s: BuilderSection) => MAX_SLIDES - deckOf(sections.filter((x) => x.id !== s.id), data).length,
    /** Saves an edited section and shows its first slide; false when the deck would pass the cap. */
    save: (s: EditableSection) => {
      const deck = apply(replace(s))
      if (deck) setIndex(Math.max(0, deck.findIndex((x) => x.section.id === s.id)))
      return !!deck
    },
  }
}
