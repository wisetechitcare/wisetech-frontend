import { describe, expect, it } from 'vitest'
import { matchPlanIdByPacks, optionalPacksFromFlags } from '../platformPlans'
import type { TenantPackFlags } from '../entitlements'

const pilot: TenantPackFlags = {
  core: true,
  workforce: true,
  pay: false,
  psa: false,
  talent: false,
}

const full: TenantPackFlags = {
  core: true,
  workforce: true,
  pay: true,
  psa: true,
  talent: true,
}

describe('platformPlans matchers', () => {
  it('optionalPacksFromFlags omits core', () => {
    expect(optionalPacksFromFlags(pilot)).toEqual({
      workforce: true,
      pay: false,
      psa: false,
      talent: false,
    })
  })

  it('matchPlanIdByPacks returns the matching active plan id', () => {
    const plans = [
      { id: 'a', packs: pilot, isActive: true },
      { id: 'b', packs: full, isActive: true },
    ]
    expect(matchPlanIdByPacks(plans, optionalPacksFromFlags(full))).toBe('b')
    expect(matchPlanIdByPacks(plans, optionalPacksFromFlags(pilot))).toBe('a')
  })

  it('matchPlanIdByPacks skips inactive and returns null when unmatched', () => {
    const plans = [{ id: 'a', packs: pilot, isActive: false }]
    expect(matchPlanIdByPacks(plans, optionalPacksFromFlags(pilot))).toBeNull()
    expect(
      matchPlanIdByPacks(
        [{ id: 'a', packs: pilot, isActive: true }],
        { workforce: true, pay: true, psa: false, talent: false },
      ),
    ).toBeNull()
  })
})
