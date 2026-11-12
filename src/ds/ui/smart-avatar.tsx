import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { X } from "lucide-react"
import { cn } from "cn"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "./dialog"

/**
 * The ONE avatar for a person, contact, company or project, everywhere in the app (the look first built for
 * Contacts). A photo or logo shows when there is one and loads; otherwise the initials sit on a deterministic
 * dark gradient with a faint geometric accent, so the same name always gets the same tile.
 *
 * - The ring is a thin gradient: brand-tinted from the image's own colours when they can be sampled, silver
 *   when they can't (a cross-origin photo), and the tile's palette when there is no image.
 * - The initials show while the photo loads and stay if it fails, so a broken URL never leaves an empty circle.
 * - `status` adds a dot with a text label (colour alone is not enough).
 * - `preview` makes a loaded image open full size in a dialog.
 */

export type SmartAvatarStatus = "active" | "inactive" | "verified" | "premium"
export type SmartAvatarSize = "xs" | "sm" | "default" | "lg" | "xl"

const SIZE_PX: Record<SmartAvatarSize, number> = { xs: 24, sm: 32, default: 40, lg: 56, xl: 84 }

const STATUS: Record<SmartAvatarStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success" },
  inactive: { label: "Inactive", className: "bg-muted-foreground" },
  verified: { label: "Verified", className: "bg-info" },
  premium: { label: "Premium", className: "bg-chart-4" },
}

// Dark tiles with light ink: they read the same in light and dark mode, so they are deliberately not theme tokens.
const PALETTES = [
  { from: "#1e293b", to: "#0f172a", ringA: "#475569", ringB: "#334155", text: "#f8fafc" }, // graphite
  { from: "#312e81", to: "#1e1b4b", ringA: "#6366f1", ringB: "#4f46e5", text: "#f5f3ff" }, // indigo
  { from: "#164e63", to: "#083344", ringA: "#06b6d4", ringB: "#0891b2", text: "#ecfeff" }, // cyan
  { from: "#115e59", to: "#042f2e", ringA: "#14b8a6", ringB: "#0d9488", text: "#f0fdfa" }, // teal
  { from: "#14532d", to: "#052e16", ringA: "#22c55e", ringB: "#16a34a", text: "#f0fdf4" }, // forest
  { from: "#7c2d12", to: "#431407", ringA: "#f97316", ringB: "#ea580c", text: "#fff7ed" }, // terracotta
  { from: "#581c87", to: "#2e1065", ringA: "#a855f7", ringB: "#9333ea", text: "#faf5ff" }, // purple
  { from: "#1e3a8a", to: "#172554", ringA: "#3b82f6", ringB: "#2563eb", text: "#eff6ff" }, // navy
  { from: "#701a75", to: "#4a044e", ringA: "#d946ef", ringB: "#c084fc", text: "#faf5ff" }, // plum
  { from: "#854d0e", to: "#422006", ringA: "#eab308", ringB: "#ca8a04", text: "#fef9c3" }, // gold
  { from: "#9f1239", to: "#4c0519", ringA: "#f43f5e", ringB: "#e11d48", text: "#fff1f2" }, // crimson
  { from: "#3f3f46", to: "#18181b", ringA: "#71717a", ringB: "#52525b", text: "#fafafa" }, // zinc
]

const SILVER_RING = "linear-gradient(135deg, #e2e8f0, #cbd5e1 50%, #94a3b8)"

/** FNV-1a: fast, deterministic, well spread. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const WORD_SPLIT = new RegExp("\\s+")
const NOT_ALNUM = new RegExp("[^\\p{L}\\p{N}]", "gu")

/**
 * "Meera Joshi" -> "MJ"; "Meera Anand Joshi" -> "MJ" (first + last); "Wisetech" -> "WI"; "" -> "?".
 * Punctuation is skipped, so "(Ex) Rao" -> "ER". The ONE initials rule; every avatar uses it.
 */
