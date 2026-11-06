import {
  LOGO_COLS,
  LOGO_ROWS,
  MAX_PER_SLIDE,
  MAX_SLIDES,
  autoPick,
  facetValues,
  paginateGroups,
  plural,
  projectsOf,
  spread,
  type CompaniesSection,
  type Facet,
  type Group,
  type ProfileCompany,
  type ProfileData,
  type ProfileProject,
  type ProjectSection,
  type ProjectSlide,
  type Section,
} from "./profile"

/*
 * Company Profile builder rules, pure: no React, no UI. Shared by the CRM page and the Storybook prototype;
 * `useProfileBuilder` holds the state. A section generates its slides (projects: one per ProjectSlide;
 * client logos: as many as the wall needs); hiding switches one off, and at most MAX_SLIDES are shown.
 */

/** A section whose content is picked in a dialog. */
export type EditableSection = Exclude<Section, { kind: "cover" | "about" | "vision" | "contact" }>
export const isEditable = (s: Section): s is EditableSection => s.kind === "projects" || s.kind === "services" || s.kind === "companies" || s.kind === "map"

/** One slide of a section, shown or hidden: a row in the builder. */
export type SectionSlide = { key: string; n: number; title: string; hidden: boolean }

/** One shown slide. `page / total` is its place in the presentation; `n` its number in the section; `part / parts` count only shown ones. */
export type SlideSpec = {
  id: string
  title: string
  page: number
  total: number
  section: Section
  n: number
  part: number
  parts: number
  projects: ProfileProject[]
  shelves: Group<ProfileCompany>[][]
}

type Page = { key: string; projects: ProfileProject[]; shelves: Group<ProfileCompany>[][] }

/** The items with these ids, in id order (selection order is display order). */
export const pick = <T extends { id: string }>(all: T[], ids: string[]) => ids.flatMap((id) => all.filter((x) => x.id === id))

/** `list` with `x` removed if present, else appended: picking and un-picking, hiding and showing. */
export const toggleIn = <T>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x])


/** Logo-wall groups: company types in pick order, each company once. */
export function companyGroups(companies: ProfileCompany[]): Group<ProfileCompany>[] {
  const typeOf = (c: ProfileCompany) => c.types[0] ?? "Other"
  return [...new Set(companies.map(typeOf))].map((name) => ({ name, items: companies.filter((c) => typeOf(c) === name) }))
}

/** Every slide a section generates, hidden ones included. No slide is ever empty. */
function pagesOf(s: Section, data: ProfileData): Page[] {
  if (s.kind === "projects")
    return s.slides.flatMap((slide) => {
      const projects = pick(data.projects, slide.ids).filter((p) => p.cover)
      return projects.length ? [{ key: slide.key, projects, shelves: [] }] : []
    })
  if (s.kind === "companies" && s.display === "logos")
    return paginateGroups(companyGroups(pick(data.companies, [...new Set(s.ids)])), LOGO_COLS, LOGO_ROWS)
      .filter((shelves) => shelves.length)
      .map((shelves) => ({ key: shelves[0][0].items[0].id, projects: [], shelves }))
  return [{ key: s.id, projects: [], shelves: [] }]
}

const numbered = (s: Section, n: number, parts: number) => (parts > 1 ? `${s.title} ${n}` : s.title)

export function sectionSlides(s: Section, data: ProfileData): SectionSlide[] {
  const pages = pagesOf(s, data)
  return pages.map((p, i) => ({ key: p.key, n: i + 1, title: numbered(s, i + 1, pages.length), hidden: !!s.hidden?.includes(p.key) }))
}

/** The presentation: shown sections' shown slides, numbered as pages of the whole. */
export function deckOf(sections: Section[], data: ProfileData): SlideSpec[] {
  const specs = sections
    .filter((s) => s.enabled)
    .flatMap((s) => {
      const pages = pagesOf(s, data)
      const shown = pages.flatMap((p, i) => (s.hidden?.includes(p.key) ? [] : [{ ...p, n: i + 1 }]))
      return shown.map(({ n, projects, shelves }, i) => ({
        id: pages.length > 1 ? `${s.id}-${n}` : s.id,
        title: numbered(s, n, pages.length),
        section: s,
        n,
        part: i + 1,
        parts: shown.length,
        projects,
        shelves,
      }))
    })
  return specs.map((spec, i) => ({ ...spec, page: i + 1, total: specs.length }))
}

/** Every slide the sections generate, shown or not. */
export const generatedCount = (sections: Section[], data: ProfileData) => sections.reduce((n, s) => n + pagesOf(s, data).length, 0)

/**
 * Opens a generated deck within MAX_SLIDES: past the cap, in deck order, a section with one slide is switched
 * off and a longer one has its remaining slides hidden. Nothing is removed; each can be shown again.
 */
