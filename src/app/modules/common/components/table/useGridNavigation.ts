import { useCallback, useEffect, useRef } from 'react';
import { nextCell, isMove, NAVIGATION_KEYS, CellPosition } from './gridNavigation';

/**
 * Arrow-key navigation over the table body, attached to the scroll container.
 *
 * Deliberately thin: all movement decisions come from ./gridNavigation, which is unit
 * tested. This only finds cells and moves focus.
 *
 * ROVING TABINDEX, not "every cell focusable". A wide grid has hundreds of cells; making
 * them all tabbable means a keyboard user needs hundreds of Tab presses to get past the
 * table. Instead exactly one cell is tabbable at a time — Tab enters the grid once and
 * leaves once, arrows move within it. This is the pattern the ARIA grid guidance
 * describes and what Excel/Sheets do.
 *
 * Attaches a single listener to the container rather than per cell: cells are recreated
 * on every sort, filter and page, and per-cell listeners would leak and go stale.
 */
export const useGridNavigation = (
    containerRef: React.RefObject<HTMLElement>,
    enabled: boolean,
) => {
    const posRef = useRef<CellPosition>({ row: 0, col: 0 });

    const cellsIn = useCallback((container: HTMLElement) => {
        const rows = Array.from(container.querySelectorAll('tbody tr'));
        return rows.map((r) => Array.from(r.querySelectorAll<HTMLElement>('td')));
    }, []);

    /** Make exactly one cell tabbable and focus it. */
    const focusCell = useCallback(
        (container: HTMLElement, pos: CellPosition) => {
            const grid = cellsIn(container);
            const cell = grid[pos.row]?.[pos.col];
            if (!cell) return;
            grid.forEach((row) => row.forEach((c) => c.setAttribute('tabindex', '-1')));
            cell.setAttribute('tabindex', '0');
            cell.focus();
            posRef.current = pos;
        },
        [cellsIn],
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!enabled || !container) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (!NAVIGATION_KEYS.has(e.key)) return;

            // Let the focused control handle its own keys — arrows inside a text field or
            // a select must move the caret/option, not the grid.
            const active = document.activeElement as HTMLElement | null;
            if (active && active !== container) {
                const tag = active.tagName.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || active.isContentEditable) return;
            }

            const grid = cellsIn(container);
            const dims = { rowCount: grid.length, colCount: grid[0]?.length ?? 0 };
            const to = nextCell(posRef.current, e.key, dims, { ctrl: e.ctrlKey || e.metaKey });

            // Only swallow the key if it actually moved. At an edge the browser keeps its
            // default, so arrows still scroll the page instead of doing nothing.
            if (!isMove(posRef.current, to)) return;
            e.preventDefault();
            focusCell(container, to);
        };

        // Track where the user clicked so arrows continue from there.
        const onFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            const td = target?.closest?.('td');
            if (!td) return;
            const grid = cellsIn(container);
            for (let r = 0; r < grid.length; r++) {
                const c = grid[r].indexOf(td as HTMLElement);
                if (c !== -1) {
                    posRef.current = { row: r, col: c };
                    return;
                }
            }
        };

        container.addEventListener('keydown', onKeyDown);
        container.addEventListener('focusin', onFocusIn);
        return () => {
            container.removeEventListener('keydown', onKeyDown);
            container.removeEventListener('focusin', onFocusIn);
        };
    }, [containerRef, enabled, cellsIn, focusCell]);

    // Seed the roving tabindex so Tab can reach the grid at all. Re-run when the row set
    // changes, since MRT replaces the cells and the attribute goes with them.
    useEffect(() => {
        const container = containerRef.current;
        if (!enabled || !container) return;
        const grid = cellsIn(container);
        const first = grid[0]?.[0];
        if (first && !container.querySelector('td[tabindex="0"]')) {
            first.setAttribute('tabindex', '0');
        }
    });
};
