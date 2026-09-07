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
    Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, Stack, Table, TableBody,
    TableCell, TableHead, TableRow, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { AppDispatch, RootState } from '@redux/store';
import { startTimerThunk, pauseTimerThunk, stopTimerThunk, selectTimer } from '@redux/slices/timer';
import { formatDuration, TaskRow, apiErrorMessage } from '../taskDomain';
import { formatDateTime } from '@utils/dateFormats';
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import { TaskStateBlock, AssigneeAvatar } from './primitives';
import { useInvalidateTasks } from '../useTaskQueries';
import { ViewModeSwitch, WtButton } from '@app/modules/common/components/ui';

type EntryView = 'grid' | 'list';

const ENTRY_VIEW_OPTIONS = [
    { value: 'grid' as const, icon: 'bi-grid-3x3-gap-fill', label: 'Card view' },
    { value: 'list' as const, icon: 'bi-list-ul', label: 'Table view' },
];
import TimeLogDetailDialog from '@app/pages/employee/timesheet/components/TimeLogDetailDialog';
import type { TimeLogAttachment } from '@app/pages/employee/timesheet/components/TimeLogAttachments';

/**
 * Segment colours for the involvement bar, in order.
 *
 * Fixed rather than generated: a task has a handful of people on it, and a palette that wraps is
 * both predictable and stable across renders — the same person keeps the same colour as long as
 * the order does. Every value is a MUI palette key resolved at render, so dark mode is handled.
 */
const INVOLVEMENT_COLOR_KEYS = ['primary', 'warning', 'success', 'info', 'secondary', 'error'] as const;

