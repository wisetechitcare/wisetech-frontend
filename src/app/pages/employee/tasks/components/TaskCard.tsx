/**
 * A Kanban task card (Phase 4 §5).
 *
 * Dense on purpose. A board is scanned, not read: scope, title, project, progress, assignee and
 * due state must all land in one glance without the card becoming a form. Anything that needs
 * explaining belongs on the detail page.
 *
 * The layout is three bands, top to bottom — **what it is** (priority · scope · id), **what it
 * says** (title · project · progress), **who and when** (assignee · due · subtasks · logged time),
 * separated by a hairline. A flat stack of eight equal rows is what made the old card read as a
 * list of fields; banding it gives the eye somewhere to land first.
 *
 * ### Dragging
 *
 * Native HTML5 DnD, no library. The only gesture a board needs is "move this card to that
 * column", and that is exactly what the API models. Touch devices get the stage menu instead
 * (HTML5 DnD does not fire on touch), so the feature is reachable either way.
 *
 * **The drag image is an explicit clone, not the card itself.** Letting the browser snapshot the
 * live node produced the blurred ghost: the snapshot is a raster of the element *including* its
 * transform, so a `scale()` resamples it, and the card sits inside the board's backdrop-filtered
 * surface, which the compositor renders through as well. A detached clone — plain, opaque, tilted,
 * outside that stacking context — is sharp on every browser.
 *
 * **The clone is positioned ON the card it copies, and torn down on the first `drag` event.**
 * Both halves matter, and each was a bug on its own:
 *
 *   - Parking the clone off-screen (`left: -10000px`) is the usual trick and it is not reliable —
 *     Chrome frequently declines to rasterize a node outside the viewport, and silently falls back
 *     to snapshotting the source element instead. The source is dimmed to 35% during a drag, which
 *     is precisely the see-through ghost. Sitting the clone exactly over the original keeps it in
 *     the viewport, so it always rasterizes, and it is invisible to the user because it is pixel-
 *     identical to what was already there.
 *   - `drag` fires only after the drag image has been captured, so it is the one honest signal
 *     that the snapshot is done. A `setTimeout(0)` is a guess, and it lost the race often enough
 *     to make the ghost's appearance look random.
 *
 * `dragend` and unmount are the belt-and-braces cleanups — never the primary one.
 */
import { memo, useEffect, useRef } from 'react';
import { Box, Card, Divider, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    TaskRow, isTaskOverdue, loggedSeconds, formatDuration, shortTaskId,
} from '../taskDomain';
import {
    TaskScopeBadge, TaskPriorityBadge, TaskProgress, AssigneeAvatar, TaskDueDate, FinalStageMark,
} from './primitives';

export interface TaskCardProps {
    task: TaskRow;
    now: Date;
    onOpen: (taskId: string) => void;
    /** Set while this card is the one being dragged, so it can dim in place. */
    isDragging?: boolean;
    /** `height` is the card's rendered height, so the board can hold open a gap of exactly that. */
    onDragStart?: (taskId: string, height: number) => void;
    onDragEnd?: () => void;
    /** Touch fallback for stage moves — the board supplies the menu. */
    onRequestMove?: (task: TaskRow, anchor: HTMLElement) => void;
}

/** A muted count — subtasks, logged time. Quiet by design: these are footnotes, not headlines. */
const MetaChip = ({ icon, label }: { icon: string; label: string }) => (
    <Stack direction="row" spacing={0.3} alignItems="center" sx={{ color: 'text.disabled' }}>
        <KTIcon iconName={icon} className="fs-8" />
        <Typography variant="caption" sx={{ fontSize: 10.5, fontWeight: 600, color: 'inherit' }}>
            {label}
        </Typography>
    </Stack>
);

