import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';

/**
 * Makes a list's URL filters STICK — the way the Daily/Weekly/Monthly selector does.
 *
 * The URL stays the single source of truth (shareable, and one place to read from), but
 * the chosen values are mirrored into localStorage and put back when the screen is opened
 * with no filters in its URL. So leaving for Attendance and coming back — or logging out
 * and in, or reopening the browser — finds the same filters applied.
 *
 * Clearing a filter clears it for good: the snapshot is rewritten on every change, so an
 * empty URL that the user emptied is saved as empty. Only a FIRST visit with nothing in
 * the URL restores.
 *
 * localStorage, not sessionStorage: the period selector already persists this way, and the
 * ask was explicitly for filters to survive a logout.
 */
export function useStickyFilters(rawKey: string, keys: readonly string[]) {
    const [searchParams, setSearchParams] = useSearchParams();
    const restored = useRef(false);
    // Per signed-in employee: browser storage is per machine, so on a shared computer the
    // next person to log in must not inherit the previous one's filters.
    const employeeId = useSelector((s: RootState) => s.auth?.currentUser?.id) ?? 'anon';
    const storageKey = `u:${employeeId}:${rawKey}`;

    useEffect(() => {
        const current: Record<string, string> = {};
        keys.forEach((k) => {
            const v = searchParams.get(k);
            if (v) current[k] = v;
        });

        // First run only: an empty URL takes whatever was last used.
        if (!restored.current) {
            restored.current = true;
            if (Object.keys(current).length === 0) {
                let saved: Record<string, string> = {};
                try {
                    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
                } catch {
                    saved = {};
                }
                const usable = keys.filter((k) => saved[k]);
                if (usable.length) {
                    setSearchParams(
                        (prev) => {
                            const next = new URLSearchParams(prev);
                            usable.forEach((k) => next.set(k, saved[k]));
                            return next;
                        },
                        { replace: true },
                    );
                    // Don't save yet — the restore has not landed in the URL, and writing
                    // the still-empty snapshot here would erase what we just restored.
                    return;
                }
            }
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
            /* storage blocked or full — filters still work for this visit */
        }
        // `keys` is a module-level constant at every call site; re-running on a new array
        // identity would be churn, so it is deliberately not a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, setSearchParams, storageKey]);
}
