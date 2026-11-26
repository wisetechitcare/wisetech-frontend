import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { parseDate, type DateValue } from '@internationalized/date'
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, Mail } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { Checkbox } from '@/ds/ui/checkbox'
import { Switch } from '@/ds/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Label } from '@/ds/ui/label'
import { DatePicker } from '@/ds/ui/date-picker'
import { FormDialog, FormDialogActions } from '@/ds/patterns/form-dialog'
import { Stepper } from '@/ds/patterns/stepper'
import { DescriptionList } from '@/ds/patterns/description-list'
import { LocationFields } from '@/ds/patterns/location-fields'
import { SearchSelect } from '@/ds/patterns/search-select'
import { geocodeAddress, searchPlaces, toGeoPick } from '@services/geocoding'
import {
  checkPlatformTenantAvailability,
  createPlatformTenant,
  geoTimezoneOptions,
  platformGeoCities,
  platformGeoCountries,
  platformGeoStates,
  type GeoCity,
  type GeoCountry,
  type GeoState,
  type ProvisionAvailabilitySlot,
  type ProvisionTenantPayload,
} from '@services/platformTenants'
import { fetchPlatformPlans, type PlatformCommercialPlan } from '@services/platformSettings'
import { optionalPacksFromFlags, type OptionalPacks } from '@constants/platformPlans'
import { PROVISION_LIMITS as L } from '@constants/provisionColumnLimits'
import { EMAIL_FORMAT, checkEmailDomain } from '@utils/emailDomain'
import { platformApiErrorInfo, platformCreateFieldStep } from './platformApiError'

