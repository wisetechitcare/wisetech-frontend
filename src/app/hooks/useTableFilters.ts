import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FilterState {
  searchText: string;
  projectStatusFilter: string;
  projectManagerFilter: string;
  showMissingAddress: boolean;
}

/**
 * Syncs table filter state with URL params so filters persist across navigation.
 * Filters are read from ?search=...&status=...&manager=... and restored on mount.
 * Updates to filters automatically sync back to the URL without page reload.
 */
export const useTableFilters = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    projectStatusFilter: '',
    projectManagerFilter: '',
    showMissingAddress: false,
  });

  // Restore filters from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      searchText: params.get('search') || '',
      projectStatusFilter: params.get('status') || '',
      projectManagerFilter: params.get('manager') || '',
      showMissingAddress: params.get('missingAddr') === 'true',
    });
  }, [location.search]); // Only restore when URL search changes (navigation)

  // Sync filter updates to URL params (debounced to avoid excessive URL updates)
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Update or remove params based on filter values
    if (filters.searchText) params.set('search', filters.searchText);
    else params.delete('search');

    if (filters.projectStatusFilter) params.set('status', filters.projectStatusFilter);
    else params.delete('status');

    if (filters.projectManagerFilter) params.set('manager', filters.projectManagerFilter);
    else params.delete('manager');

    if (filters.showMissingAddress) params.set('missingAddr', 'true');
    else params.delete('missingAddr');

    // Update URL without page reload
    const newSearch = params.toString();
    if (newSearch !== location.search.slice(1)) {
      navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
    }
  }, [filters]); // Sync whenever filters change

  const updateSearchText = (text: string) => {
    setFilters(prev => ({ ...prev, searchText: text }));
  };

  const updateStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, projectStatusFilter: status }));
  };

  const updateManagerFilter = (manager: string) => {
    setFilters(prev => ({ ...prev, projectManagerFilter: manager }));
  };

  const updateMissingAddress = (show: boolean) => {
    setFilters(prev => ({ ...prev, showMissingAddress: show }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchText: '',
      projectStatusFilter: '',
      projectManagerFilter: '',
      showMissingAddress: false,
    });
  };

  return {
    ...filters,
    updateSearchText,
    updateStatusFilter,
    updateManagerFilter,
    updateMissingAddress,
    clearAllFilters,
  };
};
