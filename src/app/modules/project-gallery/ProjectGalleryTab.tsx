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
import { MediaGalleryScreen } from "./MediaGalleryScreen"
import { initialsOf, type Albums, type GalleryApi, type MediaItem } from "./media"

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
  const [albums, setAlbums] = useState<Albums>({ project: [], site: [] })
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getProjectMedia(leadId)
      setItems(data.media.map(toMediaItem))
      setAlbums({
        project: data.albums.filter((a) => a.view === "project").map((a) => a.name),
        site: data.albums.filter((a) => a.view === "site").map((a) => a.name),
      })
      setCoverUrl(data.coverImageUrl)
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load the gallery."))
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

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
        setAlbums((prev) => ({ ...prev, [view]: [...prev[view], name] }))
      },
      upload: async (source, meta, onProgress) => {
        const row = await uploadProjectMedia(leadId, source, meta, onProgress)
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
      coverId={items.find((m) => m.src === coverUrl)?.id ?? null}
      project={{ name: projectName, initials: initialsOf(projectName) }}
      api={api}
      canEdit={canSection("projects", "write")}
    />
  )
}
