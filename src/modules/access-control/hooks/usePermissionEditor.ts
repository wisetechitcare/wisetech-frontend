/**
 * Permission Editor hooks (Phase 5.2).
 *   useRoleEditor           — server grid (React Query)
 *   useSaveRolePermissions  — persist changed modules
 *   usePermissionEditor     — composes both with the local reducer + dirty state
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRoleEditor, saveRoleEditor } from '../api/accessControl.api';
import { accessKeys } from './useAccessControl';
import {
  dirtyModuleKeys,
  editorReducer,
  initialEditorState,
  isModuleDirty,
  toSavePayload,
} from '../state/editorReducer';
import type { BusinessCapability, Reach, SimpleLevel, ValidationIssue } from '../types';

export const editorKeys = {
  editor: (id: string) => [...accessKeys.all, 'role', id, 'editor'] as const,
};

/** Server state: the normalized capability grid for a role. */
export const useRoleEditor = (id: string | undefined) =>
  useQuery({
    queryKey: editorKeys.editor(id ?? ''),
    queryFn: () => fetchRoleEditor(id as string),
    enabled: !!id,
  });

/** Persist the changed modules. Invalidates every view of this role. */
export const useSaveRolePermissions = (id: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReturnType<typeof toSavePayload>) => saveRoleEditor(id as string, payload),
    onSuccess: () => {
      // The role's access changed → summary, details, list and editor are stale.
      queryClient.invalidateQueries({ queryKey: accessKeys.all });
    },
  });
};

/** Extract human-readable validation issues from a failed save. */
const extractIssues = (error: unknown): ValidationIssue[] => {
  const meta = (error as { meta?: { issues?: ValidationIssue[] } })?.meta;
  if (meta?.issues?.length) return meta.issues;
  const nested = (error as { response?: { data?: { meta?: { issues?: ValidationIssue[] } } } })?.response?.data?.meta;
  return nested?.issues ?? [];
};

/**
 * The editor's single source of local truth. Components read `modules` and call
 * the setters — they never compose permission keys and never hold their own copy.
 */
export const usePermissionEditor = (roleId: string | undefined) => {
  const query = useRoleEditor(roleId);
  const save = useSaveRolePermissions(roleId);
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  // Hydrate (and re-hydrate after a successful save) from the server copy.
  useEffect(() => {
    if (query.data?.modules) dispatch({ type: 'HYDRATE', modules: query.data.modules });
  }, [query.data]);

  const dirtyKeys = useMemo(() => dirtyModuleKeys(state), [state]);
  const isDirty = dirtyKeys.length > 0;

  // Warn before leaving with unsaved changes (native browser guard).
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setCapability = useCallback((moduleKey: string, action: BusinessCapability, reach: Reach) => {
    setIssues([]);
    dispatch({ type: 'SET_CAPABILITY', moduleKey, action, reach });
  }, []);

  const setLevel = useCallback((moduleKey: string, level: Exclude<SimpleLevel, 'custom'>) => {
    setIssues([]);
    dispatch({ type: 'SET_LEVEL', moduleKey, level });
  }, []);

  const discard = useCallback(() => {
    setIssues([]);
    save.reset();
    dispatch({ type: 'DISCARD' });
  }, [save]);

  const commit = useCallback(async () => {
    if (!isDirty) return;
    setIssues([]);
    try {
      await save.mutateAsync(toSavePayload(state));
      // React Query invalidation refetches, and the HYDRATE effect resets the
      // baseline — so the form becomes clean without a second source of truth.
    } catch (error) {
      setIssues(extractIssues(error));
    }
  }, [isDirty, save, state]);

  return {
    // server
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    role: query.data?.role,
    editable: query.data?.editable ?? false,
    lockedReason: query.data?.lockedReason ?? null,
    // "Department" scope is intentionally not offered in the editor (product
    // decision). The backend still understands the key if an older grant had it,
    // so nothing breaks — it's simply never presented as a choice. Per-section
    // reach exclusions (e.g. hiding "Own" on the Employees section, where it shows
    // nothing) are applied per-module in the editor, NOT globally here.
    reachOptions: (query.data?.reachOptions ?? []).filter((r) => r !== 'department'),
    // local
    modules: state.modules,
    hydrated: state.hydrated,
    isDirty,
    dirtyKeys,
    isModuleDirty: (key: string) => isModuleDirty(state, key),
    // actions
    setCapability,
    setLevel,
    discard,
    commit,
    isSaving: save.isPending,
    saveError: save.isError && issues.length === 0 ? save.error : null,
    issues,
  };
};
