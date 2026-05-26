import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

export const usePermission = (permissionKey: string) => {
  const capabilities = useSelector((state: RootState) => (state as any).authz?.capabilities || []);

  if (capabilities.includes('*.*.global') || capabilities.includes('*.*.all')) return true;
  if (capabilities.includes(permissionKey)) return true;

  const [module, action] = permissionKey.split('.');
  if (!module || !action) return false;

  return capabilities.includes(`${module}.${action}.all`);
};
