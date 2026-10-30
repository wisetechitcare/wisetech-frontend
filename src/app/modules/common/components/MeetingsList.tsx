import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
    getMeetingsByProject, getMeetingsByContact, getMeetingsByEmployee, getProjectMeetingAnalytics,
} from '@services/employee';
import { useNavigate } from 'react-router-dom';
import { fetchConfiguration } from '@services/company';
import { safeJsonParse } from '@utils/safeJson';
import { mapsUrl } from '@app/pages/employee/meetingAddress';
import {
    meetingWhere, modeHasLink, modeHasPlace, modeOfExisting,
} from '@app/pages/employee/meetingModes';
import {
    MEETING_HALF_PM, MEETING_HALF_FREE_COLOR, MEETING_HALF_AM,
    MEETING_STATUS_CANCELLED, MEETING_STATUS_AWAITING, MEETING_STATUS_HELD,
    MEETING_TIMESHEET_FILLED, MEETING_TIMESHEET_PENDING, MEETING_TODAY_COLOR,
} from '@constants/configurations-key';
import { Avatar, Box, Dialog, DialogContent, Tooltip, useMediaQuery } from '@mui/material';
// Direct module, NOT the `ui` barrel. The barrel re-exports 58 symbols, one of which
// transitively loads _metronic/layout/core — and that module calls getLayout() at import
// time, which reads localStorage. Pulling the barrel in here made halfColors.test.ts and
// meetingLifecycleTone.test.ts fail at import with "localStorage is not defined", before a
// single assertion ran. chips.tsx itself imports only MUI and the theme tokens.
// Same rule as AppIcon and SegmentedControl below — see ui/README.md.
import { toneAlpha } from '@app/modules/common/components/ui/chips';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { SegmentedControl } from '@app/modules/common/components/ui/SegmentedControl';
import { AutoGrid } from '@app/modules/common/components/ui/AutoGrid';
import { getTimeTokens } from '@utils/timeFormat';
import { getCurrencyLocale, currencyPrefix } from '@utils/currency';
import { errorConfirmation } from '@utils/modal';
import { Button } from '@/ds/ui/button';

/**
 * MeetingsList — the meetings surface, shared by the project (entity), contact and employee
 * pages AND by the Calendar module's own Meetings tab.
 *
 *   mode="project"   → meetings whose projectId is the given lead/project id
 *   mode="contact"   → meetings where the contact is an external participant
 *   mode="employee"  → meetings the employee organized or participates in
 *
 * ONE component for all four screens, deliberately. The Calendar module used to carry its own
 * separate MaterialTable of the same rows, so "add a calendar view to Meetings" would have
 * meant building it twice and then keeping the two in step. Every change here lands in every
 * place meetings are read.
 *
 * ─── TWO LAYOUTS ─────────────────────────────────────────────────────────────
 * **Month** is the default and is the point of the screen: it answers "when am I free?", which
 * a table cannot. Each day is tinted by how loaded it is — grey means nothing booked — so a
 * free afternoon is found by looking, not by reading rows and doing date arithmetic.
 *
 * **Table** is the same rows for when the question is "what exactly was that meeting", and it
 * leads with DATE and TIME rather than the title: this list is read chronologically, so the
 * columns people scan are the ones that place a meeting in the week.
 *
 * The backend pre-resolves organizerName / participantNames / externalParticipantNames, so
 * this component only renders.
 */

interface MeetingRow {
    id: string;
    title: string;
    description?: string;
    /** The legacy mirror of `meetingMode`, still sent by the API. */
    isOnline: boolean;
    /** ONLINE | OFFLINE | HYBRID. Absent on a row from an older server — see `modeOfExisting`. */
    meetingMode?: string | null;
    meetingLink?: string | null;
    location?: string | null;
    startDate: string;
    endDate: string;
    /** SCHEDULED | COMPLETED | CANCELLED — derived server-side, never stored as COMPLETED. */
    lifecycle?: string;
    /** Time actually logged against this meeting, and by how many people. 0 = unrecorded. */
    loggedMinutes?: number;
    loggedBy?: number;
    /** Internal attendees who have not logged time yet. Absent on rows from an older server. */
    pendingTimesheetNames?: string[];
    cancelReason?: string | null;
    /** The organizer. Who may edit or cancel is decided against this. */
    employeeId?: string;
    /** Raw rosters as stored — ids, not names — which is what the edit form needs back. */
    participants?: string;
    externalParticipants?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    projectNumber?: string | null;
    /**
     * The linked row is still a LEAD — its status is not a project trigger. Server-derived,
     * because "has this become a project" has exactly one definition and it lives there.
     *
     * Load-bearing twice over: it labels the row, and it decides the `isProject` nav state
     * below, which the entity page uses to choose which tabs exist.
     */
    isLead?: boolean;
    organizerName?: string;
    participantNames?: string[];
    externalParticipantNames?: string[];
    /**
     * The roster as objects, which the `*Names` arrays above cannot safely be.
     *
     * Those two are parallel lists that each drop unresolvable entries, so one missing
     * employee shifts every later index and the name beside a face stops being that person's.
     * Fine for a comma-joined sentence, not fine for a list of avatars.
     *
     * Optional: a row from an older server does not carry it, and the roster simply does not
     * render rather than the card failing.
     */
    attendees?: Array<{
        id: string; name: string; avatar?: string | null;
        isOrganizer?: boolean; pendingTimesheet?: boolean;
    }>;
    externalAttendees?: Array<{ id: string; name: string; avatar?: string | null }>;
    /** Whether the signed-in viewer may edit, cancel, or drag this meeting (server-derived). */
    canManage?: boolean;
}

/** Matches the API refusal from `canManageMeeting`. */
export const MEETING_MANAGE_DENIED =
    'Only the meeting organizer or a manager of its project can change it.';

export const canManageMeetingRow = (m: MeetingRow, viewerEmployeeId?: string): boolean => {
    if (typeof m.canManage === 'boolean') return m.canManage;
    if (!viewerEmployeeId) return false;
    return m.employeeId === viewerEmployeeId;
};

const th: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
    letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', textAlign: 'left', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569', verticalAlign: 'top' };
const tdTitle: React.CSSProperties = { ...td, fontWeight: 700, color: '#1E293B' };

const namesCell = (names: string[] | undefined) => {
    if (!names || names.length === 0) return <span style={{ color: '#94A3B8' }}>—</span>;
    const shown = names.slice(0, 3).join(', ');
    const extra = names.length - 3;
    return (
        <span title={names.join(', ')}>
            {shown}
            {extra > 0 && <span style={{ color: '#64748B', fontWeight: 600 }}> +{extra} more</span>}
        </span>
    );
};

const FETCHERS = {
    project: getMeetingsByProject,
    contact: getMeetingsByContact,
    employee: getMeetingsByEmployee,
} as const;

const EMPTY_HINTS: Record<keyof typeof FETCHERS, string> = {
    project: 'Meetings created for this project from the Calendar will appear here.',
    contact: 'Meetings where this contact is an external participant will appear here.',
    employee: 'Meetings this employee organizes or attends will appear here.',
};

/**
 * A day is TWO slots, not one.
 *
 * "Is the 4th free?" is rarely the real question — an afternoon is bookable even when the
 * morning is gone, and a whole-day tint threw that away by reporting a single number for a
 * day that has two independently usable halves. AM/PM is also the vocabulary the product
 * already uses: leave stores its half-day sessions as exactly these two values.
 *
 * ─── A MEETING IS IN ONE HALF: THE ONE IT STARTS IN ──────────────────────────
 * The boundary is noon, and a meeting counts against the half its START time falls in — so
 * 11:00–12:10 is a MORNING meeting and appears once.
 *
 * It used to count against every half it OVERLAPPED, on the reasoning that 11:30–12:30
 * genuinely blocks the end of the morning and the start of the afternoon. What that produced
 * on screen was the same meeting listed twice, in two panels, ten minutes of overrun making a
 * whole afternoon look committed — and a person reading "2 meetings" on a day that has one.
 * A row printed twice is not a warning, it is a row somebody has to work out is the same row.
 *
 * The half a meeting BELONGS to is the hour it is booked at, which is also the time the row
 * prints and the time anyone would name it by. `startHalf` is that rule for a single meeting
 * and this is the same rule over a list — one definition, so the tint on a row and the panel
 * it is filed under cannot disagree.
 */
const HALF_BOUNDARY_HOUR = 12;

/**
 * Which half a meeting is in: the one it STARTS in, which is the time the row prints.
 *
 * Declared here rather than beside the tint that also uses it, because `splitHalves` below is
 * the same rule applied to a list and the two must not be able to drift apart.
 */
const startHalf = (m: Pick<MeetingRow, 'startDate'>): 'am' | 'pm' =>
    (dayjs(m.startDate).hour() < HALF_BOUNDARY_HOUR ? 'am' : 'pm');

/** The day is no longer an argument: the meeting's own start hour answers it. */
export const splitHalves = <T extends Pick<MeetingRow, 'startDate'>>(list: T[]) => {
    const am: T[] = [];
    const pm: T[] = [];
    for (const m of list) (startHalf(m) === 'am' ? am : pm).push(m);
    return { am, pm };
};

/**
 * How a half-day looks.
 *
 * ─── COLOUR SAYS WHICH HALF, NOT HOW MANY ────────────────────────────────────
 * It used to be a count ramp — pale for one meeting, navy for two or more — which spent the
 * grid's only colour axis on a number already printed on the pill, and left a busy morning and
 * a busy afternoon looking identical. That is the one comparison this grid exists to make:
 * "am I free before lunch, or after". So a taken morning wears the morning colour, a taken
 * afternoon the afternoon colour, and an untaken half the free colour. Three colours, three
 * meanings, none of them a quantity.
 *
 * Free is deliberately the only OUTLINED state. Booked halves are solid, so a month's busy
 * days sit forward of the free ones instead of every day carrying equal visual weight.
 *
 * The defaults are the product's navy for the morning and its amber for the afternoon — cool
 * then warm, which is the shape of a day and needs no key once seen.
 */
export interface HalfColors { free: string; am: string; pm: string }
/** What the two halves are CALLED. A setting, because not every office says AM and PM. */
export interface HalfLabels { am: string; pm: string }

const DEFAULT_HALF_COLORS: HalfColors = { free: '#F8FAFC', am: '#1E3A8A', pm: '#B45309' };
const DEFAULT_HALF_LABELS: HalfLabels = { am: 'AM', pm: 'PM' };

/**
 * A phone. The same query MaterialTable already uses, so the two agree about where the
 * layout changes rather than each picking its own idea of "small".
 */
const PHONE = '(max-width:600px)';

/**
 * Narrower than a laptop, wider than a phone.
 *
 * Only the stat grid reads this. Four cards need about 200px each before their labels start
 * wrapping, and below roughly this width the page's own sidebar has already taken enough of
 * the row that four would be cramped rather than dense.
 */
const NARROW = '(max-width:1180px)';

/**
 * A meeting chip is a FIXED box, not a box the size of its title.
 *
 * The month grid is seven `1fr` columns, and a grid item's default `min-width: auto` means a
 * long meeting title sets the column's minimum — so one meeting called "Quarterly planning
 * review with the vendor" widened its column and squeezed the other six. The cell is given
 * `minWidth: 0` to stop that, and each chip a fixed height with an ellipsis, so a cell holding
 * four meetings is exactly as tall as a cell holding four other meetings.
 */
const CHIP_H = 15;
const CHIP_H_PHONE = 13;

/**
 * The clock a "new meeting on this day" opens at.
 *
 * 9 for the morning, 14 for the afternoon — the hour someone would have typed anyway. The form
 * still moves it forward if that moment has already passed today, so this is a starting point
 * and never a booking in the past.
 */
const HALF_OPENING_HOUR = { am: 9, pm: 14 } as const;

/**
 * The only two fields any of the state predicates below actually read.
 *
 * Narrower than MeetingRow on purpose: it lets the same functions answer for a half-built row
 * in a test without inventing an id, a title and two dates that have no bearing on the answer.
 */
type MeetingState = Pick<MeetingRow, 'lifecycle' | 'loggedMinutes'>;

const isCancelled = (m: MeetingState) => m.lifecycle === 'CANCELLED';
const isHeld = (m: MeetingState) => m.lifecycle === 'COMPLETED';

/**
 * A meeting that happened and that nobody has logged time against.
 *
 * NOT the same as "free". Cost comes from timesheets now, so a held meeting with nothing
 * logged costs ₹0 — and ₹0 reads as "this was free", when what it actually means is "nobody
 * has said what this took". The two need telling apart wherever a cost is shown, or the
 * project's total quietly understates itself and looks precise doing it.
 */
const isAwaitingTime = (m: MeetingState) => isHeld(m) && !(m.loggedMinutes ?? 0);

/**
 * A past meeting on the calendar: has every internal attendee logged their time?
 * Null for meetings still to come, cancelled ones, and rows from a server that does not send
 * the pending list — those keep their half-day colour rather than guessing.
 */
export const timesheetStateOf = (m: Pick<MeetingRow, 'lifecycle' | 'pendingTimesheetNames'>): 'filled' | 'pending' | null =>
    (!isHeld(m) || !Array.isArray(m.pendingTimesheetNames)
        ? null
        : m.pendingTimesheetNames.length ? 'pending' : 'filled');

/**
 * Day-cell wash for past meetings' timesheet state.
 * Pending wins when both exist — unpaid time is the thing that needs attention.
 */
export const dayTimesheetMarker = (
    list: Array<Pick<MeetingRow, 'lifecycle' | 'pendingTimesheetNames'>>,
): 'pending' | 'filled' | null => {
    let filled = false;
    for (const m of list) {
        const ts = timesheetStateOf(m);
        if (ts === 'pending') return 'pending';
        if (ts === 'filled') filled = true;
    }
    return filled ? 'filled' : null;
};

/** The tooltip line naming who still owes time, or '' when there is nothing to say. */
const timesheetNote = (m: MeetingRow) => {
    const ts = timesheetStateOf(m);
    if (!ts) return '';
    return ts === 'filled'
        ? '\nAll timesheets filled'
        : `\nTimesheet pending: ${m.pendingTimesheetNames!.join(', ')}`;
};

/** How much vertical space each chip may use inside a fixed month cell. */
const monthChipLayout = (stack: number, isPhone: boolean, hasMore: boolean) => {
    const cellH = isPhone ? 76 : 118;
    const pad = isPhone ? 8 : 12;
    const dateRow = isPhone ? 14 : 22;
    const moreRow = hasMore ? (isPhone ? 11 : 14) : 0;
    const gap = isPhone ? 2 : 3;
    const budget = cellH - pad - dateRow - moreRow - Math.max(0, stack - 1) * gap;
    const per = stack > 0 ? Math.max(isPhone ? 13 : 15, Math.floor(budget / stack)) : budget;
    if (isPhone) {
        return { maxHeight: per, lines: 1, fontSize: 8.5 };
    }
    if (stack <= 1) {
        return { maxHeight: CHIP_H + 8, lines: 1, fontSize: 11 };
    }
    if (stack === 2) {
        return { maxHeight: per, lines: 2, fontSize: 10 };
    }
    return { maxHeight: per, lines: 1, fontSize: 9.5 };
};

/** Busy phone cells show one chip plus a count; quieter days may show two. */
const phoneChipCap = (meetingCount: number) => (
    meetingCount >= 3 ? 1 : Math.min(2, meetingCount)
);

