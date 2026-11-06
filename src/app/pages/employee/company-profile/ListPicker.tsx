import { useState } from "react"
import { initialsOf, pickLimit, type CompaniesSection, type ServicesSection } from "@app/modules/company-profile/profile"
import { pick, toggleIn } from "@app/modules/company-profile/profileBuilder"
import { PickTile, PickerDialog, SelectedOrder } from "./PickerDialog"

export type ListItem = { id: string; label: string; sub: string; image?: string | null }

/**
 * Choose what a list slide shows and in what order: CRM services (up to PICK_LIMIT.services) or client logos
 * (no cap: the wall flows onto more slides, within the presentation's slide limit).
 */
export function ListPicker<S extends ServicesSection | CompaniesSection>({
  heading,
  section,
  items,
  onSave,
  onClose,
}: {
  heading: string
  section: S
  items: ListItem[]
  onSave: (s: S) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const max = pickLimit(draft)
  const capped = Number.isFinite(max)
  const q = query.trim().toLowerCase()
  const shown = items.filter((x) => !q || x.label.toLowerCase().includes(q))
  const full = draft.ids.length >= max
  const setIds = (ids: string[]) => setDraft((d) => ({ ...d, ids }))

  return (
    <PickerDialog
      heading={heading}
      subtitle={`${items.length} available. ${capped ? `Pick up to ${max}` : "Pick as many as you like: more slides are added as the wall fills"}; the selected order is the slide order.`}
      title={draft.title}
      onTitle={(title) => setDraft((d) => ({ ...d, title }))}
      query={query}
      onQuery={setQuery}
      order={<SelectedOrder items={pick(items, draft.ids)} onChange={setIds} />}
      summary={capped ? `${draft.ids.length} of ${max} selected` : `${draft.ids.length} selected`}
      canSave={draft.ids.length > 0 && !!draft.title.trim()}
      onSave={() => onSave(draft)}
      onClose={onClose}
    >
      {shown.map((x) => {
        const pos = draft.ids.indexOf(x.id) + 1
        return (
          <li key={x.id}>
            <PickTile pos={pos} disabled={!pos && full} onToggle={() => setIds(toggleIn(draft.ids, x.id))}>
              <span className="flex items-center gap-2 p-2.5 pr-9">
                {x.image !== undefined && (
                  // White plate: logos are drawn for a light background.
                  <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white p-1 text-sm font-bold text-slate-700">
                    {x.image ? <img src={x.image} alt="" className="max-h-full max-w-full object-contain" /> : initialsOf(x.label)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{x.label}</span>
                  <span className="block truncate text-sm text-muted-foreground">{x.sub}</span>
                </span>
              </span>
            </PickTile>
          </li>
        )
      })}
      {!shown.length && <li className="col-span-full py-10 text-center text-base text-muted-foreground">Nothing matches.</li>}
    </PickerDialog>
  )
}
