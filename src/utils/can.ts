import { store } from '@redux/store';

// Shared evaluation logic so `can()` (reads the store directly) and
// `usePermission()` (subscribes via useSelector for reactivity) can't drift
// out of sync on how a capability key is resolved.
export const evaluateCapability = (caps: unknown, permissionKey: string): boolean => {
  if (!Array.isArray(caps)) return false;

  if (caps.includes('*.*.global') || caps.includes('*.*.all')) return true;
  if (caps.includes(permissionKey)) return true;

  // Scope hierarchy: a broader granted scope (all/global) satisfies a narrower
  // request. The module may contain a dot (e.g. crm.leads), so derive the
  // module.action base by dropping the final scope segment.
  const parts = permissionKey.split('.');
  if (parts.length < 3) return false;
  const base = parts.slice(0, -1).join('.');
  return caps.includes(`${base}.all`) || caps.includes(`${base}.global`);
};

export const can = (permissionKey: string): boolean => {
  const caps = (store.getState() as any).authz?.capabilities || [];
  return evaluateCapability(caps, permissionKey);
};

export const canAny = (permissionKeys: string[]): boolean => permissionKeys.some((key) => can(key));

export const canAll = (permissionKeys: string[]): boolean => permissionKeys.every((key) => can(key));

// Scope tiers from narrowest to broadest (mirrors backend RBAC_SCOPES in
// constants/permissions.ts). Used to check "does this user have view access to
// this module at all", regardless of which scope tier granted it - e.g. a
// default-seeded Team Lead role holds `<module>.view.team`, while the newer
// per-section Access editor (RoleAccessEditor) always grants `.view.all`.
const SCOPE_TIERS = ['self', 'team', 'department', 'all', 'global'];

// True if the current user has view access to `module` at any scope. Intended
// for "default deny unless granted" gates (sidebar links, route guards) on
// sections that have moved off the legacy "visible unless explicitly blocked"
// model - see SectionGuard's `requireGrant` prop.
export const canViewModule = (module: string): boolean =>
  SCOPE_TIERS.some((scope) => can(`${module}.view.${scope}`));

// PURE, reactive-friendly twin of `canViewModule`, prepared for a future
// navigation migration (Milestone 1 only builds the helper — the sidebar is NOT
// migrated here). The CALLER passes the capabilities array (e.g. the value from
// its own `useSelector`/`useMemo` subscription), so gating stays fully reactive
// with no snapshot read inside this helper — unlike `canViewModule`, which reads
// the store directly. Same semantics: "view access to `module` at ANY scope".
//   const caps = useSelector(s => s.authz.capabilities)   // reactive
//   const visible = canView(caps, 'attendance.employees')
export const canView = (capabilities: unknown, module: string): boolean =>
  SCOPE_TIERS.some((scope) => evaluateCapability(capabilities, `${module}.view.${scope}`));

// True if the current user holds `<module>.<action>` at ANY scope tier. The
// backend resolves the user's broadest granted scope per action and enforces
// the real record-level reach (self/team/department) server-side, so the UI
// only needs "can they do this action at all" to decide whether to show the
// affordance. e.g. canDo('crm.leads', 'update'), canDo('crm.leads', 'delete').
export const canDo = (module: string, action: string): boolean =>
  SCOPE_TIERS.some((scope) => can(`${module}.${action}.${scope}`));

// Scope tiers that mean "beyond my own records" (everything wider than self).
const NON_SELF_SCOPE_TIERS = SCOPE_TIERS.filter((s) => s !== 'self');

// True if the user can VIEW `module` at a scope broader than self (team+), i.e.
// they can see OTHER people's records, not only their own. Lets a page gate an
// "all employees / others" surface distinctly from a "my own" surface — e.g. the
// Salary page shows "Employee Payrolls" only to someone who can view others,
// while "My Salary" needs just self-view.
export const canViewOthers = (module: string): boolean =>
  NON_SELF_SCOPE_TIERS.some((scope) => can(`${module}.view.${scope}`));

// True if the employee is staffed on at least one project (PM, execution-team
// member, or internal roster entry) - lets the Projects section reveal itself
// for someone with no general crm.leads/projects grant, since the list itself
// narrows to just the projects they're actually on (see getLeadOwnerWhere).
export const hasProjectMembership = (): boolean =>
  (store.getState() as any).authz?.hasProjectMemberships === true;
