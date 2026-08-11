import { describe, test, expect } from 'vitest';
import { rowId, resolveSelectedRows, selectionSignature } from './rowSelection';

// The failure this guards against is silent: if row identity diverges from MRT's
// getRowId, selection resolves to [] — the checkbox ticks and every bulk action does
// nothing. So the emphasis is on identity agreement and on "selected but absent".

describe('rowId', () => {
    test('uses row.id when present', () => {
        expect(rowId({ id: 'emp-1' }, 0)).toBe('emp-1');
    });

    test('stringifies non-string ids — MRT keys its selection map by string', () => {
        expect(rowId({ id: 42 }, 0)).toBe('42');
    });

    test('falls back to index when there is no id', () => {
        expect(rowId({ name: 'no id' }, 3)).toBe('3');
        expect(rowId({}, 0)).toBe('0');
    });

    test('treats falsy ids as absent and falls back to index', () => {
        // id: 0 and id: '' are falsy; the engine's getRowId does the same, so these must
        // agree or the keys diverge for exactly those rows.
        expect(rowId({ id: 0 }, 7)).toBe('7');
        expect(rowId({ id: '' }, 7)).toBe('7');
    });

    test('survives null/undefined rows', () => {
        expect(rowId(null, 2)).toBe('2');
        expect(rowId(undefined, 5)).toBe('5');
    });
});

describe('resolveSelectedRows', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

    test('returns the rows the map refers to', () => {
        expect(resolveSelectedRows(rows, { a: true, c: true })).toEqual([{ id: 'a' }, { id: 'c' }]);
    });

    test('ignores keys explicitly set false', () => {
        expect(resolveSelectedRows(rows, { a: true, b: false })).toEqual([{ id: 'a' }]);
    });

    test('empty selection resolves to nothing', () => {
        expect(resolveSelectedRows(rows, {})).toEqual([]);
        expect(resolveSelectedRows(rows, { a: false })).toEqual([]);
    });

    test('DROPS rows that are selected but no longer present', () => {
        // Selected, then filtered away. Acting on rows the user cannot see is worse than
        // the selection appearing to shrink.
        expect(resolveSelectedRows([{ id: 'a' }], { a: true, b: true })).toEqual([{ id: 'a' }]);
    });

    test('preserves row order, not selection-map order', () => {
        expect(resolveSelectedRows(rows, { c: true, a: true })).toEqual([{ id: 'a' }, { id: 'c' }]);
    });

    test('works for id-less rows via index', () => {
        const anon = [{ n: 0 }, { n: 1 }, { n: 2 }];
        expect(resolveSelectedRows(anon, { '1': true })).toEqual([{ n: 1 }]);
    });

    test('a stale index key cannot resurrect a removed row', () => {
        const anon = [{ n: 0 }];
        expect(resolveSelectedRows(anon, { '5': true })).toEqual([]);
    });
});

describe('selectionSignature', () => {
    test('is stable across new array references with the same rows', () => {
        expect(selectionSignature([{ id: 'a' }, { id: 'b' }])).toBe(
            selectionSignature([{ id: 'a' }, { id: 'b' }]),
        );
    });

    test('changes when the selection changes', () => {
        expect(selectionSignature([{ id: 'a' }])).not.toBe(selectionSignature([{ id: 'a' }, { id: 'b' }]));
    });

    test('empty selection has an empty signature', () => {
        expect(selectionSignature([])).toBe('');
    });
});
