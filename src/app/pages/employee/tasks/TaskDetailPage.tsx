/**
 * Task detail — the task workspace (Phase 4 §9).
 *
 * Replaces the old three-card page. The header carries identity and the two actions people
 * actually came for (move stage, start the timer); the body is tabbed so the page does not
 * become a scroll of everything at once.
 *
 * ### Race conditions (§22)
 *
 * Every read is a React Query keyed on the task id. The old page used bare `useEffect`s with no
 * cancellation, so switching tasks quickly rendered the first task's data under the second
 * task's id. That cannot happen here: a response is filed against the key it was requested for.
 *
 * ### Activity
 *
 * Deliberately NOT faked. `RevisionEntityType` has no `TASK` member — the backend records no
 * task activity — so this shows an honest future-ready state rather than an empty feed that
 * implies data is merely missing.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import {
    Box, Button, Chip, CircularProgress, Divider, Grid, IconButton, Menu, MenuItem,
    Stack, Tab, Tabs, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { confirmDialog, toast, WhatsAppIcon } from '@app/modules/common/components/ui';
import { formatDate } from '@utils/dateFormats';
import { PATH_SEPARATOR } from '@utils/presetTaskHierarchy';
import {
    TaskRow, apiErrorMessage, employeeName, shortTaskId, isTaskOverdue, clampProgress, subtaskProgress,
} from './taskDomain';
import {
    useTask, useSubtasks, useTaskTimesheets, useTaskStatuses, useMoveTaskStage, useDeleteTask,
} from './useTaskQueries';
import {
    TaskScopeBadge, TaskStatusBadge, TaskPriorityBadge, TaskProgress, TaskAssignees, TaskStateBlock,
} from './components/primitives';
import { GENERAL_PREFIX } from './components/ProjectRail';
import { NotifyOnWhatsAppDialog, notifiableFromTask } from './components/NotifyOnWhatsAppDialog';
import TaskSubtasksPanel from './components/TaskSubtasksPanel';
import TaskTimePanel from './components/TaskTimePanel';
import TaskFormDialog from './components/TaskFormDialog';

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Grid item xs={12} sm={6} md={4}>
        {/* Each fact in its own cell. Bare label/value pairs on a white card ran together into
            one grey field once there were nine of them; a faint surface per cell gives the eye
            somewhere to stop without drawing a single line on the page. */}
        <Box
            sx={{
                height: '100%',
                px: 1.25, py: 1,
                borderRadius: 1.5,
                bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.05 : 0.028),
            }}
        >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 9.5, letterSpacing: '.06em', display: 'block' }}>
                {label}
            </Typography>
            <Box sx={{ mt: 0.5 }}>{children}</Box>
        </Box>
    </Grid>
);

/** One card surface for every panel on this page, so nothing floats on the raw background. */
const CARD_SX = {
    p: { xs: 1.5, md: 2 },
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
} as const;

/**
 * One heading treatment for every card, with its own glyph.
 *
 * The panels each set their own `subtitle2` before this, which is fine until there are six of
 * them down a page and nothing tells them apart at a glance. An icon is faster to find than a
 * word, and it costs the card no extra height.
 */
const CardTitle = ({ icon, children, action }: { icon: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Box sx={{ color: 'primary.main', lineHeight: 0 }}>
            <KTIcon iconName={icon} className="fs-5" />
        </Box>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, color: 'text.primary' }}>
            {children}
        </Typography>
        {action}
    </Stack>
);

const Plain = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body2" sx={{ color: 'text.primary' }}>{children}</Typography>
);

