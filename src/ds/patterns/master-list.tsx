import * as React from "react"
import { Reorder, useDragControls } from "motion/react"
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group"

export type MasterItem = {
  id: string
  name: string
  /** A status, a category hue or a hex — drawn as the row's colour dot. */
  tone?: Tone | (string & {})
  /** One line under the name: "Used by 12 employees". */
  caption?: string
  badge?: string
  /** System rows cannot be renamed or deleted. */
  locked?: boolean
}

function Row({
  item,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
  reorderable,
}: {
  item: MasterItem
  index: number
  total: number
  onMove: (from: number, to: number) => void
  onEdit?: (item: MasterItem) => void
  onDelete?: (item: MasterItem) => void
  reorderable: boolean
}) {
  const controls = useDragControls()
  const body = (
    <>
      {reorderable && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Move ${item.name}. Use the up and down arrow keys.`}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && index > 0) {
              e.preventDefault()
              onMove(index, index - 1)
            }
            if (e.key === "ArrowDown" && index < total - 1) {
              e.preventDefault()
              onMove(index, index + 1)
            }
          }}
        >
          <GripVertical aria-hidden />
        </Button>
      )}
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--tone)" style={toneStyle(item.tone ?? "neutral")} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="truncate">{item.name}</span>
          {item.badge && <Badge variant="neutral">{item.badge}</Badge>}
        </p>
        {item.caption && <p className="truncate text-xs text-muted-foreground">{item.caption}</p>}
      </div>
      {!item.locked && (
        <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
          {onEdit && (
            <Button variant="ghost" size="icon-sm" aria-label={`Rename ${item.name}`} onClick={() => onEdit(item)}>
              <Pencil aria-hidden />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      )}
    </>
  )
  const rowClass = "group/row flex items-center gap-3 rounded-xl border bg-card px-2 py-2"
  return reorderable ? (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className={rowClass}>
      {body}
    </Reorder.Item>
  ) : (
    <li className={cn(rowClass, "pl-3")}>{body}</li>
  )
}

/**
 * The editable list behind a configuration master — designations, document types, lead sources. Replaces
 * the live kit's `MasterListSection` rows, `ConfigColorChip` and `ReorderableGroup` + `DragHandle`.
 * Presentational: the caller owns the data (fetching, saving); this draws the list, the add box and the
 * reorder. Reorder by dragging the handle, or focus it and use the arrow keys.
 */
export function MasterList({
  label,
  items,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
  addPlaceholder = "Add a new value",
}: {
  /** Names the list for assistive tech, e.g. "Designations". */
  label: string
  items: MasterItem[]
  /** Omit to make the list fixed-order. */
  onReorder?: (next: MasterItem[]) => void
  onAdd?: (name: string) => void
  onEdit?: (item: MasterItem) => void
  onDelete?: (item: MasterItem) => void
  addPlaceholder?: string
}) {
  const [draft, setDraft] = React.useState("")
  const [announce, setAnnounce] = React.useState("")
  const addId = React.useId()
  const duplicate = items.some((i) => i.name.toLowerCase() === draft.trim().toLowerCase())

  function move(from: number, to: number) {
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder?.(next)
    setAnnounce(`${moved.name} moved to position ${to + 1} of ${items.length}.`)
  }

  function add() {
    const name = draft.trim()
    if (!name || duplicate) return
    onAdd?.(name)
    setDraft("")
  }

  const rows = items.map((item, i) => (
    <Row
      key={item.id}
      item={item}
      index={i}
      total={items.length}
      onMove={move}
      onEdit={onEdit}
      onDelete={onDelete}
      reorderable={!!onReorder}
    />
  ))

  return (
    <div className="space-y-3">
      {onAdd && (
        <div className="space-y-1">
          <InputGroup>
            <InputGroupInput
              id={addId}
              aria-label={`Add to ${label}`}
              placeholder={addPlaceholder}
              value={draft}
              aria-invalid={duplicate || undefined}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  add()
                }
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="sm" variant="default" disabled={!draft.trim() || duplicate} onClick={add}>
                <Plus aria-hidden /> Add
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {duplicate && <p className="text-xs text-destructive-foreground">“{draft.trim()}” is already in the list.</p>}
        </div>
      )}
      {onReorder ? (
        <Reorder.Group as="ol" axis="y" values={items} onReorder={onReorder} aria-label={label} className="space-y-2">
          {rows}
        </Reorder.Group>
      ) : (
        <ol aria-label={label} className="space-y-2">
          {rows}
        </ol>
      )}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  )
}
