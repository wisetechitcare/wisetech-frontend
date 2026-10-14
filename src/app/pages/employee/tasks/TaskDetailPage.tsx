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
    Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { confirmDialog, toast, WhatsAppIcon } from '@app/modules/common/components/ui';
import { formatDate } from '@utils/dateFormats';
import { PATH_SEPARATOR } from '@utils/presetTaskHierarchy';
import {
    TaskRow, apiErrorMessage, shortTaskId, isTaskOverdue, clampProgress, subtaskProgress,
} from './taskDomain';
import {
    useTask, useSubtasks, useTaskTimesheets, useTaskStatuses, useMoveTaskStage, useDeleteTask,
} from './useTaskQueries';
import {
    TaskScopeBadge, TaskProgress, TaskAssignees, TaskStateBlock, AssigneeAvatar, primaryPillSx,
} from './components/primitives';
import { GENERAL_PREFIX } from './components/ProjectRail';
import { NotifyOnWhatsAppDialog, notifiableFromTask } from './components/NotifyOnWhatsAppDialog';
import TaskSubtasksPanel from './components/TaskSubtasksPanel';
import TaskTimePanel from './components/TaskTimePanel';
import TaskFormDialog from './components/TaskFormDialog';
import { useProjectDeliverables } from './useProjectDeliverables';
import { PageTrail } from '@metronic/layout/core';
import StatusGlyph from './components/StatusGlyph';

const InfoRow = ({ label, icon, children }: { label: string; icon?: string; children: React.ReactNode }) => (
    <Grid item xs={12} sm={6} md={4}>
        {/* Each fact in its own cell. Bare label/value pairs on a white card ran together into
            one grey field once there were nine of them; a faint surface per cell gives the eye
            somewhere to stop without drawing a single line on the page. */}
        <Box
            sx={{
                height: '100%',
                px: 1.75, py: 1.5,
                borderRadius: 3,
                bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.05 : 0.028),
            }}
        >
            <Stack direction="row" spacing={0.75} alignItems="center">
                {icon && (
                    <Box sx={{ color: 'text.secondary', lineHeight: 0, flexShrink: 0 }}>
                        <KTIcon iconName={icon} className="fs-5" />
                    </Box>
                )}
                <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 13 }}>
                    {label}
                </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75, minWidth: 0 }}>
                {/* The shared badges and name labels are sized for dense boards; in a detail cell
                    they read at body size, so the facts are as legible as the headings above them. */}
                <Box sx={{
                    minWidth: 0,
                    '& .MuiTypography-root': { fontSize: 14.5 },
                    '& .MuiChip-root': { height: 28, fontSize: 13, px: 0.5 },
                }}>
                    {children}
                </Box>
            </Stack>
        </Box>
    </Grid>
);

/** One card surface for every panel on this page, so nothing floats on the raw background. */
const CARD_SX = {
    p: { xs: 2, md: 2.5 },
    borderRadius: 4,
    boxShadow: '0 1px 2px rgba(16,24,40,.04)',
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
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
        <Box sx={{
            width: 34, height: 34, borderRadius: 2.5, display: 'grid', placeItems: 'center', flexShrink: 0,
            color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.08),
        }}>
            <KTIcon iconName={icon} className="fs-5" />
        </Box>
        <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 15.5, color: 'text.primary' }}>
            {children}
        </Typography>
        {action}
    </Stack>
);

/** Priority as a real chip: its configured colour as a dot, tint and border. */
const PriorityChip = ({ priority }: { priority: { name: string; color?: string | null } }) => {
    const theme = useTheme();
    const c = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(priority.color ?? '') ? (priority.color as string) : theme.palette.text.secondary;
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, height: 28, borderRadius: 999,
                fontSize: 13, fontWeight: 700, color: c, bgcolor: alpha(c, 0.12), border: '1px solid', borderColor: alpha(c, 0.3),
            }}
        >
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />
            {priority.name}
        </Box>
    );
};

