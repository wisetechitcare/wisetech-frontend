/**
 * Trello-style sortable lists, on Pointer Events.
 *
 *     <SortableProvider surface="cards" axis="y" itemsByContainer={…} onDrop={…}>
 *       <SortableContainer surface="cards" id="todo">
 *         <SortableItem surface="cards" id="t-1" containerId="todo"> …card… </SortableItem>
 *
 * ─── WHY NOT PRAGMATIC / NATIVE DnD ──────────────────────────────────────────
 * This was built on `@atlaskit/pragmatic-drag-and-drop` first, and the drag PREVIEW is why it
 * came back off. Pragmatic is built on the browser's own drag-and-drop, so the BROWSER owns the
 * preview: `setCustomNativeDragPreview` hands you a node that is rasterised ONCE at drag start.
 * It cannot be moved per frame, cannot be rotated by drag velocity, and its offset from the
 * cursor is the platform's decision — which is why the card floated far from the pointer and no
 * amount of configuration brought it back.
 *
 * Pointer Events give up the library's polish (hit-testing, auto-scroll, cleanup — all ours now)
 * and buy the one thing that mattered: the preview is an ordinary element we position ourselves,
 * every frame. Touch support comes free with it, which native drag-and-drop never had.
 *
 * ─── THE FOUR MECHANICS ──────────────────────────────────────────────────────
 * 1. THE TILT — the card is cloned into a `position: fixed` ghost that follows the cursor with
 *    `translate3d(...) rotate(4deg)`. Four degrees is Trello's, and it is the signature. Extra
 *    tilt is added from horizontal velocity, clamped, so a fast flick leans into the movement.
 * 2. THE SLOT — the original is not removed; a placeholder of exactly its height takes its
 *    place, dashed and shimmering, so the list never collapses under the pointer.
 * 3. THE REFLOW — the dragged card is never animated; everything ELSE is, with FLIP: read every
 *    position, move the placeholder, read again, animate the delta. That is the difference
 *    between cards gliding aside and cards snapping.
 * 4. THE SETTLE — on release the ghost goes, the card returns to the slot, and a 140ms scale pop
 *    says it landed.
 *
 * ─── WHY THERE IS NO REACT STATE DURING A DRAG ───────────────────────────────
 * Not one `setState` runs between pointerdown and pointerup. The ghost is positioned by direct
 * DOM writes inside a rAF, and the placeholder is a DOM node this module owns. React therefore
 * never re-renders the list mid-gesture — which is what keeps a board of fifty cards at 60fps,
 * and what makes the imperative placeholder safe: React cannot reconcile a subtree it is not
 * being asked to re-render.
 */
import {
    createContext, useCallback, useContext, useEffect, useMemo, useRef,
    type ReactNode,
} from 'react';
import { Box } from '@mui/material';

/**
 * Fold the new order of the items ON SCREEN back into the whole list.
 *
 * A drop only ever reorders what was visible — a table pages, filters and hides columns, so the
 * items the pointer moved between are a subset of the list being stored. This walks the full
 * list and refills only the positions those items occupied, leaving everything hidden exactly
 * where it was.
 *
 * Position-based rather than slice-based on purpose: under a filter the visible items are not
 * contiguous in the full list, and splicing a block back in would drag the hidden ones between
 * them along for the ride.
 */
export const mergeVisibleOrder = (fullIds: string[], visibleOrder: string[]): string[] => {
    const visible = new Set(visibleOrder);
    let next = 0;
    return fullIds.map((id) => (visible.has(id) ? visibleOrder[next++] ?? id : id));
};

/** 'y' for a column of cards, 'x' for a row of lanes. */
export type SortableAxis = 'x' | 'y';

export interface SortableDrop {
    id: string;
    fromContainerId: string;
    toContainerId: string;
    /** Index within the destination, after removing the dragged id from wherever it was. */
    toIndex: number;
    /** The destination's ids in their new order, dragged id included. */
    order: string[];
    /** True when nothing actually moved — callers skip the network write. */
    unchanged: boolean;
}

/** Movement required before a press becomes a drag, so a click stays a click. */
const DRAG_THRESHOLD_PX = 5;
const FLIP_MS = 180;
const SETTLE_MS = 140;
const BASE_TILT_DEG = 4;
const MAX_VELOCITY_TILT_DEG = 6;
/**
 * Distance from a scroller's edge at which it starts following the pointer, and the top rate.
 *
 * Both raised for wide tables. A dozen columns is several thousand pixels, and crossing it at
 * the old 18px per frame was four seconds of holding a mouse button against a margin — which
 * reads as the drag having got stuck rather than as the table scrolling.
 */
const EDGE_PX = 110;
const EDGE_MAX_SPEED = 42;

