import { useState } from "react"
import { ChevronDown, Eye, EyeOff, Pencil, Trash2 } from "lucide-react"
import ReorderableGroup, { DragHandle, nudgeItems } from "@app/modules/common/components/ReorderableGroup"
import { Button } from "@/ds/ui/button"
import { Item } from "@/ds/ui/item"
import type { ProjectSection } from "@app/modules/company-profile/profile"
import type { BuilderSection, EditableSection, SectionSlide } from "./profileBuilder"

/*
 * Rows are the kit's `Item`: it carries `data-slot`, which makes Bootstrap's colliding `!important` utilities
 * (`border`, `gap-*`) stand down, so the border colour and the dashed "hidden" state hold in the app. Text
 * sizes sit on spans (see DeckStage) and are one step up from the prototype's for the app's 13px root.
 */

/** The eye on a section and on each of its slides: pressed means it is in the deck. */
function VisibilityToggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <Button size="icon-xs" variant="ghost" aria-pressed={on} aria-label={`Include ${label}`} onClick={onToggle}>
      {on ? <Eye /> : <EyeOff />}
    </Button>
  )
}

/** A project section's own slides (High-rise 1, 2…): reorder by drag or arrow keys, hide one at a time. */
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
  onToggle: (n: number) => void
  onReorder: (order: number[]) => void
}) {
  return (
    <div role="group" aria-label={label}>
      <ReorderableGroup
        items={slides}
        getItemId={(x) => x.key}
        onReorder={(next) => onReorder(next.map((x) => x.n))}
        axis="y"
        withHandle
        className="mt-1 ml-6 flex flex-col gap-0.5"
        renderItem={(x, handleProps) => (
          <Item size="xs" data-off={x.hidden ? "" : undefined} className="group/part flex-nowrap gap-1 rounded-md py-0.5 pr-2 pl-0 data-off:border-dashed data-off:border-border">
            <DragHandle handleProps={handleProps} onNudge={(d) => onReorder(nudgeItems(slides, x.n - 1, d).map((y) => y.n))} title={`Drag to reorder ${x.title}`} />
            <button type="button" className="min-w-0 flex-1 rounded! text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => !x.hidden && onOpen(x.n)}>
              <span className="block truncate text-sm group-data-off/part:text-muted-foreground group-data-off/part:line-through">{x.title}</span>
            </button>
            <VisibilityToggle on={!x.hidden} label={x.title} onToggle={() => onToggle(x.n)} />
          </Item>
        )}
      />
    </div>
  )
}

/**
 * The builder's section list: drag (or arrow-key) to reorder, show / hide, edit, remove. A project section
 * lists its slides underneath, collapsible. Rendering only: every change goes back through the callbacks.
 */
export function SectionList({
  sections,
  slidesOf,
  metaOf,
  onReorder,
  onOpen,
  onEdit,
  onRemove,
  onToggle,
  onToggleSlide,
  onReorderSlides,
}: {
  sections: BuilderSection[]
  slidesOf: (s: BuilderSection) => SectionSlide[]
  metaOf: (s: BuilderSection) => string
  onReorder: (next: BuilderSection[]) => void
  /** Show the section's first slide, or its slide `n`. */
  onOpen: (s: BuilderSection, n?: number) => void
  onEdit: (s: EditableSection) => void
  onRemove: (s: ProjectSection) => void
  onToggle: (s: BuilderSection) => void
  onToggleSlide: (s: BuilderSection, n: number) => void
  onReorderSlides: (s: ProjectSection, order: number[]) => void
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
        const slides = s.kind === "projects" && s.enabled ? slidesOf(s) : []
        const nested = s.kind === "projects" && slides.length > 1
        const open = !collapsed.includes(s.id)
        return (
          <div>
            <Item variant="outline" size="xs" data-off={s.enabled ? undefined : ""} className="group/row flex-nowrap gap-1 rounded-lg bg-card p-1.5 pr-2 data-off:border-dashed">
              <DragHandle handleProps={handleProps} onNudge={(d) => onReorder(nudgeItems(sections, sections.indexOf(s), d))} title={`Drag to reorder ${s.title}`} />
              <button type="button" className="min-w-0 flex-1 rounded! text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => s.enabled && onOpen(s)}>
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
              {(s.kind === "services" || s.kind === "projects") && (
                <Button size="icon-xs" variant="ghost" aria-label={`Edit ${s.title}`} onClick={() => onEdit(s)}>
                  <Pencil />
                </Button>
              )}
              {s.kind === "projects" && (
                <Button size="icon-xs" variant="ghost" aria-label={`Remove ${s.title}`} onClick={() => onRemove(s)}>
                  <Trash2 />
                </Button>
              )}
              <VisibilityToggle on={s.enabled} label={s.title} onToggle={() => onToggle(s)} />
            </Item>
            {s.kind === "projects" && nested && open && (
              <SlideList
                label={`${s.title} slides`}
                slides={slides}
                onOpen={(n) => onOpen(s, n)}
                onToggle={(n) => onToggleSlide(s, n)}
                onReorder={(order) => onReorderSlides(s, order)}
              />
            )}
          </div>
        )
      }}
    />
  )
}
