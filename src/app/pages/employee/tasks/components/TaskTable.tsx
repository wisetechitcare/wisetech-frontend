/**
 * Table view (Phase 4 §14) — the secondary view.
 *
 * Server-side pagination, sorting and filtering throughout. The old list loaded every task and
 * did all of it in React, which is why it degraded linearly and why "no tasks" and "the request
 * failed" looked identical.
 *
 * Cost is permission-gated: the column only exists when the caller may see labour cost, because
 * it is derived from `ctcInLpa` and is therefore compensation data.
 */
import {
    Box, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TableSortLabel, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    TaskRow, loggedSeconds, formatDuration, shortTaskId, employeeName,
} from '../taskDomain';
import {
    TaskScopeBadge, TaskStatusBadge, TaskPriorityBadge, TaskProgress, TaskAssignees, TaskDueDate, TaskStateBlock,
} from './primitives';

export interface TaskTableProps {
    tasks: TaskRow[];
    total: number;
    page: number;          // zero-based, as MUI counts
    rowsPerPage: number;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    now: Date;
    isLoading?: boolean;
    isError?: boolean;
    errorMessage?: string;
    /** Cost stays hidden unless the server said the caller may see it (finance.view.*). */
    canViewCost?: boolean;
    onOpenTask: (taskId: string) => void;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
    onSortChange: (sortBy: string, sortDir: 'asc' | 'desc') => void;
}

interface Column {
    id: string;
    label: string;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    /** Hidden below this breakpoint so the table stays readable on small screens (§18). */
    hideBelow?: 'sm' | 'md' | 'lg';
}

const COLUMNS: Column[] = [
    { id: 'taskName', label: 'Task', sortable: true },
    { id: 'scope', label: 'Scope', hideBelow: 'sm' },
    { id: 'project', label: 'Project', sortable: true, hideBelow: 'md' },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'priority', label: 'Priority', sortable: true, hideBelow: 'lg' },
    { id: 'assignee', label: 'Assignee', hideBelow: 'md' },
    { id: 'progress', label: 'Progress', sortable: true, hideBelow: 'sm' },
    { id: 'dueDate', label: 'Due', sortable: true, hideBelow: 'sm' },
    { id: 'logged', label: 'Logged', align: 'right', hideBelow: 'lg' },
];

export const TaskTable = ({
    tasks, total, page, rowsPerPage, sortBy, sortDir, now,
    isLoading, isError, errorMessage, canViewCost,
    onOpenTask, onPageChange, onRowsPerPageChange, onSortChange,
}: TaskTableProps) => {
    const theme = useTheme();
    const columns = canViewCost
        ? [...COLUMNS, { id: 'cost', label: 'Cost', align: 'right' as const, hideBelow: 'lg' as const }]
        : COLUMNS;

    const hideSx = (bp?: 'sm' | 'md' | 'lg') =>
        bp ? { display: { xs: 'none', [bp]: 'table-cell' } } : undefined;

    if (isError) {
        return (
            <TaskStateBlock
                tone="error"
                icon="information-5"
                title="Could not load tasks"
                description={errorMessage || 'The request failed. Try again in a moment.'}
            />
        );
    }

    return (
        <Box>
            <TableContainer
                sx={{
                    // §18 — wide content scrolls inside its own container; the page never does.
                    overflowX: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                }}
            >
                <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.02) }}>
                            {columns.map((col) => (
                                <TableCell
                                    key={col.id}
                                    align={col.align}
                                    sx={{
                                        fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                                        letterSpacing: '.04em', color: 'text.secondary',
                                        whiteSpace: 'nowrap', borderColor: 'divider',
                                        ...hideSx(col.hideBelow),
                                    }}
                                >
                                    {col.sortable ? (
                                        <TableSortLabel
                                            active={sortBy === col.id}
                                            direction={sortBy === col.id ? sortDir : 'asc'}
                                            onClick={() =>
                                                onSortChange(col.id, sortBy === col.id && sortDir === 'asc' ? 'desc' : 'asc')
                                            }
                                        >
                                            {col.label}
                                        </TableSortLabel>
                                    ) : col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {isLoading && tasks.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} sx={{ borderColor: 'divider' }}>
                                    <Stack alignItems="center" sx={{ py: 5 }}>
                                        <CircularProgress size={22} />
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && tasks.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} sx={{ borderColor: 'divider' }}>
                                    <TaskStateBlock
                                        compact
                                        icon="notepad"
                                        title="No tasks found"
                                        description="Nothing matches the current filters. Clear them, or create a task."
                                    />
                                </TableCell>
                            </TableRow>
                        )}

                        {tasks.map((task) => {
                            const logged = loggedSeconds(task.timesheets);
                            return (
                                <TableRow
                                    key={task.id}
                                    hover
                                    onClick={() => onOpenTask(task.id)}
                                    sx={{ cursor: 'pointer', '& td': { borderColor: 'divider' } }}
                                >
                                    <TableCell sx={{ maxWidth: 320 }}>
                                        {/* A subtask sat in the list looking exactly like a
                                            top-level task. Its parent is now stated above it. */}
                                        {task.parentTaskId && (
                                            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'text.disabled', mb: 0.15 }}>
                                                <KTIcon iconName="tree" className="fs-9" />
                                                <Typography variant="caption" noWrap sx={{ fontSize: 10 }}>
                                                    subtask of {task.parentTask?.taskName || 'another task'}
                                                </Typography>
                                            </Stack>
                                        )}
                                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, pl: task.parentTaskId ? 1 : 0 }}>
                                            {task.taskName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 10 }}>
                                            {shortTaskId(task.id)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell sx={hideSx('sm')}>
                                        <TaskScopeBadge scope={task.taskScope} />
                                    </TableCell>

                                    <TableCell sx={{ maxWidth: 220, ...hideSx('md') }}>
                                        <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                                            {task.taskScope === 'PROJECT' ? (task.lead?.title || '—') : 'Internal'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell><TaskStatusBadge status={task.status} /></TableCell>

                                    <TableCell sx={hideSx('lg')}><TaskPriorityBadge priority={task.priority} /></TableCell>

                                    <TableCell sx={hideSx('md')}>
                                        <TaskAssignees assignees={task.assignees} fallback={task.assignedTo} showName />
                                    </TableCell>

                                    <TableCell sx={{ minWidth: 120, ...hideSx('sm') }}>
                                        <TaskProgress value={task.progress} />
                                    </TableCell>

                                    <TableCell sx={hideSx('sm')}>
                                        <TaskDueDate task={task} now={now} />
                                    </TableCell>

                                    <TableCell align="right" sx={hideSx('lg')}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            {formatDuration(logged)}
                                        </Typography>
                                    </TableCell>

                                    {canViewCost && (
                                        <TableCell align="right" sx={hideSx('lg')}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {/* Cost is computed and returned by the costing endpoint, not derived
                                                    here — the client must never recompute salary-derived figures. */}
                                                —
                                            </Typography>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, next) => onPageChange(next)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{ '& .MuiTablePagination-toolbar': { px: 1 }, color: 'text.secondary' }}
            />
        </Box>
    );
};

export default TaskTable;
