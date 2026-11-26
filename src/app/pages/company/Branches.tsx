import { resolveActiveOrgId } from '@utils/activeOrg';
import React, { useEffect, useRef, useState } from 'react'
import { Form, Formik, FormikProps, FormikValues } from 'formik'
import * as Yup from 'yup'
import { Building2, Clock, MapPin, Plus, Settings2, TriangleAlert, Info } from 'lucide-react'
import { PageLink, PageTitle } from '@metronic/layout/core'
import { Alert, AlertDescription } from '@/ds/ui/alert'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Spinner } from '@/ds/ui/spinner'
import { Textarea } from '@/ds/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { AutoGrid } from '@/ds/patterns/auto-grid'
import { EmptyState } from '@/ds/patterns/empty-state'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { PageHeader } from '@/ds/patterns/page-header'
import { SearchSelect } from '@/ds/patterns/search-select'
import { LocationFields } from '@/ds/patterns/location-fields'
import {
  fetchAllCountries,
  fetchAllCurrencies,
  fetchAllStates,
  fetchCountryName,
  fetchStateName,
} from '@services/options'
import {
  createNewBranch,
  fetchAllBranches,
  fetchBranchById,
  fetchCompanyOverview,
  updateBranchById,
  deleteBranchById,
  promoteBranchToSubOrg,
} from '@services/company'
import { geocodeAddress, searchPlaces, toGeoPick } from '@services/geocoding'
import { geoTimezoneOptions } from '@services/platformTenants'
import { PROVISION_LIMITS as L } from '@constants/provisionColumnLimits'
import { successConfirmation, errorConfirmation, genericConfirmation } from '@utils/modal'
import BranchEmployeesModal from '@app/modules/common/components/BranchEmployeesModal'
import BiometricDevicesModal from '@app/modules/common/components/BiometricDevicesModal'
import BranchCard from '@app/modules/common/components/BranchCard'
import { confirmDialog } from '@app/modules/common/components/ui'
import { safeHtml } from '@app/modules/common/components/ui/safeHtml'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import { saveCountries } from '@redux/slices/locations'
// The geo directory, read through the hook rather than the locations slice: that slice
// holds either raw country records or a slimmed {value,label} pair depending on which
// screen loaded first, and only the raw shape carries a currency.
import { useCountryDirectory } from '@hooks/useCurrency'
import { getCurrencySymbol } from '@utils/currency'
import { Option } from '@models/dropdown'
import { UAParser } from 'ua-parser-js'
import { canDelete, canSection } from '@utils/can'

const branchesBreadCrumb: Array<PageLink> = [
  {
    title: 'Company',
    path: '#',
    isSeparator: false,
    isActive: false,
  },
  {
    title: '',
    path: '',
    isSeparator: true,
    isActive: false,
  },
]

/** Same caps as platform Create Tenant HO — do not hardcode a twin. */
const BRANCH_ADDRESS_MAX = L.branchAddress

const branchSchema = Yup.object({
  name: Yup.string()
    .required()
    .max(L.branchName, `Branch Name must be at most ${L.branchName} characters`)
    .label('Branch Name'),
  address: Yup.string()
    .required()
    .max(BRANCH_ADDRESS_MAX, `Branch Address must be at most ${BRANCH_ADDRESS_MAX} characters`)
    .label('Branch Address'),
  cityId: Yup.string().required().label('City'),
  countryId: Yup.string().required().label('Country'),
  stateId: Yup.string().required().label('State'),
  /** Legacy FK — optional; locality lives in the address line (top-SaaS). */
  townId: Yup.string().optional().nullable().label('Town'),
  postalCode: Yup.string()
    .required()
    .max(L.postalCode, `Postal Code must be at most ${L.postalCode} characters`)
    .label('Postal Code'),
  latitude: Yup.string().required().label('Latitude'),
  longitude: Yup.string().required().label('Longitude'),
  currency: Yup.string().max(L.currency).optional().label('Currency'),
  companyId: Yup.string(),
  isActive: Yup.boolean(),
  showDateIn12HourFormat: Yup.string().optional(),
  timezone: Yup.string().max(L.timezone).optional().label('Timezone'),
})

