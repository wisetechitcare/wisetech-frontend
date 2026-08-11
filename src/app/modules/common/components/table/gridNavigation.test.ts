import { describe, test, expect } from 'vitest';
import { nextCell, isMove, NAVIGATION_KEYS, PAGE_JUMP } from './gridNavigation';

const dims = { rowCount: 5, colCount: 4 }; // rows 0..4, cols 0..3
const at = (row: number, col: number) => ({ row, col });

describe('arrow movement', () => {
    test('moves one cell in each direction', () => {
        expect(nextCell(at(2, 2), 'ArrowUp', dims)).toEqual(at(1, 2));
        expect(nextCell(at(2, 2), 'ArrowDown', dims)).toEqual(at(3, 2));
        expect(nextCell(at(2, 2), 'ArrowLeft', dims)).toEqual(at(2, 1));
        expect(nextCell(at(2, 2), 'ArrowRight', dims)).toEqual(at(2, 3));
    });

    test('clamps at every edge instead of wrapping', () => {
        expect(nextCell(at(0, 2), 'ArrowUp', dims)).toEqual(at(0, 2));
        expect(nextCell(at(4, 2), 'ArrowDown', dims)).toEqual(at(4, 2));
        expect(nextCell(at(2, 0), 'ArrowLeft', dims)).toEqual(at(2, 0));
        expect(nextCell(at(2, 3), 'ArrowRight', dims)).toEqual(at(2, 3));
    });

    test('horizontal movement does NOT wrap to the adjacent row', () => {
        // Columns are fields of one record; wrapping would silently move the user to a
        // different record's field and lose their place.
        expect(nextCell(at(2, 3), 'ArrowRight', dims)).toEqual(at(2, 3));
        expect(nextCell(at(2, 0), 'ArrowLeft', dims)).toEqual(at(2, 0));
    });
});

describe('Home / End', () => {
    test('Home goes to the first cell of the current row', () => {
        expect(nextCell(at(3, 2), 'Home', dims)).toEqual(at(3, 0));
    });

    test('End goes to the last cell of the current row', () => {
        expect(nextCell(at(3, 1), 'End', dims)).toEqual(at(3, 3));
    });

    test('Ctrl+Home / Ctrl+End jump to the grid corners', () => {
        expect(nextCell(at(3, 2), 'Home', dims, { ctrl: true })).toEqual(at(0, 0));
        expect(nextCell(at(1, 1), 'End', dims, { ctrl: true })).toEqual(at(4, 3));
    });
});

describe('PageUp / PageDown', () => {
    test('jump by PAGE_JUMP rows, clamped', () => {
        const tall = { rowCount: 100, colCount: 4 };
        expect(nextCell(at(50, 1), 'PageDown', tall)).toEqual(at(50 + PAGE_JUMP, 1));
        expect(nextCell(at(50, 1), 'PageUp', tall)).toEqual(at(50 - PAGE_JUMP, 1));
    });

    test('clamp rather than overshoot near the ends', () => {
        expect(nextCell(at(1, 1), 'PageUp', dims)).toEqual(at(0, 1));
        expect(nextCell(at(3, 1), 'PageDown', dims)).toEqual(at(4, 1));
    });
});

describe('degenerate input', () => {
    test('an empty grid has nowhere to go', () => {
        const empty = { rowCount: 0, colCount: 0 };
        expect(nextCell(at(0, 0), 'ArrowDown', empty)).toEqual(at(0, 0));
        expect(nextCell(at(0, 0), 'End', empty, { ctrl: true })).toEqual(at(0, 0));
    });

    test('a position outside the grid is clamped back in', () => {
        // Can happen after a filter shrinks the row set under the focused cell.
        expect(nextCell(at(99, 99), 'ArrowUp', dims)).toEqual(at(3, 3));
    });

    test('unhandled keys leave the position unchanged', () => {
        expect(nextCell(at(2, 2), 'Enter', dims)).toEqual(at(2, 2));
        expect(nextCell(at(2, 2), 'a', dims)).toEqual(at(2, 2));
    });
});

describe('isMove — gates preventDefault', () => {
    test('true when the cell changes', () => {
        expect(isMove(at(1, 1), at(1, 2))).toBe(true);
    });

    test('false at an edge, so the key is NOT swallowed', () => {
        // Swallowing a key that did nothing would trap the user: arrows would stop
        // scrolling the page while also not moving the grid.
        const from = at(0, 0);
        expect(isMove(from, nextCell(from, 'ArrowUp', dims))).toBe(false);
    });
});

describe('NAVIGATION_KEYS', () => {
    test('covers exactly the keys nextCell handles', () => {
        for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']) {
            expect(NAVIGATION_KEYS.has(k)).toBe(true);
        }
    });

    test('does not claim keys the grid must let through', () => {
        // Tab must keep escaping the grid; Enter/Space belong to the focused control.
        for (const k of ['Tab', 'Enter', ' ', 'Escape']) {
            expect(NAVIGATION_KEYS.has(k)).toBe(false);
        }
    });
});
