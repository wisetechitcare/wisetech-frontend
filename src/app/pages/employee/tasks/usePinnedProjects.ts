/**
 * Pinned projects — the rail's "always at the top" list.
 *
 * ─── WHY NOT `usePinnedMenu()` ───────────────────────────────────────────────
 * The app already has a pin (`_metronic/layout/core/PinnedMenuContext`), and this deliberately
 * follows every one of its conventions — per-user localStorage key, toggle semantics, the same
 * `bi-pin-angle` / `bi-pin-angle-fill` button, the same "Pin to top" wording, a "Pinned" section
 * above a separator. What it cannot do is STORE these: that pin is keyed by ROUTE (`to`), because
 * what it pins is a sidebar link. A project is not a route — the whole rail lives at `/tasks` and
 * the selection is component state — so pinning one there would either write a dead `to: '#'`
 * entry or push 113 projects into the sidebar's Pinned section, which is a menu, not a workspace.
 *
 * So: same pin, same feel, its own key. Projects belong to the board, not to the aside menu.
 *
 * Stores IDS ONLY. Titles are re-read from the live project list on every render, so a renamed
 * project shows its new name and a project the caller has lost access to simply stops appearing
 * — a cached copy of the name would go stale and a cached row would leak one.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_BASE = 'wt_tasks_pinned_projects';

/**
 * Scoped to the logged-in user, exactly as PinnedMenuContext scopes the aside pins — two
 * accounts on one browser must not inherit each other's favourites.
 */
const storageKey = (): string => {
    try {
        const ls = localStorage.getItem('wise_tech_login');
        const id = ls ? JSON.parse(ls)?.id : null;
        return id ? `${STORAGE_BASE}_${id}` : STORAGE_BASE;
    } catch {
        return STORAGE_BASE;
    }
};

const readPinned = (): string[] => {
    try {
        const raw = localStorage.getItem(storageKey());
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

/**
 * Reads the pins WITHOUT the hook, for the ONE caller that needs them before any row is drawn:
 * the workspace's landing selection, which decides what the board opens on. Keeping the key in
 * one module means the reader and the hook can never disagree about where pins live.
 */
export const readPinnedProjects = (): string[] => readPinned();

export interface PinnedProjects {
    /** Pin order, oldest first — pinning something new never reshuffles what is already there. */
    pinnedIds: string[];
    isPinned: (id: string) => boolean;
    togglePin: (id: string) => void;
}

export const usePinnedProjects = (): PinnedProjects => {
    const [pinnedIds, setPinnedIds] = useState<string[]>(readPinned);

    useEffect(() => {
        try {
            localStorage.setItem(storageKey(), JSON.stringify(pinnedIds));
        } catch {
            /* private mode — pins are a convenience, never a requirement */
        }
    }, [pinnedIds]);

    const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

    const togglePin = useCallback((id: string) => {
        if (!id) return;
        setPinnedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    }, []);

    return useMemo(() => ({ pinnedIds, isPinned, togglePin }), [pinnedIds, isPinned, togglePin]);
};

/**
 * Split a list into its pinned and unpinned halves, each keeping the order it arrived in.
 *
 * A single sort would have worked, but a stable partition is what lets the rail draw a real
 * PINNED section with a heading and a separator (the same shape the aside menu uses) rather than
 * silently reordering rows and leaving the user to work out why.
 */
export const partitionPinned = <T extends { id: string }>(
    items: T[],
    isPinned: (id: string) => boolean,
): { pinned: T[]; rest: T[] } => {
    const pinned: T[] = [];
    const rest: T[] = [];
    for (const item of items) (isPinned(item.id) ? pinned : rest).push(item);
    return { pinned, rest };
};