// Curated set of major IANA timezones — one representative per business hub /
// UTC offset, not the full ~400-zone IANA database (unnecessary for a branch
// picker). Auto-filled from the selected Country's `defaultTimezone` (attached
// server-side in location.ts's getCountries, sourced from countryTimezones.ts) the
// moment Country changes — see the Country field's change handler below. Picking a
// value here directly always wins from then on (timezoneManuallyEdited), and the
// backend re-applies the same country-based default as a last-resort fallback if a
// blank timezone ever reaches it (createBranches/updateBranchById).
const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pacific/Midway', label: '(UTC-11:00) Midway Island' },
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Hawaii' },
  { value: 'America/Anchorage', label: '(UTC-09:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'America/Mexico_City', label: '(UTC-06:00) Mexico City' },
  { value: 'America/New_York', label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { value: 'America/Bogota', label: '(UTC-05:00) Bogota, Lima' },
  { value: 'America/Caracas', label: '(UTC-04:00) Caracas' },
  { value: 'America/Santiago', label: '(UTC-04:00) Santiago' },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) Sao Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: '(UTC-03:00) Buenos Aires' },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores' },
  { value: 'Etc/UTC', label: '(UTC+00:00) UTC' },
  { value: 'Europe/London', label: '(UTC+00:00) London, Dublin' },
  { value: 'Africa/Casablanca', label: '(UTC+00:00) Casablanca' },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris, Berlin, Madrid' },
  { value: 'Europe/Rome', label: '(UTC+01:00) Rome, Amsterdam' },
  { value: 'Africa/Lagos', label: '(UTC+01:00) Lagos' },
  { value: 'Europe/Athens', label: '(UTC+02:00) Athens, Cairo' },
  { value: 'Africa/Johannesburg', label: '(UTC+02:00) Johannesburg' },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow' },
  { value: 'Asia/Riyadh', label: '(UTC+03:00) Riyadh' },
  { value: 'Africa/Nairobi', label: '(UTC+03:00) Nairobi' },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai' },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi' },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) India (Mumbai, Delhi)' },
  { value: 'Asia/Kathmandu', label: '(UTC+05:45) Kathmandu' },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka' },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok, Jakarta' },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Beijing, Shanghai' },
  { value: 'Asia/Singapore', label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Hong_Kong', label: '(UTC+08:00) Hong Kong' },
  { value: 'Asia/Kuala_Lumpur', label: '(UTC+08:00) Kuala Lumpur' },
  { value: 'Asia/Manila', label: '(UTC+08:00) Manila' },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo' },
  { value: 'Asia/Seoul', label: '(UTC+09:00) Seoul' },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland' },
]

let initialState = {
  name: '',
  address: '',
  countryId: '',
  cityId: '',
  stateId: '',
  townId: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  currency: '',
  companyId: '',
  /** Matches DB @default(true) and create payload; create also forces true. */
  isActive: true,
  showDateIn12HourFormat: 'inherit',
  timezone: '',
}

const FORM_ID = 'branch-form'

/** The branch's 12/24h choice. Each option shows what it looks like, so nobody has to remember the formats. */
const TIME_FORMAT_OPTIONS = [
  { value: 'inherit', label: 'Organization default' },
  { value: '1', label: '12-hour (2:30 PM)' },
  { value: '0', label: '24-hour (14:30)' },
]

interface BranchesProps {
  /** Scope the list + new-branch creation to this organization. */
  companyId?: string;
  /** Hide the standalone page title/breadcrumb when rendered inside another page. */
  embedded?: boolean;
  /** Hide the "Branches" heading (e.g. when the host modal already shows a title). */
  hideHeading?: boolean;
  /** Deep-link: open the edit form for this branch once the list has loaded. */
  editBranchId?: string;
  /** Fired after `editBranchId` has been consumed (success or miss) so the host can clear it. */
  onEditBranchConsumed?: () => void;
}

/**
 * The branch's slice of the 12/24h cascade, as the DB must store it.
 *
 * `null` is the important return: it means "this branch has no opinion", which is what
 * lets the organization setting through. Returning `false` for anything that is not '1'
 * is the bug this replaces — it made every branch assert 24-hour, and a branch that
 * asserts anything permanently shadows its organization. See utils/timeFormat.ts.
 */
const toBranchTimeFormat = (value: string): boolean | null =>
  value === '1' ? true : value === '0' ? false : null;