export function fitToCap(sections: Section[], data: ProfileData): Section[] {
  let shown = 0
  return sections.map((s) => {
    if (!s.enabled) return s
    const over: string[] = []
    for (const slide of sectionSlides(s, data)) {
      if (slide.hidden) continue
      if (shown < MAX_SLIDES) shown++
      else over.push(slide.key)
    }
    if (!over.length) return s
    return over.length === pagesOf(s, data).length ? { ...s, enabled: false } : { ...s, hidden: [...(s.hidden ?? []), ...over] }
  })
}

/** Switches one of a section's slides (by key) in or out of the presentation. */
export const toggleSlide = (s: Section, key: string): Section => ({ ...s, hidden: toggleIn(s.hidden ?? [], key) })

/** Puts a project section's slides in `order` (slide keys); each slide's projects and hidden flag move with it. */
export const reorderSlides = (s: ProjectSection, order: string[]): ProjectSection => ({
  ...s,
  slides: [...order.flatMap((k) => s.slides.filter((x) => x.key === k)), ...s.slides.filter((x) => !order.includes(x.key))],
})

/* ---------- Project slides ---------- */

/** `ids` spread evenly over as few slides as MAX_PER_SLIDE allows (10 → 5 + 5). */
export const projectSlides = (sectionId: string, ids: string[]): ProjectSlide[] => spread(ids, MAX_PER_SLIDE).map((x, i) => ({ key: `${sectionId}-${i + 1}`, ids: x }))

const without = (slides: ProjectSlide[], id: string) => slides.map((s) => ({ ...s, ids: s.ids.filter((x) => x !== id) }))
const nonEmpty = (slides: ProjectSlide[]) => slides.filter((s) => s.ids.length)

/**
 * Puts a project on slide `to` (index), or on a new last slide, taking it off whichever slide held it, so it is
 * never on two. A full slide spills it onto a new slide right after; a slide left empty is dropped.
 */
export function moveProject(slides: ProjectSlide[], id: string, to: number | "new", key: string = crypto.randomUUID()): ProjectSlide[] {
  const next = without(slides, id)
  const at = to === "new" ? next.length : to
  if (next[at] && next[at].ids.length < MAX_PER_SLIDE) next[at] = { ...next[at], ids: [...next[at].ids, id] }
  else next.splice(at + 1, 0, { key, ids: [id] })
  return nonEmpty(next)
}

export const removeProject = (slides: ProjectSlide[], id: string) => nonEmpty(without(slides, id))

/** Projects on any other project section, id → that section's title: a project appears once in the deck. */
export const takenElsewhere = (sections: Section[], sectionId: string) =>
  new Map(sections.flatMap((s) => (s.kind === "projects" && s.id !== sectionId ? s.slides.flatMap((x) => x.ids.map((id) => [id, s.title] as const)) : [])))

export const projectSection = (id: string, facet: Facet, value: string, ids: string[]): ProjectSection => ({
  id,
  kind: "projects",
  title: value,
  enabled: true,
  facet,
  value,
  slides: projectSlides(id, ids),
  captions: ["architect", "client", "area", "status"],
})

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/**
 * The default project sections: one per project category in the data (most projects first), each holding
 * every project of it with a Gallery cover, largest first. A project in several categories goes to the first
 * only; a category left without projects gets no section.
 */
export function categorySections(projects: ProfileProject[]): ProjectSection[] {
  const used = new Set<string>()
  return facetValues(projects, "tag").flatMap(({ name }) => {
    const ids = autoPick(
      projects.filter((p) => !used.has(p.id)),
      "tag",
      name,
      Infinity,
    )
    ids.forEach((id) => used.add(id))
    return ids.length ? [projectSection(slug(name), "tag", name, ids)] : []
  })
}

/** The client logo wall: every company, clients before architects, most projects first. */
export function clientsSection(data: ProfileData): CompaniesSection {
  const architect = (c: ProfileCompany) => (c.types.includes("Architect") ? 1 : 0)
  const ids = [...data.companies]
    .sort((a, b) => architect(a) - architect(b) || projectsOf(data.projects, b.name) - projectsOf(data.projects, a.name))
    .map((c) => c.id)
  return { id: "clients", kind: "companies", title: "Our Clients", enabled: true, display: "logos", ids }
}

/** The muted line under a section's title. */
export function sectionMeta(s: Section, data: ProfileData) {
  const slides = sectionSlides(s, data)
  const off = slides.filter((x) => x.hidden).length
  const count = `${plural(slides.length, "slide")}${off ? `, ${off} hidden` : ""}`
  switch (s.kind) {
    case "projects":
      return `${plural(s.slides.flatMap((x) => x.ids).length, "project")} · ${count}`
    case "services":
      return `${s.ids.length} services · CRM`
    case "companies":
      return `${s.ids.length} companies · ${s.display === "logos" ? `logo wall · ${count}` : "repeat chart"}`
    case "map":
      return `${s.ids.length} ${s.region === "india" ? "cities" : "countries"} · map`
    default:
      return "Fixed content"
  }
}
