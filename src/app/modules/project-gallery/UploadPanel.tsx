import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, Check, Images, RefreshCw, Upload, Video, X } from "lucide-react"
import type { Accept } from "react-dropzone"
import { Button } from "@/ds/ui/button"
import { Progress } from "@/ds/ui/progress"
import { Tabs, TabsTrigger } from "@/ds/ui/tabs"
import { cn } from "@/ds/lib/utils"
import FileUpload from "@app/modules/common/components/FileUpload"
import { apiErrorMessage } from "@utils/apiError"
import { GallerySelect, NONE, TOGGLE_TAB, ToggleList, optionsWithNone } from "./GalleryDialogs"
import { IMAGE_MAX_MB, VIDEO_MAX_MB, formatSize, viewLabel, type Albums, type GalleryApi, type GalleryView } from "./media"

type Status = "uploading" | "done" | "failed"
interface Job {
  file: File
  preview: string | null
  status: Status
  pct: number
  error?: string
}

/**
 * The inline upload section shared by every media-style collection (Project Gallery, Company Catalogues):
 * drop files, then watch each one upload as a thumbnail tile (progress, a check when done, Retry on a
 * failure). Once every file has uploaded it closes by itself; any failure keeps it open for Retry.
 *
 * The screen supplies what is specific to it: the copy, what may be dropped, its own fields (`controls`,
 * locked once uploading starts) and `upload`, which stores one file and reports progress.
 */
export function UploadJobsPanel({
  title,
  description,
  controls,
  accept,
  maxFiles,
  maxSizeMB,
  noun,
  hint,
  skip,
  skipNote,
  placeholderIcon = <Video className="size-8" aria-hidden />,
  oneAtATime = false,
  upload,
  onClose,
}: {
  title: string
  description: ReactNode
  controls?: (locked: boolean) => ReactNode
  accept: Accept
  maxFiles: number
  maxSizeMB: number
  noun?: string
  hint?: ReactNode
  /** Files to leave out of the batch (e.g. over a per-type limit); `skipNote` says why. */
  skip?: (file: File) => boolean
  skipNote?: (skipped: File[]) => ReactNode
  /** Tile shown for a file the browser can't preview (anything but an image). */
  placeholderIcon?: ReactNode
  /** Upload one file at a time instead of all at once, for servers that parse each file. */
  oneAtATime?: boolean
  upload: (file: File, onProgress: (pct: number) => void) => Promise<void>
  /** Called with how many files were uploaded. */
  onClose: (count: number) => void
}) {
  const [picked, setPicked] = useState<File[]>([])
  const [jobs, setJobs] = useState<Job[] | null>(null)

  const skipped = skip ? picked.filter(skip) : []
  const ready = skip ? picked.filter((f) => !skip(f)) : picked
  const busy = !!jobs?.some((j) => j.status === "uploading")
  const done = jobs?.filter((j) => j.status === "done").length ?? 0

  const patch = (i: number, p: Partial<Job>) => setJobs((prev) => prev && prev.map((j, k) => (k === i ? { ...j, ...p } : j)))

  const run = (file: File, i: number) => {
    patch(i, { status: "uploading", pct: 0, error: undefined })
    return upload(file, (pct) => patch(i, { pct: Math.min(99, Math.round(pct)) }))
      .then(() => patch(i, { status: "done", pct: 100 }))
      .catch((err) => patch(i, { status: "failed", error: apiErrorMessage(err, (err as Error)?.message || "Upload failed.") }))
  }

  const start = () => {
    setJobs(ready.map((file) => ({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, status: "uploading", pct: 0 })))
    if (oneAtATime) void ready.reduce((p, f, i) => p.then(() => run(f, i)), Promise.resolve())
    else ready.forEach(run)
  }

  const close = () => onClose(done)

  // Everything uploaded: close by itself. Any failure keeps the panel open for Retry.
  const allDone = !!jobs?.length && done === jobs.length
  useEffect(() => {
    if (allDone) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once, when the last upload lands
  }, [allDone])

  return (
    <section aria-label={title} className="space-y-4 border-b bg-muted/30 px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Upload className="size-4" aria-hidden />
        </span>
        <div className="mr-auto">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} disabled={busy} aria-label="Close upload">
          <X />
        </Button>
      </div>

      {controls?.(!!jobs)}

      {!jobs ? (
        <div>
          <FileUpload acceptTypes={accept} maxFiles={maxFiles} maxSizeMB={maxSizeMB} noun={noun} onFilesChange={setPicked} hint={hint} />
          {skipped.length > 0 && skipNote && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-destructive-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {skipNote(skipped)}
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
                  <span className="grid size-full place-items-center text-muted-foreground">{placeholderIcon}</span>
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
                    <Button variant="outline" size="xs" onClick={() => void run(j.file, i)}>
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

/* ---------- Project Gallery ---------- */

export interface UploadResult {
  dest: GalleryView
  album: string
  count: number
}

// What the server accepts: images go through the shared pipeline (JPEG/PNG/WEBP/GIF),
// videos are PUT to S3 and verified as MP4/MOV.
const ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  "video/*": [".mp4", ".mov"],
}
const isVideo = (f: File) => /\.(mp4|mov)$/i.test(f.name)
const tooBig = (f: File) => !isVideo(f) && f.size > IMAGE_MAX_MB * 1048576

/**
 * The gallery's upload: pick the view (and optionally album / service), drop files, then watch each one
 * upload. Captions and zones are set per item afterwards.
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
  const clean = (v: string) => (v === NONE ? "" : v)

  return (
    <UploadJobsPanel
      title="Upload media"
      description="Captions and zones can be added to each item after upload."
      accept={ACCEPT}
      maxFiles={50}
      maxSizeMB={VIDEO_MAX_MB}
      hint={
        <p className="mt-2 text-sm text-gray-500">
          Photos up to {IMAGE_MAX_MB} MB (JPG, PNG, WEBP, GIF) · Videos up to {VIDEO_MAX_MB} MB (MP4, MOV) · up to 50 files
        </p>
      }
      skip={tooBig}
      skipNote={(over) => (
        <>
          {over.length === 1 ? `“${over[0].name}” is` : `${over.length} photos are`} over the {IMAGE_MAX_MB} MB photo limit and will be skipped.
        </>
      )}
      controls={(locked) => (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Upload to</p>
            <Tabs
              value={dest}
              onValueChange={(v) => {
                if (locked) return
                setDest(v as GalleryView)
                setAlbum(NONE) // albums belong to one view
              }}
            >
              <ToggleList aria-label="Upload to">
                {views.map((v) => (
                  <TabsTrigger key={v} value={v} disabled={locked} className={TOGGLE_TAB}>
                    <Images /> {viewLabel(v)}
                  </TabsTrigger>
                ))}
              </ToggleList>
            </Tabs>
          </div>
          <GallerySelect className="w-56" label="Album (optional)" value={album} onChange={setAlbum} options={optionsWithNone("No album", albums[dest] ?? [])} disabled={locked} />
          <GallerySelect className="w-56" label="Service (optional)" value={discipline} onChange={setDiscipline} options={optionsWithNone("Not set", services)} disabled={locked} />
        </div>
      )}
      upload={(file, onProgress) => api.upload(file, { view: dest, album: clean(album), discipline: clean(discipline) }, onProgress)}
      onClose={(count) => onClose({ dest, album: clean(album), count })}
    />
  )
}