/** Short start-time label for a narrow month cell (`10 AM` vs `2:30 PM`). */
const phoneMonthTimeLabel = (startIso: string) => {
    const d = dayjs(startIso);
    return d.minute() === 0 ? d.format('h A') : d.format('h:mm A');
};

/** Tinted pill showing start time only — phone month grid (not full event cards). */
const PhoneMonthTimeChip = ({
    meeting,
    chipColor,
}: {
    meeting: MeetingRow;
    chipColor: (m: MeetingRow) => string;
}) => {
    const c = chipColor(meeting);
    const label = phoneMonthTimeLabel(meeting.startDate);
    const cancelled = isCancelled(meeting);
    return (
        <span
            title={`${label} — ${meeting.title}`}
            aria-hidden
            style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: '2px 4px',
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.25,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: toneAlpha(c, 0.15),
                color: c,
                border: `1px solid ${toneAlpha(c, 0.34)}`,
                ...(cancelled ? { opacity: 0.52, textDecoration: 'line-through' } : {}),
            }}
        >
            {label}
        </span>
    );
};

/** Compact month-cell time chips on phone — no dots, no full-width colour blocks. */
const PhoneMonthCellMeetings = ({
    list,
    onShowAgenda,
    chipColor,
}: {
    list: MeetingRow[];
    onShowAgenda: () => void;
    chipColor: (m: MeetingRow) => string;
}) => {
    const n = list.length;
    if (!n) return null;
    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();
    const sorted = [...list].sort(
        (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
    );
    const cap = phoneChipCap(n);
    const shown = sorted.slice(0, cap);
    const overflow = n - shown.length;

    const moreBtn = (extra: number, total: number) => (
        <Button variant="link" size="xs"
            type="button"
            aria-label={`Show all ${total} meetings on this day`}
            onClick={(e) => { stop(e); onShowAgenda(); }}
        >
            +{extra} more
        </Button>
    );

    if (cap === 0) {
        return (
            <div style={{ marginTop: 'auto', minWidth: 0, width: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#475569' }}>{n} meetings</span>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
            minWidth: 0, width: '100%',
        }}>
            {shown.map((m) => (
                <PhoneMonthTimeChip key={m.id} meeting={m} chipColor={chipColor} />
            ))}
            {overflow > 0 && moreBtn(overflow, n)}
        </div>
    );
};

type MonthChipLayout = ReturnType<typeof monthChipLayout>;

/** Month cell meeting row — fixed slot at rest; hover floats full text above/below without stacking. */
const MonthMeetingChip = ({
    layout,
    tone,
    draggable,
    onDragStart,
    pauseCellClick,
    cancelled,
    allowExpand,
    children,
}: {
    layout: MonthChipLayout;
    tone: { bg: string; fg: string };
    draggable: boolean;
    onDragStart?: (e: React.DragEvent<HTMLSpanElement>) => void;
    pauseCellClick: boolean;
    cancelled: boolean;
    /** Desktop hover expand; off on phone — open the day dialog for full detail. */
    allowExpand: boolean;
    children: React.ReactNode;
}) => {
    const slotRef = useRef<HTMLSpanElement>(null);
    const chipRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [growUp, setGrowUp] = useState(false);
    const clamped = layout.lines > 1;
    const reduced = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useLayoutEffect(() => {
        if (!open) return;
        const slot = slotRef.current;
        const chip = chipRef.current;
        const text = textRef.current;
        const stack = slot?.parentElement;
        if (!slot || !chip || !text || !stack) return;

        const full = text.scrollHeight + 8;
        const rest = layout.maxHeight;
        const slotTop = slot.offsetTop;
        const spaceBelow = stack.clientHeight - slotTop - rest;
        const up = full - rest > spaceBelow && slotTop >= full - rest;
        setGrowUp(up);

        chip.style.transition = reduced ? 'none' : 'max-height 0.38s cubic-bezier(0.33, 1, 0.68, 1), box-shadow 0.22s ease';
        chip.style.maxHeight = `${rest}px`;
        void chip.offsetHeight;
        requestAnimationFrame(() => {
            chip.style.maxHeight = `${Math.max(full, rest)}px`;
        });
    }, [open, children, layout.maxHeight, layout.fontSize, reduced]);

    const close = () => {
        const chip = chipRef.current;
        if (!chip || !open) {
            setOpen(false);
            setGrowUp(false);
            return;
        }
        if (reduced) {
            chip.style.maxHeight = `${layout.maxHeight}px`;
            setOpen(false);
            setGrowUp(false);
            return;
        }
        chip.style.transition = 'max-height 0.26s ease, box-shadow 0.18s ease';
        chip.style.maxHeight = `${layout.maxHeight}px`;
        const onEnd = (e: TransitionEvent) => {
            if (e.propertyName !== 'max-height') return;
            chip.removeEventListener('transitionend', onEnd);
            setOpen(false);
            setGrowUp(false);
        };
        chip.addEventListener('transitionend', onEnd);
    };

    return (
        <span
            ref={slotRef}
            style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                height: layout.maxHeight,
                flex: '0 0 auto',
                flexShrink: 0,
            }}
        >
            <span
                ref={chipRef}
                draggable={draggable}
                onDragStart={onDragStart}
                onMouseEnter={allowExpand ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}
                onMouseLeave={allowExpand ? (e) => { e.stopPropagation(); close(); } : undefined}
                onTouchStart={allowExpand ? (e) => {
                    if (pauseCellClick) e.stopPropagation();
                    setOpen(true);
                } : undefined}
                onTouchEnd={allowExpand ? () => close() : undefined}
                onTouchCancel={allowExpand ? () => close() : undefined}
                onWheel={open ? (e) => e.stopPropagation() : undefined}
                style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    borderRadius: 4,
                    background: tone.bg,
                    cursor: draggable ? 'grab' : 'inherit',
                    maxHeight: layout.maxHeight,
                    ...(open ? {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        ...(growUp ? { bottom: 0 } : { top: 0 }),
                        zIndex: 6,
                        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)',
                    } : {
                        position: 'relative',
                        height: '100%',
                    }),
                    ...(cancelled ? { textDecoration: 'line-through', opacity: 0.55 } : {}),
                }}
            >
                <span
                    ref={textRef}
                    style={{
                        display: open ? 'block' : (clamped ? '-webkit-box' : 'block'),
                        padding: '3px 5px',
                        fontSize: layout.fontSize,
                        fontWeight: 600,
                        lineHeight: 1.25,
                        color: tone.fg,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        ...(open ? {
                            whiteSpace: 'normal',
                        } : clamped ? {
                            WebkitLineClamp: layout.lines,
                            WebkitBoxOrient: 'vertical' as const,
                            whiteSpace: 'normal',
                        } : {
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        }),
                    }}
                >
                    {children}
                </span>
            </span>
        </span>
    );
};

/**
 * The three states a meeting can be READ in — ONE colour each, and everything else derived.
 *
 * These used to be three hand-picked hexes per state (badge fill, badge ink, row edge). That
 * is fine while the palette is fixed and impossible once it is not: somebody picks a deep
 * colour in Calendar Configuration and two of the three stop matching it, with the badge ink
 * the one that goes unreadable. So the SAVED value is the edge, and the badge fill and ink are
 * computed from it — a pale mix of the colour behind a dark mix of the same colour, which
 * holds its contrast at any hue somebody chooses.
 *
 * The defaults are the states' conventional colours, and they are what a step falls back to
 * when its configuration row is absent or switched off.
 */
export const LIFECYCLE_DEFAULT_COLORS = {
    cancelled: '#DC2626',
    awaiting: '#D97706',
    held: '#15803D',
    /** Calendar only: a past meeting everyone has logged, and one someone still owes. */
    filled: '#0F766E',
    pending: '#BE123C',
} as const;

export type LifecycleState = keyof typeof LIFECYCLE_DEFAULT_COLORS;
export type LifecycleColors = Record<LifecycleState, string>;

/**
 * How strongly a state's colour is mixed at each of the three places it appears.
 *
 * THIS IS THE CALIBRATION KNOB for "the rows are too pale". The row tint used to sit at 0.93
 * — a 7% wash, which on a white table reads as a printing artefact rather than a state —
 * and it is the number to move if the rows still read faint on a given monitor. Hover has to
 * stay separated from rest by enough to be felt, so the two move together.
 */
const MIX = { row: 0.86, rowHover: 0.77, badge: 0.82, ink: 0.38 };

/**
 * One state's colour, expanded into the three values that paint it.
 *
 * Deriving rather than storing is what keeps a configured colour honest: the badge sitting on
 * the row and the row's own left edge are provably the same hue, because they are the same
 * number put through two different mixes.
 */
export const lifecycleTone = (color: string) => {
    const fill = lightOf(color, MIX.badge);
    return {
        edge: color,
        row: lightOf(color, MIX.row),
        rowHover: lightOf(color, MIX.rowHover),
        fill,
        ink: inkOn(fill, color),
    };
};

/**
 * The state's own colour, darkened until it is READABLE on the badge — not merely darkened.
 *
 * A fixed mix is not enough, and the failing case is not exotic: somebody picks a pale colour,
 * `darkOf` takes 38% off a value that was already near-white, and the badge ends up mid-grey
 * on white. Anything a colour picker can return has to produce a legible badge, so the mix
 * deepens in steps until it measures up, and falls back to the app's near-black in the corner
 * where even that is not enough.
 *
 * Steps rather than a solve because the search space is one dimension over eight rungs — a
 * closed form here would be more arithmetic to read and no more correct.
 */
function inkOn(fill: string, color: string) {
    for (let weight = MIX.ink; weight <= 0.9; weight += 0.08) {
        const ink = darkOf(color, weight);
        if (contrastRatio(fill, ink) >= MIN_CONTRAST) return ink;
    }
    return INK_DARK;
}

/**
 * Accent hues for the stat cards.
 *
 * The same five as the kit's `TRIO` palette, restated rather than imported: `TRIO` lives in
 * `ui/patterns`, which pulls in GlassSurface and KTIcon, and this component is on the entity,
 * contact, employee AND calendar routes — five hex values are cheaper than that dependency.
 * The three LIFECYCLE_TONE hues are deliberately NOT in here: those mean a meeting's state and
 * are shared with the badges and the row tint, where these only tint an icon.
 */
const STAT_TONE = {
    blue: '#2563EB', green: '#16A34A', purple: '#7C3AED', amber: '#D97706', cyan: '#0891B2',
} as const;

/** Which of the three a row is, or null for one still to come. Cancelled wins: a meeting that
 *  was called off never became a held meeting, whatever its clock says. */
export const lifecycleOf = (m: MeetingState): LifecycleState | null => {
    if (isCancelled(m)) return 'cancelled';
    if (isAwaitingTime(m)) return 'awaiting';
    if (isHeld(m)) return 'held';
    return null;
};

/**
 * The state badge, in the state's own colour.
 *
 * ONE component for both markers, because they were the same eleven lines of styling with a
 * different word inside and a different pair of hardcoded hexes — and a configurable palette
 * turns that duplication from untidy into wrong, since only one of the two copies would have
 * been wired to the setting.
 */
const StateTag = ({ color, label, title }: { color: string; label: string; title?: string }) => {
    const tone = lifecycleTone(color);
    return (
        <span
            title={title}
            style={{
                display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 20,
                background: tone.fill, color: tone.ink, border: `1px solid ${lightOf(color, 0.62)}`,
                fontSize: 9.5, fontWeight: 800,
                letterSpacing: 0.3, verticalAlign: 'middle', whiteSpace: 'nowrap',
            }}
        >
            {label}
        </span>
    );
};

const AwaitingTag = ({ color }: { color: string }) => (
    <StateTag
        color={color}
        label="AWAITING TIMESHEETS"
        title="This meeting has happened, but nobody has logged their time yet — so it has no cost recorded."
    />
);

/**
 * Participant ids as stored: a JSON array on newer rows, a comma-separated string on older
 * ones. The backend's own parser accepts both for the same reason, and the edit form needs
 * the ids back to re-select the people already invited.
 */
const parseIds = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return raw.split(',').map((p) => p.trim()).filter(Boolean);
    }
};

/** The shape the meeting dialog wants back when it opens on an existing meeting. */
export const toEditableMeeting = (m: MeetingRow) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    isOnline: m.isOnline,
    meetingMode: m.meetingMode,
    meetingLink: m.meetingLink,
    location: m.location,
    startDate: m.startDate,
    endDate: m.endDate,
    projectId: m.projectId,
    participantIds: parseIds(m.participants),
    externalParticipantIds: parseIds(m.externalParticipants),
});

/**
 * The cancelled marker.
 *
 * Only the project's record shows these at all — the calendar and the personal lists filter
 * them out server-side — so this appears exactly where the question is "what did we book",
 * and it has to be unmissable there: a cancelled meeting sitting unmarked among live ones is
 * worse than not showing it. Struck-through title, muted row, and the reason if one was given.
 */
const CancelledTag = ({ reason, color }: { reason?: string | null; color: string }) => (
    <StateTag color={color} label="CANCELLED" title={reason || 'Cancelled'} />
);

const INK_DARK = '#1E293B';
const INK_LIGHT = '#FFFFFF';

