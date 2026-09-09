/**
 * A Kanban task card (Phase 4 §5).
 *
 * Dense on purpose. A board is scanned, not read: scope, title, project, progress, assignee and
 * due state must all land in one glance without the card becoming a form. Anything that needs
 * explaining belongs on the detail page.
 *
 * The layout is three bands, top to bottom — **what it is** (priority · scope · id), **what it
 * says** (title · project · progress), **who and when** (assignee · due · subtasks · logged time),
 * separated by a hairline. A flat stack of eight equal rows is what made the old card read as a
 * list of fields; banding it gives the eye somewhere to land first.
 *
 * ### Dragging
 *
 * Native HTML5 DnD, no library. The only gesture a board needs is "move this card to that
 * column", and that is exactly what the API models. Touch devices get the stage menu instead
 * (HTML5 DnD does not fire on touch), so the feature is reachable either way.
 *
 * **The drag image is an explicit clone, not the card itself.** Letting the browser snapshot the
 * live node produced the blurred ghost: the snapshot is a raster of the element *including* its
 * transform, so a `scale()` resamples it, and the card sits inside the board's backdrop-filtered
 * surface, which the compositor renders through as well. A detached clone — plain, opaque, tilted,
 * outside that stacking context — is sharp on every browser.
 *
 * **The clone is positioned ON the card it copies, and torn down on the first `drag` event.**
 * Both halves matter, and each was a bug on its own:
 *
 *   - Parking the clone off-screen (`left: -10000px`) is the usual trick and it is not reliable —
 *     Chrome frequently declines to rasterize a node outside the viewport, and silently falls back
 *     to snapshotting the source element instead. The source is dimmed to 35% during a drag, which
 *     is precisely the see-through ghost. Sitting the clone exactly over the original keeps it in
 *     the viewport, so it always rasterizes, and it is invisible to the user because it is pixel-
 *     identical to what was already there.
 *   - `drag` fires only after the drag image has been captured, so it is the one honest signal
 *     that the snapshot is done. A `setTimeout(0)` is a guess, and it lost the race often enough
 *     to make the ghost's appearance look random.
 *
 * `dragend` and unmount are the belt-and-braces cleanups — never the primary one.
 */
