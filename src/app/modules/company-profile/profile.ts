/**
 * Company Profile: data contract and pure logic. `useProfileData` builds `ProfileData` from existing APIs
 * (`profileAdapter.ts`); the static slides (cover, about, who we are, contact) are hardcoded copy in `org`,
 * everything else is fetched from the app and shown only as the user picked it.
 */

/** One project (= a Lead past its project trigger), flattened for the profile. */
export type ProfileProject = {
  id: string
  name: string
  city: string
  country: string
  /** AdditionalDetails.latitude / longitude, for the map pins; null until the address is geocoded. */
  lat: number | null
  lng: number | null
  /** First project category name. */
  typology: string
  /** Every project category name. */
  tags: string[]
  /** External Team company whose type has the Client role (else Builder). */
  client?: string
  /** External Team company whose type has the Architect role. */
  architect?: string
  /** Built-up area in sq ft. */
  areaSqft?: number
  /** Project status name: Completed, Ongoing, On Hold… */
  status?: string
  /** Lead.coverImageUrl, the Gallery cover. A project without one cannot be shown on a slide. */
  cover: string | null
}

/** A CRM company (Companies module): logo and company types (Architect, Builder, Hospitality…). */
export type ProfileCompany = { id: string; name: string; types: string[]; logo: string | null }

/** A CRM service (ProjectService) with how many projects used it (LeadService). */
export type ProfileService = { id: string; name: string; projects: number }

/** Hardcoded slide copy. Only `foundedIn` feeds a calculation (years in practice). */
export type OrgProfile = {
  legalName: string
  /** Two-tone brand name, e.g. ["WISE", "TECH"]. */
  wordmark: [string, string]
  /** Second half prints in the accent colour. */
  tagline: [string, string]
  slogan: string
  about: string[]
  foundedIn: number
  /** Head-office city, named on the cover's "Projects in …" count. */
  homeCity: string
  vision: string
  mission: string
  values: Array<{ label: string; text: string }>
  /** The cover's four pillars. */
  pillars: Array<{ title: string; text: string }>
  address: string
  phone: string
  website: string
  hero: string
  /** Contact slide photo. */
  site: string
}

export type ProfileData = {
  org: OrgProfile
  /** Live counts over every project the viewer can see (Cancelled included), plus active employees. */
  totals: { projects: number; completed: number; clients: number; team: number; countries: number; cities: number; inHomeCity: number }
  projects: ProfileProject[]
  companies: ProfileCompany[]
  services: ProfileService[]
}

/** The deck stays a presentation, not a catalogue. */
export const MAX_SLIDES = 20

export type Facet = "typology" | "tag" | "city" | "client" | "architect"
export const FACETS: Array<{ id: Facet; label: string }> = [
  { id: "typology", label: "Typology" },
  { id: "tag", label: "Tag" },
  { id: "city", label: "City" },
  { id: "client", label: "Client" },
  { id: "architect", label: "Architect" },
]

export type CaptionField = "architect" | "client" | "area" | "status"
export const CAPTION_FIELDS: Array<{ id: CaptionField; label: string }> = [
  { id: "architect", label: "Architect" },
  { id: "client", label: "Client" },
  { id: "area", label: "Area" },
  { id: "status", label: "Status" },
]

/** Projects per slide: up to 9 (one tall hero + 8 portrait tiles). Sections are spread evenly, so with at
 * least MIN_PROJECTS picked no slide ever holds fewer than 5. */
export const MAX_PER_SLIDE = 9
export const MIN_PROJECTS = 5

/** `hidden`: numbers (1-based) of this section's own slides that are switched off, e.g. page 3 of High-rise. */
type Base = { id: string; title: string; enabled: boolean; hidden?: number[] }
export type StaticKind = "cover" | "about" | "vision" | "contact"
export type StaticSection = Base & { kind: StaticKind }
export type ProjectSection = Base & {
  kind: "projects"
  facet: Facet
  value: string
  /** Chosen projects, in display order. The first one is the hero of the first slide. */
  projectIds: string[]
  captions: CaptionField[]
}
export type ServicesSection = Base & { kind: "services"; ids: string[] }
export type CompaniesSection = Base & { kind: "companies"; ids: string[]; display: "logos" | "chart" }
export type MapSection = Base & { kind: "map"; region: "india" | "world"; ids: string[] }
export type PickSection = ServicesSection | CompaniesSection | MapSection
export type Section = StaticSection | ProjectSection | PickSection

/** Most items one picked slide can hold before it stops reading as a slide. Logo walls have no cap: they flow onto more slides. */
export const PICK_LIMIT = { services: 12, logos: Infinity, chart: 10, map: 40 } as const
export const pickLimit = (s: PickSection) => (s.kind === "companies" ? PICK_LIMIT[s.display] : PICK_LIMIT[s.kind])

