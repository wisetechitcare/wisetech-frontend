import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  Banknote,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  ListChecks,
  Receipt,
  ScrollText,
  Users,
  Video,
  Wallet,
} from "lucide-react"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/ds/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ds/ui/table"
import { Tabs, TabsTrigger } from "@/ds/ui/tabs"
import { TOGGLE_TAB, ToggleList } from "./GalleryDialogs"
import { ProjectAvatar } from "./ProjectAvatar"
import { MediaGalleryScreen, type GalleryLayout } from "./MediaGalleryScreen"
import { DEFAULT_ALBUMS, NOW, PROJECT, demoMedia, scene } from "./fixtures"
import { DEMO_SERVICES, isoLocal, type Albums, type GalleryApi, type GalleryView, type MediaItem } from "./media"

const TABS = [
  { id: "leads", label: "Leads", icon: <Users /> },
  { id: "projects", label: "Projects", icon: <FolderKanban /> },
  { id: "commercial", label: "Commercial", icon: <Wallet /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare /> },
  { id: "deliverables", label: "Deliverables", icon: <ListChecks /> },
  { id: "timesheet", label: "Timesheet", icon: <Clock /> },
  { id: "reimbursement", label: "Reimbursement", icon: <Receipt /> },
  { id: "documents", label: "Documents", icon: <FileText /> },
  { id: "teams", label: "Teams", icon: <Users /> },
  { id: "meetings", label: "Meetings", icon: <Video /> },
  { id: "billing", label: "Billing", icon: <Banknote /> },
  { id: "audit", label: "Audit", icon: <ScrollText /> },
  { id: "gallery", label: "Gallery", icon: <ImageIcon /> },
]


/**
 * Media Gallery prototype (demo data, local state only): the project workspace with the new Gallery tab,
 * plus a preview of where the chosen cover shows up elsewhere in WISETECH.
 */
export function MediaGalleryPrototype({
  initialView = "project",
  initialLayout = "grid",
  initialCoverId = "1",
  empty = false,
}: {
  initialView?: GalleryView
  initialLayout?: GalleryLayout
  /** Id of the demo image used as the starting cover; null starts with no cover (initials). */
  initialCoverId?: string | null
  /** Start with no media at all. */
  empty?: boolean
}) {
  const [items, setItems] = useState<MediaItem[]>(() => (empty ? [] : demoMedia()))
  const [coverId, setCoverId] = useState<string | null>(empty ? null : initialCoverId)
  const [albums, setAlbums] = useState(DEFAULT_ALBUMS)
  const cover = items.find((m) => m.id === coverId) ?? null
  const [api] = useState(() => mockApi(setItems, setCoverId, setAlbums))

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        {/* Project header */}
        <div className="flex flex-wrap items-center gap-3.5">
          <Button variant="outline" size="icon" className="text-destructive" aria-label="Back to projects">
            <ArrowLeft />
          </Button>
          <ProjectAvatar src={cover?.src} label={PROJECT.initials} className="size-13 text-base" />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-success-foreground">
              {PROJECT.code} <span className="font-medium text-muted-foreground">· {PROJECT.revision}</span>
            </p>
            <h1 className="text-2xl font-semibold">{PROJECT.name}</h1>
          </div>
          <Badge variant="brand" dot className="ml-auto h-8 px-3 text-sm">
            {PROJECT.status}
          </Badge>
        </div>

        {/* Workspace tabs: only Gallery is built in this prototype. Mirrors the app's pill tab bar
            (UnderlineTabs in common/components/ui/patterns.tsx), which needs MUI so can't render here. */}
        <Tabs value="gallery" onValueChange={(v) => v !== "gallery" && toast.info("Only the Gallery tab is part of this prototype.")}>
          <ToggleList aria-label="Project workspace" className="max-w-full justify-start overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className={`${TOGGLE_TAB} flex-none`}>
                {t.icon} {t.label}
              </TabsTrigger>
            ))}
          </ToggleList>
        </Tabs>

        <MediaGalleryScreen
          items={items}
          albums={albums}
          services={DEMO_SERVICES}
          coverId={coverId}
          project={PROJECT}
          api={api}
          now={NOW}
          initialView={initialView}
          initialLayout={initialLayout}
        />
      </div>

      <CoverShowcase cover={cover} />
    </div>
  )
}