/** DOM contracts — the engine finds elements by these rather than holding React refs. */
const ATTR_ID = 'data-sortable-id';
const ATTR_CONTAINER = 'data-sortable-container';
const ATTR_LIST = 'data-sortable-list';

/**
 * ─── TABLE ROWS ──────────────────────────────────────────────────────────────
 * A `<tr>` cannot be lifted out of its table the way a card can be lifted out of a div.
 *
 * THE GHOST: `position: fixed` blockifies whatever it is applied to, so a cloned row placed on
 * `document.body` stops being a row — its cells lose the table that was sizing them and collapse
 * to their content. The clone therefore travels inside a throwaway `<table>` carrying the
 * original's resolved column widths, which is the only thing that made those widths true.
 *
 * THE SLOT: a `<div>` between two `<tr>`s is not a row either; the table layout algorithm has
 * nowhere to put it. The slot is a real `<tr>` with one full-width `<td>`, so the gap the
 * pointer opens is a gap the table agrees exists.
 *
 * Everything else in this module is DOM-generic — `list.children`, `insertBefore`, rects — and
 * needed no branch.
 */
const isTableRow = (el: HTMLElement) => el.tagName === 'TR';
/** A header cell is the same problem one axis over: a `<th>` alone is not a column either. */
const isTableCell = (el: HTMLElement) => el.tagName === 'TH' || el.tagName === 'TD';

/** The slot styling, shared so a row's gap and a card's gap shimmer identically. */
const SLOT_STYLE = {
    borderRadius: '10px',
    outline: '2px dashed rgba(128,128,128,.35)',
    outlineOffset: '-2px',
    background:
        'repeating-linear-gradient(100deg, rgba(128,128,128,.06) 0%, rgba(128,128,128,.16) 20%, rgba(128,128,128,.06) 40%)',
    backgroundSize: '200% 100%',
    animation: 'wt-sortable-shimmer 1.1s linear infinite',
} as const;

/**
 * A row clone that still looks like a row: wrapped in its own table, with every column pinned
 * to the width it actually had on screen.
 */
const buildRowGhost = (row: HTMLElement, rect: DOMRect): HTMLElement => {
    const widths = Array.from(row.children).map(
        (cell) => (cell as HTMLElement).getBoundingClientRect().width,
    );
    const table = document.createElement('table');
    const body = document.createElement('tbody');
    const clone = row.cloneNode(true) as HTMLElement;
    Array.from(clone.children).forEach((cell, i) => {
        const el = cell as HTMLElement;
        el.style.width = `${widths[i]}px`;
        el.style.maxWidth = `${widths[i]}px`;
    });
    body.appendChild(clone);
    table.appendChild(body);
    // `fixed` so the widths above are obeyed rather than treated as suggestions, and an opaque
    // ground so the row does not show the page through itself while it is in the air.
    Object.assign(table.style, {
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: '0',
        width: `${rect.width}px`,
        background: getComputedStyle(row).backgroundColor || '#fff',
    });
    return table;
};

/**
 * Every cell of one column: the header, then that column's cell in each body row.
 *
 * `cellIndex` rather than a data attribute, because it is the browser's own answer to "which
 * column is this cell in" and it stays right through pinning and hidden columns, which a
 * rendered index does not.
 */
const columnCellsOf = (th: HTMLElement): HTMLElement[] => {
    const table = th.closest('table');
    const index = (th as HTMLTableCellElement).cellIndex;
    if (!table || index < 0) return [th];
    const rest = Array.from(table.rows)
        .map((row) => row.cells[index] as HTMLElement | undefined)
        .filter((cell): cell is HTMLElement => !!cell && cell !== th);
    // The dragged cell FIRST, always. Everything downstream treats [0] as the one the engine
    // already owns and the rest as the ones it has to take care of itself — and a table with a
    // filter sub-row in its head would otherwise put a different cell at the front.
    return [th, ...rest];
};

/** The nearest ancestor that actually scrolls, which is what bounds "visible" here. */
const scrollParentOf = (el: HTMLElement): HTMLElement | null => {
    let node = el.parentElement;
    while (node) {
        const { overflowX, overflowY } = getComputedStyle(node);
        if (/(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflowX)) return node;
        node = node.parentElement;
    }
    return null;
};

/**
 * The column as it looks on screen: the header, and the body cells you can actually see.
 *
 * ONLY THE VISIBLE ROWS. A page of a hundred rows would otherwise be cloned into a ghost taller
 * than the window, most of it off-screen, every frame — for a preview whose whole job is to show
 * what is travelling under the cursor. Clipped to the scroller's own rect, so the ghost is the
 * slice of the column the reader is looking at.
 */
