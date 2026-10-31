import { useCallback, useEffect, useMemo, useState } from "react"
import { Skeleton } from "@/ds/ui/skeleton"
import { EmptyState } from "@/ds/patterns/empty-state"
import { Button } from "@/ds/ui/button"
import { apiErrorMessage } from "@utils/apiError"
import { canSection } from "@utils/can"
import {
  createProjectMediaAlbum,
  deleteProjectMedia,
  getProjectMedia,
  setProjectCover,
  toMediaItem,
  updateProjectMedia,
  uploadProjectMedia,
} from "@services/projectMedia"
import { getAllProjectServices } from "@services/projects"
import { MediaGalleryScreen } from "./MediaGalleryScreen"
import { BUILTIN_VIEWS, initialsOf, type Albums, type GalleryApi, type GalleryView, type MediaItem } from "./media"

/** The project detail page's Gallery tab: the Media Gallery screen wired to the API. */
export default function ProjectGalleryTab({
  leadId,
  projectName,
  onCoverChange,
}: {
  leadId: string
  projectName: string
  /** Lets the page header avatar follow the cover without a reload. */
  onCoverChange: (url: string | null) => void
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [albums, setAlbums] = useState<Albums>({})
  const [views, setViews] = useState<GalleryView[]>(BUILTIN_VIEWS)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getProjectMedia(leadId)
      setItems(data.media.map(toMediaItem))
      const byView: Albums = {}
      for (const a of data.albums) (byView[a.view] ??= []).push(a.name)
      setAlbums(byView)
      setViews(data.views)
      setCoverUrl(data.coverImageUrl)
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load the gallery."))
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  // The Service picker lists Leads → Configure → Services; without them it still shows services already on media.
  const [services, setServices] = useState<string[]>([])
  useEffect(() => {
    getAllProjectServices()
      .then((r) => setServices((r?.services ?? []).map((s: { name: string }) => s.name).filter(Boolean)))
      .catch(() => undefined)
  }, [])

  const changeCover = useCallback(
    (url: string | null) => {
      setCoverUrl(url)
      onCoverChange(url)
    },
    [onCoverChange],
  )

  const api = useMemo<GalleryApi>(
    () => ({
      setCover: async (id) => changeCover(await setProjectCover(leadId, id)),
      remove: async (ids) => {
        const { deleted, coverCleared } = await deleteProjectMedia(leadId, ids)
        setItems((prev) => prev?.filter((m) => !deleted.includes(m.id)) ?? prev)
        if (coverCleared) changeCover(null)
      },
      saveDetails: async (id, patch) => {
        const row = await updateProjectMedia(leadId, id, patch)
        setItems((prev) => prev?.map((m) => (m.id === id ? toMediaItem(row) : m)) ?? prev)
      },
      createAlbum: async (view, name) => {
        await createProjectMediaAlbum(leadId, view, name)
        setAlbums((prev) => ({ ...prev, [view]: [...(prev[view] ?? []), name] }))
      },
      upload: async (file, meta, onProgress) => {
        const row = await uploadProjectMedia(leadId, file, meta, onProgress)
        setItems((prev) => [...(prev ?? []), toMediaItem(row)])
      },
    }),
    [leadId, changeCover],
  )

  if (error) {
    return <EmptyState title="Couldn't load the gallery" description={error} action={<Button variant="outline" onClick={() => void load()}>Try again</Button>} />
  }
  if (!items) return <Skeleton className="h-96 w-full rounded-2xl" />

  return (
    <MediaGalleryScreen
      items={items}
      albums={albums}
      views={views}
      services={services}
      coverId={items.find((m) => m.src === coverUrl)?.id ?? null}
      project={{ name: projectName, initials: initialsOf(projectName) }}
      api={api}
      canEdit={canSection("projects", "write")}
    />
  )
}
