/**
 * The Kanban board (Phase 4 §3, §4).
 *
 * Columns ARE the configured stages, in `TaskStatus.sortOrder` — never database insertion order,
 * and never a hardcoded list. Adding a stage in Configure adds a column here with no code change.
 *
 * ### Drag and drop
 *
 * Native HTML5 DnD, no library. The only gesture a board needs is "move this card to that
 * column", and that is exactly what the API models (`PUT /task/:taskId/status`). Within-column
 * ordering is deliberately not offered: there is no column to store it in, and a reorder that
 * silently vanished on refresh would be worse than not having it.
 *
 * The move is optimistic, then reconciled:
 *
 *     drag → card moves locally → API → success: invalidate and refetch
 *                                     → failure: card returns to its column + the server's own
 *                                                reason is shown
 *
 * A rejected move must never leave the card in the new column — that would show the user a
 * state the server does not hold.
 *
 * Touch devices get a per-card stage menu, because HTML5 DnD does not fire on touch.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Chip, GlobalStyles, Menu, MenuItem, Stack, TextField, Tooltip, Typography,
    alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { confirmDialog, toast } from '@app/modules/common/components/ui';
import { TaskRow, TaskStatusRef, apiErrorMessage } from '../taskDomain';
import {
    SortableProvider, SortableContainer, SortableItem, type SortableDrop,
} from '@components/dnd/SortableList';
import { TaskCard } from './TaskCard';
import { TaskStateBlock } from './primitives';

export interface BoardColumn {
    status: TaskStatusRef & { isActive?: boolean };
    total: number;
    hasMore: boolean;
    tasks: TaskRow[];
}

export interface TaskBoardProps {
    columns: BoardColumn[];
    now: Date;
    onOpenTask: (taskId: string) => void;
    onMoveTask: (taskId: string, statusId: string) => Promise<unknown>;
    /** "+" on a column header — creates a task already in that stage. */
    onAddInStage?: (statusId: string) => void;
    /**
     * Create a new lane. Present only where a lane can actually be added — i.e. with a project
     * selected. Omitted (rather than disabled) otherwise: an "Add another list" that always
     * refuses is worse than no button.
     *
     * `applyToAll` is the scope the composer asked for: false → a lane this project owns, true →
     * a company-wide stage that appears on every board. The board states the choice; the caller
     * turns it into a request, and the server re-checks who may make it.
     */
    onCreateList?: (name: string, applyToAll: boolean) => Promise<unknown>;
    /**
     * May this user create the company-wide kind? Gated on the same permission as Tasks ▸
     * Configure. False hides the choice entirely rather than disabling it — an option you can
     * see but never pick only invites the question of why.
     */
    canCreateGlobalList?: boolean;
    /**
     * Remove a lane. Offered ONLY on lanes this project owns (`status.leadId`) — a company-wide
     * stage appears on every board in the company, so removing one is a Configure decision made
     * with the whole set in view, not a × on somebody's project board.
     */
    onDeleteList?: (statusId: string, name: string) => Promise<unknown>;
    /**
     * Persist a lane's card order, top to bottom. Given, a drop lands BETWEEN two cards; omitted,
     * a drop only changes lane and the order is the server's. The board never pretends to an
     * ordering it cannot store — a hand-arranged lane that sprang back on refresh would be worse
     * than one that never claimed to be arrangeable.
     */
    onReorder?: (statusId: string, taskIds: string[]) => Promise<unknown>;
    /**
     * Persist the LANE order, left to right. Given, the lanes themselves can be dragged by their
     * headers; omitted, they stay in the order the server sent — the board never offers a
     * rearrangement it cannot remember.
     */
    onReorderLanes?: (statusIds: string[]) => Promise<unknown>;
    isLoading?: boolean;
    /**
     * How to draw the few marks that sit on the BACKDROP rather than on a card — currently the
     * horizontal scrollbar. The backdrop is user-chosen, so its contrast cannot be inferred from
     * the app's theme mode: a light theme can be showing a midnight board.
     */
    ink?: 'light' | 'dark';
}

/**
 * The two kinds of list, in the words that describe what actually happens to them.
 *
 * Declared out here because the composer should read as ONE decision with two answers, not as
 * two independently-styled rows that happen to sit together — and because the wording is the
 * feature: "All projects" without "every project board in the company" is a choice made blind.
 */
