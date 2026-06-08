import React, { useEffect, useState } from 'react'
import { Form, Formik, FormikValues, useField, useFormik } from 'formik'
import * as Yup from 'yup'
import { Col, Modal, Row } from 'react-bootstrap'
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
})

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



 

  useEffect(() => {
    if (countries && countries.length > 0) {
      const options = countries.map((country: any) => ({
        value: country.id,
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

  const getLocation = (formikProps: any) => {
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

  const fetchCountries = async () => {
    if (countries != null) {
      setCountriesOptions(countries)
      return
    }

    const countriesResponse = await fetchAllCountries()
    const countriesOptions = countriesResponse.map((country: any) => ({
      value: country.iso2,
      label: country.name,
    }))
    dispatch(saveCountries(countriesOptions))
    setCountriesOptions(countriesOptions)
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
 
  const newBranchButton = isAdmin &&
    hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.create) && (
      <div className='card-toolbar text-end' title='Add a branch'>
        <button onClick={() => handleNew()} className='btn btn-sm btn-light-primary'>
          <KTIcon iconName='plus' className='fs-3' />
          New Branch
        </button>
      </div>
    )

  return (
    <>
      {embedded ? (
        <div className={`d-flex flex-wrap align-items-center px-lg-9 px-4 pt-6 pb-2 ${hideHeading ? 'justify-content-end' : 'justify-content-between'}`}>
          {!hideHeading && <h3 className="mb-0" style={{ fontFamily: 'Barlow', fontWeight: 600, fontSize: 'clamp(18px, 4vw, 24px)', letterSpacing: '0.24px', color: '#000' }}>Branches</h3>}
          {newBranchButton}
        </div>
      ) : (
        <div className="d-flex flex-wrap justify-content-between align-items-center px-lg-9 px-4 py-5">
          <PageTitle breadcrumbs={branchesBreadCrumb}>Branches</PageTitle>
          <div className="d-flex align-items-center justify-content-between w-100">
            <PageHeadingTitle />
            {newBranchButton}
          </div>
        </div>
      )}
        
<div className="px-8">
  <Row>
    {hasPermission(
      resourceNameMapWithCamelCase.branch,
      permissionConstToUseWithHasPermission.readOthers
    ) ? (
      Array.isArray(branches) && branches.length > 0 ? (
        branches.map((branch: any, index: number) => (
          <Col key={`branch-${index}`} xs={12} sm={12} md={6} lg={4} className="pt-4">
            <div className="card border-primary border-top-5 border-end-0 border-bottom-0 border-start-0">
             
              <div className="card-body d-flex align-items-start pt-3 pb-0">
                <div className="d-flex flex-column flex-grow-1 py-2 py-lg-13 me-2">
                  <span className="fw-bold text-gray-900 fs-4 mb-2">
                    {branch.name} 
                  </span>
                  <span
                    className="fw-semibold text-muted fs-5"
                    dangerouslySetInnerHTML={{ __html: branch.address }}
                  />
                  <div className="d-flex justify-content-between align-items-center pt-5">
                    <button
                      type="button"
                      className="btn btn-sm btn-light-primary d-inline-flex align-items-center"
                      style={{ gap: 6 }}
                      title="View employees in this branch"
                      onClick={() => setEmpModal({ show: true, branch })}
                    >
                      <KTIcon iconName="people" className="fs-5" />
                      {branch._count?.Employees ?? 0} Employees
                    </button>
                    {isAdmin && (
                      <div className="d-flex gap-2">
                        {hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers) && (
                          <button
                            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                            title="Promote this branch to a sub-organization"
                            onClick={() => handlePromoteBranch(branch)}
                          >
                            <KTIcon iconName="arrow-up-right" className="fs-3" />
                          </button>
                        )}
                        {hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers) && (
                          <button
                            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                            title="Edit branch"
                            onClick={() => handleEdit(branch.id)}
                          >
                            <KTIcon iconName="pencil" className="fs-3" />
                          </button>
                        )}
                        {hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers) && (
                          <button
                            className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm"
                            title="Delete branch"
                            onClick={() => handleDeleteBranch(branch)}
                          >
                            <KTIcon iconName="trash" className="fs-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        ))
      ) : (
        <div
          style={{
            minHeight: '50vh',
            backgroundColor: 'white',
            padding: '20px',
          }}
          className="card d-flex justify-content-center align-items-center w-100"
        >
          <div
            className="d-flex flex-column align-items-center justify-content-center h-100 w-100 card"
            style={{ color: '#9CAFC9', backgroundColor: '#F9FBFF' }}
          >
            <img
              src={sidePanelIcons.company}
              alt="No branches icon"
              style={{ maxHeight: '100px', marginBottom: '1rem' }}
            />
            <div className="fs-14 text-center">No branches found</div>
          </div>
        </div>
      )
    ) : null}
  </Row>
</div>
        {/* Bumped z-index so the branch form sits above the host Branches modal when embedded */}
        <style>{`.branch-form-backdrop.modal-backdrop{z-index:1086;} .branch-form-dialog{z-index:1090;}`}</style>
        <Modal show={show} onHide={handleClose} centered backdropClassName="branch-form-backdrop" className="branch-form-dialog" style={{ zIndex: 1090 }}>
        <Modal.Header closeButton>
          <Modal.Title>Create a new branch</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={initialState}
            onSubmit={handleSubmit}
            validationSchema={branchSchema}
          >
            {(formikProps) => {
              useEffect(() => {
                // getLocation(formikProps);
                // console.log("formikProps: ", formikProps.values);
                // const { latitude, longitude } = formikProps.values;
                // if(!latitude || !longitude){
                //     getLocation(formikProps);
                // }

                async function fetchCompany() {
                  // Scoped mode: attach the new branch to the given organization.
                  if (companyId) {
                    formikProps.setFieldValue('companyId', companyId, true)
                    return
                  }
                  const {
                    data: { companyOverview },
                  } = await fetchCompanyOverview()
                  formikProps.setFieldValue(
                    'companyId',
                    companyOverview[0].id,
                    true
                  )
                }

                fetchCompany()
              }, [])

              return (
                <Form
                  className='d-flex flex-column'
                  noValidate
                  id='employee_onboarding_form'
                 
                >
                  <div className='row'>
                    <div className='col-lg-12'>
                      <TextInput
                        isRequired={true}
                        label='Branch Name'
                        margin='mb-7'
                        formikField='name'
                      />
                    </div>
                    <div className='col-lg-12 mb-7'>
                      <DropDownInput
                        isRequired={true}
                        formikField='companyId'
                        inputLabel='Organization'
                        options={orgOptions}
                      />
                    </div>
                  </div>

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
                  <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491' }}>
                    <div className="mb-4" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', color: '#0D47A1' }}>LOCATION ON MAP</div>
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
                    <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
                      <span
                        onClick={() => geocodeAddressToLatLng(formikProps)}
                        style={{ cursor: 'pointer', color: '#0D47A1', fontWeight: 600, fontSize: 13 }}
                        title="Fill coordinates from the Branch Address below"
                      >
                        📍 Get coordinates from Address
                      </span>
                      <span
                        onClick={() => handleDetectLocation(formikProps)}
                        style={{ cursor: 'pointer', color: '#0D47A1', fontWeight: 600, fontSize: 13 }}
                      >
                        Detect Current Location
                      </span>
                    </div>
                  </div>
                  <div className='col-lg'>
                    <TextInput
                      isRequired={true}
                      label='Branch Address'
                      margin='mb-7'
                      formikField='address'
                    />
                  </div>

                  {/* Date Settings */}
                  <div className='row'>
                    <div className='col-lg-12 mb-7'>
                      <RadioInput
                        isRequired={false}
                        inputLabel='Show Time In 12 Hour Format'
                        radioBtns={[
                          { label: 'Yes', value: '1' },
                          { label: 'No', value: '0' },
                        ]}
                        formikField='showDateIn12HourFormat'
                      />
                    </div>
                  </div>

                  <div className='d-flex justify-content-between flex-wrap gap-2'>
                    {!isDeviceNotDesktop && (
                      <div className='alert alert-warning' role='alert'>
                        Automatic Location Detection is not allowed on
                        Desktop/Laptop devices
                      </div>
                    )}

                    <button
                      className='btn btn-primary'
                      disabled={loading || !isDeviceNotDesktop}
                      onClick={(e) => {
                        e.preventDefault()
                        handleDetectLocation(formikProps)
                      }}
                    >
                      {!detectingLocation && 'Automatic Location Detection'}
                      {detectingLocation && (
                        <span
                          className='indicator-progress'
                          style={{ display: 'block' }}
                        >
                          Please wait...{' '}
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </span>
                      )}
                    </button>
                    <button
                      type='submit'
                      className='btn btn-primary'
                      disabled={loading || !formikProps.isValid}
                    >
                      {!loading && 'Save Changes'}
                      {loading && (
                        <span
                          className='indicator-progress'
                          style={{ display: 'block' }}
                        >
                          Please wait...{' '}
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </span>
                      )}
                    </button>
                  </div>
                </Form>
              )
            }}
          </Formik>
        </Modal.Body>
      </Modal>

      <BranchEmployeesModal
        show={empModal.show}
        branchId={empModal.branch?.id}
        branchName={empModal.branch?.name}
        onClose={() => setEmpModal({ show: false, branch: null })}
      />
    </>
  )
}

export default Branches
