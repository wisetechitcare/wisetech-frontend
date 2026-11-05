import {
  MAX_PER_SLIDE,
  autoPick,
  spread,
  type ProfileData,
  type ProfileProject,
  type ProjectSection,
  type ServicesSection,
  type StaticSection,
} from "@app/modules/company-profile/profile"

/*
 * Company Profile builder rules (Phase 1), pure: no React, no UI. Slide layouts, data contract and the rules
 * (spread, autoPick, caps) are the Storybook prototype's, imported read-only; this file adds the
 * builder rules on top; `useProfileBuilder` holds the state.
 */

/** Phase 1 sections: the three copy slides, Services and project sections (High-rise). */
export type BuilderSection = CopySection<"cover"> | CopySection<"about"> | CopySection<"vision"> | ServicesSection | ProjectSection
/** One member per kind, so `kind` checks narrow (a member with a union `kind` never drops out). */
type CopySection<K extends "cover" | "about" | "vision"> = Omit<StaticSection, "kind"> & { kind: K }
/** A section whose content is picked in a dialog. */
export type EditableSection = ServicesSection | ProjectSection

/** One slide of a section, hidden or not. `key` stays with the slide's projects while it is dragged. */
export type SectionSlide = { key: string; n: number; title: string; hidden: boolean }

/** One shown slide of the deck. `n` is its number within the section; `part / parts` count only shown ones. */
export type SlideSpec = { id: string; title: string; page: number; section: BuilderSection; n: number; part: number; parts: number; projects: ProfileProject[] }

/** The items with these ids, in id order (selection order is display order). */
export const pick = <T extends { id: string }>(all: T[], ids: string[]) => ids.flatMap((id) => all.filter((x) => x.id === id))

/** `list` with `x` removed if present, else appended: picking and un-picking, hiding and showing. */
export const toggleIn = <T>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x])

/** A project section's slides: its projects that have a Gallery cover, spread evenly (10 → 5 + 5). */
export const projectGroups = (s: ProjectSection, projects: ProfileProject[]) => spread(pick(projects, s.projectIds).filter((p) => p.cover), MAX_PER_SLIDE)

/** Every section is one slide except a project section, which is one per group. */
const groupsOf = (s: BuilderSection, data: ProfileData): ProfileProject[][] => (s.kind === "projects" ? projectGroups(s, data.projects) : [[]])

const numbered = (s: BuilderSection, n: number, parts: number) => (parts > 1 ? `${s.title} ${n}` : s.title)

export function sectionSlides(s: BuilderSection, data: ProfileData): SectionSlide[] {
  const groups = groupsOf(s, data)
  return groups.map((g, i) => ({ key: g[0]?.id ?? s.id, n: i + 1, title: numbered(s, i + 1, groups.length), hidden: !!s.hidden?.includes(i + 1) }))
}

/** The deck: shown sections' shown slides, numbered as pages. */
export function deckOf(sections: BuilderSection[], data: ProfileData): SlideSpec[] {
  return sections
    .filter((s) => s.enabled)
    .flatMap((s) => {
      const groups = groupsOf(s, data)
      const shown = groups.flatMap((projects, i) => (s.hidden?.includes(i + 1) ? [] : [{ projects, n: i + 1 }]))
      return shown.map(({ projects, n }, i) => ({
        id: groups.length > 1 ? `${s.id}-${n}` : s.id,
        title: numbered(s, n, groups.length),
        section: s,
        n,
        part: i + 1,
        parts: shown.length,
        projects,
      }))
    })
    .map((spec, i) => ({ ...spec, page: i + 1 }))
}

/** Switches one of a section's slides (1-based) in or out of the deck. */
export const toggleSlide = (s: BuilderSection, n: number): BuilderSection => ({ ...s, hidden: toggleIn(s.hidden ?? [], n) })

/**
 * Puts a project section's slides in `order` (slide numbers). A slide is its block of projects, so the blocks
 * move and each slide's hidden flag moves with it. With an uneven split (11 → 6 + 5) the even re-spread can
 * shift one project across the boundary.
 */
export function reorderSlides(s: ProjectSection, order: number[], projects: ProfileProject[]): ProjectSection {
  const groups = projectGroups(s, projects).map((g) => g.map((p) => p.id))
  const onSlides = new Set(groups.flat())
  return {
    ...s,
    projectIds: [...order.flatMap((n) => groups[n - 1] ?? []), ...s.projectIds.filter((id) => !onSlides.has(id))],
    hidden: s.hidden?.map((h) => order.indexOf(h) + 1).filter((n) => n > 0),
  }
}

/** The muted line under a section's title. */
export function sectionMeta(s: BuilderSection, data: ProfileData) {
  if (s.kind === "services") return `${s.ids.length} services · CRM`
  if (s.kind !== "projects") return "Fixed content"
  const slides = sectionSlides(s, data)
  const off = slides.filter((x) => x.hidden).length
  return `${s.projectIds.length} projects · ${slides.length} ${slides.length === 1 ? "slide" : "slides"}${off ? `, ${off} hidden` : ""}`
}

const HIGH_RISE = "High-rise"

/** The starting deck: the five Phase 1 sections, pre-picked from the data. */
export const initialSections = (data: ProfileData): BuilderSection[] => [
  { id: "cover", kind: "cover", title: "Cover", enabled: true },
  { id: "about", kind: "about", title: "About us", enabled: true },
  { id: "vision", kind: "vision", title: "Who we are", enabled: true },
  { id: "services", kind: "services", title: "Services we offer", enabled: true, ids: data.services.slice(0, 8).map((s) => s.id) },
  {
    id: "high-rise",
    kind: "projects",
    title: HIGH_RISE,
    enabled: true,
    facet: "tag",
    value: HIGH_RISE,
    projectIds: autoPick(data.projects, "tag", HIGH_RISE, 10),
    captions: ["architect", "client", "area", "status"],
  },
]