const SCOPE_CHOICES = [
    {
        all: false,
        icon: 'office-bag',
        title: 'This project only',
        description: 'Appears on this board, and can be removed here.',
    },
    {
        all: true,
        icon: 'grid-2',
        title: 'All projects',
        description: 'Appears on every project board in the company.',
    },
] as const;

/** Tasks with no stage live in a synthetic column the server emits; it cannot receive drops. */
const UNASSIGNED = '__unassigned__';

/** The single container the LANES live in — a board has one row of them. */
const LANE_ROW = 'board-lane-row';
/** Surface names, so a lane can never be dropped into a card list or vice versa. */
const CARD_SURFACE = 'board-cards';
const LANE_SURFACE = 'board-lanes';

export const TaskBoard = ({
    columns, now, onOpenTask, onMoveTask, onAddInStage, onCreateList, onDeleteList, onReorder,
    onReorderLanes, canCreateGlobalList = false, isLoading, ink = 'light',
}: TaskBoardProps) => {
    const theme = useTheme();
    /** Optimistic overrides: taskId → statusId. Cleared once the server answers. */
    const [pending, setPending] = useState<Record<string, string>>({});
    /** Optimistic lane orders: statusId → task ids. Cleared once the server answers. */
    const [pendingOrder, setPendingOrder] = useState<Record<string, string[]>>({});
    const [menu, setMenu] = useState<{ anchor: HTMLElement; task: TaskRow } | null>(null);
    /** The trailing "Add another list" lane, in its two states. */
    const [composing, setComposing] = useState(false);
    const [listName, setListName] = useState('');
    const [creating, setCreating] = useState(false);
    /** Scope of the lane being composed. Project-only is the default — the safe, local choice. */
    const [applyToAll, setApplyToAll] = useState(false);

    /**
     * Lane drag — a SECOND drag gesture on the same board as the card drag.
     *
     * The two are kept apart by where they start: a lane moves only when the drag begins on its
     * header handle, and a card only when it begins on the card. Without that, picking up a card
     * near the top of a lane would sometimes take the whole lane with it — the classic failure of
     * nesting two draggables.
     *
     * `laneOrder` is an OPTIMISTIC arrangement, cleared once the server's own order arrives, for
     * the same reason card moves are optimistic: a lane that snaps back for 300ms while a request
     * flies reads as the drop having failed.
     */
    const [laneOrder, setLaneOrder] = useState<string[] | null>(null);

    const dark = theme.palette.mode === 'dark';
    /** The one colour the backdrop marks are drawn from — see `ink`. */
    const inkColor = ink === 'light' ? theme.palette.common.white : theme.palette.common.black;

    /** One exit for the composer, so cancelling never leaves a half-set scope behind. */
    const closeComposer = () => {
        setComposing(false);
        setListName('');
        setApplyToAll(false);
    };

    /**
     * Apply optimistic moves on top of the server's columns.
     *
     * Derived rather than stored: the board keeps ONE source of truth (the query result) plus a
     * small override map. Copying the columns into state would mean two lists to keep in step,
     * which is exactly how a card ends up in two places at once.
     */
    const view = useMemo(() => {
        const hasMoves = Object.keys(pending).length > 0;
        const hasOrders = Object.keys(pendingOrder).length > 0;
        if (!hasMoves && !hasOrders) return columns;

        const moved = new Map<string, TaskRow>();
        for (const col of columns) {
            for (const t of col.tasks) if (pending[t.id]) moved.set(t.id, t);
        }
        return columns.map((col) => {
            // A card in flight belongs to its DESTINATION, whether or not the server has caught
            // up. The earlier version dropped anything with a pending move out of `kept` and then
            // refused to re-add it once the refetch had already placed it here — so for one frame
            // the card existed in no column at all, and reappeared at the bottom before the
            // reorder landed. That was the flicker.
            const kept = col.tasks.filter((t) => !pending[t.id] || pending[t.id] === col.status.id);
            const here = new Set(kept.map((t) => t.id));
            const arrived = [...moved.values()].filter(
                (t) => pending[t.id] === col.status.id && !here.has(t.id),
            );
            const left = col.tasks.filter((t) => pending[t.id] && pending[t.id] !== col.status.id).length;
            const delta = arrived.length - left;
            let tasks = [...arrived, ...kept];

            // A pending order is the arrangement the user just made with the mouse. Ids it does
            // not mention (a card someone else added between the drop and the refetch) keep their
            // server order at the end, rather than disappearing.
            const order = pendingOrder[col.status.id];
            if (order) {
                const rank = new Map(order.map((id, i) => [id, i]));
                tasks = [...tasks].sort(
                    (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
                );
            }
            return { ...col, tasks, total: Math.max(0, col.total + delta) };
        });
    }, [columns, pending, pendingOrder]);

    const move = useCallback(
        async (task: TaskRow, statusId: string) => {
            const from = task.statusId ?? UNASSIGNED;
            if (from === statusId) return;
            setPending((p) => ({ ...p, [task.id]: statusId }));
            try {
                await onMoveTask(task.id, statusId);
            } catch (error) {
                // Roll back. The server refused, so the card belongs where it was — leaving it
                // in the new column would show a state that does not exist.
                void toast({
                    icon: 'error',
                    title: 'Move rejected',
                    text: apiErrorMessage(error, 'Could not move this task'),
                    timer: 3200,
                });
            } finally {
                setPending((p) => {
                    const next = { ...p };
                    delete next[task.id];
                    return next;
                });
            }
        },
        [onMoveTask],
    );

    /**
     * A drop, with a position.
     *
     * Two writes, deliberately kept apart: the stage move is the one the server authorises and
     * stamps a completion date for, and the reorder is the arrangement of one lane. Sequencing
     * them (move, then order) means the reorder is always describing a lane the card is already
     * in, which is exactly what the API requires of it — and a refused move never gets to
     * rewrite an order it had no right to.
     */
    const drop = useCallback(
        async (column: BoardColumn, taskId: string, index: number) => {
            if (column.status.id === UNASSIGNED) return;
            const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
            if (!task) return;

            const to = column.status.id;
            const from = task.statusId ?? UNASSIGNED;
            const sameLane = from === to;

            const current = column.tasks.map((t) => t.id);
            const without = current.filter((id) => id !== taskId);
            const at = Math.max(0, Math.min(index, without.length));
            const ordered = [...without.slice(0, at), taskId, ...without.slice(at)];

            // Nothing actually changed — a drop back where it started is not a write.
            if (sameLane && ordered.join() === current.join()) return;

            setPending((p) => ({ ...p, [taskId]: to }));
            if (onReorder) setPendingOrder((o) => ({ ...o, [to]: ordered }));
            try {
                if (!sameLane) await onMoveTask(taskId, to);
                if (onReorder) await onReorder(to, ordered);
            } catch (error) {
                // Roll back. The server refused, so the card belongs where it was — leaving it
                // in the new position would show a state that does not exist.
                void toast({
                    icon: 'error',
                    title: sameLane ? 'Could not reorder' : 'Move rejected',
                    text: apiErrorMessage(error, 'Could not move this task'),
                    timer: 3200,
                });
            } finally {
                setPending((p) => {
                    const next = { ...p };
                    delete next[taskId];
                    return next;
                });
                setPendingOrder((o) => {
                    const next = { ...o };
                    delete next[to];
                    return next;
                });
            }
        },
        [columns, onMoveTask, onReorder],
    );

    const removeList = async (column: BoardColumn) => {
        if (!onDeleteList) return;
        const confirmed = await confirmDialog({
            icon: 'warning',
            title: `Delete “${column.status.name}”?`,
            text: 'This list belongs to this project only. It will disappear from this board.',
            confirmText: 'Delete list',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await onDeleteList(column.status.id, column.status.name);
        } catch (error) {
            // The server's own reason is the useful one here — "still holds 3 tasks" tells the
            // user exactly what to do next, which a generic failure never would.
            void toast({
                icon: 'error',
                title: 'Could not delete the list',
                text: apiErrorMessage(error, 'The list was not deleted.'),
                timer: 4200,
            });
        }
    };

    /**
     * The lanes in the order they should be drawn — the server's, unless a drag has just
     * rearranged them and the refetch has not landed yet.
     *
     * A lane the pending order does not mention (one somebody else added mid-drag) keeps its
     * server position at the end, rather than disappearing.
     */
    // Drop the optimistic order the moment the server's own agrees with it — holding it longer
    // would freeze the board against a lane somebody else adds or removes.
    useEffect(() => {
        if (!laneOrder) return;
        const server = view.map((c) => c.status.id).filter((id) => id !== UNASSIGNED);
        const local = laneOrder.filter((id) => server.includes(id));
        if (server.length === local.length && server.every((id, i) => id === local[i])) {
            setLaneOrder(null);
        }
    }, [view, laneOrder]);

    const orderedView = useMemo(() => {
        if (!laneOrder) return view;
        const rank = new Map(laneOrder.map((id, i) => [id, i]));
        return [...view].sort(
            (a, b) => (rank.get(a.status.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.status.id) ?? Number.MAX_SAFE_INTEGER),
        );
    }, [view, laneOrder]);

    /** Which ids each lane holds, and the lane order itself — the two maps the sorter reads. */
    const cardsByLane = useMemo(() => {
        const map: Record<string, string[]> = {};
        orderedView.forEach((c) => { map[c.status.id] = c.tasks.map((t) => t.id); });
        return map;
    }, [orderedView]);

    const laneRow = useMemo(
        () => ({ [LANE_ROW]: orderedView.map((c) => c.status.id).filter((id) => id !== UNASSIGNED) }),
        [orderedView],
    );

    /** A card was dropped: move it if the lane changed, and store the order if we can. */
    const handleCardDrop = useCallback((result: SortableDrop) => {
        if (result.unchanged) return;
        const column = columns.find((c) => c.status.id === result.toContainerId);
        if (!column) return;
        void drop(column, result.id, result.toIndex);
    }, [columns, drop]);

    /** A lane was dropped: `sortOrder` is its index, left to right. */
    const handleLaneDrop = useCallback(async (result: SortableDrop) => {
        if (result.unchanged || !onReorderLanes) return;
        setLaneOrder(result.order);
        try {
            await onReorderLanes(result.order);
        } catch (error) {
            setLaneOrder(null);
            void toast({
                icon: 'error',
                title: 'Could not reorder the lists',
                text: apiErrorMessage(error, 'The board was left as it was.'),
                timer: 3600,
            });
        }
    }, [onReorderLanes]);

    const submitList = async () => {
        const name = listName.trim();
        if (!name || !onCreateList) return;
        setCreating(true);
        try {
            await onCreateList(name, applyToAll);
            setListName('');
            setApplyToAll(false);
            setComposing(false);
        } catch (error) {
            void toast({
                icon: 'error',
                title: 'Could not add the list',
                text: apiErrorMessage(error, 'The list was not created.'),
                timer: 3600,
            });
        } finally {
            setCreating(false);
        }
    };

    if (!isLoading && view.length === 0 && !onCreateList) {
        return (
            <TaskStateBlock
                icon="element-11"
                title="No stages configured"
                description="Add a task stage in Configure and it will appear here as a board column."
            />
        );
    }

    return (
        <SortableProvider
            surface={LANE_SURFACE}
            axis="x"
            itemsByContainer={laneRow}
            onDrop={(r) => void handleLaneDrop(r)}
        >
        <SortableProvider
            surface={CARD_SURFACE}
            axis="y"
            itemsByContainer={cardsByLane}
            onDrop={handleCardDrop}
        >
            {/* The placeholder's shimmer. Declared once here rather than per drag. */}
            <GlobalStyles styles={{
                '@keyframes wt-sortable-shimmer': {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            }} />

            {/* The board owns the full height it was given; the LANES do not — `items-start` is
                what makes each one end after its last card (Trello's shape) instead of every lane
                being padded out to the tallest. `min-h-0` is load-bearing: without it a tall lane
                would stretch the flex parent instead of scrolling inside it. */}
            {/* The lane ROW is itself a sortable container — the list a dragged lane is placed
                into. Without this registration a lane could be picked up and tilted but never
                dropped anywhere: the engine looks for the list under the pointer, found none on
                the lane surface, and left the placeholder where it started, so every lane drop
                resolved to "nothing moved". */}
            <SortableContainer
                surface={LANE_SURFACE}
                id={LANE_ROW}
                className="flex h-full min-h-0 w-full flex-1 items-start gap-3 overflow-x-auto overflow-y-hidden"
                sx={{
                    // §18 — the board scrolls horizontally rather than squeezing columns to
                    // nothing as stages are added. The page itself must never scroll sideways.
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: 4,
                        bgcolor: alpha(
                            ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                            0.28,
                        ),
                    },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                }}
            >
                {orderedView.map((column) => {
                    const droppable = column.status.id !== UNASSIGNED;
                    return (
                        // TWO roles on one lane: a sortable ITEM on the lane surface (so the
                        // whole column can be carried), and a sortable CONTAINER on the card
                        // surface (so cards can be dropped into it, including when it is empty).
                        // Naming the surface on each is what keeps a lane from being droppable
                        // onto a card list.
                        <SortableItem
                            key={column.status.id}
                            surface={LANE_SURFACE}
                            id={column.status.id}
                            containerId={LANE_ROW}
                            disabled={!onReorderLanes || !droppable}
                            // The lane's SAFE AREA: only its header starts a lane drag. Without
                            // it, a press on a card bubbled up and moved the whole column — two
                            // gestures from one press. The cards below are their own draggables
                            // and stop the press before it ever reaches here.
                            handle="[data-lane-handle]"
                            // The lane IS this element — no wrapper between it and the board.
                            // A wrapper broke the height chain: `max-h-full` resolves against the
                            // PARENT, and an extra auto-height box in between made it resolve
                            // against nothing, so a lane with four cards grew past the board
                            // instead of capping and scrolling its own list.
                            className="flex max-h-full min-h-0 w-[clamp(15.5rem,22vw,20rem)] shrink-0 flex-col self-start overflow-hidden"
                            sx={{
                                borderRadius: 2,
                                border: '1px solid',
                                // Every lane is the same surface. Tinting a whole column green
                                // fought the board's own background and washed out its header;
                                // "finished" belongs on the CARDS, which is what a reader is
                                // actually scanning for. The header keeps its label.
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.12)}`,
                                transition: 'background-color .15s, border-color .15s, box-shadow .15s',
                            }}
                        >
                            {/* The column header, and the ONLY place a lane drag may begin —
                                `data-lane-handle` is the selector the SortableItem above is
                                scoped to. A title bar is where people expect to pick a column
                                up, and confining it there is what keeps grabbing a card from
                                moving the column it sits in. */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                className="shrink-0"
                                {...(onReorderLanes && droppable ? { 'data-lane-handle': 'true' } : {})}
                                sx={{
                                    px: 1.25, py: 1,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    // The grip appears on approach, so the header advertises what
                                    // it can do at the moment somebody is about to try it.
                                    '& .lane-grip': { opacity: 0, transition: 'opacity .15s' },
                                    '&:hover .lane-grip': { opacity: 1 },
                                }}
                            >
                                {!!onReorderLanes && droppable && (
                                    <Tooltip title="Drag to reorder this list">
                                        <Box
                                            className="lane-grip"
                                            aria-hidden
                                            sx={{ color: 'text.disabled', lineHeight: 0, flexShrink: 0, ml: -0.5 }}
                                        >
                                            <KTIcon iconName="dots-square" className="fs-7" />
                                        </Box>
                                    </Tooltip>
                                )}
                                <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'text.primary' }}
                                >
                                    {column.status.name}
                                </Typography>
                                <Box sx={{ flex: 1 }} />

                                {/* Only this project's OWN lanes carry a delete. A company-wide
                                    stage has no × here at all — not a disabled one — because the
                                    action does not exist on this screen for it. */}
                                {onDeleteList && column.status.leadId && (
                                    <Tooltip title="Delete this list">
                                        <Box
                                            component="button" type="button"
                                            aria-label={`Delete the ${column.status.name} list`}
                                            onClick={() => void removeList(column)}
                                            sx={{
                                                border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0,
                                                p: 0.3, borderRadius: 0.75, color: 'text.disabled',
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.error.main, 0.12),
                                                    color: 'error.main',
                                                },
                                            }}
                                        >
                                            <KTIcon iconName="trash" className="fs-7" />
                                        </Box>
                                    </Tooltip>
                                )}

                                {onAddInStage && droppable && (
                                    <Box
                                        component="button" type="button"
                                        aria-label={`Add a task in ${column.status.name}`}
                                        onClick={() => onAddInStage(column.status.id)}
                                        sx={{
                                            border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0,
                                            p: 0.3, borderRadius: 0.75, color: 'text.disabled',
                                            '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                                        }}
                                    >
                                        <KTIcon iconName="plus" className="fs-7" />
                                    </Box>
                                )}
                                <Chip
                                    size="small"
                                    label={column.total}
                                    sx={{
                                        height: 18, fontSize: 10, fontWeight: 700, borderRadius: 0.75,
                                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                                        color: 'text.secondary',
                                        '& .MuiChip-label': { px: 0.75 },
                                    }}
                                />
                            </Stack>

                            {/* cards — the only part of a column that scrolls, and the list the
                                engine inserts the placeholder into. It is the CARD LIST rather
                                than the whole lane on purpose: the placeholder becomes a direct
                                child, so it can never land between the header and the cards. */}
                            <SortableContainer
                                surface={CARD_SURFACE}
                                id={column.status.id}
                                disabled={!droppable}
                                className="min-h-0 flex-1"
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                    p: 1,
                                    overflowY: 'auto',
                                    scrollbarWidth: 'thin',
                                    '&::-webkit-scrollbar': { width: 6 },
                                    '&::-webkit-scrollbar-thumb': {
                                        borderRadius: 3,
                                        bgcolor: alpha(theme.palette.text.primary, 0.18),
                                    },
                                }}
                            >
                                {/* Each card is a SortableItem: pointerdown starts the gesture,
                                    the engine clones it into the tilted ghost, and its slot is
                                    held open by a shimmering placeholder while the others glide
                                    aside. Nothing here re-renders during the drag. */}
                                {column.tasks.map((task) => (
                                    <SortableItem
                                        key={task.id}
                                        surface={CARD_SURFACE}
                                        id={task.id}
                                        containerId={column.status.id}
                                        disabled={!droppable}
                                        sx={{ mb: 1 }}
                                        preview={(
                                            <Box sx={{ width: 'clamp(15.5rem,22vw,20rem)' }}>
                                                <TaskCard
                                                    task={task}
                                                    now={now}
                                                    onOpen={() => undefined}
                                                    onRequestMove={() => undefined}
                                                />
                                            </Box>
                                        )}
                                    >
                                        <TaskCard
                                            task={task}
                                            now={now}
                                            onOpen={onOpenTask}
                                            onRequestMove={(t, anchor) => setMenu({ task: t, anchor })}
                                        />
                                    </SortableItem>
                                ))}

                                {/* An empty lane states its own affordance: in a full-height column
                                    a line of grey text floating at the top reads as a rendering
                                    bug, an outlined well reads as somewhere to drop a card. */}
                                {column.tasks.length === 0 && (
                                    <Box
                                        className="flex min-h-[5.5rem] flex-1 items-center justify-center rounded-lg px-2 text-center"
                                        sx={{
                                            border: '1px dashed',
                                            borderColor: 'divider',
                                            bgcolor: 'transparent',
                                            transition: 'border-color .15s, background-color .15s',
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                                            {droppable ? 'Drop a task here' : 'Nothing here'}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Honest about the cap rather than silently showing a partial column. */}
                                {column.hasMore && (
                                    <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', py: 0.5 }}>
                                        Showing {column.tasks.length} of {column.total} — narrow the filters to see the rest
                                    </Typography>
                                )}
                            </SortableContainer>
                        </SortableItem>
                    );
                })}

                {/* ── the trailing "add another list" lane ──────────────────────────────
                    Last in the row, like Trello's, because a board is read left to right and
                    the place to add a lane is after the last one. It draws on the BACKDROP
                    rather than on paper, so its colours come from `ink` — the backdrop is the
                    user's, and a white button would disappear on the light presets. */}
                {onCreateList && (
                    <Box className="w-[clamp(15.5rem,22vw,20rem)] shrink-0 self-start">
                        {composing ? (
                            <Box
                                className="rounded-2xl overflow-hidden"
                                sx={{
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    // Deeper than a lane's own shadow: this is a surface that
                                    // opened ON TOP of the board and should read as being closer
                                    // to the viewer than the lanes it sits beside.
                                    boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, dark ? 0.55 : 0.24)}`,
                                }}
                            >
                                {/* A titled header, because this stopped being a one-field
                                    composer the moment it grew a scope decision. */}
                                <Stack
                                    direction="row" alignItems="center" spacing={1}
                                    sx={{
                                        px: 1.5, py: 1.15,
                                        bgcolor: alpha(theme.palette.primary.main, dark ? 0.16 : 0.06),
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 24, height: 24, borderRadius: 1, flexShrink: 0,
                                            display: 'grid', placeItems: 'center',
                                            bgcolor: alpha(theme.palette.primary.main, dark ? 0.3 : 0.14),
                                            color: 'primary.main',
                                        }}
                                    >
                                        <KTIcon iconName="element-plus" className="fs-6" />
                                    </Box>
                                    <Typography variant="body2" sx={{ flex: 1, fontWeight: 700, color: 'text.primary' }}>
                                        New list
                                    </Typography>
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label="Cancel"
                                        onClick={closeComposer}
                                        sx={{
                                            border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0,
                                            p: 0.4, borderRadius: 1, color: 'text.secondary', flexShrink: 0,
                                            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                        }}
                                    >
                                        <KTIcon iconName="cross" className="fs-5" />
                                    </Box>
                                </Stack>

                                <Box sx={{ p: 1.5 }}>
                                <TextField
                                    autoFocus
                                    fullWidth
                                    size="small"
                                    placeholder="e.g. Site survey"
                                    value={listName}
                                    disabled={creating}
                                    onChange={(e) => setListName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); void submitList(); }
                                        if (e.key === 'Escape') closeComposer();
                                    }}
                                    inputProps={{ maxLength: 100 }}
                                    // The counter appears only as the cap gets close: a limit
                                    // nobody is near is noise, and one you hit without warning is
                                    // a wall. Reserved height either way, so nothing shifts.
                                    helperText={listName.length > 70 ? `${listName.length}/100` : ' '}
                                    FormHelperTextProps={{ sx: { textAlign: 'right', mx: 0.5, mt: 0.25 } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontWeight: 600 } }}
                                />
                                {/* The scope decision, made where the list is made.
                                    Project-only is preselected because it is the reversible one:
                                    a lane on one board can be deleted from that board, while a
                                    company-wide stage lands on every project in the company and
                                    is only removable from Configure. Shown as two explicit
                                    choices rather than a checkbox — "apply to all projects" left
                                    unticked reads as a setting someone forgot, not as a decision
                                    they made. */}
                                {canCreateGlobalList ? (
                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{ fontWeight: 700, fontSize: 9.5, letterSpacing: '.08em', color: 'text.disabled' }}
                                        >
                                            WHERE DOES IT APPEAR?
                                        </Typography>

                                        {SCOPE_CHOICES.map((choice) => {
                                            const selected = applyToAll === choice.all;
                                            return (
                                                <Box
                                                    key={String(choice.all)}
                                                    component="button"
                                                    type="button"
                                                    disabled={creating}
                                                    onClick={() => setApplyToAll(choice.all)}
                                                    aria-pressed={selected}
                                                    sx={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%',
                                                        textAlign: 'left', px: 1, py: 0.85, borderRadius: 1.5,
                                                        cursor: creating ? 'default' : 'pointer',
                                                        border: '1px solid',
                                                        borderColor: selected ? 'primary.main' : 'divider',
                                                        bgcolor: selected
                                                            ? alpha(theme.palette.primary.main, dark ? 0.18 : 0.07)
                                                            : 'transparent',
                                                        transition: 'border-color .15s, background-color .15s',
                                                        '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
                                                        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 22, height: 22, borderRadius: 0.75, flexShrink: 0, mt: 0.15,
                                                            display: 'grid', placeItems: 'center',
                                                            bgcolor: selected
                                                                ? alpha(theme.palette.primary.main, dark ? 0.32 : 0.16)
                                                                : alpha(theme.palette.text.primary, 0.06),
                                                            color: selected ? 'primary.main' : 'text.secondary',
                                                        }}
                                                    >
                                                        <KTIcon iconName={choice.icon} className="fs-7" />
                                                    </Box>

                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block', fontWeight: 700, lineHeight: 1.3,
                                                                color: selected ? 'primary.main' : 'text.primary',
                                                            }}
                                                        >
                                                            {choice.title}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'block', fontSize: 10.5, color: 'text.secondary', lineHeight: 1.35 }}>
                                                            {choice.description}
                                                        </Typography>
                                                    </Box>

                                                    {/* The tick only ever marks the chosen one — an
                                                        empty circle on the other row reads as a
                                                        second, unticked setting. */}
                                                    {selected && (
                                                        <Box sx={{ color: 'primary.main', lineHeight: 0, mt: 0.3, flexShrink: 0 }}>
                                                            <KTIcon iconName="check-circle" className="fs-6" />
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ px: 0.25 }}>
                                        <Box sx={{ color: 'text.disabled', lineHeight: 0 }}>
                                            <KTIcon iconName="office-bag" className="fs-7" />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                            Appears on this board only.
                                        </Typography>
                                    </Stack>
                                )}

                                {/* Actions last, under the decision they act on. */}
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.5 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        fullWidth
                                        disabled={!listName.trim() || creating}
                                        startIcon={!creating ? <KTIcon iconName="plus" className="fs-7" /> : undefined}
                                        onClick={() => void submitList()}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                                    >
                                        {creating ? 'Adding…' : 'Add list'}
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={closeComposer}
                                        disabled={creating}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, color: 'text.secondary', flexShrink: 0 }}
                                    >
                                        Cancel
                                    </Button>
                                </Stack>

                                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontSize: 10, color: 'text.disabled' }}>
                                    Enter to add · Esc to cancel
                                </Typography>
                                </Box>
                            </Box>
                        ) : (
                            /* An empty SLOT, not a button sitting on the backdrop.
                               A dashed outline is how a board says "a lane goes here" — the same
                               language as the drop trace above — where a solid filled bar just
                               looked like a lane that had lost its cards. It stays ink-derived
                               because the backdrop is the user's: `ink` is the contrast the
                               chosen wallpaper or colour needs, which the app theme cannot know. */
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setComposing(true)}
                                className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left"
                                sx={{
                                    border: '1.5px dashed',
                                    borderColor: alpha(inkColor, 0.3),
                                    bgcolor: alpha(inkColor, ink === 'light' ? 0.08 : 0.04),
                                    color: alpha(inkColor, 0.85),
                                    cursor: 'pointer',
                                    // Sits under the composer's shadow when it opens, and lifts on
                                    // hover so the slot reads as pressable rather than painted on.
                                    backdropFilter: 'blur(2px)',
                                    transition: 'background-color .18s, border-color .18s, transform .18s, box-shadow .18s',
                                    '&:hover': {
                                        borderColor: alpha(inkColor, 0.55),
                                        bgcolor: alpha(inkColor, ink === 'light' ? 0.16 : 0.08),
                                        color: inkColor,
                                        transform: 'translateY(-1px)',
                                        boxShadow: `0 6px 16px ${alpha(theme.palette.common.black, 0.22)}`,
                                    },
                                    '&:active': { transform: 'translateY(0)' },
                                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                                }}
                            >
                                <Box
                                    aria-hidden
                                    sx={{
                                        width: 26, height: 26, borderRadius: 1, flexShrink: 0,
                                        display: 'grid', placeItems: 'center', lineHeight: 0,
                                        bgcolor: alpha(inkColor, ink === 'light' ? 0.16 : 0.08),
                                    }}
                                >
                                    <KTIcon iconName="plus" className="fs-5" />
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>Add another list</Box>
                                    <Box sx={{ fontSize: 11, opacity: 0.72, lineHeight: 1.3 }}>
                                        {canCreateGlobalList ? 'For this project, or for all of them' : 'A new stage on this board'}
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </SortableContainer>

            {/* Touch fallback: HTML5 drag events never fire on touch, so the same move is
                reachable from a menu. Same API call, same authorization. */}
            <Menu
                anchorEl={menu?.anchor ?? null}
                open={!!menu}
                onClose={() => setMenu(null)}
                slotProps={{ paper: { sx: { minWidth: 200 } } }}
            >
                <MenuItem disabled sx={{ opacity: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Move to stage
                </MenuItem>
                {columns
                    .filter((c) => c.status.id !== UNASSIGNED)
                    .map((c) => (
                        <MenuItem
                            key={c.status.id}
                            selected={menu?.task.statusId === c.status.id}
                            onClick={() => {
                                if (menu) void move(menu.task, c.status.id);
                                setMenu(null);
                            }}
                        >
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.status.color || 'primary.main', mr: 1.25 }} />
                            {c.status.name}
                        </MenuItem>
                    ))}
            </Menu>
        </SortableProvider>
        </SortableProvider>
    );
};

export default TaskBoard;
