/**
 * Helpers for applying commercial plans to tenant packs.
 * Plan rows themselves come from the API (CRUD); this file only has pure matchers.
 */
import type { TenantPackFlags } from '@constants/entitlements'

export type OptionalPacks = {
  workforce: boolean
  pay: boolean
  psa: boolean
  talent: boolean
}

export function optionalPacksFromFlags(packs: TenantPackFlags): OptionalPacks {
  return {
    workforce: packs.workforce,
    pay: packs.pay,
    psa: packs.psa,
    talent: packs.talent,
  }
}

export function matchPlanIdByPacks(
  plans: Array<{ id: string; packs: TenantPackFlags; isActive?: boolean }>,
  packs: OptionalPacks,
): string | null {
  for (const plan of plans) {
    if (plan.isActive === false) continue
    if (
      plan.packs.workforce === packs.workforce &&
      plan.packs.pay === packs.pay &&
      plan.packs.psa === packs.psa &&
      plan.packs.talent === packs.talent
    ) {
      return plan.id
    }
  }
  return null
}
