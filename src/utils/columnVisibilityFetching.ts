/**
 * Utility for managing column visibility and selective backend field fetching.
 * When users toggle columns, only visible columns' data is fetched from the backend.
 */

export interface ColumnVisibilityConfig {
  allKeys: string[];
  fieldsToKey?: (fields: string[] | undefined) => string;
}

/**
 * Creates a function to compute visible fields based on column visibility map.
 * Returns undefined when all columns are visible (for full fetch).
 */
export const createComputeFields = (allKeys: string[]) => (
  visibility?: Record<string, boolean>,
): string[] | undefined => {
  if (!visibility) return undefined;
  const visible = allKeys.filter((k) => visibility[k] !== false);
  return visible.length >= allKeys.length ? undefined : visible;
};

/**
 * Creates a function to build visibility map from visible column keys.
 */
export const createVisibilityFromKeys = (allKeys: string[]) => (
  keys: string[],
): Record<string, boolean> =>
  Object.fromEntries(allKeys.map((k) => [k, keys.includes(k)]));

/**
 * Generates a stable key for a field set to detect actual changes.
 * Used to skip redundant refetches when visibility hasn't actually changed.
 */
export const getFieldsKey = (fields: string[] | undefined): string =>
  fields ? [...fields].sort().join(",") : "ALL";

/**
 * Hook-like state management for column visibility refetching.
 * Tracks refs needed to prevent duplicate refetches and handle initial emissions.
 */
export const createColumnVisibilityRefetchState = () => ({
  visibleColumnsRef: { current: null as string[] | null },
  lastFieldsKeyRef: { current: null as string | null },
  firstVisibilityEmissionRef: { current: true },
  columnsRefetchTimerRef: { current: null as ReturnType<typeof setTimeout> | null },

  cleanup() {
    if (this.columnsRefetchTimerRef.current) {
      clearTimeout(this.columnsRefetchTimerRef.current);
    }
  },
});

/**
 * Factory for creating a handleVisibleColumnsChange callback.
 * Debounces and only refetches when the field set actually changes.
 *
 * @param computeFields Function to convert visibility to fields
 * @param onRefetch Callback to trigger refetch with new fields
 * @param state Ref state tracking (from createColumnVisibilityRefetchState)
 * @param debounceMs Debounce delay in ms
 */
export const createVisibilityChangeHandler = (
  computeFields: (visibility: Record<string, boolean>) => string[] | undefined,
  onRefetch: (fields: string[] | undefined) => void,
  state: ReturnType<typeof createColumnVisibilityRefetchState>,
  debounceMs = 500,
) => {
  return (keys: string[]) => {
    state.visibleColumnsRef.current = keys;
    const visibility = Object.fromEntries(keys.map((k) => [k, true]));
    const fields = computeFields(visibility);
    const key = getFieldsKey(fields);

    // First emission: record baseline, don't refetch
    if (state.firstVisibilityEmissionRef.current) {
      state.firstVisibilityEmissionRef.current = false;
      state.lastFieldsKeyRef.current = key;
      return;
    }

    // No change detected
    if (key === state.lastFieldsKeyRef.current) return;
    state.lastFieldsKeyRef.current = key;

    // Debounce refetch
    if (state.columnsRefetchTimerRef.current) {
      clearTimeout(state.columnsRefetchTimerRef.current);
    }
    state.columnsRefetchTimerRef.current = setTimeout(() => {
      onRefetch(fields);
    }, debounceMs);
  };
};
