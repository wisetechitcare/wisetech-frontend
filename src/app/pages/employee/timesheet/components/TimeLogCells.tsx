import { Avatar, Box, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { initialsOf } from '@app/pages/employee/MeetingAttendeesDialog';
import {
    type TimesheetLike, entrySeconds, durationConflict, formatSpan, logSubject,
} from '../timesheetDuration';

/**
 * The two cells that carry a timesheet row's meaning, shared by both timesheet tables.
 *
 * They were written twice, once per page, and the copies had already drifted — which is how
 * the same entry could read differently depending on which screen an admin opened.
 */

const KIND = {
    meeting: { icon: 'calendar-8', color: '#1E3A8A', word: 'Meeting' },
    task: { icon: 'check-square', color: '#0891B2', word: 'Task' },
    none: { icon: 'abstract-26', color: '#94A3B8', word: 'No task or meeting' },
} as const;

/**
 * What the time was spent on.
 *
 * ─── THE KIND IS A GLYPH, NOT A BADGE ────────────────────────────────────────
 * A tag on every row is a tag that says nothing — it repeats on all of them and only costs
 * width. The glyph carries the kind at a colour strong enough to pick out a meeting from
 * across a page of tasks, and the name gets the space a name deserves. Nothing here is a
 * colour-only distinction: the glyph shapes differ too, and the tooltip says the word.
 */
export const SubjectCell = ({ entry, onOpen }: { entry: TimesheetLike; onOpen?: () => void }) => {
    const dark = useTheme().palette.mode === 'dark';
    const subject = logSubject(entry);
    const kind = KIND[subject.kind];
    return (
        <Stack
            direction="row" spacing={1} alignItems="center"
            onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(); } : undefined}
            sx={{ minWidth: 0, cursor: onOpen ? 'pointer' : 'default' }}
        >
            <Tooltip title={kind.word}>
                <Box sx={{
                    width: 22, height: 22, borderRadius: 1.5, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: alpha(kind.color, dark ? 0.3 : 0.12), color: kind.color,
                }}>
                    <KTIcon iconName={kind.icon} className="fs-8" />
                </Box>
            </Tooltip>
            <Typography
                variant="body2" noWrap
                sx={{ fontWeight: 600, minWidth: 0, color: subject.kind === 'none' ? 'text.secondary' : 'text.primary' }}
            >
                {subject.name}
            </Typography>
        </Stack>
    );
};

/**
 * How long it took — the figure the cost is calculated from, and nothing else.
 *
 * Where the logged figure and the clock window disagree, the window is printed underneath in
 * small type. Both numbers are real (you can leave a meeting early), and an admin looking at a
 * one-hour slot billed as two hours needs to see WHICH one the money followed rather than
 * decide the table is broken. Silent on the rows where they agree, which is nearly all of them.
 */
export const DurationCell = ({ entry }: { entry: TimesheetLike }) => {
    const conflict = durationConflict(entry);
    return (
        <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.3 }}>
                {formatSpan(entrySeconds(entry))}
            </Typography>
            {conflict && (
                <Tooltip title={`Logged as ${formatSpan(conflict.logged)}. The start and end times span ${formatSpan(conflict.window)} — the logged figure is what is charged.`}>
                    <Typography variant="caption" sx={{ color: 'warning.main', fontSize: 10.5, lineHeight: 1.3 }}>
                        {formatSpan(conflict.window)} on the clock
                    </Typography>
                </Tooltip>
            )}
        </Stack>
    );
};

/**
 * The faces this entry belongs to.
 *
 * A TASK has an owner, and one avatar says whose work the hours went against. A MEETING has a
 * roster instead, and the column was a dash on every meeting row — which is the row where "who
 * was this for" is least obvious, since the entry names a meeting rather than a person.
 *
 * Left-most on top and a ring in the surface colour between them, matching the board's cards:
 * the same people drawn the same way in both places, so a stack is recognisable as a stack
 * rather than as two different components that happen to overlap circles.
 */
export const AttendeeAvatars = ({ attendees, max = 4 }: {
    attendees: Array<{ employeeId: string; name: string; avatar?: string | null; isOrganizer?: boolean }>;
    max?: number;
}) => {
    const theme = useTheme();
    const shown = attendees.slice(0, max);
    const extra = attendees.length - shown.length;
    return (
        <Stack direction="row" alignItems="center" sx={{ minWidth: 0 }}>
            {shown.map((a, i) => (
                <Tooltip key={a.employeeId} title={`${a.name}${a.isOrganizer ? ' (organizer)' : ''}`}>
                    <Avatar
                        src={a.avatar || undefined}
                        sx={{
                            width: 24, height: 24, fontSize: 9.5, fontWeight: 800,
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            ml: i === 0 ? 0 : '-8px',
                            zIndex: shown.length - i,
                        }}
                    >
                        {initialsOf(a.name)}
                    </Avatar>
                </Tooltip>
            ))}
            {extra > 0 && (
                <Tooltip title={attendees.slice(max).map((a) => a.name).join(', ')}>
                    <Avatar
                        sx={{
                            width: 24, height: 24, fontSize: 9.5, fontWeight: 800,
                            bgcolor: theme.palette.mode === 'dark' ? '#0B1220' : '#0F172A',
                            color: '#FFFFFF',
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            ml: '-8px', zIndex: 0,
                        }}
                    >
                        +{extra > 99 ? 99 : extra}
                    </Avatar>
                </Tooltip>
            )}
        </Stack>
    );
};
