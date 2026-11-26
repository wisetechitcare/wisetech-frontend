/**
 * KAIZNOVA platform tenants API — cookie session, never tenant Redux.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

type ApiOk<T> = { hasError: false; statusCode: number; message?: string; data?: T }

function unwrap<T>(data: ApiOk<T> | { hasError?: boolean; detail?: string; message?: string }): T {
  if ((data as { hasError?: boolean }).hasError) {
    const err = data as { detail?: string; message?: string }
    throw new Error(err.detail || err.message || 'Request failed')
  }
  return (data as ApiOk<T>).data as T
}

export type TenantLifecycleStatus = 'ACTIVE' | 'SUSPENDED'

export type PlatformTenantPacks = {
  workforce: boolean
  pay: boolean
  psa: boolean
  talent: boolean
}

export type PlatformTenant = {
  id: string
  name: string
  packs: unknown
  status: TenantLifecycleStatus
  suspendedAt: string | null
  createdAt: string
  ownerContactEmail: string | null
  branchCount: number
  employeeCount: number
}

export type ProvisionTenantPayload = {
  organization: { name: string; gstNumber?: string; panNo?: string; address?: string }
  packs: PlatformTenantPacks
  headOffice: {
    name: string
    countryId: string
    stateId: string
    cityId: string
    /** Optional — town master retired; locality lives in address. */
    townId?: string | null
    postalCode: string
    address: string
    latitude: number
    longitude: number
    timezone: string
    currency: string
  }
  owner: {
    firstName: string
    lastName: string
    /** Login + org notification identity. */
    workEmail: string
    /**
     * Optional recovery inbox (`users.personal_email_id`).
     * Omit / blank → backend mirrors work when it fits VARCHAR(30).
     */
    personalEmail?: string
    dateOfBirth: string
  }
  sendMail?: boolean
}

export type ProvisionTenantResult = {
  rootOrgId: string
  branchId: string | null
  ownerEmployeeId: string
  resumed: boolean
}

export type PlatformTenantOwnerSetup = {
  employeeId: string | null
  workEmail: string | null
  passwordSet: boolean
  canResendSetup: boolean
}

export type PlatformTenantDetail = PlatformTenant & {
  address: string | null
  gstNumber: string | null
  panNo: string | null
  childOrganizations: { id: string; name: string }[]
  ownerSetup: PlatformTenantOwnerSetup
}

export type ResendOwnerPasswordSetupResult = {
  ownerEmployeeId: string
  sentTo: string[]
}

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const { data } = await client.get('/api/platform/tenants')
  return unwrap<{ tenants: PlatformTenant[] }>(data).tenants
}

export async function getPlatformTenant(id: string): Promise<PlatformTenantDetail> {
  const { data } = await client.get(`/api/platform/tenants/${encodeURIComponent(id)}`)
  return unwrap<{ tenant: PlatformTenantDetail }>(data).tenant
}

export type ProvisionAvailabilitySlot = {
  available: boolean
  message?: string
  code?: string
  usedByOrgName?: string
  resumable?: boolean
}

export type ProvisionAvailability = {
  organizationName?: ProvisionAvailabilitySlot
  workEmail?: ProvisionAvailabilitySlot
  personalEmail?: ProvisionAvailabilitySlot
}

/** Create-wizard live uniqueness — call on Owner / org blur and before Next. */
export async function checkPlatformTenantAvailability(q: {
  organizationName?: string
  workEmail?: string
  personalEmail?: string
}): Promise<ProvisionAvailability> {
  const { data } = await client.get('/api/platform/tenants/availability', { params: q })
  return unwrap<{ availability: ProvisionAvailability }>(data).availability
}

export async function createPlatformTenant(payload: ProvisionTenantPayload): Promise<ProvisionTenantResult> {
  const { data } = await client.post('/api/platform/tenants', payload)
  return unwrap<{ result: ProvisionTenantResult }>(data).result
}

export async function updatePlatformTenantProfile(
  id: string,
  input: {
    name?: string
    address?: string | null
    gstNumber?: string | null
    panNo?: string | null
  },
): Promise<PlatformTenantDetail> {
  const { data } = await client.patch(`/api/platform/tenants/${encodeURIComponent(id)}`, input)
  return unwrap<{ tenant: PlatformTenantDetail }>(data).tenant
}

