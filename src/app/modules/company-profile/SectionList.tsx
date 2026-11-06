import { useState } from "react"
import { ChevronDown, Eye, EyeOff, Pencil } from "lucide-react"
import ReorderableGroup, { DragHandle, nudgeItems } from "@app/modules/common/components/ReorderableGroup"
import { Button } from "@/ds/ui/button"
import { Item } from "@/ds/ui/item"
import type { ProjectSection, Section } from "./profile"
import { isEditable, type EditableSection, type SectionSlide } from "./profileBuilder"

/*
 * Rows are the kit's `Item`: it carries `data-slot`, which makes Bootstrap's colliding `!important` utilities
 * (`border`, `gap-*`) stand down in the app, so the border colour and the dashed "hidden" state hold. Text
 * sizes sit on spans (see DeckStage).
 */

/** The eye on a section and on each of its slides: pressed means it is in the presentation. Show / hide only; nothing is deleted here. */
function VisibilityToggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <Button size="icon-xs" variant="ghost" aria-pressed={on} aria-label={`Include ${label}`} onClick={onToggle}>
      {on ? <Eye /> : <EyeOff />}
    </Button>
  )
}

/** A section's own slides (High-rise 1, 2…): hide one at a time; with `onReorder`, drag or arrow keys reorder them. */
function SlideList({
  label,
  slides,
  onOpen,
  onToggle,
  onReorder,
}: {
  label: string
  slides: SectionSlide[]
  onOpen: (n: number) => void
  onToggle: (key: string) => void
  onReorder?: (order: string[]) => void
}) {
  const keys = slides.map((x) => x.key)
  return (
    <div role="group" aria-label={label}>
      <ReorderableGroup
        items={slides}
        getItemId={(x) => x.key}
        onReorder={(next) => onReorder?.(next.map((x) => x.key))}
        disabled={!onReorder}
        axis="y"
        withHandle
        className="mt-1 ml-6 flex flex-col gap-0.5"
        renderItem={(x, handleProps) => (
          <Item size="xs" data-off={x.hidden ? "" : undefined} className="group/part flex-nowrap gap-1 rounded-md py-0.5 pr-2 pl-0 data-off:border-dashed data-off:border-border">
            {onReorder ? (
              <DragHandle handleProps={handleProps} onNudge={(d) => onReorder(nudgeItems(keys, x.n - 1, d))} title={`Drag to reorder ${x.title}`} />
            ) : (
              <span aria-hidden className="w-2" />
            )}
            {/* The slide row's title opens it: an approved clickable "row", not an action button (docs/BUTTONS.md). */}
            <button type="button" data-wt-control="row" className="min-w-0 flex-1 rounded! text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => !x.hidden && onOpen(x.n)}>
              <span className="block truncate text-sm group-data-off/part:text-muted-foreground group-data-off/part:line-through">{x.title}</span>
            </button>
            <VisibilityToggle on={!x.hidden} label={x.title} onToggle={() => onToggle(x.key)} />
          </Item>
        )}
      />
    </div>
  )
}

/**
 * The builder's section list: drag (or arrow-key) to reorder sections, show / hide, edit. A section with more
 * than one slide lists them underneath, collapsible; project slides reorder there too. Rendering only: every
 * change goes back through the callbacks.
 */
export function SectionList({
  sections,
  slidesOf,
  metaOf,
  onReorder,
  onOpen,
  onEdit,
  onToggle,
  onToggleSlide,
  onReorderSlides,
}: {
  sections: Section[]
  slidesOf: (s: Section) => SectionSlide[]
  metaOf: (s: Section) => string
  onReorder: (next: Section[]) => void
  /** Show the section's first slide, or its slide `n`. */
  onOpen: (s: Section, n?: number) => void
  onEdit: (s: EditableSection) => void
  onToggle: (s: Section) => void
  onToggleSlide: (s: Section, key: string) => void
  onReorderSlides: (s: ProjectSection, order: string[]) => void
}) {
  const [collapsed, setCollapsed] = useState<string[]>([])

  return (
    <ReorderableGroup
      items={sections}
      getItemId={(s) => s.id}
      onReorder={onReorder}
      axis="y"
      withHandle
      className="flex flex-col gap-1.5"
      renderItem={(s, handleProps) => {
        const slides = s.enabled ? slidesOf(s) : []
        const nested = slides.length > 1
        const open = !collapsed.includes(s.id)
        return (
          <div>
            <Item variant="outline" size="xs" data-off={s.enabled ? undefined : ""} className="group/row flex-nowrap gap-1 rounded-lg bg-card p-1.5 pr-2 data-off:border-dashed">
              <DragHandle handleProps={handleProps} onNudge={(d) => onReorder(nudgeItems(sections, sections.indexOf(s), d))} title={`Drag to reorder ${s.title}`} />
              {/* The section row's title opens it: an approved clickable "row", not an action button (docs/BUTTONS.md). */}
              <button type="button" data-wt-control="row" className="min-w-0 flex-1 rounded! text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => s.enabled && onOpen(s)}>
                <span className="block truncate text-base font-semibold group-data-off/row:text-muted-foreground group-data-off/row:line-through">{s.title}</span>
                <span className="block truncate text-sm text-muted-foreground">{metaOf(s)}</span>
              </button>
              {nested && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-expanded={open}
                  aria-label={`${s.title} slides`}
                  className="[&_svg]:transition-transform aria-[expanded=false]:[&_svg]:-rotate-90"
                  onClick={() => setCollapsed((c) => (open ? [...c, s.id] : c.filter((x) => x !== s.id)))}
                >
                  <ChevronDown />
                </Button>
              )}
              {isEditable(s) && (
                <Button size="icon-xs" variant="ghost" aria-label={`Edit ${s.title}`} onClick={() => onEdit(s)}>
                  <Pencil />
                </Button>
              )}
              <VisibilityToggle on={s.enabled} label={s.title} onToggle={() => onToggle(s)} />
            </Item>
            {nested && open && (
              <SlideList
                label={`${s.title} slides`}
                slides={slides}
                onOpen={(n) => onOpen(s, n)}
                onToggle={(key) => onToggleSlide(s, key)}
                onReorder={s.kind === "projects" ? (order) => onReorderSlides(s, order) : undefined}
              />
            )}
          </div>
        )
      }}
    />
  )
}
