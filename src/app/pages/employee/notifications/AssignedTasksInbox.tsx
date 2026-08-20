/**
 * Inbox → Tasks: the work that has been handed to me.
 *
 * ─── WHY THIS IS NOT A LIST OF NOTIFICATIONS ─────────────────────────────────
 * The bell and the notification rows are EVENTS — "you were assigned this, on Tuesday". They are
 * cleared, they are marked read, and they scroll away. This tab answers the different and more
 * useful question those events only hint at: **what is currently on me**. So it reads the task
 * list itself (`?mine=true`, which the API resolves from the session and matches against the
 * owner column AND the shared roster), not the notifications table. Clearing your notifications
 * does not empty it, and a task assigned before this feature existed still shows up.
 *
 * ─── EVERY ROW IS A DOOR ─────────────────────────────────────────────────────
 * Clicking a task goes straight to the board it lives on, already scoped to its project
 * (`/tasks?scope=…`) — the same address the assignment notification carries, so both routes into
 * a piece of work land in the same place.
 *
 * Open work is the point, so terminal stages sit behind a switch rather than padding the list
 * with things already finished.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Stack, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { getTaskList } from '@services/tasks';
import { SegmentedControl } from '@app/modules/common/components/ui';
import { TaskRow, dueLabel, isTaskFinal, isTaskOverdue, shortTaskId } from '../tasks/taskDomain';
import { TaskPriorityBadge, TaskProgress, TaskStatusBadge } from '../tasks/components/primitives';
import { GENERAL_PREFIX } from '../tasks/components/ProjectRail';

/** The board address for a task — its project's rail entry, or the general task's own. */
const boardHref = (task: TaskRow): string => {
    if (task.leadId) return `/tasks?scope=${encodeURIComponent(task.leadId)}`;
    // A general SUBTASK has no rail entry of its own; its parent does.
    const rootId = task.parentTaskId ?? task.id;
    return `/tasks?scope=${encodeURIComponent(GENERAL_PREFIX + rootId)}`;
};

type Bucket = 'open' | 'all';

const AssignedTasksInbox = () => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const [bucket, setBucket] = useState<Bucket>('open');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['inbox', 'assigned-tasks'],
        // `mine=true` is resolved from the session server-side — there is no employee id to send,
        // and deliberately no way to point it at somebody else.
        queryFn: () => getTaskList({ mine: 'true', sortBy: 'dueDate', sortDir: 'asc' }),
        staleTime: 30_000,
    });

    const rows: TaskRow[] = useMemo(
        () => (data?.data?.tasks ?? data?.tasks ?? []) as TaskRow[],
        [data],
    );
    const tasks = useMemo(
        () => (bucket === 'open' ? rows.filter((task) => !isTaskFinal(task)) : rows),
        [rows, bucket],
    );

    // One clock for the whole render, so two rows can never disagree about what "today" is.
    const now = useMemo(() => new Date(), [rows]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
                <CircularProgress size={26} />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {tasks.length === 0
                        ? 'Nothing assigned to you right now.'
                        : `${tasks.length} task${tasks.length === 1 ? '' : 's'} assigned to you.`}
                </Typography>
                <SegmentedControl
                    ariaLabel="Which assigned tasks to show"
                    value={bucket}
                    onChange={(next) => setBucket(next as Bucket)}
                    options={[
                        { value: 'open', label: 'Open' },
                        { value: 'all', label: 'All' },
                    ]}
                />
            </Stack>

            {isError && (
                <Typography variant="body2" sx={{ color: 'error.main', mb: 2 }}>
                    Your assigned tasks could not be loaded. Try again in a moment.
                </Typography>
            )}

            {tasks.length === 0 && !isError ? (
                <Stack alignItems="center" spacing={1} sx={{ py: 7, color: 'text.disabled' }}>
                    <KTIcon iconName="check-circle" className="fs-3x" />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {bucket === 'open' ? 'No open tasks' : 'No tasks assigned'}
                    </Typography>
                    <Typography variant="caption">
                        Work assigned to you appears here the moment somebody hands it over.
                    </Typography>
                </Stack>
            ) : (
                <Stack spacing={1}>
                    {tasks.map((task) => {
                        const overdue = isTaskOverdue(task, now);
                        const due = dueLabel(task.dueDate, now);
                        const open = () => navigate(boardHref(task));
                        return (
                            <Box
                                key={task.id}
                                role="link"
                                tabIndex={0}
                                onClick={open}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        open();
                                    }
                                }}
                                sx={{
                                    display: 'flex',
                                    alignItems: { xs: 'flex-start', md: 'center' },
                                    flexDirection: { xs: 'column', md: 'row' },
                                    gap: { xs: 1, md: 2 },
                                    p: 1.75,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: overdue ? alpha(theme.palette.error.main, 0.4) : 'divider',
                                    bgcolor: 'background.paper',
                                    transition: 'border-color .15s, background-color .15s',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, dark ? 0.1 : 0.04),
                                    },
                                    '&:focus-visible': {
                                        outline: `2px solid ${theme.palette.primary.main}`,
                                        outlineOffset: 2,
                                    },
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{ fontWeight: 700, color: 'text.primary', minWidth: 0 }}
                                        >
                                            {task.taskName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                                            {shortTaskId(task.id)}
                                        </Typography>
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}
                                    >
                                        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                            {task.lead?.title || 'General task'}
                                        </Typography>
                                        {task.parentTask?.taskName && (
                                            <Typography variant="caption" noWrap sx={{ color: 'text.disabled' }}>
                                                · subtask of {task.parentTask.taskName}
                                            </Typography>
                                        )}
                                        {due && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: overdue ? 'error.main' : 'text.secondary',
                                                    fontWeight: overdue ? 700 : 500,
                                                }}
                                            >
                                                · {due}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>

                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 0.5 }}
                                >
                                    <TaskPriorityBadge priority={task.priority} />
                                    <TaskStatusBadge status={task.status} />
                                    <Box sx={{ width: 90, display: { xs: 'none', sm: 'block' } }}>
                                        <TaskProgress value={task.progress} />
                                    </Box>
                                    <Box sx={{ color: 'text.disabled', lineHeight: 0, display: { xs: 'none', md: 'block' } }}>
                                        <KTIcon iconName="arrow-right" className="fs-5" />
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
};

export default AssignedTasksInbox;
