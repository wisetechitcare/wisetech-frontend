import { useState, type FormEvent } from "react"
import { MapPinned, Pencil } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/ds/patterns/confirm-dialog"
import { FormDialog } from "@/ds/patterns/form-dialog"
import { MasterList, type MasterItem } from "@/ds/patterns/master-list"
import { SectionHeader } from "@/ds/patterns/section-header"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import { Field, FieldError, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"

import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import { plural } from "@/ds/prototypes/utils/common/format"

const RENAME_FORM_ID = "rename-town"

/** The shared Towns list that branch forms pick from. A town in use can be renamed (branches follow) but not deleted. */
export function TownsPanel() {
  const { towns, branches, addTown, renameTown, deleteTown } = useOrganizationStore()
  const [renaming, setRenaming] = useState<MasterItem | null>(null)
  const [draft, setDraft] = useState<string>("")
  const [deleting, setDeleting] = useState<MasterItem | null>(null)

  const usage = (name: string) => branches.filter((b) => b.town === name).length
  const items: MasterItem[] = [...towns]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => {
      const used = usage(t.name)
      return { id: t.id, name: t.name, tone: used ? "cyan" : "neutral", caption: used ? `Used by ${plural(used, "branch", "branches")}` : "Not used yet" }
    })
  const trimmed = draft.trim()
  const duplicate = towns.some((t) => t.id !== renaming?.id && t.name.toLowerCase() === trimmed.toLowerCase())
  const inUse = deleting ? usage(deleting.name) : 0

  function rename(e: FormEvent) {
    e.preventDefault()
    if (!renaming || !trimmed || duplicate) return
    renameTown(renaming.id, trimmed)
    toast.success(`Renamed to ${trimmed}.`)
    setRenaming(null)
  }

  return (
    <Card variant="panel">
      <CardHeader>
        <SectionHeader title="Towns" description="Branches pick their town from this list." icon={<MapPinned />} tone="cyan" />
      </CardHeader>
      <CardContent className="max-w-xl">
        <MasterList
          label="Towns"
          items={items}
          addPlaceholder="Add a town"
          onAdd={(name) => {
            addTown(name)
            toast.success(`${name} added.`)
          }}
          onEdit={(item) => {
            setDraft(item.name)
            setRenaming(item)
          }}
          onDelete={setDeleting}
        />
      </CardContent>

      <FormDialog
        open={!!renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
        title="Rename town"
        description={renaming ? `Branches in ${renaming.name} move with it.` : undefined}
        icon={<Pencil />}
        tone="cyan"
        size="sm"
        formId={RENAME_FORM_ID}
        submitDisabled={!trimmed || duplicate || trimmed === renaming?.name}
        dirty={trimmed !== renaming?.name}
      >
        <form id={RENAME_FORM_ID} noValidate onSubmit={rename}>
          <Field data-invalid={duplicate || undefined}>
            <FieldLabel htmlFor="town-name">Town name</FieldLabel>
            <Input id="town-name" value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={duplicate || undefined} />
            {duplicate && <FieldError>“{trimmed}” is already in the list.</FieldError>}
          </Field>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant={inUse ? "warning" : "delete"}
        title={inUse ? "Town in use" : `Delete ${deleting?.name}?`}
        description={
          inUse
            ? `${deleting?.name} is used by ${plural(inUse, "branch", "branches")}. Move them to another town first.`
            : "It disappears from the branch form's town list."
        }
        showCancel={!inUse}
        confirmLabel={inUse ? "OK" : "Delete town"}
        onConfirm={() => {
          if (!deleting || inUse) return
          deleteTown(deleting.id)
          toast.success(`${deleting.name} deleted.`)
        }}
      />
    </Card>
  )
}
