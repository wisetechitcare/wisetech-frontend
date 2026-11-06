import { describe, expect, it } from "vitest"
import { nudgeItems } from "@app/modules/common/components/ReorderableGroup"
import { DEMO_DATA, DEMO_SECTIONS } from "./fixtures"
import { MAX_PER_SLIDE, MAX_SLIDES, type ProjectSection, type ProjectSlide, type Section } from "./profile"
import {
  categorySections,
  clientsSection,
  deckOf,
  fitToCap,
  generatedCount,
  moveProject,
  projectSlides,
  removeProject,
  reorderSlides,
  sectionMeta,
  sectionSlides,
  takenElsewhere,
  toggleIn,
  toggleSlide,
} from "./profileBuilder"

const data = DEMO_DATA
const categories = categorySections(data.projects)
const highRise = categories[0]
const sizes = (slides: ProjectSlide[]) => slides.map((s) => s.ids.length)
const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`)
const replace = (sections: Section[], s: Section) => sections.map((x) => (x.id === s.id ? s : x))

describe("default slides: one section per project category", () => {
  it("generates a section per category in the data, most projects first, without empty ones", () => {
    expect(categories.map((s) => [s.title, sizes(s.slides)])).toEqual([
      ["High-rise", [6, 5]],
      ["MOEF / CRZ", [3]],
      ["Government", [8]],
      ["International", [7]],
      ["Heritage", [4]],
      ["Green Building", [3]],
    ])
  })

  it("never puts a project in two sections, and only projects of that category with a Gallery cover", () => {
    const all = categories.flatMap((s) => s.slides.flatMap((x) => x.ids))
    expect(new Set(all).size).toBe(all.length)
    for (const s of categories)
      for (const id of s.slides.flatMap((x) => x.ids)) expect(data.projects.find((p) => p.id === id)).toMatchObject({ tags: expect.arrayContaining([s.value]), cover: expect.any(String) })
  })
})

describe("slide generation and splitting", () => {
  it("adds a slide only when a slide's capacity is passed, spreading evenly", () => {
    expect([1, 9, 10, 19].map((n) => sizes(projectSlides("x", ids(n))))).toEqual([[1], [9], [5, 5], [7, 6, 6]])
    expect(projectSlides("x", [])).toEqual([])
  })

  it("flows the client wall onto as many slides as it needs, each company once and no slide empty", () => {
    const clients = clientsSection(data)
    const pages = deckOf([{ ...clients, ids: [...clients.ids, clients.ids[0]] }], data)
    const plated = pages.flatMap((p) => p.shelves.flat().flatMap((g) => g.items.map((c) => c.id)))
    expect(pages).toHaveLength(5)
    expect(plated).toHaveLength(data.companies.length)
    expect(new Set(plated).size).toBe(plated.length)
    expect(deckOf([{ ...clients, ids: clients.ids.slice(0, 3) }], data)).toHaveLength(1)
  })
})

describe("project assignment", () => {
  const slides: ProjectSlide[] = [
    { key: "a", ids: ids(9) },
    { key: "b", ids: ["x", "y"] },
  ]

  it("adds a project to a slide with room, or spills it onto a new slide after a full one", () => {
    expect(moveProject(slides, "z", 1, "n").map((s) => s.ids)).toEqual([ids(9), ["x", "y", "z"]])
    expect(moveProject(slides, "z", 0, "n")).toEqual([slides[0], { key: "n", ids: ["z"] }, slides[1]])
    expect(moveProject(slides, "z", "new", "n").at(-1)).toEqual({ key: "n", ids: ["z"] })
  })

  it("moves a project off its previous slide, so it is never on two, and drops a slide left empty", () => {
    const moved = moveProject(slides, "p0", 1, "n")
    expect(moved.map((s) => s.ids)).toEqual([ids(9).slice(1), ["x", "y", "p0"]])
    expect(moved.flatMap((s) => s.ids).filter((id) => id === "p0")).toHaveLength(1)
    // x, then y, move from slide b to a new slide: b is left empty and goes.
    expect(moveProject(moveProject(slides, "x", "new", "n"), "y", 2, "m")).toEqual([slides[0], { key: "n", ids: ["x", "y"] }])
    expect(removeProject(removeProject(slides, "x"), "y").map((s) => s.key)).toEqual(["a"])
  })

  it("lists the projects other sections hold, so a picker cannot take them twice", () => {
    const taken = takenElsewhere(categories, highRise.id)
    expect(taken.get(categories[1].slides[0].ids[0])).toBe("MOEF / CRZ")
    expect([...taken.keys()].some((id) => highRise.slides.some((s) => s.ids.includes(id)))).toBe(false)
  })
})

describe("show / hide, reorder and numbering", () => {
  const sections = DEMO_SECTIONS.slice(0, 5)

  it("numbers every shown slide as page of total, and renumbers when one is hidden", () => {
    const deck = deckOf(sections, data)
    expect(deck.map((s) => [s.title, s.page, s.total])).toEqual([
      ["Cover", 1, 6],
      ["About us", 2, 6],
      ["Who we are", 3, 6],
      ["Services we offer", 4, 6],
      ["High-rise 1", 5, 6],
      ["High-rise 2", 6, 6],
    ])
    const hidden = deckOf(replace(sections, toggleSlide(highRise, "high-rise-1")), data)
    expect(hidden.map((s) => [s.title, s.page, s.total, s.part, s.parts])).toContainEqual(["High-rise 2", 5, 5, 1, 1])
    expect(sectionMeta(toggleSlide(highRise, "high-rise-1"), data)).toBe("11 projects · 2 slides, 1 hidden")
    expect(deckOf(sections.map((s) => (s.id === "services" ? { ...s, enabled: false } : s)), data).at(-1)).toMatchObject({ page: 5, total: 5 })
  })

  it("reorders a section's slides, each keeping its projects and hidden flag; the deck follows", () => {
    const moved = reorderSlides(toggleSlide(highRise, "high-rise-2") as ProjectSection, ["high-rise-2", "high-rise-1"])
    expect(moved.slides).toEqual([highRise.slides[1], highRise.slides[0]])
    expect(sectionSlides(moved, data).map((s) => [s.title, s.hidden])).toEqual([
      ["High-rise 1", true],
      ["High-rise 2", false],
    ])
    expect(deckOf(replace(sections, reorderSlides(highRise, ["high-rise-2", "high-rise-1"])), data)[4].projects.map((p) => p.id)).toEqual(highRise.slides[1].ids)
  })

  it("nudges one step by keyboard and ignores moves past either end", () => {
    const list = ["a", "b", "c"]
    expect(nudgeItems(list, 0, 1)).toEqual(["b", "a", "c"])
    expect(nudgeItems(list, 0, -1)).toBe(list)
    expect(nudgeItems(list, 2, 1)).toBe(list)
  })

  it("toggles an id in or out of a selection", () => {
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"])
    expect(toggleIn(["a"], "b")).toEqual(["a", "b"])
  })
})

describe(`the ${MAX_SLIDES}-slide presentation limit`, () => {
  // A second logo wall right after Services takes the generated deck to 25.
  const wall = { ...clientsSection(data), id: "wall-2", title: "More clients" }
  const big = [...DEMO_SECTIONS.slice(0, 4), wall, ...DEMO_SECTIONS.slice(4)]

  it("opens a generated deck past the limit with only the first 20 shown, hiding (never removing) the rest", () => {
    const fitted = fitToCap(big, data)
    expect(generatedCount(big, data)).toBe(25)
    expect(generatedCount(fitted, data)).toBe(25)
    expect(deckOf(fitted, data)).toHaveLength(MAX_SLIDES)
    const clients = fitted.find((s) => s.id === "clients")!
    expect(sectionSlides(clients, data).map((s) => s.hidden)).toEqual([false, false, false, false, true])
    expect(fitted.filter((s) => !s.enabled).map((s) => s.id)).toEqual(["repeat", "india", "world", "contact"])
  })

  it("leaves a deck within the limit untouched", () => {
    expect(fitToCap(DEMO_SECTIONS, data)).toEqual(DEMO_SECTIONS)
  })

  it("keeps a full project slide at its capacity", () => {
    const full = moveProject([{ key: "a", ids: ids(MAX_PER_SLIDE) }], "z", 0, "n")
    expect(sizes(full)).toEqual([MAX_PER_SLIDE, 1])
  })
})
