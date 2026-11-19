import * as React from "react"
import { Reorder, useDragControls } from "motion/react"
import { GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { cn } from "@/ds/lib/utils"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Input } from "@/ds/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group"
import { Item } from "@/ds/ui/item"
import { Spinner } from "@/ds/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"

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

/** How names are compared: case, outer spaces and repeated inner spaces do not make a new value. */
export const masterNameKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()
const cleanName = (s: string) => s.trim().replace(/\s+/g, " ")

/** An icon-only row action: the label is its accessible name AND its Tooltip (every icon-only control). */
function RowIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Row({
  item,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
  onRename,
  isTaken,
  maxLength,
  reorderable,
}: {
  item: MasterItem
  index: number
  total: number
  onMove: (from: number, to: number) => void
  onEdit?: (item: MasterItem) => void
  onDelete?: (item: MasterItem) => void
  onRename?: (item: MasterItem, name: string) => void | Promise<void>
  /** Is this name already used by ANOTHER row? */
  isTaken: (name: string, exceptId: string) => boolean
  maxLength?: number
  reorderable: boolean
}) {
  const controls = useDragControls()
  const [editing, setEditing] = React.useState<string | null>(null)
  // Enter commits AND unmounts the input, whose blur would commit again — one rename at a time.
  const committing = React.useRef(false)
  const editId = React.useId()
  const taken = editing !== null && isTaken(editing, item.id)

  async function commit() {
    if (editing === null || committing.current) return
    const name = cleanName(editing)
    if (!name || name === item.name) return setEditing(null)
    if (taken) return
    committing.current = true
    try {
      await onRename?.(item, name)
      setEditing(null)
    } catch {
      // The save failed (the caller reports it): keep the field open so nothing typed is lost.
    } finally {
      committing.current = false
    }
  }

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
      {editing !== null ? (
        <div className="min-w-0 flex-1">
          <Input
            id={editId}
            autoFocus
            aria-label={`Rename ${item.name}`}
            aria-invalid={taken || undefined}
            aria-describedby={taken ? `${editId}-taken` : undefined}
            maxLength={maxLength}
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void commit()
              }
              if (e.key === "Escape") {
                e.preventDefault()
                setEditing(null)
              }
            }}
            onBlur={() => void commit()}
            className="h-8"
          />
          {taken && (
            <p id={`${editId}-taken`} className="mt-1 text-xs text-destructive-foreground">
              “{cleanName(editing)}” is already in the list.
            </p>
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-medium">
            <span className="truncate" title={item.name}>{item.name}</span>
            {item.badge && <Badge variant="neutral">{item.badge}</Badge>}
          </p>
          {item.caption && <p className="truncate text-xs text-muted-foreground">{item.caption}</p>}
        </div>
      )}
      {!item.locked && editing === null && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
          {(onRename || onEdit) && (
            <RowIcon label={`Rename ${item.name}`} onClick={() => (onRename ? setEditing(item.name) : onEdit?.(item))}>
              <Pencil aria-hidden />
            </RowIcon>
          )}
          {onDelete && (
            <RowIcon label={`Delete ${item.name}`} onClick={() => onDelete(item)}>
              <Trash2 aria-hidden />
            </RowIcon>
          )}
        </div>
      )}
    </>
  )
  // Rows are the kit's row surface (Item), not a hand-drawn box — same as every other list row.
  return (
    <Item
      variant="outline"
      size="sm"
      data-editing={editing !== null || undefined}
      className={cn("group/row flex-nowrap gap-3 py-2 data-editing:border-ring", reorderable ? "pl-2" : "pl-3")}
      render={
        reorderable ? <Reorder.Item value={item} dragListener={false} dragControls={controls} /> : <li />
      }
    >
      {body}
    </Item>
  )
}

/**
 * The editable list behind a configuration master — designations, document types, lead sources, towns.
 * Replaces the live kit's `MasterListSection` rows, `ConfigColorChip` and `ReorderableGroup` + `DragHandle`.
 * Presentational: the caller owns the data (fetching, saving); this draws the list, the add box and the
 * reorder. Reorder by dragging the handle, or focus it and use the arrow keys.
 *
 * Opt-in: `filterOnType` (the box also narrows the list — what stops a value being added twice; without
 * `onAdd` it is a plain search box), `onRename` (rename in place: Enter or leaving the field saves, Esc
 * cancels, a name already in the list is refused), `layout="grid"` (one-word values as tiles that fill the
 * width), `busy` (a save is running), `empty` (shown when there are no values at all).
 */
