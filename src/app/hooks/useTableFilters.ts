import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs table filter state with URL params so filters persist across navigation.
 * Filters are read from ?search=...&status=...&manager=... on every render.
 *
 * The URL is the SINGLE source of truth — there is deliberately no useState
 * mirror and no syncing effect. An earlier version kept filters in state,
 * restored them from the URL in one effect, and wrote them back in another;
 * on mount the write effect ran with the still-empty initial state and stripped
 * the params the read effect was about to restore, so the two effects chased
 * each other forever (?tab=projects ↔ ?tab=projects&manager=<id>). Deriving
 * straight from the URL removes the second source of truth, so that loop
 * cannot exist.
 */
export const useTableFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchText = searchParams.get('search') || '';
  const projectStatusFilter = searchParams.get('status') || '';
  const projectManagerFilter = searchParams.get('manager') || '';
  const showMissingAddress = searchParams.get('missingAddr') === 'true';

  // Always merge into the params currently in the URL rather than replacing
  // them — other owners (e.g. the ?tab= param on the projects page) keep their
  // values instead of being clobbered. The functional updater avoids writing a
  // stale snapshot captured at render time.
  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const updateSearchText = useCallback(
    (text: string) => setParam('search', text),
    [setParam],
  );

  const updateStatusFilter = useCallback(
    (status: string) => setParam('status', status),
    [setParam],
  );

  const updateManagerFilter = useCallback(
    (manager: string) => setParam('manager', manager),
    [setParam],
  );

  const updateMissingAddress = useCallback(
    (show: boolean) => setParam('missingAddr', show ? 'true' : null),
    [setParam],
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        next.delete('status');
        next.delete('manager');
        next.delete('missingAddr');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return useMemo(
    () => ({
      searchText,
      projectStatusFilter,
      projectManagerFilter,
      showMissingAddress,
      updateSearchText,
      updateStatusFilter,
      updateManagerFilter,
      updateMissingAddress,
      clearAllFilters,
    }),
    [
      searchText,
      projectStatusFilter,
      projectManagerFilter,
      showMissingAddress,
      updateSearchText,
      updateStatusFilter,
      updateManagerFilter,
      updateMissingAddress,
      clearAllFilters,
    ],
  );
};
