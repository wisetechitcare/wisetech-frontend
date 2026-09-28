import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';

/**
 * `useState` that remembers its value per key, for UI a user would be annoyed to redo —
 * a table's search text, a chosen filter.
 *
 * It survives a REMOUNT (switching tab and coming back, the header remounting the page at
 * the mobile breakpoint), a refresh, AND a logout: localStorage is the same place the
 * Daily/Weekly/Monthly period selector keeps its choice, so filters now behave the way
 * that selector always has. Clearing the filter clears the stored value with it.
 *
 * Pass `'session'` for something that should be forgotten when the browser tab closes.
 *
 * Storage can throw or be empty (private windows, blocked site data), so every access is
 * guarded and the value falls back to `initial`.
 */
export function useStoredState<T>(rawKey: string | null, initial: T, area: 'local' | 'session' = 'local') {
    // Scoped to the signed-in employee. Browser storage is per machine, not per account,
    // so on a SHARED computer the next person to log in would otherwise inherit whatever
    // the previous one had filtered — and wonder where their rows went.
    const employeeId = useSelector((s: RootState) => s.auth?.currentUser?.id) ?? 'anon';
    const key = rawKey === null ? null : `u:${employeeId}:${rawKey}`;

    const store = useCallback((): Storage | null => {
        try {
            return area === 'session' ? sessionStorage : localStorage;
        } catch {
            return null;
        }
    }, [area]);

    const read = useCallback((): T => {
        if (!key) return initial;
        try {
            const raw = store()?.getItem(key) ?? null;
            return raw === null ? initial : (JSON.parse(raw) as T);
        } catch {
            return initial;
        }
    }, [key, initial, store]);

    const [value, setValue] = useState<T>(read);

    // Re-read when the key changes (a different table, a different record).
    const lastKey = useRef(key);
    useEffect(() => {
        if (lastKey.current === key) return;
        lastKey.current = key;
        setValue(read());
    }, [key, read]);

    useEffect(() => {
        if (!key) return;
        try {
            store()?.setItem(key, JSON.stringify(value));
        } catch {
            /* storage full or blocked — the value still works for this mount */
        }
    }, [key, value, store]);

    return [value, setValue] as const;
}
