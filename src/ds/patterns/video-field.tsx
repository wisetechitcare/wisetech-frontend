import * as React from "react"
import { Trash2, Video } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { titleCase } from "@/ds/lib/text"
import { Button } from "@/ds/ui/button"
import { Input } from "@/ds/ui/input"
import { Progress } from "@/ds/ui/progress"
import { Spinner } from "@/ds/ui/spinner"

const LABELS: Record<string, string> = { "video/mp4": "MP4", "video/webm": "WebM" }
const labelOf = (mime: string) => LABELS[mime] ?? (mime.split("/")[1] ?? mime).toUpperCase()

/**
 * One video — a splash screen or an intro clip. Drop it or browse; it uploads with real progress and plays back as a
 * muted looping preview. The video twin of `ImageField`: same layout, and the same `upload` contract plus an
 * `onProgress` callback, so a large file can go straight to storage with a presigned URL. Type and size are checked
 * before anything is sent, and a failure says what went wrong.
 *
 * `disabledReason` turns the field off and is shown in place of the hint (e.g. "Save the profile first").
 */
export function VideoField({
  id,
  label,
  value,
  onChange,
  upload,
  hint,
  accept = ["video/mp4"],
  maxSizeMB = 25,
  disabled,
  disabledReason,
  className,
}: {
  id: string
  label: string
  /** Current video URL. */
  value?: string | null
  onChange: (url: string | null) => void
  /** Uploads the file, reporting 0–100, and resolves to the URL to store. */
  upload: (file: File, onProgress: (pct: number) => void) => Promise<string>
  hint?: string
  /** MIME types accepted. Default MP4 — the one type every browser plays. */
  accept?: string[]
  maxSizeMB?: number
  disabled?: boolean
  disabledReason?: string
  className?: string
}) {
  const [progress, setProgress] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  // The picked file plays from the browser while it uploads; the stored URL takes over once the parent passes it back.
  const [local, setLocal] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hintId = `${id}-hint`
  const off = disabled || !!disabledReason
  const busy = progress !== null
  const shown = local ?? value ?? null
  const types = accept.map(labelOf).join(" or ")

  async function take(file: File | undefined) {
    if (!file || off || busy) return
    setError(null)
    if (!accept.includes(file.type)) {
      setError(`That file type isn't allowed. Use ${types}.`)
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${maxSizeMB} MB.`)
      return
    }
    const url = URL.createObjectURL(file)
    setLocal(url)
    setProgress(0)
    try {
      onChange(await upload(file, (pct) => setProgress(Math.round(pct))))
    } catch (e) {
      setError((e as Error)?.message || "Upload failed. Check your connection and try again.")
    } finally {
      setProgress(null)
      setLocal(null)
      URL.revokeObjectURL(url)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-medium">{titleCase(label)}</span>
      <div
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          if (!off) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void take(e.dataTransfer.files[0])
        }}
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors data-dragging:border-primary data-dragging:bg-accent/40",
          error && "border-destructive",
          off && "opacity-60",
        )}
      >
        <div className="relative grid aspect-video w-44 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
          {shown ? (
            <video src={shown} muted loop autoPlay playsInline aria-label={`${label} preview`} className="size-full object-cover" />
          ) : (
            <Video aria-hidden className="size-6" />
          )}
          {busy && (
            <div className="absolute inset-x-0 bottom-0 grid gap-1 bg-background/85 p-2">
              <Progress value={progress} aria-label={`Uploading ${label}`} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p id={hintId} className={cn("text-sm", error ? "text-destructive-foreground" : "text-muted-foreground")} role={error ? "alert" : undefined}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" aria-hidden /> Uploading… {progress}%
              </span>
            ) : (
              error || disabledReason || hint || `Drop a file here or browse. ${types} up to ${maxSizeMB} MB.`
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={off || busy} onClick={() => inputRef.current?.click()}>
              {shown ? "Replace" : "Browse"}
            </Button>
            {value && !busy && (
              <Button size="sm" variant="tinted" className="[--tint:var(--cta-danger)]" disabled={off} onClick={() => { setError(null); onChange(null) }}>
                <Trash2 data-icon="inline-start" aria-hidden /> Remove
              </Button>
            )}
          </div>
        </div>
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept.join(",")}
          aria-label={label}
          aria-describedby={hintId}
          disabled={off || busy}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => void take(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