const buildColumnGhost = (cells: HTMLElement[], rect: DOMRect): HTMLElement => {
    const [th, ...bodyCells] = cells;
    // The scroller AND the window: a table container taller than the viewport would otherwise
    // count rows below the fold as visible, which is the case this exists to avoid.
    const box = scrollParentOf(th)?.getBoundingClientRect();
    const top = Math.max(0, box?.top ?? 0);
    const bottom = Math.min(window.innerHeight, box?.bottom ?? window.innerHeight);
    const visible = bodyCells.filter((cell) => {
        const r = cell.getBoundingClientRect();
        return r.bottom > top && r.top < bottom;
    });

    const table = document.createElement('table');
    const head = document.createElement('thead');
    const body = document.createElement('tbody');

    const cloneInto = (parent: HTMLElement, cell: HTMLElement) => {
        const tr = document.createElement('tr');
        const clone = cell.cloneNode(true) as HTMLElement;
        const cellRect = cell.getBoundingClientRect();
        Object.assign(clone.style, {
            width: `${rect.width}px`,
            maxWidth: `${rect.width}px`,
            height: `${cellRect.height}px`,
            // The row's own tint travels with the cell, or the ghost is a column of white
            // boxes over a coloured table.
            background: getComputedStyle(cell.parentElement as HTMLElement).backgroundColor,
        });
        tr.appendChild(clone);
        parent.appendChild(tr);
    };

    cloneInto(head, th);
    visible.forEach((cell) => cloneInto(body, cell));
    table.appendChild(head);
    table.appendChild(body);
    Object.assign(table.style, {
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: '0',
        width: `${rect.width}px`,
        background: getComputedStyle(th).backgroundColor || '#fff',
        // Enough to read as "this is the column", not so much that it hides the table it is
        // being dropped into.
        opacity: '0.92',
    });
    return table;
};

/**
 * Put every body slot at the same position its header slot just moved to.
 *
 * This is what makes a column move as a COLUMN. The engine reorders one element — the header
 * slot — and every row has to follow it in the same step, inside the same FLIP read, or the
 * body would animate a frame behind the header and the two would visibly come apart.
 *
 * The index is counted in the header row and applied verbatim: every row has the same number of
 * cells, so the same index is the same column in all of them.
 */
const syncColumnSlots = (d: {
    placeholder: HTMLElement | null;
    columnSlots?: HTMLElement[];
}) => {
    const headSlot = d.placeholder;
    if (!headSlot?.parentElement || !d.columnSlots?.length) return;
    const index = Array.from(headSlot.parentElement.children).indexOf(headSlot);
    if (index < 0) return;
    for (const slot of d.columnSlots) {
        const row = slot.parentElement;
        if (!row) continue;
        // `children[index]` is read AFTER the slot is out of the way, so the index means the
        // same thing it did in the header row.
        const siblings = Array.from(row.children).filter((el) => el !== slot);
        row.insertBefore(slot, siblings[index] ?? null);
    }
};

/** A gap the table will honour: one cell of the column's width, per row. */
const buildColumnSlot = (cell: HTMLElement, width: number): HTMLElement => {
    const slot = document.createElement(cell.tagName === 'TH' ? 'th' : 'td');
    const r = cell.getBoundingClientRect();
    Object.assign(slot.style, {
        ...SLOT_STYLE,
        width: `${width}px`,
        minWidth: `${width}px`,
        height: `${r.height}px`,
        padding: '0',
    });
    slot.setAttribute('aria-hidden', 'true');
    return slot;
};

/** A slot the table will honour: one row, one cell spanning every column. */
const buildRowSlot = (row: HTMLElement, rect: DOMRect): HTMLElement => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = row.children.length || 1;
    Object.assign(td.style, { ...SLOT_STYLE, height: `${rect.height}px`, padding: '0' });
    tr.appendChild(td);
    return tr;
};

/** What a consumer spreads onto its own elements. See `useSortableProps`. */
export interface SortableProps {
    listProps: (containerId: string, disabled?: boolean) => Record<string, unknown>;
    /**
     * `handle` is a CSS selector for the region a drag may START in; `exclude` is one for
     * regions inside it that it may not.
     *
     * Both, because a safe area is not always a single contiguous shape. A table header is the
     * case: its content box is what you grab to move the column, and its resize grip lives
     * INSIDE that box — so a handle alone made the column draggable by stealing the resize.
     */
    itemProps: (
        id: string,
        containerId: string,
        opts?: { disabled?: boolean; handle?: string; exclude?: string },
    ) => Record<string, unknown>;
}

const buildSortableProps = (
    surface: string,
    onItemPointerDown: SurfaceApi['onItemPointerDown'],
): SortableProps => ({
    listProps: (containerId, disabled = false) => ({
        [ATTR_LIST]: surface,
        [ATTR_CONTAINER]: containerId,
        'data-sortable-disabled': disabled ? 'true' : undefined,
    }),
    itemProps: (id, containerId, opts = {}) => ({
        [ATTR_ID]: id,
        onPointerDown: opts.disabled
            ? undefined
            : (e: React.PointerEvent) => onItemPointerDown(e, id, containerId, opts.handle, opts.exclude),
        // Without this the browser claims the gesture for scrolling on touch before the first
        // pointermove ever arrives.
        style: { touchAction: opts.disabled ? 'auto' : 'none' } as React.CSSProperties,
    }),
});

