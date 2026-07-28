/**
 * Access Control → Assignments — React Query hooks. All server state lives here
 * (no duplicated state in components, no axios in components).
 *
 * Mutations invalidate the assignment list AND the affected person's effective
 * / history queries on success, so every view stays consistent after a write.
 * Mirrors the pattern used by src/modules/organization/hooks/useOrganization.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAssignment,
  expireAssignment,
  fetchAssignmentById,
  fetchAssignmentHistory,
  fetchAssignments,
  fetchEffectiveAccess,
  fetchPeopleOptions,
  fetchRoleOptions,
  fetchTenantOptions,
  fetchUnitOptions,
  removeAssignment,
  restoreAssignment,
  updateAssignment,
} from '../api/assignments.api';
import type {
  AssignmentListParams,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
} from '../types';

/** Module-local query keys. */
export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (params: AssignmentListParams) => [...assignmentKeys.all, 'list', params] as const,
  detail: (id: string) => [...assignmentKeys.all, 'detail', id] as const,
  effective: (personId: string) => [...assignmentKeys.all, 'effective', personId] as const,
  history: (personId: string) => [...assignmentKeys.all, 'history', personId] as const,
  people: ['assignments', 'people'] as const,
  roles: ['assignments', 'roles'] as const,
  tenants: ['assignments', 'tenants'] as const,
  units: (tenantId: string) => ['assignments', 'units', tenantId] as const,
};

const PICKER_STALE = 5 * 60 * 1000; // pickers change rarely — cache for 5 minutes

// ── Assignments list + detail ─────────────────────────────────────────────────

export const useAssignments = (params: AssignmentListParams) =>
  useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () => fetchAssignments(params),
    placeholderData: (previous) => previous, // keep the table stable while paging/searching
  });

export const useAssignment = (id: string | undefined) =>
  useQuery({
    queryKey: assignmentKeys.detail(id ?? ''),
    queryFn: () => fetchAssignmentById(id as string),
    enabled: !!id,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Invalidate everything a write can touch: the list, and the person's views. */
const useAssignmentInvalidator = () => {
  const queryClient = useQueryClient();
  return (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    if (userId) {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.effective(userId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.history(userId) });
    }
  };
};

export const useCreateAssignment = () => {
  const invalidate = useAssignmentInvalidator();
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => createAssignment(payload),
    onSuccess: (assignment) => invalidate(assignment.userId),
  });
};

export const useUpdateAssignment = () => {
  const invalidate = useAssignmentInvalidator();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssignmentPayload }) =>
      updateAssignment(id, payload),
    onSuccess: (assignment) => invalidate(assignment.userId),
  });
};

export const useRemoveAssignment = () => {
  const invalidate = useAssignmentInvalidator();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId?: string }) => removeAssignment(id),
    onSuccess: (_data, { userId }) => invalidate(userId),
  });
};

export const useRestoreAssignment = () => {
  const invalidate = useAssignmentInvalidator();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId?: string }) => restoreAssignment(id),
    onSuccess: (_data, { userId }) => invalidate(userId),
  });
};

export const useExpireAssignment = () => {
  const invalidate = useAssignmentInvalidator();
  return useMutation({
    mutationFn: ({ id }: { id: string; userId?: string }) => expireAssignment(id),
    onSuccess: (_data, { userId }) => invalidate(userId),
  });
};

// ── Effective access + history ────────────────────────────────────────────────

export const useEffectiveAccess = (personId: string | undefined) =>
  useQuery({
    queryKey: assignmentKeys.effective(personId ?? ''),
    queryFn: () => fetchEffectiveAccess(personId as string),
    enabled: !!personId,
  });

export const useAssignmentHistory = (personId: string | undefined, limit?: number) =>
  useQuery({
    queryKey: assignmentKeys.history(personId ?? ''),
    queryFn: () => fetchAssignmentHistory(personId as string, limit),
    enabled: !!personId,
  });

// ── Picker sources ────────────────────────────────────────────────────────────

export const usePeopleForPicker = (enabled = true) =>
  useQuery({
    queryKey: assignmentKeys.people,
    queryFn: fetchPeopleOptions,
    staleTime: PICKER_STALE,
    enabled,
  });

export const useRolesForPicker = (enabled = true) =>
  useQuery({
    queryKey: assignmentKeys.roles,
    queryFn: fetchRoleOptions,
    staleTime: PICKER_STALE,
    enabled,
  });

export const useTenantsForPicker = (enabled = true) =>
  useQuery({
    queryKey: assignmentKeys.tenants,
    queryFn: fetchTenantOptions,
    staleTime: PICKER_STALE,
    enabled,
  });

export const useUnitsForPicker = (tenantId: string | undefined) =>
  useQuery({
    queryKey: assignmentKeys.units(tenantId ?? ''),
    queryFn: () => fetchUnitOptions(tenantId as string),
    enabled: !!tenantId,
    staleTime: PICKER_STALE,
  });