/** WCAG relative luminance. Gamma-corrected, which the eye is and a raw RGB average is not. */
const luminance = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4]
        .map((i) => (parseInt(full.slice(i, i + 2), 16) || 0) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Readable text on ANY configured colour.
 *
 * The palette is a setting, so the ink cannot be hard-coded against it — somebody picking a
 * dark free-colour would otherwise get grey-on-navy.
 *
 * MEASURED, not guessed. This used to threshold a weighted RGB sum at 150, which is a
 * different curve from the one eyes use: a mid-tone sky blue (#0EA5E9) scored below the line
 * and was given white text at 2.8:1, well under the 4.5:1 anyone needs to read it. Comparing
 * the two candidates by actual contrast has no threshold to get wrong, and picks the better
 * ink for every colour rather than for most of them.
 */
export const contrastRatio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

/** What WCAG asks of body-sized text. The badges are small and bold, so this is the floor. */
export const MIN_CONTRAST = 4.5;

export const readableOn = (bg: string) =>
    (contrastRatio(bg, INK_DARK) >= contrastRatio(bg, INK_LIGHT) ? INK_DARK : INK_LIGHT);

/**
 * The same hue, mixed toward white.
 *
 * The meeting rows carry the half's colour too, but a row is text where a pill is a label: a
 * pill can be solid navy with white ink, a line of 9.5px type cannot. Mixing toward WHITE
 * rather than lowering opacity keeps it honest on any surface — an alpha tint borrows whatever
 * is behind it, and these rows sit on cells that are sometimes grey and sometimes white.
 */
export const lightOf = (hex: string, weight = 0.88) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const mix = [0, 2, 4]
        .map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
        .map((v) => Math.round(v + (255 - v) * weight));
    return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * The same hue, mixed toward black — `lightOf`'s twin, and the badge ink's only job.
 *
 * Ink CANNOT be `readableOn` here. That picks between near-black and white by contrast, which
 * is right for a solid pill and wrong for this: on a pale mix of red it returns slate, so a
 * CANCELLED badge would read in grey on pink and lose the one thing the colour was chosen to
 * say. A dark mix of the state's own colour stays legibly that colour, and is dark enough
 * against a 0.82 mix of the same hue at every point on the wheel.
 */
export const darkOf = (hex: string, weight = 0.38) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const mix = [0, 2, 4]
        .map((i) => parseInt(full.slice(i, i + 2), 16) || 0)
        .map((v) => Math.round(v * (1 - weight)));
    return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * A meeting row, tinted by the half it belongs to.
 *
 * Tint PLUS a solid edge in the full colour, never tint alone: two configured colours can be
 * picked close together, and at this strength they become the same wash. The edge stays at
 * full strength, so the halves are still told apart when the fills are not.
 *
 * The ink is computed from the finished tint rather than set to the colour itself, because
 * light-on-light is the failure a colour picker makes easy.
 */
export const rowTone = (color: string) => {
    const bg = lightOf(color);
    return { bg, fg: readableOn(bg), edge: color };
};

/**
 * TODAY — a wash that fades down the cell, not a ring drawn round it.
 *
 * ─── WHY THE OUTLINE WENT ────────────────────────────────────────────────────
 * It was `inset 0 0 0 2px` in the green below, and a hard 2px ring is the SAME device this
 * grid already spends on two other things: the picked day wears a 2px navy border and a drop
 * target wears a 2px dashed one. Three rings in three colours, and the only way to tell which
 * of them a cell is wearing is to remember the key — on a grid whose whole job is to be read
 * at a glance. The ring also sat *outside* the content, so today looked like a cell someone
 * had selected rather than a cell that is now.
 *
 * A fill reads before an edge does. The wash is strongest at the top, where the date and the
 * AM/PM pills are, and gone by roughly three quarters down so the meeting chips below it stay
 * on their own background — the tint must never compete with the half colours, which are the
 * thing the cell is actually reporting.
 *
 * The hairline that remains is 1px at 45%: enough to close the shape off, not enough to be
 * mistaken for the picked day's border. Plus a soft drop glow, so today sits very slightly
 * forward of the 41 cells around it.
 *
 * `rgba(…, 0)` for the last stop, never the keyword `transparent`: that keyword is
 * transparent BLACK, and interpolating a colour to it greys the middle of the gradient out.
 */
export const MEETING_TODAY_DEFAULT = '#16A34A';

/**
 * The cell's paint, given whatever background it would otherwise have had.
 *
 * Takes the base rather than assuming white, because a wholly clear day is grey — and a wash
 * laid over the wrong base is how today ends up the one cell that contradicts the "is this day
 * free" reading the background is there to give.
 */
export const todayCellStyle = (_base: string, color = MEETING_TODAY_DEFAULT) => ({
    // Opaque pastel of the configured colour — a stacked rgba layer was reading as
    // "outline only" once the brand colour was pastel. Free/busy still shows via chips.
    background: lightOf(color, 0.82),
    boxShadow: `inset 0 0 0 2px ${toneAlpha(color, 0.72)}, 0 2px 8px -3px ${toneAlpha(color, 0.28)}`,
});

/** Today's date numeral — darkened so it stays legible on the wash. */
export const todayInkFor = (color: string) => darkOf(color, 0.42);

/** @deprecated use todayInkFor(MEETING_TODAY_DEFAULT) */
export const todayInk = todayInkFor(MEETING_TODAY_DEFAULT);

/** Solid fill for a month-grid meeting chip (no left-edge stripe). */
export const calendarChipTone = (color: string) => {
    const bg = color;
    return { bg, fg: readableOn(bg) };
};

const halfStyle = (
    half: 'am' | 'pm', count: number, colors: HalfColors = DEFAULT_HALF_COLORS,
) => {
    const bg = count === 0 ? colors.free : colors[half];
    return {
        bg,
        fg: count === 0 ? '#94A3B8' : readableOn(bg),
        // Free stays the only OUTLINED step: booked halves sit forward of it, which is what
        // makes an open slot findable by scanning rather than reading.
        border: count === 0 ? '1px dashed #CBD5E1' : `1px solid ${bg}`,
    };
};

/**
 * The configured half-day colours and names, falling back to the built-in ones.
 *
 * Colour and name live on the SAME configuration row per half, because they answer one
 * question — what this half is called and what it looks like — and splitting them across two
 * modules would let a rename and a recolour disagree about which half they belong to.
 */
/** A module with no saved row answers 400 — that is "not configured", not an error. */
const readConfig = async (key: string) => {
    const res = await fetchConfiguration(key).catch(() => null);
    return safeJsonParse(res?.data?.configuration?.configuration || '{}');
};

/**
 * `enabled: false` means "use the built-in one" — the honest way to undo a colour choice
 * without inventing a second control that means the same thing.
 */
const configuredColor = (cfg: any, fallback: string) =>
    (cfg?.enabled === false ? fallback : (cfg?.color || fallback));

/**
 * The configured colours for the three meeting states.
 *
 * A sibling of `useHalfConfig` rather than an extension of it: the half-day palette says when
 * a day is free and this one says how a meeting turned out. They are read on the same screen
 * and mean entirely different things, and a single hook returning both would have every caller
 * of one fetching the other.
 */
const useLifecycleColors = (): LifecycleColors => {
    const [colors, setColors] = useState<LifecycleColors>(LIFECYCLE_DEFAULT_COLORS);
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            readConfig(MEETING_STATUS_CANCELLED),
            readConfig(MEETING_STATUS_AWAITING),
            readConfig(MEETING_STATUS_HELD),
            readConfig(MEETING_TIMESHEET_FILLED),
            readConfig(MEETING_TIMESHEET_PENDING),
        ]).then(([cancel, awaiting, held, filled, pending]) => {
            if (cancelled) return;
            setColors({
                cancelled: configuredColor(cancel, LIFECYCLE_DEFAULT_COLORS.cancelled),
                awaiting: configuredColor(awaiting, LIFECYCLE_DEFAULT_COLORS.awaiting),
                held: configuredColor(held, LIFECYCLE_DEFAULT_COLORS.held),
                filled: configuredColor(filled, LIFECYCLE_DEFAULT_COLORS.filled),
                pending: configuredColor(pending, LIFECYCLE_DEFAULT_COLORS.pending),
            });
        });
        return () => { cancelled = true; };
    }, []);
    return colors;
};

const useHalfConfig = (): { colors: HalfColors; labels: HalfLabels } => {
    const [config, setConfig] = useState({ colors: DEFAULT_HALF_COLORS, labels: DEFAULT_HALF_LABELS });
    useEffect(() => {
        let cancelled = false;
        const read = readConfig;
        Promise.all([
            read(MEETING_HALF_FREE_COLOR),
            read(MEETING_HALF_AM),
            read(MEETING_HALF_PM),
        ]).then(([free, am, pm]) => {
            if (cancelled) return;
            const colorOf = configuredColor;
            // A blank name is not a rename: falling back stops an empty field wiping the only
            // text the pill has.
            const nameOf = (cfg: any, fallback: string) =>
                (String(cfg?.label ?? '').trim() || fallback);
            setConfig({
                colors: {
                    free: colorOf(free, DEFAULT_HALF_COLORS.free),
                    am: colorOf(am, DEFAULT_HALF_COLORS.am),
                    pm: colorOf(pm, DEFAULT_HALF_COLORS.pm),
                },
                labels: {
                    am: nameOf(am, DEFAULT_HALF_LABELS.am),
                    pm: nameOf(pm, DEFAULT_HALF_LABELS.pm),
                },
            });
        });
        return () => { cancelled = true; };
    }, []);
    return config;
};

const useTodayColor = () => {
    const [color, setColor] = useState(MEETING_TODAY_DEFAULT);
    useEffect(() => {
        let cancelled = false;
        readConfig(MEETING_TODAY_COLOR).then((cfg) => {
            if (!cancelled) setColor(configuredColor(cfg, MEETING_TODAY_DEFAULT));
        });
        return () => { cancelled = true; };
    }, []);
    return color;
};

/** `AM` when free, `AM 2` when not — the count belongs on the block it describes. */
const HalfPill = ({ half, count, colors, labels = DEFAULT_HALF_LABELS, showCount = true }: {
    half: 'am' | 'pm'; count: number; colors?: HalfColors; labels?: HalfLabels;
    /**
     * The LEGEND turns this off. There it is a swatch, not a reading: a "1" beside it is a
     * count of nothing — the sample is not describing a real day — and it invited the pill to
     * be read as "AM means one meeting". A day cell keeps it, because there the number IS the
     * information.
     */
    showCount?: boolean;
}) => {
    const st = halfStyle(half, count, colors);
    const label = labels[half];
    return (
        <span
            style={{
                flex: 1, minWidth: 0, height: 18, borderRadius: 6,
                background: st.bg, color: st.fg, border: st.border,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
            }}
        >
            {label}
            {showCount && count > 0 && <span style={{ fontWeight: 700, opacity: 0.85 }}>{count}</span>}
        </span>
    );
};

/**
 * How wide the table's Mode column gets. Wide enough for the first useful stretch of a street
 * address, narrow enough that it cannot crowd out the columns people actually sort by.
 */
const MODE_COL_W = 220;

const dayKey = (d: Dayjs | string) => dayjs(d).format('YYYY-MM-DD');

/**
 * Opening the linked row from a meeting — as a PROJECT or as a LEAD.
 *
 * THE PATH DECIDES THE LENS, and nothing else does. `EntityDetailPage` reads
 * `pathname.startsWith('/project/')` and defaults its tab to `projects` or `leads` from that
 * alone. Lead-as-master means both are the same row and the same id; only the URL says which
 * way to read it.
 *
 * This used to navigate to `/leads/:id?tab=meetings` and pass `{ isProject: true }` in
 * history state, which is the one thing the route's own comment warns against — state is lost
 * on a refresh, is not shareable, and was never read here anyway. The result was that clicking
 * a project on a meeting opened it in the LEAD view, which is the bug this fixes. Every other
 * caller in the app already navigates to `/project/:id`; this was the last one that did not.
 *
 * `isLead` still matters, and is the reason this takes it: sending a lead that has not become
 * a project to `/project/:id` would open it behind project tabs it has nothing to fill.
 */
const useOpenProject = () => {
    const navigate = useNavigate();
    // Stable: the column definitions memoise on it, and a fresh function each render would
    // rebuild every column on every render — which is the cost this table was moved off.
    return useCallback((projectId?: string | null, isLead?: boolean) => {
        if (!projectId) return;
        navigate(isLead ? `/leads/${projectId}` : `/project/${projectId}`);
    }, [navigate]);
};

/** Says the linked row is a lead, not a project. Rendered only when it is. */
const LeadTag = () => (
    <span
        style={{
            marginLeft: 6, padding: '1px 6px', borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
            color: '#B45309', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.28)',
            whiteSpace: 'nowrap',
        }}
    >
        Lead
    </span>
);

/** A project name that goes to the project. Not a <button>: it renders inside one. */
const ProjectLink: React.FC<{
    name: string; onOpen: () => void; style?: React.CSSProperties;
}> = ({ name, onOpen, style }) => (
    <span
        role="link"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen(); }
        }}
        style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, ...style }}
        title={`Open ${name}`}
    >
        {name}
    </span>
);

/**
 * "8 of these were held online, 3 in person and 1 as a hybrid."
 *
 * Only the modes that actually happened are named. The previous version was a two-branch
 * ternary over `onlineCount` and `inPersonCount`, which could not phrase a third mode at all —
 * and its "all of them" branches would have announced "All 5 were held online" on a month
 * whose five meetings included two hybrids.
 *
 * Exported for its own test: it is a sentence with a comma, an "and" and a singular/plural,
 * which is exactly the kind of thing that reads fine in review and wrong on screen.
 */
export const modeSentence = (
    counts: { onlineCount: number; inPersonCount: number; hybridCount?: number },
): string => {
    const parts: string[] = [];
    if (counts.onlineCount > 0) parts.push(`${counts.onlineCount} online`);
    if (counts.inPersonCount > 0) parts.push(`${counts.inPersonCount} in person`);
    if (counts.hybridCount) parts.push(`${counts.hybridCount} as a hybrid`);
    if (!parts.length) return '';
    // One mode covers the lot: say so, rather than restating the total as a breakdown of itself.
    if (parts.length === 1) return `All of these were held ${parts[0].replace(/^\d+ /, '')}.`;
    const last = parts.pop() as string;
    return `Of these, ${parts.join(', ')} and ${last}.`;
};

interface MeetingAnalytics {
    costVisible: boolean;
    totalMeetings: number;
    heldCount: number;
    upcomingCount: number;
    heldMinutes: number;
    upcomingMinutes: number;
    personMinutes: number;
    /** Held meetings nobody has logged time against — the cost below is not the whole story. */
    awaitingTimesheets: number;
    loggedMinutes: number;
    cancelledCount: number;
    onlineCount: number;
    /** OFFLINE only. It was `total - onlineCount` until HYBRID existed and broke the subtraction. */
    inPersonCount: number;
    /** Absent from an older server, which had no third mode to count. */
    hybridCount?: number;
    internalAttendees: number;
    externalAttendees: number;
    avgMinutes: number;
    avgAttendees: number;
    heldCost: number | null;
    upcomingCost: number | null;
    avgCostPerMeeting: number | null;
    costliestMeeting: { title: string; cost: number; startDate: string } | null;
    byEmployee: Array<{
        employeeId: string; name: string; rate: number; meetings: number; minutes: number; cost: number;
        monthlySalary?: number; daysInMonth?: number; workingHours?: number;
    }>;
    byMeeting: Array<{ id: string; title: string; startDate: string; minutes: number; attendees: number; cost: number }>;
}

// Named for money, not for rupees. The symbol was written as the escape `\u20B9`, which is
// why a search for the character walked straight past it.
const money = (n: number) => `${currencyPrefix()}${Math.round(n).toLocaleString(getCurrencyLocale())}`;
const hm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (!h && !m) return '0m';
    return `${h ? `${h}h ` : ''}${m ? `${m}m` : ''}`.trim();
};

/**
 * A stat card: the icon on the left, the reading on the right.
 *
 * ONE component for all eight, because eight hand-written tiles is eight places for a padding
 * value to drift. Everything that differs between them — the icon, its tone, the numbers, and
 * whether the number is painted — arrives as data from the array below.
 *
 * ─── WHY THE ICON MOVED LEFT ─────────────────────────────────────────────────
 * It used to sit above the value, sharing the top line with the label. That stacks three
 * things down a narrow card and leaves the glyph competing with the label for the same row.
 * Set beside the text at 44px it becomes the thing the eye lands on first and the label second,
 * which is the order somebody scans eight cards in: find the one about cancellations, then read
 * it. The chip is vertically centred against the whole block rather than aligned to the label,
 * so a card whose label wraps to two lines still has its icon on the card's own axis.
 */
const STAT_ICON = 44;

