/** Project Gallery: shared types, limits and formatting (used by the real tab and the Storybook prototype). */
export type GalleryView = "project" | "site"
export type MediaKind = "image" | "video"
export type Albums = Record<GalleryView, string[]>

export interface MediaItem {
  id: string
  view: GalleryView
  kind: MediaKind
  name: string
  caption: string
  album: string
  /** Site View only */
  zone?: string
  /** Shown as "Service": a project service name from Leads → Configure (stored as `discipline`). */
  discipline?: string
  by: string
  /** When it was uploaded (real items only) */
  uploadedAt?: string
  /** When it was taken (ISO or local "YYYY-MM-DDTHH:mm") */
  at: string
  /** Megabytes */
  size: number
  /** Videos only, "m:ss" — unknown for real uploads */
  duration?: string
  src: string
}

export interface ProjectInfo {
  name: string
  initials: string
}

/** What the upload dialog collects once per batch. Caption and zone are set per item afterwards. */
export interface UploadMeta {
  view: GalleryView
  album: string
  discipline: string
}

/** Everything the gallery changes goes through here — the API in the app, local state in Storybook. */
export interface GalleryApi {
  setCover: (id: string | null) => Promise<void>
  remove: (ids: string[]) => Promise<void>
  saveDetails: (id: string, patch: Partial<Pick<MediaItem, "caption" | "album" | "zone" | "discipline">>) => Promise<void>
  createAlbum: (view: GalleryView, name: string) => Promise<void>
  /** Uploads and registers one file; resolves once it is in the gallery. */
  upload: (file: File, meta: UploadMeta, onProgress: (pct: number) => void) => Promise<void>
}

/** Storybook's stand-in for the project services configured under Leads → Configure → Services. */
export const DEMO_SERVICES = ["MEP", "HVAC", "Electrical", "Plumbing", "Fire Fighting", "Interiors"]
/** Images go through the shared upload pipeline, which caps every file at 10 MB (multer + nginx). */
export const IMAGE_MAX_MB = 10
/** Videos are PUT straight to S3; the server refuses anything bigger. */
export const VIDEO_MAX_MB = 200

/* ---------- Formatting (no toLocaleDateString: lint-banned) ---------- */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const pad = (n: number) => String(n).padStart(2, "0")

export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Local calendar day of a timestamp — the Site View grouping key. */
export const dayKey = (at: string) => isoLocal(new Date(at)).slice(0, 10)

export function formatDateTime(at: string) {
  const d = new Date(at)
  const h = d.getHours() % 12 || 12
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${h}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? "PM" : "AM"}`
}

export function formatDay(day: string, now: Date) {
  const d = new Date(`${day}T00:00`)
  const today = new Date(`${isoLocal(now).slice(0, 10)}T00:00`)
  const diff = Math.round((today.getTime() - d.getTime()) / 864e5)
  const base = `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`
  return diff === 0 ? `Today · ${base}` : diff === 1 ? `Yesterday · ${base}` : base
}

export const formatSize = (mb: number) => (mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(mb * 1024))} KB`)
export const mediaLabel = (m: MediaItem) => m.caption || m.name
export const mediaSource = (m: MediaItem) =>
  m.view === "project" ? `Project View${m.album ? ` · ${m.album}` : ""}` : `Site View${m.zone ? ` · ${m.zone}` : ""}`
/** A stored video file (Storybook's demo videos are still images). */
export const isRealVideo = (m: Pick<MediaItem, "kind" | "src">) => m.kind === "video" && !m.src.startsWith("data:")

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "P"
