import { useState } from "react"
import { X } from "lucide-react"
import ReorderableGroup, { DragHandle, nudgeItems } from "@app/modules/common/components/ReorderableGroup"
import { Button } from "@/ds/ui/button"
import { Item } from "@/ds/ui/item"
import { MAX_PER_SLIDE, type ProfileProject, type ProjectSlide } from "./profile"
import { moveProject, pick, removeProject } from "./profileBuilder"

/** The pickers' half of the editor: the slide new picks join, and picking / un-picking a project. */
export function useSlideTarget(slides: ProjectSlide[]) {
  const [target, setTarget] = useState(Math.max(0, slides.length - 1))
  const at = Math.min(target, Math.max(0, slides.length - 1))
  return {
    target: at,
    setTarget,
    /** `slides` with `id` taken off, or put on the target slide (the target follows it when a full slide spills). */
    toggle: (id: string) => {
      if (slides.some((s) => s.ids.includes(id))) return removeProject(slides, id)
      const next = moveProject(slides, id, at)
      setTarget(next.findIndex((s) => s.ids.includes(id)))
      return next
    },
  }
}

/**
 * A project section's slides and their projects, for the project pickers: pick "Add here" to choose which
 * slide newly picked projects join, drag (or arrow-key) a project within its slide, move it to another slide or a
 * new one, or drop it. A project is on one slide only; a full slide spills onto a new one.
 */
export function ProjectSlidesEditor({
  slides,
  projects,
  target,
  onTarget,
  onChange,
}: {
  slides: ProjectSlide[]
  projects: ProfileProject[]
  /** Index of the slide newly picked projects join. */
  target: number
  onTarget: (i: number) => void
  onChange: (slides: ProjectSlide[]) => void
}) {
  const withIds = (i: number, ids: string[]) => onChange(slides.map((s, j) => (j === i ? { ...s, ids } : s)))
  return (
    <section aria-label="Slides" className="flex flex-col gap-3 lg:sticky lg:top-0">
      <p className="text-base font-semibold">Slides</p>
      {!slides.length && <p className="text-sm text-muted-foreground">Nothing selected yet.</p>}
      {slides.map((slide, i) => {
        const items = pick(projects, slide.ids)
        const name = `Slide ${i + 1}`
        return (
          <div key={slide.key} role="group" aria-label={name} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-sm font-semibold">
                {name} <span className="font-normal text-muted-foreground">· {slide.ids.length} of {MAX_PER_SLIDE}</span>
              </span>
              <Button size="xs" variant={i === target ? "secondary" : "ghost"} aria-pressed={i === target} aria-label={`Add to ${name}`} onClick={() => onTarget(i)}>
                Add here
              </Button>
            </div>
            <ReorderableGroup
              items={items}
              getItemId={(p) => p.id}
              onReorder={(next) => withIds(i, next.map((p) => p.id))}
              axis="y"
              withHandle
              className="flex flex-col gap-1"
              renderItem={(p, handleProps) => (
                <Item variant="outline" size="xs" className="flex-nowrap gap-1.5 rounded-lg bg-card p-1 pr-1.5">
                  <DragHandle
                    handleProps={handleProps}
                    disabled={items.length < 2}
                    onNudge={(d) => withIds(i, nudgeItems(slide.ids, slide.ids.indexOf(p.id), d))}
                    title={`Drag to reorder ${p.name}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <select
                    aria-label={`Move ${p.name} to`}
                    value={i}
                    onChange={(e) => onChange(moveProject(slides, p.id, e.target.value === "new" ? "new" : Number(e.target.value)))}
                    className="h-7 shrink-0 rounded-md border border-border bg-background px-1 text-sm text-foreground"
                  >
                    {slides.map((s, j) => (
                      <option key={s.key} value={j} disabled={j !== i && s.ids.length >= MAX_PER_SLIDE}>
                        Slide {j + 1}
                      </option>
                    ))}
                    <option value="new">New slide</option>
                  </select>
                  <Button size="icon-xs" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => onChange(removeProject(slides, p.id))}>
                    <X />
                  </Button>
                </Item>
              )}
            />
          </div>
        )
      })}
    </section>
  )
}
