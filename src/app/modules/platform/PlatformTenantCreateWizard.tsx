import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { parseDate, type DateValue } from '@internationalized/date'
import { Building2 } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Checkbox } from '@/ds/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Label } from '@/ds/ui/label'
import { DatePicker } from '@/ds/ui/date-picker'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { Stepper } from '@/ds/patterns/stepper'
import { DescriptionList } from '@/ds/patterns/description-list'
import { LocationFields } from '@/ds/patterns/location-fields'
import { SearchSelect } from '@/ds/patterns/search-select'
import { geocodeAddress } from '@services/geocoding'
import {
  createPlatformTenant,
  platformGeoCities,
  platformGeoCountries,
  platformGeoStates,
  platformTowns,
  type GeoCity,
  type GeoCountry,
  type GeoState,
  type GeoTown,
  type ProvisionTenantPayload,
} from '@services/platformTenants'
import { fetchPlatformPlans, type PlatformCommercialPlan } from '@services/platformSettings'
import { optionalPacksFromFlags, type OptionalPacks } from '@constants/platformPlans'
import { PROVISION_LIMITS as L } from '@constants/provisionColumnLimits'
import { platformApiErrorInfo, platformCreateFieldStep } from './platformApiError'

const FALLBACK_PACKS: OptionalPacks = {
  workforce: true,
  pay: false,
  psa: false,
  talent: false,
}

type Step = 0 | 1 | 2 | 3

const WIZARD_STEPS = [
  { label: 'Organization' },
  { label: 'Head Office' },
  { label: 'Owner' },
  { label: 'Review' },
] as const

export type PlatformTenantCreateWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (result: { rootOrgId: string; resumed: boolean }) => void
}

/**
 * Kit FormDialog wizard (WtWizardDialog recipe): Create Tenant from the Tenants list.
 */