export async function updatePlatformTenantPacks(
  id: string,
  packs: PlatformTenantPacks,
): Promise<{ rootOrgId: string; packs: Record<string, boolean> }> {
  const { data } = await client.patch(`/api/platform/tenants/${encodeURIComponent(id)}/packs`, { packs })
  return unwrap<{ rootOrgId: string; packs: Record<string, boolean> }>(data)
}

export async function suspendPlatformTenant(id: string): Promise<PlatformTenantDetail> {
  const { data } = await client.post(`/api/platform/tenants/${encodeURIComponent(id)}/suspend`)
  return unwrap<{ tenant: PlatformTenantDetail }>(data).tenant
}

export async function reactivatePlatformTenant(id: string): Promise<PlatformTenantDetail> {
  const { data } = await client.post(`/api/platform/tenants/${encodeURIComponent(id)}/reactivate`)
  return unwrap<{ tenant: PlatformTenantDetail }>(data).tenant
}

export async function resendOwnerPasswordSetup(id: string): Promise<ResendOwnerPasswordSetupResult> {
  const { data } = await client.post(
    `/api/platform/tenants/${encodeURIComponent(id)}/resend-owner-password-setup`,
  )
  return unwrap<{ result: ResendOwnerPasswordSetupResult }>(data).result
}

/** Geo handlers return `{ data: T }` (not the usual success envelope). */
async function geoData<T>(path: string): Promise<T> {
  const { data } = await client.get(path)
  if (data && typeof data === 'object' && 'data' in data) return data.data as T
  return data as T
}

/** Country timezone row from geo packs — API may send IANA strings or offset objects. */
export type GeoTimezone = string | { name: string; utcOffsetStr?: string }

export type GeoCountry = {
  id?: string | number
  name: string
  iso2: string
  currency?: string
  defaultTimezone?: string
  timezones?: GeoTimezone[]
}

/** SearchSelect options — always string labels (objects crash React when rendered as children). */
export function geoTimezoneOptions(zones: GeoTimezone[] | undefined, fallback?: string): { value: string; label: string }[] {
  const list = zones?.length ? [...zones] : fallback ? [fallback] : []
  list.sort((a, b) => {
    const ao = typeof a === 'object' && a && typeof a.utcOffsetStr === 'string' ? a.utcOffsetStr : ''
    const bo = typeof b === 'object' && b && typeof b.utcOffsetStr === 'string' ? b.utcOffsetStr : ''
    if (ao || bo) return ao.localeCompare(bo)
    const an = typeof a === 'string' ? a : a?.name ?? ''
    const bn = typeof b === 'string' ? b : b?.name ?? ''
    return an.localeCompare(bn)
  })
  return list
    .map((z) => {
      if (typeof z === 'string') {
        const name = z.trim()
        return name ? { value: name, label: name } : null
      }
      const name = typeof z?.name === 'string' ? z.name.trim() : ''
      if (!name) return null
      const offset = typeof z.utcOffsetStr === 'string' && z.utcOffsetStr ? `(UTC${z.utcOffsetStr}) ` : ''
      return { value: name, label: `${offset}${name}` }
    })
    .filter((x): x is { value: string; label: string } => x != null)
}

export type GeoState = { id?: string | number; name: string; iso2?: string }
export type GeoCity = { id?: string | number; name: string }
export type GeoTown = { id: string; name: string }

export async function platformGeoCountries(): Promise<GeoCountry[]> {
  return geoData('/api/platform/tenants/geo/countries')
}

export async function platformGeoStates(ciso: string): Promise<GeoState[]> {
  return geoData(`/api/platform/tenants/geo/countries/${encodeURIComponent(ciso)}/states`)
}

export async function platformGeoCities(ciso: string, siso: string): Promise<GeoCity[]> {
  return geoData(
    `/api/platform/tenants/geo/countries/${encodeURIComponent(ciso)}/states/${encodeURIComponent(siso)}/cities`,
  )
}

export async function platformTowns(): Promise<GeoTown[]> {
  const { data } = await client.get('/api/platform/tenants/towns')
  const body = unwrap<{ towns: GeoTown[] }>(data)
  return body.towns ?? []
}
