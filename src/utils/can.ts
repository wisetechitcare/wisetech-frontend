import { store } from '@redux/store';

export const can = (permissionKey: string): boolean => {
  const caps = (store.getState() as any).authz?.capabilities || [];
  if (!Array.isArray(caps)) return false;

  if (caps.includes('*.*.global') || caps.includes('*.*.all')) return true;
  if (caps.includes(permissionKey)) return true;

  const [module, action] = permissionKey.split('.');
  if (!module || !action) return false;
  return caps.includes(`${module}.${action}.all`);
};

export const canAny = (permissionKeys: string[]): boolean => permissionKeys.some((key) => can(key));

export const canAll = (permissionKeys: string[]): boolean => permissionKeys.every((key) => can(key));
