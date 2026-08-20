/**
 * Task time & cost (Phase 4 §11, §12).
 *
 * Uses the EXISTING global timer (Redux `timer` slice + `GlobalTimerModal`) — there is exactly
 * one time-tracking implementation in this app and this is a view onto it, not a second one.
 *
 * ### Cost
 *
 * Whether cost is shown is decided by the SERVER: `GET /time-sheets/task/:id` returns
 * `costVisible`, and redacts the money fields entirely for anyone who is not an administrator
 * (explicit `finance.view.all`/`.global`) or the PRIMARY manager of that task's project.
 * The UI reads that flag rather than re-deriving a permission — a client-side guess would
 * eventually disagree with the redaction and render blanks where money should be.
 *
 * Labour cost is **internal cost, not a billing amount**. The two are different numbers with
 * different owners, and this panel says so on its face.
 */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppDispatch, RootState } from '@redux/store';
import { startTimerThunk, pauseTimerThunk, stopTimerThunk, selectTimer } from '@redux/slices/timer';
import { formatDuration, TaskRow, apiErrorMessage } from '../taskDomain';
import { formatDateTime } from '@utils/dateFormats';
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import { TaskStateBlock, TaskProgress, AssigneeAvatar } from './primitives';
import { useInvalidateTasks } from '../useTaskQueries';

interface TimesheetRow {
    id: string;
    startTime?: string;
    endTime?: string | null;
    billable?: boolean;
    workedDuration?: string;
    totalHoursDecimal?: number;
    costFormatted?: string;
    employeeName?: string;
    employeeAvatar?: string | null;
    /** No `endTime` yet — somebody is on the clock for this task right now. */
    isRunning?: boolean;
    runningSince?: string | null;
    description?: string | null;
}

/**
 * Split a display name back into the shape the avatar primitive expects.
 *
 * The timesheet endpoint sends one formatted string; every other people-surface in the module
 * takes `{ users: { firstName, lastName } }`. Adapting here keeps ONE avatar component across
 * the app rather than a second one that happens to take a string.
 */
const nameParts = (full?: string) => {
    const [firstName, ...rest] = (full || '').trim().split(/\s+/);
    return { firstName: firstName || '', lastName: rest.join(' ') };
};

/** Whoever is on the clock for this task, from the server — not from anyone's browser. */
export interface RunningEntry {
    id: string;
    employeeId: string;
    employeeName?: string;
    since?: string | null;
}

export interface TaskTimePanelProps {
    task: TaskRow;
    data?: {
        costVisible?: boolean;
        summary?: {
            totalEntries?: number; billableEntries?: number; totalHours?: number;
            totalCostFormatted?: string;
            /** Plural: a task worked by several people can have several clocks running. */
            running?: RunningEntry[];
        };
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
    const invalidateTasks = useInvalidateTasks();
    const currentEmployeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);

    const isThisTaskRunning = timer.isRunning && timer.currentTask?.id === task.id;

    /**
     * Who is on the clock for this task RIGHT NOW — read from the server, not from Redux.
     *
     * The stopwatch used to live entirely in one browser (Redux + localStorage), so a manager
     * starting a timer on somebody else's task was invisible to that person: the work was being
     * recorded and the only sign of it was on the manager's own screen. A running timer is
     * already a real row — a timesheet with no `endTime` — so the server can simply say who is
     * running one, and every viewer of the task sees the same answer.
     *
     * The FLOATING header timer stays personal: it is a control for your own stopwatch, and one
     * that ticked for work you are not doing would be a control you must not press. Everyone
     * else sees the clock here, on the task, where it is information rather than a control.
     */
    const running: RunningEntry[] = data?.summary?.running ?? [];
    const othersRunning = running.filter((r) => r.employeeId !== currentEmployeeId);

    /**
     * May THIS person log time against THIS task?
     *
     * Only the people the task was given to — its owner, or anyone it is shared with. A manager
     * starting a clock on somebody else's task put hours in the manager's own timesheet against
     * work they were not doing, which is two records of the same job that disagree. The server
     * enforces the same rule; this is what stops the button being offered in the first place.
     */
    const onThisTask = useMemo(() => {
        if (!currentEmployeeId) return false;
        if (task.assignedToId && task.assignedToId === currentEmployeeId) return true;
        return (task.assignees ?? []).some((a) => a.employeeId === currentEmployeeId);
    }, [task.assignedToId, task.assignees, currentEmployeeId]);

