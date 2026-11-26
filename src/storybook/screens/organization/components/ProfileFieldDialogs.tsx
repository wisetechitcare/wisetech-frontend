import { useState, type FormEvent } from "react"
import { FolderPlus, TextCursorInput } from "lucide-react"

import { FormDialog } from "@/ds/patterns/form-dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Switch } from "@/ds/ui/switch"

import type { FormFieldType, IFormField } from "@/models/company"
import { CUSTOM_FIELD_TYPES, INPUT_KIND_LABEL } from "@/storybook/screens/organization/constants/organization"
import { ProfileFieldType } from "@/storybook/screens/organization/types/organization"

const FIELD_FORM_ID = "field-form"
const SECTION_FORM_ID = "section-form"

export type FieldPatch = Pick<IFormField, "label" | "type" | "required">

interface FieldDialogProps {
  /** Edit this field; omit to add a custom one. */
  field?: IFormField
  /** Labels already used in the form, to block duplicates. */
  takenLabels: string[]
  onSubmit: (patch: FieldPatch) => void
  onOpenChange: (open: boolean) => void
}

/** Add a custom field, or rename / retype one. A built-in field's type is set by its widget, so it is shown, not offered. */
export function FieldDialog({ field, takenLabels, onSubmit, onOpenChange }: FieldDialogProps) {
  const initialType: FormFieldType = field?.type ?? ProfileFieldType.TEXT
  const [label, setLabel] = useState<string>(field?.label ?? "")
  const [type, setType] = useState<FormFieldType>(initialType)
  const [required, setRequired] = useState<boolean>(field?.required ?? false)
  const trimmed = label.trim()
  const duplicate = takenLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase() && l !== field?.label)
  const dirty = trimmed !== (field?.label ?? "") || type !== initialType || required !== (field?.required ?? false)
  const typeFixed = field?.isSystem && (field.fixedType || field.essential)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate) return
    onSubmit({ label: trimmed, type, required })
    onOpenChange(false)
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={field ? "Edit field" : "Add field"}
      icon={<TextCursorInput />}
      size="sm"
      formId={FIELD_FORM_ID}
      submitLabel={field ? "Apply" : "Add field"}
      submitDisabled={!trimmed || duplicate || !dirty}
      dirty={dirty}
    >
      <form id={FIELD_FORM_ID} noValidate onSubmit={submit}>
        <FieldGroup className="gap-4">
          <Field data-invalid={duplicate || undefined}>
            <FieldLabel htmlFor="field-label">Label *</FieldLabel>
            <Input id="field-label" value={label} onChange={(e) => setLabel(e.target.value)} aria-invalid={duplicate || undefined} />
            {duplicate && <FieldError>“{trimmed}” is already a field.</FieldError>}
          </Field>
          <Field data-disabled={typeFixed || undefined}>
            <FieldLabel id="field-type-label">Type</FieldLabel>
            {typeFixed && <FieldDescription>{field?.inputKind ? INPUT_KIND_LABEL[field.inputKind] : "Text"} — set by its own input, can't change.</FieldDescription>}
            {!typeFixed && (
              <Select items={CUSTOM_FIELD_TYPES} value={type} onValueChange={(v) => v && setType(v as FormFieldType)}>
                <SelectTrigger className="w-full" aria-labelledby="field-type-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field orientation="horizontal" data-disabled={field?.essential || undefined}>
            <FieldContent>
              <FieldLabel htmlFor="field-required">Required</FieldLabel>
              <FieldDescription>{field?.essential ? "Always required." : "The profile can't be saved without it."}</FieldDescription>
            </FieldContent>
            <Switch id="field-required" checked={required} onCheckedChange={setRequired} disabled={field?.essential} />
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
  )
}

interface SectionDialogProps {
  /** Rename this section; omit to add one. */
  title?: string
  onSubmit: (title: string) => void
  onOpenChange: (open: boolean) => void
}

export function SectionDialog({ title, onSubmit, onOpenChange }: SectionDialogProps) {
  const [draft, setDraft] = useState<string>(title ?? "")
  const trimmed = draft.trim()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    onSubmit(trimmed)
    onOpenChange(false)
  }

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={title ? "Rename section" : "Add section"}
      icon={<FolderPlus />}
      size="sm"
      formId={SECTION_FORM_ID}
      submitLabel={title ? "Rename" : "Add section"}
      submitDisabled={!trimmed || trimmed === title}
      dirty={trimmed !== (title ?? "")}
    >
      <form id={SECTION_FORM_ID} noValidate onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor="section-title">Section name *</FieldLabel>
          <Input id="section-title" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      </form>
    </FormDialog>
  )
}
