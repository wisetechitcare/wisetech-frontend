/**
 * Task time & cost (Phase 4 §11, §12).
 *
 * Uses the EXISTING global timer (Redux `timer` slice + `GlobalTimerModal`) — there is exactly
 * one time-tracking implementation in this app and this is a view onto it, not a second one.
 *
 * ### Cost
 *
 * Whether cost is shown is decided by the SERVER: `GET /time-sheets/task/:id` returns
 * `costVisible`, and redacts the money fields entirely when the caller lacks `finance.view.*`.
 * The UI reads that flag rather than re-deriving a permission — a client-side guess would
 * eventually disagree with the redaction and render blanks where money should be.
 *
 * Labour cost is **internal cost, not a billing amount**. The two are different numbers with
 * different owners, and this panel says so on its face.
 */
import { useDispatch, useSelector } from 'react-redux';
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppDispatch, RootState } from '@redux/store';
import { startTimerThunk, pauseTimerThunk, stopTimerThunk, selectTimer } from '@redux/slices/timer';
import { formatDuration, TaskRow, apiErrorMessage } from '../taskDomain';
import { TaskStateBlock } from './primitives';

interface TimesheetRow {
    id: string;
    startTime?: string;
    endTime?: string | null;
    billable?: boolean;
    workedDuration?: string;
    totalHoursDecimal?: number;
    costFormatted?: string;
    employeeName?: string;
    description?: string | null;
}

export interface TaskTimePanelProps {
    task: TaskRow;
    data?: {
        costVisible?: boolean;
        summary?: { totalEntries?: number; billableEntries?: number; totalHours?: number; totalCostFormatted?: string };
        timeSheets?: TimesheetRow[];
    };
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
}

const Metric = ({ label, value, hint }: { label: string; value: string; hint?: string }) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                flex: 1, minWidth: 130, p: 1.25, borderRadius: 1.5,
                border: '1px solid', borderColor: 'divider',
                bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02),
            }}
        >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em' }}>
                {label}
            </Typography>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, mt: 0.25, color: 'text.primary' }}>{value}</Typography>
            {hint && <Typography variant="caption" sx={{ color: 'text.disabled' }}>{hint}</Typography>}
        </Box>
    );
};

export const TaskTimePanel = ({ task, data, isLoading, isError, error }: TaskTimePanelProps) => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const timer = useSelector(selectTimer);
    const currentEmployeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);

    const isThisTaskRunning = timer.isRunning && timer.currentTask?.id === task.id;
    const costVisible = data?.costVisible === true;
    const rows = data?.timeSheets ?? [];
    const summary = data?.summary;

    const handleStart = () => {
        dispatch(startTimerThunk({
            taskId: task.id,
            taskName: task.taskName,
            timeSheetData: {
                // The server derives the employee from the session; these are the fields the
                // existing create-timesheet contract requires.
                projectId: task.leadId ?? undefined,
                taskId: task.id,
                employeeId: currentEmployeeId,
                logTimeHours: 0, logTimeMinutes: 0, logTimeSeconds: 0,
                billable: task.billingType !== 'NON_BILLABLE',
            },
        }));
    };

    if (isError) {
        return (
            <TaskStateBlock
                tone="error" icon="information-5" title="Could not load time entries"
                description={apiErrorMessage(error, 'The request failed.')}
            />
        );
    }

    return (
        <Stack spacing={2}>
            {/* timer */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}
                sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {isThisTaskRunning ? 'Timer running' : 'Track time on this task'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {isThisTaskRunning
                            ? 'The global timer is recording against this task.'
                            : timer.isRunning
                                ? `A timer is already running on “${timer.currentTask?.name}”. Pause it first.`
                                : 'Starts the shared timer — the same one shown in the header.'}
                    </Typography>
                </Box>
                {isThisTaskRunning ? (
                    <Stack direction="row" spacing={1}>
                        {/* Two distinct actions, because they mean different things: pause keeps
                            this session open (resuming appends to the same entry), stop ends it
                            (the next start opens a new one). This button used to say "Stop"
                            while dispatching pause. */}
                        <Button
                            variant="outlined" color="warning"
                            startIcon={<KTIcon iconName="timer" className="fs-6" />}
                            onClick={() => dispatch(pauseTimerThunk())}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                        >
                            Pause
                        </Button>
                        <Button
                            variant="contained" color="error"
                            startIcon={<KTIcon iconName="cross-circle" className="fs-6" />}
                            onClick={() => dispatch(stopTimerThunk())}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                        >
                            Stop &amp; save
                        </Button>
                    </Stack>
                ) : (
                    <Button
                        variant="contained"
                        startIcon={<KTIcon iconName="time" className="fs-6" />}
                        onClick={handleStart}
                        disabled={timer.isRunning}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                        Start timer
                    </Button>
                )}
            </Stack>

            {/* metrics */}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Metric label="Logged" value={summary?.totalHours ? `${summary.totalHours}h` : '—'} />
                <Metric label="Entries" value={String(summary?.totalEntries ?? 0)} hint={`${summary?.billableEntries ?? 0} billable`} />
                {costVisible ? (
                    <Metric
                        label="Labour cost"
                        value={summary?.totalCostFormatted || '—'}
                        hint={task.taskScope === 'GENERAL' ? 'Internal overhead' : 'Internal cost, not a billing amount'}
                    />
                ) : (
                    <Metric label="Labour cost" value="Restricted" hint="Requires finance access" />
                )}
            </Stack>

            {/* §12 — the distinction that must never be blurred. */}
            {costVisible && (
                <Alert severity="info" icon={<KTIcon iconName="information-5" className="fs-6" />} sx={{ borderRadius: 1.5 }}>
                    Labour cost is derived from internal salary data. It is <strong>not</strong> a client billing
                    amount{task.taskScope === 'GENERAL' ? ' — general task time is organizational overhead and never reaches a project.' : '.'}
                </Alert>
            )}

            <Divider />

            {/* entries */}
            {isLoading && rows.length === 0 && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
            )}

            {!isLoading && rows.length === 0 && (
                <TaskStateBlock compact icon="timer" title="No time logged yet"
                    description="Start the timer above, and entries will appear here." />
            )}

            <Stack spacing={1}>
                {rows.map((row) => (
                    <Stack
                        key={row.id}
                        direction="row" spacing={1.5} alignItems="center"
                        sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                {row.employeeName || 'Unknown'}
                            </Typography>
                            {row.description && (
                                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                    {row.description}
                                </Typography>
                            )}
                        </Box>
                        <Chip
                            size="small"
                            label={row.billable ? 'Billable' : 'Non-billable'}
                            sx={{
                                height: 20, fontSize: 10, fontWeight: 600, borderRadius: 0.75,
                                bgcolor: alpha(row.billable ? theme.palette.success.main : theme.palette.text.primary, 0.12),
                                color: row.billable ? theme.palette.success.main : 'text.secondary',
                            }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 62, textAlign: 'right' }}>
                            {row.workedDuration || '—'}
                        </Typography>
                        {costVisible && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 84, textAlign: 'right' }}>
                                {row.costFormatted || '—'}
                            </Typography>
                        )}
                    </Stack>
                ))}
            </Stack>
        </Stack>
    );
};

export default TaskTimePanel;
