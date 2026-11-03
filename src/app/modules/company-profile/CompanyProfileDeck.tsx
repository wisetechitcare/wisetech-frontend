import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { Building2, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Images, Pencil, Presentation, Trash2 } from "lucide-react"
import ReorderableGroup, { DragHandle } from "@app/modules/common/components/ReorderableGroup"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { ItemPicker, type PickItem } from "./ItemPicker"
import { ProjectPicker } from "./ProjectPicker"
import {
  MAX_SLIDES,
  autoPick,
  chunk,
  facetValues,
  matches,
  places,
  projectsOf,
  repeatPartners,
  slideCount,
  type CompaniesSection,
  type PickSection,
  type ProfileData,
  type ProfileProject,
  type ProjectSection,
  type Section,
  type StaticKind,
} from "./profile"
import { AboutSlide, CompaniesSlide, ContactSlide, CoverSlide, MapSlide, ProjectsSlide, ScopeSlide, ServicesSlide, VisionSlide } from "./slides"

type Slide = { id: string; sectionId: string; title: string; node: ReactNode }

const STATIC: Record<StaticKind, (d: ProfileData) => ReactNode> = {
  cover: (d) => <CoverSlide data={d} />,
  about: (d) => <AboutSlide data={d} />,
  vision: (d) => <VisionSlide data={d} />,
  scope: (d) => <ScopeSlide data={d} />,
  contact: (d) => <ContactSlide data={d} />,
}

const projectsLabel = (n: number) => `${n} ${n === 1 ? "project" : "projects"}`

const pick = <T extends { id: string }>(all: T[], ids: string[]) => ids.flatMap((id) => all.filter((x) => x.id === id))

function slidesOf(sections: Section[], data: ProfileData): Slide[] {
  const { projects } = data
  return sections
    .filter((s) => s.enabled)
    .flatMap((s): Slide[] => {
      const one = (node: ReactNode): Slide[] => [{ id: s.id, sectionId: s.id, title: s.title, node }]
      switch (s.kind) {
        case "projects": {
          const all = projects.filter((p) => matches(p, s.facet, s.value))
          const picked = pick(projects, s.projectIds).filter((p) => p.cover)
          const parts = chunk(picked, s.perSlide)
          const repeat = repeatPartners(all, "client")[0]
          return parts.map((items, i) => ({
            id: `${s.id}-${i + 1}`,
            sectionId: s.id,
            title: parts.length > 1 ? `${s.title} ${i + 1}` : s.title,
            node: <ProjectsSlide title={s.title} items={items} total={all.length} part={i + 1} parts={parts.length} perSlide={s.perSlide} captions={s.captions} repeat={repeat} />,
          }))
        }
        case "services":
          return one(<ServicesSlide title={s.title} services={pick(data.services, s.ids)} />)
        case "companies":
          return one(<CompaniesSlide title={s.title} companies={pick(data.companies, s.ids)} display={s.display} projects={projects} />)
        case "map": {
          const pins = pick(places(projects, s.region), s.ids)
          return one(<MapSlide title={s.title} region={s.region} pins={pins} projects={pins.reduce((n, p) => n + p.count, 0)} />)
        }
        default:
          return one(STATIC[s.kind](data))
      }
    })
}

/** Picker rows for a fetched section, straight from the app's data. */
function itemsFor(s: PickSection, data: ProfileData): { heading: string; items: PickItem[] } {
  if (s.kind === "services") return { heading: "Choose services (CRM)", items: data.services.map((x) => ({ id: x.id, label: x.name, sub: projectsLabel(x.projects) })) }
  if (s.kind === "companies")
    return {
      heading: "Choose companies",
      items: data.companies
        .map((c) => ({ id: c.id, label: c.name, sub: projectsLabel(projectsOf(data.projects, c.name)), image: c.logo, group: c.types[0] }))
        .sort((a, b) => parseInt(b.sub) - parseInt(a.sub)),
    }
  return {
    heading: s.region === "india" ? "Choose cities to pin on the India map" : "Choose countries to pin on the world map",
    items: places(data.projects, s.region).map((p) => ({ id: p.id, label: p.name, sub: projectsLabel(p.count) })),
  }
}

