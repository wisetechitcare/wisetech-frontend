import type { TypewriterLine } from '@/ds/effects/typewriter'

/** Platform console brand — KAIZNOVA operates the product; tenants are customers. */
export const PLATFORM_CONSOLE_BRAND = 'KAIZNOVA'

export const PLATFORM_CONSOLE_HEADLINE: readonly TypewriterLine[] = [
  [{ text: 'Platform', tone: 'blue' }, ' for Every Tenant'],
  ['One Console, ', { text: 'Clear', tone: 'green' }, ' Boundaries'],
  [{ text: 'Operators', tone: 'purple' }, ', Not Employees'],
  [{ text: 'Secure', tone: 'rose' }, ' by Design'],
]

export const PLATFORM_CONSOLE_TAGLINE =
  'KAIZNOVA staff only. Tenant Admins sign in through the customer app — not here.'
