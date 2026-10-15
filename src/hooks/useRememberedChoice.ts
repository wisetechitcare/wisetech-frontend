import { useCallback, useState } from 'react';

/**
 * A small UI choice that should survive a reload — a view mode, a chosen tab.
 *
 * WHY THIS IS A HOOK AND NOT THREE COPIES. The document vault and the employee list each grew
 * their own `readStoredViewMode` / `changeViewMode` pair: same localStorage key pattern, same
 * try/catch, same defaulting, written twice. The recruitment pipeline was about to be the third
 * (its Board/List choice reset on every navigation — audit M20), which is the point at which the
 * rule says build it once.
 *
 * WHAT IT GUARDS, beyond deduplication:
 *
 * - **A stored value is validated against `allowed`.** A key left behind by an older build, or
 *   edited by hand, would otherwise put the screen into a mode it no longer has and there would be
 *   no way back through the UI. An unrecognised value falls back rather than being trusted.
 * - **Every access is wrapped.** `localStorage` THROWS in a private window and when site data is
 *   blocked — not returns null. An unguarded read at init crashes the screen before it paints, and
 *   an unguarded write breaks the interaction it was meant to remember.
 *
 * `localStorage`, not `sessionStorage`: the point is that the preference outlives the tab.
 *
 * Deliberately NOT cross-tab reactive. A `storage` listener would make one tab reach over and
 * change the view another tab is being read in, which is startling rather than helpful. Personal
 * settings that DO need that (see `useTimeFormat`) subscribe on purpose.
 */
export function useRememberedChoice<T extends string>(
    storageKey: string,
    allowed: readonly T[],
    fallback: T,
): [T, (next: T) => void] {
    const read = (): T => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
        } catch {
            return fallback;
        }
    };

    // Lazy initialiser: the read happens once, not on every render.
    const [choice, setChoice] = useState<T>(read);

    const choose = useCallback(
        (next: T) => {
            setChoice(next);
            try {
                localStorage.setItem(storageKey, next);
            } catch {
                // Blocked storage must never stop the view from switching — the choice still
                // applies for this session, it just will not be remembered.
            }
        },
        [storageKey],
    );

    return [choice, choose];
}
