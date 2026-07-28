/**
 * Access Control — React Query hooks. All server state lives here (no duplicated
 * state in components, no axios in components).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchCatalog, fetchRoleById, fetchRoleMembers, fetchRoleSummary, fetchRoles } from '../api/accessControl.api';
import type { RoleListParams } from '../types';

/** Module-local query keys (mirrors the pattern used by src/modules/audit). */
export const accessKeys = {
  all: ['access-control'] as const,
  catalog: () => [...accessKeys.all, 'catalog'] as const,
  roles: (params: RoleListParams) => [...accessKeys.all, 'roles', params] as const,
  role: (id: string) => [...accessKeys.all, 'role', id] as const,
  roleSummary: (id: string) => [...accessKeys.all, 'role', id, 'summary'] as const,
  roleMembers: (id: string) => [...accessKeys.all, 'role', id, 'members'] as const,
};

/**
 * The frontend source of truth for business labels (modules, capabilities,
 * reach). Cached aggressively — it only changes when the permission catalog
 * version changes.
 */
export const useCapabilityCatalog = () =>
  useQuery({
    queryKey: accessKeys.catalog(),
    queryFn: fetchCatalog,
    staleTime: 60 * 60 * 1000, // 1h — catalog is effectively static per deploy
  });

export const useRoles = (params: RoleListParams) =>
  useQuery({
    queryKey: accessKeys.roles(params),
    queryFn: () => fetchRoles(params),
    placeholderData: (previous) => previous, // keep the grid stable while paging/searching
  });

export const useRole = (id: string | undefined) =>
  useQuery({
    queryKey: accessKeys.role(id ?? ''),
    queryFn: () => fetchRoleById(id as string),
    enabled: !!id,
  });

export const useRoleSummary = (id: string | undefined) =>
  useQuery({
    queryKey: accessKeys.roleSummary(id ?? ''),
    queryFn: () => fetchRoleSummary(id as string),
    enabled: !!id,
  });

/** The employees assigned this role — loaded only when the members view opens. */
export const useRoleMembers = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: accessKeys.roleMembers(id ?? ''),
    queryFn: () => fetchRoleMembers(id as string),
    enabled: !!id && enabled,
  });
