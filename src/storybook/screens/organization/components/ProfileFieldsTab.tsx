import { useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderInput, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/ds/patterns/confirm-dialog"
import { SectionHeader } from "@/ds/patterns/section-header"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/ds/ui/item"
import { Label } from "@/ds/ui/label"
import { Switch } from "@/ds/ui/switch"
import { FieldDialog, SectionDialog } from "./ProfileFieldDialogs"

import { cn } from "@/ds/lib/utils"
import type { IFormField, IFormSection } from "@/models/company"
import { useOrganizationStore } from "@/storybook/screens/organization/hooks"
import { CUSTOM_FIELD_TYPES, INPUT_KIND_LABEL } from "@/storybook/screens/organization/constants/organization"
import { ProfileInputKind, type Organization } from "@/storybook/screens/organization/types/organization"
import { plural } from "@/storybook/screens/organization/utils/format"

interface FieldTarget {
  sectionId: string
  field?: IFormField
}

interface SectionTarget {
  section?: IFormSection
}

interface ProfileFieldsTabProps {
  org: Organization
}

const typeLabel = (f: IFormField) =>
  f.inputKind ? INPUT_KIND_LABEL[f.inputKind] : (CUSTOM_FIELD_TYPES.find((t) => t.value === f.type)?.label ?? INPUT_KIND_LABEL[ProfileInputKind.TEXT])

/** The profile's own form, edited in place as a draft with one Save. */
export function ProfileFieldsTab({ org }: ProfileFieldsTabProps) {
  const { saveSections } = useOrganizationStore()
  const [sections, setSections] = useState<IFormSection[]>(() => structuredClone(org.sections))
  const [fieldTarget, setFieldTarget] = useState<FieldTarget | null>(null)
  const [sectionTarget, setSectionTarget] = useState<SectionTarget | null>(null)
  const [removing, setRemoving] = useState<IFormSection | null>(null)

  const dirty = JSON.stringify(sections) !== JSON.stringify(org.sections)
  const customCount = sections.flatMap((s) => s.fields).filter((f) => !f.isSystem).length
  const allLabels = sections.flatMap((s) => s.fields.map((f) => f.label))

  const patchSection = (id: string, patch: (s: IFormSection) => IFormSection) => setSections((list) => list.map((s) => (s.id === id ? patch(s) : s)))
  const patchField = (sectionId: string, fieldId: string, patch: Partial<IFormField>) =>
    patchSection(sectionId, (s) => ({ ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }))
  const removeField = (sectionId: string, fieldId: string) => patchSection(sectionId, (s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) }))

  function moveField(sectionId: string, index: number, by: number) {
    patchSection(sectionId, (s) => {
      const fields = [...s.fields]
      const [moved] = fields.splice(index, 1)
      fields.splice(index + by, 0, moved)
      return { ...s, fields }
    })
  }

  function moveToSection(field: IFormField, from: string, to: string) {
    setSections((list) =>
      list.map((s) => {
        if (s.id === from) return { ...s, fields: s.fields.filter((f) => f.id !== field.id) }
        if (s.id === to) return { ...s, fields: [...s.fields, field] }
        return s
      }),
    )
  }

  function save() {
    saveSections(org.id, sections)
    toast.success("Profile fields saved. The form and Overview use them now.")
  }

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {plural(sections.length, "section")} · {plural(customCount, "custom field")}. Built-in fields can be renamed or hidden, not deleted.
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setSectionTarget({})}>
            <Plus data-icon="inline-start" aria-hidden /> Add section
          </Button>
          <Button variant="ghost" disabled={!dirty} onClick={() => setSections(structuredClone(org.sections))}>
            Discard
          </Button>
          <Button disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>

      {sections.map((section) => (
        <Card key={section.id} variant="panel">
          <CardHeader>
            <SectionHeader
              title={section.title}
              description={section.isSystem ? "Built-in section" : "Custom section"}
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`sec-visible-${section.id}`}
                      aria-label={`Show ${section.title} on Overview`}
                      checked={section.showOnInfoPage !== false}
                      onCheckedChange={(on) => patchSection(section.id, (s) => ({ ...s, showOnInfoPage: on }))}
                    />
                    <Label htmlFor={`sec-visible-${section.id}`} className="text-xs text-muted-foreground">
                      On Overview
                    </Label>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setFieldTarget({ sectionId: section.id })}>
                    <Plus data-icon="inline-start" aria-hidden /> Field
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`Rename ${section.title}`} onClick={() => setSectionTarget({ section })}>
                    <Pencil aria-hidden />
                  </Button>
                  {!section.isSystem && (
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${section.title}`} onClick={() => setRemoving(section)}>
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              }
            />
          </CardHeader>
          <CardContent>
            {!section.fields.length && <p className="text-sm text-muted-foreground">No fields yet. Add one, or move one here from another section.</p>}
            <ItemGroup>
              {section.fields.map((field, index) => (
                <Item key={field.id} role="listitem" size="sm" variant="outline" className={cn(field.hidden && "opacity-60")}>
                  <ItemContent className="min-w-0">
                    <ItemTitle>
                      {field.label}
                      {field.essential && <Lock aria-label="Always shown" className="size-3.5 text-muted-foreground" />}
                      {field.hidden && <Badge variant="neutral">Hidden</Badge>}
                    </ItemTitle>
                    <ItemDescription>
                      {typeLabel(field)} · {field.isSystem ? "Built-in" : "Custom"}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`req-${field.id}`}
                        aria-label={`${field.label} required`}
                        checked={field.required}
                        disabled={field.essential || field.hidden}
                        onCheckedChange={(required) => patchField(section.id, field.id, { required })}
                      />
                      <Label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground">
                        Required
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`info-${field.id}`}
                        aria-label={`Show ${field.label} on Overview`}
                        checked={field.showOnInfoPage !== false}
                        disabled={field.hidden}
                        onCheckedChange={(on) => patchField(section.id, field.id, { showOnInfoPage: on })}
                      />
                      <Label htmlFor={`info-${field.id}`} className="text-xs text-muted-foreground">
                        On Overview
                      </Label>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${field.label}`} />}>
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFieldTarget({ sectionId: section.id, field })}>
                          <Pencil aria-hidden /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index === 0} onClick={() => moveField(section.id, index, -1)}>
                          <ArrowUp aria-hidden /> Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index === section.fields.length - 1} onClick={() => moveField(section.id, index, 1)}>
                          <ArrowDown aria-hidden /> Move down
                        </DropdownMenuItem>
                        {!field.fixedSection && sections.length > 1 && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderInput aria-hidden /> Move to
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {sections
                                .filter((s) => s.id !== section.id)
                                .map((s) => (
                                  <DropdownMenuItem key={s.id} onClick={() => moveToSection(field, section.id, s.id)}>
                                    {s.title}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        {!field.essential && <DropdownMenuSeparator />}
                        {field.isSystem && !field.essential && (
                          <DropdownMenuItem onClick={() => patchField(section.id, field.id, { hidden: !field.hidden })}>
                            {field.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />} {field.hidden ? "Show in form" : "Hide from form"}
                          </DropdownMenuItem>
                        )}
                        {!field.isSystem && (
                          <DropdownMenuItem variant="destructive" onClick={() => removeField(section.id, field.id)}>
                            <Trash2 aria-hidden /> Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      ))}

      {fieldTarget && (
        <FieldDialog
          field={fieldTarget.field}
          takenLabels={allLabels}
          onOpenChange={(open) => !open && setFieldTarget(null)}
          onSubmit={(patch) => {
            if (fieldTarget.field) patchField(fieldTarget.sectionId, fieldTarget.field.id, patch)
            else patchSection(fieldTarget.sectionId, (s) => ({ ...s, fields: [...s.fields, { id: crypto.randomUUID(), isSystem: false, ...patch }] }))
          }}
        />
      )}
      {sectionTarget && (
        <SectionDialog
          title={sectionTarget.section?.title}
          onOpenChange={(open) => !open && setSectionTarget(null)}
          onSubmit={(title) => {
            if (sectionTarget.section) patchSection(sectionTarget.section.id, (s) => ({ ...s, title }))
            else setSections((list) => [...list, { id: crypto.randomUUID(), title, isSystem: false, fields: [] }])
          }}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        variant="delete"
        title={`Remove ${removing?.title}?`}
        description={removing?.fields.length ? `Its ${plural(removing.fields.length, "field")} and their values go with it once you save.` : "It has no fields."}
        confirmLabel="Remove section"
        onConfirm={() => {
          if (removing) setSections((list) => list.filter((s) => s.id !== removing.id))
        }}
      />
    </div>
  )
}