/** Storybook stand-in for the real API: local state and simulated upload progress. */
function mockApi(
  setItems: Dispatch<SetStateAction<MediaItem[]>>,
  setCoverId: Dispatch<SetStateAction<string | null>>,
  setAlbums: Dispatch<SetStateAction<Albums>>,
): GalleryApi {
  let added = 0
  return {
    setCover: async (id) => setCoverId(id),
    remove: async (ids) => {
      setItems((prev) => prev.filter((m) => !ids.includes(m.id)))
      setCoverId((c) => (c && ids.includes(c) ? null : c))
    },
    saveDetails: async (id, patch) => setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    createAlbum: async (view, name) => setAlbums((prev) => ({ ...prev, [view]: [...prev[view], name] })),
    upload: (file, meta, onProgress) =>
      new Promise((resolve) => {
        let pct = 0
        const video = file.type.startsWith("video")
        const speed = video ? 4 + Math.random() * 4 : 9 + Math.random() * 12
        const timer = setInterval(() => {
          pct = Math.min(100, pct + speed)
          onProgress(pct)
          if (pct < 100) return
          clearInterval(timer)
          const id = `up-${Date.now()}-${++added}`
          setItems((prev) => [
            ...prev,
            {
              id,
              view: meta.view,
              kind: video ? "video" : "image",
              name: file.name,
              caption: "",
              album: meta.album,
              
              discipline: meta.discipline || undefined,
              by: "Mustafa Khan",
              at: isoLocal(new Date(NOW.getTime() + added * 60000)),
              size: file.size / 1048576,
              duration: video ? "0:36" : undefined,
              src: video ? scene(meta.view === "site" ? "ceiling" : "exterior", 950 + added) : URL.createObjectURL(file),
            },
          ])
          resolve()
        }, 160)
      }),
  }
}

/** Where the cover appears outside the Gallery. Updates live when the cover is set, replaced or removed. */
function CoverShowcase({ cover }: { cover: MediaItem | null }) {
  return (
    <section className="space-y-4" aria-labelledby="cover-showcase">
      <div>
        <h2 id="cover-showcase" className="text-lg font-semibold">
          The chosen cover, everywhere the project appears
        </h2>
        <p className="text-sm text-muted-foreground">Preview only. These update the moment a cover is set, replaced or removed. Projects without a cover keep their initials.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" aria-hidden /> Projects
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Project Manager</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ShowcaseRow avatar={<ProjectAvatar src={cover?.src} label={PROJECT.initials} className="size-10" />} name={PROJECT.name} code="#WT/PROJECT/26-27/789" pm="Mustafa Khan" status={<Badge variant="info">On Going</Badge>} />
              <ShowcaseRow avatar={<ProjectAvatar src={scene("rooftop", 99)} className="size-10" label="PT" />} name="Palm Towers HVAC Retrofit" code="#WT/PROJECT/26-27/781" pm="Neha Rao" status={<Badge variant="success">Handover</Badge>} />
              <ShowcaseRow avatar={<ProjectAvatar className="size-10" label="SK" />} name="Sky Kurla Fire Fighting" code="#WT/PROJECT/26-27/774 · no cover" pm="Imran Shaikh" status={<Badge variant="warning">Planning</Badge>} />
            </TableBody>
          </Table>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProjectTile cover={cover} name={PROJECT.name} meta="MEP · Bandra West" initials={PROJECT.initials} />
          <ProjectTile cover={null} name="Sky Kurla Fire Fighting" meta="No cover · initials shown" initials="SK" />
        </div>
      </div>
    </section>
  )
}

function ShowcaseRow({ avatar, name, code, pm, status }: { avatar: ReactNode; name: string; code: string; pm: string; status: ReactNode }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          {avatar}
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{code}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{pm}</TableCell>
      <TableCell>{status}</TableCell>
    </TableRow>
  )
}

function ProjectTile({ cover, name, meta, initials }: { cover: MediaItem | null; name: string; meta: string; initials: string }) {
  return (
    <Card size="sm" className="gap-0 py-0">
      {cover ? (
        <img src={cover.src} alt="" className="h-32 w-full object-cover" />
      ) : (
        <div className="grid h-32 place-items-center bg-accent text-3xl font-semibold text-accent-foreground">{initials}</div>
      )}
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{name}</CardTitle>
        <CardDescription>{meta}</CardDescription>
      </CardHeader>
    </Card>
  )
}
