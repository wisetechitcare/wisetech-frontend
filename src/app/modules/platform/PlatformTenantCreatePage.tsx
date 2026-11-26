import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { parseDate, type DateValue } from '@internationalized/date'
import { ArrowLeft, LocateFixed, MapPin } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Checkbox } from '@/ds/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { DatePicker } from '@/ds/ui/date-picker'
import { Label } from '@/ds/ui/label'
import { Card, CardContent } from '@/ds/ui/card'
import { Stepper } from '@/ds/patterns/stepper'
import { DescriptionList } from '@/ds/patterns/description-list'
import { EmptyState } from '@/ds/patterns/empty-state'
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
import {
  fetchPlatformPlans,
  type PlatformCommercialPlan,
} from '@services/platformSettings'
import { optionalPacksFromFlags, type OptionalPacks } from '@constants/platformPlans'
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'
import { platformApiError } from './platformApiError'

const FALLBACK_PACKS: OptionalPacks = {
  workforce: true,
  pay: false,
  psa: false,
  talent: false,
}

type Step = 0 | 1 | 2 | 3

const WIZARD_STEPS = [
  { label: 'Organization', description: 'Name, tax IDs, packs' },
  { label: 'Head Office', description: 'Location and timezone' },
  { label: 'Owner', description: 'First admin user' },
  { label: 'Review', description: 'Confirm and create' },
] as const

