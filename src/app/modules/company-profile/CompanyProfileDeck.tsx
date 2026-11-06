import { useRef, useState } from "react"
import { toast } from "sonner"
import { Building2, Download, Images, Presentation } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { DeckStage } from "./DeckStage"
import { ItemPicker, type PickItem } from "./ItemPicker"
import { ProfileSlide } from "./ProfileSlide"
import { ProjectPicker } from "./ProjectPicker"
import { SectionList } from "./SectionList"
import { MAX_PER_SLIDE, MAX_SLIDES, autoPick, facetValues, places, plural, projectsOf, type CompaniesSection, type PickSection, type ProfileData, type Section } from "./profile"
import { projectSection, sectionMeta, sectionSlides, takenElsewhere, type EditableSection } from "./profileBuilder"
import { useProfileBuilder } from "./useProfileBuilder"


/** Picker rows for a fetched section, straight from the app's data. */
function itemsFor(s: PickSection, data: ProfileData): { heading: string; items: PickItem[] } {
  if (s.kind === "services") return { heading: "Choose services (CRM)", items: data.services.map((x) => ({ id: x.id, label: x.name, sub: plural(x.projects, "project") })) }
  if (s.kind === "companies")
    return {
      heading: "Choose companies",
      items: data.companies
        .map((c) => ({ id: c.id, label: c.name, sub: plural(projectsOf(data.projects, c.name), "project"), image: c.logo, group: c.types[0] }))
        .sort((a, b) => parseInt(b.sub) - parseInt(a.sub)),
    }
  return {
    heading: s.region === "india" ? "Choose cities to pin on the India map" : "Choose countries to pin on the world map",
    items: places(data.projects, s.region).map((p) => ({ id: p.id, label: p.name, sub: plural(p.count, "project") })),
  }
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
 * Company Profile builder (prototype: demo data, local state only). The same builder, section list, stage and
 * slides as CRM → Company Profile; this screen adds the sections the CRM does not have yet (maps, repeat chart,
 * contact) and "Add" buttons. At most MAX_SLIDES are shown; the rest stay listed, hidden.
 */
export function CompanyProfileDeck({
  data,
  initialSections,
  initialSlideId,
}: {
  data: ProfileData
  initialSections: Section[]
  /** Open on this slide (a section id, or `<section id>-<n>` for one of several). */
  initialSlideId?: string
}) {
  const b = useProfileBuilder(data, initialSections, (m) => toast.error(m), initialSlideId)
  const [editing, setEditing] = useState<EditableSection | null>(null)
  const stage = useRef<HTMLElement>(null)
  const full = b.slides.length >= MAX_SLIDES
  const save = (s: Section) => b.save(s) && setEditing(null)
  const newProjects = () => {
    const taken = takenElsewhere(b.sections, "")
    const free = data.projects.filter((p) => !taken.has(p.id))
    const value = facetValues(free, "tag")[0]?.name ?? ""
    setEditing(projectSection(crypto.randomUUID(), "tag", value, autoPick(free, "tag", value, MAX_PER_SLIDE)))
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Company Showcase</h2>
          <p className="text-sm text-muted-foreground">
            From {data.projects.length} projects, {data.companies.length} companies and {data.services.length} CRM services · {b.generated} slides generated
          </p>
        </div>
        <Badge variant={full ? "warning" : "neutral"} data-testid="slide-budget">
          {b.slides.length} of {MAX_SLIDES} slides selected
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

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside aria-label="Sections" className="order-2 flex flex-col gap-3 border-t border-border p-3 lg:order-1 lg:border-t-0 lg:border-r">
          <p className="text-sm font-semibold">Sections</p>
          <SectionList
            sections={b.sections}
            slidesOf={(s) => sectionSlides(s, data)}
            metaOf={(s) => sectionMeta(s, data)}
            onReorder={b.reorder}
            onOpen={b.open}
            onEdit={setEditing}
            onToggle={b.toggle}
            onToggleSlide={b.toggleSlide}
            onReorderSlides={b.reorderSlides}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={full} onClick={newProjects}>
              <Images data-icon="inline-start" />
              Add projects
            </Button>
            <Button variant="outline" size="sm" disabled={full} onClick={() => setEditing(newCompanies(data))}>
              <Building2 data-icon="inline-start" />
              Add logos
            </Button>
          </div>
          {full && <p className="text-xs text-muted-foreground">The presentation is at {MAX_SLIDES} slides. Hide a slide to show another.</p>}
        </aside>

        <main className="order-1 flex min-w-0 flex-col items-center gap-4 p-4 lg:order-2 md:p-6">
          <DeckStage slides={b.slides} current={b.current} onGo={b.go} render={(spec) => <ProfileSlide spec={spec} data={data} />} stageRef={stage} />
        </main>
      </div>

      {editing?.kind === "projects" && (
        <ProjectPicker projects={data.projects} section={editing} taken={takenElsewhere(b.sections, editing.id)} budget={b.budgetFor(editing)} onSave={save} onClose={() => setEditing(null)} />
      )}
      {editing && editing.kind !== "projects" && <ItemPicker {...itemsFor(editing, data)} section={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}
