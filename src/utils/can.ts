import { store } from '@redux/store';

/**
 * Section access — the one answer the whole UI follows (sidebar, tabs, edit buttons).
 *
 * The server sends, per signed-in employee: `tier` (SUPER_ADMIN / ADMIN hold every section),
 * `access` (section → { read, write }; a section with tabs reads as the OR of its tabs) and `keys`
 * (for checks that are not sections, e.g. approvals). Write implies read.
 */

export type SectionLevel = 'read' | 'write';
type SectionAccess = { read: boolean; write: boolean };

interface AccessState {
  tier: 'SUPER_ADMIN' | 'ADMIN' | null;
  access: Record<string, SectionAccess>;
  keys: string[];
}

const state = (): AccessState => {
  const authz = (store.getState() as any).authz || {};
  return { tier: authz.tier ?? null, access: authz.access || {}, keys: authz.keys || [] };
};

/** Super Admin or Admin — they hold every section and see everyone's rows. */
export const isFullAccess = (): boolean => state().tier !== null;

export const canSection = (section: string, level: SectionLevel = 'read'): boolean => {
  const { tier, access } = state();
  if (tier) return true;
  const entry = access[section];
  return !!entry && (level === 'write' ? entry.write : entry.read);
};

// Mirrors sectionForKey in the backend's middlewares/authorize.ts, so a button shows exactly when
// the server would accept the request behind it.
const KEY_MODULE_SECTION: Record<string, string> = {
  users: 'users',
  timesheets: 'timesheets',
  tasks: 'tasks',
  projects: 'projects',
  'crm.leads': 'crm.leads',
  'crm.companies': 'crm.companies',
  'crm.contacts': 'crm.contacts',
  recruitment: 'recruitment',
  billing: 'billing',
  finance: 'finance',
  kpi: 'reports.kpi',
  'kpi.admin': 'kpi.configure',
  reports: 'reports',
  settings: 'settings',
  calendar: 'calendar',
  dashboard: 'dashboard',
};

const SECTIONS_WITH_KEYS = new Set([
  'finance.loans', 'finance.reimbursements', 'finance.salary', 'finance.increment',
  'attendance.personal', 'attendance.employees', 'timesheets.my', 'timesheets.employees',
  'kpi.my', 'kpi.search', 'kpi.leaderboard', 'kpi.configure', 'reports.kpi',
]);

export const sectionForKey = (module: string, scope: string): string | null => {
  if (SECTIONS_WITH_KEYS.has(module)) return module;
  const self = scope === 'self';
  if (module === 'attendance' || module === 'leaves') return self ? 'attendance' : 'attendance.employees';
  if (module === 'timesheets') return self ? 'timesheets' : 'timesheets.employees';
  return KEY_MODULE_SECTION[module] ?? null;
};

// A key the server holds for checks that are not sections. A broader scope covers a narrower one.
const holdsKey = (key: string): boolean => {
  const { keys } = state();
  if (keys.includes('*.*.global') || keys.includes('*.*.all') || keys.includes(key)) return true;
  const base = key.split('.').slice(0, -1).join('.');
  return keys.includes(`${base}.all`) || keys.includes(`${base}.global`);
};

/** A 'module.action.scope' permission key, answered the way the server's route gates answer it. */
export const can = (permissionKey: string): boolean => {
  const parts = permissionKey.split('.');
  if (parts.length < 3) return false;
  if (isFullAccess()) return true;
  const module = parts.slice(0, -2).join('.');
  const action = parts[parts.length - 2];
  const scope = parts[parts.length - 1];
  const section = sectionForKey(module, scope);
  if (!section) return holdsKey(permissionKey);
  // Your own records need only Read (a `.self` key), as on the server.
  return canSection(section, action === 'view' || scope === 'self' ? 'read' : 'write');
};

export const canAny = (permissionKeys: string[]): boolean => permissionKeys.some((key) => can(key));

export const canAll = (permissionKeys: string[]): boolean => permissionKeys.every((key) => can(key));
