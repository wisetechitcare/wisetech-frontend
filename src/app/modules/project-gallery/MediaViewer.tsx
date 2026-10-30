import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Pencil, Share2, Star, Trash2, Video, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/ds/ui/dialog"
import { Field, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Separator } from "@/ds/ui/separator"
import { cn } from "@/ds/lib/utils"
import { GallerySelect, NONE, ZoneField, optionsWithNone } from "./GalleryDialogs"
import { MediaTags, shareMedia, type MediaActions } from "./MediaCard"
import { formatDateTime, formatSize, isRealVideo, mediaLabel, type Albums, type GalleryApi, type MediaItem } from "./media"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/** What the side panel's edit form needs, passed through as one object. */
export interface ViewerEdit {
  editing: boolean
  albums: Albums
  zones: string[]
  services: string[]
  /** Resolves true when saved (the panel then leaves edit mode). */
  onSave: (id: string, patch: Parameters<GalleryApi["saveDetails"]>[1]) => Promise<boolean>
  onEditingChange: (editing: boolean) => void
}

/** Large preview with the item's details beside it; details are edited right here, not in a separate modal. */
export function MediaViewer({
  list,
  index,
  coverId,
  coverLabel,
  actions,
  edit,
  onIndexChange,
  onClose,
}: {
  list: MediaItem[]
  index: number | null
  coverId: string | null
  coverLabel: string | null
  actions: MediaActions
  edit: ViewerEdit
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const item = index === null ? null : list[index]
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="h-[92vh] max-w-[calc(100%-2rem)] grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[min(1500px,calc(100%-2rem))] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-1"
      >
        {item && index !== null && (
          <ViewerBody
            key={item.id}
            item={item}
            position={`${index + 1} of ${list.length}`}
            multi={list.length > 1}
            isCover={item.id === coverId}
            coverLabel={coverLabel}
            actions={actions}
            edit={edit}
            step={(d) => onIndexChange((index + d + list.length) % list.length)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ViewerBody({
  item,
  position,
  multi,
  isCover,
  coverLabel,
  actions,
  edit,
  step,
}: {
  item: MediaItem
  position: string
  multi: boolean
  isCover: boolean
  coverLabel: string | null
  actions: MediaActions
  edit: ViewerEdit
  step: (d: number) => void
}) {
  const { editing, onEditingChange } = edit
  const [zoom, setZoom] = useState(1)
  // Read from the loaded image/video itself, so nothing extra is stored for it.
  const [dims, setDims] = useState<{ w: number; h: number; secs?: number } | null>(null)
  const [unplayable, setUnplayable] = useState(false)

  useEffect(() => {
    if (!multi || editing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [multi, editing, step])

  const label = mediaLabel(item)
  const duration = item.duration ?? (dims?.secs ? mmss(dims.secs) : undefined)
  const darkBtn = "text-white hover:bg-white/15 hover:text-white"

  return (
    <>
      <div className="dark flex min-h-0 min-w-0 flex-col bg-neutral-950 text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="truncate font-medium">{item.name}</p>
          {multi && <span className="text-xs whitespace-nowrap text-white/70">{position}</span>}
          <Button variant="ghost" size="icon-sm" className={cn("ml-auto", darkBtn)} onClick={() => void shareMedia(item)} aria-label="Share">
            <Share2 />
          </Button>
          <Button variant="ghost" size="icon-sm" className={darkBtn} onClick={() => actions.download(item.id)} aria-label="Download">
            <Download />
          </Button>
          <DialogClose render={<Button variant="ghost" size="icon-sm" className={darkBtn} aria-label="Close preview" />}>
            <X />
          </DialogClose>
        </div>

        <div className="relative flex min-h-0 flex-1">
          {multi && (
            <>
              <Button variant="secondary" size="icon" className="absolute top-1/2 left-3 z-10 -translate-y-1/2" onClick={() => step(-1)} aria-label="Previous">
                <ChevronLeft />
              </Button>
              <Button variant="secondary" size="icon" className="absolute top-1/2 right-3 z-10 -translate-y-1/2" onClick={() => step(1)} aria-label="Next">
                <ChevronRight />
              </Button>
            </>
          )}
          {isRealVideo(item) && unplayable ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-16 py-2 text-center">
              <Video className="size-10 text-white/60" aria-hidden />
              <p className="font-medium">This browser can't play this video</p>
              <p className="max-w-sm text-sm text-white/70">
                It's probably HEVC (H.265), the default on many phones. Download it to watch, or record in H.264 / "Most compatible" next time.
              </p>
              <Button variant="secondary" onClick={() => actions.download(item.id)}>
                <Download data-icon="inline-start" /> Download video
              </Button>
            </div>
          ) : isRealVideo(item) ? (
            <div className="flex flex-1 items-center justify-center px-16 py-2">
              <video
                src={item.src}
                controls
                autoPlay
                playsInline
                onError={() => setUnplayable(true)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  // No picture track decoded (e.g. HEVC without hardware support): audio-only is not a preview.
                  if (!v.videoWidth) return setUnplayable(true)
                  setDims({ w: v.videoWidth, h: v.videoHeight, secs: v.duration })
                }}
                className="max-h-full w-full max-w-5xl rounded-xl bg-black"
              />
            </div>
          ) : (
            <div className={cn("relative flex flex-1 overflow-auto px-16 py-2", zoom === 1 ? "items-center justify-center" : "items-start justify-start")}>
              <img
                src={item.src}
                alt={label}
                onLoad={(e) => item.kind === "image" && setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className={cn("rounded-md", zoom === 1 ? "max-h-full max-w-full object-contain" : "max-w-none")}
                style={zoom > 1 ? { width: `${zoom * 100}%` } : undefined}
              />
              {item.kind === "video" && (
                // Storybook's demo videos are still images; real ones play in the browser's player above.
                <span className="pointer-events-none absolute top-1/2 left-1/2 grid size-16 -translate-1/2 place-items-center rounded-full bg-black/60">
                  <Video className="size-7" aria-hidden />
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs">
          {item.kind === "image" ? (
            <>
              <Button variant="ghost" size="icon-sm" className={darkBtn} disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out">
                <ZoomOut />
              </Button>
              <span className="tabular w-14 text-center" aria-live="polite">
                {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
              </span>
              <Button variant="ghost" size="icon-sm" className={darkBtn} disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))} aria-label="Zoom in">
                <ZoomIn />
              </Button>
              <Button variant="outline" size="xs" onClick={() => setZoom(1)}>
                Fit to screen
              </Button>
            </>
          ) : (
            <span className="text-white/70">
              Video{duration && ` · ${duration}`} · {formatSize(item.size)}
            </span>
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-popover">
        <div className="space-y-2 border-b p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {item.kind === "video" ? "Video" : "Photo"} · {item.view === "project" ? "Project View" : "Site View"}
          </p>
          <DialogTitle className="text-left text-base">{label}</DialogTitle>
          <DialogDescription className="sr-only">Preview and details for {item.name}</DialogDescription>
          <MediaTags item={item} />
        </div>

        {editing ? (
          <EditDetails key={item.id} item={item} edit={edit} />
        ) : (
          <div className="space-y-4 p-5">
            <div className={cn("space-y-2 rounded-2xl border p-3", isCover && "border-amber-400 bg-warning-soft")}>
              {item.kind === "video" ? (
                <>
                  <p className="text-sm font-semibold">Project cover</p>
                  <p className="text-xs text-muted-foreground">Videos can&apos;t be used as the project cover. Pick a photo instead.</p>
                </>
              ) : isCover ? (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning-foreground">
                  <Star className="size-4 fill-current" aria-hidden /> This is the project cover
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Use this photo as the project avatar everywhere in WISETECH.{coverLabel && ` It replaces “${coverLabel}”.`}
                  </p>
                  <Button className="w-full" onClick={() => actions.setCover(item.id)}>
                    <Star data-icon="inline-start" /> Set as Project Cover
                  </Button>
                </>
              )}
            </div>

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <Row k="Caption" v={item.caption || <span className="font-normal text-muted-foreground">No caption</span>} />
              <Row k="Album" v={item.album || "—"} />
              {item.view === "site" && (
                <>
                  <Row k="Zone" v={item.zone || "—"} />
                  <Row k="Service" v={item.discipline || "—"} />
                </>
              )}
              <Row k="Taken" v={formatDateTime(item.at)} />
              <Row k="Uploaded" v={item.uploadedAt ? formatDateTime(item.uploadedAt) : "—"} />
              <Row k="Uploaded by" v={item.by} />
            </dl>
            <Separator />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <Row k="File name" v={<span className="break-all">{item.name}</span>} />
              <Row k="Type" v={(item.name.split(".").pop() ?? "").toUpperCase() || (item.kind === "video" ? "Video" : "Photo")} />
              <Row k="Size" v={formatSize(item.size)} />
              {dims && dims.w > 0 && <Row k="Resolution" v={`${dims.w} × ${dims.h} px`} />}
              {duration && <Row k="Duration" v={duration} />}
            </dl>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => actions.download(item.id)}>
                <Download data-icon="inline-start" /> Download
              </Button>
              <Button variant="outline" onClick={() => void shareMedia(item)}>
                <Share2 data-icon="inline-start" /> Share
              </Button>
              <Button variant="outline" className="col-span-2" onClick={() => onEditingChange(true)}>
                <Pencil data-icon="inline-start" /> Edit details
              </Button>
              <Button variant="destructive" className="col-span-2" onClick={() => actions.remove([item.id])}>
                <Trash2 data-icon="inline-start" /> Delete
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </>
  )
}

/** Inline edit form in the side panel: caption, album, and for Site View zone and service. */
function EditDetails({ item, edit: { albums, zones, services, onSave, onEditingChange } }: { item: MediaItem; edit: ViewerEdit }) {
  const onCancel = () => onEditingChange(false)
  const [caption, setCaption] = useState(item.caption)
  const [album, setAlbum] = useState(item.album || NONE)
  const [zone, setZone] = useState(item.zone || "")
  const [discipline, setDiscipline] = useState(item.discipline || NONE)
  const [saving, setSaving] = useState(false)
  const site = item.view === "site"
  const clean = (v: string) => (v === NONE ? "" : v)

  const save = async () => {
    setSaving(true)
    const ok = await onSave(item.id, { caption: caption.trim(), album: clean(album), ...(site ? { zone: zone.trim(), discipline: clean(discipline) } : {}) })
    setSaving(false)
    if (ok) onCancel()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-5">
      <p className="text-sm font-semibold">Edit details</p>
      <Field className="gap-1.5">
        <FieldLabel htmlFor="edit-caption">Caption</FieldLabel>
        <Input id="edit-caption" autoFocus maxLength={255} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. L3 corridor ducting complete" />
      </Field>
      <GallerySelect label="Album" value={album} onChange={setAlbum} options={optionsWithNone("No album", albums[item.view])} />
      {site && <ZoneField id="edit-zone" value={zone} onChange={setZone} zones={zones} />}
      {site && <GallerySelect label="Service" value={discipline} onChange={setDiscipline} options={optionsWithNone("Not set", services)} />}
      <div className="mt-auto flex gap-3 pt-2 *:flex-1">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
