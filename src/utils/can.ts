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
