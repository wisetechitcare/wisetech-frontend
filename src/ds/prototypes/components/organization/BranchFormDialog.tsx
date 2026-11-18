import { useState, type FormEvent, type ReactNode } from "react"
import { Clock, Crosshair, LocateFixed, MapPin, MapPinned, Navigation } from "lucide-react"
import { toast } from "sonner"

import { FormDialog } from "@/ds/patterns/form-dialog"
import { SearchSelect } from "@/ds/patterns/search-select"
import { Button } from "@/ds/ui/button"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/ds/ui/combobox"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/ds/ui/field"
import { Input } from "@/ds/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Switch } from "@/ds/ui/switch"
import { Textarea } from "@/ds/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/ds/ui/toggle-group"

import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import { DEFAULT_COUNTRY_CODE, DEFAULT_TIMEZONE, TIME_FORMAT_OPTIONS, TIMEZONES } from "@/ds/prototypes/constants/organization/organization"
import { COUNTRIES } from "@/ds/prototypes/fixtures/organization/organization"
import { TimeFormat, type Branch } from "@/ds/prototypes/types/organization/organization"
import { fixFieldsMessage } from "@/ds/prototypes/utils/common/format"
import { orgPathLabel } from "@/ds/prototypes/utils/organization/organization"

const FORM_ID = "branch-form"
const SECTION = {
  DETAILS: `${FORM_ID}-details`,
  LOCATION: `${FORM_ID}-location`,
  CHECK_IN: `${FORM_ID}-checkin`,
  PREFERENCES: `${FORM_ID}-prefs`,
} as const
const MAX_LATITUDE = 90
const MAX_LONGITUDE = 180
const COORDINATE_DECIMALS = 6

type BranchErrors = Partial<Record<keyof Branch, string>>
type TextKey = "name" | "city" | "postalCode" | "latitude" | "longitude"
type SelectKey = "country" | "state"

const REQUIRED: ReadonlyArray<[keyof Branch, string]> = [
  ["name", "Enter the branch name."],
  ["companyId", "Choose the organization."],
  ["country", "Choose the country."],
  ["state", "Choose the state."],
  ["city", "Enter the city."],
  ["town", "Choose or add the town."],
  ["postalCode", "Enter the postal code."],
  ["address", "Enter the branch address."],
]

const blankBranch = (companyId: string): Branch => ({
  id: crypto.randomUUID(),
  name: "",
  companyId,
  employeeCount: 0,
  isActive: true,
  country: DEFAULT_COUNTRY_CODE,
  state: "",
  city: "",
  town: "",
  postalCode: "",
  address: "",
  latitude: "",
  longitude: "",
  timezone: DEFAULT_TIMEZONE,
  timeFormat: TimeFormat.ORGANIZATION_DEFAULT,
})

function coordinateError(value: Branch["latitude"], limit: number, name: string): string | undefined {
  if (value === "" || value === undefined) return `Enter the ${name}.`
  const n = Number(value)
  return Number.isFinite(n) && Math.abs(n) <= limit ? undefined : `The ${name} is between −${limit} and ${limit}.`
}

interface BranchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this branch; omit to create one. */
  branch?: Branch
  /** Create mode: the organization it is added from, already chosen. */
  orgId?: string
}

