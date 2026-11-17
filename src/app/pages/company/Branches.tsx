import { resolveActiveOrgId } from '@utils/activeOrg';
import React, { useEffect, useRef, useState } from 'react'
import { Form, Formik, FormikProps, FormikValues } from 'formik'
import * as Yup from 'yup'
import { Building2, Clock, LocateFixed, MapPin, Plus, Settings2, TriangleAlert, Info } from 'lucide-react'
import { PageLink, PageTitle } from '@metronic/layout/core'
import { Alert, AlertDescription } from '@/ds/ui/alert'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Spinner } from '@/ds/ui/spinner'
import { Textarea } from '@/ds/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/ds/ui/toggle-group'
import { AutoGrid } from '@/ds/patterns/auto-grid'
import { EmptyState } from '@/ds/patterns/empty-state'
import { FormDialog } from '@/ds/patterns/form-dialog'
import { PageHeader } from '@/ds/patterns/page-header'
import { SearchSelect } from '@/ds/patterns/search-select'
import {
  createNewTowns,
  fetchAllCountries,
  fetchAllCurrencies,
  fetchAllStates,
  fetchAllTowns,
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
import { geocodeAddress } from '@services/geocoding'
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

const branchSchema = Yup.object({
  name: Yup.string().required().label('Branch Name'),
  address: Yup.string().required().label('Branch Address'),
  cityId: Yup.string().required().label('City'),
  countryId: Yup.string().required().label('Town'),
  stateId: Yup.string().required().label('State'),
  townId: Yup.string().required().label('Town'),
  postalCode: Yup.string().required().label('Postal Code'),
  latitude: Yup.string().required().label('Latitude'),
  longitude: Yup.string().required().label('Longitude'),
  currency: Yup.string().optional().label('Currency'),
  companyId: Yup.string(),
  isActive: Yup.boolean(),
  showDateIn12HourFormat: Yup.string().optional(),
  timezone: Yup.string().optional().label('Timezone'),
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
  isActive: false,
  showDateIn12HourFormat: 'inherit',
  timezone: '',
}

const FORM_ID = 'branch-form'

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
  form, name, label, required, multiline, inputMode,
}: {
  form: FormikProps<typeof initialState>
  name: keyof typeof initialState
  label: string
  required?: boolean
  multiline?: boolean
  inputMode?: 'decimal' | 'numeric' | 'text'
}) {
  const id = `branch-${name}`
  const error = (form.touched[name] || form.submitCount > 0) ? (form.errors[name] as string | undefined) : undefined
  const common = {
    id,
    name,
    required,
    value: String(form.values[name] ?? ''),
    onChange: form.handleChange,
    onBlur: form.handleBlur,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  }
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      {multiline ? <Textarea {...common} rows={2} /> : <Input {...common} inputMode={inputMode} />}
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

  const [townsOption, setTownsOptions] = useState<{ value: string; label: string }[]>([])

  const [currenciesOption, setCurrenciesOptions] = useState<{ value: string; label: string }[]>([])
  const [isDeviceNotDesktop, setIsDeviceNotDesktop] = useState(false)

  const [branches, setBranches] = useState([])
  const [listReady, setListReady] = useState(false)
  const [orgOptions, setOrgOptions] = useState<{ value: string; label: string }[]>([])
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

    initialState = {
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
      companyId: initialState.companyId,
      isActive: false,
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

    fetchTowns()
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
    const zones = country?.timezones as { name: string; utcOffsetStr: string }[] | undefined
    if (!zones || zones.length === 0) return { options: null, defaultZone: null }

    const options = [...zones]
      .sort((a, b) => a.utcOffsetStr.localeCompare(b.utcOffsetStr))
      .map((z) => ({ value: z.name, label: `(UTC${z.utcOffsetStr}) ${z.name}` }))
    const defaultZone: string | null = country?.defaultTimezone || zones[0].name
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

  const fetchTowns = async () => {
    const townsResponse = await fetchAllTowns()
    const townsOptions = townsResponse.data.towns.map((town: any) => ({
      value: town.id,
      label: town.name,
    }))
    setTownsOptions(townsOptions)
    return townsOptions as { value: string; label: string }[]
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

  /** Inline create from the Town field: save the town, reload the list, select it. */
  const createTown = async (name: string, formikProps: FormikProps<typeof initialState>) => {
    try {
      await createNewTowns({ companyId: '', towns: [name] })
      const fresh = await fetchTowns()
      const created = fresh.find((t) => t.label.toLowerCase() === name.toLowerCase())
      if (created) formikProps.setFieldValue('townId', created.value, true)
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || `Couldn't add ${name}. Try again.`)
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
        setOrgOptions((companyOverview || []).map((o: any) => ({ value: o.id, label: o.name })))
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
              size="lg"
              formId={FORM_ID}
              submitLabel={editMode ? 'Save changes' : 'Create branch'}
              submitting={loading}
              submitDisabled={!formikProps.isValid}
              dirty={formikProps.dirty}
              sections={[
                { id: 'branch-details', label: 'Branch details', icon: <Building2 aria-hidden />, invalid: Boolean(err('name')) },
                { id: 'branch-location', label: 'Location', icon: <MapPin aria-hidden />, invalid: Boolean(err('countryId') || err('stateId') || err('cityId') || err('townId') || err('postalCode')) },
                { id: 'branch-coordinates', label: 'Map coordinates', icon: <LocateFixed aria-hidden />, invalid: Boolean(err('latitude') || err('longitude') || err('address')) },
                { id: 'branch-preferences', label: 'Preferences', icon: <Settings2 aria-hidden /> },
              ]}
            >
              <Form id={FORM_ID} noValidate className="space-y-8">
                <section id="branch-details" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Branch details</FieldLegend>
                    <FieldGroup>
                      <BranchTextField form={formikProps} name="name" label="Branch name" required />
                      <SearchSelect
                        id="branch-companyId"
                        label="Organization"
                        required
                        value={v.companyId || null}
                        onValueChange={(value) => formikProps.setFieldValue('companyId', value ?? '')}
                        options={orgOptions}
                      />
                    </FieldGroup>
                  </FieldSet>
                </section>

                <section id="branch-location" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Location</FieldLegend>
                    <FieldGroup className="grid gap-4 sm:grid-cols-2">
                      {/* Country and Currency share a row: currency is DERIVED from country. */}
                      <SearchSelect
                        id="branch-countryId"
                        label="Country"
                        required
                        value={v.countryId || null}
                        error={err('countryId')}
                        onBlur={() => formikProps.setFieldTouched('countryId', true)}
                        onValueChange={(value, option) => {
                          formikProps.setFieldValue('countryId', value ?? '')
                          setSelectedCountry(option ? { value: option.value, label: option.label } : null)

                          setSelectedState(null)
                          formikProps.setFieldValue('stateId', '')
                          formikProps.setFieldValue('cityId', '')
                          formikProps.setFieldValue('townId', '')
                          setStatesOptions([])

                          // Scope the Timezone field to ONLY this country's real zones, and
                          // prefill its default — never overwriting a timezone the admin already
                          // picked explicitly in this session (see TIMEZONE_OPTIONS).
                          const { options: tzOptions, defaultZone } = resolveCountryTimezones(value)
                          setCountryTimezoneOptions(tzOptions)
                          if (!timezoneManuallyEdited && defaultZone) {
                            formikProps.setFieldValue('timezone', defaultZone)
                          }

                          // Currency follows the country, on the same terms as the timezone:
                          // derived, and stored so the branch says what it bills in.
                          const picked = geoCountries?.find((c) => c.iso2 === value)
                          if (picked?.currency) {
                            formikProps.setFieldValue('currency', picked.currency)
                          }
                        }}
                        options={countriesOption}
                      />

                      {/* Editable, because a branch that bills in something other than its local
                          currency is a real arrangement (a Gulf office invoicing in dollars). The
                          full list, not a country-or-dollar pair. */}
                      <SearchSelect
                        id="branch-currency"
                        label="Currency"
                        value={v.currency || null}
                        onValueChange={(value) => formikProps.setFieldValue('currency', value ?? '')}
                        options={currenciesOption}
                        hint={v.currency && !currencyDeviates
                          ? `Salaries, offers and payslips at this branch are shown in ${getCurrencySymbol(v.currency)} ${v.currency}, from the selected country.`
                          : undefined}
                      />

                      {/* Deviating from the country is allowed but never silent. Salary, offers and
                          exported payslips all read this. */}
                      {currencyDeviates && (
                        <Alert variant="warning" className="sm:col-span-2">
                          <TriangleAlert aria-hidden />
                          <AlertDescription>
                            This branch bills in <strong>{getCurrencySymbol(v.currency)} {v.currency}</strong>, not its
                            country&rsquo;s {fromCountry}. Salaries, offers and payslips here will all use it.
                          </AlertDescription>
                        </Alert>
                      )}

                      <SearchSelect
                        id="branch-stateId"
                        label="State"
                        required
                        disabled={selectedCountry == null}
                        value={v.stateId || null}
                        error={err('stateId')}
                        onBlur={() => formikProps.setFieldTouched('stateId', true)}
                        onValueChange={(value, option) => {
                          formikProps.setFieldValue('stateId', value ?? '')
                          setSelectedState(option ? { value: option.value, label: option.label } : null)
                          formikProps.setFieldValue('cityId', '')
                          formikProps.setFieldValue('townId', '')
                        }}
                        options={selectedState && !statesOption.some((s) => s.value === selectedState.value)
                          ? [selectedState, ...statesOption]
                          : statesOption}
                      />

                      {/* City is free text: the city dataset isn't available offline (the CSC API
                          needs a key) and cities are stored by name. */}
                      <BranchTextField form={formikProps} name="cityId" label="City" required />

                      <SearchSelect
                        id="branch-townId"
                        label="Town"
                        required
                        value={v.townId || null}
                        error={err('townId')}
                        onBlur={() => formikProps.setFieldTouched('townId', true)}
                        onValueChange={(value) => formikProps.setFieldValue('townId', value ?? '')}
                        options={townsOption}
                        onCreate={(name) => createTown(name, formikProps)}
                        createLabel={(q) => `Add town “${q}”`}
                      />

                      <BranchTextField form={formikProps} name="postalCode" label="Postal code" required inputMode="numeric" />
                    </FieldGroup>
                  </FieldSet>
                </section>

                <section id="branch-coordinates" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Map coordinates</FieldLegend>
                    <FieldDescription>Used to validate on-site attendance check-ins.</FieldDescription>
                    <FieldGroup>
                      <BranchTextField form={formikProps} name="address" label="Branch address" required multiline />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <BranchTextField form={formikProps} name="latitude" label="Latitude" required inputMode="decimal" />
                        <BranchTextField form={formikProps} name="longitude" label="Longitude" required inputMode="decimal" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={geoStatus.busy} onClick={() => fillCoordinatesFromAddress(formikProps)}>
                          <MapPin data-icon="inline-start" aria-hidden /> Get coordinates from address
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={geoStatus.busy} onClick={() => detectCurrentLocation(formikProps)}>
                          <LocateFixed data-icon="inline-start" aria-hidden /> Use my current location
                        </Button>
                        {geoStatus.busy && <Spinner className="size-4" aria-hidden />}
                      </div>
                      <p aria-live="polite" className="text-xs text-muted-foreground">{geoStatus.message}</p>
                      {!isDeviceNotDesktop && (
                        <Alert variant="info">
                          <Info aria-hidden />
                          <AlertDescription>
                            On a desktop, the current location comes from the network and can be approximate — a phone
                            or tablet uses GPS. Prefer the address lookup here.
                          </AlertDescription>
                        </Alert>
                      )}
                    </FieldGroup>
                  </FieldSet>
                </section>

                <section id="branch-preferences" className="scroll-mt-4">
                  <FieldSet>
                    <FieldLegend>Preferences</FieldLegend>
                    <FieldGroup>
                      <div className="space-y-2">
                        <SearchSelect
                          id="branch-timezone"
                          label="Timezone"
                          value={v.timezone || null}
                          onValueChange={(value) => {
                            setTimezoneManuallyEdited(true)
                            formikProps.setFieldValue('timezone', value ?? '')
                          }}
                          options={(() => {
                            const list = countryTimezoneOptions ?? TIMEZONE_OPTIONS
                            // A detected or saved zone outside the list still shows as chosen.
                            return v.timezone && !list.some((z) => z.value === v.timezone)
                              ? [{ value: v.timezone, label: v.timezone }, ...list]
                              : list
                          })()}
                        />
                        <Button type="button" size="sm" variant="ghost" onClick={() => detectBrowserTimezone(formikProps)}>
                          <Clock data-icon="inline-start" aria-hidden /> Detect my timezone
                        </Button>
                      </div>

                      {/* Three choices, not two. The format is a cascade (personal -> branch -> org
                          -> 12h) and each layer only applies when the one above it has no opinion. A
                          Yes/No control cannot say "no opinion". See utils/timeFormat.ts. */}
                      <Field>
                        <FieldTitle id="branch-time-format-label">Time format</FieldTitle>
                        <ToggleGroup
                          aria-labelledby="branch-time-format-label"
                          variant="outline"
                          spacing={0}
                          value={[v.showDateIn12HourFormat]}
                          onValueChange={(next: string[]) => {
                            // A single choice: pressing the current option again must not clear it.
                            if (next.length) formikProps.setFieldValue('showDateIn12HourFormat', next[next.length - 1])
                          }}
                          className="flex-wrap"
                        >
                          <ToggleGroupItem value="inherit">Organization default</ToggleGroupItem>
                          <ToggleGroupItem value="1">12-hour</ToggleGroupItem>
                          <ToggleGroupItem value="0">24-hour</ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                    </FieldGroup>
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