const StatCard: React.FC<{
    label: string; value: string; sub: string; icon: string; tone: string;
    /** Paints the VALUE only — a CSS gradient, clipped to the glyphs. */
    valueGradient?: string;
    onClick?: () => void;
}> = ({ label, value, sub, icon, tone, valueGradient, onClick }) => (
    <div data-wt-control="row"
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        } : undefined}
        style={{
            borderRadius: 12,
            padding: '14px 15px',
            minHeight: 104,
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            textAlign: 'left',
            background: '#F5F8FF',
            border: '1px solid #E2E8F0',
            cursor: onClick ? 'pointer' : 'default',
        }}
    >
        <span
            aria-hidden
            style={{
                width: STAT_ICON, height: STAT_ICON, borderRadius: 13, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: `${tone}1A`, color: tone, border: `1px solid ${tone}33`,
            }}
        >
            <AppIcon name={icon} className="fs-2" />
        </span>
        <div style={{ minWidth: 0 }}>
            <div style={{
                fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, color: '#64748B',
                display: 'flex', alignItems: 'center', gap: 4,
            }}>
                {label}
                {onClick && <AppIcon name="bi-chevron-right" className="fs-8" />}
            </div>
            <div
                style={{
                    fontSize: 23, fontWeight: 800, lineHeight: 1.15, marginTop: 2,
                    // The declared colour is the fallback and has to come FIRST: where
                    // background-clip:text is unsupported the transparent fill is unsupported
                    // with it, so the number lands in this colour instead of disappearing.
                    color: '#1E293B',
                    ...(valueGradient ? {
                        // INLINE-BLOCK is load-bearing, not tidiness. A gradient is laid out
                        // across the element's box, and clipping to the glyphs does not move
                        // it — so on a full-width block the digits sample only its left end and
                        // the ramp never shows. Shrunk to the text, the gradient spans exactly
                        // the number it is painting.
                        display: 'inline-block',
                        backgroundImage: valueGradient,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    } : {}),
                }}
            >
                {value}
            </div>
            <div style={{ fontSize: 11.5, marginTop: 3, color: '#94A3B8' }}>
                {sub}
            </div>
        </div>
    </div>
);

/**
 * Money, painted like money.
 *
 * The cost card used to be a solid navy block — a whole card shouting to make one number
 * important, which cost the row its rhythm and made the other seven look like the small print.
 * The number is what matters, so the number is what is treated: a green that deepens as it
 * falls, clipped to the digits. Everything else about the card is identical to its seven
 * neighbours, which is what lets a single painted figure carry the emphasis on its own.
 *
 * Green because this is a ledger figure and green is the colour a currency reads in; the ramp
 * goes light-to-dark down the glyphs rather than across them so the digits stay legible at
 * 23px instead of each one being a different shade.
 */
const MONEY_GRADIENT = 'linear-gradient(160deg, #34D399 0%, #10B981 38%, #047857 100%)';

/**
 * What this project's meetings have cost, and the habit behind the number.
 *
 * ─── EIGHT EQUAL CARDS, ONE PAINTED NUMBER ───────────────────────────────────
 * Cost is the thing nobody currently knows and the thing that changes behaviour, so it is the
 * one figure given any emphasis at all. That emphasis is now the NUMBER rather than the card:
 * a solid navy tile made the other seven read as small print beside it and broke the row's
 * rhythm, when all it needed to do was draw the eye to five digits.
 *
 * The extra four are not padding. Upcoming, awaiting, cancelled and attendees were all being
 * reported — in a paragraph of prose under the cards, where a number has to be read out of a
 * sentence before it can be compared to anything. They are figures, so they are now cards, and
 * the prose below keeps only what is genuinely a sentence: WHY the awaiting ones are missing
 * from the total, and which single meeting cost the most.
 *
 * Every card carries its DENOMINATOR on the second line — "across 4 held meetings", "3.2 people
 * average". A total with nothing to divide it by is a fact; a total with its denominator is an
 * argument someone can act on.
 */