interface SurfaceApi {
    surface: string;
    axis: SortableAxis;
    onItemPointerDown: (
        e: React.PointerEvent, id: string, containerId: string, handle?: string, exclude?: string,
    ) => void;
}

/**
 * A REGISTRY keyed by surface, not a single value: a board nests two sortable surfaces (lanes
 * contain cards), and a plain context would let the inner provider shadow the outer one.
 */
const SortableContext = createContext<Record<string, SurfaceApi>>({});

const useSurface = (surface: string) => {
    const api = useContext(SortableContext)[surface];
    if (!api) throw new Error(`No <SortableProvider surface="${surface}"> above this component`);
    return api;
};

export interface SortableProviderProps {
    /**
     * The surface, or a function receiving the props to spread onto your own elements.
     *
     * The function form exists for surfaces this module cannot render — a table, where nothing
     * may sit between `<tbody>` and `<tr>`. `useSortableProps` needs to be called BELOW the
     * provider, which would mean extracting the consumer into its own component just to have
     * somewhere to call a hook; this hands the same props down without that.
     */
    children: ReactNode | ((props: SortableProps) => ReactNode);
    /** The order each container holds. Read at drop time; never duplicated into this module. */
    itemsByContainer: Record<string, string[]>;
    onDrop: (drop: SortableDrop) => void;
    axis?: SortableAxis;
    /** Distinguishes surfaces on one page, so a lane is never droppable into a card list. */
    surface: string;
}

