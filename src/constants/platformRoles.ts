/**
 * Platform operator roles — fixed product enum (matches Prisma PlatformRole).
 * Not Settings-editable; changing the set is a schema + product change.
 */
export const PLATFORM_ROLE_ITEMS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'BILLING', label: 'Billing' },
] as const

export type PlatformRoleValue = (typeof PLATFORM_ROLE_ITEMS)[number]['value']

export const PLATFORM_ROLE_VALUES = PLATFORM_ROLE_ITEMS.map((r) => r.value)