import { memo, useEffect, useRef } from 'react';
import { Avatar, Box, Card, Divider, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { type Attendee, initialsOf, ringFor } from '../../MeetingAttendeesDialog';
import { KTIcon } from '@metronic/helpers';
import { formatDate } from '@utils/dateFormats';
import {
    TaskRow, isTaskOverdue, isTaskFinal, loggedSeconds, formatDuration, shortTaskId,
} from '../taskDomain';
import {
    TaskScopeBadge, TaskPriorityBadge, TaskProgress, TaskAssignees, TaskDueDate, FinalStageMark,
} from './primitives';

export interface TaskCardProps {
    task: TaskRow;
    now: Date;
    onOpen: (taskId: string) => void;
    /**
     * Dragging is no longer this component's business.
     *
     * The card used to own the whole gesture — `draggable`, a hand-built `setDragImage` clone,
     * and a dance to stop the browser snapshotting the faded original. `SortableItem` wraps it
     * now: it registers the drag, draws the insertion edge, and renders THIS component again as
     * the floating preview. What is left here is a card.
     */
    /** Touch fallback for stage moves — the board supplies the menu. */
    onRequestMove?: (task: TaskRow, anchor: HTMLElement) => void;
    /**
     * Log the time you spent in a MEETING, from the card.
     *
     * Offered here because the Meeting lane is where several meetings are listed side by side,
     * and accounting for a week of them one at a time through each meeting's own form is the
     * kind of chore people skip — which leaves the project's cost short by exactly the
     * meetings nobody filed. Only on meetings that have finished: there is no time to log for
     * one that has not happened.
     */
    onLogTime?: (task: TaskRow) => void;
    /**
     * Opens the attendee list for a MEETING card.
     *
     * The faces on the card answer "is everyone's time in?" at a glance and nothing more —
     * four avatars is all a 120px card can hold, and the question behind them ("who has not
     * logged, and were they even there?") needs a list, a name per row and a control. So the
     * card shows the state and the modal does the work.
     */
    onOpenAttendees?: (task: TaskRow) => void;
}

/**
 * "Is this meeting accounted for?" — the one thing a finished meeting still owes.
 *
 * ─── IT ONLY APPEARS ONCE THERE IS SOMETHING TO SAY ──────────────────────────
 * A meeting that has not happened owes nobody a timesheet, so it gets no dot at all rather
 * than a third colour meaning "not yet". Once it is over the dot is green if every attendee's
 * time is in and red if any is missing — which is exactly the state that decides whether the
 * project's cost for that meeting is a real number or an understatement.
 *
 * It PULSES because it is the one live thing on a static card: a red dot that does not move is
 * decoration, and this one is a request. The pulse is a ring expanding out of the dot rather
 * than the dot itself changing size, so nothing on the card reflows while it animates — and it
 * stops entirely under `prefers-reduced-motion`, where a repeating animation is a barrier
 * rather than a hint.
 */
const StatusDot = ({ done, title }: { done: boolean; title: string }) => {
    const color = done ? '#16A34A' : '#DC2626';
    return (
        <Tooltip title={title}>
            <Box
                aria-label={title}
                sx={{
                    position: 'relative', width: 8, height: 8, borderRadius: '50%',
                    bgcolor: color, flexShrink: 0,
                    '&::after': {
                        content: '""', position: 'absolute', inset: 0, borderRadius: '50%',
                        boxShadow: `0 0 0 0 ${alpha(color, 0.7)}`,
                        animation: 'wt-dot-pulse 1.9s cubic-bezier(.4,0,.6,1) infinite',
                    },
                    '@keyframes wt-dot-pulse': {
                        '0%': { boxShadow: `0 0 0 0 ${alpha(color, 0.65)}` },
                        '70%': { boxShadow: `0 0 0 6px ${alpha(color, 0)}` },
                        '100%': { boxShadow: `0 0 0 0 ${alpha(color, 0)}` },
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                        '&::after': { animation: 'none', boxShadow: `0 0 0 2px ${alpha(color, 0.35)}` },
                    },
                }}
            />
        </Tooltip>
    );
};

/** A muted count — subtasks, logged time. Quiet by design: these are footnotes, not headlines. */
const MetaChip = ({ icon, label }: { icon: string; label: string }) => (
    <Stack direction="row" spacing={0.3} alignItems="center" sx={{ color: 'text.disabled' }}>
        <KTIcon iconName={icon} className="fs-8" />
        <Typography variant="caption" sx={{ fontSize: 10.5, fontWeight: 600, color: 'inherit' }}>
            {label}
        </Typography>
    </Stack>
);

const TaskCardBase = ({
    task, now, onOpen, onRequestMove, onLogTime, onOpenAttendees,
}: TaskCardProps) => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    /**
     * A MEETING is not a task, and most of this card's furniture is about work in progress.
     *
     * It was wearing all of it: a 0% progress bar (a meeting has no progress), "4 days
     * overdue" (a meeting that has passed HAPPENED, it is not late), and a task-id chip. The
     * card is shared on purpose — one card, one board — so the pieces that only mean something
     * for a task are simply not drawn for a meeting.
     */
    const meeting = (task as any).isMeeting === true;
    /**
     * Everyone still counted as coming — an explicit "did not attend" takes a person out of
     * the row rather than leaving them in it as a permanent red mark.
     */
    /** Over and done: only then does an unfiled timesheet mean anything. */
    const held = meeting && (task as any).lifecycle === 'COMPLETED';
    const attendees: Attendee[] = meeting
        ? ((task as any).attendees ?? []).filter((a: Attendee) => a.attended !== false)
        : [];
    const awaitingCount = attendees.filter((a) => !a.logged).length;

    /**
     * The meeting's day and hour, in the reader's own locale.
     *
     * The date goes through `formatDate`, which is the company standard (`2026.09.10`) and
     * what the lint rule enforces — an OS-locale date would read differently for different
     * people looking at the same board. The TIME stays 12-hour, as the calendar's own chips
     * were changed to be: `formatTime` is 24-hour, and mixing the two would be worse than
     * either.
     */
    const startsAt = meeting && task.startDate ? new Date(task.startDate) : null;
    const meetingDate = startsAt ? formatDate(startsAt, '') : '';
    const meetingTime = startsAt
        ? startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : '';
    /**
     * Four faces, then a count. The people who have NOT logged come first, because the row
     * exists to answer "who still owes a timesheet" — showing the four who are already done
     * and hiding the one who is not would make the card say the opposite of the truth.
     */
    const orderedAttendees = [...attendees].sort((a, b) => Number(a.logged) - Number(b.logged));
    const shownAttendees = orderedAttendees.slice(0, 4);
    const overflowCount = orderedAttendees.length - shownAttendees.length;
    const overdue = !meeting && isTaskOverdue(task, now);
    // Finished work, read off the STORED property of its stage — never the stage's name.
    const done = isTaskFinal(task);
    const logged = loggedSeconds(task.timesheets);
    const subtaskCount = task._count?.subtasks ?? 0;
    return (
        <Card
            elevation={0}
            onClick={() => onOpen(task.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(task.id); }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${task.taskName}, ${task.taskScope.toLowerCase()} task`}
            sx={{
                p: 1.5,
                // The grab cursor comes from SortableItem, which knows whether this
                // card is actually draggable here.
                cursor: 'inherit',
                borderRadius: 2,
                border: '1px solid',
                // Overdue outranks finished: a card can only be one of them, and a late card is
                // the one worth interrupting for. The finished tint is deliberately faint — a
                // wash, not a highlight — because a done card is something the eye should be
                // able to SKIP, not something competing for attention.
                borderColor: overdue
                    ? alpha(theme.palette.error.main, 0.35)
                    : done ? alpha(theme.palette.success.main, 0.3) : 'divider',
                bgcolor: !overdue && done
                    ? alpha(theme.palette.success.main, dark ? 0.09 : 0.045)
                    : 'background.paper',
                // The dragged card's slot is dimmed by SortableItem, so nothing is needed here.
                boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.06)}`,
                transition: theme.transitions.create(
                    ['border-color', 'box-shadow', 'transform', 'opacity'],
                    { duration: 160, easing: theme.transitions.easing.easeOut },
                ),
                '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                    boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.1)}`,
                    transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                },
                // The row menu is chrome, not content: on a pointer device it appears when the
                // card is under the cursor. On touch — where it is the ONLY way to move a card —
                // it is always visible, because there is no hover to reveal it with.
                '@media (hover: hover)': {
                    '& .wt-card-menu': { opacity: 0 },
                    '&:hover .wt-card-menu, & .wt-card-menu:focus-visible': { opacity: 1 },
                },
            }}
        >
            <Stack spacing={1}>
                {/* ── band 1: what it is ── */}
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                    {meeting
                        ? (
                            <Box sx={{
                                px: 0.7, py: 0.15, borderRadius: 0.75, fontSize: 9.5, fontWeight: 800,
                                letterSpacing: 0.4, bgcolor: alpha('#1E3A8A', dark ? 0.34 : 0.12),
                                color: dark ? '#BFD2F5' : '#1E3A8A',
                            }}>
                                MEETING
                            </Box>
                        )
                        : <TaskScopeBadge scope={task.taskScope} />}
                    {!meeting && task.priority && <TaskPriorityBadge priority={task.priority} />}
                    {/* Only once the meeting is over: before that nothing is owed. */}
                    {meeting && held && (
                        <StatusDot
                            done={awaitingCount === 0}
                            title={awaitingCount === 0
                                ? 'All timesheets submitted'
                                : `${awaitingCount} ${awaitingCount === 1 ? 'timesheet' : 'timesheets'} outstanding`}
                        />
                    )}
                    <Box sx={{ flex: 1, minWidth: 8 }} />
                    <FinalStageMark task={task} />
                    {/* A meeting's id is not a reference anybody quotes, so it does not earn the
                        space; the time it starts does — and at 10px, in disabled grey, it was
                        the quietest thing on a card whose whole subject is WHEN. It reads at
                        the weight of the thing it names now, in the meeting's own navy. The
                        task id keeps its old whisper, because an id is a lookup key, not news. */}
                    {meeting
                        ? (
                            /* WHEN, in two lines: the date quiet above, the time loud below.
                               A card in the Meeting lane can be next week's or last month's,
                               and a bare "7:04 PM" said which hour without ever saying which
                               day — the one thing you cannot infer from a board that is not
                               ordered by date on every screen. Stacked rather than joined by a
                               separator so the time keeps the weight it was just given, and so
                               the pair costs no width in a row that also holds the badge. */
                            /* ONE object, not two lines that happen to sit together.
                               The date was the quietest thing in the corner, in disabled
                               grey, next to a time in full navy — so a card in the Meeting
                               lane read as an hour with no day. Tinting the pair as a single
                               block lifts the date without giving it a second accent to
                               compete with the badge and the status dot: the panel is the
                               emphasis, and inside it the time still leads. */
                            /* One line, level with the badge. Stacking the date over the
                                time made the corner two rows tall against a one-row badge, so
                                the head of the card sat lopsided; side by side the two ends
                                balance and the row costs a single line. The date is toned
                                back and the time carries the weight — same order of
                                importance, laid out along the row instead of down it. */
                            <Stack
                                direction="row" spacing={0.6} alignItems="baseline"
                                sx={{
                                    flexShrink: 0, px: 0.85, py: 0.3, borderRadius: 1.25,
                                    bgcolor: alpha('#1E3A8A', dark ? 0.28 : 0.07),
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 10, fontWeight: 700, letterSpacing: '.01em',
                                        whiteSpace: 'nowrap', color: dark ? '#8FA9D9' : '#5C7BBF',
                                    }}
                                >
                                    {meetingDate}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: 12, fontWeight: 800, letterSpacing: '-.01em',
                                        whiteSpace: 'nowrap', color: dark ? '#DCE8FF' : '#1E3A8A',
                                    }}
                                >
                                    {meetingTime}
                                </Typography>
                            </Stack>
                        )
                        : (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: 10, letterSpacing: '-.02em' }}
                            >
                                {shortTaskId(task.id)}
                            </Typography>
                        )}
                    {onRequestMove && (
                        <Tooltip title="Move to stage">
                            <Box
                                component="button"
                                type="button"
                                className="wt-card-menu"
                                aria-label="Move to stage"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    onRequestMove(task, e.currentTarget);
                                }}
                                sx={{
                                    border: 0, p: 0.25, borderRadius: 0.75, cursor: 'pointer',
                                    bgcolor: 'transparent', color: 'text.disabled', lineHeight: 0,
                                    transition: 'opacity .15s, background-color .15s, color .15s',
                                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                }}
                            >
                                <KTIcon iconName="dots-vertical" className="fs-8" />
                            </Box>
                        </Tooltip>
                    )}
                </Stack>

                {/* ── band 2: what it says ── */}
                <Box sx={{ minWidth: 0 }}>
                    {/* A subtask must READ as a subtask.
                        This used to be 10px disabled-grey text with a small glyph — the same
                        weight and colour as the project line two rows below it, so the one line
                        that says "this is part of something bigger" looked like more metadata.
                        It is now a tinted pill with the parent's name and a return arrow, which
                        is the shape the eye already reads as "belongs to". */}
                    {task.parentTaskId && (
                        <Stack
                            direction="row" spacing={0.4} alignItems="center"
                            sx={{
                                mb: 0.5, maxWidth: '100%', width: 'fit-content',
                                px: 0.6, py: 0.15, borderRadius: 0.75,
                                bgcolor: alpha(theme.palette.secondary.main, dark ? 0.24 : 0.12),
                                color: theme.palette.secondary.main,
                            }}
                        >
                            <KTIcon iconName="arrow-down-left" className="fs-9" />
                            <Typography variant="caption" noWrap sx={{ fontSize: 10, fontWeight: 700, minWidth: 0 }}>
                                {task.parentTask?.taskName || 'Subtask'}
                            </Typography>
                        </Stack>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600, fontSize: 13.5, lineHeight: 1.4, color: 'text.primary',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', wordBreak: 'break-word',
                        }}
                    >
                        {task.taskName}
                    </Typography>

                    {/* The project — or an explicit internal marker, never a blank line. */}
                    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.35, minWidth: 0, color: 'text.secondary' }}>
                        <KTIcon iconName={task.taskScope === 'PROJECT' ? 'office-bag' : 'home-2'} className="fs-9" />
                        <Typography variant="caption" noWrap sx={{ fontSize: 11, minWidth: 0, color: 'inherit' }}>
                            {task.taskScope === 'PROJECT'
                                ? (task.lead?.title || 'Project unavailable')
                                : 'Internal / no project'}
                        </Typography>
                    </Stack>
                </Box>

                {!meeting && <TaskProgress value={task.progress} height={4} />}

                {/* ── who is coming, and whose time is in ──
                    Only on meetings, and only once there are faces to draw. A ring per person:
                    green if their time is logged, red if it is not. People who have said they
                    did not attend are absent from the row entirely — they are not being chased
                    for a timesheet, so a red mark against them would be asking for work they
                    never did. */}
                {meeting && attendees.length > 0 && (
                    <Stack
                        direction="row" spacing={0.75} alignItems="center"
                        onClick={onOpenAttendees ? (e) => { e.stopPropagation(); onOpenAttendees(task); } : undefined}
                        role={onOpenAttendees ? 'button' : undefined}
                        tabIndex={onOpenAttendees ? 0 : undefined}
                        onKeyDown={onOpenAttendees ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAttendees(task); }
                        } : undefined}
                        sx={{
                            minWidth: 0, cursor: onOpenAttendees ? 'pointer' : 'default',
                            borderRadius: 1, px: 0.25, py: 0.25,
                            '&:hover': onOpenAttendees ? { bgcolor: alpha(theme.palette.text.primary, dark ? 0.08 : 0.04) } : undefined,
                        }}
                    >
                        {/* TWO rings per face, and they do different jobs. The inner one is the
                            status colour and hugs the photo; the outer one is the card's own
                            surface and is what cuts the notch between overlapping circles, so a
                            stack reads as separate people rather than one smeared shape. Without
                            the outer ring the status colours of neighbouring faces touch and the
                            row becomes a striped blur.

                            Hand-stacked rather than MUI's AvatarGroup: its surplus bubble shares
                            a class with every other avatar in the group, so styling "+N" alone
                            means guessing at DOM order, and its spacing rule and a border of our
                            own fight over the same margin. A flex row with one negative margin is
                            less code than working around either.

                            Left-most sits on top, so the eye reads the row in the direction it
                            already reads everything else. */}
                        <Box sx={{ display: 'flex', flexShrink: 0 }}>
                            {shownAttendees.map((a, i) => (
                                <Tooltip
                                    key={a.employeeId}
                                    title={`${a.name}${a.isOrganizer ? ' (organizer)' : ''} — ${ringFor(a).label}`}
                                >
                                    <Avatar
                                        src={a.avatar || undefined}
                                        sx={{
                                            width: 26, height: 26, fontSize: 9.5, fontWeight: 800,
                                            border: `2px solid ${ringFor(a).color}`,
                                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                                            ml: i === 0 ? 0 : '-9px',
                                            zIndex: shownAttendees.length - i,
                                        }}
                                    >
                                        {initialsOf(a.name)}
                                    </Avatar>
                                </Tooltip>
                            ))}
                            {overflowCount > 0 && (
                                <Tooltip title={`${overflowCount} more — view attendance`}>
                                    <Avatar
                                        sx={{
                                            width: 26, height: 26, fontSize: 9.5, fontWeight: 800,
                                            bgcolor: dark ? '#0B1220' : '#0F172A',
                                            color: '#FFFFFF',
                                            border: '2px solid transparent',
                                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                                            ml: '-9px',
                                            zIndex: 0,
                                        }}
                                    >
                                        +{overflowCount > 99 ? 99 : overflowCount}
                                    </Avatar>
                                </Tooltip>
                            )}
                        </Box>
                        {awaitingCount > 0 && (
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>
                                {awaitingCount} pending
                            </Typography>
                        )}
                    </Stack>
                )}

                <Divider sx={{ borderColor: 'divider', opacity: 0.7 }} />

                {/* ── band 3: who and when ── */}
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                    {/* Everyone on it, owner first — a shared task shows as a group. */}
                    {!meeting && (
                        <TaskAssignees assignees={task.assignees} fallback={task.assignedTo} size={24} max={2} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {meeting
                            ? (
                                <Tooltip title={(task as any).isOnline ? 'Online' : ((task as any).location || 'In person')}>
                                    {/* TWO lines, then an ellipsis. A single truncated line of
                                        a real address stops at the district and tells you
                                        nothing — "Uran, Uran Subdistrict, Raigad, Maharas…"
                                        is not a place. Two lines usually hold the whole thing,
                                        and the clamp guarantees the card cannot be stretched
                                        by a long one. */}
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontSize: 11, color: 'text.secondary',
                                            display: '-webkit-box', WebkitBoxOrient: 'vertical',
                                            WebkitLineClamp: 2, overflow: 'hidden',
                                            lineHeight: 1.35, wordBreak: 'break-word',
                                        }}
                                    >
                                        {(task as any).isOnline ? 'Online' : ((task as any).location || 'In person')}
                                    </Typography>
                                </Tooltip>
                            )
                            : <TaskDueDate task={task} now={now} pill />}
                    </Box>
                    {/* "3 subtasks", not a bare "3" beside a glyph nobody has to decode. This is
                        the other half of telling the two apart: a card either belongs to a
                        parent (the pill above) or HAS children (this chip), and a card with
                        neither is standalone work. */}
                    {subtaskCount > 0 && (
                        <MetaChip
                            icon="tree"
                            label={`${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'}`}
                        />
                    )}
                    {logged > 0 && <MetaChip icon="timer" label={formatDuration(logged)} />}
                    {/* A real <button>, which is also what keeps it from starting a drag —
                        the sortable engine ignores presses that land on something operable. */}
                    {held && onLogTime && (
                        <Tooltip title="Log my time">
                            <Box
                                component="button"
                                type="button"
                                aria-label="Log my time in this meeting"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onLogTime(task); }}
                                sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 0.3,
                                    px: 0.6, py: 0.15, borderRadius: 1, cursor: 'pointer',
                                    border: '1px solid', borderColor: alpha('#B45309', dark ? 0.45 : 0.3),
                                    bgcolor: 'transparent', color: '#B45309',
                                    fontFamily: 'inherit', fontSize: 10.5, fontWeight: 700,
                                    '&:hover': { bgcolor: alpha('#B45309', dark ? 0.22 : 0.1) },
                                }}
                            >
                                <KTIcon iconName="timer" className="fs-9" />
                                Log time
                            </Box>
                        </Tooltip>
                    )}
                </Stack>
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