export const SortableProvider = ({
    children, itemsByContainer, onDrop, axis = 'y', surface,
}: SortableProviderProps) => {
    /** Live values for the pointer loop, without re-subscribing it on every render. */
    const itemsRef = useRef(itemsByContainer);
    itemsRef.current = itemsByContainer;
    const onDropRef = useRef(onDrop);
    onDropRef.current = onDrop;

    /** Everything about the gesture in flight. A ref, so moving the pointer renders nothing. */
    const drag = useRef<{
        id: string;
        fromContainerId: string;
        pointerId: number;
        /** The real card, kept mounted but hidden while its placeholder holds the space. */
        node: HTMLElement;
        ghost: HTMLElement | null;
        placeholder: HTMLElement | null;
        /** Column drags only: the header cell plus that column's cell in every body row. */
        columnCells?: HTMLElement[];
        /** The gap each of those leaves behind, in the same order. */
        columnSlots?: HTMLElement[];
        grabX: number;
        grabY: number;
        startX: number;
        startY: number;
        started: boolean;
        lastX: number;
        point: { x: number; y: number };
        /** One pending frame at most — pointermove fires faster than the screen refreshes. */
        frame: number | null;
        scrollFrame: number | null;
    } | null>(null);

    /** Handlers held in refs, so teardown detaches exactly what was attached. */
    const onMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
    const onUpRef = useRef<((e: PointerEvent) => void) | null>(null);
    const onCancelRef = useRef<(() => void) | null>(null);
    const onKeyRef = useRef<((e: KeyboardEvent) => void) | null>(null);

    /** ── 1. THE TILT ────────────────────────────────────────────────────── */
    const paintGhost = useCallback(() => {
        const d = drag.current;
        if (!d) return;
        d.frame = null;
        if (!d.ghost) return;

        // Velocity tilt: the ghost leans into a fast horizontal flick and levels off when the
        // pointer settles. Clamped, because past a few degrees it stops reading as momentum.
        const vx = d.point.x - d.lastX;
        d.lastX = d.point.x;
        const lean = Math.max(-MAX_VELOCITY_TILT_DEG, Math.min(MAX_VELOCITY_TILT_DEG, vx * 0.6));

        // translate3d, not top/left: a compositor-only property, so the preview never triggers
        // layout while it moves. The pointer stays exactly where it grabbed the card.
        d.ghost.style.transform =
            `translate3d(${d.point.x - d.grabX}px, ${d.point.y - d.grabY}px, 0) rotate(${BASE_TILT_DEG + lean}deg)`;
    }, []);

    const schedulePaint = useCallback(() => {
        const d = drag.current;
        if (!d || d.frame !== null) return;
        d.frame = requestAnimationFrame(paintGhost);
    }, [paintGhost]);

    /** ── 3. THE REFLOW ──────────────────────────────────────────────────── */
    const flip = useCallback((mutate: () => void) => {
        const lists = document.querySelectorAll<HTMLElement>(`[${ATTR_LIST}="${surface}"]`);
        const before = new Map<HTMLElement, DOMRect>();
        lists.forEach((list) => {
            Array.from(list.children).forEach((el) => {
                before.set(el as HTMLElement, (el as HTMLElement).getBoundingClientRect());
            });
        });

        mutate();

        lists.forEach((list) => {
            Array.from(list.children).forEach((node) => {
                const el = node as HTMLElement;
                const prev = before.get(el);
                if (!prev || el === drag.current?.node) return;
                const now = el.getBoundingClientRect();
                const dx = prev.left - now.left;
                const dy = prev.top - now.top;
                if (!dx && !dy) return;

                // Invert, then release: the element is put back where it was, then allowed to
                // transition to where it now is. Two frames — one write, one animate — because a
                // single rAF is coalesced with the write and the transition never runs.
                el.style.transition = 'none';
                el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.2,.8,.3,1)`;
                        el.style.transform = '';
                    });
                });
            });
        });
    }, [surface]);

    /** Where the placeholder should sit, given the pointer. Midpoints, like Trello. */
    const reposition = useCallback((x: number, y: number) => {
        const d = drag.current;
        if (!d?.placeholder) return;

        const under = document.elementFromPoint(x, y) as HTMLElement | null;
        const list = under?.closest<HTMLElement>(`[${ATTR_LIST}="${surface}"]`);
        if (!list || list.getAttribute('data-sortable-disabled') === 'true') return;

        const siblings = Array.from(list.children).filter(
            (el) => el !== d.placeholder && el !== d.node,
        ) as HTMLElement[];

        let reference: Node | null = null;
        for (const el of siblings) {
            const r = el.getBoundingClientRect();
            const mid = axis === 'y' ? r.top + r.height / 2 : r.left + r.width / 2;
            if ((axis === 'y' ? y : x) < mid) { reference = el; break; }
        }

        // Nothing to do — and this check is what keeps FLIP from running on every frame.
        if (d.placeholder.parentNode === list && d.placeholder.nextSibling === reference) return;
        flip(() => {
            list.insertBefore(d.placeholder as HTMLElement, reference);
            syncColumnSlots(d);
        });
    }, [axis, flip, surface]);

    /**
     * Follow the pointer when it nears the edge of a scrollable ancestor.
     *
     * ─── THE AXIS DECIDES WHICH ANCESTOR ─────────────────────────────────
     * This used to take the first ancestor that could scroll in EITHER direction and stop
     * there. Dragging a column across a wide table, that was often a vertically-scrolling
     * ancestor which could not move sideways at all — so the run to the far end scrolled
     * nothing, and the only way across was to drop, scroll by hand, and pick the column up
     * again. Now the search is for a scroller on the axis being dragged, and it keeps
     * climbing until it finds one.
     *
     * ─── AND IT ACCELERATES ──────────────────────────────────────────────
     * A flat speed makes a long table a waiting game: the far edge of a dozen columns took
     * seconds of holding still at the margin. The rate now eases in quadratically across a
     * wider margin, so a nudge past the edge creeps and a firm push past it runs — and the
     * pointer held OUTSIDE the scroller keeps the maximum rather than stopping, which is
     * where a hand naturally goes when it wants to keep moving.
     */
    const autoScroll = useCallback(() => {
        const d = drag.current;
        if (!d?.started) return;
        d.scrollFrame = requestAnimationFrame(autoScroll);

        const { x, y } = d.point;
        const wantX = axis === 'x';

        let el = document.elementFromPoint(x, y) as HTMLElement | null;
        while (el) {
            const canScroll = wantX
                ? el.scrollWidth > el.clientWidth
                : el.scrollHeight > el.clientHeight;
            if (canScroll) break;
            el = el.parentElement;
        }
        if (!el) return;

        const r = el.getBoundingClientRect();
        // 0 at the edge zone's inner boundary, 1 at the edge, and >1 once the pointer is past
        // it — clamped, so leaving the window scrolls fast rather than infinitely.
        const ramp = (distance: number) => Math.min(1, Math.max(0, 1 - distance / EDGE_PX)) ** 2;

        if (wantX) {
            const fromLeft = x - r.left;
            const fromRight = r.right - x;
            if (fromLeft < EDGE_PX) el.scrollLeft -= EDGE_MAX_SPEED * ramp(fromLeft);
            else if (fromRight < EDGE_PX) el.scrollLeft += EDGE_MAX_SPEED * ramp(fromRight);
        } else {
            const fromTop = y - r.top;
            const fromBottom = r.bottom - y;
            if (fromTop < EDGE_PX) el.scrollTop -= EDGE_MAX_SPEED * ramp(fromTop);
            else if (fromBottom < EDGE_PX) el.scrollTop += EDGE_MAX_SPEED * ramp(fromBottom);
        }
    }, [axis]);

    /** ── 2. THE SLOT ────────────────────────────────────────────────────── */
    const begin = useCallback(() => {
        const d = drag.current;
        if (!d) return;
        const rect = d.node.getBoundingClientRect();
        d.started = true;

        const row = isTableRow(d.node);
        const cell = isTableCell(d.node);
        // A header cell IS a column: the whole thing travels, not the label off the top of it.
        // Hiding only the `<th>` reordered the header while the body sat still, so mid-drag the
        // table's own header disagreed with the data underneath it.
        if (cell) d.columnCells = columnCellsOf(d.node);
        const ghost = row
            ? buildRowGhost(d.node, rect)
            : cell
                ? buildColumnGhost(d.columnCells ?? [d.node], rect)
                : (d.node.cloneNode(true) as HTMLElement);
        ghost.removeAttribute(ATTR_ID);
        ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        ghost.querySelectorAll(`[${ATTR_ID}]`).forEach((n) => n.removeAttribute(ATTR_ID));
        Object.assign(ghost.style, {
            position: 'fixed',
            top: '0px',
            left: '0px',
            margin: '0',
            width: `${rect.width}px`,
            // A column ghost is as tall as the slice of the column it holds; only the fixed-size
            // kinds get their height pinned.
            ...(cell ? {} : { height: `${rect.height}px` }),
            pointerEvents: 'none',
            zIndex: '2400',
            opacity: '1',
            willChange: 'transform',
            transition: 'none',
            boxShadow: '0 12px 24px rgba(0,0,0,.35), 0 4px 8px rgba(0,0,0,.25)',
        });
        ghost.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ghost);
        d.ghost = ghost;

        const placeholder = row
            ? buildRowSlot(d.node, rect)
            : cell
                ? buildColumnSlot(d.node, rect.width)
                : document.createElement('div');
        placeholder.setAttribute('aria-hidden', 'true');
        if (!row && !cell) {
            Object.assign(placeholder.style, {
                ...SLOT_STYLE,
                height: `${rect.height}px`,
                width: axis === 'x' ? `${rect.width}px` : '',
                flexShrink: '0',
            });
        }
        d.node.parentNode?.insertBefore(placeholder, d.node);
        d.placeholder = placeholder;

        // The real card stays MOUNTED — React still owns it — but takes no space while its
        // placeholder does. Unmounting it would hand React a subtree that disagrees with the DOM.
        d.node.style.display = 'none';

        // …and for a column, every OTHER cell of it gets the same treatment, so the gap the
        // pointer opens runs the full height of the table rather than stopping at the header.
        if (d.columnCells) {
            d.columnSlots = d.columnCells.slice(1).map((bodyCell) => {
                const slot = buildColumnSlot(bodyCell, rect.width);
                bodyCell.parentNode?.insertBefore(slot, bodyCell);
                bodyCell.style.display = 'none';
                return slot;
            });
        }

        // Nothing may be selected while a drag is under way. Pointer Events do not suppress
        // selection the way native drag-and-drop did, so without this a drag across the board
        // paints half of it blue — and on release the browser keeps that selection. Set on the
        // document, because the pointer travels far outside the card that started the gesture.
        document.body.style.userSelect = 'none';
        (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none';
        document.body.style.cursor = 'grabbing';

        paintGhost();
        d.scrollFrame = requestAnimationFrame(autoScroll);
    }, [autoScroll, axis, paintGhost]);

    /** ── 4. THE SETTLE ──────────────────────────────────────────────────── */
    const finish = useCallback((commit: boolean) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;

        if (d.frame !== null) cancelAnimationFrame(d.frame);
        if (d.scrollFrame !== null) cancelAnimationFrame(d.scrollFrame);
        if (onMoveRef.current) window.removeEventListener('pointermove', onMoveRef.current);
        if (onUpRef.current) window.removeEventListener('pointerup', onUpRef.current);
        if (onCancelRef.current) window.removeEventListener('pointercancel', onCancelRef.current);
        if (onKeyRef.current) window.removeEventListener('keydown', onKeyRef.current);

        if (!d.started) return;

        // Read the destination from the DOM the user was looking at, not from accumulated state.
        const list = d.placeholder?.parentElement ?? null;
        const toContainerId = list?.getAttribute(ATTR_CONTAINER) ?? d.fromContainerId;
        const ids = (itemsRef.current[toContainerId] ?? []).filter((id) => id !== d.id);

        let toIndex = ids.length;
        if (list && d.placeholder) {
            const children = Array.from(list.children);
            toIndex = children
                .slice(0, children.indexOf(d.placeholder))
                .filter((el) => (el as HTMLElement).hasAttribute(ATTR_ID) && el !== d.node)
                .length;
        }

        // ── HAND THE DOM BACK EXACTLY AS REACT LEFT IT ───────────────────────
        // This used to `placeholder.replaceWith(node)`, which MOVED a React-owned element into a
        // different parent. React then re-rendered, tried to remove that element from the parent
        // it still believed owned it, and threw:
        //
        //     Failed to execute 'removeChild' on 'Node': the node to be removed is not a child
        //
        // The rule this now follows: the engine may only move nodes it created. The placeholder
        // is ours, so it goes. The card is React's, so it is merely un-hidden where it has been
        // all along, and the reorder is expressed the only way it safely can be — as a state
        // change the caller makes, which React then renders itself.
        d.placeholder?.remove();
        d.node.style.display = '';
        d.ghost?.remove();
        // Same rule as the card: the engine only removes nodes it created, and only un-hides
        // what it hid. The reorder itself is expressed as a state change the caller makes.
        d.columnSlots?.forEach((slot) => slot.remove());
        d.columnCells?.forEach((c) => { c.style.display = ''; });

        document.body.style.userSelect = '';
        (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = '';
        document.body.style.cursor = '';
        // A selection made in the frames before the threshold was crossed would otherwise be
        // left highlighted behind the dropped card.
        window.getSelection?.()?.removeAllRanges();

        // FLIP leaves inline transforms on whatever it animated; clearing them stops a stale
        // offset surviving into the next render.
        document.querySelectorAll<HTMLElement>(`[${ATTR_LIST}="${surface}"]`).forEach((list) => {
            Array.from(list.children).forEach((node) => {
                const el = node as HTMLElement;
                el.style.transition = '';
                el.style.transform = '';
            });
        });

        d.node.animate(
            [{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
            { duration: SETTLE_MS, easing: 'ease-out' },
        );

        if (!commit) return;

        const order = [...ids];
        order.splice(toIndex, 0, d.id);
        const source = itemsRef.current[d.fromContainerId] ?? [];
        const unchanged = d.fromContainerId === toContainerId
            && source.length === order.length
            && source.every((id, i) => id === order[i]);

        onDropRef.current({
            id: d.id,
            fromContainerId: d.fromContainerId,
            toContainerId,
            toIndex,
            order,
            unchanged,
        });
    }, [surface]);

    const onItemPointerDown = useCallback((
        e: React.PointerEvent,
        id: string,
        containerId: string,
        handle?: string,
        exclude?: string,
    ) => {
        if (e.button !== 0) return;
        // A press on something operable is not a drag — a card's ⋮ button must stay a button.
        //
        // `[role="button"]` and `[contenteditable]` are here for surfaces whose controls are not
        // literal form elements: a table row is draggable as a whole, and the click-to-edit cell
        // inside it is a span that declares itself a button. Anything that says it is operable
        // is taken at its word rather than each surface having to pass a `handle`.
        if ((e.target as HTMLElement).closest(
            'button,a,input,textarea,select,[role="menuitem"],[role="button"],[contenteditable="true"]',
        )) return;

        const target = e.target as HTMLElement;

        // ── THE SAFE AREA ────────────────────────────────────────────────────
        // With a `handle`, only presses that begin inside it start this item. A lane is a
        // draggable that CONTAINS draggables, so without this, grabbing a card also grabbed the
        // whole column — the press bubbled up and both gestures began at once.
        if (handle && !target.closest(handle)) return;

        // …and the holes in it. A resize grip sits INSIDE the header's content box, so the
        // handle alone would have made grabbing the grip move the column instead of resizing
        // it — two gestures competing for one pixel, with the wrong one winning.
        if (exclude && target.closest(exclude)) return;

        // And the other half of the same problem: once an item claims a press, no ancestor may
        // also claim it. The innermost draggable wins, which is what a person means when they
        // put the pointer on a card.
        e.stopPropagation();

        const node = e.currentTarget as HTMLElement;
        const rect = node.getBoundingClientRect();
        drag.current = {
            id, fromContainerId: containerId, pointerId: e.pointerId, node,
            ghost: null, placeholder: null,
            columnCells: undefined, columnSlots: undefined,
            grabX: e.clientX - rect.left,
            grabY: e.clientY - rect.top,
            startX: e.clientX, startY: e.clientY,
            started: false,
            lastX: e.clientX,
            point: { x: e.clientX, y: e.clientY },
            frame: null, scrollFrame: null,
        };

        const onMove = (ev: PointerEvent) => {
            const d = drag.current;
            if (!d || ev.pointerId !== d.pointerId) return;
            d.point = { x: ev.clientX, y: ev.clientY };

            if (!d.started) {
                if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
                begin();
            }
            schedulePaint();
            reposition(ev.clientX, ev.clientY);
        };
        const onUp = (ev: PointerEvent) => {
            if (drag.current && ev.pointerId !== drag.current.pointerId) return;
            finish(true);
        };
        const onCancel = () => finish(false);
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') finish(false); };

        onMoveRef.current = onMove;
        onUpRef.current = onUp;
        onCancelRef.current = onCancel;
        onKeyRef.current = onKey;

        // On window, so a drag that outruns the element still tracks. `passive` because nothing
        // here calls preventDefault — `touch-action: none` on the item stops the page scrolling.
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    }, [begin, finish, reposition, schedulePaint]);

    // A drag left running when the surface unmounts would leak a ghost onto the page.
    useEffect(() => () => { if (drag.current) finish(false); }, [finish]);

    const parent = useContext(SortableContext);
    const registry = useMemo(
        () => ({ ...parent, [surface]: { surface, axis, onItemPointerDown } }),
        [parent, surface, axis, onItemPointerDown],
    );

    const rendered = typeof children === 'function'
        ? children(buildSortableProps(surface, onItemPointerDown))
        : children;

    return (
        <SortableContext.Provider value={registry}>
            {rendered}
        </SortableContext.Provider>
    );
};

/**
 * The same wiring as `SortableContainer` / `SortableItem`, as plain props to spread.
 *
 * For surfaces whose elements this module cannot render. A table is the case that forced it:
 * nothing may sit between `<tbody>` and `<tr>`, so there is no element for a `<Box>` to be —
 * but the engine only ever wanted three data attributes and a pointer handler, and those can
 * go onto a `<tr>` as easily as onto a div.
 *
 * Deliberately the SAME registry and the same handler as the components above: a second code
 * path for tables is how the tilt, the slot and the settle would drift apart between one
 * surface and the next.
 */
export const useSortableProps = (surface: string): SortableProps => {
    const { onItemPointerDown } = useSurface(surface);
    return useMemo(() => buildSortableProps(surface, onItemPointerDown), [surface, onItemPointerDown]);
};

export interface SortableContainerProps {
    id: string;
    surface: string;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    sx?: object;
}

/**
 * A list that can receive items.
 *
 * It holds no drag state and no handlers: the engine finds it through its data attributes while
 * the pointer moves, which is why dragging over a lane costs this component nothing at all.
 */
export const SortableContainer = ({
    id, surface, children, className, disabled = false, sx,
}: SortableContainerProps) => {
    useSurface(surface);
    return (
        <Box
            className={className}
            {...{ [ATTR_LIST]: surface, [ATTR_CONTAINER]: id }}
            data-sortable-disabled={disabled ? 'true' : undefined}
            sx={sx}
        >
            {children}
        </Box>
    );
};

export interface SortableItemProps {
    id: string;
    containerId: string;
    surface: string;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
    sx?: object;
    /**
     * CSS selector for the region a drag may START in — the item's safe area.
     *
     * Omit it and the whole item is grabbable, which is right for a card. Give it (a lane's
     * header, say) and a press anywhere else inside the item is left alone, which is the only
     * way a draggable that CONTAINS draggables can behave predictably.
     */
    handle?: string;
    /** Accepted for API compatibility; the ghost is a clone, so no separate preview is needed. */
    preview?: ReactNode;
}

export const SortableItem = ({
    id, containerId, surface, children, disabled = false, className, handle, sx,
}: SortableItemProps) => {
    const { onItemPointerDown } = useSurface(surface);
    const grabbable = !disabled;

    // `touch-action: none` is what makes this work on a phone: without it the browser claims the
    // gesture for scrolling before the first pointermove arrives. Scoped to the HANDLE when
    // there is one, so the rest of a lane still scrolls normally under a finger.
    const grabSx = {
        touchAction: grabbable ? 'none' : 'auto',
        cursor: grabbable ? 'grab' : 'default',
        '&:active': { cursor: grabbable ? 'grabbing' : 'default' },
    };

    return (
        <Box
            className={className}
            {...{ [ATTR_ID]: id }}
            onPointerDown={grabbable ? (e) => onItemPointerDown(e, id, containerId, handle) : undefined}
            sx={{
                ...(handle ? { [`& ${handle}`]: grabSx } : grabSx),
                ...sx,
            }}
        >
            {children}
        </Box>
    );
};

/**
 * ─── ACCESSIBILITY ───────────────────────────────────────────────────────────
 * DOES: keeps DOM order and list semantics (the visual reorder is one imperative placeholder;
 * the real order changes only when the caller's state does); keeps cards in the tab order; never
 * swallows a click (under 5px of travel it IS a click); Escape cancels a drag in flight; and
 * mouse, touch and pen all work from one code path.
 *
 * DOES NOT: no keyboard drag (space-lift / arrow-move / space-drop) — the ⋮ menu on each card
 * remains the pointer-free path, which is why it was kept; no `aria-live` narration of the
 * insertion point, which is the highest-value thing to add next; and no `prefers-reduced-motion`
 * branch on the tilt, FLIP or settle.
 */
