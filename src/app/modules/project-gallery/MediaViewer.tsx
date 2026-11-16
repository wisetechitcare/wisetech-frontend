import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Download, Pencil, Share2, Star, Trash2, Video, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/ds/ui/dialog"
import { Field, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Separator } from "@/ds/ui/separator"
import { cn } from "@/ds/lib/utils"
import { GallerySelect, NONE, ZoneField, optionsWithNone } from "./GalleryDialogs"
import { MediaTags, shareMedia, type MediaActions } from "./MediaCard"
import { formatDateTime, formatSize, isRealVideo, mediaLabel, viewLabel, type Albums, type GalleryApi, type MediaItem } from "./media"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/* ---------- The viewer shell, shared by every media-style collection ---------- */

/** What the viewer needs to show a file on its stage. */
export interface ViewerItem {
  id: string
  /** File name, shown in the stage header. */
  name: string
  src: string
  kind: "image" | "video" | "pdf"
  /** Megabytes */
  size: number
  duration?: string
}

/** Read from the loaded file itself, for the details panel. */
export interface ViewerInfo {
  dims: { w: number; h: number; secs?: number } | null
  duration?: string
}

/** The details panel beside the stage: the screen fills it in. */
export interface ViewerSide {
  eyebrow: ReactNode
  title: string
  tags?: ReactNode
  body: ReactNode
}

/**
 * Large preview on a dark stage (images zoom, videos play, PDFs open in the browser's viewer), with
 * Share / Download / Close above it, previous / next (also ← →) across the list, and the item's details
 * beside it. Used by the Project Gallery and Company Catalogues; each supplies its own details panel.
 */
