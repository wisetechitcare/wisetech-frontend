import { createElement, useState, type FormEvent } from "react"
import { Building2, CalendarClock, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/ds/patterns/form-dialog"
import { ImageField } from "@/ds/patterns/image-field"
import { FieldGroup, FieldLegend, FieldSet } from "@/ds/ui/field"
import { NumberField } from "@/ds/ui/number-field"
import { OrgFieldControl } from "./OrgFieldControl"

import type { IFormField } from "@/models/company"
import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import { DAYS_PER_WEEK, HOURS_PER_DAY } from "@/ds/prototypes/constants/organization/organization"
import { defaultSections } from "@/ds/prototypes/fixtures/organization/organization"
import { BuiltinFieldId, ProfileInputKind, type Organization } from "@/ds/prototypes/types/organization/organization"
import { fixFieldsMessage } from "@/ds/prototypes/utils/common/format"
import { aprilToMarchContaining, fieldValue, orgPathLabel, sectionIcon } from "@/ds/prototypes/utils/organization/organization"

const FORM_ID = "org-form"
const BRANDING_SECTION_ID = `${FORM_ID}-branding`
const SCHEDULE_SECTION_ID = `${FORM_ID}-schedule`
const CREATE_FIELDS: BuiltinFieldId[] = [
  BuiltinFieldId.NAME,
  BuiltinFieldId.FISCAL_YEAR,
  BuiltinFieldId.CONTACT_NUMBER,
  BuiltinFieldId.BUSINESS_TYPE,
  BuiltinFieldId.ADDRESS,
]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_IMAGE_MB = 5

const uploadPreview = (file: File) => Promise.resolve(URL.createObjectURL(file))

const blankOrg = (parentId: string | null): Organization => ({
  id: crypto.randomUUID(),
  name: "",
  parentId,
  fiscalYear: aprilToMarchContaining(new Date()),
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
  values: {},
  sections: defaultSections(),
})

interface OrgFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this organization; omit to create one. */
  org?: Organization
  /** Create mode: the new organization sits under this one. */
  parentId?: string | null
  onSaved?: (org: Organization) => void
}

/** Create asks only for what is needed to start; edit shows every profile section with a nav rail. */
export function OrgFormDialog({ open, onOpenChange, org, parentId = null, onSaved }: OrgFormDialogProps) {
  const { orgs, saveOrg } = useOrganizationStore()
  const creating = !org
  const [draft, setDraft] = useState<Organization>(() => org ?? blankOrg(parentId))
  const [dirty, setDirty] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (patch: Partial<Organization>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const setValue = (field: IFormField, value: string) =>
    field.id === BuiltinFieldId.NAME ? update({ name: value }) : update({ values: { ...draft.values, [field.id]: value } })

  const allFields = draft.sections.flatMap((s) => s.fields.filter((f) => !f.hidden))
  const createFields = CREATE_FIELDS.map((id) => allFields.find((f) => f.id === id)).filter((f): f is IFormField => !!f)
  const shownFields = creating ? createFields : allFields
  const parentName = draft.parentId ? orgPathLabel(orgs, draft.parentId) : ""

  function validate(): Record<string, string> {
    const next: Record<string, string> = {}
    for (const f of shownFields) {
      const value = fieldValue(draft, f.id)
      if (f.required && !value) next[f.id] = `Enter the ${f.label.toLowerCase()}.`
      else if (f.inputKind === ProfileInputKind.EMAIL && value && !EMAIL_PATTERN.test(value)) next[f.id] = "Enter an email like name@company.com."
    }
    if (draft.fiscalYear.end <= draft.fiscalYear.start) next[BuiltinFieldId.FISCAL_YEAR] = "The fiscal year must end after it starts."
    return next
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    const failed = Object.keys(next).length
    if (failed) {
      toast.error(fixFieldsMessage(failed))
      return
    }
    saveOrg(draft)
    toast.success(creating ? `${draft.name} created.` : "Profile saved.")
    onSaved?.(draft)
    onOpenChange(false)
  }

  const control = (field: IFormField) => (
    <OrgFieldControl
      key={field.id}
      field={field}
      value={fieldValue(draft, field.id)}
      onChange={(v) => setValue(field, v)}
      fiscalYear={draft.fiscalYear}
      onFiscalYearChange={(fiscalYear) => update({ fiscalYear })}
      error={errors[field.id]}
    />
  )

  const schedule = (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <NumberField
        label="Working hours per day"
        minValue={HOURS_PER_DAY.MIN}
        maxValue={HOURS_PER_DAY.MAX}
        value={draft.workingHoursPerDay}
        onChange={(workingHoursPerDay) => update({ workingHoursPerDay })}
      />
      <NumberField
        label="Working days per week"
        minValue={DAYS_PER_WEEK.MIN}
        maxValue={DAYS_PER_WEEK.MAX}
        value={draft.workingDaysPerWeek}
        onChange={(workingDaysPerWeek) => update({ workingDaysPerWeek })}
      />
    </FieldGroup>
  )

  const branding = (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <ImageField
        id="org-logo"
        label="Logo"
        hint="PNG or JPG, up to 5 MB. Used on documents."
        value={draft.logo}
        onChange={(logo) => update({ logo: logo ?? undefined })}
        upload={uploadPreview}
        maxSizeMB={MAX_IMAGE_MB}
      />
      {!creating && (
        <ImageField
          id="org-stamp"
          label="Stamp"
          hint="Printed on payslips."
          value={draft.salaryStamp}
          onChange={(salaryStamp) => update({ salaryStamp: salaryStamp ?? undefined })}
          upload={uploadPreview}
          maxSizeMB={MAX_IMAGE_MB}
        />
      )}
    </FieldGroup>
  )

  const navSections = [
    { id: BRANDING_SECTION_ID, label: "Branding", icon: <ImageIcon /> },
    ...draft.sections.map((s) => ({ id: `${FORM_ID}-${s.id}`, label: s.title, icon: createElement(sectionIcon(s.id)) })),
    { id: SCHEDULE_SECTION_ID, label: "Work schedule", icon: <CalendarClock /> },
  ]

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={creating ? (draft.parentId ? "New sub-organization" : "New organization") : "Edit profile"}
      description={creating ? (parentName ? `Under ${parentName}` : "Tax, bank and statutory details can be added later.") : draft.name}
      icon={<Building2 />}
      size={creating ? "default" : "xl"}
      formId={FORM_ID}
      submitLabel={creating ? "Create organization" : "Save changes"}
      submitDisabled={!creating && !dirty}
      dirty={dirty}
      sections={creating ? undefined : navSections}
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-8">
        {creating && (
          <>
            {branding}
            <FieldGroup className="grid gap-4 sm:grid-cols-2">{createFields.map(control)}</FieldGroup>
            {schedule}
          </>
        )}
        {!creating && (
          <>
            <FieldSet id={BRANDING_SECTION_ID} className="scroll-mt-4">
              <FieldLegend>Branding</FieldLegend>
              {branding}
            </FieldSet>
            {draft.sections.map((section) => (
              <FieldSet key={section.id} id={`${FORM_ID}-${section.id}`} className="scroll-mt-4">
                <FieldLegend>{section.title}</FieldLegend>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">{section.fields.filter((f) => !f.hidden).map(control)}</FieldGroup>
              </FieldSet>
            ))}
            <FieldSet id={SCHEDULE_SECTION_ID} className="scroll-mt-4">
              <FieldLegend>Work schedule</FieldLegend>
              {schedule}
            </FieldSet>
          </>
        )}
      </form>
    </FormDialog>
  )
}
