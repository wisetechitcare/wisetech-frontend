import type { TypewriterLine } from './typewriter'

/**
 * Story fixture: the sign-in headline's lines — one per product family, its key word in its launcher
 * department's hue (accessSidebarLayout: KPIs and hiring sit under HR), ordered so neighbouring lines never
 * share a colour, landing tri-colour on the brand line. Shared by the Typewriter and Auth Layout stories.
 * (The live copy belongs to the auth module, which passes it to AuthLayout.)
 */
export const PRODUCT_LINES: readonly TypewriterLine[] = [
  ['Effortless ', { text: 'HR', tone: 'blue' }, ', End to End'], //                                  HR Department
  ['Every ', { text: 'Lead', tone: 'green' }, ', Closer to a ', { text: 'Deal', tone: 'green' }], //  CRM
  [{ text: 'Hire', tone: 'blue' }, ' Great People, Faster'], //                                      HR — recruitment
  ['From ', { text: 'Project', tone: 'purple' }, ' to Paid ', { text: 'Invoice', tone: 'purple' }], // Project Department
  [{ text: 'Performance', tone: 'blue' }, ' You Can Measure'], //                                     HR — KPIs
  [{ text: 'Payroll', tone: 'rose' }, ', Right Every Time'], //                                       Finance/Account
  // Lands in three: the launcher's first three departments — HR, CRM, Projects.
  [{ text: 'Fast', tone: 'blue' }, ', ', { text: 'Efficient', tone: 'green' }, ' & ', { text: 'Productive', tone: 'purple' }],
]

export const LANDING_LINE = 'Fast, Efficient & Productive'
