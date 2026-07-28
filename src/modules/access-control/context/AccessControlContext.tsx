/**
 * Access Control — UI state (filters, search, paging, sort) for the dashboard.
 * Server state stays in React Query; this holds only view state, so the two
 * never duplicate each other.
 */
import { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';
import type { RoleListParams, RoleStatus, RoleType, SortField, SortOrder } from '../types';

const DEFAULT_PAGE_SIZE = 12;

interface AccessControlContextValue {
  params: RoleListParams;
  search: string;
  setSearch: (value: string) => void;
  setStatus: (value: RoleStatus | 'all') => void;
  setType: (value: RoleType | 'all') => void;
  setLevel: (value: number | undefined) => void;
  setCategory: (value: string | undefined) => void;
  setSort: (field: SortField, order: SortOrder) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const AccessControlContext = createContext<AccessControlContextValue | undefined>(undefined);

const INITIAL: RoleListParams = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: 'published',
  type: 'all',
  sort: 'name',
  order: 'asc',
};

export const AccessControlProvider = ({ children }: { children: ReactNode }) => {
  const [params, setParams] = useState<RoleListParams>(INITIAL);
  const [search, setSearchValue] = useState('');

  // Any filter change resets to page 1 — standard list behavior.
  const patch = useCallback((next: Partial<RoleListParams>) => {
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    patch({ q: value.trim() || undefined });
  }, [patch]);

  const value = useMemo<AccessControlContextValue>(() => ({
    params,
    search,
    setSearch,
    setStatus: (status) => patch({ status }),
    setType: (type) => patch({ type }),
    setLevel: (level) => patch({ level }),
    setCategory: (category) => patch({ category }),
    setSort: (sort, order) => patch({ sort, order }),
    setPage: (page) => setParams((prev) => ({ ...prev, page })),
    resetFilters: () => { setSearchValue(''); setParams(INITIAL); },
    hasActiveFilters:
      !!params.q || params.status !== 'published' || params.type !== 'all'
      || params.level !== undefined || !!params.category,
  }), [params, search, setSearch, patch]);

  return <AccessControlContext.Provider value={value}>{children}</AccessControlContext.Provider>;
};

export const useAccessControlFilters = (): AccessControlContextValue => {
  const ctx = useContext(AccessControlContext);
  if (!ctx) throw new Error('useAccessControlFilters must be used within AccessControlProvider');
  return ctx;
};
