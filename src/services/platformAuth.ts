/**
 * KAIZNOVA platform console API — separate cookie (`kaiznova_platform_auth`), never tenant Redux.
 * withCredentials so the browser sends/stores the httpOnly platform cookies.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

export type PlatformLoginStep = 'enroll' | 'mfa'

export type PlatformUser = {
  id: string
  email: string
  displayName: string
  platformRole: string
  status?: string
}

type ApiOk<T> = { hasError: false; statusCode: number; message?: string; data?: T }

function unwrap<T>(data: ApiOk<T> | { hasError?: boolean; detail?: string; message?: string }): T {
  if ((data as { hasError?: boolean }).hasError) {
    const err = data as { detail?: string; message?: string }
    throw new Error(err.detail || err.message || 'Request failed')
  }
  return (data as ApiOk<T>).data as T
}

export async function platformLogin(email: string, password: string): Promise<{ step: PlatformLoginStep }> {
  const { data } = await client.post('/api/platform/auth/login', { email, password })
  return unwrap(data)
}

export async function platformMfaEnrollStart(): Promise<{
  otpauthUrl: string
  qrDataUrl: string
  manualSecret: string
  expiresAt: string
}> {
  const { data } = await client.post('/api/platform/auth/mfa/enroll/start', {})
  return unwrap(data)
}

export type PlatformEnrollConfirmResult =
  | { stage: 'awaiting_next' }
  | (PlatformUser & { recoveryCodes?: string[] })

export async function platformMfaEnrollConfirm(
  code: string,
  nextCode?: string,
): Promise<PlatformEnrollConfirmResult> {
  const body: { code?: string; nextCode?: string } = {}
  if (code.trim()) body.code = code.trim()
  if (nextCode?.trim()) body.nextCode = nextCode.trim()
  const { data } = await client.post('/api/platform/auth/mfa/enroll/confirm', body)
  return unwrap(data)
}

export async function platformForgotPassword(email: string): Promise<string> {
  const { data } = await client.post('/api/platform/auth/forgot-password', { email })
  const ok = data as ApiOk<unknown> & { message?: string }
  if (ok.hasError) throw new Error((ok as { detail?: string }).detail || ok.message || 'Request failed')
  return ok.message || 'If an account exists for that email, a password reset link has been sent to it.'
}

export async function platformResetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
  const { data } = await client.post('/api/platform/auth/reset-password', { token, password, confirmPassword })
  unwrap(data)
}

export async function platformChangePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const { data } = await client.post('/api/platform/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword,
  })
  unwrap(data)
}

export async function platformMfaVerify(code: string): Promise<PlatformUser> {
  const { data } = await client.post('/api/platform/auth/mfa', { code })
  return unwrap(data)
}

export async function platformLogout(): Promise<void> {
  await client.post('/api/platform/auth/logout', {})
}

export async function platformMe(): Promise<PlatformUser> {
  const { data } = await client.get('/api/platform/auth/me')
  return unwrap(data)
}

export type PlatformOperator = {
  id: string
  email: string
  displayName: string
  platformRole: string
  status: string
  lastLoginAt: string | null
  inviteExpiresAt: string | null
  createdAt: string
}

export type PlatformInviteResult = {
  user: PlatformOperator
  acceptToken: string
  acceptPath: string
  acceptUrl: string | null
  expiresAt: string
  emailSent: boolean
}

export async function listPlatformOperators(): Promise<PlatformOperator[]> {
  const { data } = await client.get('/api/platform/operators')
  return unwrap<{ operators: PlatformOperator[] }>(data).operators
}

export async function invitePlatformOperator(input: {
  email: string
  displayName: string
  role: string
}): Promise<PlatformInviteResult> {
  const { data } = await client.post('/api/platform/operators', input)
  return unwrap(data)
}

export async function resendPlatformInvite(id: string): Promise<PlatformInviteResult> {
  const { data } = await client.post(`/api/platform/operators/${encodeURIComponent(id)}/resend`, {})
  return unwrap(data)
}

export async function disablePlatformOperator(id: string): Promise<PlatformOperator> {
  const { data } = await client.post(`/api/platform/operators/${encodeURIComponent(id)}/disable`, {})
  return unwrap<{ operator: PlatformOperator }>(data).operator
}

export async function enablePlatformOperator(id: string): Promise<PlatformOperator> {
  const { data } = await client.post(`/api/platform/operators/${encodeURIComponent(id)}/enable`, {})
  return unwrap<{ operator: PlatformOperator }>(data).operator
}

export async function updatePlatformOperator(
  id: string,
  input: { displayName?: string; role?: string },
): Promise<PlatformOperator> {
  const { data } = await client.patch(`/api/platform/operators/${encodeURIComponent(id)}`, input)
  return unwrap<{ operator: PlatformOperator }>(data).operator
}

/** Public — sets password from invite token; sets MFA enroll bridge cookie. */
export async function acceptPlatformInvite(token: string, password: string): Promise<{ step: 'enroll' }> {
  const { data } = await client.post('/api/platform/operators/accept', { token, password })
  return unwrap(data)
}
