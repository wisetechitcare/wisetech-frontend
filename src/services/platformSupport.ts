/**
 * KAIZNOVA platform support sessions — cookie session, never tenant Redux.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string

const platformClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

/** Tenant-app banner / end — may use support cookie only. */
const tenantClient = axios.create({
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

export type PlatformSupportStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'ENDED'
  | 'EXPIRED'
  | 'CANCELLED'

export type PlatformSupportAccessMode = 'READ' | 'READ_WRITE'

export type PlatformSupportSession = {
  id: string
  operatorId: string
  rootOrganizationId: string
  reason: string
  breakGlass: boolean
  accessMode: PlatformSupportAccessMode
  status: PlatformSupportStatus
  durationMinutes: number
  approvedByEmployeeId: string | null
  approvedAt: string | null
  decisionNote: string | null
  activatedAt: string | null
  expiresAt: string | null
  endedAt: string | null
  endedByType: string | null
  endedById: string | null
  viewAsEmployeeId: string | null
  createdAt: string
  updatedAt: string
}

export type SupportViewEmployee = {
  id: string
  companyId: string | null
  name: string
  email: string | null
}

export type ActiveSupportSession = {
  sessionId: string
  operatorId: string
  viewAsEmployeeId: string | null
  viewAsName: string | null
  viewAsUserId: string | null
  expiresAt: string | null
  breakGlass: boolean
  accessMode: PlatformSupportAccessMode
}

/** Sentinel localStorage token so ProtectedRoute allows the tenant shell during view-as. */
export const SUPPORT_VIEW_TOKEN_MARKER = 'kaiznova-support-view'

export async function listPlatformSupportSessions(): Promise<PlatformSupportSession[]> {
  const { data } = await platformClient.get('/api/platform/support/sessions')
  return unwrap<{ sessions: PlatformSupportSession[] }>(data).sessions
}

export async function createPlatformSupportSession(input: {
  rootOrganizationId: string
  reason: string
  durationMinutes: number
  breakGlass?: boolean
  accessMode?: PlatformSupportAccessMode
  totpCode?: string
}): Promise<PlatformSupportSession> {
  const { data } = await platformClient.post('/api/platform/support/sessions', input)
  return unwrap<{ session: PlatformSupportSession }>(data).session
}

export async function activatePlatformSupportSession(
  id: string,
  totpCode: string,
): Promise<PlatformSupportSession> {
  const { data } = await platformClient.post(`/api/platform/support/sessions/${encodeURIComponent(id)}/activate`, {
    totpCode,
  })
  return unwrap<{ session: PlatformSupportSession }>(data).session
}

export async function endPlatformSupportSession(id: string): Promise<PlatformSupportSession> {
  const { data } = await platformClient.post(`/api/platform/support/sessions/${encodeURIComponent(id)}/end`)
  return unwrap<{ session: PlatformSupportSession }>(data).session
}

export async function listSupportViewEmployees(sessionId: string): Promise<SupportViewEmployee[]> {
  const { data } = await platformClient.get(
    `/api/platform/support/sessions/${encodeURIComponent(sessionId)}/employees`,
  )
  return unwrap<{ employees: SupportViewEmployee[] }>(data).employees
}

export async function startSupportViewAs(
  sessionId: string,
  employeeId: string,
): Promise<{ expiresAt: string; enterPath: string }> {
  const { data } = await platformClient.post(
    `/api/platform/support/sessions/${encodeURIComponent(sessionId)}/view-as`,
    { employeeId },
  )
  return unwrap<{ expiresAt: string; enterPath: string }>(data)
}

export async function fetchActiveSupportSession(): Promise<ActiveSupportSession | null> {
  const { data } = await tenantClient.get('/api/support-sessions/active')
  return unwrap<{ activeSession: ActiveSupportSession | null }>(data).activeSession
}

export async function endActiveSupportSessionFromBanner(): Promise<void> {
  const { data } = await tenantClient.post('/api/support-sessions/active/end')
  unwrap<{ activeSession: null }>(data)
}

export async function listPendingSupportSessions(): Promise<PlatformSupportSession[]> {
  const { data } = await tenantClient.get('/api/support-sessions/pending')
  return unwrap<{ sessions: PlatformSupportSession[] }>(data).sessions
}

export async function decideSupportSession(
  id: string,
  approve: boolean,
  note?: string,
): Promise<{ status: PlatformSupportStatus }> {
  const { data } = await tenantClient.post(`/api/support-sessions/${encodeURIComponent(id)}/decide`, {
    approve,
    note,
  })
  return unwrap<{ status: PlatformSupportStatus }>(data)
}
