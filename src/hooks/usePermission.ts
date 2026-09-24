import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { can } from '@utils/can';

/** `can(permissionKey)`, re-evaluated whenever the signed-in employee's access reloads. */
export const usePermission = (permissionKey: string) => {
  useSelector((state: RootState) => (state as any).authz?.access);
  return can(permissionKey);
};