export function PlatformTenantCreateWizard({ open, onOpenChange, onCreated }: PlatformTenantCreateWizardProps) {
  const [step, setStep] = useState<Step>(0)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgAddress, setOrgAddress] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [panNo, setPanNo] = useState('')
  const [commercialPlans, setCommercialPlans] = useState<PlatformCommercialPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [planId, setPlanId] = useState('custom')
  const [packs, setPacks] = useState<OptionalPacks>(() => ({ ...FALLBACK_PACKS }))
  const [sendMail, setSendMail] = useState(true)

  const [hoName, setHoName] = useState('Head Office')
  const [hoAddress, setHoAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [currency, setCurrency] = useState('INR')
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoMessage, setGeoMessage] = useState('')

  const [countries, setCountries] = useState<GeoCountry[]>([])
  const [states, setStates] = useState<GeoState[]>([])
  const [cities, setCities] = useState<GeoCity[]>([])
  const [towns, setTowns] = useState<GeoTown[]>([])
  const [countryIso, setCountryIso] = useState('IN')
  const [stateIso, setStateIso] = useState('')
  const [cityId, setCityId] = useState('')
  const [townId, setTownId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [dob, setDob] = useState<DateValue | null>(null)

  const dirty =
    orgName.trim() !== '' ||
    orgAddress.trim() !== '' ||
    hoAddress.trim() !== '' ||
    workEmail.trim() !== '' ||
    firstName.trim() !== '' ||
    step > 0

  useEffect(() => {
    if (!open) return
    void platformGeoCountries()
      .then((list) => {
        setCountries(list)
        const india = list.find((c) => c.iso2 === 'IN')
        if (india?.currency) setCurrency(india.currency)
        if (india?.defaultTimezone) setTimezone(india.defaultTimezone)
      })
      .catch(() => setCountries([]))
    void platformTowns()
      .then(setTowns)
      .catch(() => setTowns([]))
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPlansLoading(true)
    void fetchPlatformPlans()
      .then((data) => {
        if (cancelled) return
        setCommercialPlans(data.plans.filter((p) => p.isActive))
        const def =
          data.plans.find((p) => p.id === data.defaultNewTenantPlanId && p.isActive) ??
          data.plans.find((p) => p.isActive)
        if (def) {
          setPlanId(def.id)
          setPacks(optionalPacksFromFlags(def.packs))
        }
      })
      .catch(() => {
        if (cancelled) return
        setCommercialPlans([])
        setPlanId('custom')
        setPacks({ ...FALLBACK_PACKS })
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !countryIso) {
      setStates([])
      return
    }
    void platformGeoStates(countryIso)
      .then(setStates)
      .catch(() => setStates([]))
  }, [open, countryIso])

  useEffect(() => {
    if (!open || !countryIso || !stateIso) {
      setCities([])
      return
    }
    void platformGeoCities(countryIso, stateIso)
      .then(setCities)
      .catch(() => setCities([]))
  }, [open, countryIso, stateIso])

  useEffect(() => {
    if (!open || step !== 1) return
    if (hoAddress.trim()) return
    const fromOrg = orgAddress.trim()
    if (!fromOrg) return
    setHoAddress(fromOrg.slice(0, L.branchAddress))
  }, [open, step, orgAddress, hoAddress])

  const countryItems = useMemo(
    () => countries.map((c) => ({ value: c.iso2, label: c.name })),
    [countries],
  )
  const stateItems = useMemo(
    () => states.map((s) => ({ value: s.iso2 || s.name, label: s.name })),
    [states],
  )
  const cityItems = useMemo(
    () => cities.map((c) => ({ value: String(c.name), label: c.name })),
    [cities],
  )
  const townItems = useMemo(() => towns.map((t) => ({ value: t.id, label: t.name })), [towns])
  const timezoneItems = useMemo(() => {
    const c = countries.find((x) => x.iso2 === countryIso)
    const zones = c?.timezones?.length ? c.timezones : [timezone]
    return zones.map((z) => ({ value: z, label: z }))
  }, [countries, countryIso, timezone])

  const planItems = useMemo(
    () => [
      ...commercialPlans.map((p) => ({
        value: p.id,
        label: p.isDefault ? `${p.name} (default)` : p.name,
      })),
      { value: 'custom', label: 'Custom packs' },
    ],
    [commercialPlans],
  )

  const selectedPlanName = useMemo(() => {
    if (planId === 'custom') return 'Custom'
    return commercialPlans.find((p) => p.id === planId)?.name ?? planId
  }, [commercialPlans, planId])

  const workEmailTrimmed = workEmail.trim()
  const personalEmailTrimmed = personalEmail.trim()
  const recoveryUsesWork =
    !personalEmailTrimmed && workEmailTrimmed.length > 0 && workEmailTrimmed.length <= L.personalEmail
  const resolvedRecoveryEmail = personalEmailTrimmed || (recoveryUsesWork ? workEmailTrimmed : '')

  const completed = useMemo(() => {
    const map: Record<number, boolean> = {}
    for (let i = 0; i < step; i++) map[i] = true
    return map
  }, [step])

  const locationErrors = useMemo(() => {
    const e: Record<string, string> = {}
    if (fieldError === 'headOffice.address' && error) e.address = error
    if (fieldError === 'headOffice.postalCode' && error) e.postalCode = error
    return e
  }, [fieldError, error])

  function resetForm() {
    setStep(0)
    setError(null)
    setFieldError(null)
    setBusy(false)
    setOrgName('')
    setOrgAddress('')
    setGstNumber('')
    setPanNo('')
    setPlanId('custom')
    setPacks({ ...FALLBACK_PACKS })
    setSendMail(true)
    setHoName('Head Office')
    setHoAddress('')
    setPostalCode('')
    setLatitude('')
    setLongitude('')
    setTimezone('Asia/Kolkata')
    setCurrency('INR')
    setGeoMessage('')
    setCountryIso('IN')
    setStateIso('')
    setCityId('')
    setTownId('')
    setFirstName('')
    setLastName('')
    setWorkEmail('')
    setPersonalEmail('')
    setDob(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    onOpenChange(next)
  }

  function buildPayload(): ProvisionTenantPayload {
    return {
      organization: {
        name: orgName.trim(),
        address: orgAddress.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        panNo: panNo.trim() || undefined,
      },
      packs,
      headOffice: {
        name: hoName.trim(),
        countryId: countryIso,
        stateId: stateIso,
        cityId,
        townId,
        postalCode: postalCode.trim(),
        address: hoAddress.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        timezone,
        currency,
      },
      owner: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        workEmail: workEmail.trim(),
        ...(personalEmail.trim() ? { personalEmail: personalEmail.trim() } : {}),
        dateOfBirth: dob ? dob.toString() : '',
      },
      sendMail,
    }
  }

  function validateStep(): { message: string; field?: string } | null {
    if (step === 0) {
      if (!orgName.trim()) return { message: 'Organization name is required.', field: 'organization.name' }
      if (orgName.trim().length > L.organizationName) {
        return {
          message: `Organization name must be at most ${L.organizationName} characters.`,
          field: 'organization.name',
        }
      }
      if (orgAddress.trim().length > L.organizationAddress) {
        return {
          message: `Organization address must be at most ${L.organizationAddress} characters.`,
          field: 'organization.address',
        }
      }
      return null
    }
    if (step === 1) {
      if (
        !hoName.trim() ||
        !hoAddress.trim() ||
        !countryIso ||
        !stateIso ||
        !cityId ||
        !townId ||
        !postalCode.trim() ||
        !timezone.trim() ||
        !currency.trim()
      ) {
        return {
          message: !hoAddress.trim()
            ? 'Branch address is required. Use Registered Address, or type it here.'
            : 'Complete all head-office location fields.',
          field: !hoAddress.trim() ? 'headOffice.address' : undefined,
        }
      }
      if (hoName.trim().length > L.branchName) {
        return { message: `Branch name must be at most ${L.branchName} characters.`, field: 'headOffice.name' }
      }
      if (hoAddress.trim().length > L.branchAddress) {
        return {
          message: `Branch address must be at most ${L.branchAddress} characters.`,
          field: 'headOffice.address',
        }
      }
      if (postalCode.trim().length > L.postalCode) {
        return {
          message: `Postal code must be at most ${L.postalCode} characters.`,
          field: 'headOffice.postalCode',
        }
      }
      if (!latitude.trim() || !longitude.trim()) {
        return { message: 'Set latitude and longitude — use address lookup or current location.' }
      }
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        return { message: 'Latitude and longitude must be numbers.' }
      }
      return null
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !workEmailTrimmed || !dob) {
        return { message: 'Complete first name, last name, work email, and date of birth.' }
      }
      if (firstName.trim().length > L.ownerFirstName) {
        return {
          message: `First name must be at most ${L.ownerFirstName} characters.`,
          field: 'owner.firstName',
        }
      }
      if (lastName.trim().length > L.ownerLastName) {
        return { message: `Last name must be at most ${L.ownerLastName} characters.`, field: 'owner.lastName' }
      }
      if (workEmailTrimmed.length > L.workEmail) {
        return { message: `Work email must be at most ${L.workEmail} characters.`, field: 'owner.workEmail' }
      }
      if (personalEmailTrimmed.length > L.personalEmail) {
        return {
          message: `Recovery email must be at most ${L.personalEmail} characters.`,
          field: 'owner.personalEmail',
        }
      }
      if (!personalEmailTrimmed && workEmailTrimmed.length > L.personalEmail) {
        return {
          message: `Recovery email is required when work email exceeds ${L.personalEmail} characters.`,
          field: 'owner.personalEmail',
        }
      }
      return null
    }
    return null
  }

  async function fillCoordinatesFromAddress() {
    const address = hoAddress.trim()
    if (!address) {
      setGeoMessage(
        orgAddress.trim()
          ? 'Use Registered Address (or type a branch address), then look up coordinates.'
          : 'Type the branch address first.',
      )
      return
    }
    setGeoBusy(true)
    setGeoMessage('Looking up the address…')
    try {
      const pick = await geocodeAddress(address)
      if (pick) {
        setLatitude(String(pick.lat))
        setLongitude(String(pick.lng))
        setGeoMessage('Coordinates filled from the address.')
      } else {
        setGeoMessage("Couldn't find that address. Check it, or enter the coordinates.")
      }
    } finally {
      setGeoBusy(false)
    }
  }

  function detectCurrentLocation() {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (zone) setTimezone(zone)
    } catch {
      /* leave timezone alone */
    }
    if (!navigator.geolocation) {
      setGeoMessage("This browser can't share its location.")
      return
    }
    setGeoBusy(true)
    setGeoMessage('Finding your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude))
        setLongitude(String(coords.longitude))
        setGeoBusy(false)
        setGeoMessage('Coordinates set to your current location.')
      },
      () => {
        setGeoBusy(false)
        setGeoMessage("Couldn't read your location. Allow location access, or enter the coordinates.")
      },
      { enableHighAccuracy: true },
    )
  }

  function onNext() {
    setError(null)
    setFieldError(null)
    const problem = validateStep()
    if (problem) {
      setError(problem.message)
      setFieldError(problem.field ?? null)
      return
    }
    if (step === 0 && !hoAddress.trim() && orgAddress.trim()) {
      setHoAddress(orgAddress.trim().slice(0, L.branchAddress))
    }
    setStep((s) => Math.min(3, s + 1) as Step)
  }

  async function onCreate() {
    setError(null)
    setFieldError(null)
    const problem = validateStep()
    if (problem) {
      setError(problem.message)
      setFieldError(problem.field ?? null)
      const jump = platformCreateFieldStep(problem.field)
      if (jump !== null) setStep(jump)
      return
    }
    setBusy(true)
    try {
      const result = await createPlatformTenant(buildPayload())
      onCreated({ rootOrgId: result.rootOrgId, resumed: result.resumed })
      handleOpenChange(false)
      toast.success(result.resumed ? 'Tenant provisioning resumed.' : 'Tenant created.')
    } catch (err) {
      const info = platformApiErrorInfo(err)
      setError(info.message)
      setFieldError(info.field ?? null)
      const jump = platformCreateFieldStep(info.field)
      if (jump !== null) setStep(jump)
      toast.error(info.message)
    } finally {
      setBusy(false)
    }
  }

  const last = step === 3

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Create Tenant"
      description="Root organization, head office, packs, and the first Owner — all or nothing."
      icon={<Building2 aria-hidden />}
      tone="brand"
      size="2xl"
      dirty={dirty}
      submitting={busy}
      subheader={<Stepper steps={[...WIZARD_STEPS]} activeStep={step} completed={completed} />}
      footer={(requestClose) => (
        <>
          <Button type="button" variant="ghost" disabled={busy} onClick={requestClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError(null)
                  setFieldError(null)
                  setStep((s) => Math.max(0, s - 1) as Step)
                }}
              >
                Back
              </Button>
            ) : null}
            {last ? (
              <Button type="button" disabled={busy} loading={busy} onClick={() => void onCreate()}>
                Create Tenant
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={onNext}>
                Next
              </Button>
            )}
          </div>
        </>
      )}
    >
      <div className="space-y-5">
        {error ? (
          <Alert variant="danger">
            <AlertTitle>Could Not Continue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {step === 0 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={fieldError === 'organization.name' || undefined}>
              <FieldLabel htmlFor="ct-org-name">Organization Name</FieldLabel>
              <Input
                id="ct-org-name"
                size="lg"
                required
                maxLength={L.organizationName}
                value={orgName}
                aria-invalid={fieldError === 'organization.name' || undefined}
                onChange={(e) => {
                  setOrgName(e.target.value)
                  if (fieldError === 'organization.name') setFieldError(null)
                }}
              />
              {fieldError === 'organization.name' && error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Field data-invalid={fieldError === 'organization.address' || undefined}>
              <FieldLabel htmlFor="ct-org-address">Registered Address</FieldLabel>
              <Textarea
                id="ct-org-address"
                maxLength={L.organizationAddress}
                value={orgAddress}
                aria-invalid={fieldError === 'organization.address' || undefined}
                onChange={(e) => {
                  setOrgAddress(e.target.value)
                  if (fieldError === 'organization.address') setFieldError(null)
                }}
              />
              <FieldDescription>
                {orgAddress.length}/{L.organizationAddress} characters
              </FieldDescription>
              {fieldError === 'organization.address' && error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ct-org-gst">GST Number</FieldLabel>
                <Input id="ct-org-gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ct-org-pan">PAN</FieldLabel>
                <Input id="ct-org-pan" value={panNo} onChange={(e) => setPanNo(e.target.value)} />
              </Field>
            </div>
            <SearchSelect
              id="ct-plan"
              label="Commercial Plan"
              value={planId}
              disabled={plansLoading}
              options={planItems}
              hint="Defaults from Platform Settings. Choose Custom to toggle packs individually."
              onValueChange={(v) => {
                const next = String(v ?? 'custom')
                setPlanId(next)
                if (next === 'custom') return
                const plan = commercialPlans.find((p) => p.id === next)
                if (plan) setPacks(optionalPacksFromFlags(plan.packs))
              }}
            />
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">Module Packs</legend>
              <p className="text-sm text-muted-foreground">Core is always on. Toggle the rest for this tenant.</p>
              {(
                [
                  ['workforce', 'Workforce'],
                  ['pay', 'Pay'],
                  ['psa', 'PSA'],
                  ['talent', 'Talent'],
                ] as const
              ).map(([key, label]) => (
                <Label key={key} className="flex items-center gap-3 font-normal">
                  <Checkbox
                    checked={packs[key]}
                    disabled={planId !== 'custom'}
                    onCheckedChange={(v) => {
                      setPlanId('custom')
                      setPacks((p) => ({ ...p, [key]: v === true }))
                    }}
                  />
                  {label}
                </Label>
              ))}
            </fieldset>
            <Label className="flex items-center gap-3 font-normal">
              <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(v === true)} />
              Send Owner password-setup email
            </Label>
          </FieldGroup>
        ) : null}

        {step === 1 ? (
          <FieldGroup className="gap-5">
            <Field data-invalid={fieldError === 'headOffice.name' || undefined}>
              <FieldLabel htmlFor="ct-ho-name">Branch Name</FieldLabel>
              <Input
                id="ct-ho-name"
                size="lg"
                required
                maxLength={L.branchName}
                value={hoName}
                aria-invalid={fieldError === 'headOffice.name' || undefined}
                onChange={(e) => {
                  setHoName(e.target.value)
                  if (fieldError === 'headOffice.name') setFieldError(null)
                }}
              />
              {fieldError === 'headOffice.name' && error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <LocationFields
              value={{
                countryId: countryIso,
                stateId: stateIso,
                cityId,
                townId,
                postalCode,
                address: hoAddress,
                latitude,
                longitude,
                timezone,
                currency,
              }}
              onChange={(patch) => {
                if (patch.countryId !== undefined) {
                  const iso = patch.countryId
                  setCountryIso(iso)
                  setStateIso('')
                  setCityId('')
                  const c = countries.find((x) => x.iso2 === iso)
                  if (c?.currency) setCurrency(c.currency)
                  if (c?.defaultTimezone) setTimezone(c.defaultTimezone)
                }
                if (patch.stateId !== undefined) {
                  setStateIso(patch.stateId)
                  setCityId('')
                }
                if (patch.cityId !== undefined) setCityId(patch.cityId)
                if (patch.townId !== undefined) setTownId(patch.townId)
                if (patch.postalCode !== undefined) setPostalCode(patch.postalCode)
                if (patch.address !== undefined) {
                  setHoAddress(patch.address)
                  if (fieldError === 'headOffice.address') setFieldError(null)
                }
                if (patch.latitude !== undefined) setLatitude(patch.latitude)
                if (patch.longitude !== undefined) setLongitude(patch.longitude)
                if (patch.timezone !== undefined) setTimezone(patch.timezone)
                if (patch.currency !== undefined) setCurrency(patch.currency)
              }}
              countryOptions={countryItems}
              stateOptions={stateItems}
              cityOptions={cityItems}
              townOptions={townItems}
              timezoneOptions={timezoneItems}
              showTimezone
              showCurrency
              addressMaxLength={L.branchAddress}
              postalCodeMaxLength={L.postalCode}
              errors={locationErrors}
              reuseAddress={orgAddress}
              reuseAddressLabel="Use Registered Address"
              onReuseAddress={() => {
                const next = orgAddress.trim().slice(0, L.branchAddress)
                if (!next) return
                setHoAddress(next)
                if (fieldError === 'headOffice.address') setFieldError(null)
              }}
              geoBusy={geoBusy}
              geoMessage={geoMessage}
              onGeocodeFromAddress={() => void fillCoordinatesFromAddress()}
              onUseCurrentLocation={detectCurrentLocation}
            />
          </FieldGroup>
        ) : null}

        {step === 2 ? (
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={fieldError === 'owner.firstName' || undefined}>
                <FieldLabel htmlFor="ct-fn">First Name</FieldLabel>
                <Input
                  id="ct-fn"
                  size="lg"
                  required
                  maxLength={L.ownerFirstName}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field data-invalid={fieldError === 'owner.lastName' || undefined}>
                <FieldLabel htmlFor="ct-ln">Last Name</FieldLabel>
                <Input
                  id="ct-ln"
                  size="lg"
                  required
                  maxLength={L.ownerLastName}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
            </div>
            <Field data-invalid={fieldError === 'owner.workEmail' || undefined}>
              <FieldLabel htmlFor="ct-work">Work Email</FieldLabel>
              <Input
                id="ct-work"
                type="email"
                size="lg"
                required
                maxLength={L.workEmail}
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
              />
              <FieldDescription>Sign-in identity (max {L.workEmail} characters).</FieldDescription>
            </Field>
            <Field data-invalid={fieldError === 'owner.personalEmail' || undefined}>
              <FieldLabel htmlFor="ct-personal">Recovery Email</FieldLabel>
              <Input
                id="ct-personal"
                type="email"
                size="lg"
                maxLength={L.personalEmail}
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder={
                  workEmailTrimmed.length > L.personalEmail
                    ? 'Required — work email is too long to reuse'
                    : 'Optional — leave blank to use work email'
                }
              />
              <FieldDescription>
                Max {L.personalEmail} characters.
                {recoveryUsesWork ? ' Setup mail will go to the work address only.' : null}
              </FieldDescription>
              {fieldError === 'owner.personalEmail' && error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <DatePicker
              label="Date Of Birth"
              isRequired
              value={dob}
              onChange={(d) => setDob(d)}
              placeholderValue={parseDate('1990-01-01')}
              description="Open the calendar, then click the month title to jump by month or year."
            />
          </FieldGroup>
        ) : null}

        {step === 3 ? (
          <DescriptionList
            rows={[
              { label: 'Organization', value: orgName.trim() || '—' },
              { label: 'Plan', value: selectedPlanName },
              {
                label: 'Packs',
                value: `Core${packs.workforce ? ' · Workforce' : ''}${packs.pay ? ' · Pay' : ''}${packs.psa ? ' · PSA' : ''}${packs.talent ? ' · Talent' : ''}`,
              },
              { label: 'Head office', value: `${hoName.trim()} — ${hoAddress.trim() || '—'}` },
              {
                label: 'Location',
                value: `${countryIso} / ${stateIso} / ${cityId} · ${timezone} · ${currency}`,
              },
              {
                label: 'Owner',
                value: `${firstName} ${lastName} <${workEmailTrimmed}>`,
              },
              {
                label: 'Recovery',
                value: resolvedRecoveryEmail || '—',
              },
              { label: 'Setup mail', value: sendMail ? 'Yes' : 'No' },
            ]}
          />
        ) : null}
      </div>
    </FormDialog>
  )
}
