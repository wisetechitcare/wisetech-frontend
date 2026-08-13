/**
 * Subtasks (Phase 4 §10).
 *
 * Depth is capped at **1** by the backend: a task may have subtasks, a subtask may not. The UI
 * honours that structurally — a subtask row has no "add subtask" action at all, rather than
 * offering one and letting the API refuse it.
 *
 * No automatic parent progress rollup. That was explicitly deferred, because an automatic
 * rollup would silently overwrite a manager's own assessment. The counter here reports what the
 * children say about themselves and writes nothing to the parent.
 */
import { Box, Button, CircularProgress, LinearProgress, Stack, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TaskRow, subtaskProgress, apiErrorMessage, isTaskFinal, shortTaskId } from '../taskDomain';
import {
    TaskStatusBadge, TaskProgress, TaskPriorityBadge, AssigneeAvatar, TaskDueDate, TaskStateBlock,
} from './primitives';

export interface TaskSubtasksPanelProps {
    parent: TaskRow;
    subtasks: TaskRow[];
    now: Date;
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    onOpenTask: (taskId: string) => void;
    onAddSubtask: () => void;
}

export const TaskSubtasksPanel = ({
    parent, subtasks, now, isLoading, isError, error, onOpenTask, onAddSubtask,
}: TaskSubtasksPanelProps) => {
    const theme = useTheme();
    const { done, total } = subtaskProgress(subtasks);
    const isSubtask = !!parent.parentTaskId;

    if (isError) {
        return (
            <TaskStateBlock
                tone="error" icon="information-5" title="Could not load subtasks"
                description={apiErrorMessage(error, 'The request failed.')}
            />
        );
    }

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {total > 0 ? `${done} / ${total} completed` : 'No subtasks yet'}
                    </Typography>
                    {total > 0 && (
                        <LinearProgress
                            variant="determinate"
                            value={(done / total) * 100}
                            sx={{
                                mt: 0.75, height: 5, borderRadius: 5, maxWidth: 260,
                                backgroundColor: `${alpha(theme.palette.text.primary, 0.1)} !important`,
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: `${theme.palette.success.main} !important`,
                                    borderRadius: 5,
                                },
                            }}
                        />
                    )}
                </Box>
                {/* Depth cap: a subtask cannot have subtasks, so the action is absent — not
                    disabled with a tooltip, because it is not a permission, it is the shape. */}
                {!isSubtask && (
                    <Button
                        size="small" variant="outlined"
                        startIcon={<KTIcon iconName="plus" className="fs-7" />}
                        onClick={onAddSubtask}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, borderColor: 'divider' }}
                    >
                        Add subtask
                    </Button>
                )}
            </Stack>

            {isSubtask && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                    This is a subtask. Nesting is limited to one level.
                </Typography>
            )}

            {isLoading && subtasks.length === 0 && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
            )}

            {!isLoading && subtasks.length === 0 && !isSubtask && (
                <TaskStateBlock
                    compact icon="tree" title="No subtasks"
                    description="Break this task down into smaller pieces of work."
                />
            )}

            <Stack spacing={0.75}>
                {subtasks.map((sub) => (
                    <Stack
                        key={sub.id}
                        direction="row" spacing={1.25} alignItems="center"
                        onClick={() => onOpenTask(sub.id)}
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') onOpenTask(sub.id); }}
                        sx={{
                            p: 1.25, borderRadius: 1.5, cursor: 'pointer',
                            border: '1px solid', borderColor: 'divider',
                            transition: 'border-color .15s, background-color .15s',
                            '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.5), bgcolor: 'action.hover' },
                            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                        }}
                    >
                        <Box sx={{ color: isTaskFinal(sub) ? theme.palette.success.main : 'text.disabled', lineHeight: 0 }}>
                            <KTIcon iconName={isTaskFinal(sub) ? 'check-circle' : 'abstract-8'} className="fs-5" />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="body2" noWrap
                                sx={{
                                    fontWeight: 600,
                                    textDecoration: isTaskFinal(sub) ? 'line-through' : 'none',
                                    color: isTaskFinal(sub) ? 'text.disabled' : 'text.primary',
                                }}
                            >
                                {sub.taskName}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, minWidth: 0 }}>
                                <Box sx={{ width: 140, flexShrink: 0 }}>
                                    <TaskProgress value={sub.progress} height={4} />
                                </Box>
                                {sub.priority && <TaskPriorityBadge priority={sub.priority} />}
                                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 10 }}>
                                    {shortTaskId(sub.id)}
                                </Typography>
                            </Stack>
                        </Box>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <TaskDueDate task={sub} now={now} />
                        </Box>
                        <TaskStatusBadge status={sub.status} />
                        <AssigneeAvatar employee={sub.assignedTo} />
                    </Stack>
                ))}
            </Stack>
        </Stack>
    );
};

export default TaskSubtasksPanel;
