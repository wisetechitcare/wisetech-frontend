/**
 * Tenant subscription packs — must stay aligned with
 * `wisetech-backend/src/constants/entitlements.ts`.
 *
 * Effective UI allow = pack enabled ∩ section/role access.
 */

export const TENANT_PACK_KEYS = ['core', 'workforce', 'pay', 'psa', 'talent'] as const;

export type TenantPackKey = (typeof TENANT_PACK_KEYS)[number];

export type TenantPackFlags = Record<TenantPackKey, boolean>;

/** Match BE default: null/missing entitlements → all on (legacy tenants). */
export const DEFAULT_TENANT_PACKS: TenantPackFlags = {
  core: true,
  workforce: true,
  pay: true,
  psa: true,
  talent: true,
};

export const normalizePackFlags = (raw: unknown): TenantPackFlags => {
  const out: TenantPackFlags = { ...DEFAULT_TENANT_PACKS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of TENANT_PACK_KEYS) {
    if (typeof obj[key] === 'boolean') out[key] = obj[key];
  }
  out.core = true;
  return out;
};

/** Labels for admin module-pack UI — keep in sync with BE `TENANT_PACKS` modules. */
export const TENANT_PACK_META: Record<
  TenantPackKey,
  { title: string; description: string; /** Always on; not toggled in UI. */ locked?: boolean }
> = {
  core: {
    title: 'Core',
    description: 'People, org, documents, settings, and shared workflows — always included.',
    locked: true,
  },
  workforce: {
    title: 'Workforce',
    description: 'Attendance, leave, and time-based performance (KPI).',
  },
  pay: {
    title: 'Pay',
    description: 'Payroll, salary, loans, reimbursements, and finance (needs Workforce for variable pay).',
  },
  psa: {
    title: 'PSA / CRM',
    description: 'Leads, companies, projects, tasks, timesheets, and billing — off for HR-only pilots.',
  },
  talent: {
    title: 'Talent',
    description: 'Recruitment — optional attach.',
  },
};

export const countEnabledOptionalPacks = (packs: TenantPackFlags): number =>
  TENANT_PACK_KEYS.filter((k) => !TENANT_PACK_META[k].locked && packs[k]).length;

/**
 * Sidebar / SectionGuard module keys → subscription pack.
 * Must stay aligned with BE `TENANT_PACKS` in `wisetech-backend/src/constants/entitlements.ts`.
 */
export const SECTION_TO_PACK: Partial<Record<string, TenantPackKey>> = {
  'crm.leads': 'psa',
  'crm.companies': 'psa',
  'crm.contacts': 'psa',
  projects: 'psa',
  tasks: 'psa',
  timesheets: 'psa',
  billing: 'psa',
  recruitment: 'talent',
  'finance.loans': 'pay',
  'finance.reimbursements': 'pay',
  'finance.salary': 'pay',
  'finance.increment': 'pay',
  // Attendance-derived KPI — HR-first GTM: require Workforce (Frappe Performance ≠ Core).
  'reports.kpi': 'workforce',
  'kpi.my': 'workforce',
  'kpi.search': 'workforce',
  'kpi.leaderboard': 'workforce',
  'kpi.configure': 'workforce',
};

/** Resolve pack gate for a section key (supports `attendance.*` → workforce). */
export const packForSection = (section: string): TenantPackKey | null => {
  const exact = SECTION_TO_PACK[section];
  if (exact) return exact;
  if (section.startsWith('attendance')) return 'workforce';
  if (section.startsWith('kpi')) return 'workforce';
  if (section.startsWith('reports.kpi')) return 'workforce';
  if (section.startsWith('timesheets')) return 'psa';
  if (section.startsWith('tasks')) return 'psa';
  if (section.startsWith('crm.')) return 'psa';
  if (section.startsWith('billing.')) return 'psa';
  if (section.startsWith('finance.')) return 'pay';
  return null;
};
