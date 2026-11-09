import * as React from "react"
import { Eye, FileText, ImageUp, Trash2 } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { titleCase } from "@/ds/lib/text"
import { Button } from "@/ds/ui/button"
import { Input } from "@/ds/ui/input"
import { Spinner } from "@/ds/ui/spinner"

/** The last path segment of a URL or storage path, without its query (presigned URLs carry one). */
const fileNameOf = (v: string) => decodeURIComponent(v.split("?")[0].split("/").pop() || "file")
const isImagePath = (v: string) => /\.(png|jpe?g|webp|gif|avif|heic)$/i.test(v.split("?")[0])
const extOf = (mime: string) => (mime.split("/")[1] ?? mime).replace("jpeg", "jpg").toUpperCase()

/**
 * One file — a photo, a logo, a signature, or a document such as a receipt. Drop it or browse; it uploads at
 * once and shows a preview. Replaces the live kit's `WtImageField` (same `upload(file) → url` contract). Type
 * and size are checked before uploading, and a failure says what went wrong.
 *
 * Documents: put their MIME types in `accept` (e.g. application/pdf). A value that is not an image shows a file
 * tile with its name instead of a thumbnail. When the stored value cannot be displayed directly (a private
 * storage path), pass `previewUrl` for the thumbnail and `onView` to open the full file. `capture` opens the
 * phone camera straight away — a receipt is something you photograph.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  upload,
  hint,
  accept = ["image/png", "image/jpeg", "image/webp"],
  maxSizeMB = 2,
  disabled,
  shape = "square",
  previewUrl,
  onView,
  capture,
  className,
}: {
  id: string
  label: string
  /** Current image URL. */
  value?: string | null
  onChange: (url: string | null) => void
  upload: (file: File) => Promise<string>
  hint?: string
  accept?: string[]
  maxSizeMB?: number
  disabled?: boolean
  /** `round` for a person's photo. */
  shape?: "square" | "round"
  /** What to display when `value` itself can't be (e.g. a presigned URL for a private path). */
  previewUrl?: string | null
  /** Adds a "View" button that opens the full file. */
  onView?: () => void
  /** Open the camera directly on a phone. */
  capture?: "environment" | "user"
  className?: string
}) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  // What the last upload WAS (its MIME type) beats guessing from a URL, which may carry no extension.
  const [uploadedKind, setUploadedKind] = React.useState<"image" | "file" | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hintId = `${id}-hint`
  // Uploaded this session: its own type decides. Otherwise an images-only field holds an image, and a
  // mixed field (receipts: photo or PDF) goes by the file extension.
  const showsImage =
    uploadedKind != null
      ? uploadedKind === "image"
      : accept.every((a) => a.startsWith("image/")) || isImagePath(previewUrl ?? value ?? "")

  async function take(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!accept.includes(file.type)) {
      setError(`That file type isn't allowed. Use ${accept.map(extOf).join(", ")}.`)
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`That file is larger than ${maxSizeMB} MB.`)
      return
    }
    setBusy(true)
    try {
      onChange(await upload(file))
      setUploadedKind(file.type.startsWith("image/") ? "image" : "file")
    } catch {
      setError("Upload failed. Check your connection and try again.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {/* Title Case like every FieldLabel (src/ds/lib/text.ts), so a form reads as one set of labels. */}
      <span className="text-sm font-medium">{titleCase(label)}</span>
      <div
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) void take(e.dataTransfer.files[0])
        }}
        className={cn(
          "flex items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors data-dragging:border-primary data-dragging:bg-accent/40",
          error && "border-destructive",
        )}
      >
        <div
          className={cn(
            "grid size-20 shrink-0 place-items-center overflow-hidden bg-muted text-muted-foreground",
            shape === "round" ? "rounded-full" : "rounded-xl",
          )}
        >
          {busy ? (
            <Spinner className="size-5" aria-label="Uploading" />
          ) : value && showsImage ? (
            <img src={previewUrl ?? value} alt={`${label} preview`} className="size-full object-cover" />
          ) : value ? (
            <FileText aria-hidden className="size-7 text-primary" />
          ) : (
            <ImageUp aria-hidden className="size-6" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          {value && !busy && (
            <p className="truncate text-sm font-medium" title={fileNameOf(value)}>
              {fileNameOf(value)}
            </p>
          )}
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint ?? `Drop a file here or browse. ${accept.map(extOf).join(", ")} up to ${maxSizeMB} MB.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
              {value ? "Replace" : "Browse"}
            </Button>
            {value && onView && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onView}>
                <Eye data-icon="inline-start" aria-hidden /> View
              </Button>
            )}
            {value && (
              <Button size="sm" variant="ghost" disabled={disabled || busy} onClick={() => onChange(null)}>
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
          capture={capture}
          aria-label={label}
          aria-describedby={hintId}
          disabled={disabled || busy}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => void take(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}
