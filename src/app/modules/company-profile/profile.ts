/**
 * Company Profile: data contract and pure logic. `GET /company-profile` returns `ProfileData`; the
 * static slides (cover, about, who we are, scope, contact) are hardcoded copy in `org`, everything else
 * is fetched from the app and shown only as the user picked it.
 */

/** One project (= a Lead past its project trigger), flattened for the profile. */
export type ProfileProject = {
  id: string
  name: string
  city: string
  country: string
  /** AdditionalDetails.latitude / longitude, for the map pins. */
  lat: number
  lng: number
  /** ProjectCategory name. */
  typology: string
  /** Cross-cutting showcase tags: High-rise, Heritage, Green Building, MOEF / CRZ, Government, International… */
  tags: string[]
  /** Client company name (Lead.company). */
  client?: string
  /** Architect company name (ProjectExternalTeam, company type Architect). */
  architect?: string
  /** Built-up area in sq ft. */
  areaSqft?: number
  /** Size line from project points: "40 floors · 140 m", "150 beds", "85 rooms", "31 acres · 4,000 flats". */
  metric?: string
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
  initials: string
  tagline: string
  edition: string
  about: string[]
  foundedIn: number
  vision: string
  mission: string
  values: Array<{ label: string; text: string }>
  scope: string[]
  address: string
  phone: string
  website: string
  hero: string
}

export type ProfileData = {
  org: OrgProfile
  /** Live counts over every project / company / employee, computed server-side. */
  totals: { projects: number; completed: number; clients: number; team: number }
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

export type CaptionField = "architect" | "client" | "area" | "metric"
export const CAPTION_FIELDS: Array<{ id: CaptionField; label: string }> = [
  { id: "architect", label: "Architect" },
  { id: "client", label: "Client" },
  { id: "area", label: "Area" },
  { id: "metric", label: "Size" },
]

/** Projects per slide; the layout is one hero plus (n - 1) tiles in two rows. */
export const PER_SLIDE = [3, 5, 7] as const
export type PerSlide = (typeof PER_SLIDE)[number]

type Base = { id: string; title: string; enabled: boolean }
export type StaticKind = "cover" | "about" | "vision" | "scope" | "contact"
export type StaticSection = Base & { kind: StaticKind }
export type ProjectSection = Base & {
  kind: "projects"
  facet: Facet
  value: string
  /** Chosen projects, in display order. The first one is the hero of the first slide. */
  projectIds: string[]
  perSlide: PerSlide
  captions: CaptionField[]
}
export type ServicesSection = Base & { kind: "services"; ids: string[] }
export type CompaniesSection = Base & { kind: "companies"; ids: string[]; display: "logos" | "chart" }
export type MapSection = Base & { kind: "map"; region: "india" | "world"; ids: string[] }
export type PickSection = ServicesSection | CompaniesSection | MapSection
export type Section = StaticSection | ProjectSection | PickSection

/** Most items one picked slide can hold before it stops reading as a slide. */
export const PICK_LIMIT = { services: 12, logos: 24, chart: 10, map: 40 } as const
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
  const groups = new Map<string, ProfileProject[]>()
  for (const p of projects) {
    if (region === "india" && p.country !== "India") continue
    const key = region === "india" ? p.city : p.country
    groups.set(key, [...(groups.get(key) ?? []), p])
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

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** How many slides a section contributes when switched on. */
export const slideCount = (s: Section) => (!s.enabled ? 0 : s.kind === "projects" ? Math.ceil(s.projectIds.length / s.perSlide) : 1)

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
