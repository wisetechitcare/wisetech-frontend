import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Maximize, Pause, Pencil, Play, Star, Trash2, Volume2, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/ds/ui/dialog"
import { Separator } from "@/ds/ui/separator"
import { cn } from "@/ds/lib/utils"
import { MediaTags, type MediaActions } from "./MediaCard"
import { formatDateTime, formatSize, isRealVideo, mediaLabel, type MediaItem } from "./media"

const seconds = (d?: string) => {
  const [m, s] = (d ?? "0:00").split(":").map(Number)
  return m * 60 + s
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/** Large preview: images zoom (fit → 300%), videos get a player mock. Arrow keys move between items. */
export function MediaViewer({
  list,
  index,
  coverId,
  coverLabel,
  actions,
  onIndexChange,
  onClose,
}: {
  list: MediaItem[]
  index: number | null
  coverId: string | null
  coverLabel: string | null
  actions: MediaActions
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const item = index === null ? null : list[index]
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="h-[92vh] max-w-[calc(100%-2rem)] grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-[min(1500px,calc(100%-2rem))] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1"
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
  step,
}: {
  item: MediaItem
  position: string
  multi: boolean
  isCover: boolean
  coverLabel: string | null
  actions: MediaActions
  step: (d: number) => void
}) {
  const [zoom, setZoom] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const total = seconds(item.duration)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT((v) => Math.min(total, v + 0.25)), 250)
    return () => clearInterval(id)
  }, [playing, total])
  useEffect(() => {
    if (t >= total) setPlaying(false)
  }, [t, total])

  useEffect(() => {
    if (!multi) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [multi, step])

  const label = mediaLabel(item)

  return (
    <>
      <div className="dark flex min-h-0 min-w-0 flex-col bg-neutral-950 text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="truncate font-medium">{item.name}</p>
          {multi && <span className="text-xs whitespace-nowrap text-white/70">{position}</span>}
          <Button variant="ghost" size="icon-sm" className="ml-auto text-white hover:bg-white/15 hover:text-white" onClick={() => actions.download(item.id)} aria-label="Download">
            <Download />
          </Button>
          <DialogClose render={<Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" aria-label="Close preview" />}>
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
          {isRealVideo(item) ? (
            <div className="flex flex-1 items-center justify-center px-16 py-2">
              <video src={item.src} controls autoPlay playsInline className="max-h-full w-full max-w-5xl rounded-xl bg-black" />
            </div>
          ) : item.kind === "video" ? (
            <div className="flex flex-1 items-center justify-center px-16 py-2">
              <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-black">
                <img src={item.src} alt="" className="size-full object-cover opacity-75" />
                {!playing && (
                  <Button variant="secondary" className="absolute top-1/2 left-1/2 size-18 -translate-1/2 rounded-full" onClick={() => setPlaying(true)} aria-label="Play video">
                    <Play className="ml-1 size-7! fill-current" />
                  </Button>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-linear-to-t from-black/85 to-transparent px-4 pt-8 pb-3 text-xs">
                  <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause /> : <Play />}
                  </Button>
                  <span className="tabular">
                    {mmss(t)} / {item.duration}
                  </span>
                  <div className="relative h-1.5 flex-1 rounded-full bg-white/30" role="progressbar" aria-label="Playback position" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(t)}>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${(t / total) * 100}%` }} />
                  </div>
                  <Volume2 className="size-4" aria-hidden />
                  <Maximize className="size-4" aria-hidden />
                </div>
              </div>
            </div>
          ) : (
            <div className={cn("flex flex-1 overflow-auto px-16 py-2", zoom === 1 ? "items-center justify-center" : "items-start justify-start")}>
              <img
                src={item.src}
                alt={label}
                className={cn("rounded-md", zoom === 1 ? "max-h-full max-w-full object-contain" : "max-w-none")}
                style={zoom > 1 ? { width: `${zoom * 100}%` } : undefined}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs">
          {item.kind === "image" ? (
            <>
              <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out">
                <ZoomOut />
              </Button>
              <span className="tabular w-14 text-center" aria-live="polite">
                {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
              </span>
              <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))} aria-label="Zoom in">
                <ZoomIn />
              </Button>
              <Button variant="outline" size="xs" onClick={() => setZoom(1)}>
                Fit to screen
              </Button>
            </>
          ) : (
            <span className="text-white/70">
              Video{item.duration && ` · ${item.duration}`} · {formatSize(item.size)}
            </span>
          )}
        </div>
      </div>

      <aside className="flex min-h-0 flex-col overflow-y-auto bg-popover">
        <div className="space-y-2 border-b p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {item.kind === "video" ? "Video" : "Photo"} · {item.view === "project" ? "Project View" : "Site View"}
          </p>
          <DialogTitle className="text-base">{label}</DialogTitle>
          <DialogDescription className="sr-only">Preview and details for {item.name}</DialogDescription>
          <MediaTags item={item} />
        </div>
        <div className="space-y-4 p-5">
          <div className={cn("space-y-2 rounded-2xl border p-3", isCover && "border-amber-400 bg-warning-soft")}>
            {item.kind === "video" ? (
              <>
                <p className="text-sm font-semibold">Project cover</p>
                <p className="text-xs text-muted-foreground">Videos can&apos;t be used as the project cover in this version. Pick a photo instead.</p>
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
            <dt className="text-muted-foreground">File name</dt>
            <dd className="font-medium break-all">{item.name}</dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium">
              {formatSize(item.size)}
              {item.duration && ` · ${item.duration}`}
            </dd>
            <dt className="text-muted-foreground">Caption</dt>
            <dd className="font-medium">{item.caption || <span className="font-normal text-muted-foreground">No caption</span>}</dd>
            <dt className="text-muted-foreground">Album</dt>
            <dd className="font-medium">{item.album || "—"}</dd>
            {item.view === "site" && (
              <>
                <dt className="text-muted-foreground">Zone</dt>
                <dd className="font-medium">{item.zone || "—"}</dd>
                <dt className="text-muted-foreground">Discipline</dt>
                <dd className="font-medium">{item.discipline || "—"}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Uploaded by</dt>
            <dd className="font-medium">{item.by}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDateTime(item.at)}</dd>
          </dl>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => actions.download(item.id)}>
              <Download data-icon="inline-start" /> Download
            </Button>
            <Button variant="outline" onClick={() => actions.edit(item.id)}>
              <Pencil data-icon="inline-start" /> Edit details
            </Button>
            <Button variant="outline" className="col-span-2 text-destructive" onClick={() => actions.remove([item.id])}>
              <Trash2 data-icon="inline-start" /> Delete
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