type OwnerField = 'firstName' | 'lastName' | 'workEmail' | 'personalEmail' | 'dob'

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
  const [countryIso, setCountryIso] = useState('IN')
  const [stateIso, setStateIso] = useState('')
  const [cityId, setCityId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [dob, setDob] = useState<DateValue | null>(null)
  const [ownerErrors, setOwnerErrors] = useState<Partial<Record<OwnerField, string>>>({})
  /** Live uniqueness from GET /availability — idle until blur / Next. */
  const [workEmailAvail, setWorkEmailAvail] = useState<ProvisionAvailabilitySlot | null>(null)
  const [workEmailChecking, setWorkEmailChecking] = useState(false)
  const [orgNameAvail, setOrgNameAvail] = useState<ProvisionAvailabilitySlot | null>(null)

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
  const timezoneItems = useMemo(() => {
    const c = countries.find((x) => x.iso2 === countryIso)
    return geoTimezoneOptions(c?.timezones, timezone)
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
  const setupMailRecipients = useMemo(() => {
    const list: string[] = []
    if (workEmailTrimmed && EMAIL_FORMAT.test(workEmailTrimmed)) list.push(workEmailTrimmed)
    if (
      personalEmailTrimmed &&
      EMAIL_FORMAT.test(personalEmailTrimmed) &&
      personalEmailTrimmed.toLowerCase() !== workEmailTrimmed.toLowerCase()
    ) {
      list.push(personalEmailTrimmed)
    }
    return list
  }, [workEmailTrimmed, personalEmailTrimmed])
  const setupMailReviewValue = sendMail
    ? setupMailRecipients.length
      ? `Yes → ${setupMailRecipients.join(' · ')}`
      : 'Yes — add a valid work email first'
    : 'No — invite Owner later from the tenant list'

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
    setFirstName('')
    setLastName('')
    setWorkEmail('')
    setPersonalEmail('')
    setDob(null)
    setOwnerErrors({})
    setWorkEmailAvail(null)
    setWorkEmailChecking(false)
    setOrgNameAvail(null)
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
      const errs: Partial<Record<OwnerField, string>> = {}
      if (!firstName.trim()) errs.firstName = 'First name is required.'
      else if (firstName.trim().length > L.ownerFirstName) {
        errs.firstName = `First name must be at most ${L.ownerFirstName} characters.`
      }
      if (!lastName.trim()) errs.lastName = 'Last name is required.'
      else if (lastName.trim().length > L.ownerLastName) {
        errs.lastName = `Last name must be at most ${L.ownerLastName} characters.`
      }
      if (!workEmailTrimmed) errs.workEmail = 'Work email is required.'
      else if (!EMAIL_FORMAT.test(workEmailTrimmed)) {
        errs.workEmail = 'Enter a valid work email (name@company.com).'
      } else if (workEmailTrimmed.length > L.workEmail) {
        errs.workEmail = `Work email must be at most ${L.workEmail} characters.`
      }
      if (personalEmailTrimmed) {
        if (!EMAIL_FORMAT.test(personalEmailTrimmed)) {
          errs.personalEmail = 'Enter a valid recovery email (name@company.com).'
        } else if (personalEmailTrimmed.length > L.personalEmail) {
          errs.personalEmail = `Recovery email must be at most ${L.personalEmail} characters.`
        }
      } else if (workEmailTrimmed.length > L.personalEmail) {
        errs.personalEmail = `Recovery email is required when work email exceeds ${L.personalEmail} characters.`
      }
      if (!dob) errs.dob = 'Date of birth is required.'
      setOwnerErrors(errs)
      const order: OwnerField[] = ['firstName', 'lastName', 'workEmail', 'personalEmail', 'dob']
      const firstKey = order.find((k) => errs[k])
      if (firstKey) return { message: errs[firstKey]!, field: `owner.${firstKey}` }
      return null
    }
    return null
  }

  function clearOwnerError(field: OwnerField) {
    setOwnerErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function verifyOwnerEmail(kind: 'workEmail' | 'personalEmail', value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    if (!EMAIL_FORMAT.test(trimmed)) {
      setOwnerErrors((prev) => ({
        ...prev,
        [kind]:
          kind === 'workEmail'
            ? 'Enter a valid work email (name@company.com).'
            : 'Enter a valid recovery email (name@company.com).',
      }))
      if (kind === 'workEmail') setWorkEmailAvail(null)
      return
    }
    clearOwnerError(kind)
    await checkEmailDomain(trimmed)
    if (kind === 'workEmail') {
      setWorkEmailChecking(true)
      try {
        const avail = await checkPlatformTenantAvailability({
          workEmail: trimmed,
          organizationName: orgName.trim() || undefined,
        })
        const slot = avail.workEmail ?? null
        setWorkEmailAvail(slot)
        if (slot && !slot.available) {
          setOwnerErrors((prev) => ({
            ...prev,
            workEmail: slot.message || 'This work email is already used.',
          }))
        }
      } catch {
        setWorkEmailAvail(null)
      } finally {
        setWorkEmailChecking(false)
      }
    } else {
      try {
        const avail = await checkPlatformTenantAvailability({ personalEmail: trimmed })
        const slot = avail.personalEmail
        if (slot && !slot.available) {
          setOwnerErrors((prev) => ({
            ...prev,
            personalEmail: slot.message || 'This recovery email is already used.',
          }))
        }
      } catch {
        /* format already OK — create will re-check */
      }
    }
  }

  async function verifyOrgNameAvailability(name: string): Promise<string | null> {
    const trimmed = name.trim()
    if (!trimmed) return null
    try {
      const avail = await checkPlatformTenantAvailability({ organizationName: trimmed })
      const slot = avail.organizationName ?? null
      setOrgNameAvail(slot)
      if (slot && !slot.available) return slot.message || 'Organization name is already taken.'
      return null
    } catch {
      setOrgNameAvail(null)
      return null
    }
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

  async function onNext() {
    setError(null)
    setFieldError(null)
    const problem = validateStep()
    if (problem) {
      setError(problem.message)
      setFieldError(problem.field ?? null)
      return
    }
    if (step === 0) {
      const orgConflict = await verifyOrgNameAvailability(orgName)
      if (orgConflict) {
        setError(orgConflict)
        setFieldError('organization.name')
        return
      }
      if (!hoAddress.trim() && orgAddress.trim()) {
        setHoAddress(orgAddress.trim().slice(0, L.branchAddress))
      }
    }
    if (step === 2) {
      // Live uniqueness on this step (not Review) — same rules as provision ConflictError.
      setWorkEmailChecking(true)
      try {
        const fresh = await checkPlatformTenantAvailability({
          workEmail: workEmailTrimmed,
          organizationName: orgName.trim() || undefined,
          ...(personalEmailTrimmed ? { personalEmail: personalEmailTrimmed } : {}),
        })
        if (fresh.workEmail) setWorkEmailAvail(fresh.workEmail)
        if (fresh.workEmail && !fresh.workEmail.available) {
          const msg = fresh.workEmail.message || 'This work email is already used.'
          setOwnerErrors((prev) => ({ ...prev, workEmail: msg }))
          setError(msg)
          setFieldError('owner.workEmail')
          return
        }
        if (fresh.personalEmail && !fresh.personalEmail.available) {
          const msg = fresh.personalEmail.message || 'This recovery email is already used.'
          setOwnerErrors((prev) => ({ ...prev, personalEmail: msg }))
          setError(msg)
          setFieldError('owner.personalEmail')
          return
        }
      } catch {
        /* network — create will re-check */
      } finally {
        setWorkEmailChecking(false)
      }
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
      if (info.field === 'owner.workEmail') {
        setOwnerErrors((prev) => ({ ...prev, workEmail: info.message }))
      } else if (info.field === 'owner.personalEmail') {
        setOwnerErrors((prev) => ({ ...prev, personalEmail: info.message }))
      }
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
        <FormDialogActions onCancel={requestClose} disabled={busy}>
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={() => {
                setError(null)
                setFieldError(null)
                setStep((s) => Math.max(0, s - 1) as Step)
              }}
            >
              <ChevronLeft data-icon="inline-start" aria-hidden />
              Back
            </Button>
          ) : null}
          {last ? (
            <Button
              type="button"
              disabled={busy}
              loading={busy}
              className="w-full sm:min-w-36 sm:w-auto"
              onClick={() => void onCreate()}
            >
              Create Tenant
            </Button>
          ) : (
            <Button type="button" disabled={busy} className="w-full sm:min-w-28 sm:w-auto" onClick={onNext}>
              Next
              <ChevronRight data-icon="inline-end" aria-hidden />
            </Button>
          )}
        </FormDialogActions>
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
                  // Only clear dependents when the country actually changes.
                  if (iso !== countryIso) {
                    setStateIso('')
                    setCityId('')
                  }
                  const c = countries.find((x) => x.iso2 === iso)
                  if (c?.currency) setCurrency(c.currency)
                  if (c?.defaultTimezone && !patch.timezone) setTimezone(c.defaultTimezone)
                }
                if (patch.stateId !== undefined) {
                  setStateIso(patch.stateId)
                  if (patch.cityId === undefined && patch.stateId !== stateIso) setCityId('')
                }
                if (patch.cityId !== undefined) setCityId(patch.cityId)
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
              suggestAddress={async (query) => {
                const rows = await searchPlaces(query, 5)
                return rows.map((raw, i) => {
                  const pick = toGeoPick(raw)
                  return {
                    id: String(raw?.place_id ?? `${pick.lat},${pick.lng},${i}`),
                    label: pick.formatted || pick.street || query,
                    address: (pick.street || pick.formatted || query).slice(0, L.branchAddress),
                    postalCode: pick.postcode || undefined,
                    latitude: String(pick.lat),
                    longitude: String(pick.lng),
                    countryName: pick.country || undefined,
                    stateName: pick.state || undefined,
                    cityName: pick.city || undefined,
                    locality: pick.locality || undefined,
                  }
                })
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
              <Field
                data-invalid={
                  ownerErrors.firstName || fieldError === 'owner.firstName' ? true : undefined
                }
              >
                <FieldLabel htmlFor="ct-fn">First Name</FieldLabel>
                <Input
                  id="ct-fn"
                  size="lg"
                  required
                  maxLength={L.ownerFirstName}
                  value={firstName}
                  aria-invalid={ownerErrors.firstName ? true : undefined}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    clearOwnerError('firstName')
                  }}
                />
                {ownerErrors.firstName ? <FieldError>{ownerErrors.firstName}</FieldError> : null}
              </Field>
              <Field
                data-invalid={
                  ownerErrors.lastName || fieldError === 'owner.lastName' ? true : undefined
                }
              >
                <FieldLabel htmlFor="ct-ln">Last Name</FieldLabel>
                <Input
                  id="ct-ln"
                  size="lg"
                  required
                  maxLength={L.ownerLastName}
                  value={lastName}
                  aria-invalid={ownerErrors.lastName ? true : undefined}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    clearOwnerError('lastName')
                  }}
                />
                {ownerErrors.lastName ? <FieldError>{ownerErrors.lastName}</FieldError> : null}
              </Field>
            </div>
            <Field
              data-invalid={
                ownerErrors.workEmail || fieldError === 'owner.workEmail' ? true : undefined
              }
            >
              <FieldLabel htmlFor="ct-work">Work Email</FieldLabel>
              <Input
                id="ct-work"
                type="email"
                size="lg"
                required
                autoComplete="email"
                maxLength={L.workEmail}
                value={workEmail}
                aria-invalid={ownerErrors.workEmail ? true : undefined}
                onChange={(e) => {
                  setWorkEmail(e.target.value)
                  clearOwnerError('workEmail')
                  setWorkEmailAvail(null)
                }}
                onBlur={() => void verifyOwnerEmail('workEmail', workEmail)}
              />
              <FieldDescription>
                Sign-in identity (max {L.workEmail} characters). Availability is checked when you leave
                the field.
              </FieldDescription>
              {workEmailChecking ? (
                <FieldDescription className="flex items-center gap-1.5">
                  <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
                  Checking whether this email is free…
                </FieldDescription>
              ) : null}
              {!workEmailChecking && workEmailAvail?.available === true && !workEmailAvail.resumable ? (
                <FieldDescription className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-success-foreground" aria-hidden />
                  Available for a new tenant.
                </FieldDescription>
              ) : null}
              {!workEmailChecking && workEmailAvail?.resumable ? (
                <FieldDescription className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0 text-info-foreground" aria-hidden />
                  {workEmailAvail.message || 'Will resume an interrupted provision.'}
                </FieldDescription>
              ) : null}
              {!workEmailChecking && workEmailAvail && !workEmailAvail.available ? (
                <Alert variant="warning" className="mt-1">
                  <CircleAlert aria-hidden />
                  <AlertTitle>Work Email Taken</AlertTitle>
                  <AlertDescription>
                    {workEmailAvail.message ||
                      'This address already belongs to another employee. Use a different work email.'}
                  </AlertDescription>
                </Alert>
              ) : ownerErrors.workEmail ? (
                <FieldError>{ownerErrors.workEmail}</FieldError>
              ) : null}
            </Field>
            <Field
              data-invalid={
                ownerErrors.personalEmail || fieldError === 'owner.personalEmail' ? true : undefined
              }
            >
              <FieldLabel htmlFor="ct-personal">Recovery Email</FieldLabel>
              <Input
                id="ct-personal"
                type="email"
                size="lg"
                autoComplete="email"
                maxLength={L.personalEmail}
                value={personalEmail}
                aria-invalid={ownerErrors.personalEmail ? true : undefined}
                onChange={(e) => {
                  setPersonalEmail(e.target.value)
                  clearOwnerError('personalEmail')
                }}
                onBlur={() => {
                  if (personalEmail.trim()) void verifyOwnerEmail('personalEmail', personalEmail)
                  else clearOwnerError('personalEmail')
                }}
                placeholder={
                  workEmailTrimmed.length > L.personalEmail
                    ? 'Required — work email is too long to reuse'
                    : 'Optional — leave blank to use work email'
                }
              />
              <FieldDescription>
                Max {L.personalEmail} characters.
                {recoveryUsesWork ? ' Blank reuses the work address for recovery + setup mail.' : null}
              </FieldDescription>
              {ownerErrors.personalEmail ? <FieldError>{ownerErrors.personalEmail}</FieldError> : null}
            </Field>
            <DatePicker
              label="Date Of Birth"
              isRequired
              value={dob}
              onChange={(d) => {
                setDob(d)
                clearOwnerError('dob')
              }}
              placeholderValue={parseDate('1990-01-01')}
              description="Open the calendar, then click the month title to jump by month or year."
              errorMessage={ownerErrors.dob}
            />
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="ct-send-mail">Send Password-Setup Email</FieldLabel>
                <FieldDescription>
                  {sendMail
                    ? setupMailRecipients.length
                      ? `Will send to ${setupMailRecipients.join(' and ')} after create.`
                      : 'Turned on — enter a valid work email so we know where to send it.'
                    : 'Off — tenant is created without mail; resend later from the tenant list.'}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="ct-send-mail"
                checked={sendMail}
                onCheckedChange={(on) => setSendMail(on === true)}
              />
            </Field>
            {sendMail && setupMailRecipients.length > 0 ? (
              <Alert variant="info">
                <Mail aria-hidden />
                <AlertTitle>Setup Mail Ready</AlertTitle>
                <AlertDescription>
                  Password-setup links go to {setupMailRecipients.join(' · ')}. Work email stays the
                  sign-in identity even when recovery differs.
                </AlertDescription>
              </Alert>
            ) : null}
            {!sendMail ? (
              <Alert variant="warning">
                <Mail aria-hidden />
                <AlertTitle>No Setup Mail</AlertTitle>
                <AlertDescription>
                  Owner will not receive a password link on create. Use Resend Setup from the tenant
                  detail when you are ready.
                </AlertDescription>
              </Alert>
            ) : null}
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
              { label: 'Setup mail', value: setupMailReviewValue, wide: true },
            ]}
          />
        ) : null}
      </div>
    </FormDialog>
  )
}
