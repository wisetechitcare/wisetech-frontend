import { useEffect, useState } from "react"
import { AlertCircle, Check, Images, RefreshCw, Upload, Video, X } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Progress } from "@/ds/ui/progress"
import { Tabs, TabsTrigger } from "@/ds/ui/tabs"
import { cn } from "@/ds/lib/utils"
import FileUpload from "@app/modules/common/components/FileUpload"
import { apiErrorMessage } from "@utils/apiError"
import { GallerySelect, NONE, TOGGLE_TAB, ToggleList, optionsWithNone } from "./GalleryDialogs"
import { IMAGE_MAX_MB, VIDEO_MAX_MB, formatSize, viewLabel, type Albums, type GalleryApi, type GalleryView } from "./media"

export interface UploadResult {
  dest: GalleryView
  album: string
  count: number
}

type Status = "uploading" | "done" | "failed"
interface Job {
  file: File
  preview: string | null
  status: Status
  pct: number
  error?: string
}

// What the server accepts: images go through the shared pipeline (JPEG/PNG/WEBP/GIF, 10 MB),
// videos are PUT to S3 and verified as MP4/MOV (200 MB).
const ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  "video/*": [".mp4", ".mov"],
}
const isVideo = (f: File) => /\.(mp4|mov)$/i.test(f.name)
const tooBig = (f: File) => !isVideo(f) && f.size > IMAGE_MAX_MB * 1048576

/**
 * Inline upload section (not a modal): pick the view (and optionally album / service), drop files,
 * then watch each one upload as a thumbnail. Captions and zones are set per item afterwards.
 */
export function UploadPanel({
  initialView,
  initialAlbum,
  albums,
  views,
  services,
  api,
  onClose,
}: {
  initialView: GalleryView
  initialAlbum?: string
  albums: Albums
  views: GalleryView[]
  services: string[]
  api: Pick<GalleryApi, "upload">
  onClose: (result: UploadResult) => void
}) {
  const [dest, setDest] = useState<GalleryView>(initialView)
  const [album, setAlbum] = useState(initialAlbum && albums[initialView]?.includes(initialAlbum) ? initialAlbum : NONE)
  const [discipline, setDiscipline] = useState(NONE)
  const [picked, setPicked] = useState<File[]>([])
  const [jobs, setJobs] = useState<Job[] | null>(null)

  const clean = (v: string) => (v === NONE ? "" : v)
  const oversized = picked.filter(tooBig)
  const ready = picked.filter((f) => !tooBig(f))
  const busy = !!jobs?.some((j) => j.status === "uploading")
  const done = jobs?.filter((j) => j.status === "done").length ?? 0

  const patch = (i: number, p: Partial<Job>) => setJobs((prev) => prev && prev.map((j, k) => (k === i ? { ...j, ...p } : j)))

  const run = (file: File, i: number) => {
    patch(i, { status: "uploading", pct: 0, error: undefined })
    const meta = { view: dest, album: clean(album), discipline: clean(discipline) }
    api
      .upload(file, meta, (pct) => patch(i, { pct: Math.min(99, Math.round(pct)) }))
      .then(() => patch(i, { status: "done", pct: 100 }))
      .catch((err) => patch(i, { status: "failed", error: apiErrorMessage(err, (err as Error)?.message || "Upload failed.") }))
  }

  const start = () => {
    setJobs(ready.map((file) => ({ file, preview: isVideo(file) ? null : URL.createObjectURL(file), status: "uploading", pct: 0 })))
    ready.forEach(run)
  }

  const close = () => onClose({ dest, album: clean(album), count: done })

  // Everything uploaded: close by itself. Any failure keeps the panel open for Retry.
  const allDone = !!jobs?.length && done === jobs.length
  useEffect(() => {
    if (allDone) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once, when the last upload lands
  }, [allDone])

  return (
    <section aria-label="Upload media" className="space-y-4 border-b bg-muted/30 px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Upload className="size-4" aria-hidden />
        </span>
        <div className="mr-auto">
          <h3 className="font-semibold">Upload media</h3>
          <p className="text-xs text-muted-foreground">Captions and zones can be added to each item after upload.</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} disabled={busy} aria-label="Close upload">
          <X />
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Upload to</p>
          <Tabs
            value={dest}
            onValueChange={(v) => {
              if (jobs) return
              setDest(v as GalleryView)
              setAlbum(NONE) // albums belong to one view
            }}
          >
            <ToggleList aria-label="Upload to">
              {views.map((v) => (
                <TabsTrigger key={v} value={v} disabled={!!jobs} className={TOGGLE_TAB}>
                  <Images /> {viewLabel(v)}
                </TabsTrigger>
              ))}
            </ToggleList>
          </Tabs>
        </div>
        <GallerySelect className="w-56" label="Album (optional)" value={album} onChange={setAlbum} options={optionsWithNone("No album", albums[dest] ?? [])} disabled={!!jobs} />
        <GallerySelect className="w-56" label="Service (optional)" value={discipline} onChange={setDiscipline} options={optionsWithNone("Not set", services)} disabled={!!jobs} />
      </div>

      {!jobs ? (
        <div>
          <FileUpload
            acceptTypes={ACCEPT}
            maxFiles={50}
            maxSizeMB={VIDEO_MAX_MB}
            onFilesChange={setPicked}
            hint={
              <p className="mt-2 text-sm text-gray-500">
                Photos up to {IMAGE_MAX_MB} MB (JPG, PNG, WEBP, GIF) · Videos up to {VIDEO_MAX_MB} MB (MP4, MOV) · up to 50 files
              </p>
            }
          />
          {oversized.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-destructive-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {oversized.length === 1 ? `“${oversized[0].name}” is` : `${oversized.length} photos are`} over the {IMAGE_MAX_MB} MB photo limit and will be skipped.
            </p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3" aria-label="Upload progress">
          {jobs.map((j, i) => (
            <li key={`${j.file.name}-${i}`} className={cn("overflow-hidden rounded-xl border bg-background", j.status === "failed" && "border-destructive")}>
              <div className="relative aspect-4/3 bg-muted">
                {j.preview ? (
                  <img src={j.preview} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground">
                    <Video className="size-8" aria-hidden />
                  </span>
                )}
                {j.status === "done" && (
                  <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-success text-white">
                    <Check className="size-4" aria-label="Uploaded" />
                  </span>
                )}
              </div>
              <div className="space-y-1.5 p-2.5">
                <p className="truncate text-xs font-medium" title={j.file.name}>
                  {j.file.name}
                </p>
                {j.status === "uploading" && <Progress value={j.pct} aria-label={`Uploading ${j.file.name}`} />}
                {j.status === "done" && <p className="text-xs text-success-foreground">Uploaded · {formatSize(j.file.size / 1048576)}</p>}
                {j.status === "failed" && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-destructive-foreground">{j.error}</p>
                    <Button variant="outline" size="xs" onClick={() => run(j.file, i)}>
                      <RefreshCw data-icon="inline-start" /> Retry
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-3">
        {jobs && !busy ? (
          <Button onClick={close}>
            <Check data-icon="inline-start" /> Done{done > 0 && ` · ${done} added`}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={start} disabled={!ready.length || busy}>
              <Upload data-icon="inline-start" /> {busy ? "Uploading…" : `Upload ${ready.length || ""} file${ready.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
