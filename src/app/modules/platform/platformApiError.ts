/** Shared axios/API error message for platform console pages. */

type ValidationItem = { field?: string | null; errors?: string[] }

type ApiErrorBody = {
  detail?: string
  message?: string
  validationError?: ValidationItem[]
  meta?: { code?: string; field?: string }
}

export type PlatformApiErrorInfo = {
  message: string
  /** Dot path from Yup / provision meta, when present (e.g. headOffice.address). */
  field?: string
}

export function platformApiErrorInfo(err: unknown): PlatformApiErrorInfo {
  const ax = err as { response?: { data?: ApiErrorBody }; message?: string }
  const body = ax.response?.data
  const validation = body?.validationError
  if (Array.isArray(validation) && validation.length > 0) {
    const first = validation.find((v) => v?.errors?.length) ?? validation[0]
    const msg = first?.errors?.[0]
    if (msg) return { message: msg, field: first?.field ?? undefined }
  }
  const detail = body?.detail
  if (detail && detail !== 'Request body is not valid') {
    return { message: detail, field: body?.meta?.field }
  }
  if (body?.message && body.message !== 'Forbidden') {
    return { message: body.message, field: body?.meta?.field }
  }
  return { message: ax.message || 'Something went wrong' }
}

export function platformApiError(err: unknown): string {
  return platformApiErrorInfo(err).message
}

/** Map API field paths to Create Tenant wizard steps. */
export function platformCreateFieldStep(field?: string): 0 | 1 | 2 | 3 | null {
  if (!field) return null
  if (field.startsWith('organization.') || field.startsWith('packs.')) return 0
  if (field.startsWith('headOffice.')) return 1
  if (field.startsWith('owner.')) return 2
  return null
}