export function MasterList({
  label,
  items,
  onReorder,
  onAdd,
  onEdit,
  onDelete,
  onRename,
  addPlaceholder = "Add a new value",
  addLabel = "Add",
  filterOnType = false,
  layout = "list",
  busy = false,
  empty,
  maxLength,
}: {
  /** Names the list for assistive tech, e.g. "Designations". */
  label: string
  items: MasterItem[]
  /** Omit to make the list fixed-order. */
  onReorder?: (next: MasterItem[]) => void
  onAdd?: (name: string) => void
  /** Rename by callback (the caller opens its own editor). Ignored when `onRename` is set. */
  onEdit?: (item: MasterItem) => void
  onDelete?: (item: MasterItem) => void
  /** Rename in place. May return a promise; the field stays open until it settles, and stays open if it
   *  rejects (report the failure yourself, e.g. a toast). */
  onRename?: (item: MasterItem, name: string) => void | Promise<void>
  addPlaceholder?: string
  /** The add button's label, e.g. "Add town". */
  addLabel?: string
  filterOnType?: boolean
  /** `grid` for short one-word values; reordering is a list-only feature. */
  layout?: "list" | "grid"
  busy?: boolean
  empty?: React.ReactNode
  maxLength?: number
}) {
  const [draft, setDraft] = React.useState("")
  const [announce, setAnnounce] = React.useState("")
  const addId = React.useId()
  const draftKey = masterNameKey(draft)
  const duplicate = !!draftKey && items.some((i) => masterNameKey(i.name) === draftKey)
  const showBox = !!onAdd || filterOnType
  const reorderable = !!onReorder && layout === "list"
  const shown = filterOnType && draftKey ? items.filter((i) => masterNameKey(i.name).includes(draftKey)) : items
  const isTaken = React.useCallback(
    (name: string, exceptId: string) => items.some((i) => i.id !== exceptId && masterNameKey(i.name) === masterNameKey(name)),
    [items],
  )

  function move(from: number, to: number) {
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder?.(next)
    setAnnounce(`${moved.name} moved to position ${to + 1} of ${items.length}.`)
  }

  function add() {
    const name = cleanName(draft)
    if (!onAdd || !name || duplicate || busy) return
    onAdd(name)
    setDraft("")
  }

  const rows = shown.map((item) => (
    <Row
      key={item.id}
      item={item}
      index={items.indexOf(item)}
      total={items.length}
      onMove={move}
      onEdit={onEdit}
      onDelete={onDelete}
      onRename={onRename}
      isTaken={isTaken}
      maxLength={maxLength}
      reorderable={reorderable}
    />
  ))

  const listClass =
    layout === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] gap-2.5" : "space-y-2"

  return (
    <div className="space-y-3">
      {showBox && (
        <div className="space-y-1">
          <InputGroup>
            {!onAdd && (
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
            )}
            <InputGroupInput
              id={addId}
              aria-label={onAdd ? `Add to ${label}` : `Find in ${label}`}
              placeholder={addPlaceholder}
              value={draft}
              maxLength={maxLength}
              aria-invalid={(onAdd && duplicate) || undefined}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  add()
                }
                if (e.key === "Escape" && filterOnType) setDraft("")
              }}
            />
            {(onAdd || busy) && (
              <InputGroupAddon align="inline-end">
                {busy && <Spinner className="size-4" aria-label="Saving" />}
                {onAdd && (
                  <InputGroupButton
                    size="sm"
                    variant="default"
                    // Concentric with the pill: the addon's padding leaves 8px on the right; 5px back makes it the same
                    // 3px as top and bottom (40px group, 1px border, 32px button).
                    className="-me-[5px]"
                    disabled={!draftKey || duplicate || busy}
                    onClick={add}
                  >
                    <Plus aria-hidden /> {addLabel}
                  </InputGroupButton>
                )}
              </InputGroupAddon>
            )}
          </InputGroup>
          {onAdd && duplicate && <p className="text-xs text-destructive-foreground">“{cleanName(draft)}” is already in the list.</p>}
        </div>
      )}
      {items.length === 0 && empty ? (
        empty
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing called “{cleanName(draft)}” yet.{onAdd ? ` Press Enter or ${addLabel} to create it.` : ""}
        </p>
      ) : reorderable ? (
        <Reorder.Group as="ol" axis="y" values={items} onReorder={onReorder!} aria-label={label} className="space-y-2">
          {rows}
        </Reorder.Group>
      ) : (
        <ol aria-label={label} className={listClass}>
          {rows}
        </ol>
      )}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  )
}
