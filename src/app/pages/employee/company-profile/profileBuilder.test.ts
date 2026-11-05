import { describe, expect, it } from "vitest"
import { nudgeItems } from "@app/modules/common/components/ReorderableGroup"
import { DEMO_DATA } from "@app/modules/company-profile/fixtures"
import type { ProjectSection } from "@app/modules/company-profile/profile"
import { deckOf, initialSections, projectGroups, reorderSlides, sectionMeta, sectionSlides, toggleIn, toggleSlide } from "./profileBuilder"

const data = DEMO_DATA
const sections = initialSections(data)
const highRise = sections.find((s): s is ProjectSection => s.kind === "projects")!

describe("company profile builder", () => {
  it("starts with the five Phase 1 sections; High-rise spreads 10 projects over 2 slides", () => {
    expect(deckOf(sections, data).map((s) => s.title)).toEqual(["Cover", "About us", "Who we are", "Services we offer", "High-rise 1", "High-rise 2"])
    expect(sectionMeta(highRise, data)).toBe("10 projects · 2 slides")
    expect(sectionMeta(sections[0], data)).toBe("Fixed content")
    expect(sectionMeta(sections[3], data)).toBe("8 services · CRM")
  })

  it("hides one slide of a section without hiding the section, and renumbers the shown ones", () => {
    const next = sections.map((s) => (s.id === highRise.id ? toggleSlide(s, 1) : s))
    const deck = deckOf(next, data)
    expect(deck.map((s) => s.title)).toEqual(["Cover", "About us", "Who we are", "Services we offer", "High-rise 2"])
    expect(deck.at(-1)).toMatchObject({ n: 2, part: 1, parts: 1, page: 5 })
    expect(sectionMeta(next[4], data)).toBe("10 projects · 2 slides, 1 hidden")
  })

  it("drops a hidden section's slides", () => {
    expect(deckOf(sections.map((s) => (s.id === "services" ? { ...s, enabled: false } : s)), data)).toHaveLength(5)
  })

  it("reorders a section's slides as blocks of projects, the hidden flag moving with its slide", () => {
    const [first, second] = projectGroups(highRise, data.projects).map((g) => g.map((p) => p.id))
    const moved = reorderSlides({ ...highRise, hidden: [2] }, [2, 1], data.projects)
    expect(projectGroups(moved, data.projects).map((g) => g.map((p) => p.id))).toEqual([second, first])
    expect(moved.hidden).toEqual([1])
    expect(sectionSlides(moved, data).map((s) => [s.title, s.hidden])).toEqual([["High-rise 1", true], ["High-rise 2", false]])
  })

  it("nudges one step by keyboard and ignores moves past either end", () => {
    const list = ["a", "b", "c"]
    expect(nudgeItems(list, 0, 1)).toEqual(["b", "a", "c"])
    expect(nudgeItems(list, 2, -1)).toEqual(["a", "c", "b"])
    expect(nudgeItems(list, 0, -1)).toBe(list)
    expect(nudgeItems(list, 2, 1)).toBe(list)
  })

  it("toggles an id in or out of a selection", () => {
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"])
    expect(toggleIn(["a"], "b")).toEqual(["a", "b"])
  })
})