export const TaskDetailPage = () => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const { taskId } = useParams<{ taskId: string }>();
    const now = useMemo(() => new Date(), []);

    const [tab, setTab] = useState(0);
    const [stageAnchor, setStageAnchor] = useState<HTMLElement | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [subtaskOpen, setSubtaskOpen] = useState(false);
    const [notifyOpen, setNotifyOpen] = useState(false);
    const currentEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);

    const taskQuery = useTask(taskId);
    const subtasksQuery = useSubtasks(taskId);
    const timesheetsQuery = useTaskTimesheets(taskId);
    // Scoped to the task's own project, so the stage picker offers the lanes its board actually
    // has. Read from the query rather than the derived `task` below, which is not in scope yet.
    const statusesQuery = useTaskStatuses(
        (taskQuery.data?.data?.task ?? taskQuery.data?.task)?.leadId || undefined,
    );
    const moveStage = useMoveTaskStage();
    const deleteTask = useDeleteTask();

    const task: TaskRow | undefined = taskQuery.data?.data?.task ?? taskQuery.data?.task;
    const subtasks: TaskRow[] = subtasksQuery.data?.tasks ?? [];
    const statuses = statusesQuery.data?.taskStatuses ?? [];
    /**
     * May this reader rewrite the task, or only report progress on it? Answered by the server
     * with the same rule its update path enforces, so the page cannot offer an edit that fails
     * on save. Defaults to restricted while the answer is in flight.
     */
    const canEdit: boolean = taskQuery.data?.data?.canEdit ?? taskQuery.data?.canEdit ?? false;

    /**
     * The configuration ancestors of this task's name, e.g. ['Bill', 'hmmm'] for 'Bill → hmmm →
     * Nah'. The server sends `taskParentPath` already derived; `taskPath` minus the last entry is
     * the same thing, and is the fallback for a payload that predates the split.
     */
    const ancestors: string[] = task?.taskParentPath?.length
        ? task.taskParentPath
        : (task?.taskPath ?? []).slice(0, -1);

    /**
     * Where "Back to tasks" goes: the board this task belongs to.
     *
     * A project task returns to its project; a GENERAL task returns to its own row in the rail,
     * which is the scope the workspace uses for one. Falls back to the bare route when the task
     * has neither — nothing to point at, so the workspace picks its own default.
     */
    const backToBoard = task
        ? `/tasks?scope=${encodeURIComponent(task.leadId || `${GENERAL_PREFIX}${task.id}`)}`
        : '/tasks';

    /**
     * Who could be sent a WhatsApp note about this task — everybody on it except the reader.
     * Nobody needs a message from themselves, and the list is empty for a task nobody else is on,
     * which is what hides the action rather than a separate flag.
     */
    const notifiablePeople = useMemo(
        () => (task ? notifiableFromTask(task, currentEmployeeId) : []),
        [task, currentEmployeeId],
    );

    if (taskQuery.isLoading) {
        return <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>;
    }

    if (taskQuery.isError || !task) {
        return (
            <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
                <TaskStateBlock
                    tone="error"
                    icon="information-5"
                    title="Task not found"
                    description={
                        apiErrorMessage(taskQuery.error, "This task does not exist, or you do not have access to it.")
                    }
                    action={
                        <Button onClick={() => navigate('/tasks')} sx={{ textTransform: 'none', fontWeight: 600 }}>
                            Back to tasks
                        </Button>
                    }
                />
            </Box>
        );
    }

    const overdue = isTaskOverdue(task, now);
    const { done: subDone, total: subTotal } = subtaskProgress(subtasks);

    const handleMoveStage = async (statusId: string) => {
        setStageAnchor(null);
        try {
            await moveStage.mutateAsync({ taskId: task.id, statusId });
        } catch (error) {
            void toast({ icon: 'error', title: 'Move rejected', text: apiErrorMessage(error), timer: 3200 });
        }
    };

    /**
     * Delete. §24: the success message appears ONLY after the API confirms.
     * The old flow toasted "deleted successfully" from inside the confirm dialog, before the
     * request was even sent — so a failed delete still told the user it had worked.
     */
    // Entries already logged against this task — what the confirm dialog promises to keep.
    const loggedEntries: number = timesheetsQuery.data?.summary?.totalEntries ?? 0;

    const handleDelete = async () => {
        // The logged hours are the thing people are actually afraid of losing, so the dialog
        // answers that before it is asked. The server keeps them — deletion is soft on purpose
        // — and a timesheet still names the task it was logged against afterwards.
        const ok = await confirmDialog({
            icon: 'warning',
            title: 'Delete this task?',
            text: loggedEntries > 0
                ? `The ${loggedEntries} logged timesheet ${loggedEntries === 1 ? 'entry' : 'entries'} on this task will be kept — `
                  + 'they stay in timesheets and in the project cost. The task itself cannot be brought back.'
                : 'This cannot be undone.',
        });
        if (!ok) return;
        try {
            const result: any = await deleteTask.mutateAsync(task.id);
            void toast({
                icon: 'success',
                title: 'Task deleted',
                // The API says whether any logs were preserved; repeating its own sentence keeps
                // the two surfaces from drifting into different promises.
                text: result?.message && result.message !== 'Task deleted successfully'
                    ? result.message
                    : undefined,
                timer: 3200,
            });
            // Back to the board it was on — the same destination as the Back button, because
            // deleting a task does not change which project you were working in.
            navigate(backToBoard);
        } catch (error) {
            // Only live subtasks block a delete now, and the server's message names how many —
            // far more useful than a generic failure.
            void toast({ icon: 'error', title: 'Cannot delete task', text: apiErrorMessage(error), timer: 4200 });
        }
    };

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
            {/* ── header ── */}
            <Stack spacing={1.5}>
                {/* Back to THIS task's board, not to whatever the workspace would land on by
                    itself. Derived from the task rather than from history, so it is equally right
                    when the page was opened from a link, a notification or a fresh tab — where
                    `navigate(-1)` would leave the app entirely. */}
                <Button
                    onClick={() => navigate(backToBoard)}
                    startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
                    // A real control, not grey text with an arrow. This is the only way out of a
                    // full-page detail view, and it was the quietest thing on the screen — set in
                    // the same disabled grey used for placeholder values two cards below it.
                    sx={{
                        alignSelf: 'flex-start',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 999,
                        pl: 1.25, pr: 2, py: 0.75,
                        color: 'primary.main',
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.28),
                        bgcolor: alpha(theme.palette.primary.main, dark ? 0.16 : 0.06),
                        transition: 'background-color .15s, border-color .15s, transform .15s',
                        // The arrow leads on hover — the gesture the button describes.
                        '& .MuiButton-startIcon': { transition: 'transform .15s' },
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, dark ? 0.26 : 0.12),
                            borderColor: 'primary.main',
                            '& .MuiButton-startIcon': { transform: 'translateX(-2px)' },
                        },
                        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                    }}
                >
                    Back to tasks
                </Button>

                {/* The header is a SURFACE now, like every panel below it. It used to sit on the
                    raw page background, which made the most important thing on the screen the
                    only thing without a card — and left the title, the badges and the actions
                    reading as three unrelated rows. */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    alignItems={{ md: 'flex-start' }}
                    sx={{
                        ...CARD_SX,
                        p: { xs: 1.75, md: 2.25 },
                        // A stage-coloured keyline: the one fact about a task that changes most
                        // often, readable before a word has been read.
                        borderLeft: '4px solid',
                        borderLeftColor: task.status?.color || theme.palette.primary.main,
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <TaskScopeBadge scope={task.taskScope} />
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                                {shortTaskId(task.id)}
                            </Typography>
                            {overdue && (
                                <Chip size="small" label="Overdue" sx={{
                                    height: 18, fontSize: 10, fontWeight: 700, borderRadius: 0.75,
                                    bgcolor: alpha(theme.palette.error.main, 0.14), color: theme.palette.error.main,
                                }} />
                            )}
                        </Stack>
                        {task.parentTaskId && (
                            <Button
                                size="small"
                                onClick={() => navigate(`/tasks/${task.parentTaskId}`)}
                                startIcon={<KTIcon iconName="tree" className="fs-8" />}
                                sx={{ textTransform: 'none', p: 0, minWidth: 0, mb: 0.25, color: 'text.secondary', fontWeight: 600 }}
                            >
                                Subtask of {task.parentTask?.taskName || 'another task'}
                            </Button>
                        )}
                        {/* Where this task sits in the CONFIGURATION tree — the ancestors of the
                            preset it was created from, derived server-side from `presetTaskId`.
                            Above the name rather than beside it, because it reads as the address
                            of the thing whose name follows: Bill → hmmm → **Nah**.

                            Absent for a custom-named task, which has no place in that tree, so
                            the line simply does not appear. */}
                        {!!ancestors.length && (
                            <Stack
                                direction="row" alignItems="center" flexWrap="wrap" useFlexGap
                                sx={{ mb: 0.25, columnGap: 0.5, rowGap: 0.25 }}
                            >
                                {ancestors.map((step, i) => (
                                    <Stack key={`${step}-${i}`} direction="row" alignItems="center" spacing={0.5}>
                                        {i > 0 && (
                                            <Box sx={{ color: 'text.disabled', lineHeight: 0, mt: '1px' }}>
                                                <KTIcon iconName="right" className="fs-9" />
                                            </Box>
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.4 }}
                                        >
                                            {step}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                        <Typography variant="h5" component="div" sx={{ fontWeight: 700, lineHeight: 1.25, color: 'text.primary' }}>
                            {task.taskName}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, minWidth: 0 }}>
                            <Box sx={{ color: 'text.disabled', lineHeight: 0 }}>
                                <KTIcon iconName={task.taskScope === 'PROJECT' ? 'office-bag' : 'home-2'} className="fs-7" />
                            </Box>
                            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
                                {task.taskScope === 'PROJECT'
                                    ? (task.lead?.title || 'Project unavailable')
                                    : 'Internal task — no project'}
                            </Typography>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {/* The stage control carries the stage's configured colour, so the
                            control and the badge in the card below cannot disagree. */}
                        <Button
                            variant="outlined"
                            onClick={(e) => setStageAnchor(e.currentTarget)}
                            disabled={moveStage.isPending}
                            startIcon={
                                <Box sx={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    bgcolor: task.status?.color || theme.palette.primary.main,
                                }} />
                            }
                            endIcon={<KTIcon iconName="down" className="fs-8" />}
                            sx={{
                                textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
                                borderColor: alpha(task.status?.color || theme.palette.primary.main, 0.4),
                                color: 'text.primary',
                                '&:hover': {
                                    borderColor: task.status?.color || theme.palette.primary.main,
                                    bgcolor: alpha(task.status?.color || theme.palette.primary.main, 0.06),
                                },
                            }}
                        >
                            {task.status?.name ?? 'No stage'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setEditOpen(true)}
                            startIcon={<KTIcon iconName={canEdit ? 'pencil' : 'chart-simple'} className="fs-7" />}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                        >
                            {canEdit ? 'Edit' : 'Update progress'}
                        </Button>
                        {canEdit && (
                        <Tooltip title="Delete this task">
                            <IconButton
                                onClick={handleDelete}
                                aria-label="Delete task"
                                sx={{
                                    border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
                                    color: 'text.secondary',
                                    // Neutral until reached for: destructive controls should not
                                    // shout from a page you are only reading.
                                    '&:hover': {
                                        color: 'error.main',
                                        borderColor: alpha(theme.palette.error.main, 0.5),
                                        bgcolor: alpha(theme.palette.error.main, 0.08),
                                    },
                                }}
                            >
                                <KTIcon iconName="trash" className="fs-6" />
                            </IconButton>
                        </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Stack>

            <Menu anchorEl={stageAnchor} open={!!stageAnchor} onClose={() => setStageAnchor(null)}>
                <MenuItem disabled sx={{ opacity: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Move to stage
                </MenuItem>
                {statuses.map((s: { id: string; name: string; color?: string; isFinal?: boolean }) => (
                    <MenuItem key={s.id} selected={s.id === task.statusId} onClick={() => handleMoveStage(s.id)}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color || 'primary.main', mr: 1.25 }} />
                        {s.name}{s.isFinal ? ' (final)' : ''}
                    </MenuItem>
                ))}
            </Menu>

            <Divider sx={{ my: 2 }} />

            {/* ── tabs ── */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 40, mb: 2, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 } }}
            >
                <Tab label="Overview" />
                <Tab label={`Subtasks${subtasks.length ? ` (${subtasks.length})` : ''}`} />
                <Tab label="Timesheet" />
                <Tab label="Activity" />
            </Tabs>

            {tab === 0 && (
                <Grid container spacing={2}>
                    {/* Main column. The page previously ran everything full-width down the left,
                        leaving most of a 1400px page empty; the facts now sit in a card and the
                        at-a-glance numbers in a side panel, so the width is actually used. */}
                    <Grid item xs={12} md={8}>
                      <Stack spacing={2}>
                        <Box sx={CARD_SX}>
                            <CardTitle icon="document">Description</CardTitle>
                            <Typography variant="body2" sx={{ color: task.taskDescription ? 'text.primary' : 'text.disabled', whiteSpace: 'pre-wrap' }}>
                                {task.taskDescription || 'No description provided.'}
                            </Typography>
                        </Box>

                        <Box sx={CARD_SX}>
                        <CardTitle icon="information-5">Task information</CardTitle>
                        <Grid container spacing={2}>
                            <InfoRow label="Stage"><TaskStatusBadge status={task.status} /></InfoRow>
                            <InfoRow label="Priority">
                                {task.priority ? <TaskPriorityBadge priority={task.priority} /> : <Plain>—</Plain>}
                            </InfoRow>
                            {/* "Assign to", matching the form. The noun read as a property of the
                                task and left people asking whether it meant who assigned it. */}
                            <InfoRow label="Assign to">
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                                    <TaskAssignees assignees={task.assignees} fallback={task.assignedTo} size={26} showName />
                                    {/* The manual third channel. Offered to whoever may edit the
                                        task — the same people who could have assigned it — and
                                        long after the assignment, because a reminder is as often
                                        the point as the first announcement. */}
                                    {canEdit && notifiablePeople.length > 0 && (
                                        <Tooltip title="Send a WhatsApp note from your own number">
                                            <IconButton
                                                size="small"
                                                aria-label="Send a WhatsApp note"
                                                onClick={() => setNotifyOpen(true)}
                                                sx={{ color: 'success.main' }}
                                            >
                                                <WhatsAppIcon size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </InfoRow>
                            <InfoRow label="Scope"><TaskScopeBadge scope={task.taskScope} /></InfoRow>
                            {!!ancestors.length && (
                                <InfoRow label="Hierarchy">
                                    <Plain>{[...ancestors, task.taskName].join(PATH_SEPARATOR)}</Plain>
                                </InfoRow>
                            )}
                            <InfoRow label="Project">
                                <Plain>{task.taskScope === 'PROJECT' ? (task.lead?.title || '—') : 'Not applicable'}</Plain>
                            </InfoRow>
                            <InfoRow label="Due date">
                                <Plain>{task.dueDate ? formatDate(task.dueDate) : '—'}</Plain>
                            </InfoRow>
                            <InfoRow label="Start date">
                                <Plain>{task.startDate ? formatDate(task.startDate) : '—'}</Plain>
                            </InfoRow>
                            <InfoRow label="Created">
                                <Plain>{task.createdAt ? formatDate(task.createdAt) : '—'}</Plain>
                            </InfoRow>
                            <InfoRow label="Created by">
                                <Plain>{employeeName(task.createdBy)}</Plain>
                            </InfoRow>

                            {/* §13 — deliverable is PROJECT-only and never rendered for GENERAL. */}
                            {task.taskScope === 'PROJECT' && task.deliverable && (
                                <InfoRow label="Deliverable">
                                    <Stack direction="row" spacing={0.75} alignItems="center">
                                        <Plain>{task.deliverable.name || '—'}</Plain>
                                        {task.deliverable.status && (
                                            <Chip size="small" label={task.deliverable.status} sx={{ height: 18, fontSize: 10, borderRadius: 0.75 }} />
                                        )}
                                    </Stack>
                                </InfoRow>
                            )}
                        </Grid>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Side panel — the three numbers people open a task to check. */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                            <Box sx={CARD_SX}>
                                {/* The number leads, because it is the whole point of the panel;
                                    the bar under it is the same figure, read at a glance. */}
                                <CardTitle
                                    icon="chart-simple"
                                    action={
                                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: 'primary.main' }}>
                                            {clampProgress(task.progress)}%
                                        </Typography>
                                    }
                                >
                                    Progress
                                </CardTitle>
                                <TaskProgress value={task.progress} height={8} />
                            </Box>

                            <Box sx={CARD_SX}>
                                <CardTitle
                                    icon="tree"
                                    action={subTotal ? (
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                            {subDone}/{subTotal}
                                        </Typography>
                                    ) : undefined}
                                >
                                    Subtasks
                                </CardTitle>
                                {subtasks.length === 0 ? (
                                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                        None yet — break this task down from the Subtasks tab.
                                    </Typography>
                                ) : (
                                    <>
                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                                            {subDone} of {subTotal} completed
                                        </Typography>
                                        <TaskProgress value={subTotal ? (subDone / subTotal) * 100 : 0} height={6} />
                                    </>
                                )}
                            </Box>

                            <Box sx={CARD_SX}>
                                <CardTitle icon="time">Time</CardTitle>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Logged</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {timesheetsQuery.data?.summary?.totalHours
                                            ? `${timesheetsQuery.data.summary.totalHours}h`
                                            : '—'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Entries</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {timesheetsQuery.data?.summary?.totalEntries ?? 0}
                                    </Typography>
                                </Stack>
                                {/* Money only for those entitled to it — an administrator, or this
                                    project's primary manager. The row is OMITTED rather than shown
                                    as "Restricted": a redaction label advertises that a figure
                                    exists and that you are not trusted with it, on a panel most
                                    people open to read hours. The server redacts the value either
                                    way; this only decides whether to draw the line. */}
                                {timesheetsQuery.data?.costVisible && (
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Labour cost</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {timesheetsQuery.data?.summary?.totalCostFormatted || '—'}
                                        </Typography>
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>
            )}

            {tab === 1 && (
                <TaskSubtasksPanel
                    parent={task}
                    subtasks={subtasks}
                    now={now}
                    isLoading={subtasksQuery.isLoading}
                    isError={subtasksQuery.isError}
                    error={subtasksQuery.error}
                    onOpenTask={(id) => navigate(`/tasks/${id}`)}
                    onAddSubtask={() => setSubtaskOpen(true)}
                />
            )}

            {tab === 2 && (
                <TaskTimePanel
                    task={task}
                    data={timesheetsQuery.data}
                    isLoading={timesheetsQuery.isLoading}
                    isError={timesheetsQuery.isError}
                    error={timesheetsQuery.error}
                />
            )}

            {tab === 3 && (
                <TaskStateBlock
                    icon="time"
                    title="Activity history is not available yet"
                    description="Task changes are not yet recorded in the audit trail — RevisionEntityType has no TASK member. This tab is a placeholder for that work; nothing is being hidden."
                />
            )}

            <TaskFormDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                task={task as never}
                progressOnly={!canEdit}
                onSaved={() => taskQuery.refetch()}
            />

            <NotifyOnWhatsAppDialog
                open={notifyOpen}
                onClose={() => setNotifyOpen(false)}
                taskId={task.id}
                taskName={task.taskName}
                people={notifiablePeople}
            />

            <TaskFormDialog
                open={subtaskOpen}
                onClose={() => setSubtaskOpen(false)}
                // `lead` rides along so the subtask form can SHOW the project it inherits —
                // available-projects is empty for anyone without authority on it.
                parentTask={{
                    id: task.id, taskName: task.taskName, taskScope: task.taskScope,
                    leadId: task.leadId, lead: task.lead ?? null,
                    // Seeds the subtask's own preset node, so it opens where the parent sits in
                    // the tree instead of at the top of it.
                    presetTaskId: task.presetTaskId ?? null, taskType: task.taskType,
                }}
                onSaved={() => subtasksQuery.refetch()}
            />
        </Box>
    );
};

export default TaskDetailPage;
