/**
 * Keep in sync with wisetech-backend/src/constants/provisionColumnLimits.ts
 * (branches.address / organizations.address / users email columns).
 */
export const PROVISION_LIMITS = {
  organizationName: 300,
  organizationAddress: 300,
  branchName: 100,
  branchAddress: 300,
  postalCode: 10,
  ownerFirstName: 30,
  ownerLastName: 30,
  workEmail: 50,
  personalEmail: 30,
} as const
