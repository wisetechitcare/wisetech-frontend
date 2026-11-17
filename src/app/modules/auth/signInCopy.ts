import type { TypewriterLine } from '@/ds/effects/typewriter'

/**
 * The sign-in headline — the live copy (the kit's Typewriter / Auth Layout stories show the same lines as demo
 * data). One line per product family, its key word in its launcher department's hue (accessSidebarLayout: KPIs
 * and hiring sit under HR), ordered so neighbouring lines never share a colour, landing tri-colour on the brand
 * line. Change the copy here.
 */
export const SIGN_IN_HEADLINE: readonly TypewriterLine[] = [
  ['Effortless ', { text: 'HR', tone: 'blue' }, ', End to End'], //                                  HR Department
  ['Every ', { text: 'Lead', tone: 'green' }, ', Closer to a ', { text: 'Deal', tone: 'green' }], //  CRM
  [{ text: 'Hire', tone: 'blue' }, ' Great People, Faster'], //                                      HR — recruitment
  ['From ', { text: 'Project', tone: 'purple' }, ' to Paid ', { text: 'Invoice', tone: 'purple' }], // Project Department
  [{ text: 'Performance', tone: 'blue' }, ' You Can Measure'], //                                     HR — KPIs
  [{ text: 'Payroll', tone: 'rose' }, ', Right Every Time'], //                                       Finance/Account
  [{ text: 'Fast', tone: 'blue' }, ', ', { text: 'Efficient', tone: 'green' }, ' & ', { text: 'Productive', tone: 'purple' }],
]

export const SIGN_IN_TAGLINE = 'All-in-one HR, CRM, Projects and Payroll for your whole organisation.'

/** The organisation shown before the logo endpoint answers (and if it fails). */
export const DEFAULT_BRAND = 'WiseTech'
