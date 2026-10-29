import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ds/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/ds/ui/tabs"
import { cn } from "@/ds/lib/utils"
import { CoverBadge } from "./MediaCard"
import { DISCIPLINES, mediaLabel, type GalleryView, type MediaItem } from "./media"

/** "No value" for selects: Base UI treats "" as unselected, so optional fields use this sentinel. */
export const NONE = "__none__"

export function GallerySelect({
  label,
  value,
  onChange,
  options,
  size = "default",
  className,
  hideLabel,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  size?: "sm" | "default"
  className?: string
  hideLabel?: boolean
  disabled?: boolean
}) {
  return (
    <Field className={cn("gap-1.5", className)}>
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <Select items={options} value={value} onValueChange={(v) => onChange(String(v))} disabled={disabled}>
        <SelectTrigger size={size} className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Free-text zone (every building names its own) with the project's existing zones as suggestions. */
export function ZoneField({ id, value, onChange, zones, disabled }: { id: string; value: string; onChange: (v: string) => void; zones: string[]; disabled?: boolean }) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>Zone (optional)</FieldLabel>
      <Input id={id} list={`${id}-list`} value={value} disabled={disabled} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Level 3, Basement" />
      <datalist id={`${id}-list`}>
        {zones.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </Field>
  )
}

export const optionsWithNone = (noneLabel: string, values: string[]) => [{ value: NONE, label: noneLabel }, ...values.map((v) => ({ value: v, label: v }))]

/* ---------- Delete confirmation ---------- */
export function ConfirmDeleteDialog({
  items,
  coverId,
  onCancel,
  onConfirm,
}: {
  items: MediaItem[]
  coverId: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const n = items.length
  const hasCover = items.some((m) => m.id === coverId)
  return (
    <Dialog open={n > 0} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-destructive-soft text-destructive-foreground">
            <Trash2 className="size-5" aria-hidden />
          </span>
          <DialogTitle>{n === 1 ? `Delete “${mediaLabel(items[0])}”?` : `Delete ${n} items?`}</DialogTitle>
          <DialogDescription>
            This removes {n === 1 ? "it" : "them"} from the gallery for everyone on the project. This can&apos;t be undone.
            {hasCover && " This includes the project cover. Project initials will show until you choose a new one."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            {n === 1 ? "Delete" : `Delete ${n} items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Edit caption & details ---------- */
export function EditDetailsDialog({
  item,
  albums,
  zones,
  onClose,
  onSave,
}: {
  item: MediaItem | null
  albums: Record<GalleryView, string[]>
  /** Zones already used on this project, offered as suggestions */
  zones: string[]
  onClose: () => void
  onSave: (patch: Partial<MediaItem>) => void
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{item && <EditForm key={item.id} item={item} albums={albums} zones={zones} onSave={onSave} />}</DialogContent>
    </Dialog>
  )
}

function EditForm({ item, albums, zones, onSave }: { item: MediaItem; albums: Record<GalleryView, string[]>; zones: string[]; onSave: (patch: Partial<MediaItem>) => void }) {
  const [caption, setCaption] = useState(item.caption)
  const [album, setAlbum] = useState(item.album || NONE)
  const [zone, setZone] = useState(item.zone || "")
  const [discipline, setDiscipline] = useState(item.discipline || NONE)
  const site = item.view === "site"
  const clean = (v: string) => (v === NONE ? "" : v)
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit details</DialogTitle>
        <DialogDescription>{item.name}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <Field className="gap-1.5">
          <FieldLabel htmlFor="edit-caption">Caption (optional)</FieldLabel>
          <Input id="edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. L3 corridor ducting complete" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <GallerySelect label="Album (optional)" value={album} onChange={setAlbum} options={optionsWithNone("No album", albums[item.view])} />
          {site && <ZoneField id="edit-zone" value={zone} onChange={setZone} zones={zones} />}
          {site && <GallerySelect label="Discipline (optional)" value={discipline} onChange={setDiscipline} options={optionsWithNone("Not set", DISCIPLINES)} />}
        </div>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button
          onClick={() =>
            onSave({ caption: caption.trim(), album: clean(album), ...(site ? { zone: zone.trim(), discipline: clean(discipline) } : {}) })
          }
        >
          Save changes
        </Button>
      </DialogFooter>
    </>
  )
}

/* ---------- Create album ---------- */
export function CreateAlbumDialog({
  open,
  view,
  existing,
  onClose,
  onCreate,
}: {
  open: boolean
  view: GalleryView
  existing: string[]
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const submit = () => {
    const n = name.trim()
    if (!n) return setError("Enter a name for the album.")
    if (existing.some((a) => a.toLowerCase() === n.toLowerCase())) return setError("An album with this name already exists in this view.")
    onCreate(n)
    setName("")
    setError("")
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setName("")
          setError("")
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create album</DialogTitle>
          <DialogDescription>
            New album in {view === "project" ? "Project View" : "Site View"}. Add media to it when uploading or from Edit details.
          </DialogDescription>
        </DialogHeader>
        <Field className="gap-1.5" data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="album-name">Album name</FieldLabel>
          <Input
            id="album-name"
            maxLength={40}
            value={name}
            aria-invalid={!!error || undefined}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={view === "project" ? "e.g. Client presentation" : "e.g. Level 4 progress"}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={submit}>Create album</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Choose project cover ---------- */
export function CoverPickerDialog({
  open,
  items,
  coverId,
  onClose,
  onPick,
}: {
  open: boolean
  items: MediaItem[]
  coverId: string | null
  onClose: () => void
  onPick: (id: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
        {open && <CoverPicker items={items} coverId={coverId} onPick={onPick} />}
      </DialogContent>
    </Dialog>
  )
}

function CoverPicker({ items, coverId, onPick }: { items: MediaItem[]; coverId: string | null; onPick: (id: string) => void }) {
  const [tab, setTab] = useState<"all" | GalleryView>("all")
  const [picked, setPicked] = useState<string | null>(coverId)
  const images = items.filter((m) => m.kind === "image")
  const shown = images.filter((m) => tab === "all" || m.view === tab)
  const count = (v: "all" | GalleryView) => images.filter((m) => v === "all" || m.view === v).length
  return (
    <>
      <DialogHeader>
        <DialogTitle>Choose project cover</DialogTitle>
        <DialogDescription>Pick any uploaded photo from Project View or Site View. Videos can&apos;t be covers.</DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList aria-label="Photos from">
            <TabsTrigger value="all">All photos ({count("all")})</TabsTrigger>
            <TabsTrigger value="project">Project View ({count("project")})</TabsTrigger>
            <TabsTrigger value="site">Site View ({count("site")})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="-mx-1 grid min-h-0 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 overflow-y-auto p-1" role="radiogroup" aria-label="Photos">
          {shown.map((m) => (
            <Button
              key={m.id}
              variant="ghost"
              role="radio"
              aria-checked={picked === m.id}
              onClick={() => setPicked(m.id)}
              className={cn(
                "relative block h-auto overflow-hidden rounded-xl bg-muted p-0 text-left ring-2 ring-transparent",
                picked === m.id && "ring-primary",
              )}
            >
              <img src={m.src} alt="" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {m.view === "project" ? "Project" : "Site"}
              </span>
              {m.id === coverId && (
                <span className="absolute top-1.5 right-1.5">
                  <CoverBadge compact />
                </span>
              )}
              <span className="block truncate px-2 py-1.5 text-xs font-medium">{mediaLabel(m)}</span>
            </Button>
          ))}
        </div>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button disabled={!picked || picked === coverId} onClick={() => picked && onPick(picked)}>
          Set as Project Cover
        </Button>
      </DialogFooter>
    </>
  )
}
