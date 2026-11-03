import { useState } from "react"
import { ImageOff, Search } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ds/ui/dialog"
import { Input } from "@/ds/ui/input"
import {
  CAPTION_FIELDS,
  FACETS,
  PER_SLIDE,
  autoPick,
  facetValues,
  formatArea,
  matches,
  type Facet,
  type ProfileProject,
  type ProjectSection,
} from "./profile"

/** Toggle chip: the one pattern for every on/off choice in the builder. */
export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Button size="xs" variant={on ? "secondary" : "ghost"} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}

/**
 * Choose which projects a section shows, out of every project the company has. The section is a
 * facet (typology / tag / city / client / architect) plus a value; selection order is display
 * order, and #1 is the hero. Only projects with a Gallery cover can be picked.
 */
export function ProjectPicker({
  projects,
  section,
  onSave,
  onClose,
  budget,
}: {
  projects: ProfileProject[]
  section: ProjectSection
  onSave: (s: ProjectSection) => void
  onClose: () => void
  /** Slides this section may use without the deck passing MAX_SLIDES. */
  budget: number
}) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const [coverOnly, setCoverOnly] = useState(true)
  const set = (patch: Partial<ProjectSection>) => setDraft((d) => ({ ...d, ...patch }))

  const values = facetValues(projects, draft.facet)
  const pickValue = (facet: Facet, value: string) => set({ facet, value, title: value, projectIds: autoPick(projects, facet, value, draft.perSlide) })
  const inSection = projects.filter((p) => matches(p, draft.facet, draft.value))
  const withCover = inSection.filter((p) => p.cover).length
  const q = query.trim().toLowerCase()
  const shown = inSection.filter((p) => (!coverOnly || p.cover) && (!q || `${p.name} ${p.city} ${p.client ?? ""} ${p.architect ?? ""}`.toLowerCase().includes(q)))
  const toggle = (id: string) =>
    set({ projectIds: draft.projectIds.includes(id) ? draft.projectIds.filter((x) => x !== id) : [...draft.projectIds, id] })
  const slides = Math.ceil(draft.projectIds.length / draft.perSlide)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Choose projects</DialogTitle>
          <DialogDescription>
            {inSection.length} projects in “{draft.value}”, {withCover} with a Gallery cover. Selection order is slide order; #1 is the hero.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Group projects by">
            <span className="mr-1 w-20 text-sm font-semibold">Group by</span>
            {FACETS.map((f) => (
              <Chip key={f.id} on={draft.facet === f.id} onClick={() => pickValue(f.id, facetValues(projects, f.id)[0]?.name ?? "")}>
                {f.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${FACETS.find((f) => f.id === draft.facet)?.label} to show`}>
            <span className="mr-1 w-20 text-sm font-semibold">Show</span>
            {values.slice(0, 14).map((v) => (
              <Chip key={v.name} on={draft.value === v.name} onClick={() => pickValue(draft.facet, v.name)}>
                {v.name}
                <Badge variant="neutral">{v.count}</Badge>
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="section-title" className="w-20 text-sm font-semibold">
              Slide title
            </label>
            <Input id="section-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} className="h-8 max-w-64 min-w-40 flex-1" />
            <div className="relative ml-auto min-w-48 flex-1 sm:max-w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Search projects" placeholder="Search name, city, client" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8" />
            </div>
            <Chip on={coverOnly} onClick={() => setCoverOnly((c) => !c)}>
              With cover only
            </Chip>
          </div>
        </div>

        <ul className="grid min-h-48 grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] content-start gap-3 overflow-y-auto pr-1">
          {shown.map((p) => {
            const pos = draft.projectIds.indexOf(p.id) + 1
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={pos > 0}
                  disabled={!p.cover}
                  onClick={() => toggle(p.id)}
                  className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary"
                >
                  {p.cover ? (
                    <img src={p.cover} alt="" className="aspect-4/3 w-full object-cover" />
                  ) : (
                    <span className="grid aspect-4/3 w-full place-items-center gap-1 bg-muted text-xs text-muted-foreground">
                      <ImageOff className="size-5" aria-hidden />
                      No Gallery cover
                    </span>
                  )}
                  {pos > 0 && (
                    <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{pos}</span>
                  )}
                  <span className="block p-2">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.city}
                      {p.areaSqft ? ` · ${formatArea(p.areaSqft)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
          {!shown.length && <li className="col-span-full py-10 text-center text-sm text-muted-foreground">No projects match.</li>}
        </ul>

        <DialogFooter className="flex-wrap items-center gap-3 sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5" role="group" aria-label="Projects per slide">
              <span className="text-sm font-semibold">Per slide</span>
              {PER_SLIDE.map((n) => (
                <Chip key={n} on={draft.perSlide === n} onClick={() => set({ perSlide: n })}>
                  {n}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Caption shows">
              <span className="ml-2 text-sm font-semibold">Caption</span>
              {CAPTION_FIELDS.map((c) => (
                <Chip
                  key={c.id}
                  on={draft.captions.includes(c.id)}
                  onClick={() => set({ captions: draft.captions.includes(c.id) ? draft.captions.filter((x) => x !== c.id) : [...draft.captions, c.id] })}
                >
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="picker-summary">
              {draft.projectIds.length} selected · {slides} {slides === 1 ? "slide" : "slides"}
              {slides > budget ? ` · only ${budget} left in the deck` : ""}
            </span>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(draft)} disabled={!draft.projectIds.length || !draft.title.trim() || slides > budget}>
              Save section
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