const CostSummary: React.FC<{
    data: MeetingAnalytics;
    onOpenBreakdown: () => void;
    /** The configured state colours, so the two state cards match the rows they count. */
    stateColors: LifecycleColors;
}> = ({ data, onOpenBreakdown, stateColors }) => {
    // Both queries run every render — a `useMediaQuery(PHONE) ? 1 : useMediaQuery(NARROW)`
    // chain skips the second hook whenever the first is true, and React counts hooks by
    // position, so crossing 600px would change the order and blow up mid-resize.
    const isPhoneWidth = useMediaQuery(PHONE);
    const isNarrowWidth = useMediaQuery(NARROW);
    const statColumns = isPhoneWidth ? 1 : isNarrowWidth ? 2 : 4;
    const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
    // The cost card is the only one with somewhere to go, so it is the only one that behaves
    // like a control — the others stay plain text and do not invite a click that does nothing.
    const openBreakdown = data.costVisible ? onOpenBreakdown : undefined;

    const cards: Array<{
        label: string; value: string; sub: string; icon: string; tone: string;
        valueGradient?: string; onClick?: () => void;
    }> = [
        {
            label: 'Meetings held',
            value: String(data.heldCount),
            sub: `of ${data.totalMeetings} booked in total`,
            icon: 'bi-calendar2-check',
            tone: STAT_TONE.blue,
        },
        {
            label: 'Total cost',
            value: data.costVisible ? money(data.heldCost ?? 0) : 'Hidden',
            // The denominator is the meetings that ACTUALLY have time logged. Saying "across 5
            // held meetings" over a total drawn from two of them reads as precise and is not.
            sub: !data.costVisible
                ? 'needs finance access'
                : data.awaitingTimesheets
                    ? `${data.heldCount - data.awaitingTimesheets} of ${data.heldCount} meetings logged`
                    : `across ${data.heldCount} held ${plural(data.heldCount, 'meeting')}`,
            icon: 'bi-currency-rupee',
            tone: STAT_TONE.green,
            // Only when there is a figure to paint. "Hidden" in money-green would dress a
            // permission message up as an amount.
            valueGradient: data.costVisible ? MONEY_GRADIENT : undefined,
            onClick: openBreakdown,
        },
        {
            label: 'Time logged',
            // Claimed, not scheduled. The old figure multiplied a meeting's length by everyone
            // invited, so it counted hours nobody spent.
            value: hm(data.loggedMinutes ?? 0),
            sub: `${hm(data.heldMinutes)} of meetings held`,
            icon: 'bi-stopwatch',
            tone: STAT_TONE.cyan,
        },
        {
            label: 'Average meeting',
            value: data.costVisible ? money(data.avgCostPerMeeting ?? 0) : hm(data.avgMinutes),
            sub: data.costVisible
                ? `${hm(data.avgMinutes)} with about ${Math.round(data.avgAttendees)} people`
                : `about ${Math.round(data.avgAttendees)} people in the room`,
            icon: 'bi-graph-up',
            tone: STAT_TONE.purple,
        },
        {
            label: 'Still upcoming',
            value: String(data.upcomingCount),
            sub: data.upcomingCount
                ? `${hm(data.upcomingMinutes)} already in the diary`
                : 'nothing booked ahead',
            icon: 'bi-calendar-event',
            tone: STAT_TONE.amber,
        },
        {
            label: 'Awaiting timesheets',
            value: String(data.awaitingTimesheets),
            sub: data.awaitingTimesheets
                ? `held ${plural(data.awaitingTimesheets, 'meeting')} with no cost yet`
                : 'every held meeting is logged',
            icon: 'bi-hourglass-split',
            // The same amber as the badge on the row and the tint behind it, so the count, the
            // tag and the row are visibly one thing rather than three amber-ish decisions.
            tone: stateColors.awaiting,
        },
        {
            label: 'Cancelled',
            value: String(data.cancelledCount),
            sub: data.cancelledCount
                ? 'called off, still on the record'
                : 'none called off',
            icon: 'bi-x-circle',
            tone: stateColors.cancelled,
        },
        {
            label: 'People involved',
            value: String(data.internalAttendees + data.externalAttendees),
            sub: data.externalAttendees
                ? `${data.internalAttendees} from the team, ${data.externalAttendees} client-side`
                : `${data.internalAttendees} from the team`,
            icon: 'bi-people',
            tone: STAT_TONE.green,
        },
    ];

    return (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F6', background: '#FCFDFF' }}>
            {/*
              * FOUR, TWO or ONE — never a number that leaves a card on its own.
              *
              * This was `auto-fit`, which packs in as many as will fit and on a wide screen fits
              * seven, stranding the eighth under a row of empty space. With eight cards the
              * column count has to be a divisor of eight or the block stops reading as a block.
              *
              * Four is also the count that makes the two rows mean something: the first row is
              * what the meetings cost and how long they took, the second is the state of the
              * record — what is still coming, what is unlogged, what was called off, who was
              * there. The array below is ordered for that split, so it survives a reflow to two
              * columns and only collapses on a phone, where a single column is the only honest
              * option anyway.
              */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${statColumns}, minmax(0, 1fr))`,
                gap: 10,
            }}>
                {cards.map((c) => <StatCard key={c.label} {...c} />)}
            </div>

            {/* What the cards cannot say, written as sentences. The counts moved up into cards;
                what is left here is the reasoning a colleague would add when handing the
                numbers over — why a figure is missing, and which meeting to go and look at. */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>
                {/* How they were attended, as a sentence rather than three more cards.
                    Built from the modes that actually OCCUR, so a month of online meetings
                    reads "All 12 were held online" and does not also announce two zeroes —
                    the previous version could only phrase two, and counted every hybrid
                    meeting as online while reporting it as not in person. */}
                <div>{modeSentence(data)}</div>
                {data.awaitingTimesheets > 0 && (
                    <div style={{ color: darkOf(stateColors.awaiting) }}>
                        {data.awaitingTimesheets} held meeting{data.awaitingTimesheets === 1 ? ' has' : 's have'} no
                        time logged yet, so {data.awaitingTimesheets === 1 ? 'it is' : 'they are'} not in the total
                        above. Cost comes from the timesheets attendees file.
                    </div>
                )}
                {data.costVisible && data.costliestMeeting && (
                    <div>
                        The most expensive was{' '}
                        <strong style={{ color: '#1E293B' }}>{data.costliestMeeting.title}</strong>, at{' '}
                        {money(data.costliestMeeting.cost)}.
                    </div>
                )}
                {data.costVisible && data.externalAttendees > 0 && (
                    <div style={{ color: '#94A3B8' }}>
                        Cost covers your team's time only — client attendees are not on payroll.
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Where the total went — by person, and by meeting.
 *
 * A modal rather than a page: this is one question asked from one number, and answering it by
 * navigating away means losing the list the reader was in the middle of. Two plain tables side
 * by side on desktop, stacked on a phone; no chart, because with a handful of meetings a bar
 * chart says less than the figures do and takes more room to say it.
 *
 * People first. "Which meeting cost the most" is already answered on the summary line above;
 * "whose time is this" is the question the total actually raises, and it is the one that has
 * somebody's name on it.
 */
const CostBreakdown: React.FC<{ data: MeetingAnalytics; open: boolean; onClose: () => void }> = ({ data, open, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <div style={{ background: '#1E3A8A', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#BFD2F5' }}>Total meeting cost</div>
                <div style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>
                    {money(data.heldCost ?? 0)}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#9DB6E8', marginTop: 2 }}>
                    across {data.heldCount} held meeting{data.heldCount === 1 ? '' : 's'}
                </div>
            </div>
            <div style={{ flex: 1 }} />
            <Button variant="tinted" size="icon-sm" style={{ '--tint': 'white', '--tint-ink': 'white' } as import('react').CSSProperties} type="button" onClick={onClose} aria-label="Close">
                <AppIcon name="bi-x-lg" className="fs-4" />
            </Button>
        </div>

        <DialogContent sx={{ p: 0 }}>
            <AutoGrid min={300} stretch sx={{ fontFamily: 'Inter' }}>
                {/* ── by person ── */}
                <div style={{ borderRight: '1px solid #EEF2F6' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEF2F6', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                        By person
                    </div>
                    {data.byEmployee.length === 0 ? (
                        <div style={{ padding: 20, fontSize: 12.5, color: '#94A3B8' }}>No attendee costs to show.</div>
                    ) : data.byEmployee.map((e) => (
                        <div key={e.employeeId} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 16px', borderBottom: '1px solid #F4F6F9' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{e.name}</div>
                                {/* The arithmetic, spelled out. An hourly rate nobody can check is
                                    an hourly rate somebody has to raise a ticket about — this line
                                    turns "why is that 67?" into a salary or a working-hours setting
                                    you can go and look at. */}
                                {e.monthlySalary != null && (
                                    <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 1 }}>
                                        {money(e.monthlySalary)}/mo ÷ {e.daysInMonth} days ÷ {e.workingHours}h
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{money(e.cost)}</div>
                        </div>
                    ))}
                </div>

                {/* ── by meeting ── */}
                <div>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEF2F6', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                        By meeting
                    </div>
                    {data.byMeeting.length === 0 ? (
                        <div style={{ padding: 20, fontSize: 12.5, color: '#94A3B8' }}>No meetings to show.</div>
                    ) : data.byMeeting.map((m) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 16px', borderBottom: '1px solid #F4F6F9' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{m.title}</div>
                                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                                    {dayjs(m.startDate).format('DD MMM YYYY, hh:mm A')} — {hm(m.minutes)}, {m.attendees} attending
                                </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{money(m.cost)}</div>
                        </div>
                    ))}
                </div>
            </AutoGrid>
        </DialogContent>
    </Dialog>
);

/**
 * One day, in full.
 *
 * A panel under the grid meant the answer appeared 700px below the cell that was clicked —
 * off-screen on most days of the month, so the grid looked unresponsive and people clicked
 * again. A dialog puts the day where the attention already is, and dismisses back to the
 * month rather than leaving a stale day sitting under it.
 *
 * The two halves stay side by side, and the free one still states itself: a slot has to be
 * visible to be bookable.
 */
const DayDetail: React.FC<{
    dayKeyValue: string;
    halves: { am: MeetingRow[]; pm: MeetingRow[] };
    open: boolean;
    onClose: () => void;
    timeRange: (m: MeetingRow) => string;
    modeCell: (m: MeetingRow) => React.ReactNode;
    onDelete?: (id: string) => void;
    onEdit?: (meeting: MeetingRow) => void;
    onCancel?: (meeting: { id: string; cancelled: boolean }) => void;
    onLogTime?: (meeting: MeetingRow) => void;
    onRemind?: (meeting: MeetingRow) => void;
    /**
     * Book a meeting ON THIS DAY. Given the ISO instant the form should open at, so the date
     * the reader is looking at is the date the form is already holding — retyping it under a
     * dialog that just told you the day is free is the step this removes.
     */
    onCreate?: (startIso: string) => void;
    /** The same palette the month grid painted, so the modal is not a second opinion. */
    colors?: HalfColors;
    labels?: HalfLabels;
    /** And the same three state colours the table rows wear, for the badges on each meeting. */
    stateColors: LifecycleColors;
}> = ({
    dayKeyValue, halves, open, onClose, timeRange, modeCell, onDelete, onEdit, onCancel,
    onLogTime, onRemind, onCreate, colors = DEFAULT_HALF_COLORS, labels = DEFAULT_HALF_LABELS,
    stateColors,
}) => {
    const navigate = useNavigate();
    const openProject = useOpenProject();
    const isPhone = useMediaQuery(PHONE);
    /** This day at the half's opening hour — what "new meeting here" means. */
    const startOfHalf = (half: 'am' | 'pm') =>
        dayjs(dayKeyValue).startOf('day').hour(HALF_OPENING_HOUR[half]).toISOString();
    const total = halves.am.length + halves.pm.length;
    const summary = !total
        ? 'nothing booked — free all day'
        : !halves.am.length
            ? 'morning is free'
            : !halves.pm.length
                ? 'afternoon is free'
                : 'both halves booked';
    return (
        // `md`. `lg` was tried to give the roster room and overshot: on a day with one meeting
        // the free half became a column of empty space as wide as the card beside it, which
        // reads as a layout that failed rather than a morning that is free.
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isPhone}
            PaperProps={{ sx: { borderRadius: isPhone ? 0 : 3, overflow: 'hidden' } }}>
            <div style={{ background: '#1E3A8A', padding: isPhone ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: isPhone ? 15 : 17, fontWeight: 800, color: '#fff' }}>
                        {dayjs(dayKeyValue).format(isPhone ? 'ddd, DD MMM YYYY' : 'dddd, DD MMM YYYY')}
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: '#BFD2F5', marginTop: 2 }}>{summary}</div>
                </div>
                <div style={{ flex: 1 }} />
                {/* Booking the day you are looking at. The morning hour is the default because
                    a day opened from the grid is usually being filled from the top. */}
                {onCreate && (
                    <Button variant="outline" size="sm" style={{ flexShrink: 0 }}
                        type="button"
                        onClick={() => onCreate(startOfHalf('am'))}
                        title={`New meeting on ${dayjs(dayKeyValue).format('DD MMM')}`}
                    >
                        <AppIcon name="bi-plus" className={isPhone ? '' : 'me-1'} />
                        {!isPhone && 'New meeting'}
                    </Button>
                )}
                <Button variant="tinted" size="icon-sm" style={{ flexShrink: 0, '--tint': 'white', '--tint-ink': 'white' } as import('react').CSSProperties} type="button" onClick={onClose} aria-label="Close">
                    <AppIcon name="bi-x-lg" className="fs-4" />
                </Button>
            </div>
            <DialogContent sx={{ p: 2, fontFamily: 'Inter' }}>

            {/* Two sections, always both shown — a free half has to be VISIBLE to be
                bookable, so the empty one states itself rather than being left out.
                A meeting straddling noon appears under both, because it blocks both. */}
            <AutoGrid min={320} stretch gap={12}>
            {([
                { key: 'am', label: 'First half', hint: 'before 12:00', list: halves.am },
                { key: 'pm', label: 'Second half', hint: 'from 12:00', list: halves.pm },
            ] as const).map((half) => (
            <div key={half.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', width: 34 }}>
                        <HalfPill half={half.key} count={half.list.length} colors={colors} labels={labels} />
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>{half.label}</span>
                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{half.hint}</span>
                </div>
            {half.list.length === 0 ? (
                // A free half is the one place on this screen where the next action is obvious,
                // so the box that reports it IS the button — with the half's own opening hour,
                // which is the difference between "the afternoon is free" and an afternoon
                // meeting already half filled in.
                <button data-wt-control="cell"
                    type="button"
                    disabled={!onCreate}
                    onClick={onCreate ? () => onCreate(startOfHalf(half.key)) : undefined}
                    style={{
                        width: '100%', textAlign: 'left', background: '#F1F5F9', border: '1px dashed #CBD5E1',
                        borderRadius: 9, padding: '16px 14px', fontSize: 12.5, color: '#64748B',
                        cursor: onCreate ? 'pointer' : 'default', fontFamily: 'Inter',
                    }}
                >
                    Free — any time in this half works.
                    {onCreate && (
                        <span style={{ display: 'block', marginTop: 6, color: '#1E3A8A', fontWeight: 700 }}>
                            <AppIcon name="bi-plus-circle" className="me-1" />
                            Book {labels[half.key]} on {dayjs(dayKeyValue).format('DD MMM')}
                        </span>
                    )}
                </button>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {half.list.map((m) => (
                        <div data-wt-control="row"
                            key={m.id}
                            onClick={onEdit && m.canManage ? () => onEdit(m) : undefined}
                            role={onEdit && m.canManage ? 'button' : undefined}
                            tabIndex={onEdit && m.canManage ? 0 : undefined}
                            onKeyDown={onEdit && m.canManage ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(m); }
                            } : undefined}
                            title={onEdit && m.canManage ? 'Open this meeting' : undefined}
                            style={{
                                /**
                                 * A CARD: time on top, the meeting across the full width, and
                                 * its actions in a footer of their own.
                                 *
                                 * The actions used to share the top line with the clock as five
                                 * bare 16px glyphs — small targets, and a bell / pencil / circle
                                 * row that had to be hovered to be read. In a footer they get
                                 * room for a WORD each, and the text above still keeps the full
                                 * width that stopped long addresses wrapping into a column.
                                 *
                                 * The buttons stay last in the DOM, the order they are read and
                                 * tabbed in.
                                 */
                                display: 'flex', flexDirection: 'column',
                                // The half's own colour, tinted. Under a heading that already
                                // names the half, this is confirmation rather than the only
                                // clue — which is why it can afford to be quiet.
                                background: rowTone(colors[half.key]).bg,
                                border: '1px solid #E2E8F0',
                                borderLeft: `3px solid ${colors[half.key]}`,
                                borderRadius: 10, overflow: 'hidden',
                                cursor: onEdit && m.canManage ? 'pointer' : 'default',
                            }}
                        >
                            <div style={{ padding: '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>

                                {/* ROW 1 — when it is, and what state it is in.
                                    The state tags used to trail the title, so a long name
                                    pushed "AWAITING TIMESHEETS" onto its own line in the middle
                                    of the card. Pinned right of the clock they always sit in
                                    the same place, which is what makes a column of cards
                                    scannable for the ones that need something doing. */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                                        color: rowTone(colors[half.key]).fg,
                                    }}>
                                        <AppIcon name="bi-clock" className="fs-7" />
                                        {timeRange(m)}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                                        {isCancelled(m) && <CancelledTag reason={m.cancelReason} color={stateColors.cancelled} />}
                                        {isAwaitingTime(m) && <AwaitingTag color={stateColors.awaiting} />}
                                    </span>
                                </div>

                                {/* ROW 2 — the name, and what it belongs to, on one line.
                                    They answer "which meeting" together; stacked, the project
                                    read as a caption of the title rather than its own fact.
                                    Wraps rather than truncating, because a project number cut
                                    in half identifies nothing. */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                                    <span style={{
                                        fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.3,
                                        color: isCancelled(m) ? '#94A3B8' : '#0F172A',
                                        textDecoration: isCancelled(m) ? 'line-through' : 'none',
                                    }}>
                                        {m.title}
                                    </span>
                                    {m.projectName && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '3px 8px', borderRadius: 7, maxWidth: '100%',
                                            background: toneAlpha('#1E3A8A', 0.07),
                                            border: `1px solid ${toneAlpha('#1E3A8A', 0.16)}`,
                                            fontSize: 11.5, fontWeight: 700, color: '#1E3A8A',
                                        }}>
                                            <AppIcon name={m.isLead ? 'bi-lightning-charge' : 'bi-briefcase'} className="fs-8" />
                                            <ProjectLink name={m.projectName} onOpen={() => openProject(m.projectId, m.isLead)} />
                                        </span>
                                    )}
                                    {m.isLead && <LeadTag />}
                                </div>

                                {/* ROW 3 — how to attend, and who called it. */}
                                <div
                                    // A ceiling, not a routine trim: the clamp is only there so
                                    // a pasted paragraph in the location field cannot do to the
                                    // card what the address used to. The whole line stays on
                                    // the tooltip either way.
                                    title={`${meetingWhere(modeOfExisting(m), m.location)}${m.organizerName ? ` · ${m.organizerName}` : ''}`}
                                    style={{
                                        fontSize: 12, color: '#64748B',
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {modeCell(m)}
                                    {m.organizerName && <span style={{ marginLeft: 10 }}>· {m.organizerName}</span>}
                                </div>

                                {/* The old "Timesheet pending: A, B, C" sentence, kept ONLY for
                                    rows an older server sent without a roster. Where the roster
                                    renders it marks each person individually and counts them,
                                    so printing the same names again as prose is one fact stated
                                    twice and the longer of the two to read. */}
                                {!m.attendees?.length && timesheetStateOf(m) && (
                                    <div style={{
                                        fontSize: 11.5, fontWeight: 600,
                                        color: lifecycleTone(stateColors[timesheetStateOf(m)!]).ink,
                                    }}>
                                        {timesheetStateOf(m) === 'filled'
                                            ? 'All timesheets filled'
                                            : `Timesheet pending: ${m.pendingTimesheetNames!.join(', ')}`}
                                    </div>
                                )}
                            {/* Who is actually coming. The card named the organiser and, when
                                time was owed, listed the debtors as a sentence — so a meeting's
                                own attendee list was the one thing you had to open the edit
                                form to see. */}
                            {m.attendees?.length ? (
                                <AttendeeRoster
                                    attendees={m.attendees}
                                    external={m.externalAttendees}
                                    // Only once it has happened. Marking a stopwatch against
                                    // everyone invited to next Tuesday's meeting reports a debt
                                    // nobody could have paid yet.
                                    showPending={isHeld(m) && !isCancelled(m)}
                                />
                            ) : null}
                            </div>
                            {/* The SAME actions the table row offers. They were only in the
                                table, so which of them existed depended on which view you
                                happened to be in — and the day modal is the view people are in
                                when they want them. Rendered only when there is one to show. */}
                            {((onRemind && !isHeld(m) && !isCancelled(m)) || (onLogTime && isHeld(m) && !isCancelled(m))
                                || (onEdit && !isCancelled(m) && m.canManage) || (onCancel && m.canManage) || onDelete
                                || !isCancelled(m)) && (
                                <div data-wt-control="container"
                                    style={{
                                        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px',
                                        borderTop: '1px dashed rgba(100,116,139,0.28)',
                                        background: 'rgba(255,255,255,0.55)',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {onRemind && !isHeld(m) && !isCancelled(m) && (
                                        <CardAction icon="bi-bell" label="Remind me" color="#1E3A8A" onClick={() => onRemind(m)} />
                                    )}
                                    {onLogTime && isHeld(m) && !isCancelled(m) && (
                                        <CardAction
                                            icon="bi-stopwatch"
                                            label={m.loggedMinutes ? 'Edit time' : 'Log time'}
                                            color={m.loggedMinutes ? '#16A34A' : '#B45309'}
                                            onClick={() => onLogTime(m)}
                                        />
                                    )}
                                    {onEdit && !isCancelled(m) && m.canManage && (
                                        <CardAction icon="bi-pencil" label="Edit" color="#1E3A8A" onClick={() => onEdit(m)} />
                                    )}
                                    {!isCancelled(m) && (
                                        <CardAction
                                            icon="bi-journal-text"
                                            label="Detail"
                                            color="#0F766E"
                                            onClick={() => navigate(`/employees/meetings/agenda?meeting=${m.id}`)}
                                        />
                                    )}
                                    {onCancel && m.canManage && (
                                        <CardAction
                                            icon={isCancelled(m) ? 'bi-arrow-counterclockwise' : 'bi-x-circle'}
                                            label={isCancelled(m) ? 'Restore' : 'Cancel'}
                                            color={isCancelled(m) ? '#16A34A' : '#B45309'}
                                            onClick={() => onCancel({ id: m.id, cancelled: !isCancelled(m) })}
                                            /*
                                             * Time logged means it happened. Cancelling says it
                                             * did not, and a project billing hours against a
                                             * meeting its own record calls off is a
                                             * contradiction whichever half you believe.
                                             *
                                             * RESTORE is never blocked — putting a meeting back
                                             * can only resolve that, never create it.
                                             *
                                             * The server refuses this too; this is what stops
                                             * somebody discovering the rule by being refused.
                                             */
                                            disabledReason={
                                                !isCancelled(m) && (m.loggedMinutes ?? 0) > 0
                                                    ? 'Time has been logged against this meeting, so it cannot be cancelled. Remove the timesheets first.'
                                                    : undefined
                                            }
                                        />
                                    )}
                                    {onDelete && (
                                        // Destructive, so it sits apart on the far right.
                                        <CardAction icon="bi-trash" label="Delete" color="#DC2626" onClick={() => onDelete(m.id)} pushRight />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            </div>
            ))}
            </AutoGrid>
            </DialogContent>
        </Dialog>
    );
};

/**
 * Who is coming.
 *
 * FACES, because a name alone is correct and not scannable: on a card listing five people the
 * photo is recognised before any of the names have been read. 36 of 37 staff have one, so the
 * initials fallback is the exception rather than the usual case.
 *
 * The organiser is first and tagged. Anyone still owing time on a meeting that has happened is
 * marked individually — the card already says "Timesheet pending: A, B, C, D" as a sentence,
 * which at four names is a line of text nobody reads to the end and which does not tell you
 * whether YOU are one of them.
 *
 * External contacts sit in their own row, tinted differently. A client and a colleague on one
 * undifferentiated list is the distinction this whole module is built on, quietly discarded.
 */
const AttendeeRoster: React.FC<{
    attendees: NonNullable<MeetingRow['attendees']>;
    external?: MeetingRow['externalAttendees'];
    showPending: boolean;
}> = ({ attendees, external, showPending }) => {
    const pending = attendees.filter((a) => a.pendingTimesheet);
    if (!attendees.length && !external?.length) return null;

    /*
     * Each person is a CHIP, not a row in a grid.
     *
     * Laid out on an auto-fit grid, a name with nothing around it floats: the eye cannot tell
     * where one person ends and the next begins, and a short name beside a long one reads as a
     * column that failed to align. A bordered surface per person gives the list its unit.
     */
    const person = (name: string, avatar: string | null | undefined, tag?: string, owes?: boolean) => (
        <div
            key={`${name}-${tag ?? ''}`}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0,
                padding: '4px 10px 4px 4px', borderRadius: 999,
                background: owes ? toneAlpha('#B45309', 0.07) : '#FFFFFF',
                border: `1px solid ${owes ? toneAlpha('#B45309', 0.28) : '#E2E8F0'}`,
            }}
        >
            <Avatar
                src={avatar || undefined}
                sx={{
                    width: 26, height: 26, fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                    bgcolor: tag ? '#1E3A8A' : '#CBD5E1', color: tag ? '#fff' : '#334155',
                }}
            >
                {name.charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>
                {name}
            </span>
            {tag && (
                <span style={{
                    flexShrink: 0, fontSize: 8.5, fontWeight: 800, letterSpacing: '.05em',
                    // `toneAlpha`, not an `#RRGGBBAA` literal: an 8-digit hex is opaque to the
                    // dark-mode lint rule and to anyone reading it, and the kit already owns
                    // this exact operation.
                    padding: '2px 5px', borderRadius: 4, background: toneAlpha('#1E3A8A', 0.08), color: '#1E3A8A',
                }}>
                    {tag}
                </span>
            )}
            {owes && (
                // A glyph, not a word: it marks one person in a grid of them, and the count
                // underneath already says how many in total. Tooltip rather than a raw `title`
                // so it is styled like the rest of the app and lint stays clean.
                <Tooltip title="Timesheet not logged yet">
                    <span style={{ flexShrink: 0, color: '#B45309', lineHeight: 0 }}>
                        <AppIcon name="bi-stopwatch" className="fs-8" />
                    </span>
                </Tooltip>
            )}
        </div>
    );

    return (
        // No margin of its own: the card is a flex column with its own gap, and a margin here
        // stacked on top of it left the roster floating further from the meeting than the
        // meeting's own lines are from each other.
        <div style={{
            borderRadius: 9, background: 'rgba(255,255,255,0.72)',
            border: '1px solid #E2E8F0', padding: '9px 11px', marginTop: 2,
        }}>
            <div style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase',
                color: '#94A3B8', marginBottom: 7,
            }}>
                Participants
            </div>
            {/* Wrapped, not a grid: chips are their own width, and a fixed track left a short
                name padded out to the length of the longest one beside it. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {attendees.map((a) => person(a.name, a.avatar, a.isOrganizer ? 'ORGANIZER' : undefined, showPending && a.pendingTimesheet))}
                {external?.map((c) => person(c.name, c.avatar, 'CLIENT'))}
            </div>
            {showPending && pending.length > 0 && (
                <div style={{
                    marginTop: 8, paddingTop: 7, borderTop: '1px dashed #E2E8F0',
                    fontSize: 11.5, fontWeight: 700, color: '#B45309',
                    display: 'flex', alignItems: 'center', gap: 5,
                }}>
                    <AppIcon name="bi-stopwatch" className="fs-8" />
                    Timesheets pending ({pending.length})
                </div>
            )}
        </div>
    );
};

/**
 * One labelled action in a day-card footer: icon AND word, a 30px target, tinted in its own
 * colour so Cancel and Delete read as different weights before they are read as words.
 * `color` is a 6-digit hex (the alpha suffixes below depend on it).
 */
const CardAction: React.FC<{
    icon: string; label: string; color: string; onClick: () => void; pushRight?: boolean;
    /**
     * Why this action cannot be taken right now. Present means disabled.
     *
     * Stated rather than hidden: Cancel is normally here, so removing it leaves somebody
     * hunting for a button that used to exist. A greyed control that says why is the shorter
     * conversation.
     */
    disabledReason?: string;
}> = ({ icon, label, color, onClick, pushRight, disabledReason }) => {
    const button = (
    <Box
        component="button"
        type="button"
        disabled={!!disabledReason}
        onClick={disabledReason ? undefined : onClick}
        sx={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            height: 30, px: 1.25, ml: pushRight ? 'auto' : 0,
            borderRadius: '8px', border: `1px solid ${color}33`, bgcolor: `${color}0D`, color,
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit', lineHeight: 1, whiteSpace: 'nowrap',
            cursor: disabledReason ? 'not-allowed' : 'pointer',
            transition: 'background-color .15s, border-color .15s, transform .1s',
            // Dimmed, not removed. It still occupies its place in the row so the footer does
            // not reflow as a meeting's state changes under the reader.
            opacity: disabledReason ? 0.42 : 1,
            '&:hover': disabledReason ? {} : { bgcolor: `${color}1F`, borderColor: `${color}66` },
            '&:active': disabledReason ? {} : { transform: 'scale(0.97)' },
            '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 1 },
        }}
    >
        <AppIcon name={icon} className="fs-6" />
        {label}
    </Box>
    );
    // A disabled button fires no pointer events, so the tooltip needs a wrapper that does -
    // otherwise the explanation is unreachable by exactly the people who need it.
    return disabledReason
        ? <Tooltip title={disabledReason}><span style={{ display: 'inline-flex', marginLeft: pushRight ? 'auto' : 0 }}>{button}</span></Tooltip>
        : button;
};

