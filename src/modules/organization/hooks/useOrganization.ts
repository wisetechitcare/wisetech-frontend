/**
 * Organization Management — React Query hooks. All server state lives here
 * (no duplicated state in components, no axios in components).
 *
 * Mutations invalidate the relevant queries on success so the tree, the unit
 * details and the tenant list all stay consistent after a write.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveTenant,
  archiveUnit,
  createTenant,
  createUnit,
  fetchTenantById,
  fetchTenants,
  fetchUnitById,
  fetchUnitTree,
  moveUnit,
  restoreTenant,
  restoreUnit,
  updateTenant,
  updateUnit,
} from '../api/organization.api';
import type {
  CreateTenantPayload,
  CreateUnitPayload,
  MoveUnitPayload,
  TenantListParams,
  UpdateTenantPayload,
  UpdateUnitPayload,
} from '../types';

/** Module-local query keys (mirrors the pattern used by src/modules/access-control). */
export const organizationKeys = {
  all: ['organization'] as const,
  tenants: (params: TenantListParams) => [...organizationKeys.all, 'tenants', params] as const,
  tenant: (id: string) => [...organizationKeys.all, 'tenant', id] as const,
  tree: (tenantId: string, includeArchived: boolean) =>
    [...organizationKeys.all, 'tree', tenantId, { includeArchived }] as const,
  unit: (id: string) => [...organizationKeys.all, 'unit', id] as const,
};

// ── Tenants ───────────────────────────────────────────────────────────────────

export const useTenants = (params: TenantListParams) =>
  useQuery({
    queryKey: organizationKeys.tenants(params),
    queryFn: () => fetchTenants(params),
    placeholderData: (previous) => previous, // keep the grid stable while paging/searching
  });

export const useTenant = (id: string | undefined) =>
  useQuery({
    queryKey: organizationKeys.tenant(id ?? ''),
    queryFn: () => fetchTenantById(id as string),
    enabled: !!id,
  });

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => createTenant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }) => updateTenant(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.tenant(id) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

export const useArchiveTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

export const useRestoreTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

// ── Organizational units ────────────────────────────────────────────────────────

export const useUnitTree = (
  tenantId: string | undefined,
  options?: { includeArchived?: boolean },
) => {
  const includeArchived = options?.includeArchived ?? false;
  return useQuery({
    queryKey: organizationKeys.tree(tenantId ?? '', includeArchived),
    queryFn: () => fetchUnitTree(tenantId as string, { includeArchived }),
    enabled: !!tenantId,
    placeholderData: (previous) => previous, // avoid a tree flash when toggling "show archived"
  });
};

export const useUnitDetails = (id: string | undefined) =>
  useQuery({
    queryKey: organizationKeys.unit(id ?? ''),
    queryFn: () => fetchUnitById(id as string),
    enabled: !!id,
  });

/** Invalidate every tree + unit-detail view (the write may touch counts anywhere). */
const useUnitInvalidator = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: organizationKeys.all });
  };
};

export const useCreateUnit = () => {
  const invalidate = useUnitInvalidator();
  return useMutation({
    mutationFn: (payload: CreateUnitPayload) => createUnit(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateUnit = () => {
  const invalidate = useUnitInvalidator();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUnitPayload }) => updateUnit(id, payload),
    onSuccess: invalidate,
  });
};

export const useMoveUnit = () => {
  const invalidate = useUnitInvalidator();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveUnitPayload }) => moveUnit(id, payload),
    onSuccess: invalidate,
  });
};

export const useArchiveUnit = () => {
  const invalidate = useUnitInvalidator();
  return useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade: boolean }) => archiveUnit(id, cascade),
    onSuccess: invalidate,
  });
};

export const useRestoreUnit = () => {
  const invalidate = useUnitInvalidator();
  return useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade: boolean }) => restoreUnit(id, cascade),
    onSuccess: invalidate,
  });
};