const TaskCardBase = ({
    task, now, onOpen, isDragging, onDragStart, onDragEnd, onRequestMove,
}: TaskCardProps) => {
    const theme = useTheme();
    const overdue = isTaskOverdue(task, now);
    const logged = loggedSeconds(task.timesheets);
    const subtaskCount = task._count?.subtasks ?? 0;
    /** The node handed to `setDragImage`, alive until the browser has captured it. */
    const ghostRef = useRef<HTMLElement | null>(null);
    /** Measured at drag start; the board sizes its drop trace from it on the first `drag`. */
    const heightRef = useRef(0);
    const startedRef = useRef(false);

    const buildGhost = (event: React.DragEvent<HTMLDivElement>) => {
        const node = event.currentTarget;
        const rect = node.getBoundingClientRect();
        const ghost = node.cloneNode(true) as HTMLElement;

        // Exactly over the original, so it is in the viewport (Chrome will not reliably rasterize
        // a node parked off-screen) and invisible (it is the same card, in the same place).
        ghost.style.position = 'fixed';
        ghost.style.top = `${rect.top}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = '1';
        ghost.style.pointerEvents = 'none';
        // Stated, not inherited. The ghost must be SOLID: the class it was cloned from can carry
        // the dragging card's own fade, and the board's surface behind it is backdrop-filtered.
        ghost.style.opacity = '1';
        ghost.style.backgroundColor = theme.palette.background.paper;
        ghost.style.backdropFilter = 'none';
        ghost.style.filter = 'none';
        // The tilt lives here rather than on the real card, so nothing the user is looking at
        // moves — and no scale, because scaling a snapshot is exactly what blurred it.
        ghost.style.transform = 'rotate(3deg)';
        ghost.style.boxShadow = `0 18px 40px ${alpha(theme.palette.common.black, 0.4)}`;

        document.body.appendChild(ghost);
        ghostRef.current = ghost;
        // Grabbed under the cursor where it was actually picked up, so the card does not jump.
        event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top);
    };

    const dropGhost = () => {
        ghostRef.current?.remove();
        ghostRef.current = null;
    };

    /**
     * The drag is genuinely under way: the image has been captured, so the clone can go and the
     * card can dim. Idempotent — `drag` fires continuously.
     */
    const beginDrag = () => {
        if (startedRef.current) return;
        startedRef.current = true;
        dropGhost();
        onDragStart?.(task.id, heightRef.current);
    };

    // A drag that ends with the card unmounting (it moved lane, and the board re-rendered) never
    // fires this card's `dragend` — without this the clone would outlive the board.
    useEffect(() => dropGhost, []);

    return (
        <Card
            elevation={0}
            draggable={!!onDragStart}
            onDragStart={(e) => {
                // The id travels in the drag payload so a drop handler never has to consult
                // component state to know what was dropped.
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
                startedRef.current = false;
                heightRef.current = e.currentTarget.getBoundingClientRect().height;
                buildGhost(e);
                // Nothing else happens here. The card must NOT dim inside this handler: a faded
                // card is what the browser snapshots if it declines the clone, and that is the
                // see-through ghost. `onDrag` takes over once the image is safely captured.
            }}
            onDrag={beginDrag}
            onDragEnd={() => { dropGhost(); startedRef.current = false; onDragEnd?.(); }}
            onClick={() => onOpen(task.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(task.id); }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${task.taskName}, ${task.taskScope.toLowerCase()} task`}
            sx={{
                p: 1.5,
                cursor: onDragStart ? 'grab' : 'pointer',
                borderRadius: 2,
                border: '1px solid',
                borderColor: overdue ? alpha(theme.palette.error.main, 0.35) : 'divider',
                bgcolor: 'background.paper',
                // The card being dragged stays put as a faint outline of where it came from —
                // the thing that makes a long drag legible.
                opacity: isDragging ? 0.35 : 1,
                boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.06)}`,
                transition: theme.transitions.create(
                    ['border-color', 'box-shadow', 'transform', 'opacity'],
                    { duration: 160, easing: theme.transitions.easing.easeOut },
                ),
                '&:active': { cursor: onDragStart ? 'grabbing' : 'pointer' },
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                    boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.1)}`,
                    transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                },
                // The row menu is chrome, not content: on a pointer device it appears when the
                // card is under the cursor. On touch — where it is the ONLY way to move a card —
                // it is always visible, because there is no hover to reveal it with.
                '@media (hover: hover)': {
                    '& .wt-card-menu': { opacity: 0 },
                    '&:hover .wt-card-menu, & .wt-card-menu:focus-visible': { opacity: 1 },
                },
            }}
        >
            <Stack spacing={1}>
                {/* ── band 1: what it is ── */}
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                    <TaskScopeBadge scope={task.taskScope} />
                    {task.priority && <TaskPriorityBadge priority={task.priority} />}
                    <Box sx={{ flex: 1, minWidth: 8 }} />
                    <FinalStageMark task={task} />
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 10, letterSpacing: '-.02em' }}
                    >
                        {shortTaskId(task.id)}
                    </Typography>
                    {onRequestMove && (
                        <Tooltip title="Move to stage">
                            <Box
                                component="button"
                                type="button"
                                className="wt-card-menu"
                                aria-label="Move to stage"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    onRequestMove(task, e.currentTarget);
                                }}
                                sx={{
                                    border: 0, p: 0.25, borderRadius: 0.75, cursor: 'pointer',
                                    bgcolor: 'transparent', color: 'text.disabled', lineHeight: 0,
                                    transition: 'opacity .15s, background-color .15s, color .15s',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                }}
                            >
                                <KTIcon iconName="dots-vertical" className="fs-8" />
                            </Box>
                        </Tooltip>
                    )}
                </Stack>

                {/* ── band 2: what it says ── */}
                <Box sx={{ minWidth: 0 }}>
                    {/* A subtask must announce its parent — on a board it is otherwise
                        indistinguishable from independent work. */}
                    {task.parentTaskId && (
                        <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'text.disabled', mb: 0.25 }}>
                            <KTIcon iconName="tree" className="fs-9" />
                            <Typography variant="caption" noWrap sx={{ fontSize: 10, minWidth: 0 }}>
                                {task.parentTask?.taskName || 'Subtask'}
                            </Typography>
                        </Stack>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600, fontSize: 13.5, lineHeight: 1.4, color: 'text.primary',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', wordBreak: 'break-word',
                        }}
                    >
                        {task.taskName}
                    </Typography>

                    {/* The project — or an explicit internal marker, never a blank line. */}
                    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.35, minWidth: 0, color: 'text.secondary' }}>
                        <KTIcon iconName={task.taskScope === 'PROJECT' ? 'office-bag' : 'home-2'} className="fs-9" />
                        <Typography variant="caption" noWrap sx={{ fontSize: 11, minWidth: 0, color: 'inherit' }}>
                            {task.taskScope === 'PROJECT'
                                ? (task.lead?.title || 'Project unavailable')
                                : 'Internal / no project'}
                        </Typography>
                    </Stack>
                </Box>

                <TaskProgress value={task.progress} height={4} />

                <Divider sx={{ borderColor: 'divider', opacity: 0.7 }} />

                {/* ── band 3: who and when ── */}
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                    <AssigneeAvatar employee={task.assignedTo} size={24} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <TaskDueDate task={task} now={now} pill />
                    </Box>
                    {subtaskCount > 0 && <MetaChip icon="tree" label={String(subtaskCount)} />}
                    {logged > 0 && <MetaChip icon="timer" label={formatDuration(logged)} />}
                </Stack>
            </Stack>
        </Card>
    );
};

/**
 * Memoised: a board can hold hundreds of cards, and a drag re-renders the columns constantly.
 * Without this, every pointer move over a column repaints every card in it.
 */
export const TaskCard = memo(TaskCardBase);
export default TaskCard;
