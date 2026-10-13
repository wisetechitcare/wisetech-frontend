import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import type { TenantPackKey } from '@constants/entitlements';
import { getPacksFromState, isPackEnabled } from '@utils/tenantPacks';
import NoAccessPage from './NoAccessPage';

interface PackGuardProps {
  pack: TenantPackKey;
  children: React.ReactNode;
}

/**
 * Route guard for subscription packs. Runs before role checks so deep links to
 * CRM/pay/recruitment show a clear “not in your plan” screen when the pack is off.
 */
export const PackGuard: React.FC<PackGuardProps> = ({ pack, children }) => {
  const flags = useSelector((s: RootState) => (s as any).authz?.packs);
  const packs = getPacksFromState(flags);
  if (!isPackEnabled(pack, packs)) {
    return <NoAccessPage kind="entitlement" pack={pack} />;
  }
  return <>{children}</>;
};

export default PackGuard;
