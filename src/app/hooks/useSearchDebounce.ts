import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for debounced search input.
 * Prevents filtering on every keystroke, instead waiting for user to stop typing.
 *
 * @param initialValue - Initial search text (default: "")
 * @param debounceMs - Milliseconds to wait before applying search (default: 300)
 * @returns [searchInput, debouncedSearch, setSearchInput]
 *   - searchInput: The current input value (updates instantly)
 *   - debouncedSearch: The debounced value (used for actual filtering)
 *   - setSearchInput: Function to update the search input
 */
export const useSearchDebounce = (initialValue = "", debounceMs = 300) => {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return [searchInput, debouncedSearch, setSearchInput] as const;
};

/**
 * Create memoized lookup maps for fast O(1) searches instead of O(n) array searches.
 * Use this to optimize search performance when dealing with large datasets.
 *
 * @param items - Array of items to create a map from
 * @param keyFn - Function to extract the key from each item
 * @param valueFn - Function to extract the value to display
 * @returns Map where key maps to value
 *
 * @example
 * const employeeMap = createLookupMap(
 *   employees,
 *   (e) => e.employeeId,
 *   (e) => e.employeeName
 * );
 * // Usage: employeeMap.get(employeeId) instead of employees.find(e => e.id === id)?.name
 */
export const createLookupMap = <T, K extends string | number, V>(
  items: T[] | undefined,
  keyFn: (item: T) => K | undefined,
  valueFn: (item: T) => V,
): Map<K, V> => {
  const map = new Map<K, V>();
  items?.forEach((item) => {
    const key = keyFn(item);
    if (key !== undefined) {
      map.set(key, valueFn(item));
    }
  });
  return map;
};
