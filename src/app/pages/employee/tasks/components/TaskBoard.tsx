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
import { Box, Chip, Menu, MenuItem, Stack, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { toast } from '@app/modules/common/components/ui';
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
    isLoading?: boolean;
}

/** Tasks with no stage live in a synthetic column the server emits; it cannot receive drops. */
const UNASSIGNED = '__unassigned__';

export const TaskBoard = ({ columns, now, onOpenTask, onMoveTask, onAddInStage, isLoading }: TaskBoardProps) => {
    const theme = useTheme();
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    /** Optimistic overrides: taskId → statusId. Cleared once the server answers. */
    const [pending, setPending] = useState<Record<string, string>>({});
    const [menu, setMenu] = useState<{ anchor: HTMLElement; task: TaskRow } | null>(null);

    /**
     * Apply optimistic moves on top of the server's columns.
     *
     * Derived rather than stored: the board keeps ONE source of truth (the query result) plus a
     * small override map. Copying the columns into state would mean two lists to keep in step,
     * which is exactly how a card ends up in two places at once.
     */
    const view = useMemo(() => {
        if (!Object.keys(pending).length) return columns;
        const moved = new Map<string, TaskRow>();
        for (const col of columns) {
            for (const t of col.tasks) if (pending[t.id]) moved.set(t.id, t);
        }
        return columns.map((col) => {
            const kept = col.tasks.filter((t) => !pending[t.id]);
            const arrived = [...moved.entries()]
                .filter(([id, t]) => pending[id] === col.status.id && !col.tasks.some((x) => x.id === t.id))
                .map(([, t]) => t);
            const delta = arrived.length - (col.tasks.length - kept.length);
            return { ...col, tasks: [...arrived, ...kept], total: Math.max(0, col.total + delta) };
        });
    }, [columns, pending]);

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

    const handleDrop = useCallback(
        (e: React.DragEvent, column: BoardColumn) => {
            e.preventDefault();
            setDragOverColumn(null);
            setDraggingId(null);
            const taskId = e.dataTransfer.getData('text/plain');
            if (!taskId || column.status.id === UNASSIGNED) return;
            const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
            if (task) void move(task, column.status.id);
        },
        [columns, move],
    );

    if (!isLoading && view.length === 0) {
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
            <Box
                sx={{
                    display: 'flex',
                    gap: 1.5,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    pb: 1.5,
                    // §18 — the board scrolls horizontally rather than squeezing columns to
                    // nothing as stages are added. The page itself must never scroll sideways.
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.text.primary, 0.2),
                    },
                }}
            >
                {view.map((column) => {
                    const isOver = dragOverColumn === column.status.id;
                    const accent = column.status.color || theme.palette.primary.main;
                    const droppable = column.status.id !== UNASSIGNED;
                    return (
                        <Box
                            key={column.status.id}
                            onDragOver={(e) => {
                                if (!droppable) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverColumn !== column.status.id) setDragOverColumn(column.status.id);
                            }}
                            onDragLeave={() => setDragOverColumn((c) => (c === column.status.id ? null : c))}
                            onDrop={(e) => handleDrop(e, column)}
                            sx={{
                                width: { xs: 264, sm: 288 },
                                flex: '0 0 auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignSelf: 'flex-start',
                                maxHeight: '100%',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: isOver ? alpha(accent, 0.6) : 'divider',
                                bgcolor: isOver
                                    ? alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.08)
                                    : 'background.paper',
                                transition: 'background-color .15s, border-color .15s',
                            }}
                        >
                            {/* column header */}
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{
                                    px: 1.25, py: 1,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    borderTop: `2px solid ${accent}`,
                                    borderTopLeftRadius: 8,
                                    borderTopRightRadius: 8,
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
                                        bgcolor: alpha(accent, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                                        color: accent,
                                        '& .MuiChip-label': { px: 0.75 },
                                    }}
                                />
                            </Stack>

                            {/* cards */}
                            <Stack spacing={1} sx={{ p: 1, overflowY: 'auto', minHeight: 90 }}>
                                {column.tasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        now={now}
                                        onOpen={onOpenTask}
                                        isDragging={draggingId === task.id}
                                        onDragStart={setDraggingId}
                                        onDragEnd={() => { setDraggingId(null); setDragOverColumn(null); }}
                                        onRequestMove={(t, anchor) => setMenu({ task: t, anchor })}
                                    />
                                ))}

                                {column.tasks.length === 0 && (
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'text.disabled', textAlign: 'center', py: 3, fontStyle: 'italic' }}
                                    >
                                        {droppable ? 'Drop a task here' : 'Nothing here'}
                                    </Typography>
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