const Plain = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{children}</Typography>
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
    // The deliverable stage this task moves — the same board the project's Deliverables tab reads.
    const projectDeliverables = useProjectDeliverables(task?.taskScope === 'PROJECT' ? task.leadId : null);
    const deliverableStage = projectDeliverables.stageOf(task?.presetTaskId);
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
    // `/tasks/tasks` names the board tab: /tasks alone opens the section's Overview, which is
    // not where the reader was, and leaves the scope below unread because the board never mounts.
    const backToBoard = task
        ? `/tasks/tasks?scope=${encodeURIComponent(task.leadId || `${GENERAL_PREFIX}${task.id}`)}`
        : '/tasks/tasks';

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
                        <Button onClick={() => navigate('/tasks/tasks')} sx={{ textTransform: 'none', fontWeight: 600 }}>
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

    // The stage's colour tints the whole header; only a hex tints cleanly, so anything else
    // (a missing or named colour) falls back to the brand.
    const stageColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(task.status?.color ?? '')
        ? (task.status?.color as string)
        : theme.palette.primary.main;
    const progress = clampProgress(task.progress);

    const TABS = [
        { label: 'Overview', icon: 'element-11' },
        { label: 'Subtasks', icon: 'row-horizontal', count: subtasks.length || undefined },
        { label: 'Timesheet', icon: 'time' },
        { label: 'Activity', icon: 'chart-line-up' },
    ];

    return (
        <Box sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2.5 } }}>
            {/* Tasks › <this task's board> › <this task>. The board crumb opens the same scoped
                board "Back to tasks" does. */}
            <PageTrail
                items={[
                    { title: task.taskScope === 'PROJECT' ? (task.lead?.title || 'Project') : 'General', path: backToBoard },
                    { title: task.taskName },
                ]}
            />

            {/* Back to THIS task's board, not to whatever the workspace would land on by itself.
                Derived from the task rather than from history, so it is equally right when the
                page was opened from a link, a notification or a fresh tab. Sits on the page's
                own left edge, above the header it leads out of. */}
            <Button
                onClick={() => navigate(backToBoard)}
                startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
                sx={{
                    mb: 1.5,
                    textTransform: 'none', fontWeight: 700, fontSize: 13,
                    borderRadius: 999, pl: 1.5, pr: 2, py: 0.6,
                    color: 'text.primary', bgcolor: 'background.paper',
                    border: '1px solid', borderColor: 'divider',
                    boxShadow: '0 1px 2px rgba(16,24,40,.06)',
                    '& .MuiButton-startIcon': { transition: 'transform .15s' },
                    '&:hover': {
                        bgcolor: 'background.paper', borderColor: 'primary.main', color: 'primary.main',
                        '& .MuiButton-startIcon': { transform: 'translateX(-2px)' },
                    },
                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                }}
            >
                Back to tasks
            </Button>

            {/* ── header — tinted by the stage, led by its animated glyph ── */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 2, md: 2.5 }}
                alignItems={{ md: 'center' }}
                sx={{
                    ...CARD_SX,
                    px: { xs: 2, md: 2.5 }, py: { xs: 1.75, md: 1.75 },
                    background: `linear-gradient(115deg, ${alpha(stageColor, dark ? 0.18 : 0.1)} 0%, ${theme.palette.background.paper} 62%)`,
                    borderColor: alpha(stageColor, 0.22),
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                        sx={{
                            width: { xs: 46, md: 52 }, height: { xs: 46, md: 52 }, flexShrink: 0, borderRadius: 3,
                            display: 'grid', placeItems: 'center',
                            bgcolor: alpha(stageColor, dark ? 0.24 : 0.14),
                            border: '1px solid', borderColor: alpha(stageColor, 0.25),
                        }}
                    >
                        <StatusGlyph key={task.statusId ?? 'none'} icon={task.status?.icon} color={stageColor} size={28} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                        <Stack
                            direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap
                            sx={{ mb: 0.25, '& .MuiChip-root': { borderRadius: 999, px: 0.5 } }}
                        >
                            <TaskScopeBadge scope={task.taskScope} />
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                                {shortTaskId(task)}
                            </Typography>
                            {overdue && (
                                <Chip size="small" label="Overdue" sx={{
                                    height: 20, fontSize: 10.5, fontWeight: 700, borderRadius: 999,
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
                        {/* Where this task sits in the configuration tree — the address of the
                            name that follows it. Absent for a custom-named task. */}
                        {!!ancestors.length && (
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', lineHeight: 1.4 }}>
                                {ancestors.join(' › ')}
                            </Typography>
                        )}
                        <Typography
                            component="h1"
                            sx={{ fontSize: { xs: 19, md: 22 }, fontWeight: 800, lineHeight: 1.2, color: 'text.primary', letterSpacing: '-0.01em' }}
                        >
                            {task.taskName}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.4, minWidth: 0 }}>
                            <Box sx={{ color: 'text.secondary', lineHeight: 0 }}>
                                <KTIcon iconName={task.taskScope === 'PROJECT' ? 'office-bag' : 'home-2'} className="fs-6" />
                            </Box>
                            <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {task.taskScope === 'PROJECT'
                                    ? (task.lead?.title || 'Project unavailable')
                                    : 'Internal task — no project'}
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignItems="center">
                    {/* The stage control wears the stage's colour and glyph, so the control and the
                        header it sits in say the same thing. */}
                    <Button
                        onClick={(e) => setStageAnchor(e.currentTarget)}
                        disabled={moveStage.isPending}
                        startIcon={<StatusGlyph key={`pill-${task.statusId ?? 'none'}`} icon={task.status?.icon} color={stageColor} size={18} />}
                        endIcon={<KTIcon iconName="down" className="fs-6" />}
                        sx={{
                            textTransform: 'none', fontWeight: 700, borderRadius: 999, px: 2.25, height: 40, fontSize: 14,
                            color: stageColor, bgcolor: 'background.paper',
                            border: '1px solid', borderColor: alpha(stageColor, 0.4),
                            '&:hover': { bgcolor: alpha(stageColor, 0.08), borderColor: stageColor },
                        }}
                    >
                        {task.status?.name ?? 'No stage'}
                    </Button>
                    <Button
                        onClick={() => setEditOpen(true)}
                        startIcon={<KTIcon iconName={canEdit ? 'pencil' : 'chart-simple'} className="fs-5" />}
                        sx={{
                            textTransform: 'none', fontWeight: 700, borderRadius: 999, px: 2.25, height: 40, fontSize: 14,
                            color: 'text.primary', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                            '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main', color: 'primary.main' },
                        }}
                    >
                        {canEdit ? 'Edit' : 'Update progress'}
                    </Button>
                    {canEdit && (
                        <Tooltip title="Delete this task">
                            <IconButton
                                onClick={handleDelete}
                                aria-label="Delete task"
                                sx={{
                                    width: 40, height: 40, bgcolor: 'background.paper',
                                    border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                                    // Neutral until reached for: destructive controls should not
                                    // shout from a page you are only reading.
                                    '&:hover': {
                                        color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08),
                                        borderColor: alpha(theme.palette.error.main, 0.5),
                                    },
                                }}
                            >
                                <KTIcon iconName="trash" className="fs-4" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            <Menu anchorEl={stageAnchor} open={!!stageAnchor} onClose={() => setStageAnchor(null)}>
                <MenuItem disabled sx={{ opacity: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Move to stage
                </MenuItem>
                {statuses.map((s: { id: string; name: string; color?: string; isFinal?: boolean; icon?: string | null }) => (
                    <MenuItem key={s.id} selected={s.id === task.statusId} onClick={() => handleMoveStage(s.id)} sx={{ gap: 1.25 }}>
                        <StatusGlyph icon={s.icon} color={/^#/.test(s.color ?? '') ? (s.color as string) : theme.palette.primary.main} size={16} />
                        {s.name}{s.isFinal ? ' (final)' : ''}
                    </MenuItem>
                ))}
            </Menu>

            {/* ── tabs — pills, each with its glyph ── */}
            <Stack
                direction="row"
                spacing={0.75}
                role="tablist"
                aria-label="Task sections"
                sx={{ my: 2.25, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
            >
                {TABS.map((t, i) => {
                    const active = tab === i;
                    return (
                        <Button
                            key={t.label}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(i)}
                            startIcon={<KTIcon iconName={t.icon} className="fs-5" />}
                            sx={active ? primaryPillSx : {
                                flexShrink: 0, textTransform: 'none', fontWeight: 700, fontSize: 13.5,
                                borderRadius: 2.5, px: 2, py: 0.9, color: 'text.secondary',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' },
                            }}
                        >
                            {t.label}
                            {t.count ? (
                                <Box component="span" sx={{
                                    ml: 0.75, px: 0.75, borderRadius: 999, fontSize: 11, lineHeight: '18px',
                                    bgcolor: active ? 'rgba(255,255,255,.25)' : alpha(theme.palette.primary.main, 0.1),
                                }}>
                                    {t.count}
                                </Box>
                            ) : null}
                        </Button>
                    );
                })}
            </Stack>

            {tab === 0 && (
                <Grid container spacing={2.25}>
                    <Grid item xs={12} md={8}>
                      <Stack spacing={2.25}>
                        <Box sx={CARD_SX}>
                            <CardTitle icon="information-5">Task Information</CardTitle>
                            <Grid container spacing={1.5}>
                                <InfoRow label="Priority" icon="flag">
                                    {task.priority ? <PriorityChip priority={task.priority} /> : <Plain>—</Plain>}
                                </InfoRow>
                                {/* "Assign to", matching the form. */}
                                <InfoRow label="Assign to" icon="people">
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                                        <TaskAssignees assignees={task.assignees} fallback={task.assignedTo} size={32} showName />
                                        {/* The manual third channel — offered to whoever may edit the
                                            task, long after the assignment too. */}
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
                                {!!ancestors.length && (
                                    <InfoRow label="Hierarchy" icon="abstract-26">
                                        <Plain>{[...ancestors, task.taskName].join(PATH_SEPARATOR)}</Plain>
                                    </InfoRow>
                                )}
                                <InfoRow label="Project" icon="folder">
                                    <Plain>{task.taskScope === 'PROJECT' ? (task.lead?.title || '—') : 'Not applicable'}</Plain>
                                </InfoRow>
                                {deliverableStage && (
                                    <InfoRow label="Deliverable" icon="document">
                                        <Plain>{deliverableStage}</Plain>
                                    </InfoRow>
                                )}
                                <InfoRow label="Due date" icon="calendar">
                                    <Plain>{task.dueDate ? formatDate(task.dueDate) : '—'}</Plain>
                                </InfoRow>
                                <InfoRow label="Start date" icon="calendar">
                                    <Plain>{task.startDate ? formatDate(task.startDate) : '—'}</Plain>
                                </InfoRow>
                                <InfoRow label="Created" icon="calendar">
                                    <Plain>{task.createdAt ? formatDate(task.createdAt) : '—'}</Plain>
                                </InfoRow>
                                <InfoRow label="Created by" icon="profile-circle">
                                    <AssigneeAvatar employee={task.createdBy} size={32} showName />
                                </InfoRow>

                                {/* §13 — deliverable is PROJECT-only and never rendered for GENERAL. */}
                                {task.taskScope === 'PROJECT' && task.deliverable && (
                                    <InfoRow label="Billing deliverable" icon="document">
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

                        <Box sx={CARD_SX}>
                            <CardTitle icon="document">Description</CardTitle>
                            <Typography variant="body2" sx={{ color: task.taskDescription ? 'text.primary' : 'text.disabled', whiteSpace: 'pre-wrap' }}>
                                {task.taskDescription || 'No description provided.'}
                            </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Side panel — the three numbers people open a task to check. */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={2.25}>
                            <Box sx={CARD_SX}>
                                <CardTitle
                                    icon="chart-simple"
                                    action={
                                        <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: progress >= 100 ? 'success.main' : 'text.primary' }}>
                                            {progress}%
                                        </Typography>
                                    }
                                >
                                    Progress
                                </CardTitle>
                                <TaskProgress value={task.progress} height={8} />
                            </Box>

                            <Box sx={CARD_SX}>
                                <CardTitle
                                    icon="row-horizontal"
                                    action={
                                        <Box sx={{
                                            px: 1, borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: '22px',
                                            color: 'text.secondary', bgcolor: alpha(theme.palette.text.primary, dark ? 0.08 : 0.05),
                                        }}>
                                            {subDone} / {subTotal}
                                        </Box>
                                    }
                                >
                                    Subtasks
                                </CardTitle>
                                {subtasks.length === 0 ? (
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.disabled' }}>
                                        <KTIcon iconName="check-circle" className="fs-4" />
                                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                            None yet — break this task down from the Subtasks tab.
                                        </Typography>
                                    </Stack>
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
                                <Stack spacing={1}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Logged</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {timesheetsQuery.data?.summary?.totalHours
                                                ? `${timesheetsQuery.data.summary.totalHours}h`
                                                : '—'}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Entries</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {timesheetsQuery.data?.summary?.totalEntries ?? 0}
                                        </Typography>
                                    </Stack>
                                    {/* Money only for those entitled to it; the row is omitted rather
                                        than shown as "Restricted". The server redacts either way. */}
                                    {timesheetsQuery.data?.costVisible && (
                                        <>
                                            <Divider />
                                            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Labour cost</Typography>
                                                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
                                                    {timesheetsQuery.data?.summary?.totalCostFormatted || '—'}
                                                </Typography>
                                            </Stack>
                                        </>
                                    )}
                                </Stack>
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
