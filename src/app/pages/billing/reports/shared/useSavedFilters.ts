import { useCallback, useState } from "react";

/**
 * Saved filter presets, per report. localStorage only — these are a personal
 * convenience (skip retyping a common query), not shared/team state, so no
 * backend table is warranted.
 */
export interface SavedFilter<T> {
  name: string;
  values: T;
}

const keyFor = (reportKey: string) => `billing-report-filters:${reportKey}`;

export function useSavedFilters<T>(reportKey: string) {
  const [saved, setSaved] = useState<SavedFilter<T>[]>(() => {
    try {
      const raw = localStorage.getItem(keyFor(reportKey));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: SavedFilter<T>[]) => {
    setSaved(next);
    try {
      localStorage.setItem(keyFor(reportKey), JSON.stringify(next));
    } catch {
      // Storage full or blocked — the preset just won't survive a refresh.
    }
  }, [reportKey]);

  const save = useCallback((name: string, values: T) => {
    persist([...saved.filter((s) => s.name !== name), { name, values }]);
  }, [saved, persist]);

  const remove = useCallback((name: string) => {
    persist(saved.filter((s) => s.name !== name));
  }, [saved, persist]);

  return { saved, save, remove };
}
