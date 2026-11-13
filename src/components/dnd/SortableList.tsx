/**
 * The app's entry to the drag-and-drop engine. The engine itself lives in the design system
 * (src/ds/lib/sortable.tsx) so the kit DataTable shares it; this file re-exports it and keeps the two MUI
 * convenience wrappers (`SortableContainer`, `SortableItem`) for app surfaces such as the Task board.
 */
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { ATTR_CONTAINER, ATTR_ID, ATTR_LIST, useSortableSurface } from '@/ds/lib/sortable';

export * from '@/ds/lib/sortable';

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
    useSortableSurface(surface);
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
    const { onItemPointerDown } = useSortableSurface(surface);
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
