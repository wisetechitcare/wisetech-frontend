/**
 * Row identity and selection resolution for the table engine.
 *
 * Extracted from MaterialTableImpl so it can be tested. This is small logic with a nasty
 * failure mode: MRT tracks selection as a map of ROW ID -> boolean, and the engine has to
 * turn that back into row objects. If the id function used here ever diverges from the one
 * handed to MRT's `getRowId`, the keys stop matching and the selection resolves to an
 * EMPTY array — the checkbox still ticks, and every bulk action silently does nothing.
 * "Nothing happened" is the hardest kind of bug to notice, so it gets a test.
 */

/**
 * A row's identity. Falls back to the index for rows without an `id`, which is what MRT
 * does by default and what the engine passes as `getRowId`.
 *
 * MUST stay identical to the `getRowId` prop in MaterialTableImpl.
 */
export const rowId = (row: any, index: number): string =>
    row?.id ? String(row.id) : String(index);

/**
 * Resolve MRT's selection map back to the row objects it refers to.
 *
 * Only rows present in `rows` can come back: a row that has been filtered or paged away is
 * dropped rather than resurrected. That is deliberate — exporting or acting on rows the
 * user can no longer see is worse than the selection appearing to shrink.
 */
export const resolveSelectedRows = <T,>(
    rows: T[],
    selection: Record<string, boolean>,
): T[] => {
    const selectedKeys = Object.keys(selection).filter((k) => selection[k]);
    if (selectedKeys.length === 0) return [];
    const keySet = new Set(selectedKeys);
    return rows.filter((row, index) => keySet.has(rowId(row, index)));
};

/**
 * Stable signature of a selection, for change detection.
 *
 * Compared instead of object identity because the row array gets a fresh reference on
 * every filter/sort pass — notifying on identity would re-fire the consuming page's
 * effects on every keystroke.
 */
export const selectionSignature = (rows: any[]): string =>
    rows.map((r, i) => rowId(r, i)).join(',');
