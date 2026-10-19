import { store } from '@redux/store';
import {
  DEFAULT_TENANT_PACKS,
  packForSection,
  TenantPackFlags,
  TenantPackKey,
} from '@constants/entitlements';

/**
 * Read tenant packs from authz state. Missing packs (old API) → all enabled.
 */
export const getPacksFromState = (packs: TenantPackFlags | null | undefined): TenantPackFlags =>
  packs ?? DEFAULT_TENANT_PACKS;

export const isPackEnabled = (pack: TenantPackKey, flags?: TenantPackFlags | null): boolean => {
  const packs =
    flags ?? ((store.getState() as any).authz?.packs as TenantPackFlags | undefined);
  return getPacksFromState(packs)[pack] !== false;
};

export const isSectionPackEnabled = (section: string, flags?: TenantPackFlags | null): boolean => {
  const pack = packForSection(section);
  if (!pack) return true;
  return isPackEnabled(pack, flags);
};

export { packForSection };
