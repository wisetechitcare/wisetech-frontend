/**
 * FE mirror of backend platformCapabilities — advisory UI only.
 * Server enforce via requirePlatformCapability.
 */
export const PLATFORM_CAPABILITIES = [
  'operators.manage',
  'tenants.write',
  'plans.manage',
  'support.read',
  'support.write',
  'billing.read',
] as const

export type PlatformCapability = (typeof PLATFORM_CAPABILITIES)[number]

const MATRIX: Record<PlatformCapability, readonly string[]> = {
  'operators.manage': ['ADMIN'],
  'tenants.write': ['ADMIN'],
  'plans.manage': ['ADMIN'],
  'support.read': ['ADMIN', 'DEVELOPER', 'SUPPORT'],
  'support.write': ['ADMIN', 'DEVELOPER'],
  'billing.read': ['ADMIN', 'BILLING'],
}

export function roleHasCapability(role: string | null | undefined, cap: PlatformCapability): boolean {
  if (!role) return false
  return MATRIX[cap].includes(role)
}
