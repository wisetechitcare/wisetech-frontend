import { resolveActiveOrgId } from '@utils/activeOrg';
import React, { useEffect, useState } from 'react'
import { Form, Formik, FormikValues, useField, useFormik } from 'formik'
import * as Yup from 'yup'
import { Col, Row } from 'react-bootstrap'
import { KTIcon } from '@metronic/helpers'
import { PageLink, PageTitle } from '@metronic/layout/core'
import {
  createNewTowns,
  fetchAllCities,
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
import { successConfirmation, errorConfirmation, genericConfirmation } from '@utils/modal'
import BranchEmployeesModal from '@app/modules/common/components/BranchEmployeesModal'
import BiometricDevicesModal from '@app/modules/common/components/BiometricDevicesModal'
import BranchCard from '@app/modules/common/components/BranchCard'
import {
  Dialog, Box, Stack, Typography, Button as MuiButton, Paper, CircularProgress, IconButton,
} from '@mui/material'
import Swal from 'sweetalert2'
import TextInput from '@app/modules/common/inputs/TextInput'
import { PageHeadingTitle } from '@metronic/layout/components/header/page-title/PageHeadingTitle'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import { saveCountries } from '@redux/slices/locations'
import LocationDropdown from '@app/modules/common/inputs/LocationDropdown'
import DropDownInput from '@app/modules/common/inputs/DropdownInput'
import RadioInput from '@app/modules/common/inputs/RadioInput'
import { Option } from '@models/dropdown'
import { UAParser } from 'ua-parser-js'
import { hasPermission } from '@utils/authAbac'
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from '@constants/statistics'
import { sidePanelIcons } from '@metronic/assets/sidepanelicons'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_APP_GOOGLE_MAP_KEY

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
  // dateFormat: Yup.string().optional().label('Date Format'),
  companyId: Yup.string(),
  isActive: Yup.boolean(),
  showDateIn12HourFormat: Yup.string().optional(),
  timezone: Yup.string().optional().label('Timezone'),
})

// Curated set of major IANA timezones — one representative per business hub /
// UTC offset, not the full ~400-zone IANA database (unnecessary for a branch
// picker). Auto-filled from the selected Country's `defaultTimezone` (attached
// server-side in location.ts's getCountries, sourced from countryTimezones.ts) the
// moment Country changes — see the Country dropdown's handleChange below. Picking a
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
  // dateFormat: '',
  companyId: '',
  isActive: false,
  showDateIn12HourFormat: '0',
  timezone: '',
}

/** Titled card section for the branch form (MUI). Reused for each field group. */
function FormSection({ title, description, icon, children }: { title: string; description?: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.75, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        {icon != null && (
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.main', border: 1, borderColor: 'divider' }}>{icon}</Box>
        )}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{title}</Typography>
          {description != null && <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{description}</Typography>}
        </Box>
      </Stack>
      {children}
    </Paper>
  );
}

interface BranchesProps {
  /** Scope the list + new-branch creation to this organization. */
  companyId?: string;
  /** Hide the standalone page title/breadcrumb when rendered inside another page. */
  embedded?: boolean;
  /** Hide the "Branches" heading (e.g. when the host modal already shows a title). */
  hideHeading?: boolean;
}