export function matches(p: ProfileProject, facet: Facet, value: string) {
  return facet === "tag" ? p.tags.includes(value) : p[facet] === value
}

/** Every value of a facet with its project count, most projects first. */
export function facetValues(projects: ProfileProject[], facet: Facet) {
  return countBy(projects.flatMap((p) => (facet === "tag" ? p.tags : p[facet] ? [p[facet] as string] : [])))
}

export function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Default pick for a new section: the largest projects that have a Gallery cover. */
export function autoPick(projects: ProfileProject[], facet: Facet, value: string, n: number) {
  return projects
    .filter((p) => p.cover && matches(p, facet, value))
    .sort((a, b) => (b.areaSqft ?? 0) - (a.areaSqft ?? 0))
    .slice(0, n)
    .map((p) => p.id)
}

/** Projects a company took part in, as client or as architect. */
export const projectsOf = (projects: ProfileProject[], company: string) => projects.filter((p) => p.client === company || p.architect === company).length

/** Partners with two or more projects, most first: the brochure's "Repeated-Project" laurels. */
export function repeatPartners(projects: ProfileProject[], key: "client" | "architect") {
  return countBy(projects.flatMap((p) => (p[key] ? [p[key] as string] : []))).filter((r) => r.count > 1)
}

export type Place = { id: string; name: string; lat: number; lng: number; count: number }

/** Map pins: Indian cities, or countries worldwide, each at the mean of its projects' coordinates. */
export function places(projects: ProfileProject[], region: "india" | "world"): Place[] {
  const groups = new Map<string, Array<{ lat: number; lng: number }>>()
  for (const { city, country, lat, lng } of projects) {
    if (region === "india" && country !== "India") continue
    const key = region === "india" ? city : country
    if (!key || lat === null || lng === null) continue
    groups.set(key, [...(groups.get(key) ?? []), { lat, lng }])
  }
  return [...groups]
    .map(([name, ps]) => ({
      id: name,
      name,
      lat: ps.reduce((s, p) => s + p.lat, 0) / ps.length,
      lng: ps.reduce((s, p) => s + p.lng, 0) / ps.length,
      count: ps.length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** As few slides of at most `max` as possible, filled evenly (larger first): 10 → 5 + 5, 19 → 7 + 6 + 6. */
export function spread<T>(items: T[], max: number): T[][] {
  const k = Math.ceil(items.length / max)
  const out: T[][] = []
  for (let i = 0, start = 0; i < k; i++) {
    const n = Math.ceil((items.length - start) / (k - i))
    out.push(items.slice(start, start + n))
    start += n
  }
  return out
}

export type Group<T> = { name: string; items: T[] }

/** Plate rows a group label costs. */
const LABEL_ROWS = 0.5

/**
 * Logo-wall pagination. Groups sit side by side on a shelf while their widths (min(n, cols) plates) fit
 * the row; a shelf is as tall as its tallest group; a page holds `rows` plate rows, labels included.
 * A group taller than the room left is split and continues on the next page. Returns page → shelf → group.
 */
export function paginateGroups<T>(groups: Group<T>[], cols: number, rows: number): Group<T>[][][] {
  const pages: Group<T>[][][] = [[]]
  const queue = [...groups]
  let used = 0
  let shelf: Group<T>[] = []
  let width = 0
  let height = 0
  const close = () => {
    if (shelf.length) {
      pages[pages.length - 1].push(shelf)
      used += height + LABEL_ROWS
    }
    shelf = []
    width = 0
    height = 0
  }
  while (queue.length) {
    const g = queue[0]
    const w = Math.min(g.items.length, cols)
    const h = Math.ceil(g.items.length / cols)
    if (width + w > cols) close()
    const room = Math.floor(rows - used - LABEL_ROWS)
    if (Math.max(height, h) <= room) {
      shelf.push(g)
      width += w
      height = Math.max(height, h)
      queue.shift()
    } else if (shelf.length) close()
    else {
      if (room > 0) {
        shelf.push({ name: g.name, items: g.items.slice(0, room * cols) })
        height = room
        queue[0] = { name: g.name, items: g.items.slice(room * cols) }
        close()
      }
      pages.push([])
      used = 0
    }
  }
  close()
  return pages
}

/** Area the way the industry quotes it: lakh sq ft from 1,00,000 up, plain sq ft below. */
export function formatArea(sqft: number) {
  if (sqft >= 100000) return `${+(sqft / 100000).toFixed(2)} L sq ft`
  return `${new Intl.NumberFormat("en-IN").format(sqft)} sq ft`
}

/** "650" → "650+", the way profile numbers are quoted: rounded down to a tidy figure. */
export const plus = (n: number) => `${n >= 100 ? Math.floor(n / 50) * 50 : n >= 20 ? Math.floor(n / 5) * 5 : n}+`

export const initialsOf = (name: string) =>
  name
    .split(/[\s&.,-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
