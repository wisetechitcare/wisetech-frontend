/**
 * Keep in sync with wisetech-backend/src/constants/provisionColumnLimits.ts
 * (branches.address / organizations.address / users email columns).
 * Used by Create Tenant + Branches — never hardcode twin max lengths in feature forms.
 */
export const PROVISION_LIMITS = {
  organizationName: 300,
  organizationAddress: 300,
  organizationGst: 100,
  organizationPan: 50,
  branchName: 100,
  branchAddress: 300,
  postalCode: 10,
  timezone: 50,
  currency: 10,
  ownerFirstName: 30,
  ownerLastName: 30,
  workEmail: 50,
  personalEmail: 30,
} as const
