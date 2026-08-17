/**
 * Arrow-key movement for the table grid.
 *
 * material-react-table ships no keyboard support (checked 2.13.3), so a keyboard user
 * currently cannot move through the table at all — they tab through every interactive
 * element in the page in DOM order, which for a wide grid is hundreds of stops.
 *
 * The movement maths lives here, separate from the DOM, because it is the part with edge
 * cases: clamping at boundaries, wrapping between rows, and Home/End meaning
 * row-relative vs grid-absolute depending on Ctrl. The hook that consumes this only has
 * to find elements and call focus().
 */

export interface CellPosition {
    row: number;
    col: number;
}

export interface GridDimensions {
    rowCount: number;
    colCount: number;
}

/** Keys this grid handles. Anything else must fall through to the browser. */
export const NAVIGATION_KEYS = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
]);

/** How many rows a PageUp/PageDown moves. Matches typical grid behaviour. */
export const PAGE_JUMP = 10;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Where the focus should go next.
 *
 * Returns the SAME position when the move is impossible (already at an edge), which the
 * caller uses to decide whether to preventDefault — swallowing a key that did nothing
 * would trap the user, since they could no longer scroll the page with arrows.
 *
 * Horizontal movement deliberately does NOT wrap to the next row: in a data grid the
 * columns are fields of one record, and silently jumping to another record's first field
 * loses the user's place.
 */
export const nextCell = (
    pos: CellPosition,
    key: string,
    dims: GridDimensions,
    opts: { ctrl?: boolean } = {},
): CellPosition => {
    const maxRow = Math.max(0, dims.rowCount - 1);
    const maxCol = Math.max(0, dims.colCount - 1);

    // An empty grid has nowhere to go.
    if (dims.rowCount === 0 || dims.colCount === 0) return pos;

    const row = clamp(pos.row, 0, maxRow);
    const col = clamp(pos.col, 0, maxCol);

    switch (key) {
        case 'ArrowUp':
            return { row: clamp(row - 1, 0, maxRow), col };
        case 'ArrowDown':
            return { row: clamp(row + 1, 0, maxRow), col };
        case 'ArrowLeft':
            return { row, col: clamp(col - 1, 0, maxCol) };
        case 'ArrowRight':
            return { row, col: clamp(col + 1, 0, maxCol) };
        case 'PageUp':
            return { row: clamp(row - PAGE_JUMP, 0, maxRow), col };
        case 'PageDown':
            return { row: clamp(row + PAGE_JUMP, 0, maxRow), col };
        case 'Home':
            // Ctrl+Home = first cell of the grid; Home = first cell of this row.
            return opts.ctrl ? { row: 0, col: 0 } : { row, col: 0 };
        case 'End':
            return opts.ctrl ? { row: maxRow, col: maxCol } : { row, col: maxCol };
        default:
            return { row, col };
    }
};

/** True when the move would actually change cell — used to gate preventDefault. */
export const isMove = (from: CellPosition, to: CellPosition): boolean =>
    from.row !== to.row || from.col !== to.col;
