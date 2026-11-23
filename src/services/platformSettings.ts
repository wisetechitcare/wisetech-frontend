/**
 * KAIZNOVA platform settings API — commercial plans CRUD.
 */
import axios from 'axios'
import type { TenantPackFlags } from '@constants/entitlements'

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

export type PlatformPlanPacks = {
  workforce: boolean
  pay: boolean
  psa: boolean
  talent: boolean
}

export type PlatformCommercialPlan = {
  id: string
  code: string
  name: string
  description: string | null
  packs: TenantPackFlags
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type PlatformSettingsPolicy = {
  operatorMfaRequired: true
  supportNormalMaxMinutes: number
  supportBreakGlassMaxMinutes: number
  supportMinMinutes: number
  supportReasonMinLength: number
  packWritesPlatformAdminOnly: true
  updatedAt?: string
}

export type PlatformPlansResponse = {
  plans: PlatformCommercialPlan[]
  defaultNewTenantPlanId: string
  policy: PlatformSettingsPolicy
}

export async function fetchPlatformPlans(opts?: { all?: boolean }): Promise<PlatformPlansResponse> {
  const { data } = await client.get('/api/platform/settings/plans', {
    params: opts?.all ? { all: '1' } : undefined,
  })
  return unwrap<PlatformPlansResponse>(data)
}

export async function createPlatformPlan(input: {
  code?: string
  name: string
  description?: string | null
  packs: PlatformPlanPacks
  isDefault?: boolean
  sortOrder?: number
}): Promise<PlatformCommercialPlan> {
  const { data } = await client.post('/api/platform/settings/plans', input)
  return unwrap<{ plan: PlatformCommercialPlan }>(data).plan
}

export async function updatePlatformPlan(
  id: string,
  input: {
    name?: string
    description?: string | null
    packs?: PlatformPlanPacks
    isActive?: boolean
    sortOrder?: number
  },
): Promise<PlatformCommercialPlan> {
  const { data } = await client.patch(`/api/platform/settings/plans/${encodeURIComponent(id)}`, input)
  return unwrap<{ plan: PlatformCommercialPlan }>(data).plan
}

export async function setDefaultPlatformPlan(id: string): Promise<PlatformCommercialPlan> {
  const { data } = await client.post(`/api/platform/settings/plans/${encodeURIComponent(id)}/default`)
  return unwrap<{ plan: PlatformCommercialPlan }>(data).plan
}

export async function deletePlatformPlan(
  id: string,
  opts?: { hard?: boolean },
): Promise<{ id: string; deactivated: boolean; deleted: boolean }> {
  const { data } = await client.delete(`/api/platform/settings/plans/${encodeURIComponent(id)}`, {
    params: opts?.hard ? { hard: '1' } : undefined,
  })
  return unwrap<{ id: string; deactivated: boolean; deleted: boolean }>(data)
}

export async function updatePlatformPolicy(input: {
  supportNormalMaxMinutes?: number
  supportBreakGlassMaxMinutes?: number
  supportMinMinutes?: number
  supportReasonMinLength?: number
}): Promise<PlatformSettingsPolicy> {
  const { data } = await client.patch('/api/platform/settings/policy', input)
  return unwrap<{ policy: PlatformSettingsPolicy }>(data).policy
}
