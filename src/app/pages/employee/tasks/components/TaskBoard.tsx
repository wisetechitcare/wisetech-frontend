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
import { useCallback, useMemo, useState } from 'react';
import {
    Box, Button, Chip, Menu, MenuItem, Stack, TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { confirmDialog, toast } from '@app/modules/common/components/ui';
import { TaskRow, TaskStatusRef, apiErrorMessage } from '../taskDomain';
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
     * selected, since a lane created here belongs to THAT project and to no other board. Omitted
     * (rather than disabled) otherwise: an "Add another list" that always refuses is worse than
     * no button.
     */
    onCreateList?: (name: string) => Promise<unknown>;
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
    isLoading?: boolean;
    /**
     * How to draw the few marks that sit on the BACKDROP rather than on a card — currently the
     * horizontal scrollbar. The backdrop is user-chosen, so its contrast cannot be inferred from
     * the app's theme mode: a light theme can be showing a midnight board.
     */
    ink?: 'light' | 'dark';
}

/** Tasks with no stage live in a synthetic column the server emits; it cannot receive drops. */
const UNASSIGNED = '__unassigned__';

/**
 * Where the card will land — the card's own outline, held open in the lane.
 *
 * A thin line said "between these two" but not "this is how much room it takes", so a drag into a
 * tight lane still looked like a guess. The trace is the SIZE of the card being dragged
 * (measured at drag start), so the lane visibly opens exactly the gap the card will fill and the
 * cards below settle where they will actually end up. Trello's placeholder does the same job.
 *
 * Always mounted at zero height and grown into place, rather than mounted on demand: an element
 * that appears at its final size makes the cards below it jump, and a jump is not feedback, it is
 * a glitch.
 */
const DropTrace = ({ active, height }: { active: boolean; height: number }) => (
    <Box
        aria-hidden
        sx={(theme) => ({
            height: active ? height : 0,
            mb: active ? 1 : 0,
            opacity: active ? 1 : 0,
            borderRadius: 2,
            border: active ? '1px dashed' : '1px dashed transparent',
            borderColor: active ? alpha(theme.palette.text.primary, 0.28) : 'transparent',
            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.09 : 0.06),
            boxSizing: 'border-box',
            transition: 'height .15s ease-out, margin .15s ease-out, opacity .12s ease-out',
        })}
    />
);

