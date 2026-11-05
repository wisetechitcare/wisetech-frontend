import { useState } from "react"
import { ImageOff } from "lucide-react"
import { MAX_PER_SLIDE, MIN_PROJECTS, formatArea, matches, type ProfileProject, type ProjectSection } from "@app/modules/company-profile/profile"
import { PickTile, PickerDialog } from "./PickerDialog"
import { pick, projectGroups, toggleIn } from "./profileBuilder"

/**
 * Choose a project section's projects (e.g. every High-rise project) and their order; #1 is the hero.
 * Only projects with a Gallery cover can be picked; at least MIN_PROJECTS, within the deck's slide budget.
 */
export function ProjectsPicker({
  section,
  projects,
  budget,
  onSave,
  onClose,
}: {
  section: ProjectSection
  projects: ProfileProject[]
  /** Slides this section may use without the deck passing its cap. */
  budget: number
  onSave: (s: ProjectSection) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const inSection = projects.filter((p) => matches(p, draft.facet, draft.value))
  const q = query.trim().toLowerCase()
  const shown = inSection.filter((p) => !q || `${p.name} ${p.city} ${p.client ?? ""} ${p.architect ?? ""}`.toLowerCase().includes(q))
  const picked = draft.projectIds.length
  const slides = projectGroups(draft, projects).length
  const few = picked < MIN_PROJECTS
  const over = !few && slides > budget

  return (
    <PickerDialog
      heading="Choose projects"
      subtitle={`${inSection.length} projects in “${draft.value}”, ${inSection.filter((p) => p.cover).length} with a Gallery cover. #1 is the hero; each slide shows up to ${MAX_PER_SLIDE}.`}
      title={draft.title}
      onTitle={(title) => setDraft((d) => ({ ...d, title }))}
      query={query}
      onQuery={setQuery}
      selected={pick(projects, draft.projectIds).map((p) => ({ id: p.id, label: p.name }))}
      onSelected={(projectIds) => setDraft((d) => ({ ...d, projectIds }))}
      summary={`${picked} selected · ${few ? `pick at least ${MIN_PROJECTS}` : `${slides} ${slides === 1 ? "slide" : "slides"}`}${over ? ` · only ${budget} left in the deck` : ""}`}
      canSave={!few && !over && !!draft.title.trim()}
      onSave={() => onSave(draft)}
      onClose={onClose}
    >
      {shown.map((p) => (
        <li key={p.id}>
          <PickTile pos={draft.projectIds.indexOf(p.id) + 1} disabled={!p.cover} onToggle={() => setDraft((d) => ({ ...d, projectIds: toggleIn(d.projectIds, p.id) }))}>
            {p.cover ? (
              <img src={p.cover} alt="" className="aspect-4/3 w-full object-cover" />
            ) : (
              <span className="grid aspect-4/3 w-full place-items-center gap-1 bg-muted text-sm text-muted-foreground">
                <ImageOff className="size-5" aria-hidden />
                No Gallery cover
              </span>
            )}
            <span className="block p-2">
              <span className="block truncate text-base font-semibold">{p.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {p.city}
                {p.areaSqft ? ` · ${formatArea(p.areaSqft)}` : ""}
              </span>
            </span>
          </PickTile>
        </li>
      ))}
      {!shown.length && <li className="col-span-full py-10 text-center text-base text-muted-foreground">No projects match.</li>}
    </PickerDialog>
  )
}