/** Create or edit a branch: details, location, the attendance check-in point and local preferences. */
export function BranchFormDialog({ open, onOpenChange, branch, orgId = "" }: BranchFormDialogProps) {
  const { orgs, branches, towns, addTown, saveBranch } = useOrganizationStore()
  const creating = !branch
  const [draft, setDraft] = useState<Branch>(() => branch ?? blankBranch(orgId))
  const [dirty, setDirty] = useState<boolean>(false)
  const [errors, setErrors] = useState<BranchErrors>({})
  const [townQuery, setTownQuery] = useState<string>(draft.town)

  const update = (patch: Partial<Branch>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const country = COUNTRIES.find((c) => c.code === draft.country)
  const orgOptions = orgs.map((o) => ({ value: o.id, label: orgPathLabel(orgs, o.id) }))
  const townNames = towns.map((t) => t.name)
  const newTown = townQuery.trim()
  const townExists = townNames.some((t) => t.toLowerCase() === newTown.toLowerCase())
  const timezones = TIMEZONES.includes(draft.timezone) ? TIMEZONES : [draft.timezone, ...TIMEZONES]

  function fillFromAddress() {
    const match = branches.find((b) => b.id !== draft.id && b.town === draft.town && b.latitude)
    if (!match) {
      toast.warning("No match for this address yet. Enter the coordinates, or use your location on site.")
      return
    }
    update({ latitude: match.latitude, longitude: match.longitude })
    toast.success(`Coordinates filled from ${draft.town}.`)
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share its location.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => update({ latitude: coords.latitude.toFixed(COORDINATE_DECIMALS), longitude: coords.longitude.toFixed(COORDINATE_DECIMALS) }),
      () => toast.error("Location permission was denied. Enter the coordinates instead."),
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: BranchErrors = {}
    for (const [key, message] of REQUIRED) if (!String(draft[key] ?? "").trim()) next[key] = message
    next.latitude = coordinateError(draft.latitude, MAX_LATITUDE, "latitude")
    next.longitude = coordinateError(draft.longitude, MAX_LONGITUDE, "longitude")
    const failed = Object.values(next).filter(Boolean).length
    setErrors(next)
    if (failed) {
      toast.error(fixFieldsMessage(failed))
      return
    }
    saveBranch(draft)
    toast.success(creating ? `${draft.name} added.` : "Branch saved.")
    onOpenChange(false)
  }

  const text = (key: TextKey, label: string, inputMode?: "decimal" | "numeric") => (
    <Field data-invalid={errors[key] ? true : undefined}>
      <FieldLabel htmlFor={`branch-${key}`}>{label} *</FieldLabel>
      <Input
        id={`branch-${key}`}
        inputMode={inputMode}
        value={String(draft[key] ?? "")}
        onChange={(e) => update({ [key]: e.target.value })}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `branch-${key}-error` : undefined}
      />
      {errors[key] && <FieldError id={`branch-${key}-error`}>{errors[key]}</FieldError>}
    </Field>
  )

  const select = (key: SelectKey, label: string, items: Array<{ value: string; label: string }>, hint?: string) => (
    <Field data-invalid={errors[key] ? true : undefined} data-disabled={!items.length || undefined}>
      <FieldLabel id={`branch-${key}-label`}>{label} *</FieldLabel>
      <Select
        items={items}
        value={draft[key] || null}
        disabled={!items.length}
        onValueChange={(v) => v && update(key === "country" ? { country: v as string, state: "" } : { state: v as string })}
      >
        <SelectTrigger className="w-full" aria-labelledby={`branch-${key}-label`} aria-invalid={errors[key] ? true : undefined}>
          <SelectValue placeholder={items.length ? `Choose ${label.toLowerCase()}` : "Choose a country first"} />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      {errors[key] && <FieldError>{errors[key]}</FieldError>}
    </Field>
  )

  const section = (id: string, title: string, children: ReactNode, description?: string) => (
    <FieldSet id={id} className="scroll-mt-4">
      <FieldLegend>{title}</FieldLegend>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldGroup className="grid gap-4 sm:grid-cols-2">{children}</FieldGroup>
    </FieldSet>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={creating ? "New branch" : "Edit branch"}
      description={creating ? "Where people work and check in." : draft.name}
      icon={<MapPin />}
      tone="cyan"
      size="lg"
      formId={FORM_ID}
      submitLabel={creating ? "Create branch" : "Save changes"}
      submitDisabled={!dirty}
      dirty={dirty}
      sections={[
        { id: SECTION.DETAILS, label: "Details", icon: <MapPin /> },
        { id: SECTION.LOCATION, label: "Location", icon: <MapPinned /> },
        { id: SECTION.CHECK_IN, label: "Check-in point", icon: <Crosshair /> },
        { id: SECTION.PREFERENCES, label: "Preferences", icon: <Clock /> },
      ]}
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-8">
        {section(
          SECTION.DETAILS,
          "Details",
          <>
            {text("name", "Branch name")}
            <SearchSelect
              id="branch-org"
              label="Organization *"
              value={draft.companyId || null}
              options={orgOptions}
              onValueChange={(v) => update({ companyId: v ?? "" })}
              error={errors.companyId}
              required
            />
            <Field orientation="horizontal" className="sm:col-span-2">
              <FieldContent>
                <FieldLabel htmlFor="branch-active">Active</FieldLabel>
                <FieldDescription>Inactive branches are hidden from attendance and new hires.</FieldDescription>
              </FieldContent>
              <Switch id="branch-active" checked={draft.isActive} onCheckedChange={(isActive) => update({ isActive })} />
            </Field>
          </>,
        )}

        {section(
          SECTION.LOCATION,
          "Location",
          <>
            {select(
              "country",
              "Country",
              COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
              country && `Salaries, offers and payslips here are in ${country.currency}.`,
            )}
            {select("state", "State", (country?.states ?? []).map((s) => ({ value: s, label: s })))}
            {text("city", "City")}
            <Field data-invalid={errors.town ? true : undefined}>
              <FieldLabel htmlFor="branch-town">Town *</FieldLabel>
              <Combobox
                items={townNames}
                value={draft.town || null}
                onValueChange={(v) => update({ town: (v as string | null) ?? "" })}
                inputValue={townQuery}
                onInputValueChange={setTownQuery}
              >
                <ComboboxInput id="branch-town" placeholder="Search or add" aria-invalid={errors.town ? true : undefined} />
                <ComboboxContent>
                  <ComboboxEmpty>
                    {newTown && !townExists ? (
                      <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => update({ town: addTown(newTown).name })}>
                        + Add “{newTown}”
                      </Button>
                    ) : (
                      "No town matches."
                    )}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription>Shared with every branch. Manage the list under Towns.</FieldDescription>
              {errors.town && <FieldError>{errors.town}</FieldError>}
            </Field>
            {text("postalCode", "Postal code", "numeric")}
            <Field data-invalid={errors.address ? true : undefined} className="sm:col-span-2">
              <FieldLabel htmlFor="branch-address">Branch address *</FieldLabel>
              <Textarea
                id="branch-address"
                rows={2}
                value={draft.address ?? ""}
                onChange={(e) => update({ address: e.target.value })}
                aria-invalid={errors.address ? true : undefined}
              />
              {errors.address && <FieldError>{errors.address}</FieldError>}
            </Field>
          </>,
        )}

        {section(
          SECTION.CHECK_IN,
          "Check-in point",
          <>
            {text("latitude", "Latitude", "decimal")}
            {text("longitude", "Longitude", "decimal")}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="button" variant="outline" size="sm" onClick={fillFromAddress} disabled={!draft.town}>
                <Navigation data-icon="inline-start" aria-hidden /> Fill from address
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                <LocateFixed data-icon="inline-start" aria-hidden /> Use my location
              </Button>
            </div>
          </>,
          "On-site attendance is accepted only near this point.",
        )}

        {section(
          SECTION.PREFERENCES,
          "Preferences",
          <>
            <Field>
              <FieldLabel id="branch-tz-label">Timezone</FieldLabel>
              <div className="flex gap-2">
                <Select items={timezones.map((t) => ({ value: t, label: t }))} value={draft.timezone} onValueChange={(v) => v && update({ timezone: v as string })}>
                  <SelectTrigger className="w-full" aria-labelledby="branch-tz-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => update({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
                  Detect
                </Button>
              </div>
            </Field>
            <Field>
              <FieldTitle id="branch-time-format">Time format</FieldTitle>
              <ToggleGroup
                aria-labelledby="branch-time-format"
                variant="outline"
                size="sm"
                spacing={0}
                value={[draft.timeFormat]}
                onValueChange={(v) => v[0] && update({ timeFormat: v[0] as TimeFormat })}
              >
                {TIME_FORMAT_OPTIONS.map((o) => (
                  <ToggleGroupItem key={o.value} value={o.value}>
                    {o.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </>,
        )}
      </form>
    </FormDialog>
  )
}
