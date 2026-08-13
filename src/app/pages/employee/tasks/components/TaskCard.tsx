/**
 * A Kanban task card (Phase 4 §5).
 *
 * Dense on purpose. A board is scanned, not read: scope, title, project, progress, assignee and
 * due state must all land in one glance without the card becoming a form. Anything that needs
 * explaining belongs on the detail page.
 *
 * Draggable via the native HTML5 DnD API — no drag library, because the only gesture a board
 * needs is "move this card to that column". Touch devices get the stage menu instead
 * (HTML5 DnD does not fire on touch), so the feature is reachable either way.
 */
import { memo } from 'react';
import { Box, Card, Stack, Typography, alpha, useTheme } from '@mui/material';
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
    onDragStart?: (taskId: string) => void;
    onDragEnd?: () => void;
    /** Touch fallback for stage moves — the board supplies the menu. */
    onRequestMove?: (task: TaskRow, anchor: HTMLElement) => void;
}

const TaskCardBase = ({
    task, now, onOpen, isDragging, onDragStart, onDragEnd, onRequestMove,
}: TaskCardProps) => {
    const theme = useTheme();
    const overdue = isTaskOverdue(task, now);
    const logged = loggedSeconds(task.timesheets);
    const subtaskCount = task._count?.subtasks ?? 0;

    return (
        <Card
            elevation={0}
            draggable={!!onDragStart}
            onDragStart={(e) => {
                // The id travels in the drag payload so a drop handler never has to consult
                // component state to know what was dropped.
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
                onDragStart?.(task.id);
            }}
            onDragEnd={() => onDragEnd?.()}
            onClick={() => onOpen(task.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(task.id); }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${task.taskName}, ${task.taskScope.toLowerCase()} task`}
            sx={{
                p: 1.25,
                cursor: 'pointer',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: overdue ? alpha(theme.palette.error.main, 0.4) : 'divider',
                bgcolor: 'background.paper',
                opacity: isDragging ? 0.4 : 1,
                transition: 'border-color .15s, box-shadow .15s, transform .15s',
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    boxShadow: `0 2px 10px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}`,
                },
                '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                },
            }}
        >
            <Stack spacing={0.85}>
                {/* scope + id */}
                <Stack direction="row" alignItems="center" spacing={0.75}>
                    <TaskScopeBadge scope={task.taskScope} />
                    <Box sx={{ flex: 1 }} />
                    <FinalStageMark task={task} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 10 }}>
                        {shortTaskId(task.id)}
                    </Typography>
                    {onRequestMove && (
                        <Box
                            component="button"
                            type="button"
                            aria-label="Move to stage"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                onRequestMove(task, e.currentTarget);
                            }}
                            sx={{
                                border: 0, p: 0.25, borderRadius: 0.75, cursor: 'pointer',
                                bgcolor: 'transparent', color: 'text.disabled', lineHeight: 0,
                                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                            }}
                        >
                            <KTIcon iconName="dots-vertical" className="fs-8" />
                        </Box>
                    )}
                </Stack>

                {/* A subtask must announce its parent — on a board it is otherwise
                    indistinguishable from independent work. */}
                {task.parentTaskId && (
                    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'text.disabled' }}>
                        <KTIcon iconName="tree" className="fs-9" />
                        <Typography variant="caption" noWrap sx={{ fontSize: 10, minWidth: 0 }}>
                            {task.parentTask?.taskName || 'Subtask'}
                        </Typography>
                    </Stack>
                )}

                {/* title */}
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600, lineHeight: 1.35, color: 'text.primary',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {task.taskName}
                </Typography>

                {/* project — or an explicit internal marker, never a blank line */}
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                    {task.taskScope === 'PROJECT'
                        ? (task.lead?.title || 'Project unavailable')
                        : 'Internal / no project'}
                </Typography>

                <TaskProgress value={task.progress} />

                {/* footer */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <AssigneeAvatar employee={task.assignedTo} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <TaskDueDate task={task} now={now} />
                    </Box>
                    {subtaskCount > 0 && (
                        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: 'text.disabled' }}>
                            <KTIcon iconName="tree" className="fs-8" />
                            <Typography variant="caption">{subtaskCount}</Typography>
                        </Stack>
                    )}
                    {logged > 0 && (
                        <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: 'text.disabled' }}>
                            <KTIcon iconName="timer" className="fs-8" />
                            <Typography variant="caption">{formatDuration(logged)}</Typography>
                        </Stack>
                    )}
                </Stack>

                {task.priority && <TaskPriorityBadge priority={task.priority} />}
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
