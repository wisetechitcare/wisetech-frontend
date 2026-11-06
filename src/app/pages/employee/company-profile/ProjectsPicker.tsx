import { useState } from "react"
import { ImageOff } from "lucide-react"
import { ProjectSlidesEditor, useSlideTarget } from "@app/modules/company-profile/ProjectSlidesEditor"
import { MAX_PER_SLIDE, formatArea, matches, type ProfileProject, type ProjectSection } from "@app/modules/company-profile/profile"
import { ProjectStatusBadge } from "@app/modules/company-profile/slides"
import { PickTile, PickerDialog } from "./PickerDialog"

/**
 * Choose a project section's projects (e.g. every High-rise project) and the slide each sits on; a slide's
 * first project is its hero. Only projects with a Gallery cover can be picked, never one already on another
 * section, and the section may not show more slides than the presentation has room for.
 */
export function ProjectsPicker({
  section,
  projects,
  taken,
  budget,
  onSave,
  onClose,
}: {
  section: ProjectSection
  projects: ProfileProject[]
  /** Projects on other sections, id → section title. */
  taken: Map<string, string>
  /** Slides this section may show without the presentation passing its limit. */
  budget: number
  onSave: (s: ProjectSection) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const slideTarget = useSlideTarget(draft.slides)
  const setSlides = (slides: ProjectSection["slides"]) => setDraft((d) => ({ ...d, slides }))
  const inSection = projects.filter((p) => matches(p, draft.facet, draft.value))
  const q = query.trim().toLowerCase()
  const shown = inSection.filter((p) => !q || `${p.name} ${p.city} ${p.client ?? ""} ${p.architect ?? ""}`.toLowerCase().includes(q))
  const ids = draft.slides.flatMap((s) => s.ids)
  const slides = draft.slides.filter((s) => !draft.hidden?.includes(s.key)).length
  const over = slides > budget

  return (
    <PickerDialog
      heading="Choose projects"
      subtitle={`${inSection.length} projects in “${draft.value}”, ${inSection.filter((p) => p.cover).length} with a Gallery cover. Picks join the slide marked “Add here”; each slide shows up to ${MAX_PER_SLIDE}.`}
      title={draft.title}
      onTitle={(title) => setDraft((d) => ({ ...d, title }))}
      query={query}
      onQuery={setQuery}
      order={<ProjectSlidesEditor slides={draft.slides} projects={projects} target={slideTarget.target} onTarget={slideTarget.setTarget} onChange={setSlides} />}
      summary={`${ids.length} selected · ${slides} ${slides === 1 ? "slide" : "slides"}${over ? ` · only ${budget} left in the presentation` : ""}`}
      canSave={ids.length > 0 && !over && !!draft.title.trim()}
      onSave={() => onSave(draft)}
      onClose={onClose}
    >
      {shown.map((p) => {
        const elsewhere = taken.get(p.id)
        return (
          <li key={p.id}>
            <PickTile pos={ids.indexOf(p.id) + 1} disabled={!p.cover || !!elsewhere} onToggle={() => setSlides(slideTarget.toggle(p.id))}>
              {p.cover ? (
                <img src={p.cover} alt="" className="aspect-4/3 w-full object-cover" />
              ) : (
                <span className="grid aspect-4/3 w-full place-items-center gap-1 bg-muted text-sm text-muted-foreground">
                  <ImageOff className="size-5" aria-hidden />
                  No Gallery cover
                </span>
              )}
              {p.status && <ProjectStatusBadge status={p.status} className="absolute top-1.5 left-1.5" />}
              <span className="block p-2">
                <span className="block truncate text-base font-semibold">{p.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {elsewhere ? `On ${elsewhere}` : `${p.city}${p.areaSqft ? ` · ${formatArea(p.areaSqft)}` : ""}`}
                </span>
              </span>
            </PickTile>
          </li>
        )
      })}
      {!shown.length && <li className="col-span-full py-10 text-center text-base text-muted-foreground">No projects match.</li>}
    </PickerDialog>
  )
}