function newProjects(projects: ProfileProject[]): ProjectSection {
  const value = facetValues(projects, "tag")[0]?.name ?? ""
  return { id: crypto.randomUUID(), kind: "projects", title: value, enabled: true, facet: "tag", value, projectIds: autoPick(projects, "tag", value, 5), perSlide: 5, captions: ["architect", "client", "area", "metric"] }
}

function newCompanies(data: ProfileData): CompaniesSection {
  const ids = data.companies
    .filter((c) => c.logo)
    .sort((a, b) => projectsOf(data.projects, b.name) - projectsOf(data.projects, a.name))
    .slice(0, 12)
    .map((c) => c.id)
  return { id: crypto.randomUUID(), kind: "companies", title: "Clients", enabled: true, ids, display: "logos" }
}

/**
 * Company Profile builder (prototype: demo data, local state only). Hardcoded slides hold the
 * company's own copy; every other slide is fetched from the app and shows only what was picked.
 * The deck is capped at MAX_SLIDES.
 */
export function CompanyProfileDeck({
  data,
  initialSections,
  initialSlideId,
}: {
  data: ProfileData
  initialSections: Section[]
  /** Open on this slide (a section id, or `<section id>-<n>` for a project slide). */
  initialSlideId?: string
}) {
  const [sections, setSections] = useState(initialSections)
  const [editing, setEditing] = useState<ProjectSection | PickSection | null>(null)
  const slides = slidesOf(sections, data)
  const [index, setIndex] = useState(() => Math.max(0, slides.findIndex((s) => s.id === initialSlideId)))
  const current = Math.min(index, Math.max(0, slides.length - 1))
  const stage = useRef<HTMLElement>(null)
  const used = (except?: string) => sections.reduce((n, s) => n + (s.id === except ? 0 : slideCount(s)), 0)
  const full = slides.length >= MAX_SLIDES

  const go = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)))
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, " ": 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[e.key]
    if (step) go(current + step)
    else if (e.key === "Home") go(0)
    else if (e.key === "End") go(slides.length - 1)
    else return
    e.preventDefault()
  }
  const toggle = (s: Section) => {
    if (!s.enabled && used(s.id) + slideCount({ ...s, enabled: true }) > MAX_SLIDES) {
      toast.error(`The deck is capped at ${MAX_SLIDES} slides. Hide a section first.`)
      return
    }
    setSections((all) => all.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))
  }
  const move = (i: number, dir: -1 | 1) =>
    setSections((all) => {
      const j = i + dir
      if (j < 0 || j >= all.length) return all
      const next = [...all]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const save = (s: Section) => {
    const exists = sections.some((x) => x.id === s.id)
    // New sections go before the maps and contact slide, which close the deck.
    const at = sections.findIndex((x) => x.kind === "map" || x.kind === "contact")
    const next = exists ? sections.map((x) => (x.id === s.id ? s : x)) : at < 0 ? [...sections, s] : [...sections.slice(0, at), s, ...sections.slice(at)]
    setSections(next)
    setEditing(null)
    go(slidesOf(next, data).findIndex((x) => x.sectionId === s.id))
  }
  const meta = (s: Section) => {
    switch (s.kind) {
      case "projects": {
        const n = Math.ceil(s.projectIds.length / s.perSlide)
        return `${s.projectIds.length} projects · ${n} ${n === 1 ? "slide" : "slides"}`
      }
      case "services":
        return `${s.ids.length} services · CRM`
      case "companies":
        return `${s.ids.length} companies · ${s.display === "logos" ? "logo wall" : "repeat chart"}`
      case "map":
        return `${s.ids.length} ${s.region === "india" ? "cities" : "countries"} · map`
      default:
        return "Fixed content"
    }
  }
  const slide = slides[current]

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Company Profile</h2>
          <p className="text-sm text-muted-foreground">
            From {data.projects.length} projects, {data.companies.length} companies and {data.services.length} CRM services
          </p>
        </div>
        <Badge variant={full ? "warning" : "neutral"} data-testid="slide-budget">
          {slides.length} of {MAX_SLIDES} slides
        </Badge>
        <Button variant="outline" onClick={() => toast("Prototype: the real export prints these slides to a 16:9 PDF on the server (Puppeteer).")}>
          <Download data-icon="inline-start" />
          Export PDF
        </Button>
        <Button onClick={() => stage.current?.requestFullscreen?.().then(() => stage.current?.focus())}>
          <Presentation data-icon="inline-start" />
          Present
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside aria-label="Sections" className="order-2 flex flex-col gap-3 border-t border-border p-3 lg:order-1 lg:border-t-0 lg:border-r">
          <p className="text-sm font-semibold">Sections</p>
          <ReorderableGroup
            items={sections}
            getItemId={(s) => s.id}
            onReorder={setSections}
            axis="y"
            withHandle
            className="flex flex-col gap-1.5"
            renderItem={(s, handleProps) => {
              const i = sections.indexOf(s)
              const fetched = s.kind === "projects" || s.kind === "services" || s.kind === "companies" || s.kind === "map"
              return (
                <div className="group/row flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 pr-2.5 data-off:border-dashed" data-off={s.enabled ? undefined : ""}>
                  <DragHandle handleProps={handleProps} onNudge={(d) => move(i, d)} title={`Drag to reorder ${s.title}`} />
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => s.enabled && go(slides.findIndex((x) => x.sectionId === s.id))}
                  >
                    <span className="block truncate text-sm font-semibold group-data-off/row:text-muted-foreground group-data-off/row:line-through">{s.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{meta(s)}</span>
                  </button>
                  {fetched && (
                    <Button size="icon-xs" variant="ghost" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}>
                      <Pencil />
                    </Button>
                  )}
                  {(s.kind === "projects" || s.kind === "companies") && (
                    <Button size="icon-xs" variant="ghost" aria-label={`Remove ${s.title}`} onClick={() => setSections((all) => all.filter((x) => x.id !== s.id))}>
                      <Trash2 />
                    </Button>
                  )}
                  <Button size="icon-xs" variant="ghost" aria-pressed={s.enabled} aria-label={`Include ${s.title}`} onClick={() => toggle(s)}>
                    {s.enabled ? <Eye /> : <EyeOff />}
                  </Button>
                </div>
              )
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={full} onClick={() => setEditing(newProjects(data.projects))}>
              <Images data-icon="inline-start" />
              Add projects
            </Button>
            <Button variant="outline" size="sm" disabled={full} onClick={() => setEditing(newCompanies(data))}>
              <Building2 data-icon="inline-start" />
              Add logos
            </Button>
          </div>
          {full && <p className="text-xs text-muted-foreground">The deck is at {MAX_SLIDES} slides. Hide a section to add another.</p>}
        </aside>

        <main className="order-1 flex min-w-0 flex-col items-center gap-4 p-4 lg:order-2 md:p-6">
          <section
            ref={stage}
            tabIndex={0}
            onKeyDown={onKey}
            aria-roledescription="slide"
            aria-label={slide ? `${current + 1} of ${slides.length}: ${slide.title}` : "No slides"}
            className="w-full max-w-5xl rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring [&:fullscreen]:flex [&:fullscreen]:max-w-none [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:rounded-none [&:fullscreen]:bg-black [&:fullscreen>div]:w-[min(100vw,177.78vh)]"
          >
            <div>{slide?.node ?? <p className="py-20 text-center text-muted-foreground">Switch on a section to start the deck.</p>}</div>
          </section>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Previous slide" disabled={current === 0} onClick={() => go(current - 1)}>
              <ChevronLeft />
            </Button>
            <span className="min-w-20 text-center text-sm tabular-nums" data-testid="slide-counter">
              {slides.length ? current + 1 : 0} / {slides.length}
            </span>
            <Button variant="outline" size="icon" aria-label="Next slide" disabled={current >= slides.length - 1} onClick={() => go(current + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <nav aria-label="Slides" className="w-full max-w-5xl overflow-x-auto pb-2">
            <ol className="flex gap-3">
              {slides.map((s, i) => (
                <li key={s.id} className="w-36 shrink-0">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === current ? "true" : undefined}
                    className="group w-full rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-accent"
                  >
                    <div aria-hidden inert className="pointer-events-none">
                      {s.node}
                    </div>
                    <span className="mt-1 block truncate text-xs text-muted-foreground group-aria-[current]:font-semibold group-aria-[current]:text-accent-foreground">
                      {i + 1}. {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </main>
      </div>

      {editing?.kind === "projects" && <ProjectPicker projects={data.projects} section={editing} budget={MAX_SLIDES - used(editing.id)} onSave={save} onClose={() => setEditing(null)} />}
      {editing && editing.kind !== "projects" && <ItemPicker {...itemsFor(editing, data)} section={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}