export const TaskBoard = ({
    columns, now, onOpenTask, onMoveTask, onAddInStage, onCreateList, onDeleteList, onReorder,
    isLoading, ink = 'light',
}: TaskBoardProps) => {
    const theme = useTheme();
    const [draggingId, setDraggingId] = useState<string | null>(null);
    /** The dragged card's height, so the trace holds open exactly the gap it will fill. */
    const [dragHeight, setDragHeight] = useState(88);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    /** Where the card would land: which lane, and at which index within it. */
    const [dropAt, setDropAt] = useState<{ columnId: string; index: number } | null>(null);
    /** Optimistic overrides: taskId → statusId. Cleared once the server answers. */
    const [pending, setPending] = useState<Record<string, string>>({});
    /** Optimistic lane orders: statusId → task ids. Cleared once the server answers. */
    const [pendingOrder, setPendingOrder] = useState<Record<string, string[]>>({});
    const [menu, setMenu] = useState<{ anchor: HTMLElement; task: TaskRow } | null>(null);
    /** The trailing "Add another list" lane, in its two states. */
    const [composing, setComposing] = useState(false);
    const [listName, setListName] = useState('');
    const [creating, setCreating] = useState(false);

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

    const handleDrop = useCallback(
        (e: React.DragEvent, column: BoardColumn) => {
            e.preventDefault();
            const index = dropAt?.columnId === column.status.id ? dropAt.index : column.tasks.length;
            setDragOverColumn(null);
            setDraggingId(null);
            setDropAt(null);
            const taskId = e.dataTransfer.getData('text/plain');
            if (!taskId) return;
            void drop(column, taskId, index);
        },
        [drop, dropAt],
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

    const submitList = async () => {
        const name = listName.trim();
        if (!name || !onCreateList) return;
        setCreating(true);
        try {
            await onCreateList(name);
            setListName('');
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
        <>
            {/* The board owns the full height it was given; the LANES do not — `items-start` is
                what makes each one end after its last card (Trello's shape) instead of every lane
                being padded out to the tallest. `min-h-0` is load-bearing: without it a tall lane
                would stretch the flex parent instead of scrolling inside it. */}
            <Box
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
                {view.map((column) => {
                    const isOver = dragOverColumn === column.status.id;
                    const droppable = column.status.id !== UNASSIGNED;
                    // Where the insertion line is drawn in THIS lane, if it is the one under the
                    // pointer. Only meaningful while a card is being dragged and only when the
                    // board can actually store an order.
                    const hintIndex = onReorder && draggingId && dropAt?.columnId === column.status.id
                        ? dropAt.index
                        : -1;
                    // Drop feedback is the app's own accent, NOT the stage's configured colour:
                    // a lane no longer wears its status colour as chrome (a row of differently
                    // coloured rules reads as decoration, and said nothing the header did not),
                    // so the only colour left on a lane is the one that means "release here".
                    const accent = theme.palette.primary.main;
                    return (
                        <Box
                            key={column.status.id}
                            onDragOver={(e) => {
                                if (!droppable) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverColumn !== column.status.id) setDragOverColumn(column.status.id);
                                // Reached only from the lane's own padding — a card stops the
                                // event once it has claimed a more precise index. Anywhere else
                                // in the lane means "after the last card".
                                setDropAt((d) =>
                                    d?.columnId === column.status.id && d.index === column.tasks.length
                                        ? d
                                        : { columnId: column.status.id, index: column.tasks.length },
                                );
                            }}
                            onDragLeave={(e) => {
                                // Only when the pointer actually leaves the lane — moving between
                                // two cards inside it fires dragleave on the card, not the lane.
                                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                                setDragOverColumn((c) => (c === column.status.id ? null : c));
                                setDropAt((d) => (d?.columnId === column.status.id ? null : d));
                            }}
                            onDrop={(e) => handleDrop(e, column)}
                            // A lane is as tall as its own cards and no taller — an empty stage
                            // should not draw a screen-high empty box, and a stage with two cards
                            // should say so by its size. `max-h-full` is the other half of that
                            // deal: past a screenful the lane stops growing and scrolls its cards
                            // instead of pushing the board off the bottom. Widths are
                            // viewport-relative with a floor and a ceiling, so a 4K screen shows
                            // wider lanes rather than more empty backdrop.
                            className="flex max-h-full min-h-0 w-[clamp(15.5rem,22vw,20rem)] shrink-0 flex-col self-start overflow-hidden"
                            sx={{
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: isOver ? alpha(accent, 0.6) : 'divider',
                                bgcolor: isOver
                                    ? alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.08)
                                    : 'background.paper',
                                boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.12)}`,
                                transition: 'background-color .15s, border-color .15s, box-shadow .15s',
                            }}
                        >
                            {/* column header */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                className="shrink-0"
                                sx={{
                                    px: 1.25, py: 1,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'text.primary' }}
                                >
                                    {column.status.name}
                                </Typography>
                                {column.status.isFinal && (
                                    <Box sx={{ color: theme.palette.success.main, lineHeight: 0 }}>
                                        <KTIcon iconName="check-circle" className="fs-8" />
                                    </Box>
                                )}
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

                            {/* cards — the only part of a column that scrolls */}
                            <Stack
                                spacing={1}
                                className="min-h-0 flex-1"
                                sx={{
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
                                {column.tasks.map((task, index) => (
                                    <Box
                                        key={task.id}
                                        // Each card owns the two gaps around it: the pointer in
                                        // its top half means "above me", the bottom half means
                                        // "below me". That is the whole of dropping BETWEEN two
                                        // cards — no library, no measuring the whole lane.
                                        onDragOver={(e) => {
                                            if (!droppable) return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.dataTransfer.dropEffect = 'move';
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const below = e.clientY > rect.top + rect.height / 2;
                                            const next = index + (below ? 1 : 0);
                                            setDropAt((d) =>
                                                d?.columnId === column.status.id && d.index === next
                                                    ? d
                                                    : { columnId: column.status.id, index: next },
                                            );
                                        }}
                                    >
                                        <DropTrace active={hintIndex === index} height={dragHeight} />
                                        <TaskCard
                                            task={task}
                                            now={now}
                                            onOpen={onOpenTask}
                                            isDragging={draggingId === task.id}
                                            onDragStart={(id, height) => { setDraggingId(id); setDragHeight(height); }}
                                            onDragEnd={() => {
                                                setDraggingId(null);
                                                setDragOverColumn(null);
                                                setDropAt(null);
                                            }}
                                            onRequestMove={(t, anchor) => setMenu({ task: t, anchor })}
                                        />
                                    </Box>
                                ))}

                                {/* The gap after the last card. */}
                                <DropTrace
                                    active={hintIndex === column.tasks.length && column.tasks.length > 0}
                                    height={dragHeight}
                                />

                                {/* An empty lane states its own affordance: in a full-height column
                                    a line of grey text floating at the top reads as a rendering
                                    bug, an outlined well reads as somewhere to drop a card. */}
                                {column.tasks.length === 0 && (
                                    <Box
                                        className="flex min-h-[5.5rem] flex-1 items-center justify-center rounded-lg px-2 text-center"
                                        sx={{
                                            border: '1px dashed',
                                            borderColor: isOver ? alpha(accent, 0.7) : 'divider',
                                            bgcolor: isOver ? alpha(accent, 0.06) : 'transparent',
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
                            </Stack>
                        </Box>
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
                                className="rounded-2xl"
                                sx={{
                                    p: 1,
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.2)}`,
                                }}
                            >
                                <TextField
                                    autoFocus
                                    fullWidth
                                    size="small"
                                    placeholder="Enter list name…"
                                    value={listName}
                                    disabled={creating}
                                    onChange={(e) => setListName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); void submitList(); }
                                        if (e.key === 'Escape') { setComposing(false); setListName(''); }
                                    }}
                                    inputProps={{ maxLength: 100 }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                />
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={!listName.trim() || creating}
                                        onClick={() => void submitList()}
                                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                                    >
                                        {creating ? 'Adding…' : 'Add list'}
                                    </Button>
                                    <Box
                                        component="button"
                                        type="button"
                                        aria-label="Cancel"
                                        onClick={() => { setComposing(false); setListName(''); }}
                                        sx={{
                                            border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0,
                                            p: 0.5, borderRadius: 1, color: 'text.secondary',
                                            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                        }}
                                    >
                                        <KTIcon iconName="cross" className="fs-4" />
                                    </Box>
                                </Stack>
                                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.75, px: 0.25 }}>
                                    This list belongs to this project only.
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setComposing(true)}
                                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left"
                                sx={{
                                    border: '1px solid',
                                    borderColor: alpha(
                                        ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                                        0.18,
                                    ),
                                    bgcolor: alpha(
                                        ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                                        ink === 'light' ? 0.14 : 0.06,
                                    ),
                                    color: ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    transition: 'background-color .15s',
                                    '&:hover': {
                                        bgcolor: alpha(
                                            ink === 'light' ? theme.palette.common.white : theme.palette.common.black,
                                            ink === 'light' ? 0.24 : 0.12,
                                        ),
                                    },
                                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                                }}
                            >
                                <KTIcon iconName="plus" className="fs-5" />
                                Add another list
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

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
        </>
    );
};

export default TaskBoard;