export default function PlatformTenantCreatePage() {
  const navigate = useNavigate()
  const { user } = usePlatformSession()
  const isAdmin = user?.platformRole === 'ADMIN'

  const [step, setStep] = useState<Step>(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgAddress, setOrgAddress] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [panNo, setPanNo] = useState('')
  const [commercialPlans, setCommercialPlans] = useState<PlatformCommercialPlan[]>([])
  const [defaultPlanId, setDefaultPlanId] = useState<string | null>(null)
  const [plansLoading, setPlansLoading] = useState(true)
  const [planId, setPlanId] = useState<string>('custom')
  const [packs, setPacks] = useState<OptionalPacks>(() => ({ ...FALLBACK_PACKS }))
  const [sendMail, setSendMail] = useState(true)

  const planItems = useMemo(
    () => [
      ...commercialPlans.map((p) => ({ value: p.id, label: p.isDefault ? `${p.name} (default)` : p.name })),
      { value: 'custom', label: 'Custom packs' },
    ],
    [commercialPlans],
  )

  const selectedPlanName = useMemo(() => {
    if (planId === 'custom') return 'Custom'
    return commercialPlans.find((p) => p.id === planId)?.name ?? planId
  }, [commercialPlans, planId])

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

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    let cancelled = false
    setPlansLoading(true)
    void fetchPlatformPlans()
      .then((data) => {
        if (cancelled) return
        setCommercialPlans(data.plans.filter((p) => p.isActive))
        setDefaultPlanId(data.defaultNewTenantPlanId)
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
        setDefaultPlanId(null)
        setPlanId('custom')
        setPacks({ ...FALLBACK_PACKS })
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!countryIso) {
      setStates([])
      return
    }
    void platformGeoStates(countryIso)
      .then(setStates)
      .catch(() => setStates([]))
    setStateIso('')
    setCityId('')
  }, [countryIso])

  useEffect(() => {
    if (!countryIso || !stateIso) {
      setCities([])
      return
    }
    void platformGeoCities(countryIso, stateIso)
      .then(setCities)
      .catch(() => setCities([]))
    setCityId('')
  }, [countryIso, stateIso])

  const countryItems = useMemo(
    () => countries.map((c) => ({ value: c.iso2, label: c.name })),
    [countries],
  )
  const stateItems = useMemo(
    () =>
      states.map((s) => ({
        value: s.iso2 || s.name,
        label: s.name,
      })),
    [states],
  )
  const cityItems = useMemo(
    () =>
      cities.map((c) => ({
        value: String(c.name),
        label: c.name,
      })),
    [cities],
  )
  const townItems = useMemo(
    () => towns.map((t) => ({ value: t.id, label: t.name })),
    [towns],
  )

  const timezoneItems = useMemo(() => {
    const c = countries.find((x) => x.iso2 === countryIso)
    const zones = c?.timezones?.length ? c.timezones : [timezone]
    return zones.map((z) => ({ value: z, label: z }))
  }, [countries, countryIso, timezone])

  const completed = useMemo(() => {
    const map: Record<number, boolean> = {}
    for (let i = 0; i < step; i++) map[i] = true
    return map
  }, [step])

  if (!isAdmin) {
    return (
      <PlatformShell title="Create Tenant" description="Only platform admins can provision tenants.">
        <EmptyState
          variant="error"
          title="Admin Required"
          description="Ask a KAIZNOVA platform ADMIN to create tenants."
          action={
            <Button size="sm" variant="outline" render={<Link to="/platform/tenants" />}>
              <ArrowLeft aria-hidden /> Back To Tenants
            </Button>
          }
        />
      </PlatformShell>
    )
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
        address: (hoAddress.trim() || orgAddress.trim()),
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

  const workEmailTrimmed = workEmail.trim()
  const personalEmailTrimmed = personalEmail.trim()
  const recoveryUsesWork =
    !personalEmailTrimmed && workEmailTrimmed.length > 0 && workEmailTrimmed.length <= 30
  const resolvedRecoveryEmail = personalEmailTrimmed || (recoveryUsesWork ? workEmailTrimmed : '')

  function validateStep(): string | null {
    if (step === 0) {
      if (!orgName.trim()) return 'Organization name is required.'
      return null
    }
    if (step === 1) {
      if (
        !hoName.trim() ||
        !(hoAddress.trim() || orgAddress.trim()) ||
        !countryIso ||
        !stateIso ||
        !cityId ||
        !townId ||
        !postalCode.trim() ||
        !timezone.trim() ||
        !currency.trim()
      ) {
        return 'Complete all head-office location fields.'
      }
      if (!latitude.trim() || !longitude.trim()) {
        return 'Set latitude and longitude — use address lookup or current location.'
      }
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        return 'Latitude and longitude must be numbers.'
      }
      return null
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !workEmailTrimmed || !dob) {
        return 'Complete first name, last name, work email, and date of birth.'
      }
      if (workEmailTrimmed.length > 50) return 'Work email must be at most 50 characters.'
      if (personalEmailTrimmed.length > 30) return 'Recovery email must be at most 30 characters.'
      if (!personalEmailTrimmed && workEmailTrimmed.length > 30) {
        return 'Recovery email is required when work email exceeds 30 characters.'
      }
      return null
    }
    return null
  }

  async function fillCoordinatesFromAddress() {
    const address = (hoAddress.trim() || orgAddress.trim())
    if (!address) {
      setGeoMessage('Type the branch address first (or set the organization address).')
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
    const problem = validateStep()
    if (problem) {
      setError(problem)
      return
    }
    setStep((s) => Math.min(3, s + 1) as Step)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const problem = validateStep()
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    try {
      const result = await createPlatformTenant(buildPayload())
      navigate('/platform/tenants', {
        replace: true,
        state: { createdRootOrgId: result.rootOrgId, resumed: result.resumed },
      })
    } catch (err) {
      setError(platformApiError(err))
      toast.error(platformApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PlatformShell
      title="Create Tenant"
      description="Provisions a root organization, head office, pack entitlements, and the first Owner. All or nothing."
      actions={
        <Button variant="outline" render={<Link to="/platform/tenants" />}>
          <ArrowLeft aria-hidden /> Cancel
        </Button>
      }
    >
      <Stepper
        steps={[...WIZARD_STEPS]}
        activeStep={step}
        completed={completed}
        onStepClick={(i) => {
          if (i <= step) setStep(i as Step)
        }}
      />

      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card variant="panel" className="max-w-2xl">
        <CardContent className="pt-6">
      <form
        className="grid gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (step < 3) onNext()
          else void onSubmit(e)
        }}
        noValidate
      >
        {step === 0 ? (
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="org-name">Organization Name</FieldLabel>
              <Input id="org-name" size="lg" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="org-address">Registered Address</FieldLabel>
              <Input id="org-address" size="lg" value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="org-gst">GST Number</FieldLabel>
                <Input id="org-gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="org-pan">PAN</FieldLabel>
                <Input id="org-pan" value={panNo} onChange={(e) => setPanNo(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel id="plan-label">Commercial Plan</FieldLabel>
              <Select
                items={planItems}
                value={planId}
                onValueChange={(v) => {
                  const next = String(v ?? defaultPlanId ?? 'custom')
                  setPlanId(next)
                  if (next === 'custom') return
                  const plan = commercialPlans.find((p) => p.id === next)
                  if (plan) setPacks(optionalPacksFromFlags(plan.packs))
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-labelledby="plan-label"
                  disabled={plansLoading}
                >
                  <SelectValue placeholder={plansLoading ? 'Loading plans…' : 'Select plan'} />
                </SelectTrigger>
                <SelectContent>
                  {planItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Defaults from Platform Settings. Choose Custom to toggle packs individually.
              </p>
            </Field>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">Module Packs</legend>
              <p className="text-sm text-muted-foreground">Core is always on. Toggle the rest for this tenant.</p>
              {([
                ['workforce', 'Workforce'],
                ['pay', 'Pay'],
                ['psa', 'PSA'],
                ['talent', 'Talent'],
              ] as const).map(([key, label]) => (
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
            <Field>
              <FieldLabel htmlFor="ho-name">Branch Name</FieldLabel>
              <Input id="ho-name" size="lg" required value={hoName} onChange={(e) => setHoName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ho-address">Branch Address</FieldLabel>
              <Input
                id="ho-address"
                size="lg"
                aria-required="true"
                required={!orgAddress.trim()}
                value={hoAddress}
                placeholder={orgAddress || undefined}
                onChange={(e) => setHoAddress(e.target.value)}
              />
              <FieldDescription>
                Required (or reuse the organization address). Used for map coordinate lookup.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel id="country-label">Country</FieldLabel>
              <Select
                items={countryItems}
                value={countryIso}
                onValueChange={(v) => {
                  const iso = String(v ?? '')
                  setCountryIso(iso)
                  const c = countries.find((x) => x.iso2 === iso)
                  if (c?.currency) setCurrency(c.currency)
                  if (c?.defaultTimezone) setTimezone(c.defaultTimezone)
                }}
              >
                <SelectTrigger className="w-full" aria-required="true" aria-labelledby="country-label">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countryItems.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel id="state-label">State</FieldLabel>
                <Select items={stateItems} value={stateIso || null} onValueChange={(v) => setStateIso(String(v ?? ''))}>
                  <SelectTrigger className="w-full" aria-required="true" aria-labelledby="state-label">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel id="city-label">City</FieldLabel>
                <Select items={cityItems} value={cityId || null} onValueChange={(v) => setCityId(String(v ?? ''))}>
                  <SelectTrigger className="w-full" aria-required="true" aria-labelledby="city-label">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    {cityItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel id="town-label">Town</FieldLabel>
                <Select items={townItems} value={townId || null} onValueChange={(v) => setTownId(String(v ?? ''))}>
                  <SelectTrigger className="w-full" aria-required="true" aria-labelledby="town-label">
                    <SelectValue placeholder="Town" />
                  </SelectTrigger>
                  <SelectContent>
                    {townItems.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="postal">Postal Code</FieldLabel>
                <Input id="postal" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel id="tz-label">Timezone</FieldLabel>
                <Select items={timezoneItems} value={timezone} onValueChange={(v) => setTimezone(String(v ?? ''))}>
                  <SelectTrigger className="w-full" aria-required="true" aria-labelledby="tz-label">
                    <SelectValue placeholder="Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneItems.map((z) => (
                      <SelectItem key={z.value} value={z.value}>
                        {z.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="currency">Currency</FieldLabel>
                <Input id="currency" required value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lat">Latitude</FieldLabel>
                <Input
                  id="lat"
                  required
                  inputMode="decimal"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lng">Longitude</FieldLabel>
                <Input
                  id="lng"
                  required
                  inputMode="decimal"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={geoBusy}
                onClick={() => void fillCoordinatesFromAddress()}
              >
                <MapPin data-icon="inline-start" aria-hidden /> Get Coordinates From Address
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={geoBusy}
                onClick={detectCurrentLocation}
              >
                <LocateFixed data-icon="inline-start" aria-hidden /> Use My Current Location
              </Button>
              {geoBusy ? <Spinner className="size-4" aria-hidden /> : null}
            </div>
            {geoMessage ? (
              <p aria-live="polite" className="text-xs text-muted-foreground">
                {geoMessage}
              </p>
            ) : (
              <FieldDescription>
                Same helpers as Branches: look up the address, or use the device location (also sets timezone).
              </FieldDescription>
            )}
          </FieldGroup>
        ) : null}

        {step === 2 ? (
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fn">First Name</FieldLabel>
                <Input id="fn" size="lg" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ln">Last Name</FieldLabel>
                <Input id="ln" size="lg" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="work">Work Email</FieldLabel>
              <Input
                id="work"
                type="email"
                size="lg"
                required
                autoComplete="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
              />
              <FieldDescription>
                Sign-in identity and org notification contact (max 50 characters).
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="personal">Recovery Email</FieldLabel>
              <Input
                id="personal"
                type="email"
                size="lg"
                maxLength={30}
                autoComplete="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder={
                  workEmailTrimmed.length > 30
                    ? 'Required — work email is too long to reuse'
                    : 'Optional — leave blank to use work email'
                }
              />
              <FieldDescription>
                Personal / recovery inbox (max 30 characters). Leave blank to use the work email when it
                fits. A different address is recommended so a locked work mailbox can still recover
                access.
                {recoveryUsesWork ? ' Setup mail will go to the work address only.' : null}
              </FieldDescription>
            </Field>
            <DatePicker
              label="Date Of Birth"
              isRequired
              value={dob}
              onChange={(d) => setDob(d)}
              placeholderValue={parseDate('1990-01-01')}
              description="Open the calendar, then click the month title to jump by month or year."
            />
            <Label className="flex items-center gap-3 font-normal">
              <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(v === true)} />
              Send password-setup email to the Owner
            </Label>
          </FieldGroup>
        ) : null}

        {step === 3 ? (
          <DescriptionList
            rows={[
              { label: 'Organization', value: orgName },
              {
                label: 'Plan',
                value: `${selectedPlanName} — Core${packs.workforce ? ' + Workforce' : ''}${
                  packs.pay ? ' + Pay' : ''
                }${packs.psa ? ' + PSA' : ''}${packs.talent ? ' + Talent' : ''}`,
              },
              {
                label: 'Head Office',
                value: `${hoName} — ${cityId}, ${stateIso}, ${countryIso} (${timezone}, ${currency})`,
              },
              {
                label: 'Owner',
                value: `${firstName} ${lastName} <${workEmailTrimmed}>`,
              },
              {
                label: 'Recovery',
                value: resolvedRecoveryEmail
                  ? recoveryUsesWork
                    ? `${resolvedRecoveryEmail} (same as work)`
                    : resolvedRecoveryEmail
                  : '—',
              },
              { label: 'Setup mail', value: sendMail ? 'On' : 'Off' },
            ]}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}>
              Back
            </Button>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" aria-hidden /> : null}
            {step < 3 ? 'Continue' : 'Create Tenant'}
          </Button>
        </div>
      </form>
        </CardContent>
      </Card>
    </PlatformShell>
  )
}