/** Phone-only agenda under the month grid — full titles, same handlers as the day dialog. */
const MobileDayAgenda = ({
    dayKeyValue,
    meetings,
    timeRange,
    modeCell,
    stateColors,
    chipColor,
    sectionRef,
    onCreate,
    onEdit,
    onCancel,
    onDelete,
    onLogTime,
    onRemind,
}: {
    dayKeyValue: string;
    meetings: MeetingRow[];
    timeRange: (m: MeetingRow) => string;
    modeCell: (m: MeetingRow) => React.ReactNode;
    stateColors: LifecycleColors;
    chipColor: (m: MeetingRow) => string;
    sectionRef: React.Ref<HTMLElement>;
    onCreate?: (startIso: string) => void;
    onEdit?: (m: MeetingRow) => void;
    onCancel?: (payload: { id: string; cancelled: boolean }) => void;
    onDelete?: (id: string) => void;
    onLogTime?: (m: MeetingRow) => void;
    onRemind?: (m: MeetingRow) => void;
}) => {
    const navigate = useNavigate();
    const openProject = useOpenProject();
    const sorted = useMemo(
        () => [...meetings].sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()),
        [meetings],
    );
    const startOfHalf = (half: 'am' | 'pm') =>
        dayjs(dayKeyValue).startOf('day').hour(HALF_OPENING_HOUR[half]).toISOString();

    return (
        <section
            ref={sectionRef}
            aria-label={`Meetings on ${dayjs(dayKeyValue).format('dddd, D MMMM YYYY')}`}
            style={{
                marginTop: 12, padding: '12px 10px 16px', borderTop: '1px solid #E2E8F0',
                fontFamily: 'Inter', background: '#F8FAFC',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                        {dayjs(dayKeyValue).format('dddd, D MMM YYYY')}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {sorted.length
                            ? `${sorted.length} meeting${sorted.length > 1 ? 's' : ''}`
                            : 'Nothing booked'}
                    </div>
                </div>
                {onCreate && (
                    <Button variant="outline" size="sm" style={{ flexShrink: 0 }}
                        type="button"
                        onClick={() => onCreate(startOfHalf('am'))}
                    >
                        <AppIcon name="bi-plus" className="me-1" />
                        New
                    </Button>
                )}
            </div>

            {sorted.length === 0 ? (
                <div style={{
                    padding: '20px 12px', textAlign: 'center', borderRadius: 10,
                    background: '#fff', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: 13,
                }}>
                    No meetings this day. Tap a free slot on the calendar or create one above.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {sorted.map((m) => {
                        const tone = calendarChipTone(chipColor(m));
                        const cancelBlocked = !isCancelled(m) && (m.loggedMinutes ?? 0) > 0;
                        return (
                            <article
                                key={m.id}
                                style={{
                                    borderRadius: 10, overflow: 'hidden', background: '#fff',
                                    border: '1px solid #E2E8F0',
                                    borderLeft: `4px solid ${chipColor(m)}`,
                                }}
                            >
                                <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: tone.fg, background: tone.bg, padding: '2px 8px', borderRadius: 6 }}>
                                            {timeRange(m)}
                                        </span>
                                        <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                                            {isCancelled(m) && <CancelledTag reason={m.cancelReason} color={stateColors.cancelled} />}
                                            {isAwaitingTime(m) && <AwaitingTag color={stateColors.awaiting} />}
                                        </span>
                                    </div>
                                    <h4 style={{
                                        margin: 0, fontSize: 15, fontWeight: 800, lineHeight: 1.35,
                                        color: isCancelled(m) ? '#94A3B8' : '#0F172A',
                                        textDecoration: isCancelled(m) ? 'line-through' : 'none',
                                        wordBreak: 'break-word',
                                    }}>
                                        {m.title}
                                    </h4>
                                    {m.projectName && (
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A8A' }}>
                                            <ProjectLink name={m.projectName} onOpen={() => openProject(m.projectId, m.isLead)} />
                                            {m.isLead && <LeadTag />}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
                                        {modeCell(m)}
                                        {m.organizerName && <span> · {m.organizerName}</span>}
                                    </div>
                                </div>
                                {((onRemind && !isHeld(m) && !isCancelled(m))
                                    || (onLogTime && isHeld(m) && !isCancelled(m))
                                    || (onEdit && !isCancelled(m) && m.canManage)
                                    || (onCancel && m.canManage) || onDelete
                                    || !isCancelled(m)) && (
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px 10px',
                                        borderTop: '1px dashed rgba(100,116,139,0.28)', background: '#F8FAFC',
                                    }}>
                                        {onRemind && !isHeld(m) && !isCancelled(m) && (
                                            <CardAction icon="bi-bell" label="Remind" color="#1E3A8A" onClick={() => onRemind(m)} />
                                        )}
                                        {onLogTime && isHeld(m) && !isCancelled(m) && (
                                            <CardAction
                                                icon="bi-stopwatch"
                                                label={m.loggedMinutes ? 'Edit time' : 'Log time'}
                                                color={m.loggedMinutes ? '#16A34A' : '#B45309'}
                                                onClick={() => onLogTime(m)}
                                            />
                                        )}
                                        {onEdit && !isCancelled(m) && m.canManage && (
                                            <CardAction icon="bi-pencil" label="Edit" color="#1E3A8A" onClick={() => onEdit(m)} />
                                        )}
                                        {!isCancelled(m) && (
                                            <CardAction
                                                icon="bi-journal-text"
                                                label="Detail"
                                                color="#0F766E"
                                                onClick={() => navigate(`/employees/meetings/agenda?meeting=${m.id}`)}
                                            />
                                        )}
                                        {onCancel && m.canManage && (
                                            <CardAction
                                                icon={isCancelled(m) ? 'bi-arrow-counterclockwise' : 'bi-x-circle'}
                                                label={isCancelled(m) ? 'Restore' : 'Cancel'}
                                                color={isCancelled(m) ? '#16A34A' : '#B45309'}
                                                onClick={() => onCancel({ id: m.id, cancelled: !isCancelled(m) })}
                                                disabledReason={cancelBlocked
                                                    ? 'Time has been logged against this meeting, so it cannot be cancelled.'
                                                    : undefined}
                                            />
                                        )}
                                        {onDelete && (
                                            <CardAction icon="bi-trash" label="Delete" color="#DC2626" onClick={() => onDelete(m.id)} pushRight />
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export interface MeetingsListProps {
    mode: 'project' | 'contact' | 'employee';
    targetId: string;
    /**
     * Shows a create button in the header, and in the day dialog. Omitted → the list is
     * read-only, as on detail pages.
     *
     * The argument is the instant the form should open at, present ONLY when the create came
     * from a particular day. The header button passes nothing, because the header is not
     * standing on a date.
     */
    onCreate?: (startIso?: string) => void;
    /** Shows a row action in the table. Omitted → no delete column. */
    onDelete?: (meetingId: string) => void;
    /**
     * Offers cancel / restore. Omitted → the list is read-only about it, which is what the
     * project, contact and employee detail pages want: they REPORT meetings, they do not run
     * them. Only the organizer may actually do it, and the API enforces that.
     */
    onCancel?: (meeting: { id: string; cancelled: boolean }) => void;
    /** Offers editing. Omitted → rows are not clickable, which is right for a report. */
    onEdit?: (meeting: MeetingRow) => void;
    /**
     * Offers drag-to-reschedule on the month grid. Omitted → cards are not draggable, which is
     * what the read-only detail pages want.
     *
     * The handler receives the meeting and its NEW start/end, already computed: the day moves,
     * the clock does not.
     */
    onReschedule?: (meeting: MeetingRow, next: { startDate: string; endDate: string }) => void;
    /**
     * Offers "log my time" on a meeting that has happened. Omitted → the list only reports.
     *
     * This is what turns an invite list into an attendance record: whoever logs was there, and
     * their time is what the meeting cost.
     */
    onLogTime?: (meeting: MeetingRow) => void;
    /**
     * Offers "remind me" on a meeting still to come.
     *
     * Open to ANYONE on the meeting, unlike edit and cancel: a reminder is the reader's own
     * setting, not a change to the meeting, so it is not the organizer's to gate.
     */
    onRemind?: (meeting: MeetingRow) => void;
    /** Bump to refetch after the parent creates or deletes a meeting. */
    reloadToken?: number;
    /**
     * Open on this day (`YYYY-MM-DD`) instead of today — for arrivals that already know which
     * meeting brought them, such as a chip clicked on the workspace Calendar.
     *
     * The month grid opens on the CURRENT month, so without this a meeting clicked in
     * November lands the reader on a month it is not in — a navigation that goes nowhere is
     * worse than no link.
     */
    focusDate?: string;
    /** Who is reading the list — used to gate edit/cancel/drag when `canManage` is absent. */
    viewerEmployeeId?: string;
}

const MeetingsList: React.FC<MeetingsListProps> = ({
    mode, targetId, onCreate, onDelete, onCancel, onEdit, onReschedule, onLogTime, onRemind,
    reloadToken, focusDate, viewerEmployeeId,
}) => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<MeetingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [layout, setLayout] = useState<'month' | 'table'>('month');
    const [cursor, setCursor] = useState<Dayjs>(dayjs(focusDate || undefined).startOf('month'));
    const [picked, setPicked] = useState<string>(dayKey(focusDate || dayjs()));

    /**
     * Follow the caller when it names a NEW day.
     *
     * Not just the initial state: this list is mounted once inside a tab strip, so a second
     * meeting clicked on the Calendar tab arrives at an instance that is already alive and
     * would otherwise keep showing the first one's month.
     *
     * It does not fight the reader — this only runs when `focusDate` itself changes, so
     * paging the month by hand afterwards sticks.
     */
    useEffect(() => {
        if (!focusDate) return;
        setCursor(dayjs(focusDate).startOf('month'));
        setPicked(dayKey(focusDate));
    }, [focusDate]);
    // Project tab only: cost is a project question. On a person's own Meetings screen it would
    // be a running total of what their calendar costs the company, which is not a number any
    // screen should put in front of the person it is about.
    const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [dayOpen, setDayOpen] = useState(false);
    const { colors: halfColors, labels: halfLabels } = useHalfConfig();
    const todayColor = useTodayColor();
    const todayInk = useMemo(() => todayInkFor(todayColor), [todayColor]);
    // What cancelled, unlogged and held look like — configured on Calendar Configuration →
    // Meetings, and applied identically to the badges and the table rows below.
    const stateColors = useLifecycleColors();
    /** A past meeting's timesheet colour, otherwise the colour of the half it starts in. */
    const chipColor = (m: MeetingRow) => {
        const ts = timesheetStateOf(m);
        return ts ? stateColors[ts] : halfColors[startHalf(m)];
    };
    // The day a dragged meeting is currently over, so the grid can show where it would land.
    const [dragOverDay, setDragOverDay] = useState<string | null>(null);
    /**
     * Phone layout.
     *
     * Seven columns have to stay seven columns — a month that reflows into a list stops being a
     * month — so what gives instead is everything sharing the cell with the meetings: the AM/PM
     * pills go (two 10px labels in a 45px column are a smear, and the half is still readable
     * from the chip colours), fewer chips are listed, and the spacing tightens. Drag-to-move
     * goes too: there is no drag gesture on a touch screen that is not also a scroll.
     */
    const isPhone = useMediaQuery(PHONE);
    const chipH = isPhone ? CHIP_H_PHONE : CHIP_H;
    const maxChipsDesktop = 4;
    const dragEnabled = !!onReschedule && !isPhone;
    const mobileAgendaRef = useRef<HTMLElement>(null);
    const selectDay = useCallback((k: string) => {
        setPicked(k);
        if (isPhone) {
            requestAnimationFrame(() => {
                const reduce = typeof window !== 'undefined'
                    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                mobileAgendaRef.current?.scrollIntoView({
                    behavior: reduce ? 'auto' : 'smooth',
                    block: 'start',
                });
            });
        } else {
            setDayOpen(true);
        }
    }, [isPhone]);

    const viewerCanManage = useCallback(
        (m: MeetingRow) => canManageMeetingRow(m, viewerEmployeeId),
        [viewerEmployeeId],
    );

    const requestEdit = useCallback((m: MeetingRow) => {
        if (!onEdit) return;
        if (!viewerCanManage(m)) {
            void errorConfirmation(MEETING_MANAGE_DENIED);
            return;
        }
        onEdit(m);
    }, [onEdit, viewerCanManage]);

    const requestCancel = useCallback((payload: { id: string; cancelled: boolean }) => {
        if (!onCancel) return;
        const m = meetings.find((row) => row.id === payload.id);
        if (m && !viewerCanManage(m)) {
            void errorConfirmation(MEETING_MANAGE_DENIED);
            return;
        }
        onCancel(payload);
    }, [onCancel, meetings, viewerCanManage]);

    /**
     * Move a meeting to another day, keeping its time of day and its duration.
     *
     * THE TIME IS NOT A CASUALTY OF THE DRAG. A month cell says nothing about the hour, so
     * reading one out of the drop would be inventing it — 09:00 because that is the cell's
     * start, or midnight because that is the date's. The meeting keeps the clock it was given
     * and only its date changes, which is the one thing the gesture actually expresses.
     *
     * Duration is preserved rather than the end date being moved to the same day: a meeting
     * that legitimately runs past midnight stays the length it was.
     */
    const rescheduleTo = (m: MeetingRow, dayIso: string) => {
        if (!viewerCanManage(m)) {
            void errorConfirmation(MEETING_MANAGE_DENIED);
            return;
        }
        const from = dayjs(m.startDate);
        const to = dayjs(dayIso);
        if (!from.isValid() || !to.isValid()) return;
        // Whole days, so a DST boundary cannot shift the clock by an hour.
        const dayShift = to.startOf('day').diff(from.startOf('day'), 'day');
        if (dayShift === 0) return;
        onReschedule?.(m, {
            startDate: from.add(dayShift, 'day').toISOString(),
            endDate: dayjs(m.endDate).add(dayShift, 'day').toISOString(),
        });
    };
    const openProject = useOpenProject();

    useEffect(() => {
        if (!targetId) return;
        let cancelled = false;
        setLoading(true);

        const fetch = FETCHERS[mode](targetId);
        fetch
            .then((res: any) => {
                if (!cancelled) setMeetings(res?.data || []);
            })
            .catch((err: any) => {
                console.error('Failed to load meetings', err);
                if (!cancelled) setMeetings([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [mode, targetId, reloadToken]);

    useEffect(() => {
        if (mode !== 'project' || !targetId) { setAnalytics(null); return; }
        let cancelled = false;
        getProjectMeetingAnalytics(targetId)
            .then((res: any) => { if (!cancelled) setAnalytics(res?.data ?? null); })
            .catch(() => { if (!cancelled) setAnalytics(null); });
        return () => { cancelled = true; };
    }, [mode, targetId, reloadToken]);

    /** Meetings bucketed by day, each day's own list in start order — the grid and the day
     *  panel are two readings of the same map, so they cannot disagree about a day. */
    const byDay = useMemo(() => {
        const map = new Map<string, MeetingRow[]>();
        for (const m of meetings) {
            const k = dayKey(m.startDate);
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(m);
        }
        map.forEach((list) => list.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()));
        return map;
    }, [meetings]);

    /** Six weeks from the Monday on or before the 1st — a fixed 42-cell grid, so the page does
     *  not change height as you page through months. */
    const gridDays = useMemo(() => {
        const first = cursor.startOf('month');
        const start = first.subtract((first.day() + 6) % 7, 'day');
        return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
    }, [cursor]);

    const monthStats = useMemo(() => {
        const inMonth = gridDays.filter((d) => d.month() === cursor.month());
        const today = dayjs().startOf('day');
        const now = dayjs();
        let total = 0;
        let upcoming = 0;
        let clearDays = 0;
        let partFreeDays = 0;
        for (const d of inMonth) {
            const list = byDay.get(dayKey(d)) ?? [];
            total += list.length;
            // Still to come, and still ON: a cancelled meeting is not something you are due at,
            // and counting it would promise a week busier than it is. Measured from NOW rather
            // than from midnight, so this morning's finished meetings stop being "upcoming" the
            // moment they end instead of at the end of the day.
            upcoming += list.filter((m) => !isCancelled(m) && dayjs(m.startDate).isAfter(now)).length;
            if (!list.length) { clearDays += 1; continue; }
            // A day with any meeting has at most ONE free half — the meeting has to land in
            // the morning or the afternoon — so counting free halves here is the same as
            // counting these days, and the day is the thing you actually schedule against.
            const { am, pm } = splitHalves(list);
            const halfOpen = !am.length || !pm.length;
            // FUTURE only. A free morning last Tuesday is not a slot, and counting it inflated
            // the figure with capacity nobody can use.
            if (halfOpen && !d.isBefore(today)) partFreeDays += 1;
        }
        // NOT "free half-days" across the month: that was clear days doubled, so it restated
        // the number beside it instead of adding one. This is the thing Clear days cannot
        // say — where a half-day still fits on a day already partly committed.
        return { total, upcoming, clearDays, partFreeDays };
    }, [gridDays, byDay, cursor]);

    /**
     * Where the meeting is, as somewhere you can GO.
     *
     * An in-person address was plain text, so the only way to act on it was to select it, copy
     * it, and paste it into Maps — from a row that already knew the whole string. It is a link
     * now, on the same footing the online meeting's join link has always been.
     *
     * `stopPropagation` on both: the day panel's rows open the edit form when clicked, and
     * without it following the address ALSO opened a form over the tab that was launching. That
     * was already true of the join link and is the same one-line fix, so both get it here
     * rather than only the one that was reported.
     */
    const modeCell = (m: MeetingRow) => {
        const stop = (e: React.MouseEvent) => e.stopPropagation();
        const mode = modeOfExisting(m);
        const maps = mapsUrl(m.location);
        /*
         * A HYBRID row offers BOTH ways in, side by side.
         *
         * This used to branch on `isOnline`, a boolean asked to describe three modes: a hybrid
         * meeting printed its join link and said nothing about the room, so the half of the
         * guests walking there had no address on the row they were reading. Each half is drawn
         * if the MODE owns it, which is how both can appear.
         */
        const join = modeHasLink(mode) && m.meetingLink ? (
            <a href={m.meetingLink} target="_blank" rel="noreferrer" onClick={stop} style={{ color: '#1E3A8A', fontWeight: 600 }}>
                <AppIcon name="bi-camera-video" className="me-1" />{mode === 'HYBRID' ? 'Join' : 'Online · Join'}
            </a>
        ) : null;
        // No address, no link: a maps search for an empty string lands on nowhere, which is a
        // worse answer than saying the meeting is simply offline.
        const go = modeHasPlace(mode) && maps ? (
            <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                onClick={stop}
                title={`Open in Google Maps — ${m.location}`}
                style={{ color: '#1E3A8A', fontWeight: 600 }}
            >
                <AppIcon name="bi-geo-alt" className="me-1" />{m.location}
            </a>
        ) : null;
        if (join && go) return <>{join}<span style={{ margin: '0 6px', color: '#CBD5E1' }}>·</span>{go}</>;
        if (join || go) return join ?? go;
        // Neither half is actionable: say which mode it is and stop there.
        return (
            <span>
                <AppIcon name={modeHasPlace(mode) ? 'bi-geo-alt' : 'bi-camera-video'} className="me-1" />
                {meetingWhere(mode, m.location)}
            </span>
        );
    };

    /**
     * DATE and TIME lead: this list is read chronologically, so the columns that place a
     * meeting in the week come before the one that names it. `accessorKey` on the date/time
     * columns (not a bare accessorFn) so they carry a stable id — without one the table drops
     * them from its column order and renders them last, which is the opposite of the point.
     */
    const tableColumns = useMemo<MRT_ColumnDef<MeetingRow>[]>(() => [
        {
            accessorKey: 'startDate',
            header: 'Date',
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                const upcoming = dayjs(m.startDate).isAfter(dayjs());
                return (
                    <div>
                        <div className="d-flex align-items-center gap-2" style={{ fontWeight: 700, color: '#1E293B' }}>
                            <span
                                style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: upcoming ? '#16a34a' : '#94A3B8' }}
                                title={upcoming ? 'Upcoming' : 'Past'}
                            />
                            {dayjs(m.startDate).format('DD MMM YYYY')}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{dayjs(m.startDate).format('dddd')}</div>
                    </div>
                );
            },
        },
        {
            id: 'time',
            accessorFn: (m: MeetingRow) => `${dayjs(m.startDate).format(getTimeTokens().TIME)} - ${dayjs(m.endDate).format(getTimeTokens().TIME)}`,
            header: 'Time',
        },
        // Not on the project's own tab: every row there belongs to the project whose page
        // this is, so the column would repeat one value down the whole table. It earns its
        // width only on a list that mixes projects — a person's own meetings.
        ...(mode !== 'project' ? [{
            id: 'project',
            accessorFn: (m: MeetingRow) => m.projectName || '',
            // Both kinds land in this column now that a meeting can be booked from the Leads
            // table, and a header that names only one of them is the sort of small lie that
            // makes people distrust the rest of the row.
            header: 'Project',
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                if (!m.projectName) return <span style={{ color: '#94A3B8' }}>Not linked</span>;
                return (
                    <div>
                        <div style={{ fontWeight: 600, color: '#1E3A8A' }}>
                            <ProjectLink name={m.projectName} onOpen={() => openProject(m.projectId, m.isLead)} />
                            {m.isLead && <LeadTag />}
                        </div>
                        {m.projectNumber && (
                            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{m.projectNumber}</div>
                        )}
                    </div>
                );
            },
        } as MRT_ColumnDef<MeetingRow>] : []),
        {
            accessorKey: 'title',
            header: 'Meeting',
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                return (
                    <div>
                        <div style={{
                            fontWeight: 700,
                            color: isCancelled(m) ? '#94A3B8' : '#1E293B',
                            textDecoration: isCancelled(m) ? 'line-through' : 'none',
                        }}>
                            {m.title}
                            {isCancelled(m) && <CancelledTag reason={m.cancelReason} color={stateColors.cancelled} />}
                            {isAwaitingTime(m) && <AwaitingTag color={stateColors.awaiting} />}
                        </div>
                        {m.description && (
                            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.description}>
                                {m.description}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'mode',
            // The same sentence the cell prints, so search and sort agree with the eye — and
            // so a hybrid is findable by typing "hybrid" as well as by typing the address.
            accessorFn: (m: MeetingRow) => meetingWhere(modeOfExisting(m), m.location),
            header: 'Mode',
            /**
             * ONE LINE, ellipsised — and still a link.
             *
             * A full postal address wrapped to six lines here and set the height of the whole
             * row, so one in-person meeting made every row beside it three times taller than it
             * needed to be. The column sizer is why it was never wide enough to hold it: that
             * helper deliberately ignores values over 60 characters, because sizing a column to
             * its longest string is how one address blows out a table, and it leaves wrapping as
             * the safety net. Wrapping is the wrong net for an address — this is the column that
             * opts out of it.
             *
             * Clipped, not shortened: the anchor still carries the whole address, so the link
             * still goes to the real place and the tooltip still reads it out in full. The day
             * panel keeps two lines, because there the row is as wide as the dialog.
             */
            size: MODE_COL_W,
            Cell: ({ row }: any) => (
                // The max-width is doing the work, not the column width. This table lays out
                // semantically, and in an auto-layout table a cell's width is a suggestion that
                // un-wrappable content overrides — so the ellipsis needs a real bound on the
                // block inside the cell, not just a size on the column.
                <div style={{ maxWidth: MODE_COL_W, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {modeCell(row.original as MeetingRow)}
                </div>
            ),
        },
        { accessorKey: 'organizerName', header: 'Organizer' },
        {
            id: 'participants',
            accessorFn: (m: MeetingRow) => (m.participantNames || []).join(', '),
            header: 'Team Members',
            Cell: ({ row }: any) => namesCell((row.original as MeetingRow).participantNames),
        },
        {
            id: 'externals',
            accessorFn: (m: MeetingRow) => (m.externalParticipantNames || []).join(', '),
            header: 'External Participants',
            Cell: ({ row }: any) => namesCell((row.original as MeetingRow).externalParticipantNames),
        },
        ...[{
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                return (
                    <div style={{ display: 'flex', gap: 4 }}>
                        {onRemind && !isHeld(m) && !isCancelled(m) && (
                            <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => onRemind(m)}
                                title="Remind me before this meeting"
                            >
                                <AppIcon name="bi-bell" className="fs-5" />
                            </Button>
                        )}
                        {onLogTime && isHeld(m) && !isCancelled(m) && (
                            <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => onLogTime(m)}
                                title={m.loggedMinutes ? 'Edit your logged time' : 'Log your time'}
                            >
                                <AppIcon name="bi-stopwatch" className="fs-5" />
                            </Button>
                        )}
                        {onEdit && !isCancelled(m) && viewerCanManage(m) && (
                            <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => requestEdit(m)}
                                title="Edit meeting"
                            >
                                <AppIcon name="bi-pencil" className="fs-5" />
                            </Button>
                        )}
                        {!isCancelled(m) && (
                            <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => navigate(`/employees/meetings/agenda?meeting=${m.id}`)}
                                title="Open meeting detail (agenda and minutes)"
                                aria-label="Open meeting detail (agenda and minutes)"
                                style={{ color: '#0F766E' }}
                            >
                                <AppIcon name="bi-journal-text" className="fs-5" />
                            </Button>
                        )}
                        {onCancel && viewerCanManage(m) && (() => {
                            // The SAME rule the day card applies, because this is the same act
                            // through a different button. Leaving it only on the card would mean
                            // the table is where you go to do the thing the card refuses.
                            const blocked = !isCancelled(m) && (m.loggedMinutes ?? 0) > 0;
                            return (
                                <Button variant="ghost" size="icon-sm"
                                    type="button"
                                    disabled={blocked}
                                    onClick={blocked ? undefined : () => requestCancel({ id: m.id, cancelled: !isCancelled(m) })}
                                    title={blocked
                                        ? 'Time has been logged against this meeting, so it cannot be cancelled'
                                        : (isCancelled(m) ? 'Restore meeting' : 'Cancel meeting')}
                                >
                                    <AppIcon name={isCancelled(m) ? 'bi-arrow-counterclockwise' : 'bi-x-circle'} className="fs-5" />
                                </Button>
                            );
                        })()}
                        {onDelete && (
                            <Button variant="ghost" size="icon-sm"
                                type="button"
                                onClick={() => onDelete(m.id)}
                                title="Delete meeting"
                            >
                                <AppIcon name="bi-trash" className="fs-5" />
                            </Button>
                        )}
                    </div>
                );
            },
        } as MRT_ColumnDef<MeetingRow>],
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [onDelete, onCancel, onEdit, onLogTime, onRemind, mode, openProject, requestEdit, viewerCanManage, navigate]);

    /**
     * A row that states its own outcome.
     *
     * The lifecycle was only ever readable from a badge beside the title — fine when you are
     * already looking at that cell, useless when the question is "which of these forty went
     * ahead". Tint plus a solid left edge is the treatment the rest of the product's tables
     * already use for a status, so this list is scanned the same way the leads list is.
     *
     * Colour comes from the state's ONE configured value, through the same `lifecycleTone`
     * the badge uses — so the tint behind an unlogged meeting is by construction the colour on
     * its AWAITING TIMESHEETS tag, and recolouring the state in Calendar Configuration moves
     * both. A SCHEDULED row returns nothing and stays white: it has no outcome yet, and
     * tinting it would spend a colour saying "nothing has happened".
     */
    const rowTint = useCallback(({ row }: any) => {
        const state = lifecycleOf(row.original as MeetingRow);
        if (!state) return {};
        const tone = lifecycleTone(stateColors[state]);
        return {
            sx: {
                backgroundColor: tone.row,
                '& td:first-of-type': { borderLeft: `4px solid ${tone.edge} !important` },
                transition: 'background-color 0.12s ease',
                '&:hover td': { backgroundColor: `${tone.rowHover} !important` },
            },
        };
    }, [stateColors]);

    const pickedList = byDay.get(picked) ?? [];
    const pickedHalves = splitHalves(pickedList);
    const todayKey = dayKey(dayjs());

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-10">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    const timeRange = (m: MeetingRow) =>
        `${dayjs(m.startDate).format(getTimeTokens().TIME)} – ${dayjs(m.endDate).format(getTimeTokens().TIME)}`;


    return (
        <div style={{ background: '#fff', border: '1px solid #EEF2F6', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isPhone ? 8 : 12, padding: isPhone ? '10px 10px' : '14px 16px', borderBottom: '1px solid #EEF2F6', flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1E3A8A14', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AppIcon name="bi-camera-video" className="fs-3" />
                </div>
                <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Meetings</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
                        {meetings.length === 0
                            ? 'No meetings linked yet'
                            : `${meetings.length} meeting${meetings.length > 1 ? 's' : ''}`}
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                {/* The app's own segmented control, not a bespoke pair of buttons. */}
                <SegmentedControl
                    ariaLabel="Meetings layout"
                    value={layout}
                    onChange={setLayout}
                    options={[
                        { value: 'month', label: 'Calendar' },
                        { value: 'table', label: 'Table' },
                    ]}
                />

                {onCreate && (
                    <Button size="sm" style={{ flexShrink: 0 }}
                        type="button"
                        // No argument: the header is not standing on a date, so the form opens
                        // where it always did rather than on whichever day happens to be picked.
                        onClick={() => onCreate()}
                    >
                        <AppIcon name="bi-plus" className="me-1" />New meeting
                    </Button>
                )}
            </div>

            {analytics && analytics.totalMeetings > 0 && (
                <>
                    <CostSummary data={analytics} onOpenBreakdown={() => setBreakdownOpen(true)} stateColors={stateColors} />
                    <CostBreakdown data={analytics} open={breakdownOpen} onClose={() => setBreakdownOpen(false)} />
                </>
            )}

            {meetings.length === 0 && layout === 'table' ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <AppIcon name="bi-camera-video-off" className="fs-2x" color="#CBD5E1" />
                    <div style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, color: '#475569', marginTop: 10 }}>
                        No meetings yet
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
                        {EMPTY_HINTS[mode]}
                    </div>
                </div>
            ) : layout === 'table' ? (
                // The app's own table, not a hand-rolled one: column show/hide, per-column
                // search, sorting, export and pagination already live here, and every other
                // list in the product is read with those controls. A bespoke <table> looked
                // right and quietly took all of them away.
                <MaterialTable
                    // SEPARATE preference buckets, because the two variants are not the same
                    // table: the project column exists on one and not the other. Sharing one
                    // name made each mount reconcile against the other's column set and rewrite
                    // the saved order — which is why a newly added column came back stranded at
                    // the far right instead of where it is defined. useTablePreferences warns
                    // about exactly this, but only for tables mounted at the same time, and
                    // these two never are.
                    tableName={mode === 'project' ? 'Project Meetings' : 'My Meetings'}
                    columns={tableColumns}
                    data={meetings}
                    enableColumnSpecificSearch
                    // The placeholder stays the app's own "Search in All Columns". A bespoke
                    // sentence here named four fields and still searched all of them, so it
                    // was both longer than every other search box in the product and less
                    // accurate than the generic text it replaced.
                    muiTableProps={{ muiTableBodyRowProps: rowTint }}
                />
            ) : (
                <div style={{ padding: isPhone ? 8 : 16, fontFamily: 'Inter' }}>
                    {/* ── month bar ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <Button variant="outline" size="icon-sm" type="button" onClick={() => setCursor(cursor.subtract(1, 'month'))} aria-label="Previous month">
                            <AppIcon name="bi-chevron-left" />
                        </Button>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', minWidth: isPhone ? 0 : 150 }}>
                            {cursor.format(isPhone ? 'MMM YYYY' : 'MMMM YYYY')}
                        </div>
                        <Button variant="outline" size="icon-sm" type="button" onClick={() => setCursor(cursor.add(1, 'month'))} aria-label="Next month">
                            <AppIcon name="bi-chevron-right" />
                        </Button>
                        <Button variant="outline" size="sm"
                            type="button"
                            onClick={() => { setCursor(dayjs().startOf('month')); selectDay(todayKey); }}
                        >
                            Today
                        </Button>

                        <div style={{ flex: 1 }} />

                        {/* The three numbers somebody actually schedules against. */}
                        <div style={{ display: 'flex', gap: isPhone ? 12 : 16 }}>
                            <Stat label="Meetings" value={monthStats.total} color="#1E3A8A" />
                            {/* What is still to come, which is the figure this row was missing:
                                "8 meetings" in a month that is nearly over says nothing about
                                what is left to sit through. */}
                            <Stat label="Upcoming" value={monthStats.upcoming} color="#B45309" />
                            <Stat label="Clear days" value={monthStats.clearDays} color="#2563EB" />
                            <Stat label="Part-free days" value={monthStats.partFreeDays} color="#16A34A" />
                        </div>
                    </div>

                    {/* ── weekday header ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isPhone ? 3 : 6, marginBottom: 6 }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                            <div key={d} style={{ fontSize: isPhone ? 9.5 : 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', overflow: 'hidden' }}>
                                {isPhone ? d.slice(0, 1) : d}
                            </div>
                        ))}
                    </div>

                    {/* ── the grid ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isPhone ? 3 : 6 }}>
                        {gridDays.map((d) => {
                            const k = dayKey(d);
                            const list = byDay.get(k) ?? [];
                            const { am, pm } = splitHalves(list);
                            const clear = list.length === 0;
                            const outside = d.month() !== cursor.month();
                            const isToday = k === todayKey;
                            const isPicked = k === picked;
                            const tsMarker = dayTimesheetMarker(list);
                            // Today wins over timesheet wash; pending wins over filled.
                            const washColor = isToday
                                ? todayColor
                                : tsMarker === 'pending'
                                    ? stateColors.pending
                                    : tsMarker === 'filled'
                                        ? stateColors.filled
                                        : null;
                            const dateInk = washColor
                                ? todayInkFor(washColor)
                                : (clear ? '#94A3B8' : '#1E293B');
                            const halfWord = (n: number, label: string) =>
                                n ? `${label}: ${n} meeting${n > 1 ? 's' : ''}` : `${label}: free`;
                            const maxChips = isPhone ? phoneChipCap(list.length) : maxChipsDesktop;
                            const hasMore = list.length > maxChips;
                            const shown = list.slice(0, maxChips);
                            const chipStack = shown.length;
                            const chipLayout = monthChipLayout(chipStack, isPhone, hasMore);
                            return (
                                <button data-wt-control="cell"
                                    key={k}
                                    type="button"
                                    onClick={() => selectDay(k)}
                                    // Native HTML5 DnD: the gesture is "put this card on that
                                    // day", which is exactly what dragover/drop model. Guarded on
                                    // onReschedule so read-only surfaces stay read-only.
                                    onDragOver={dragEnabled ? (e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                        if (dragOverDay !== k) setDragOverDay(k);
                                    } : undefined}
                                    onDragLeave={dragEnabled ? () => {
                                        setDragOverDay((cur) => (cur === k ? null : cur));
                                    } : undefined}
                                    onDrop={dragEnabled ? (e) => {
                                        e.preventDefault();
                                        setDragOverDay(null);
                                        const id = e.dataTransfer.getData('text/meeting-id');
                                        const found = meetings.find((mm) => mm.id === id);
                                        if (found) rescheduleTo(found, k);
                                    } : undefined}
                                    title={`${halfWord(am.length, 'Morning')} · ${halfWord(pm.length, 'Afternoon')}`}
                                    style={{
                                        textAlign: 'left', cursor: 'pointer',
                                        // Fixed, not minimum. A cell that grows for a busy day
                                        // makes its whole ROW grow, and a month whose weeks are
                                        // different heights is read as a list rather than a grid.
                                        // What overflows is said as "+n more" instead.
                                        //
                                        // The number is the sum of what a full cell holds, not a
                                        // round one: padding, the pill row, four chips with their
                                        // gaps, and the "+n more" line. Guessing it low is how the
                                        // fourth meeting ends up cropped by the overflow below.
                                        height: isPhone ? 76 : 118,
                                        padding: isPhone ? '4px 3px' : '6px 7px',
                                        // THE fix for chips that stretched their column: a grid
                                        // item's default `min-width: auto` is its content, so one
                                        // long meeting title set the width of the whole column and
                                        // squeezed the other six. Zero lets the column be 1/7th and
                                        // makes the chips' own ellipsis actually reachable.
                                        minWidth: 0, overflow: isPhone ? 'hidden' : 'visible',
                                        borderRadius: 9,
                                        // Today / timesheet washes share todayCellStyle. Drag still
                                        // wins: while one is in flight the only question is landing.
                                        ...(washColor && dragOverDay !== k
                                            ? todayCellStyle(clear ? '#F1F5F9' : '#FFFFFF', washColor)
                                            : {
                                                background: dragOverDay === k ? '#EFF4FF' : (clear ? '#F1F5F9' : '#FFFFFF'),
                                                boxShadow: 'none',
                                            }),
                                        // The drop target states itself. Without it a drag across
                                        // a 42-cell grid is a guess about which cell is under the
                                        // cursor.
                                        border: dragOverDay === k
                                            ? '2px dashed #1E3A8A'
                                            : isPicked ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                                        // Days outside the month recede, so the month's own shape is
                                        // still the first thing read.
                                        opacity: outside ? 0.35 : 1,
                                        display: 'flex', flexDirection: 'column', gap: isPhone ? 2 : 3,
                                    }}
                                >
                                    {/* Date and halves on ONE line. They were stacked, and the row
                                        the halves occupied was costing two meetings out of every
                                        cell — the date is 12px of text with the whole width beside
                                        it going spare, so the pills sit in it.
                                        Left is the morning, right the afternoon: the order a day is
                                        lived in, so the pair reads without a key once seen. */}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                        <span style={{
                                            fontSize: isPhone ? 10 : 12, fontWeight: 800, minWidth: isPhone ? 12 : 15,
                                            lineHeight: 1.1, flexShrink: 0,
                                            color: dateInk,
                                        }}>
                                            {d.format('D')}
                                        </span>
                                        {/* No pills on a phone. A 45px column cannot hold two
                                            labelled blocks and still be read, and the halves are
                                            already carried by the chip colours below — a pill
                                            squeezed to three pixels is noise, not information. */}
                                        {!isPhone && (
                                            <span style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }} aria-hidden>
                                                <HalfPill half="am" count={am.length} colors={halfColors} labels={halfLabels} />
                                                <HalfPill half="pm" count={pm.length} colors={halfColors} labels={halfLabels} />
                                            </span>
                                        )}
                                    </span>

                                    {isPhone ? (
                                        <PhoneMonthCellMeetings
                                            list={list}
                                            chipColor={chipColor}
                                            onShowAgenda={() => selectDay(k)}
                                        />
                                    ) : (
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex', flexDirection: 'column',
                                        gap: 3,
                                        flex: 1, minHeight: 0, overflow: 'visible',
                                        justifyContent: 'flex-start',
                                    }}>
                                    {shown.map((m) => {
                                        const tone = calendarChipTone(chipColor(m));
                                        return (
                                        <MonthMeetingChip
                                            key={m.id}
                                            layout={chipLayout}
                                            tone={tone}
                                            allowExpand
                                            draggable={dragEnabled && !isCancelled(m) && viewerCanManage(m)}
                                            pauseCellClick={false}
                                            cancelled={isCancelled(m)}
                                            onDragStart={dragEnabled ? (e) => {
                                                e.stopPropagation();
                                                e.dataTransfer.setData('text/meeting-id', m.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                            } : undefined}
                                        >
                                            <>
                                                <span style={{ fontWeight: 800 }}>
                                                    {dayjs(m.startDate).format('h:mm A')}
                                                </span>
                                                {' '}
                                            </>
                                            {m.title}
                                            {mode !== 'project' && m.projectName && (
                                                <span style={{ opacity: 0.85, fontWeight: 600 }}>
                                                    {' '}{m.projectName}
                                                </span>
                                            )}
                                        </MonthMeetingChip>
                                    );})}
                                    {hasMore && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, color: '#64748B',
                                            flexShrink: 0, lineHeight: 1.1, overflow: 'hidden',
                                            whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                        }}>
                                            +{list.length - maxChips} more
                                        </span>
                                    )}
                                    </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {isPhone && (
                        <MobileDayAgenda
                            dayKeyValue={picked}
                            meetings={pickedList}
                            timeRange={timeRange}
                            modeCell={modeCell}
                            stateColors={stateColors}
                            chipColor={chipColor}
                            sectionRef={mobileAgendaRef}
                            onCreate={onCreate}
                            onEdit={onEdit ? requestEdit : undefined}
                            onCancel={onCancel ? requestCancel : undefined}
                            onDelete={onDelete}
                            onLogTime={onLogTime}
                            onRemind={onRemind}
                        />
                    )}

                    <DayDetail
                        dayKeyValue={picked}
                        halves={pickedHalves}
                        stateColors={stateColors}
                        open={dayOpen && !isPhone}
                        onClose={() => setDayOpen(false)}
                        timeRange={timeRange}
                        modeCell={modeCell}
                        onDelete={onDelete}
                        onLogTime={onLogTime ? (m) => { setDayOpen(false); onLogTime(m); } : undefined}
                        onRemind={onRemind ? (m) => { setDayOpen(false); onRemind(m); } : undefined}
                        onEdit={onEdit ? (m) => { setDayOpen(false); requestEdit(m); } : undefined}
                        onCancel={onCancel ? requestCancel : undefined}
                        // Closes first: the create form is the thing being answered now, and two
                        // stacked dialogs leave the day sitting behind it saying the slot is free
                        // while the form is busy filling it.
                        onCreate={onCreate ? (iso) => { setDayOpen(false); onCreate(iso); } : undefined}
                        colors={halfColors}
                        labels={halfLabels}
                    />

                    {/* ── legend ── */}
                    {/* One sample per colour, and there are exactly three. It used to name
                        counts, which is what the colours no longer mean. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                        {/* The words the DAY PANEL uses — "First half", "Second half" — rather
                            than a second way of saying the same thing. The panel that opens
                            when you click a day names the halves exactly like this, and the
                            legend teaching one vocabulary for a screen that then speaks another
                            is a key you have to translate twice. */}
                        {([
                            { half: 'am', count: 0, label: 'Nothing booked' },
                            { half: 'am', count: 1, label: 'First half' },
                            { half: 'pm', count: 1, label: 'Second half' },
                        ] as const).map((sample) => (
                            <span key={sample.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#64748B' }}>
                                <span style={{ display: 'inline-flex', width: 30 }}>
                                    <HalfPill half={sample.half} count={sample.count} colors={halfColors} labels={halfLabels} showCount={false} />
                                </span>
                                {sample.label}
                            </span>
                        ))}
                        {/* Past meetings trade their half colour for these two. */}
                        {([
                            { key: 'filled' as const, label: 'Timesheets filled', color: stateColors.filled },
                            { key: 'pending' as const, label: 'Timesheets pending', color: stateColors.pending },
                            { key: 'today' as const, label: 'Today', color: todayColor },
                        ]).map((sample) => (
                            <span key={sample.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
                                <span style={{ width: 14, height: 14, borderRadius: 4, ...todayCellStyle('#FFFFFF', sample.color) }} />
                                {sample.label}
                            </span>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
};

const navBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff',
    color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 }}>
            {label}
        </div>
    </div>
);

export default MeetingsList;
