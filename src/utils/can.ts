import { store } from '@redux/store';

export const can = (permissionKey: string): boolean => {
  const caps = (store.getState() as any).authz?.capabilities || [];
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

export const canAny = (permissionKeys: string[]): boolean => permissionKeys.some((key) => can(key));

export const canAll = (permissionKeys: string[]): boolean => permissionKeys.every((key) => can(key));
