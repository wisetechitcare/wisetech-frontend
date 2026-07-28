/**
 * Organization Management — Tenant Dashboard UI state (search, status filter,
 * paging). Server state stays in React Query; this holds only view state, so
 * the two never duplicate each other. Mirrors access-control's context pattern.
 */
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { TenantListParams, TenantStatus } from '../types';

const DEFAULT_PAGE_SIZE = 12;

interface TenantFilterContextValue {
  params: TenantListParams;
  search: string;
  setSearch: (value: string) => void;
  setStatus: (value: TenantStatus | 'all') => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

const TenantFilterContext = createContext<TenantFilterContextValue | undefined>(undefined);

const INITIAL: TenantListParams = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  status: 'active',
};

export const TenantFilterProvider = ({ children }: { children: ReactNode }) => {
  const [params, setParams] = useState<TenantListParams>(INITIAL);
  const [search, setSearchValue] = useState('');

  // Any filter change resets to page 1 — standard list behavior.
  const patch = useCallback((next: Partial<TenantListParams>) => {
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    patch({ q: value.trim() || undefined });
  }, [patch]);

  const value = useMemo<TenantFilterContextValue>(() => ({
    params,
    search,
    setSearch,
    setStatus: (status) => patch({ status }),
    setPage: (page) => setParams((prev) => ({ ...prev, page })),
    resetFilters: () => { setSearchValue(''); setParams(INITIAL); },
    hasActiveFilters: !!params.q || params.status !== 'active',
  }), [params, search, setSearch, patch]);

  return <TenantFilterContext.Provider value={value}>{children}</TenantFilterContext.Provider>;
};

export const useTenantFilters = (): TenantFilterContextValue => {
  const ctx = useContext(TenantFilterContext);
  if (!ctx) throw new Error('useTenantFilters must be used within TenantFilterProvider');
  return ctx;
};
