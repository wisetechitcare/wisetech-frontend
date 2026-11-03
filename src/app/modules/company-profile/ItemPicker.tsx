import { useState } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ds/ui/dialog"
import { Input } from "@/ds/ui/input"
import { Chip } from "./ProjectPicker"
import { countBy, initialsOf, pickLimit, type PickSection } from "./profile"

export type PickItem = { id: string; label: string; sub: string; image?: string | null; group?: string }

/**
 * Pick what a fetched slide shows: CRM services, companies (logo wall or repeat chart) or map
 * locations. Selection order is display order; each slide type has a cap so it never overflows.
 */
export function ItemPicker({
  heading,
  items,
  section,
  onSave,
  onClose,
}: {
  heading: string
  items: PickItem[]
  section: PickSection
  onSave: (s: PickSection) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(section)
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState<string | null>(null)
  const max = pickLimit(draft)
  const groups = countBy(items.flatMap((i) => (i.group ? [i.group] : [])))
  const q = query.trim().toLowerCase()
  const shown = items.filter((i) => (!group || i.group === group) && (!q || i.label.toLowerCase().includes(q)))
  const ids = draft.ids
  const full = ids.length >= max
  const toggle = (id: string) => setDraft((d) => ({ ...d, ids: d.ids.includes(id) ? d.ids.filter((x) => x !== id) : [...d.ids, id] }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>
            {items.length} available from the app. Pick up to {max}; selection order is slide order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="pick-title" className="w-20 text-sm font-semibold">
              Slide title
            </label>
            <Input id="pick-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="h-8 max-w-64 min-w-40 flex-1" />
            {draft.kind === "companies" && (
              <div className="flex items-center gap-1.5" role="group" aria-label="Show as">
                <span className="ml-2 text-sm font-semibold">Show as</span>
                {(
                  [
                    ["logos", "Logo wall"],
                    ["chart", "Repeat chart"],
                  ] as const
                ).map(([id, label]) => (
                  <Chip key={id} on={draft.display === id} onClick={() => setDraft((d) => (d.kind === "companies" ? { ...d, display: id, ids: d.ids.slice(0, pickLimit({ ...d, display: id })) } : d))}>
                    {label}
                  </Chip>
                ))}
              </div>
            )}
            <div className="relative ml-auto min-w-48 flex-1 sm:max-w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input aria-label="Search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-8" />
            </div>
          </div>
          {groups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by type">
              <span className="mr-1 w-20 text-sm font-semibold">Type</span>
              <Chip on={!group} onClick={() => setGroup(null)}>
                All
              </Chip>
              {groups.map((g) => (
                <Chip key={g.name} on={group === g.name} onClick={() => setGroup(g.name)}>
                  {g.name}
                  <Badge variant="neutral">{g.count}</Badge>
                </Chip>
              ))}
            </div>
          )}
        </div>

        <ul className="grid min-h-48 grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] content-start gap-2.5 overflow-y-auto pr-1">
          {shown.map((i) => {
            const pos = ids.indexOf(i.id) + 1
            return (
              <li key={i.id}>
                <button
                  type="button"
                  aria-pressed={pos > 0}
                  disabled={!pos && full}
                  onClick={() => toggle(i.id)}
                  className="relative flex w-full items-center gap-2.5 rounded-xl border border-border bg-card p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary"
                >
                  {i.image !== undefined && (
                    // White plate: logos are drawn for a light background.
                    <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white p-1 text-xs font-bold text-slate-700">
                      {i.image ? <img src={i.image} alt="" className="max-h-full max-w-full object-contain" /> : initialsOf(i.label)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{i.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.sub}</span>
                  </span>
                  {pos > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{pos}</span>}
                </button>
              </li>
            )
          })}
          {!shown.length && <li className="col-span-full py-10 text-center text-sm text-muted-foreground">Nothing matches.</li>}
        </ul>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground" data-testid="picker-summary">
            {ids.length} of {max} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(draft)} disabled={!ids.length || !draft.title.trim()}>
              Save section
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