export function avatarInitials(name?: string | null): string {
  const words = (name ?? "").trim().split(WORD_SPLIT).map((w) => w.replace(NOT_ALNUM, "")).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** A URL worth trying to load. Blank strings and the literal "null" / "undefined" some APIs send are not. */
function cleanSrc(src?: string | null): string | null {
  const s = src?.trim()
  if (!s || s === "null" || s === "undefined") return null
  return s
}

// ── Brand ring: two muted colours sampled from the image, cached per URL for the session ──────────────────
type Rgb = [number, number, number]
const ringCache = new Map<string, string | null>()

const average = (px: Rgb[]): Rgb => {
  const t = px.reduce<Rgb>((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
  return [Math.round(t[0] / px.length), Math.round(t[1] / px.length), Math.round(t[2] / px.length)]
}
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const soften = (c: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(c[i] + (248 - c[i]) * t)) as Rgb
const mute = (c: Rgb): Rgb => {
  const avg = (c[0] + c[1] + c[2]) / 3
  return [0, 1, 2].map((i) => Math.round(c[i] * 0.68 + avg * 0.32)) as Rgb
}
const rgb = (c: Rgb) => `${c[0]}, ${c[1]}, ${c[2]}`

/**
 * Sample the loaded image. No `crossOrigin` on purpose: forcing CORS makes hosts without the header (the S3
 * photo bucket) fail loudly in the console. Without it the image still displays and only the canvas read is
 * tainted, which lands in the catch as "no ring colours" and the ring falls back to silver.
 */
function brandRing(img: HTMLImageElement): string | null {
  const key = img.currentSrc || img.src
  if (ringCache.has(key)) return ringCache.get(key)!
  let ring: string | null = null
  try {
    const S = 20
    const canvas = document.createElement("canvas")
    canvas.width = S
    canvas.height = S
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(img, 0, 0, S, S)
      const { data } = ctx.getImageData(0, 0, S, S)
      const px: Rgb[] = []
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        if (a < 128) continue
        if (Math.max(r, g, b) > 245 && Math.min(r, g, b) > 240) continue
        if (Math.max(r, g, b) < 15) continue
        px.push([r, g, b])
      }
      if (px.length) {
        const primary = average(px)
        const pool = px.filter((p) => distance(p, primary) > 45)
        const secondary = pool.length > Math.max(4, px.length * 0.08) ? average(pool) : soften(primary, 0.72)
        ring = `linear-gradient(135deg, rgba(${rgb(mute(primary))}, 0.82), rgba(${rgb(mute(secondary))}, 0.52))`
      }
    }
  } catch {
    ring = null
  }
  ringCache.set(key, ring)
  return ring
}

/** A faint pattern behind the initials, one of four, picked by the seed. */
function Accent({ seed }: { seed: string }) {
  const shape = hash(seed) % 4
  return (
    <svg aria-hidden viewBox="0 0 100 100" fill="none" stroke="currentColor" className="absolute inset-0 size-full opacity-10">
      {shape === 0 && (
        <>
          <circle cx="50" cy="50" r="42" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="27" strokeWidth="1.2" />
          <path d="M50 8V92M8 50H92" strokeWidth="1" />
        </>
      )}
      {shape === 1 && <path d="M0 25H100M0 50H100M0 75H100M25 0V100M50 0V100M75 0V100" strokeWidth="1" />}
      {shape === 2 && (
        <>
          <circle cx="0" cy="0" r="55" strokeWidth="1.2" />
          <circle cx="100" cy="0" r="55" strokeWidth="1.2" />
          <circle cx="0" cy="100" r="55" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="55" strokeWidth="1.2" />
        </>
      )}
      {shape === 3 && <path d="M0 0L100 100M100 0L0 100M50 0L100 50M0 50L50 100" strokeWidth="1" />}
    </svg>
  )
}

export type SmartAvatarProps = {
  /** Whose avatar: the accessible name and the source of the initials. */
  name?: string | null
  /** Photo or logo URL. Empty, missing or broken falls back to initials. */
  src?: string | null
  /** Keeps the tile colour stable when names repeat or change (an id). Defaults to the name. */
  seed?: string | number | null
  /** A named step (24 / 32 / 40 / 56 / 84 px) or an exact pixel size. */
  size?: SmartAvatarSize | number
  shape?: "circle" | "rounded"
  /** `cover` fills the tile (people); `contain` shows the whole image inset (logos). Very wide images always contain. */
  fit?: "cover" | "contain"
  status?: SmartAvatarStatus | null
  /** Clicking a loaded image opens it full size. */
  preview?: boolean
  /** For hosts that refuse requests carrying a Referer (Google contact photos need `"no-referrer"`). */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy
  /** Decorative when the name is already written beside it (a table cell); hides it from screen readers. */
  decorative?: boolean
  className?: string
}

export function SmartAvatar({
  name,
  src,
  seed,
  size = "default",
  shape = "circle",
  fit = "cover",
  status,
  preview = false,
  referrerPolicy,
  decorative = false,
  className,
}: SmartAvatarProps) {
  const url = cleanSrc(src)
  const px = Math.max(16, typeof size === "number" ? size : SIZE_PX[size])
  const key = String(seed ?? name ?? "?")
  const palette = PALETTES[hash(key) % PALETTES.length]
  const label = (name ?? "").trim() || "Unknown"

  const [loaded, setLoaded] = React.useState(false)
  const [ring, setRing] = React.useState<string | null>(null)
  const [wide, setWide] = React.useState(false)
  React.useEffect(() => {
    setLoaded(false)
    setRing(null)
    setWide(false)
  }, [url])

  const showImage = Boolean(url && loaded)
  const contain = showImage && (fit === "contain" || wide)
  const outer = shape === "circle" ? "rounded-full" : "rounded-[18%]"
  const inner = shape === "circle" ? "rounded-full" : "rounded-[14%]"
  const statusInfo = status ? STATUS[status] : null
  const accessibleName = statusInfo ? `${label}, ${statusInfo.label}` : label

  const tile = (
    <span
      data-slot="smart-avatar"
      data-shape={shape}
      data-image={showImage ? "" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : accessibleName}
      aria-hidden={decorative || undefined}
      title={label}
      className={cn("relative inline-flex size-(--sa-size) shrink-0 p-[2px] shadow-sm select-none", outer, className)}
      style={
        {
          "--sa-size": `${px}px`,
          background: showImage ? (ring ?? SILVER_RING) : `linear-gradient(135deg, ${palette.ringA}, ${palette.ringB})`,
        } as React.CSSProperties
      }
    >
      <AvatarPrimitive.Root
        className={cn("relative flex size-full items-center justify-center overflow-hidden shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)]", inner)}
        style={{
          background: showImage ? "linear-gradient(145deg, #ffffff, #f8fafc)" : `linear-gradient(140deg, ${palette.from}, ${palette.to})`,
          padding: contain ? Math.max(3, Math.round(px * 0.08)) : 0,
        }}
      >
        {url && (
          <AvatarPrimitive.Image
            src={url}
            alt=""
            referrerPolicy={referrerPolicy}
            draggable={false}
            onLoadingStatusChange={(s) => setLoaded(s === "loaded")}
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalWidth && img.naturalHeight) setWide(img.naturalWidth / img.naturalHeight > 1.5)
              setRing(brandRing(img))
            }}
            className={cn("block size-full", contain ? "object-contain" : "object-cover")}
          />
        )}
        <AvatarPrimitive.Fallback
          className="relative flex size-full items-center justify-center"
          style={{ color: palette.text }}
        >
          <Accent seed={key} />
          <span
            aria-hidden
            className="relative z-[1] leading-none font-semibold tracking-[-0.02em]"
            style={{ fontSize: Math.round(px * 0.35) }}
          >
            {avatarInitials(name)}
          </span>
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {statusInfo && (
        <span
          aria-hidden
          data-slot="smart-avatar-status"
          className={cn(
            "absolute size-(--sa-dot) rounded-full shadow-sm ring-(length:--sa-dot-ring) ring-background",
            shape === "circle" ? "right-[6%] bottom-[6%]" : "right-[1%] bottom-[1%]",
            statusInfo.className
          )}
          style={
            {
              "--sa-dot": `${Math.max(8, Math.round(px * 0.21))}px`,
              "--sa-dot-ring": `${Math.max(2, Math.round(px * 0.035))}px`,
            } as React.CSSProperties
          }
        />
      )}
    </span>
  )

  if (!preview || !showImage) return tile

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`View ${label}'s photo`}
            className={cn("inline-flex shrink-0 cursor-zoom-in focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", outer)}
          />
        }
      >
        {React.cloneElement(tile, { role: undefined, "aria-label": undefined, "aria-hidden": true })}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-[95vw] gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-[95vw]"
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <img
          src={url!}
          alt={label}
          referrerPolicy={referrerPolicy}
          className="max-h-[90vh] max-w-[95vw] min-w-[min(320px,95vw)] rounded-lg object-contain shadow-2xl"
        />
        <DialogClose
          aria-label="Close"
          className="absolute -top-3 -right-3 grid size-8 place-items-center rounded-full bg-background text-foreground shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <X className="size-4" aria-hidden />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
