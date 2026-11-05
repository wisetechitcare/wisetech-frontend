import { useState } from "react"
import { PICK_LIMIT, type ProfileService, type ServicesSection } from "@app/modules/company-profile/profile"
import { PickTile, PickerDialog } from "./PickerDialog"
import { pick, toggleIn } from "./profileBuilder"

/** Choose which CRM services the Services slide shows, and in what order (up to PICK_LIMIT.services). */
export function ServicesPicker({ section, services, onSave, onClose }: { section: ServicesSection; services: ProfileService[]; onSave: (s: ServicesSection) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const max = PICK_LIMIT.services
  const q = query.trim().toLowerCase()
  const shown = services.filter((x) => !q || x.name.toLowerCase().includes(q))
  const full = draft.ids.length >= max

  return (
    <PickerDialog
      heading="Choose services"
      subtitle={`${services.length} CRM services. Pick up to ${max}; the selected order is the slide order.`}
      title={draft.title}
      onTitle={(title) => setDraft((d) => ({ ...d, title }))}
      query={query}
      onQuery={setQuery}
      selected={pick(services, draft.ids).map((x) => ({ id: x.id, label: x.name }))}
      onSelected={(ids) => setDraft((d) => ({ ...d, ids }))}
      summary={`${draft.ids.length} of ${max} selected`}
      canSave={draft.ids.length > 0 && !!draft.title.trim()}
      onSave={() => onSave(draft)}
      onClose={onClose}
    >
      {shown.map((x) => {
        const pos = draft.ids.indexOf(x.id) + 1
        return (
          <li key={x.id}>
            <PickTile pos={pos} disabled={!pos && full} onToggle={() => setDraft((d) => ({ ...d, ids: toggleIn(d.ids, x.id) }))}>
              <span className="block p-2.5 pr-9">
                <span className="block truncate text-base font-semibold">{x.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{x.projects} projects</span>
              </span>
            </PickTile>
          </li>
        )
      })}
      {!shown.length && <li className="col-span-full py-10 text-center text-base text-muted-foreground">Nothing matches.</li>}
    </PickerDialog>
  )
}
