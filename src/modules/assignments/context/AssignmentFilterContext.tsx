/**
 * Access Control → Assignments — Dashboard UI state (search, filters, paging,
 * bulk selection). Server state stays in React Query; this holds only view
 * state, so the two never duplicate each other. Mirrors the organization
 * module's TenantFilterContext.
 */
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { AssignmentListParams, AssignmentStatus } from '../types';

const DEFAULT_PAGE_SIZE = 15;

interface AssignmentFilterContextValue {
  params: AssignmentListParams;
  search: string;
  setSearch: (value: string) => void;
  setStatus: (value: AssignmentStatus | 'all') => void;
  setTenant: (tenantId: string | undefined) => void;
  setRole: (roleId: string | undefined) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const AssignmentFilterContext = createContext<AssignmentFilterContextValue | undefined>(undefined);

const INITIAL: AssignmentListParams = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: 'active',
};

export const AssignmentFilterProvider = ({ children }: { children: ReactNode }) => {
  const [params, setParams] = useState<AssignmentListParams>(INITIAL);
  const [search, setSearchValue] = useState('');

  // Any filter change resets to page 1 — standard list behavior.
  const patch = useCallback((next: Partial<AssignmentListParams>) => {
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    patch({ q: value.trim() || undefined });
  }, [patch]);

  const value = useMemo<AssignmentFilterContextValue>(() => ({
    params,
    search,
    setSearch,
    setStatus: (status) => patch({ status }),
    setTenant: (tenantId) => patch({ tenantId: tenantId || undefined }),
    setRole: (roleId) => patch({ roleId: roleId || undefined }),
    setPage: (page) => setParams((prev) => ({ ...prev, page })),
    resetFilters: () => { setSearchValue(''); setParams(INITIAL); },
    hasActiveFilters:
      !!params.q || params.status !== 'active' || !!params.tenantId || !!params.roleId,
  }), [params, search, setSearch, patch]);

  return <AssignmentFilterContext.Provider value={value}>{children}</AssignmentFilterContext.Provider>;
};

export const useAssignmentFilters = (): AssignmentFilterContextValue => {
  const ctx = useContext(AssignmentFilterContext);
  if (!ctx) throw new Error('useAssignmentFilters must be used within AssignmentFilterProvider');
  return ctx;
};
