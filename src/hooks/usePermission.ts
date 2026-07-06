import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { evaluateCapability } from '@utils/can';

export const usePermission = (permissionKey: string): boolean => {
  const capabilities = useSelector((state: RootState) => (state as any).authz?.capabilities || []);
  return evaluateCapability(capabilities, permissionKey);
};
