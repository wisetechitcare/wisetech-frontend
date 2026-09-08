import { useCallback, useState } from 'react';

/**
 * Where the Meeting lane sits on a board.
 *
 * ─── WHY THIS IS NOT A `sortOrder` ───────────────────────────────────────────
 * Every other lane is a `TaskStatus` row, and dragging one writes its `sortOrder` for the whole
 * company. The Meeting lane has no row: it is synthesised from the meetings table so the board
 * and the calendar cannot drift (see TaskAndTime.getTaskBoard). There is nothing to write a
 * sortOrder to, so its position is remembered here instead — per viewer, per board, in the
 * browser, exactly like the board background and the pinned projects already are.
 *
 * That is also the honest scope. A stage's position is a decision about the shared workflow;
 * "I would rather see meetings after my in-progress column" is a preference about one person's
 * screen, and pushing it onto everybody else's board would be a bigger claim than the gesture
 * makes.
 *
 * `null` means untouched — the lane keeps the position the server sent, which is first.
 */
const key = (boardId: string) => `meetingLanePos:${boardId || 'all'}`;

const read = (boardId: string): number | null => {
    try {
        const raw = localStorage.getItem(key(boardId));
        if (raw === null) return null;
        const n = Number(raw);
        return Number.isInteger(n) && n >= 0 ? n : null;
    } catch {
        // A browser with site data blocked still gets a working board, just not a remembered one.
        return null;
    }
};

export const useMeetingLanePosition = (boardId: string) => {
    const [position, setPosition] = useState<number | null>(() => read(boardId));

    const remember = useCallback((next: number | null) => {
        setPosition(next);
        try {
            if (next === null) localStorage.removeItem(key(boardId));
            else localStorage.setItem(key(boardId), String(next));
        } catch { /* nothing to remember it with; the drag still applied for this session */ }
    }, [boardId]);

    return { position, remember };
};

/**
 * Moves one item of `list` to `index`, leaving the rest in order.
 *
 * Clamped rather than validated: a stored position outlives the board it was stored for, so a
 * lane deleted since can leave an index past the end. Landing last is the right answer there,
 * and it is a better one than throwing away a preference the person set.
 */
export const moveTo = <T,>(list: T[], isTarget: (item: T) => boolean, index: number): T[] => {
    const at = list.findIndex(isTarget);
    if (at < 0) return list;
    const rest = [...list];
    const [item] = rest.splice(at, 1);
    rest.splice(Math.min(Math.max(index, 0), rest.length), 0, item);
    return rest;
};
