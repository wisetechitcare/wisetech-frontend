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
import {
    Box, Button, Chip, CircularProgress, Divider, Grid, IconButton, Menu, MenuItem,
    Stack, Tab, Tabs, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { confirmDialog, toast } from '@app/modules/common/components/ui';
import { formatDate } from '@utils/dateFormats';
import {
    TaskRow, apiErrorMessage, employeeName, shortTaskId, isTaskOverdue, clampProgress, subtaskProgress,
} from './taskDomain';
import {
    useTask, useSubtasks, useTaskTimesheets, useTaskStatuses, useMoveTaskStage, useDeleteTask,
} from './useTaskQueries';
import {
    TaskScopeBadge, TaskStatusBadge, TaskPriorityBadge, TaskProgress, AssigneeAvatar, TaskStateBlock,
} from './components/primitives';
import TaskSubtasksPanel from './components/TaskSubtasksPanel';
import TaskTimePanel from './components/TaskTimePanel';
import TaskFormDialog from './components/TaskFormDialog';

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', display: 'block' }}>
            {label}
        </Typography>
        <Box sx={{ mt: 0.4 }}>{children}</Box>
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

const Plain = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="body2" sx={{ color: 'text.primary' }}>{children}</Typography>
);

export const TaskDetailPage = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { taskId } = useParams<{ taskId: string }>();
    const now = useMemo(() => new Date(), []);

    const [tab, setTab] = useState(0);
    const [stageAnchor, setStageAnchor] = useState<HTMLElement | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [subtaskOpen, setSubtaskOpen] = useState(false);

    const taskQuery = useTask(taskId);
    const subtasksQuery = useSubtasks(taskId);
    const timesheetsQuery = useTaskTimesheets(taskId);
    const statusesQuery = useTaskStatuses();
    const moveStage = useMoveTaskStage();
    const deleteTask = useDeleteTask();

    const task: TaskRow | undefined = taskQuery.data?.data?.task ?? taskQuery.data?.task;
    const subtasks: TaskRow[] = subtasksQuery.data?.tasks ?? [];
    const statuses = statusesQuery.data?.taskStatuses ?? [];

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
    const handleDelete = async () => {
        const ok = await confirmDialog({
            icon: 'warning',
            title: 'Delete this task?',
            text: 'This cannot be undone.',
        });
        if (!ok) return;
        try {
            await deleteTask.mutateAsync(task.id);
            void toast({ icon: 'success', title: 'Task deleted' });
            navigate('/tasks');
        } catch (error) {
            // The server blocks deletion when subtasks or timesheets exist, and its message
            // names which — that reason is far more useful than a generic failure.
            void toast({ icon: 'error', title: 'Cannot delete task', text: apiErrorMessage(error), timer: 4200 });
        }
    };

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
            {/* ── header ── */}
            <Stack spacing={1.5}>
                <Button
                    onClick={() => navigate('/tasks')}
                    startIcon={<KTIcon iconName="arrow-left" className="fs-6" />}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}
                >
                    Back to tasks
                </Button>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
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
                        <Typography variant="h5" component="div" sx={{ fontWeight: 700, lineHeight: 1.25, color: 'text.primary' }}>
                            {task.taskName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                            {task.taskScope === 'PROJECT'
                                ? (task.lead?.title || 'Project unavailable')
                                : 'Internal task — no project'}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                            variant="outlined"
                            onClick={(e) => setStageAnchor(e.currentTarget)}
                            disabled={moveStage.isPending}
                            endIcon={<KTIcon iconName="down" className="fs-8" />}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                        >
                            {task.status?.name ?? 'No stage'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setEditOpen(true)}
                            startIcon={<KTIcon iconName="pencil" className="fs-7" />}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                        >
                            Edit
                        </Button>
                        <IconButton onClick={handleDelete} aria-label="Delete task" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                            <KTIcon iconName="trash" className="fs-6" />
                        </IconButton>
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Description</Typography>
                            <Typography variant="body2" sx={{ color: task.taskDescription ? 'text.primary' : 'text.disabled', whiteSpace: 'pre-wrap' }}>
                                {task.taskDescription || 'No description provided.'}
                            </Typography>
                        </Box>

                        <Box sx={CARD_SX}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>Task information</Typography>
                        <Grid container spacing={2}>
                            <InfoRow label="Stage"><TaskStatusBadge status={task.status} /></InfoRow>
                            <InfoRow label="Priority">
                                {task.priority ? <TaskPriorityBadge priority={task.priority} /> : <Plain>—</Plain>}
                            </InfoRow>
                            <InfoRow label="Assignee"><AssigneeAvatar employee={task.assignedTo} showName /></InfoRow>
                            <InfoRow label="Scope"><TaskScopeBadge scope={task.taskScope} /></InfoRow>
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
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                    Progress — {clampProgress(task.progress)}%
                                </Typography>
                                <TaskProgress value={task.progress} height={8} />
                            </Box>

                            <Box sx={CARD_SX}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>Subtasks</Typography>
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
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>Time</Typography>
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
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Labour cost</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {/* The server decides whether cost may be shown; the client never guesses. */}
                                        {timesheetsQuery.data?.costVisible
                                            ? (timesheetsQuery.data?.summary?.totalCostFormatted || '—')
                                            : 'Restricted'}
                                    </Typography>
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
                onSaved={() => taskQuery.refetch()}
            />

            <TaskFormDialog
                open={subtaskOpen}
                onClose={() => setSubtaskOpen(false)}
                parentTask={{ id: task.id, taskName: task.taskName, taskScope: task.taskScope, leadId: task.leadId }}
                onSaved={() => subtasksQuery.refetch()}
            />
        </Box>
    );
};

export default TaskDetailPage;
