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
/** Distance from a scroller's edge at which it starts following the pointer. */
const EDGE_PX = 72;
const EDGE_MAX_SPEED = 18;

/** DOM contracts — the engine finds elements by these rather than holding React refs. */
const ATTR_ID = 'data-sortable-id';
const ATTR_CONTAINER = 'data-sortable-container';
const ATTR_LIST = 'data-sortable-list';

interface SurfaceApi {
    surface: string;
    axis: SortableAxis;
    onItemPointerDown: (
        e: React.PointerEvent, id: string, containerId: string, handle?: string,
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
    children: ReactNode;
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
        flip(() => list.insertBefore(d.placeholder as HTMLElement, reference));
    }, [axis, flip, surface]);

    /** Follow the pointer when it nears the edge of a scrollable ancestor. */
    const autoScroll = useCallback(() => {
        const d = drag.current;
        if (!d?.started) return;
        d.scrollFrame = requestAnimationFrame(autoScroll);

        const { x, y } = d.point;
        let el = document.elementFromPoint(x, y) as HTMLElement | null;
        while (el) {
            const canX = el.scrollWidth > el.clientWidth;
            const canY = el.scrollHeight > el.clientHeight;
            if (canX || canY) {
                const r = el.getBoundingClientRect();
                if (canX) {
                    if (x - r.left < EDGE_PX) el.scrollLeft -= EDGE_MAX_SPEED * (1 - (x - r.left) / EDGE_PX);
                    else if (r.right - x < EDGE_PX) el.scrollLeft += EDGE_MAX_SPEED * (1 - (r.right - x) / EDGE_PX);
                }
                if (canY) {
                    if (y - r.top < EDGE_PX) el.scrollTop -= EDGE_MAX_SPEED * (1 - (y - r.top) / EDGE_PX);
                    else if (r.bottom - y < EDGE_PX) el.scrollTop += EDGE_MAX_SPEED * (1 - (r.bottom - y) / EDGE_PX);
                }
                break;
            }
            el = el.parentElement;
        }
    }, []);

    /** ── 2. THE SLOT ────────────────────────────────────────────────────── */
    const begin = useCallback(() => {
        const d = drag.current;
        if (!d) return;
        const rect = d.node.getBoundingClientRect();
        d.started = true;

        const ghost = d.node.cloneNode(true) as HTMLElement;
        ghost.removeAttribute(ATTR_ID);
        ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        Object.assign(ghost.style, {
            position: 'fixed',
            top: '0px',
            left: '0px',
            margin: '0',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
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

        const placeholder = document.createElement('div');
        placeholder.setAttribute('aria-hidden', 'true');
        Object.assign(placeholder.style, {
            height: `${rect.height}px`,
            width: axis === 'x' ? `${rect.width}px` : '',
            borderRadius: '10px',
            outline: '2px dashed rgba(128,128,128,.35)',
            outlineOffset: '-2px',
            background:
                'repeating-linear-gradient(100deg, rgba(128,128,128,.06) 0%, rgba(128,128,128,.16) 20%, rgba(128,128,128,.06) 40%)',
            backgroundSize: '200% 100%',
            animation: 'wt-sortable-shimmer 1.1s linear infinite',
            flexShrink: '0',
        });
        d.node.parentNode?.insertBefore(placeholder, d.node);
        d.placeholder = placeholder;

        // The real card stays MOUNTED — React still owns it — but takes no space while its
        // placeholder does. Unmounting it would hand React a subtree that disagrees with the DOM.
        d.node.style.display = 'none';

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
    ) => {
        if (e.button !== 0) return;
        // A press on something operable is not a drag — a card's ⋮ button must stay a button.
        if ((e.target as HTMLElement).closest('button,a,input,textarea,select,[role="menuitem"]')) return;

        const target = e.target as HTMLElement;

        // ── THE SAFE AREA ────────────────────────────────────────────────────
        // With a `handle`, only presses that begin inside it start this item. A lane is a
        // draggable that CONTAINS draggables, so without this, grabbing a card also grabbed the
        // whole column — the press bubbled up and both gestures began at once.
        if (handle && !target.closest(handle)) return;

        // And the other half of the same problem: once an item claims a press, no ancestor may
        // also claim it. The innermost draggable wins, which is what a person means when they
        // put the pointer on a card.
        e.stopPropagation();

        const node = e.currentTarget as HTMLElement;
        const rect = node.getBoundingClientRect();
        drag.current = {
            id, fromContainerId: containerId, pointerId: e.pointerId, node,
            ghost: null, placeholder: null,
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

    return (
        <SortableContext.Provider value={registry}>
            {children}
        </SortableContext.Provider>
    );
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
