import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseDate, type DateValue } from '@internationalized/date'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Checkbox } from '@/ds/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert'
import { Spinner } from '@/ds/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { DatePicker } from '@/ds/ui/date-picker'
import { Label } from '@/ds/ui/label'
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
import { PlatformShell } from './PlatformShell'
import { usePlatformSession } from './PlatformSessionContext'

type Step = 0 | 1 | 2 | 3

function errMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
  return (
    ax.response?.data?.detail ||
    (ax.response?.data?.message && ax.response.data.message !== 'Forbidden' ? ax.response.data.message : '') ||
    ax.message ||
    'Something went wrong'
  )
}

const STEPS = ['Organization', 'Head Office', 'Owner', 'Review'] as const

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
  const [packs, setPacks] = useState({ workforce: true, pay: true, psa: true, talent: true })
  const [sendMail, setSendMail] = useState(true)

  const [hoName, setHoName] = useState('Head Office')
  const [hoAddress, setHoAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState('18.5204')
  const [longitude, setLongitude] = useState('73.8567')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [currency, setCurrency] = useState('INR')

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

  if (!isAdmin) {
    return (
      <PlatformShell title="Create Tenant" description="Only platform admins can provision tenants.">
        <Alert variant="warning">
          <AlertTitle>Admin Required</AlertTitle>
          <AlertDescription>Ask a KAIZNOVA platform ADMIN to create tenants.</AlertDescription>
        </Alert>
        <Button variant="outline" render={<Link to="/platform/tenants" />}>
          <ArrowLeft aria-hidden /> Back To Tenants
        </Button>
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
        personalEmail: personalEmail.trim(),
        dateOfBirth: dob ? dob.toString() : '',
      },
      sendMail,
    }
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!orgName.trim()) return 'Organization name is required.'
      return null
    }
    if (step === 1) {
      if (!hoName.trim() || !countryIso || !stateIso || !cityId || !townId || !postalCode.trim()) {
        return 'Complete all head-office location fields.'
      }
      if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        return 'Latitude and longitude must be numbers.'
      }
      return null
    }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !workEmail.trim() || !personalEmail.trim() || !dob) {
        return 'Complete all owner fields.'
      }
      if (personalEmail.trim().length > 30) return 'Personal email must be at most 30 characters.'
      if (workEmail.trim().length > 50) return 'Work email must be at most 50 characters.'
      return null
    }
    return null
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
      setError(errMessage(err))
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
      <ol className="flex flex-wrap gap-2" aria-label="Wizard steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <span
              className={
                i === step
                  ? 'rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground'
                  : 'rounded-full px-3 py-1 text-sm text-muted-foreground'
              }
            >
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {error ? (
        <Alert variant="danger">
          <AlertTitle>Could Not Continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="grid max-w-2xl gap-6"
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
                    onCheckedChange={(v) => setPacks((p) => ({ ...p, [key]: v === true }))}
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
                value={hoAddress}
                placeholder={orgAddress || undefined}
                onChange={(e) => setHoAddress(e.target.value)}
              />
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
                <SelectTrigger className="w-full" aria-labelledby="country-label">
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
                  <SelectTrigger className="w-full" aria-labelledby="state-label">
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
                  <SelectTrigger className="w-full" aria-labelledby="city-label">
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
                  <SelectTrigger className="w-full" aria-labelledby="town-label">
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
                  <SelectTrigger className="w-full" aria-labelledby="tz-label">
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
                <Input id="lat" required value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lng">Longitude</FieldLabel>
                <Input id="lng" required value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </Field>
            </div>
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
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="personal">Personal Email</FieldLabel>
              <Input
                id="personal"
                type="email"
                size="lg"
                required
                maxLength={30}
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Max 30 characters (database limit).</p>
            </Field>
            <DatePicker
              label="Date Of Birth"
              isRequired
              value={dob}
              onChange={(d) => setDob(d)}
              placeholderValue={parseDate('1990-01-01')}
            />
            <Label className="flex items-center gap-3 font-normal">
              <Checkbox checked={sendMail} onCheckedChange={(v) => setSendMail(v === true)} />
              Send password-setup email to the Owner
            </Label>
          </FieldGroup>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 text-sm">
            <p>
              <span className="text-muted-foreground">Organization</span>
              <br />
              <span className="font-medium">{orgName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Packs</span>
              <br />
              Core
              {packs.workforce ? ' + Workforce' : ''}
              {packs.pay ? ' + Pay' : ''}
              {packs.psa ? ' + PSA' : ''}
              {packs.talent ? ' + Talent' : ''}
            </p>
            <p>
              <span className="text-muted-foreground">Head Office</span>
              <br />
              {hoName} — {cityId}, {stateIso}, {countryIso} ({timezone}, {currency})
            </p>
            <p>
              <span className="text-muted-foreground">Owner</span>
              <br />
              {firstName} {lastName} &lt;{workEmail}&gt;
              {sendMail ? ' — setup mail on' : ' — no mail'}
            </p>
          </div>
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
    </PlatformShell>
  )
}