function Branches({ companyId, embedded = false, hideHeading = false }: BranchesProps = {}) {
  const dispatch = useDispatch()
  const { countries } = useSelector((state: RootState) => state.locations)

  const [show, setShow] = useState(false)

  const [countriesOption, setCountriesOptions] = useState<{ value: string; label: string }[]>([])
  const [selectedCountry, setSelectedCountry] = useState<Option | null>(null)
  let countryCode = ''
  // True once the admin has explicitly picked a Timezone in THIS modal session —
  // stops the country-change auto-fill from overwriting a deliberate choice. Reset
  // whenever the modal is (re)opened, in handleNew/handleEdit.
  const [timezoneManuallyEdited, setTimezoneManuallyEdited] = useState(false)
  // null = no country selected yet → Timezone dropdown falls back to the full
  // curated TIMEZONE_OPTIONS list. Once a country is picked, scoped to ONLY that
  // country's real IANA zones (from getCountries' server-side enrichment —
  // countryTimezones.ts, backed by the countries-and-timezones package).
  const [countryTimezoneOptions, setCountryTimezoneOptions] = useState<{ value: string; label: string }[] | null>(null)

  const [statesOption, setStatesOptions] = useState([])
  const [selectedState, setSelectedState] = useState<Option | null>(null)

  let stateCode = ''

  const [citiesOption, setCitiesOptions] = useState([])
  const [selectedCity, setSelectedCity] = useState<Option | null>(null)

  const [townsOption, setTownsOptions] = useState([])
  const [selectedTown, setSelectedTown] = useState<Option | null>(null)

  const [currenciesOption, setCurrenciesOptions] = useState([])
  // const [dateFormatOptions] = useState([
  //   { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  //   { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  //   { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
  //   { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2025)' },
  //   { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY (12-31-2025)' },
  // ])
  const [isDeviceNotDesktop, setIsDeviceNotDesktop] = useState(false)

  const [branches, setBranches] = useState([])
  const [orgOptions, setOrgOptions] = useState<{ value: string; label: string }[]>([])
  const [empModal, setEmpModal] = useState<{ show: boolean; branch: any | null }>({ show: false, branch: null })
  const [devicesModal, setDevicesModal] = useState<{ show: boolean; branch: any | null }>({ show: false, branch: null })
  const [loading, setLoading] = useState(false)

  const handlePromoteBranch = async (branch: any) => {
    const empCount = branch._count?.Employees ?? 0
    const result = await Swal.fire({
      title: 'Promote to Sub-Organization?',
      html: `This will create a sub-organization <b>"${branch.name}"</b> under the current organization and move this branch${empCount ? ` and its ${empCount} employee(s)` : ''} into it. Employees stay in this branch.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Promote',
      cancelButtonText: 'Cancel',
      customClass: { confirmButton: 'btn btn-primary fw-bold px-6', cancelButton: 'btn btn-light fw-bold px-6 ms-3' },
      buttonsStyling: false,
    })
    if (!result.isConfirmed) return
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
      await successConfirmation('Branch deleted successfully')
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to delete branch')
    }
  }
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [branchId, setBranchId] = useState('')
  const [rerender, setRerender] = useState(false);
  
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  )

  useEffect(() => {
    const parser = new UAParser()
    const result = parser.getResult()
    const type = result.device.type
    if (type === 'mobile' || type === 'tablet') {
      setIsDeviceNotDesktop(true)
    } else {
      setIsDeviceNotDesktop(false) 
    }
  }, [])

  // In your Branches component
const [countrySearch, setCountrySearch] = useState('');

const filteredCountries = countriesOption.filter((option: any) => {
  if (!option || !option.label) return false;
  if (!countrySearch) return true;
  return option.label.toLowerCase().startsWith(countrySearch.toLowerCase());
});

// In your LocationDropdown component (if you have access to it)
interface LocationDropdownProps {
  // ... other props
  options: Array<{ value: string; label: string }>;
  filterOption?: (input: string, option: { label: string; value: string }) => boolean;
}

const defaultFilterOption = (input: string, option?: { label: string; value: string }) => {
  if (!option || !option.label) return false;
  return option.label.toLowerCase().includes(input.toLowerCase());
};



 

  // Single source of truth for the Country dropdown's options: derived from the RAW
  // country records in redux (id, iso2, name, defaultTimezone, timezones — see
  // fetchCountries below, which now dispatches the raw response instead of a
  // pre-slimmed {value,label} pair so those extra fields survive). `value` MUST be
  // iso2, not the numeric id — fetchStates/fetchCities and the backend's
  // countryId-based timezone resolution all key off the ISO2 code (confirmed against
  // live Branches rows storing e.g. "IN", not a numeric id).
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
    setSelectedCity(null)
    setSelectedTown(null)
    setTimezoneManuallyEdited(false)
    setCountryTimezoneOptions(null)

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
      // dateFormat: '',
      companyId: '',
      isActive: false,
      showDateIn12HourFormat: '0',
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
      dateFormat,
      isActive,
      companyId,
      town,
      timezone,
    } = branch

    // Resolve display labels defensively — the geo lookups can fail/return null
    // (the local states dataset has no iso2). Never let that block opening the modal.
    let countryLabel = countryId
    let stateLabel = stateId
    try { const cn = await fetchCountryName(countryId); if (cn?.name) countryLabel = cn.name } catch { /* keep id */ }
    try { const sn = await fetchStateName(countryId, stateId); if (sn?.name) stateLabel = sn.name } catch { /* keep id */ }

    setSelectedCountry(countryId ? { value: countryId, label: countryLabel } : null)
    setSelectedState(stateId ? { value: stateId, label: stateLabel } : null)
    setSelectedCity(cityId ? { value: cityId, label: cityId } : null)
    setSelectedTown(town ? { value: town.id, label: town.name } : null)
    // Scope the Timezone dropdown to this branch's existing country's zones —
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
      // dateFormat: dateFormat || '',
      companyId,
      isActive,
      longitude,
      postalCode,
      showDateIn12HourFormat: branch.showDateIn12HourFormat ? '1' : '0',
      timezone: timezone || '',
    }

    setShow(true)
    setEditMode(true)

    setStatesOptions([])
    setCitiesOptions([])
  }

  const handleSubmit = async (values: any, actions: FormikValues) => {
    try {
      setLoading(true)

      if (editMode) {
        if (values?.workingAndOffDays) {
          delete values.workingAndOffDays
        }
        const response = await updateBranchById(branchId, {
          ...values,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          showDateIn12HourFormat: values.showDateIn12HourFormat === '1',
        })
        setLoading(false)
        successConfirmation('Branch updated successfully')
        setShow(false)
        setEditMode(false)
        return
      }
      const payload = [
        {
          ...values,
          latitude: Number(values.latitude),
          longitude: Number(values.longitude),
          showDateIn12HourFormat: values.showDateIn12HourFormat === '1',
          isActive: true,
        },
      ]
      const response = await createNewBranch(payload)
      setLoading(false)
      successConfirmation('Branch created successfully')
      setShow(false)
    } catch (err) {
      setLoading(false)
    }
  }
  const getLocationBasedOnCompanyAddress = async (values: any) => {
    const apiKey = GOOGLE_MAPS_API_KEY
    // console.log("formikProps: ",values);

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      values.address
    )}&key=${apiKey}`

    try {
      const response = await fetch(geocodeUrl)
      const data = await response.json()

      if (data.status === 'OK') {
        const { lat, lng } = data.results[0].geometry.location
        // console.log('Latitude and Longitude:', lat, lng);
        values.latitude = lat
        values.longitude = lng
        // Update Formik fields
        // formikProps.setFieldValue('latitude', lat, true);
        // formikProps.setFieldValue('longitude', lng, true);
      } else {
        console.error(
          'Error from Geocoding API:',
          data.status,
          data.error_message
        )
      }
    } catch (error) {
      console.error('Error fetching location:', error)
    }
  }

  // Geocode the typed branch address into lat/long (works on desktop, no GPS needed).
  const geocodeAddressToLatLng = async (formikProps: any) => {
    const address = formikProps.values?.address
    if (!address || !String(address).trim()) {
      return
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === 'OK' && data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location
        formikProps.setFieldValue('latitude', Number(lat), true)
        formikProps.setFieldValue('longitude', Number(lng), true)
      }
    } catch (error) {
      console.error('Geocoding failed:', error)
    }
  }

  /**
   * Browser-native timezone detection — Intl.DateTimeFormat().resolvedOptions().timeZone
   * returns the device's OS-configured IANA zone directly, with zero network call, zero
   * API key, and no external dependency (supported in every modern browser). This is
   * what "detect timezone" should mean for an admin physically at/near the branch they're
   * creating: their own device already knows its zone. Does NOT touch the Timezone field
   * if detection fails or the zone isn't a real IANA name — leaves the admin's existing
   * selection alone rather than clobbering it with a bad guess.
   */
  const detectBrowserTimezone = (formikProps: any) => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!zone) return
      formikProps.setFieldValue('timezone', zone)
      setTimezoneManuallyEdited(true) // a real detected value — don't let a later country change silently override it
    } catch (error) {
      console.error('Browser timezone detection failed:', error)
    }
  }

  const getLocation = (formikProps: any) => {
    detectBrowserTimezone(formikProps)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position: any) => {
          const {
            coords: { latitude, longitude },
          } = position
          console.log(
            'latitude and longitude from branches.tsx',
            latitude,
            longitude
          )
          formikProps.setFieldValue('latitude', Number(latitude), true)
          formikProps.setFieldValue('longitude', Number(longitude), true)
        },
        () => {
          console.log(
            'Error from branche location fetching: Unable to retrieve your location'
          )
        },
        {
          enableHighAccuracy: true,
        }
      )
    } else {
      console.log('Geo location API is not supported')
    }
  }

  useEffect(() => {
    async function fetchData() {
      const promise = [fetchAllBranches()]
      const [branchesResponse] = await Promise.all(promise)
      const all = branchesResponse.data.branches
      // When scoped to an organization, only show that org's branches.
      setBranches(companyId ? all.filter((b: any) => b.companyId === companyId) : all)
    }

    fetchTowns()
    fetchData()
  }, [loading, companyId])

  const handleChange = (
    selectedOption: any,
    formikField: string,
    setSelectedOptionState: React.Dispatch<React.SetStateAction<any>>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setFieldValue(formikField, selectedOption ? selectedOption.value : '')
    setSelectedOptionState(selectedOption)
  }

  /**
   * Looks up a country (by ISO2) in the raw redux `countries` list and returns its
   * timezone dropdown options (sorted by UTC offset) + default zone. Returns null
   * options when the country has no mapped zones or isn't found — callers fall back
   * to the global TIMEZONE_OPTIONS in that case, never leaving the field with an
   * empty dropdown.
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
    // Already loaded — the useEffect above (keyed on `countries`) owns deriving
    // countriesOption from it; nothing to do here.
    if (countries != null) return

    // Dispatch the RAW records (id, iso2, name, defaultTimezone, timezones, ...) —
    // NOT a pre-slimmed {value,label} pair — so the Timezone auto-fill/scoping logic
    // below can still read a selected country's defaultTimezone/timezones straight
    // out of redux, without a second API round-trip.
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

    // In case if country doesnt have states then assigning selected country
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
      setStatesOptions([selectedCountry] as unknown as [])
    }
  }

  const fetchCities = async () => {
    // Guard: never call the cities API with an undefined country/state (causes a 500).
    if (!selectedState?.value || !selectedCountry?.value) return

    countryCode = selectedCountry.value
    stateCode = selectedState.value

    const citiesResponse = await fetchAllCities(countryCode, stateCode)

    // In case if states doesnt have cities then assigning selected states
    if (citiesResponse.length > 0) {
      const citiesOptions = citiesResponse.map((city: any) => ({
        value: city.name,
        label: city.name,
      }))
      setCitiesOptions(citiesOptions)
    } else {
      const citiesOptionAsState = [selectedState].map((state: any) => ({
        value: state.label,
        label: state.label,
      }))
      setCitiesOptions(citiesOptionAsState as [])
    }
  }
  
  const fetchTowns = async () => {
    const townsResponse = await fetchAllTowns()
    const townsOptions = townsResponse.data.towns.map((town: any) => ({
      value: town.id,
      label: town.name,
    }))
    setTownsOptions(townsOptions)
  }

  const fetchCurrencies = async () => {
    try {
      const currenciesResponse = await fetchAllCurrencies()
      const currencies = currenciesResponse.data.currencies
      // Create options for dropdown
      // console.log("currencies",currencies);
      
      const currenciesOptions = currencies.map((currency: any) => ({
        value: currency.code,
        label: `${currency.name} (${currency.code})`,
      }))
      setCurrenciesOptions(currenciesOptions)
    } catch (error) {
      console.error('Error fetching currencies:', error)
    }
  }
  
  const handleTownsRefresh = () => {
    setLoading(prev => !prev) // Toggle loading to trigger re-fetch
  }

  const handleDetectLocation = (formikProps: any) => {
    getLocation(formikProps)
  }
 
  useEffect(() => {
    fetchCountries()
  }, [countries])
  useEffect(() => {
    fetchStates()
  }, [selectedCountry])
  // Cities are entered as free text (no offline city dataset / CSC key), so we
  // no longer fetch them from the geo API.
  useEffect(() => {
    fetchTowns()
  }, [selectedCity])
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
 
  const newBranchButton = isAdmin &&
    hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.create) && (
      <MuiButton
        variant="contained"
        color="primary"
        size="small"
        title="Add a branch"
        startIcon={<KTIcon iconName="plus" className="fs-5" />}
        onClick={() => handleNew()}
      >
        New Branch
      </MuiButton>
    )

  return (
    <>
      {embedded ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, px: { xs: 2, lg: 3 }, pt: 2.5, pb: 1 }}>
          {!hideHeading
            ? <Typography sx={{ fontFamily: 'Barlow', fontWeight: 600, fontSize: 'clamp(18px, 4vw, 24px)', letterSpacing: '0.24px', color: '#000' }}>Branches</Typography>
            : <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                {Array.isArray(branches) ? branches.length : 0} {Array.isArray(branches) && branches.length === 1 ? 'branch' : 'branches'}
              </Typography>}
          {newBranchButton}
        </Box>
      ) : (
        <div className="d-flex flex-wrap justify-content-between align-items-center px-lg-9 px-4 py-5">
          <PageTitle breadcrumbs={branchesBreadCrumb}>Branches</PageTitle>
          <div className="d-flex align-items-center justify-content-between w-100">
            <PageHeadingTitle />
            {newBranchButton}
          </div>
        </div>
      )}
        
<div className="px-lg-6 px-4 pb-6 pt-1">
  <Row>
    {hasPermission(
      resourceNameMapWithCamelCase.branch,
      permissionConstToUseWithHasPermission.readOthers
    ) ? (
      Array.isArray(branches) && branches.length > 0 ? (
        branches.map((branch: any, index: number) => (
          <Col key={`branch-${index}`} xs={12} sm={12} md={6} lg={4} className="pt-4">
            <BranchCard
              branch={branch}
              isAdmin={isAdmin}
              canManage={hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers)}
              onViewEmployees={() => setEmpModal({ show: true, branch })}
              onManageDevices={() => setDevicesModal({ show: true, branch })}
              onPromote={() => handlePromoteBranch(branch)}
              onEdit={() => handleEdit(branch.id)}
              onDelete={() => handleDeleteBranch(branch)}
            />
          </Col>
        ))
      ) : (
        <Col xs={12} className="pt-4">
          <Paper variant="outlined" sx={{ borderRadius: 2, minHeight: '46vh', display: 'grid', placeItems: 'center' }}>
            <Stack alignItems="center" sx={{ textAlign: 'center', p: 4 }}>
              <Box component="img" src={sidePanelIcons.company} alt="" sx={{ maxHeight: 64, mb: 2 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>No branches yet</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, maxWidth: 360 }}>
                Branches you create will appear here. Use “New Branch” to add your first location.
              </Typography>
            </Stack>
          </Paper>
        </Col>
      )
    ) : null}
  </Row>
</div>
        {/* MUI Dialog (z-index 1300) naturally stacks above the host Bootstrap Branches modal. */}
        {/* disableEnforceFocus/RestoreFocus: let the portaled react-select menus
            (Country/State/Town/Org) receive focus & clicks inside the dialog. */}
        <Dialog open={show} onClose={handleClose} maxWidth="md" fullWidth disableEnforceFocus disableRestoreFocus PaperProps={{ sx: { borderRadius: '16px' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 2.75, py: 1.75, background: 'linear-gradient(135deg, #2C56C4 0%, #1E3A8A 55%, #15265C 100%)', borderBottom: '3px solid #3B82F6', color: '#fff' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>
                <KTIcon iconName="bank" className="fs-1" />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 750, fontSize: 16.5, color: '#fff' }}>{editMode ? 'Edit Branch' : 'Create a New Branch'}</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)' }}>Location, address &amp; attendance coordinates</Typography>
              </Box>
            </Stack>
            <IconButton onClick={handleClose} size="small" aria-label="Close" sx={{ color: '#fff' }}><KTIcon iconName="cross" className="fs-3" /></IconButton>
          </Box>
          <Box sx={{ bgcolor: 'background.default', p: 2, maxHeight: '74vh', overflowY: 'auto' }}>
          <Formik
            initialValues={initialState}
            onSubmit={handleSubmit}
            validationSchema={branchSchema}
          >
            {(formikProps) => {
              return (
                <Form
                  className='d-flex flex-column'
                  noValidate
                  id='employee_onboarding_form'
                 
                >
                  <FormSection title="Branch Details" icon={<KTIcon iconName="bank" className="fs-5" />}>
                    <div className='row'>
                      <div className='col-lg-12'>
                        <TextInput
                          isRequired={true}
                          label='Branch Name'
                          margin='mb-7'
                          formikField='name'
                        />
                      </div>
                      <div className='col-lg-12'>
                        <DropDownInput
                          isRequired={true}
                          formikField='companyId'
                          inputLabel='Organization'
                          options={orgOptions}
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Location" icon={<KTIcon iconName="geolocation" className="fs-5" />}>

                  <div className='row'>
                    {/* <div className='col-lg-12 mb-7'>
                      <DropDownInput
                        isRequired={false}
                        formikField='currency'
                        inputLabel='Currency'
                        options={currenciesOption}
                      />
                    </div> */}

                    {/* <div className='col-lg-6 mb-7'>
                      <DropDownInput
                        isRequired={false}
                        formikField='dateFormat'
                        inputLabel='Date Format'
                        options={dateFormatOptions}
                      />
                    </div> */}
                  </div>

                  {/* <div className='row'>
                    <div className='col-lg-12 mb-7'> */}
                      <LocationDropdown
                        isRequired={true}
                        value={selectedCountry}
                        handleChange={(option: any) => {
                          handleChange(
                            option,
                            'countryId',
                            setSelectedCountry,
                            formikProps.setFieldValue
                          )

                          setSelectedState(null)
                          formikProps.setFieldValue('stateId', '')

                          setSelectedCity(null)
                          formikProps.setFieldValue('cityId', '')

                          setSelectedTown(null)
                          formikProps.setFieldValue('townId', '')

                          setStatesOptions([])
                          setCitiesOptions([])

                          // Scope the Timezone dropdown to ONLY this country's real
                          // zones, and prefill its default — never overwriting a
                          // timezone the admin already picked explicitly in this
                          // session (see TIMEZONE_OPTIONS comment).
                          const { options: tzOptions, defaultZone } = resolveCountryTimezones(option?.value)
                          setCountryTimezoneOptions(tzOptions)
                          if (!timezoneManuallyEdited && defaultZone) {
                            formikProps.setFieldValue('timezone', defaultZone)
                          }
                        }}
                        formikField='countryId'
                        inputLabel='Country'
                        options={filteredCountries}
                        onInputChange={(newValue) => {
                          setCountrySearch(newValue)
                        }}
                      />
                    {/* </div>
                  </div> */}

                  <div className='row'>
                    <div className='col-lg-6 mb-7'>
                      <LocationDropdown
                        isDisabled={selectedCountry == null ? true : false}
                        value={selectedState}
                        isRequired={true}
                        handleChange={(option: any) => {
                          handleChange(
                            option,
                            'stateId',
                            setSelectedState,
                            formikProps.setFieldValue
                          )

                          setSelectedCity(null)
                          formikProps.setFieldValue('cityId', '')

                          setSelectedTown(null)
                          formikProps.setFieldValue('townId', '')

                          setCitiesOptions([])
                        }}
                        formikField='stateId'
                        inputLabel='State'
                        options={statesOption}
                      />
                    </div>

                    <div className='col-lg-6 mb-7'>
                      {/* City is a free-text field: the city dataset isn't available
                          offline (CSC API needs a key) and cities are stored by name. */}
                      <TextInput
                        isRequired={true}
                        label='City'
                        formikField='cityId'
                      />
                    </div>

                    <div className='col-lg-6 mb-sm-7 mb-md-7 mb-7'>
                      <DropDownInput
                        isRequired={true}
                        formikField='townId'
                        inputLabel='Town'
                        options={townsOption}
                        showAddBtn={true}
                        functionToCallOnModalSubmit={createNewTowns}
                        fieldName="towns"
                        functionToSetFieldOptions={handleTownsRefresh}
                      />
                    </div>

                    <div className='col-lg-6 mb-sm-0 mb-md-0 mb-7'>
                      <TextInput
                        isRequired={true}
                        label='Postal Code'
                        margin='mb-7'
                        formikField='postalCode'
                      />
                    </div>
                  </div>
                  </FormSection>

                  <FormSection title="Map Coordinates" icon={<KTIcon iconName="map" className="fs-5" />} description="Used to validate on-site attendance check-ins.">
                    <div className='row g-3'>
                      <div className='col-lg-6'>
                        <TextInput
                          isRequired={true}
                          label='Latitude'
                          formikField='latitude'
                        />
                      </div>
                      <div className='col-lg-6'>
                        <TextInput
                          isRequired={true}
                          label='Longitude'
                          formikField='longitude'
                        />
                      </div>
                    </div>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
                      <Typography
                        component="span"
                        onClick={() => geocodeAddressToLatLng(formikProps)}
                        title="Fill coordinates from the Branch Address below"
                        sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600, fontSize: 12.5 }}
                      >
                        📍 Get coordinates from Address
                      </Typography>
                      <Typography
                        component="span"
                        onClick={() => handleDetectLocation(formikProps)}
                        sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600, fontSize: 12.5 }}
                      >
                        Detect Current Location
                      </Typography>
                    </Stack>
                    <div className='mt-4'>
                      <TextInput
                        isRequired={true}
                        label='Branch Address'
                        margin=''
                        formikField='address'
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Preferences" icon={<KTIcon iconName="setting-2" className="fs-5" />}>
                    <div className='row'>
                      <div className='col-lg-12 mb-7'>
                        <DropDownInput
                          isRequired={false}
                          formikField='timezone'
                          inputLabel='Timezone'
                          options={countryTimezoneOptions ?? TIMEZONE_OPTIONS}
                          onChange={(option: any) => {
                            setTimezoneManuallyEdited(true)
                            formikProps.setFieldValue('timezone', option?.value || '')
                          }}
                        />
                        <Typography
                          component="span"
                          onClick={() => detectBrowserTimezone(formikProps)}
                          title="Use this device's own timezone — instant, no location permission needed"
                          sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600, fontSize: 12.5, display: 'inline-block', mt: 0.5 }}
                        >
                          🕒 Detect my timezone
                        </Typography>
                      </div>
                    </div>
                    <RadioInput
                      isRequired={false}
                      inputLabel='Show Time In 12 Hour Format'
                      radioBtns={[
                        { label: 'Yes', value: '1' },
                        { label: 'No', value: '0' },
                      ]}
                      formikField='showDateIn12HourFormat'
                    />
                  </FormSection>

                  {!isDeviceNotDesktop && (
                    <Box sx={{ bgcolor: 'warning.light', color: 'warning.dark', border: 1, borderColor: 'warning.main', borderRadius: 2, px: 1.75, py: 1.25, fontSize: 12.5, fontWeight: 500, mb: 1.5 }}>
                      Automatic location detection is only available on mobile / tablet devices.
                    </Box>
                  )}

                  <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
                    <MuiButton variant="text" color="inherit" onClick={handleClose}>Cancel</MuiButton>
                    <MuiButton
                      variant="outlined" color="primary"
                      disabled={loading || !isDeviceNotDesktop}
                      startIcon={detectingLocation ? <CircularProgress size={14} /> : undefined}
                      onClick={(e: any) => { e.preventDefault(); handleDetectLocation(formikProps); }}
                    >
                      Detect Location
                    </MuiButton>
                    <MuiButton
                      type="submit" variant="contained"
                      disabled={loading || !formikProps.isValid}
                      startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
                    >
                      {editMode ? 'Save Changes' : 'Create Branch'}
                    </MuiButton>
                  </Stack>
                </Form>
              )
            }}
          </Formik>
          </Box>
        </Dialog>

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