/** One text field of the branch form, bound to Formik: kit Field + floating label + error. */
function BranchTextField({
  form, name, label, required, multiline, inputMode, maxLength, hint, trailing,
}: {
  form: FormikProps<typeof initialState>
  name: keyof typeof initialState
  label: string
  required?: boolean
  multiline?: boolean
  inputMode?: 'decimal' | 'numeric' | 'text'
  maxLength?: number
  hint?: string
  trailing?: React.ReactNode
}) {
  const id = `branch-${name}`
  const error = (form.touched[name] || form.submitCount > 0) ? (form.errors[name] as string | undefined) : undefined
  const value = String(form.values[name] ?? '')
  const common = {
    id,
    name,
    required,
    value,
    maxLength,
    onChange: form.handleChange,
    onBlur: form.handleBlur,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  }
  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {trailing}
      </div>
      {multiline ? <Textarea {...common} rows={2} placeholder="Street, area, landmark" /> : <Input {...common} inputMode={inputMode} />}
      {hint ? (
        <FieldDescription id={`${id}-hint`}>
          {hint}
          {typeof maxLength === 'number' ? ` ${value.length}/${maxLength} characters.` : null}
        </FieldDescription>
      ) : typeof maxLength === 'number' ? (
        <FieldDescription>
          {value.length}/{maxLength} characters
        </FieldDescription>
      ) : null}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

function Branches({ companyId, embedded = false, hideHeading = false, editBranchId, onEditBranchConsumed }: BranchesProps = {}) {
  const dispatch = useDispatch()
  const { countries } = useSelector((state: RootState) => state.locations)
  // Read through the hook, not the slice: the slice holds raw records or a slimmed
  // {value,label} pair depending on which screen loaded first, and only raw carries a currency.
  const geoCountries = useCountryDirectory()

  const [show, setShow] = useState(false)

  const [countriesOption, setCountriesOptions] = useState<{ value: string; label: string }[]>([])
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null)
  let countryCode = ''
  // True once the admin has explicitly picked a Timezone in THIS modal session —
  // stops the country-change auto-fill from overwriting a deliberate choice. Reset
  // whenever the modal is (re)opened, in handleNew/handleEdit.
  const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false)
  // null = no country selected yet → Timezone field falls back to the full
  // curated TIMEZONE_OPTIONS list. Once a country is picked, scoped to ONLY that
  // country's real IANA zones (from getCountries' server-side enrichment —
  // countryTimezones.ts, backed by the countries-and-timezones package).
  const [countryTimezoneOptions, setCountryTimezoneOptions] = useState<{ value: string; label: string }[] | null>(null)

  const [statesOption, setStatesOptions] = useState<{ value: string; label: string }[]>([])
  const [selectedState, setSelectedState] = useState<Option | null>(null)


  const [currenciesOption, setCurrenciesOptions] = useState<{ value: string; label: string }[]>([])
  const [isDeviceNotDesktop, setIsDeviceNotDesktop] = useState(false)

  const [branches, setBranches] = useState([])
  const [listReady, setListReady] = useState(false)
  const [orgOptions, setOrgOptions] = useState<{ value: string; label: string }[]>([])
  /** Registered org address by organization id — for “Use organization address” on create. */
  const [orgAddressById, setOrgAddressById] = useState<Record<string, string>>({})
  const [empModal, setEmpModal] = useState<{ show: boolean; branch: any | null }>({ show: false, branch: null })
  const [devicesModal, setDevicesModal] = useState<{ show: boolean; branch: any | null }>({ show: false, branch: null })
  const [loading, setLoading] = useState(false)
  const consumedEditBranchId = useRef<string | null>(null)
  // What the coordinate helpers last did, read out under the buttons (and announced).
  const [geoStatus, setGeoStatus] = useState<{ busy: boolean; message: string }>({ busy: false, message: '' })

  const handlePromoteBranch = async (branch: any) => {
    const empCount = branch._count?.Employees ?? 0
    const confirmed = await confirmDialog({
      title: 'Promote to Sub-Organization?',
      // safeHtml: `branch.name` is user-entered and `html` renders as markup, so a name
      // containing tags would otherwise become elements (the dialog also DOMPurifies it).
      html: safeHtml`This will create a sub-organization <b>"${branch.name}"</b> under the current organization and move this branch${empCount ? ` and its ${empCount} employee(s)` : ''} into it. Employees stay in this branch.`,
      icon: 'question',
      confirmText: 'Promote',
      cancelText: 'Cancel',
    })
    if (!confirmed) return
    try {
      const res = await promoteBranchToSubOrg(branch.id)
      if (res && !res.hasError) {
        successConfirmation('Branch promoted to sub-organization')
        setLoading(prev => !prev) // refetch (branch now lives under the new sub-org)
      } else {
        errorConfirmation(res?.message || 'Failed to promote branch')
      }
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to promote branch')
    }
  }

  const handleDeleteBranch = async (branch: any) => {
    const empCount = branch._count?.Employees ?? 0
    if (empCount > 0) {
      errorConfirmation(`This branch has ${empCount} employee(s). Reassign them before deleting.`)
      return
    }
    const confirmed = await genericConfirmation(
      'Confirm Deletion',
      `Are you sure you want to delete "${branch.name}"? This action cannot be undone.`,
      'Delete'
    )
    if (!confirmed) return
    try {
      // deleteBranchById throws on any non-2xx response. The success response is
      // 204 No Content (empty body), so reaching here without throwing means the
      // delete succeeded — do not gate on res.hasError (res is empty on 204).
      await deleteBranchById(branch.id)
      setLoading(prev => !prev) // trigger refetch
      await successConfirmation('Branch deleted.')
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to delete branch')
    }
  }
  const [editMode, setEditMode] = useState(false)
  const [branchId, setBranchId] = useState('')

  // Branches belong to Organization Profile. `settings` (the parent) read as Write whenever ANY
  // settings tab had it — Write on Media alone showed New Branch. The server checks the same section.
  const canWrite = canSection('settings.profile', 'write')

  useEffect(() => {
    const parser = new UAParser()
    const result = parser.getResult()
    const type = result.device.type
    setIsDeviceNotDesktop(type === 'mobile' || type === 'tablet')
  }, [])

  // Single source of truth for the Country field's options: derived from the RAW
  // country records in redux (id, iso2, name, defaultTimezone, timezones — see
  // fetchCountries below, which dispatches the raw response instead of a
  // pre-slimmed {value,label} pair so those extra fields survive). `value` MUST be
  // iso2, not the numeric id — fetchStates and the backend's countryId-based timezone
  // resolution all key off the ISO2 code (live Branches rows store e.g. "IN").
  useEffect(() => {
    if (countries && countries.length > 0) {
      const options = countries.map((country: any) => ({
        value: country.iso2,
        label: country.name,
      }))
      setCountriesOptions(options)
    }
  }, [countries])

  const handleNew = () => {
    setSelectedCountry(null)
    setSelectedState(null)
    setTimezoneManuallyEdited(false)
    setCountryTimezoneOptions(null)
    setGeoStatus({ busy: false, message: '' })

    const companyForNew = initialState.companyId
    const orgAddr = (orgAddressById[companyForNew] || '').trim().slice(0, BRANCH_ADDRESS_MAX)

    initialState = {
      name: '',
      // Real value (not a placeholder) so Tab/edit/geocode work immediately — same as Create Tenant.
      address: orgAddr,
      countryId: '',
      cityId: '',
      stateId: '',
      townId: '',
      postalCode: '',
      latitude: '',
      longitude: '',
      currency: '',
      companyId: companyForNew,
      isActive: true,
      showDateIn12HourFormat: 'inherit',
      timezone: '',
    }

    setShow(true)
    setEditMode(false)
  }

  const handleClose = () => {
    setShow(false)
    setEditMode(false)
  }

  const handleEdit = async (id: string) => {
    setBranchId(id)
    setTimezoneManuallyEdited(false)
    setGeoStatus({ busy: false, message: '' })
    const {
      data: { branch },
    } = await fetchBranchById(id)
    const {
      address,
      postalCode,
      cityId,
      name,
      stateId,
      countryId,
      townId,
      latitude,
      longitude,
      currency,
      isActive,
      companyId,
      timezone,
    } = branch

    // Resolve display labels defensively — the geo lookups can fail/return null
    // (the local states dataset has no iso2). Never let that block opening the form.
    let countryLabel = countryId
    let stateLabel = stateId
    try { const cn = await fetchCountryName(countryId); if (cn?.name) countryLabel = cn.name } catch { /* keep id */ }
    try { const sn = await fetchStateName(countryId, stateId); if (sn?.name) stateLabel = sn.name } catch { /* keep id */ }

    setSelectedCountry(countryId ? { value: countryId, label: countryLabel } : null)
    setSelectedState(stateId ? { value: stateId, label: stateLabel } : null)
    // Scope the Timezone field to this branch's existing country's zones —
    // WITHOUT touching the branch's own already-saved `timezone` value below.
    setCountryTimezoneOptions(resolveCountryTimezones(countryId).options)

    initialState = {
      address,
      cityId,
      townId,
      countryId,
      name,
      stateId,
      latitude,
      currency: currency || '',
      companyId,
      isActive,
      longitude,
      postalCode,
      showDateIn12HourFormat: branch.showDateIn12HourFormat === true ? '1'
        : branch.showDateIn12HourFormat === false ? '0'
        : 'inherit',
      timezone: timezone || '',
    }

    setShow(true)
    setEditMode(true)

    setStatesOptions([])
  }

  // Deep-link from the org tree: open edit once the branch list has loaded.
  useEffect(() => {
    if (!editBranchId || !listReady) return;
    if (consumedEditBranchId.current === editBranchId) return;
    consumedEditBranchId.current = editBranchId;
    let cancelled = false;
    (async () => {
      try {
        await handleEdit(editBranchId);
      } catch {
        if (!cancelled) errorConfirmation('Could not open that branch for editing');
      } finally {
        if (!cancelled) onEditBranchConsumed?.();
      }
    })();
    return () => { cancelled = true; };
    // handleEdit is intentionally stable enough for a one-shot open; listReady gates the race.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBranchId, listReady]);

  const handleSubmit = async (values: any, _actions: FormikValues) => {
    try {
      setLoading(true)

      if (editMode) {
        if (values?.workingAndOffDays) {
          delete values.workingAndOffDays
        }
        await updateBranchById(branchId, {
          ...values,
          townId: values.townId || null,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          showDateIn12HourFormat: toBranchTimeFormat(values.showDateIn12HourFormat),
        })
        setLoading(false)
        successConfirmation('Branch updated.')
        setShow(false)
        setEditMode(false)
        return
      }
      const payload = [
        {
          ...values,
          townId: values.townId || null,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          showDateIn12HourFormat: toBranchTimeFormat(values.showDateIn12HourFormat),
          isActive: true,
        },
      ]
      await createNewBranch(payload)
      setLoading(false)
      successConfirmation('Branch created.')
      setShow(false)
    } catch (err: any) {
      setLoading(false)
      // A failed save used to stop the spinner and say nothing, so a rejected branch looked like a
      // button that did not work. Say what the server said.
      errorConfirmation(err?.response?.data?.message || err?.message || 'Could not save the branch. Try again.')
    }
  }

  /** Fill the coordinates from the typed address (Nominatim through @services/geocoding — no key). */
  const fillCoordinatesFromAddress = async (formikProps: FormikProps<typeof initialState>) => {
    const address = String(formikProps.values.address ?? '').trim()
    if (!address) {
      setGeoStatus({ busy: false, message: 'Type the branch address first.' })
      return
    }
    setGeoStatus({ busy: true, message: 'Looking up the address…' })
    const pick = await geocodeAddress(address)
    if (pick) {
      formikProps.setFieldValue('latitude', pick.lat, true)
      formikProps.setFieldValue('longitude', pick.lng, true)
      setGeoStatus({ busy: false, message: 'Coordinates filled from the address.' })
    } else {
      setGeoStatus({ busy: false, message: "Couldn't find that address. Check it, or enter the coordinates." })
    }
  }

  /**
   * Browser-native timezone detection — Intl.DateTimeFormat().resolvedOptions().timeZone
   * returns the device's OS-configured IANA zone directly, with zero network call, zero
   * API key, and no external dependency (supported in every modern browser). This is
   * what "detect timezone" should mean for an admin physically at/near the branch they're
   * creating: their own device already knows its zone. Does NOT touch the Timezone field
   * if detection fails — leaves the admin's existing selection alone.
   */
  const detectBrowserTimezone = (formikProps: FormikProps<typeof initialState>) => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!zone) return
      formikProps.setFieldValue('timezone', zone)
      setTimezoneManuallyEdited(true) // a real detected value — don't let a later country change silently override it
    } catch (error) {
      console.error('Browser timezone detection failed:', error)
    }
  }

  const detectCurrentLocation = (formikProps: FormikProps<typeof initialState>) => {
    detectBrowserTimezone(formikProps)
    if (!navigator.geolocation) {
      setGeoStatus({ busy: false, message: "This browser can't share its location." })
      return
    }
    setGeoStatus({ busy: true, message: 'Finding your location…' })
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        formikProps.setFieldValue('latitude', Number(latitude), true)
        formikProps.setFieldValue('longitude', Number(longitude), true)
        setGeoStatus({ busy: false, message: 'Coordinates set to your current location.' })
      },
      () => setGeoStatus({ busy: false, message: "Couldn't read your location. Allow location access, or enter the coordinates." }),
      { enableHighAccuracy: true },
    )
  }

  useEffect(() => {
    async function fetchData() {
      setListReady(false)
      const branchesResponse = await fetchAllBranches()
      const all = branchesResponse.data.branches
      // When scoped to an organization, only show that org's branches.
      setBranches(companyId ? all.filter((b: any) => b.companyId === companyId) : all)
      setListReady(true)
    }

    fetchData()
  }, [loading, companyId])

  /**
   * Looks up a country (by ISO2) in the raw redux `countries` list and returns its
   * timezone options (sorted by UTC offset) + default zone. Returns null options when
   * the country has no mapped zones or isn't found — callers fall back to the global
   * TIMEZONE_OPTIONS in that case, never leaving the field with an empty list.
   */
  const resolveCountryTimezones = (iso2: string | null | undefined): { options: { value: string; label: string }[] | null; defaultZone: string | null } => {
    if (!iso2 || !countries) return { options: null, defaultZone: null }
    const country = (countries as any[]).find((c: any) => c.iso2 === iso2)
    const zones = country?.timezones
    const options = geoTimezoneOptions(zones)
    if (!options.length) return { options: null, defaultZone: null }
    const defaultZone: string | null =
      (typeof country?.defaultTimezone === 'string' && country.defaultTimezone) || options[0].value
    return { options, defaultZone }
  }

  const fetchCountries = async () => {
    // Already loaded — the effect above (keyed on `countries`) owns deriving
    // countriesOption from it; nothing to do here.
    if (countries != null) return

    // Dispatch the RAW records (id, iso2, name, defaultTimezone, timezones, ...) —
    // NOT a pre-slimmed {value,label} pair — so the Timezone auto-fill/scoping logic
    // can still read a selected country's defaultTimezone/timezones straight out of
    // redux, without a second API round-trip.
    const countriesResponse = await fetchAllCountries()
    dispatch(saveCountries(countriesResponse))
  }

  const fetchStates = async () => {
    if (selectedCountry == null) return

    countryCode = selectedCountry!.value
    let statesResponse
    try {
      statesResponse = await fetchAllStates(countryCode)
    } catch (error) {
      console.error('error from branches: ', error)
    }

    // In case the country has no states, offer the country itself.
    if (statesResponse && statesResponse.length > 0) {
      const statesOptions = statesResponse
        .map((state: any) => ({
          // Be resilient to differing field names from the geo source.
          value: state.iso2 ?? state.state_code ?? state.id ?? state.name,
          label: state.name,
        }))
        .filter((o: any) => o.value)
      setStatesOptions(statesOptions)
    } else {
      setStatesOptions([selectedCountry] as { value: string; label: string }[])
    }
  }

  const fetchCurrencies = async () => {
    try {
      const currenciesResponse = await fetchAllCurrencies()
      const currencies = currenciesResponse.data.currencies
      setCurrenciesOptions(currencies.map((currency: any) => ({
        value: currency.code,
        label: `${currency.name} (${currency.code})`,
      })))
    } catch (error) {
      console.error('Error fetching currencies:', error)
    }
  }

  useEffect(() => {
    fetchCountries()
  }, [countries])
  useEffect(() => {
    fetchStates()
  }, [selectedCountry])
  useEffect(() => {
    fetchCurrencies()
  }, [])

  // Organizations (and sub-orgs) the branch can belong to.
  useEffect(() => {
    async function loadOrgs() {
      try {
        const { data: { companyOverview } } = await fetchCompanyOverview()
        const rows = companyOverview || []
        setOrgOptions(rows.map((o: any) => ({ value: o.id, label: o.name })))
        const addresses: Record<string, string> = {}
        for (const o of rows) {
          if (o?.id && typeof o.address === 'string' && o.address.trim()) {
            addresses[o.id] = o.address.trim()
          }
        }
        setOrgAddressById(addresses)
      } catch (error) {
        console.error('Failed to load organizations for branch form', error)
      }
    }
    loadOrgs()
  }, [])

  useEffect(() => {
    if (companyId) {
      initialState.companyId = companyId
    } else {
      const setCompanyFromOverview = async () => {
        const { data: { companyOverview } } = await fetchCompanyOverview()
        initialState.companyId = resolveActiveOrgId(companyOverview) ?? ''
      }
      setCompanyFromOverview()
    }
  }, [companyId])

  const newBranchButton = canWrite && (
    <Button size="sm" onClick={() => handleNew()}>
      <Plus data-icon="inline-start" aria-hidden />
      New branch
    </Button>
  )
  const count = Array.isArray(branches) ? branches.length : 0

  return (
    <>
      {!embedded && <PageTitle breadcrumbs={branchesBreadCrumb}>Branches</PageTitle>}

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 pt-4 pb-6 lg:px-6">
        {embedded && hideHeading ? (
          // The dialog's own header already says Branches: this row carries only the count and the action.
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="neutral">{count} {count === 1 ? 'Branch' : 'Branches'}</Badge>
            {newBranchButton}
          </div>
        ) : (
          <PageHeader title="Branches" description="Locations, addresses and the coordinates on-site check-ins are checked against." actions={newBranchButton} />
        )}

        {canSection('settings.profile', 'read') ? (
          count > 0 ? (
            <AutoGrid min={320}>
              {branches.map((branch: any) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  isAdmin={canWrite}
                  canManage={canWrite}
                  onViewEmployees={() => setEmpModal({ show: true, branch })}
                  onManageDevices={() => setDevicesModal({ show: true, branch })}
                  onPromote={() => handlePromoteBranch(branch)}
                  onEdit={() => handleEdit(branch.id)}
                  onDelete={canDelete('settings.profile') ? () => handleDeleteBranch(branch) : undefined}
                />
              ))}
            </AutoGrid>
          ) : listReady ? (
            <EmptyState
              icon={<Building2 aria-hidden />}
              title="No branches yet"
              description="Branches you create will appear here. Use New branch to add your first location."
              action={newBranchButton || undefined}
            />
          ) : (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner className="size-5" aria-label="Loading branches" /> Loading branches…
            </p>
          )
        ) : null}
      </div>

      <Formik
        initialValues={initialState}
        onSubmit={handleSubmit}
        validationSchema={branchSchema}
        enableReinitialize
      >
        {(formikProps) => {
          const v = formikProps.values
          const err = (name: keyof typeof initialState) =>
            (formikProps.touched[name] || formikProps.submitCount > 0) ? (formikProps.errors[name] as string | undefined) : undefined
          const fromCountry = geoCountries?.find((c) => c.iso2 === v.countryId)?.currency
          const currencyDeviates = Boolean(v.currency && fromCountry && fromCountry !== v.currency)
          return (
            <FormDialog
              open={show}
              onOpenChange={(open) => { if (!open) handleClose() }}
              title={editMode ? 'Edit branch' : 'New branch'}
              description="Location, address and attendance coordinates"
              icon={<Building2 aria-hidden />}
              tone="cyan"
              size="2xl"
              formId={FORM_ID}
              submitLabel={editMode ? 'Save changes' : 'Create branch'}
              submitting={loading}
              dirty={formikProps.dirty}
              sections={[
                { id: 'branch-details', label: 'Branch details', icon: <Building2 aria-hidden />, invalid: Boolean(err('name')) },
                {
                  id: 'branch-location',
                  label: 'Location & map',
                  icon: <MapPin aria-hidden />,
                  invalid: Boolean(
                    err('countryId') ||
                      err('stateId') ||
                      err('cityId') ||
                      err('postalCode') ||
                      err('latitude') ||
                      err('longitude') ||
                      err('address'),
                  ),
                },
                { id: 'branch-preferences', label: 'Preferences', icon: <Settings2 aria-hidden /> },
              ]}
            >
              <Form id={FORM_ID} noValidate className="space-y-8">
                <section id="branch-details" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Branch details</FieldLegend>
                    <AutoGrid min={220} stretch>
                      <BranchTextField
                        form={formikProps}
                        name="name"
                        label="Branch name"
                        required
                        maxLength={L.branchName}
                      />
                      <SearchSelect
                        id="branch-companyId"
                        label="Organization"
                        required
                        value={v.companyId || null}
                        onValueChange={(value) => {
                          const nextId = value ?? ''
                          formikProps.setFieldValue('companyId', nextId)
                          // New branch only: keep address as a real org copy when empty or still the previous org’s.
                          if (editMode) return
                          const prevOrg = (orgAddressById[v.companyId] || '').trim()
                          const nextOrg = (orgAddressById[nextId] || '').trim().slice(0, BRANCH_ADDRESS_MAX)
                          const current = String(formikProps.values.address ?? '').trim()
                          if (!nextOrg) return
                          if (!current || current === prevOrg) {
                            formikProps.setFieldValue('address', nextOrg, true)
                          }
                        }}
                        options={orgOptions}
                      />
                    </AutoGrid>
                  </FieldSet>
                </section>

                <section id="branch-location" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Location &amp; map</FieldLegend>
                    <FieldDescription>Address and coordinates validate on-site attendance check-ins.</FieldDescription>
                    <LocationFields
                      cityMode="text"
                      showTimezone
                      showCurrency
                      currencyMode="select"
                      currencyOptions={currenciesOption}
                      addressMaxLength={BRANCH_ADDRESS_MAX}
                      postalCodeMaxLength={L.postalCode}
                      timezoneOptions={(() => {
                        const list = countryTimezoneOptions ?? TIMEZONE_OPTIONS
                        const tz =
                          typeof v.timezone === 'string'
                            ? v.timezone
                            : v.timezone && typeof v.timezone === 'object' && 'name' in (v.timezone as object)
                              ? String((v.timezone as { name: string }).name)
                              : ''
                        return tz && !list.some((z) => z.value === tz)
                          ? [{ value: tz, label: tz }, ...list]
                          : list
                      })()}
                      value={{
                        countryId: v.countryId,
                        stateId: v.stateId,
                        cityId: v.cityId,
                        postalCode: v.postalCode,
                        address: v.address,
                        latitude: v.latitude,
                        longitude: v.longitude,
                        timezone:
                          typeof v.timezone === 'string'
                            ? v.timezone
                            : v.timezone && typeof v.timezone === 'object' && 'name' in (v.timezone as object)
                              ? String((v.timezone as { name: string }).name)
                              : '',
                        currency: v.currency,
                      }}
                      errors={{
                        countryId: err('countryId'),
                        stateId: err('stateId'),
                        cityId: err('cityId'),
                        postalCode: err('postalCode'),
                        address: err('address'),
                        latitude: err('latitude'),
                        longitude: err('longitude'),
                        timezone: err('timezone'),
                      }}
                      countryOptions={countriesOption}
                      stateOptions={
                        selectedState && !statesOption.some((s) => s.value === selectedState.value)
                          ? [selectedState, ...statesOption]
                          : statesOption
                      }
                      reuseAddress={(orgAddressById[v.companyId] || '').trim().slice(0, BRANCH_ADDRESS_MAX)}
                      onReuseAddress={() => {
                        const orgAddr = (orgAddressById[v.companyId] || '').trim().slice(0, BRANCH_ADDRESS_MAX)
                        if (!orgAddr) return
                        formikProps.setFieldValue('address', orgAddr, true)
                        formikProps.setFieldTouched('address', true, false)
                      }}
                      suggestAddress={async (query) => {
                        const rows = await searchPlaces(query, 5)
                        return rows.map((raw, i) => {
                          const pick = toGeoPick(raw)
                          return {
                            id: String(raw?.place_id ?? `${pick.lat},${pick.lng},${i}`),
                            label: pick.formatted || pick.street || query,
                            address: (pick.street || pick.formatted || query).slice(0, BRANCH_ADDRESS_MAX),
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
                      geoBusy={geoStatus.busy}
                      geoMessage={geoStatus.message}
                      onGeocodeFromAddress={() => void fillCoordinatesFromAddress(formikProps)}
                      onUseCurrentLocation={() => detectCurrentLocation(formikProps)}
                      onChange={(patch) => {
                        if (patch.countryId !== undefined) {
                          const value = patch.countryId
                          const countryChanged = value !== formikProps.values.countryId
                          formikProps.setFieldValue('countryId', value)
                          const option = countriesOption.find((c) => c.value === value) ?? null
                          setSelectedCountry(option)
                          if (countryChanged) {
                            setSelectedState(null)
                            formikProps.setFieldValue('stateId', '')
                            if (patch.cityId === undefined) formikProps.setFieldValue('cityId', '')
                            setStatesOptions([])
                          }
                          const { options: tzOptions, defaultZone } = resolveCountryTimezones(value)
                          setCountryTimezoneOptions(tzOptions)
                          if (!timezoneManuallyEdited && defaultZone && patch.timezone === undefined) {
                            formikProps.setFieldValue('timezone', defaultZone)
                          }
                          const picked = geoCountries?.find((c) => c.iso2 === value)
                          if (picked?.currency) formikProps.setFieldValue('currency', picked.currency)
                        }
                        if (patch.stateId !== undefined) {
                          const stateChanged = patch.stateId !== formikProps.values.stateId
                          formikProps.setFieldValue('stateId', patch.stateId)
                          const option =
                            statesOption.find((s) => s.value === patch.stateId) ||
                            (selectedState?.value === patch.stateId ? selectedState : null)
                          setSelectedState(option)
                          if (stateChanged && patch.cityId === undefined) formikProps.setFieldValue('cityId', '')
                        }
                        if (patch.cityId !== undefined) formikProps.setFieldValue('cityId', patch.cityId)
                        if (patch.postalCode !== undefined) formikProps.setFieldValue('postalCode', patch.postalCode)
                        if (patch.address !== undefined) formikProps.setFieldValue('address', patch.address)
                        if (patch.latitude !== undefined) formikProps.setFieldValue('latitude', patch.latitude)
                        if (patch.longitude !== undefined) formikProps.setFieldValue('longitude', patch.longitude)
                        if (patch.timezone !== undefined) {
                          setTimezoneManuallyEdited(true)
                          formikProps.setFieldValue('timezone', patch.timezone)
                        }
                        if (patch.currency !== undefined) formikProps.setFieldValue('currency', patch.currency)
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-2 px-3"
                      onClick={() => detectBrowserTimezone(formikProps)}
                    >
                      <Clock data-icon="inline-start" aria-hidden /> Detect my timezone
                    </Button>
                    {currencyDeviates && (
                      <Alert variant="warning" className="mt-4">
                        <TriangleAlert aria-hidden />
                        <AlertDescription>
                          This branch bills in <strong>{getCurrencySymbol(v.currency)} {v.currency}</strong>, not its
                          country&rsquo;s {fromCountry}. Salaries, offers and payslips here will all use it.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!isDeviceNotDesktop && (
                      <Alert variant="info" className="mt-4">
                        <Info aria-hidden />
                        <AlertDescription>
                          On a desktop, the current location comes from the network and can be approximate — a phone
                          or tablet uses GPS. Prefer the address lookup here.
                        </AlertDescription>
                      </Alert>
                    )}
                  </FieldSet>
                </section>

                <section id="branch-preferences" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Preferences</FieldLegend>
                    {/* Three choices, not two. The format is a cascade (personal -> branch -> org
                        -> 12h) and each layer only applies when the one above it has no opinion. A
                        Yes/No control cannot say "no opinion". See utils/timeFormat.ts.
                        Timezone lives in LocationFields (same recipe as Create Tenant). */}
                    <Field>
                      <FieldLabel id="branch-time-format-label">Time format</FieldLabel>
                      <Select
                        items={TIME_FORMAT_OPTIONS}
                        value={v.showDateIn12HourFormat}
                        onValueChange={(next) => { if (next) formikProps.setFieldValue('showDateIn12HourFormat', next) }}
                      >
                        <SelectTrigger className="w-full" aria-labelledby="branch-time-format-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_FORMAT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldSet>
                </section>
              </Form>
            </FormDialog>
          )
        }}
      </Formik>

      <BranchEmployeesModal
        show={empModal.show}
        branchId={empModal.branch?.id}
        branchName={empModal.branch?.name}
        onClose={() => setEmpModal({ show: false, branch: null })}
      />

      <BiometricDevicesModal
        show={devicesModal.show}
        branchId={devicesModal.branch?.id ?? ''}
        branchName={devicesModal.branch?.name ?? ''}
        onClose={() => setDevicesModal({ show: false, branch: null })}
      />
    </>
  )
}

export default Branches
