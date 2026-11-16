import { useEffect, useState } from "react"
import { ConfigColorChip, ConfigChipGrid, showDialog } from "@app/modules/common/components/ui"
import { confirmDialog, toast } from "@app/modules/common/components/ui/feedback"
import { ConfigSectionCard } from "@app/modules/configuration"
import { apiErrorMessage } from "@utils/apiError"
import {
  createProjectMediaView,
  deleteProjectMediaView,
  getProjectMediaViews,
  renameProjectMediaView,
  type MediaViewRow,
} from "@services/projectMedia"
import { BUILTIN_VIEWS, viewLabel } from "./media"

const COLOR = "#1E3A8A"

/**
 * Projects → Configure → Gallery Views: tabs every project's Gallery shows after the built-in
 * Project View and Site View. Owns its fetch and dialogs, so the page only mounts it.
 */
export default function GalleryViewsSection() {
  const [views, setViews] = useState<MediaViewRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = () =>
    getProjectMediaViews()
      .then(setViews)
      .catch((err) => toast({ icon: "error", title: "Couldn't load gallery views", text: apiErrorMessage(err, "Please try again.") }))
      .finally(() => setLoading(false))

  useEffect(() => {
    void load()
  }, [])

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work()
      toast({ icon: "success", title: done })
      await load()
    } catch (err) {
      toast({ icon: "error", title: apiErrorMessage(err, "Something went wrong.") })
    }
  }

  const askName = async (title: string, defaultValue = "") => {
    const r = await showDialog({ title, confirmLabel: "Save", input: { label: "View name", placeholder: "e.g. Drone View", defaultValue, required: true } })
    return r.isConfirmed ? r.value?.trim() : undefined
  }

  const add = async () => {
    const name = await askName("New gallery view")
    if (name) await run(() => createProjectMediaView(name), `“${name}” added`)
  }

  const rename = async (v: MediaViewRow) => {
    const name = await askName("Rename gallery view", v.name)
    if (name && name !== v.name) await run(() => renameProjectMediaView(v.id, name), `Renamed to “${name}”`)
  }

  const remove = async (v: MediaViewRow) => {
    const ok = await confirmDialog({
      icon: "warning",
      danger: true,
      title: `Delete “${v.name}”?`,
      text: "It disappears from every project's Gallery, with its albums. Views that still hold photos or videos can't be deleted.",
      confirmText: "Delete",
    })
    if (ok) await run(() => deleteProjectMediaView(v.id), `“${v.name}” deleted`)
  }

  return (
    <ConfigSectionCard
      title="Gallery Views"
      description="Tabs in every project's Gallery. Project View and Site View are built in; add more here."
      icon="bi-images"
      iconColor="blue"
      primaryAction={{ label: "New View", icon: "bi-plus-lg", onClick: () => void add(), variant: "primary" }}
      loading={loading}
    >
      <ConfigChipGrid>
        {BUILTIN_VIEWS.map((v) => (
          <ConfigColorChip key={v} name={viewLabel(v)} color={COLOR} badge="Built-in" />
        ))}
        {views.map((v) => (
          <ConfigColorChip
            key={v.id}
            name={v.name}
            color={COLOR}
            onEdit={() => void rename(v)}
            action={{ icon: "bi-trash", title: `Delete ${v.name}`, danger: true, onClick: () => void remove(v) }}
          />
        ))}
      </ConfigChipGrid>
    </ConfigSectionCard>
  )
}