export function ItemViewer<T extends ViewerItem>({
  list,
  index,
  onIndexChange,
  onClose,
  onShare,
  onDownload,
  lockKeys = false,
  side,
}: {
  list: T[]
  index: number | null
  onIndexChange: (i: number) => void
  onClose: () => void
  onShare: (item: T) => void
  onDownload: (item: T) => void
  /** Turns off ← → while the panel is being edited. */
  lockKeys?: boolean
  side: (item: T, info: ViewerInfo) => ViewerSide
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
            lockKeys={lockKeys}
            onShare={onShare}
            onDownload={onDownload}
            side={side}
            step={(d) => onIndexChange((index + d + list.length) % list.length)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ViewerBody<T extends ViewerItem>({
  item,
  position,
  multi,
  lockKeys,
  onShare,
  onDownload,
  side,
  step,
}: {
  item: T
  position: string
  multi: boolean
  lockKeys: boolean
  onShare: (item: T) => void
  onDownload: (item: T) => void
  side: (item: T, info: ViewerInfo) => ViewerSide
  step: (d: number) => void
}) {
  const [zoom, setZoom] = useState(1)
  // Read from the loaded image/video itself, so nothing extra is stored for it.
  const [dims, setDims] = useState<ViewerInfo["dims"]>(null)
  const [unplayable, setUnplayable] = useState(false)

  useEffect(() => {
    if (!multi || lockKeys) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [multi, lockKeys, step])

  const duration = item.duration ?? (dims?.secs ? mmss(dims.secs) : undefined)
  const s = side(item, { dims, duration })
  const realVideo = item.kind === "video" && isRealVideo({ kind: "video", src: item.src })
  const darkBtn = "text-white hover:bg-white/15 hover:text-white"

  return (
    <>
      <div className="dark flex min-h-0 min-w-0 flex-col bg-neutral-950 text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="truncate font-medium">{item.name}</p>
          {multi && <span className="text-xs whitespace-nowrap text-white/70">{position}</span>}
          <Button variant="ghost" size="icon-sm" className={cn("ml-auto", darkBtn)} onClick={() => onShare(item)} aria-label="Share">
            <Share2 />
          </Button>
          <Button variant="ghost" size="icon-sm" className={darkBtn} onClick={() => onDownload(item)} aria-label="Download">
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
          {item.kind === "pdf" ? (
            <div className="flex flex-1 px-16 py-2">
              <iframe src={item.src} title={`Preview of ${s.title}`} className="size-full rounded-md bg-white" />
            </div>
          ) : realVideo && unplayable ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-16 py-2 text-center">
              <Video className="size-10 text-white/60" aria-hidden />
              <p className="font-medium">This browser can't play this video</p>
              <p className="max-w-sm text-sm text-white/70">
                It's probably HEVC (H.265), the default on many phones. Download it to watch, or record in H.264 / "Most compatible" next time.
              </p>
              <Button variant="secondary" onClick={() => onDownload(item)}>
                <Download data-icon="inline-start" /> Download video
              </Button>
            </div>
          ) : realVideo ? (
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
                alt={s.title}
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
          ) : item.kind === "pdf" ? (
            <span className="text-white/70">PDF · {formatSize(item.size)}</span>
          ) : (
            <span className="text-white/70">
              Video{duration && ` · ${duration}`} · {formatSize(item.size)}
            </span>
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-popover">
        <div className="space-y-2 border-b p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{s.eyebrow}</p>
          <DialogTitle className="text-left text-base">{s.title}</DialogTitle>
          <DialogDescription className="sr-only">Preview and details for {item.name}</DialogDescription>
          {s.tags}
        </div>
        {s.body}
      </aside>
    </>
  )
}

/** One label / value line in a viewer's details list. */
export function ViewerRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </>
  )
}

/* ---------- Project Gallery ---------- */

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
  return (
    <ItemViewer
      list={list}
      index={index}
      onIndexChange={onIndexChange}
      onClose={onClose}
      onShare={(m) => void shareMedia(m)}
      onDownload={(m) => actions.download(m.id)}
      lockKeys={edit.editing}
      side={(item, { dims, duration }) => ({
        eyebrow: (
          <>
            {item.kind === "video" ? "Video" : "Photo"} · {viewLabel(item.view)}
          </>
        ),
        title: mediaLabel(item),
        tags: <MediaTags item={item} />,
        body: edit.editing ? (
          <EditDetails key={item.id} item={item} edit={edit} />
        ) : (
          <GalleryDetails item={item} isCover={item.id === coverId} coverLabel={coverLabel} actions={actions} dims={dims} duration={duration} onEdit={() => edit.onEditingChange(true)} />
        ),
      })}
    />
  )
}

function GalleryDetails({
  item,
  isCover,
  coverLabel,
  actions,
  dims,
  duration,
  onEdit,
}: {
  item: MediaItem
  isCover: boolean
  coverLabel: string | null
  actions: MediaActions
  dims: ViewerInfo["dims"]
  duration?: string
  onEdit: () => void
}) {
  return (
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
        <ViewerRow k="Caption" v={item.caption || <span className="font-normal text-muted-foreground">No caption</span>} />
        <ViewerRow k="Album" v={item.album || "—"} />
        {item.view === "site" && <ViewerRow k="Zone" v={item.zone || "—"} />}
        <ViewerRow k="Service" v={item.discipline || "—"} />
        <ViewerRow k="Taken" v={formatDateTime(item.at)} />
        <ViewerRow k="Uploaded" v={item.uploadedAt ? formatDateTime(item.uploadedAt) : "—"} />
        <ViewerRow k="Uploaded by" v={item.by} />
      </dl>
      <Separator />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <ViewerRow k="File name" v={<span className="break-all">{item.name}</span>} />
        <ViewerRow k="Type" v={(item.name.split(".").pop() ?? "").toUpperCase() || (item.kind === "video" ? "Video" : "Photo")} />
        <ViewerRow k="Size" v={formatSize(item.size)} />
        {dims && dims.w > 0 && <ViewerRow k="Resolution" v={`${dims.w} × ${dims.h} px`} />}
        {duration && <ViewerRow k="Duration" v={duration} />}
      </dl>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => actions.download(item.id)}>
          <Download data-icon="inline-start" /> Download
        </Button>
        <Button variant="outline" onClick={() => void shareMedia(item)}>
          <Share2 data-icon="inline-start" /> Share
        </Button>
        <Button variant="outline" className="col-span-2" onClick={onEdit}>
          <Pencil data-icon="inline-start" /> Edit details
        </Button>
        {actions.remove && (
          <Button variant="destructive" className="col-span-2" onClick={() => actions.remove?.([item.id])}>
            <Trash2 data-icon="inline-start" /> Delete
          </Button>
        )}
      </div>
    </div>
  )
}

/** Inline edit form in the side panel: caption, album, service, and for Site View the zone. */
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
    const ok = await onSave(item.id, { caption: caption.trim(), album: clean(album), discipline: clean(discipline), ...(site ? { zone: zone.trim() } : {}) })
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
      <GallerySelect label="Album" value={album} onChange={setAlbum} options={optionsWithNone("No album", albums[item.view] ?? [])} />
      {site && <ZoneField id="edit-zone" value={zone} onChange={setZone} zones={zones} />}
      <GallerySelect label="Service" value={discipline} onChange={setDiscipline} options={optionsWithNone("Not set", services)} />
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