/** Same entries, two shapes — cards that carry the whole entry, or a table that scans. */

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
    /** The task the time was logged against. Already on the payload — see buildTimesheetCostView. */
    taskName?: string;
    /** What this block of work produced — drawings, photographs, a signed sheet. */
    attachments?: TimeLogAttachment[];
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
    // Cards by default: an entry's description and its attachments are the parts people came to
    // read, and neither fits a table row.
    const [entryView, setEntryView] = useState<EntryView>('grid');
    /** The entry being read in full — same dialog My Timesheet opens. */
    const [openLogId, setOpenLogId] = useState<string | null>(null);
    /** Closed by default — see the Collapse below. */
    const [showInvolvement, setShowInvolvement] = useState(false);
    const INVOLVEMENT_COLORS = INVOLVEMENT_COLOR_KEYS.map((key) => theme.palette[key].main);

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
        // `isRunning` is derived on the SERVER from a null `endTime`, so the card keeps saying
        // "running" until this list is fetched again. The panel polls every 30s, which is why
        // stopping used to need a refresh to show the time it had just saved.
        invalidateTasks();
        if (timesheetId) setReviewTimesheetId(timesheetId);
    };

    const handleStart = async () => {
        await dispatch(startTimerThunk({
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
        // Starting CREATES the entry server-side, so the list below is out of date the moment it
        // succeeds. Without this the new card only appeared on the panel's 30-second poll, which
        // read as the timer having done nothing.
        invalidateTasks();
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
                    <Stack direction="row" spacing={1} alignItems="center">
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
                        onClick={() => void handleStart()}
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
            {/* Folded away by default, and opened from the chart button beside the layout
                switch below. It answers a question people ask occasionally — "who did most of
                this?" — and it was taking a permanent block of the panel to do it. */}
            <Collapse in={showInvolvement && involvement.length > 0} unmountOnExit>
                <Stack spacing={1.25} sx={{ pb: 0.5 }}>
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                            INVOLVEMENT — BY LOGGED TIME
                        </Typography>

                        {/* ONE bar, split by person, rather than a bar EACH.
                            A row per person grew the panel with the team — six people meant six
                            labelled bars — while saying nothing a share of a whole says better.
                            This stays exactly one bar tall however many people are on the task;
                            the legend below it wraps instead of growing downward forever. */}
                        <Stack
                            direction="row"
                            sx={{
                                height: 12, borderRadius: 6, overflow: 'hidden',
                                bgcolor: alpha(theme.palette.text.primary, 0.08),
                            }}
                        >
                            {involvement.map((person, index) => (
                                <Tooltip
                                    key={person.name}
                                    title={`${person.name} — ${person.hours}h (${person.share}%)`}
                                    arrow
                                >
                                    <Box
                                        sx={{
                                            width: `${person.share}%`,
                                            bgcolor: INVOLVEMENT_COLORS[index % INVOLVEMENT_COLORS.length],
                                            transition: 'width .25s ease',
                                            '&:hover': { filter: 'brightness(1.1)' },
                                        }}
                                    />
                                </Tooltip>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1.5} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
                            {involvement.map((person, index) => (
                                <Stack key={person.name} direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Box
                                        sx={{
                                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                            bgcolor: INVOLVEMENT_COLORS[index % INVOLVEMENT_COLORS.length],
                                        }}
                                    />
                                    <Typography variant="caption" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                                        {person.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                                        {person.hours}h · {person.share}%
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>

                    {/* §12 — the distinction that must never be blurred. It travels with the
                        cost figures it qualifies, so it is not left explaining nothing. */}
                    {costVisible && (
                        <Alert severity="info" icon={<KTIcon iconName="information-5" className="fs-6" />} sx={{ borderRadius: 1.5 }}>
                            Labour cost is derived from internal salary data. It is <strong>not</strong> a client billing
                            amount{task.taskScope === 'GENERAL' ? ' — general task time is organizational overhead and never reaches a project.' : '.'}
                        </Alert>
                    )}
                </Stack>
            </Collapse>

            <Divider />

            {/* entries */}
            {isLoading && rows.length === 0 && (
                <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
            )}

            {!isLoading && rows.length === 0 && (
                <TaskStateBlock compact icon="timer" title="No time logged yet"
                    description="Start the timer above, and entries will appear here." />
            )}

            {rows.length > 0 && (
                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    {involvement.length > 0 && (
                        // The OUTER shell matches ViewModeSwitch exactly — same padding, border,
                        // radius and background — with the pressable 30x26 inside it. Styling the
                        // button alone made it a whole shell shorter than the switch beside it.
                        <Box
                            sx={{
                                display: 'inline-flex',
                                p: 0.375,
                                borderRadius: '10px',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'action.hover',
                                flexShrink: 0,
                            }}
                        >
                            <Tooltip title={showInvolvement ? 'Hide involvement' : 'Show who did what'}>
                                <Box
                                    component="button"
                                    type="button"
                                    aria-pressed={showInvolvement}
                                    aria-label="Involvement chart"
                                    onClick={() => setShowInvolvement((open) => !open)}
                                    sx={{
                                        display: 'grid', placeItems: 'center',
                                        width: 30, height: 26, p: 0, border: 0,
                                        borderRadius: '7px', cursor: 'pointer',
                                        bgcolor: showInvolvement ? 'background.paper' : 'transparent',
                                        color: showInvolvement ? 'text.primary' : 'text.secondary',
                                        boxShadow: showInvolvement ? '0 1px 2px rgba(16, 24, 40, 0.10)' : 'none',
                                        transition: 'background-color .12s ease, color .12s ease',
                                        '&:hover': { color: 'text.primary' },
                                    }}
                                >
                                    <Box component="i" className="bi-bar-chart-fill" aria-hidden sx={{ fontSize: 13 }} />
                                </Box>
                            </Tooltip>
                        </Box>
                    )}
                    <ViewModeSwitch<EntryView>
                        options={ENTRY_VIEW_OPTIONS}
                        value={entryView}
                        onChange={setEntryView}
                        ariaLabel="Time entry layout"
                    />
                </Stack>
            )}

            {/* CARDS — the default, because an entry carries more than a table row can hold:
                what was written, and what it produced. The table is the compact scan. */}
            {entryView === 'grid' && (
                // The Inbox card grid, to the same spec: three across on a wide screen, two on a
                // tablet, one on a phone. Fixed columns rather than auto-fit, because matching
                // that layout is the point — a card here and a card there should read as the
                // same object.
                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                    }}
                >
                    {rows.map((row) => {
                        // Running work is the one entry worth spotting across a grid, so it takes
                        // the accent; everything else is the ordinary brand blue.
                        const accent = row.isRunning ? theme.palette.success.main : theme.palette.primary.main;
                        return (
                            <Box
                                key={row.id}
                                tabIndex={0}
                                onClick={() => setOpenLogId(row.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setOpenLogId(row.id); }}
                                sx={{
                                    position: 'relative', cursor: 'pointer', minWidth: 0,
                                    borderRadius: '12px', overflow: 'hidden',
                                    border: `1px solid ${theme.palette.divider}`,
                                    bgcolor: 'background.paper',
                                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', flexDirection: 'column',
                                    height: '100%',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        borderColor: accent,
                                        boxShadow: `0 8px 24px -8px ${alpha(accent, 0.15)}, 0 4px 12px rgba(0,0,0,0.03)`,
                                    },
                                    '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
                                }}
                            >
                                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent }} />

                                <Stack gap={1.2} sx={{ p: { xs: 1.75, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Who — the eyebrow, in the accent, with their face where the
                                        Inbox card carries its type icon. */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                        <AssigneeAvatar
                                            employee={{ avatar: row.employeeAvatar, users: nameParts(row.employeeName) }}
                                            size={24}
                                        />
                                        <Typography
                                            noWrap
                                            sx={{
                                                fontSize: '10px', fontWeight: 800, letterSpacing: '.08em',
                                                textTransform: 'uppercase', color: accent, lineHeight: 1, minWidth: 0,
                                            }}
                                        >
                                            {row.employeeName || 'Unknown'}
                                        </Typography>
                                    </Box>

                                    {/* What it was logged against, then how long, then when.
                                        The task is named on the card even though the panel is
                                        already inside that task: these cards are read on their
                                        own, and an entry that does not say what it belongs to
                                        stops making sense the moment it is looked at anywhere
                                        else. */}
                                    <Box>
                                        <Typography
                                            noWrap
                                            title={row.taskName || task.taskName}
                                            sx={{ fontSize: '12px', fontWeight: 700, color: 'text.primary', lineHeight: 1.4 }}
                                        >
                                            {row.taskName || task.taskName}
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: '14px', fontWeight: 700, lineHeight: 1.4,
                                                fontVariantNumeric: 'tabular-nums',
                                                color: row.isRunning ? 'success.main' : 'text.primary',
                                            }}
                                        >
                                            {row.isRunning ? elapsedSince(row.runningSince) : (row.workedDuration || '—')}
                                        </Typography>
                                        <Typography sx={{ fontSize: '11px', color: 'text.secondary', lineHeight: 1.4 }}>
                                            {row.startTime ? formatDateTime(row.startTime) : '—'}
                                        </Typography>
                                    </Box>

                                    {/* Description — always rendered, so an entry without one is
                                        the same size as an entry with one. */}
                                    <Box
                                        sx={{
                                            p: 1.25,
                                            borderRadius: '8px',
                                            bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.02),
                                            borderLeft: `3px solid ${theme.palette.divider}`,
                                            mt: 0.25,
                                            height: 52,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: '11px',
                                                color: row.description ? 'text.secondary' : 'text.disabled',
                                                lineHeight: 1.45,
                                                fontStyle: 'italic',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {row.description ? `"${row.description}"` : 'No description'}
                                        </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                                        <Chip
                                            size="small"
                                            label={row.billable ? 'Billable' : 'Non-billable'}
                                            sx={{
                                                height: 18, fontSize: 9.5, fontWeight: 700, borderRadius: 0.75,
                                                bgcolor: alpha(row.billable ? theme.palette.success.main : theme.palette.text.primary, 0.12),
                                                color: row.billable ? theme.palette.success.main : 'text.secondary',
                                            }}
                                        />
                                        {!!row.attachments?.length && (
                                            <Chip
                                                size="small"
                                                icon={<KTIcon iconName="paper-clip" className="fs-8" />}
                                                label={row.attachments.length}
                                                sx={{ height: 18, fontSize: 9.5 }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1 }} />
                                        {costVisible && (
                                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>
                                                {row.costFormatted || '—'}
                                            </Typography>
                                        )}
                                    </Stack>

                                    {/* The Inbox's full-width outlined action, in the same place
                                        at the bottom of every card. */}
                                    <Box sx={{ mt: 'auto', pt: 1 }}>
                                        <WtButton
                                            size="small"
                                            onClick={(e) => { e.stopPropagation(); setOpenLogId(row.id); }}
                                            sx={{
                                                width: '100%', fontSize: '11px', fontWeight: 650,
                                                py: 0.5, px: 1, borderRadius: '8px',
                                                border: `1px solid ${accent}`,
                                                color: accent,
                                                background: 'transparent !important',
                                                boxShadow: 'none',
                                                transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                                                '&:hover': {
                                                    background: `${alpha(accent, 0.08)} !important`,
                                                    borderColor: accent,
                                                    color: accent,
                                                    boxShadow: `0 2px 8px ${alpha(accent, 0.14)}`,
                                                },
                                            }}
                                        >
                                            Open log
                                        </WtButton>
                                    </Box>
                                </Stack>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {entryView === 'list' && (
                // minWidth + the scroller, so a narrow screen scrolls the table rather than the page.
                <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    <Table size="small" sx={{ minWidth: 780 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Task</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Billing</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Time</TableCell>
                                {costVisible && <TableCell align="right" sx={{ fontWeight: 700 }}>Cost</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.employeeName || 'Unknown'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.taskName || task.taskName}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                                        {row.startTime ? formatDateTime(row.startTime) : '—'}
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 220, color: 'text.secondary' }}>
                                        {row.description || '—'}
                                        {!!row.attachments?.length && (
                                            <Box component="span" sx={{ display: 'block', mt: 0.25 }}>
                                                {row.attachments.map((file: TimeLogAttachment) => (
                                                    <Typography
                                                        key={file.url}
                                                        component="a"
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        variant="caption"
                                                        sx={{ display: 'block', color: 'primary.main', textDecoration: 'none' }}
                                                    >
                                                        {file.fileName}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {row.billable ? 'Billable' : 'Non-billable'}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                                            color: row.isRunning ? 'success.main' : 'text.primary',
                                        }}
                                    >
                                        {row.isRunning ? elapsedSince(row.runningSince) : (row.workedDuration || '—')}
                                    </TableCell>
                                    {costVisible && (
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                                            {row.costFormatted || '—'}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* The just-stopped entry, held open for its description and any attachment. Reuses
                the existing Time Log form rather than a second one — an entry edited from the
                task and the same entry edited from My Timesheet must not be two different
                forms with two different rules. */}
            <TimeLogDetailDialog
                open={!!openLogId}
                timesheetId={openLogId}
                onClose={() => setOpenLogId(null)}
                // The parent owns this query; invalidating the task keys refetches the panel with it.
                onChanged={invalidateTasks}
            />

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