    /** The entry just stopped, held open for its description and attachments. */
    const [reviewTimesheetId, setReviewTimesheetId] = useState<string | null>(null);

    /** Ticks once a second while anything is running, so the elapsed figures stay live. */
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running.length) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [running.length]);

    const elapsedSince = (iso?: string | null): string => {
        if (!iso) return '—';
        const started = new Date(iso).getTime();
        if (!Number.isFinite(started)) return '—';
        const seconds = Math.max(0, Math.floor((now - started) / 1000));
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const sec = seconds % 60;
        // Clock format, not "1h 2m": this is a stopwatch, and a stopwatch counts seconds.
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };
    const costVisible = data?.costVisible === true;
    // Memoised on the payload: `?? []` is a fresh array each render, and the involvement
    // aggregate below depends on it.
    const rows = useMemo(() => data?.timeSheets ?? [], [data]);

    /**
     * Hours per person on this task, and each one's share of the total.
     *
     * Computed from the rows already on screen rather than asked for separately — the endpoint
     * that returns them is the same one that would have to answer the question, so a second
     * request could only ever produce a second, slightly different answer.
     */
    const involvement = useMemo(() => {
        const byPerson = new Map<string, number>();
        for (const row of rows) {
            const name = row.employeeName || 'Unknown';
            byPerson.set(name, (byPerson.get(name) ?? 0) + (row.totalHoursDecimal ?? 0));
        }
        const total = [...byPerson.values()].reduce((a, b) => a + b, 0);
        if (!total) return [];
        return [...byPerson.entries()]
            .map(([name, hours]) => ({
                name,
                hours: Math.round(hours * 10) / 10,
                share: Math.round((hours / total) * 100),
            }))
            .sort((a, b) => b.hours - a.hours);
    }, [rows]);
    const summary = data?.summary;

    /**
     * Stop the clock, then OPEN THE ENTRY for review rather than filing it silently.
     *
     * The stop is committed first, so the time is never lost if the form is closed — what a
     * stopwatch measured is a fact, and it must survive somebody changing their mind about
     * describing it. The form then opens on that saved entry to add the description, attach
     * whatever the work produced, and correct the start/end if the timer ran long.
     */
    const handleStop = async () => {
        const timesheetId = timer.currentTask?.timeSheetData?.id;
        await dispatch(stopTimerThunk());
        if (timesheetId) setReviewTimesheetId(timesheetId);
    };

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

                    {/* Somebody ELSE is on the clock for this task. Shown to every viewer, live,
                        because "is anyone working on this right now" is a fact about the task —
                        and because a manager's timer used to run on an assignee's task with no
                        sign of it anywhere the assignee could look. Read-only: their stopwatch
                        is theirs to stop. */}
                    {othersRunning.length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {othersRunning.map((entry) => (
                                <Tooltip key={entry.id} title={`${entry.employeeName || 'Someone'} is tracking time on this task`}>
                                    {/* A capsule that is the width of what it says, not the width
                                        of the row it sits in. Full-bleed, it ran under the Start
                                        timer button and over the line of help text above it —
                                        making a passing fact look like an alert. `fit-content`
                                        plus a wrapping row also means two people running clocks
                                        read as two chips rather than two stacked bars. */}
                                    <Stack
                                        direction="row" spacing={0.75} alignItems="center"
                                        sx={{
                                            width: 'fit-content', maxWidth: '100%',
                                            px: 1, py: 0.4, borderRadius: 999,
                                            border: '1px solid',
                                            borderColor: alpha(theme.palette.success.main, 0.4),
                                            bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                                        }}
                                    >
                                        {/* A pulsing dot: a number that changes once a second is
                                            easy to miss on a page you are reading. */}
                                        <Box
                                            sx={{
                                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                                bgcolor: 'success.main',
                                                animation: 'wt-timer-pulse 1.6s ease-in-out infinite',
                                                '@keyframes wt-timer-pulse': {
                                                    '0%, 100%': { opacity: 1 },
                                                    '50%': { opacity: 0.25 },
                                                },
                                            }}
                                        />
                                        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                                            {entry.employeeName || 'Someone'}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                                                color: 'success.main', flexShrink: 0,
                                            }}
                                        >
                                            {elapsedSince(entry.since)}
                                        </Typography>
                                    </Stack>
                                </Tooltip>
                            ))}
                        </Stack>
                    )}
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
                            onClick={() => void handleStop()}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                        >
                            Stop &amp; save
                        </Button>
                    </Stack>
                ) : onThisTask ? (
                    <Button
                        variant="contained"
                        startIcon={<KTIcon iconName="time" className="fs-6" />}
                        onClick={handleStart}
                        disabled={timer.isRunning}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                    >
                        Start timer
                    </Button>
                ) : (
                    // Not offered rather than offered-and-refused: a button that always fails is
                    // worse than no button, and the reason belongs where the button would be.
                    <Stack
                        direction="row" spacing={0.75} alignItems="center"
                        sx={{
                            px: 1.25, py: 0.75, borderRadius: 1.5, flexShrink: 0,
                            border: '1px solid', borderColor: 'divider',
                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                        }}
                    >
                        <Box sx={{ color: 'text.disabled', lineHeight: 0 }}>
                            <KTIcon iconName="lock-2" className="fs-6" />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Only the people assigned to this task can log time on it
                        </Typography>
                    </Stack>
                )}
            </Stack>

            {/* metrics */}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Metric label="Logged" value={summary?.totalHours ? `${summary.totalHours}h` : '—'} />
                <Metric label="Entries" value={String(summary?.totalEntries ?? 0)} hint={`${summary?.billableEntries ?? 0} billable`} />
                {/* Omitted, not shown as "Restricted": a redaction label tells everyone a salary-
                    derived figure exists and that they are not trusted with it. The people who
                    may see it are an administrator and the project's primary manager. */}
                {costVisible && (
                    <Metric
                        label="Labour cost"
                        value={summary?.totalCostFormatted || '—'}
                        hint={task.taskScope === 'GENERAL' ? 'Internal overhead' : 'Internal cost, not a billing amount'}
                    />
                )}
            </Stack>

            {/* ── who actually did the work ──────────────────────────────────────
                A task is now handed to a GROUP, so "how far along is it" and "who has
                carried it" are two different questions. This answers the second, from the
                timesheets — the only record of what was actually done.

                It is deliberately NOT wired into the progress percentage. Hours spent are
                not work completed: somebody forty hours into a four-hour job is not 1000%
                done. The reported figure stays a person's own assessment (the same reason
                `checkProgress` refuses to roll progress up from subtasks); this sits beside
                it as evidence. */}
            {involvement.length > 1 && (
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                        INVOLVEMENT — BY LOGGED TIME
                    </Typography>
                    <Stack spacing={0.75}>
                        {involvement.map((person) => (
                            <Box key={person.name}>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.25 }}>
                                    <Typography variant="caption" noWrap sx={{ color: 'text.primary', fontWeight: 600 }}>
                                        {person.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0, ml: 1 }}>
                                        {person.hours}h · {person.share}%
                                    </Typography>
                                </Stack>
                                <TaskProgress value={person.share} height={5} />
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}

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
                        {/* The face and the name, because a task is worked by several people and
                            an unattributed row of hours answers nothing. */}
                        <AssigneeAvatar
                            employee={{ avatar: row.employeeAvatar, users: nameParts(row.employeeName) }}
                            size={26}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                {row.employeeName || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                                {row.description || (row.startTime ? formatDateTime(row.startTime) : '—')}
                            </Typography>
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
                        {/* A running entry has no duration yet — it has an elapsed time, which is
                            a different thing and must not render as an em dash while somebody is
                            actively working. */}
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700, minWidth: 74, textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                color: row.isRunning ? 'success.main' : 'text.primary',
                            }}
                        >
                            {row.isRunning ? elapsedSince(row.runningSince) : (row.workedDuration || '—')}
                        </Typography>
                        {costVisible && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 84, textAlign: 'right' }}>
                                {row.costFormatted || '—'}
                            </Typography>
                        )}
                    </Stack>
                ))}
            </Stack>

            {/* The just-stopped entry, held open for its description and any attachment. Reuses
                the existing Time Log form rather than a second one — an entry edited from the
                task and the same entry edited from My Timesheet must not be two different
                forms with two different rules. */}
            {reviewTimesheetId && (
                <NewTimeLogForm
                    show
                    timeSheetId={reviewTimesheetId}
                    onClose={() => {
                        setReviewTimesheetId(null);
                        // The form can move the TASK's progress, not just the entry — so the
                        // task on screen behind it is stale the moment it closes.
                        invalidateTasks();
                    }}
                />
            )}
        </Stack>
    );
};

export default TaskTimePanel;
