import * as React from "react"
import { ImageUp, Trash2 } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { Input } from "@/ds/ui/input"
import { Spinner } from "@/ds/ui/spinner"

/**
 * One image — a photo, a logo, a signature. Drop it or browse; it uploads at once and shows a preview.
 * Replaces the live kit's `WtImageField` (same `upload(file) → url` contract). Type and size are checked
 * before uploading, and a failure says what went wrong.
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
  className?: string
}) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hintId = `${id}-hint`

  async function take(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!accept.includes(file.type)) {
      setError(`That file type isn't allowed. Use ${accept.map((a) => a.split("/")[1].toUpperCase()).join(", ")}.`)
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`That image is larger than ${maxSizeMB} MB.`)
      return
    }
    setBusy(true)
    try {
      onChange(await upload(file))
    } catch {
      setError("Upload failed. Check your connection and try again.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>
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
          ) : value ? (
            <img src={value} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <ImageUp aria-hidden className="size-6" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint ?? `Drop an image here or browse. ${accept.map((a) => a.split("/")[1].toUpperCase()).join(", ")} up to ${maxSizeMB} MB.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
              {value ? "Replace" : "Browse"}
            </Button>
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
