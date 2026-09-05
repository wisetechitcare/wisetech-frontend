import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
    getMeetingsByProject, getMeetingsByContact, getMeetingsByEmployee, getProjectMeetingAnalytics,
} from '@services/employee';
import { useNavigate } from 'react-router-dom';
import { fetchConfiguration } from '@services/company';
import { safeJsonParse } from '@utils/safeJson';
import {
    MEETING_HALF_BUSY_COLOR, MEETING_HALF_FREE_COLOR, MEETING_HALF_ONE_COLOR,
} from '@constants/configurations-key';
import { Dialog, DialogContent } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { SegmentedControl } from '@app/modules/common/components/ui/SegmentedControl';

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
    isOnline: boolean;
    meetingLink?: string | null;
    location?: string | null;
    startDate: string;
    endDate: string;
    /** SCHEDULED | COMPLETED | CANCELLED — derived server-side, never stored as COMPLETED. */
    lifecycle?: string;
    /** Time actually logged against this meeting, and by how many people. 0 = unrecorded. */
    loggedMinutes?: number;
    loggedBy?: number;
    cancelReason?: string | null;
    /** The organizer. Who may edit or cancel is decided against this. */
    employeeId?: string;
    /** Raw rosters as stored — ids, not names — which is what the edit form needs back. */
    participants?: string;
    externalParticipants?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    projectNumber?: string | null;
    organizerName?: string;
    participantNames?: string[];
    externalParticipantNames?: string[];
}

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
 * The boundary is noon. A meeting counts against a half if it OVERLAPS it, so 11:30–12:30
 * takes both — it genuinely blocks the end of the morning and the start of the afternoon,
 * and rounding it into one would offer a slot that is not really there.
 */
const HALF_BOUNDARY_HOUR = 12;

const splitHalves = (list: MeetingRow[], day: Dayjs) => {
    const noon = day.startOf('day').add(HALF_BOUNDARY_HOUR, 'hour');
    const am: MeetingRow[] = [];
    const pm: MeetingRow[] = [];
    for (const m of list) {
        if (dayjs(m.startDate).isBefore(noon)) am.push(m);
        if (dayjs(m.endDate).isAfter(noon)) pm.push(m);
    }
    return { am, pm };
};

/**
 * How a half-day looks.
 *
 * Two hairlines were doing the work here and nobody could see them — the state of a half is
 * the single most important thing on this grid and it was the faintest mark in the cell. Each
 * half is now a filled block wearing its own name, so the answer arrives without a trip to the
 * legend: a grey dashed AM reads as an empty slot, a solid navy PM as a full afternoon.
 *
 * Free is deliberately the only OUTLINED state. Booked halves are solid, so a month's busy
 * days sit forward of the free ones instead of every day carrying equal visual weight.
 */
export interface HalfColors { free: string; one: string; busy: string }

const DEFAULT_HALF_COLORS: HalfColors = { free: '#F8FAFC', one: '#DBEAFE', busy: '#1E3A8A' };

const isCancelled = (m: MeetingRow) => m.lifecycle === 'CANCELLED';
const isHeld = (m: MeetingRow) => m.lifecycle === 'COMPLETED';

/**
 * A meeting that happened and that nobody has logged time against.
 *
 * NOT the same as "free". Cost comes from timesheets now, so a held meeting with nothing
 * logged costs ₹0 — and ₹0 reads as "this was free", when what it actually means is "nobody
 * has said what this took". The two need telling apart wherever a cost is shown, or the
 * project's total quietly understates itself and looks precise doing it.
 */
const isAwaitingTime = (m: MeetingRow) => isHeld(m) && !(m.loggedMinutes ?? 0);

const AwaitingTag = () => (
    <span
        title="This meeting has happened, but nobody has logged their time yet — so it has no cost recorded."
        style={{
            display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 20,
            background: '#FEF3C7', color: '#92400E', fontSize: 9.5, fontWeight: 800,
            letterSpacing: 0.3, verticalAlign: 'middle', whiteSpace: 'nowrap',
        }}
    >
        AWAITING TIMESHEETS
    </span>
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
const CancelledTag = ({ reason }: { reason?: string | null }) => (
    <span
        title={reason || 'Cancelled'}
        style={{
            display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 20,
            background: '#FEE2E2', color: '#B91C1C', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4,
            verticalAlign: 'middle',
        }}
    >
        CANCELLED
    </span>
);

/**
 * Readable text on ANY configured colour.
 *
 * The palette is a setting now, so the ink cannot be hard-coded against it — somebody picking
 * a dark free-colour would otherwise get grey-on-navy. Standard luminance: light backgrounds
 * take dark text, dark ones take white.
 */
const readableOn = (bg: string) => {
    const hex = bg.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1E293B' : '#FFFFFF';
};

const halfStyle = (count: number, colors: HalfColors = DEFAULT_HALF_COLORS) => {
    const bg = count === 0 ? colors.free : count === 1 ? colors.one : colors.busy;
    return {
        bg,
        fg: count === 0 ? '#94A3B8' : readableOn(bg),
        // Free stays the only OUTLINED step: booked halves sit forward of it, which is what
        // makes an open slot findable by scanning rather than reading.
        border: count === 0 ? '1px dashed #CBD5E1' : `1px solid ${bg}`,
    };
};

/** The configured availability scale, falling back to the built-in one. */
const useHalfColors = (): HalfColors => {
    const [colors, setColors] = useState<HalfColors>(DEFAULT_HALF_COLORS);
    useEffect(() => {
        let cancelled = false;
        const read = async (key: string, fallback: string) => {
            // A module with no saved row answers 400 — that is "not configured", not an error.
            const res = await fetchConfiguration(key).catch(() => null);
            const cfg = safeJsonParse(res?.data?.configuration?.configuration || '{}');
            return cfg.enabled === false ? fallback : (cfg.color || fallback);
        };
        Promise.all([
            read(MEETING_HALF_FREE_COLOR, DEFAULT_HALF_COLORS.free),
            read(MEETING_HALF_ONE_COLOR, DEFAULT_HALF_COLORS.one),
            read(MEETING_HALF_BUSY_COLOR, DEFAULT_HALF_COLORS.busy),
        ]).then(([free, one, busy]) => { if (!cancelled) setColors({ free, one, busy }); });
        return () => { cancelled = true; };
    }, []);
    return colors;
};

/** `AM` when free, `AM 2` when not — the count belongs on the block it describes. */
const HalfPill = ({ label, count, colors }: { label: 'AM' | 'PM'; count: number; colors?: HalfColors }) => {
    const st = halfStyle(count, colors);
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
            {count > 0 && <span style={{ fontWeight: 700, opacity: 0.85 }}>{count}</span>}
        </span>
    );
};

const dayKey = (d: Dayjs | string) => dayjs(d).format('YYYY-MM-DD');

/**
 * Opening a project from a meeting.
 *
 * `isProject` in the nav state is load-bearing, not decoration: the entity page hides its
 * project-only tabs (Meetings among them) unless it is told it was entered from a project, so
 * without it the link lands on the lead view and bounces off the tab it asked for.
 */
const useOpenProject = () => {
    const navigate = useNavigate();
    // Stable: the column definitions memoise on it, and a fresh function each render would
    // rebuild every column on every render — which is the cost this table was moved off.
    return useCallback((projectId?: string | null) => {
        if (!projectId) return;
        navigate(`/leads/${projectId}?tab=meetings`, { state: { leadData: projectId, isProject: true } });
    }, [navigate]);
};

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
    inPersonCount: number;
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

const inr = (n: number) => `\u20B9${Math.round(n).toLocaleString('en-IN')}`;
const hm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (!h && !m) return '0m';
    return `${h ? `${h}h ` : ''}${m ? `${m}m` : ''}`.trim();
};

/**
 * What this project's meetings have cost, and the habit behind the number.
 *
 * ─── ONE LOUD CARD, THREE QUIET ONES ─────────────────────────────────────────
 * A row of four identically-weighted tiles is the default treatment and it makes every figure
 * equally important, which is the same as making none of them important. Cost is the thing
 * nobody currently knows and the thing that changes behaviour, so it takes the solid navy fill
 * and the others sit back on a pale ground. No shadows and no icon chips: the card is already
 * inside a bordered panel, and a circled glyph on each tile would be four more things to look
 * at before reaching a number.
 *
 * Every card carries its DENOMINATOR on the second line — "across 4 held meetings", "3.2 people
 * average". A total with nothing to divide it by is a fact; a total with its denominator is an
 * argument someone can act on.
 */
const CostSummary: React.FC<{ data: MeetingAnalytics; onOpenBreakdown: () => void }> = ({ data, onOpenBreakdown }) => {
    const cards: Array<{
        label: string; value: string; sub: string; loud?: boolean;
    }> = [
        {
            label: 'Meetings held',
            value: String(data.heldCount),
            sub: data.upcomingCount ? `${data.upcomingCount} still scheduled` : 'none upcoming',
        },
        {
            label: 'Total cost',
            value: data.costVisible ? inr(data.heldCost ?? 0) : 'Hidden',
            // The denominator is the meetings that ACTUALLY have time logged. Saying "across 5
            // held meetings" over a total drawn from two of them reads as precise and is not.
            sub: !data.costVisible
                ? 'needs finance access'
                : data.awaitingTimesheets
                    ? `${data.heldCount - data.awaitingTimesheets} of ${data.heldCount} meetings logged`
                    : `across ${data.heldCount} held meeting${data.heldCount === 1 ? '' : 's'}`,
            loud: true,
        },
        {
            label: 'Time logged',
            // Claimed, not scheduled. The old figure multiplied a meeting's length by everyone
            // invited, so it counted hours nobody spent.
            value: hm(data.loggedMinutes ?? 0),
            sub: data.awaitingTimesheets
                ? `${hm(data.heldMinutes)} of meetings held`
                : `across ${hm(data.heldMinutes)} of meetings`,
        },
        {
            label: 'Average meeting',
            value: data.costVisible ? inr(data.avgCostPerMeeting ?? 0) : hm(data.avgMinutes),
            sub: data.costVisible
                ? `${hm(data.avgMinutes)} with about ${Math.round(data.avgAttendees)} people`
                : `about ${Math.round(data.avgAttendees)} people in the room`,
        },
    ];

    return (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #EEF2F6', background: '#FCFDFF' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {cards.map((c) => {
                    // The cost card is the only one with somewhere to go, so it is the only one
                    // that behaves like a control — the others stay plain text and do not invite
                    // a click that would do nothing.
                    const clickable = !!c.loud && data.costVisible;
                    return (
                    <div
                        key={c.label}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? onOpenBreakdown : undefined}
                        onKeyDown={clickable ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenBreakdown(); }
                        } : undefined}
                        style={{
                            borderRadius: 12,
                            padding: '14px 15px',
                            minHeight: 104,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            background: c.loud ? '#1E3A8A' : '#F5F8FF',
                            border: `1px solid ${c.loud ? '#1E3A8A' : '#E2E8F0'}`,
                            cursor: clickable ? 'pointer' : 'default',
                        }}
                    >
                        <div style={{
                            fontSize: 12, fontWeight: 600, color: c.loud ? '#BFD2F5' : '#64748B',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            {c.label}
                            {clickable && <AppIcon name="bi-chevron-right" className="fs-8" />}
                        </div>
                        <div>
                            <div style={{
                                fontSize: 24, fontWeight: 800, lineHeight: 1.1,
                                color: c.loud ? '#FFFFFF' : '#1E293B',
                            }}>
                                {c.value}
                            </div>
                            <div style={{
                                fontSize: 11.5, marginTop: 5,
                                color: c.loud ? '#9DB6E8' : '#94A3B8',
                            }}>
                                {c.sub}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Context for the totals above, written as sentences. Facts strung together with
                middle dots read as machine output; these are the notes a colleague would add
                under the numbers when handing them over. */}
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>
                <div>
                    {data.onlineCount > 0 && data.inPersonCount > 0
                        ? `${data.onlineCount} of these were held online and ${data.inPersonCount} in person.`
                        : data.onlineCount > 0
                            ? `All ${data.onlineCount} were held online.`
                            : `All ${data.inPersonCount} were held in person.`}
                    {' '}
                    {data.internalAttendees} {data.internalAttendees === 1 ? 'person' : 'people'} from the team took part
                    {data.externalAttendees > 0
                        ? `, along with ${data.externalAttendees} from the client side.`
                        : '.'}
                </div>
                {data.awaitingTimesheets > 0 && (
                    <div style={{ color: '#92400E' }}>
                        {data.awaitingTimesheets} held meeting{data.awaitingTimesheets === 1 ? ' has' : 's have'} no
                        time logged yet, so {data.awaitingTimesheets === 1 ? 'it is' : 'they are'} not in the total
                        above. Cost comes from the timesheets attendees file.
                    </div>
                )}
                {data.costVisible && data.costliestMeeting && (
                    <div>
                        The most expensive was{' '}
                        <strong style={{ color: '#1E293B' }}>{data.costliestMeeting.title}</strong>, at{' '}
                        {inr(data.costliestMeeting.cost)}.
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
                    {inr(data.heldCost ?? 0)}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#9DB6E8', marginTop: 2 }}>
                    across {data.heldCount} held meeting{data.heldCount === 1 ? '' : 's'}
                </div>
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onClose} aria-label="Close"
                style={{ border: 0, background: 'transparent', color: '#BFD2F5', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
                <AppIcon name="bi-x-lg" className="fs-4" />
            </button>
        </div>

        <DialogContent sx={{ p: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', fontFamily: 'Inter' }}>
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
                                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                                    {e.meetings} meeting{e.meetings === 1 ? '' : 's'}, {hm(e.minutes)} of their time
                                    {e.rate > 0 && ` at ${inr(e.rate)}/hr`}
                                </div>
                                {/* The arithmetic, spelled out. An hourly rate nobody can check is
                                    an hourly rate somebody has to raise a ticket about — this line
                                    turns "why is that 67?" into a salary or a working-hours setting
                                    you can go and look at. */}
                                {e.monthlySalary != null && (
                                    <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 1 }}>
                                        {inr(e.monthlySalary)}/mo ÷ {e.daysInMonth} days ÷ {e.workingHours}h
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{inr(e.cost)}</div>
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
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>{inr(m.cost)}</div>
                        </div>
                    ))}
                </div>
            </div>
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
}> = ({ dayKeyValue, halves, open, onClose, timeRange, modeCell, onDelete, onEdit, onCancel, onLogTime }) => {
    const openProject = useOpenProject();
    const total = halves.am.length + halves.pm.length;
    const summary = !total
        ? 'nothing booked — free all day'
        : !halves.am.length
            ? 'morning is free'
            : !halves.pm.length
                ? 'afternoon is free'
                : 'both halves booked';
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <div style={{ background: '#1E3A8A', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div>
                    <div style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: 800, color: '#fff' }}>
                        {dayjs(dayKeyValue).format('dddd, DD MMM YYYY')}
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: '#BFD2F5', marginTop: 2 }}>{summary}</div>
                </div>
                <div style={{ flex: 1 }} />
                <button type="button" onClick={onClose} aria-label="Close"
                    style={{ border: 0, background: 'transparent', color: '#BFD2F5', cursor: 'pointer', lineHeight: 1 }}>
                    <AppIcon name="bi-x-lg" className="fs-4" />
                </button>
            </div>
            <DialogContent sx={{ p: 2, fontFamily: 'Inter' }}>

            {/* Two sections, always both shown — a free half has to be VISIBLE to be
                bookable, so the empty one states itself rather than being left out.
                A meeting straddling noon appears under both, because it blocks both. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {([
                { key: 'am', label: 'First half', hint: 'before 12:00', list: halves.am },
                { key: 'pm', label: 'Second half', hint: 'from 12:00', list: halves.pm },
            ] as const).map((half) => (
            <div key={half.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', width: 34 }}>
                        <HalfPill label={half.key === 'am' ? 'AM' : 'PM'} count={half.list.length} />
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>{half.label}</span>
                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}>{half.hint}</span>
                </div>
            {half.list.length === 0 ? (
                <div style={{ background: '#F1F5F9', border: '1px dashed #CBD5E1', borderRadius: 9, padding: '16px 14px', fontSize: 12.5, color: '#64748B' }}>
                    Free — any time in this half works.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {half.list.map((m) => (
                        <div
                            key={m.id}
                            onClick={onEdit ? () => onEdit(m) : undefined}
                            role={onEdit ? 'button' : undefined}
                            tabIndex={onEdit ? 0 : undefined}
                            onKeyDown={onEdit ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(m); }
                            } : undefined}
                            title={onEdit ? 'Open this meeting' : undefined}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: 12,
                                background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 9, padding: '10px 12px',
                                cursor: onEdit ? 'pointer' : 'default',
                            }}
                        >
                            <div style={{ minWidth: 118, fontSize: 12, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>
                                {timeRange(m)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                                    {m.title}
                                    {isAwaitingTime(m) && <AwaitingTag />}
                                </div>
                                {m.projectName && (
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E3A8A', marginTop: 2 }}>
                                        <ProjectLink name={m.projectName} onOpen={() => openProject(m.projectId)} />
                                    </div>
                                )}
                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                    {modeCell(m)}
                                    {m.organizerName && <span style={{ marginLeft: 10 }}>· {m.organizerName}</span>}
                                </div>
                            </div>
                            {/* The SAME three actions the table row offers. They were only in
                                the table, so which of them existed depended on which view you
                                happened to be in — and the day modal is the view people are in
                                when they want them. */}
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                {onLogTime && isHeld(m) && !isCancelled(m) && (
                                    <button
                                        type="button"
                                        onClick={() => onLogTime(m)}
                                        title={m.loggedMinutes ? 'Edit your logged time' : 'Log your time'}
                                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: m.loggedMinutes ? '#16A34A' : '#B45309' }}
                                    >
                                        <AppIcon name="bi-stopwatch" className="fs-5" />
                                    </button>
                                )}
                                {onEdit && !isCancelled(m) && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(m)}
                                        title="Edit meeting"
                                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#1E3A8A' }}
                                    >
                                        <AppIcon name="bi-pencil" className="fs-5" />
                                    </button>
                                )}
                                {onCancel && (
                                    <button
                                        type="button"
                                        onClick={() => onCancel({ id: m.id, cancelled: !isCancelled(m) })}
                                        title={isCancelled(m) ? 'Restore meeting' : 'Cancel meeting'}
                                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: isCancelled(m) ? '#16A34A' : '#B45309' }}
                                    >
                                        <AppIcon name={isCancelled(m) ? 'bi-arrow-counterclockwise' : 'bi-x-circle'} className="fs-5" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(m.id)}
                                        title="Delete meeting"
                                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#DC2626' }}
                                    >
                                        <AppIcon name="bi-trash" className="fs-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </div>
            ))}
            </div>
            </DialogContent>
        </Dialog>
    );
};

export interface MeetingsListProps {
    mode: 'project' | 'contact' | 'employee';
    targetId: string;
    /** Shows a create button in the header. Omitted → the list is read-only, as on detail pages. */
    onCreate?: () => void;
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
    /** Bump to refetch after the parent creates or deletes a meeting. */
    reloadToken?: number;
}

const MeetingsList: React.FC<MeetingsListProps> = ({ mode, targetId, onCreate, onDelete, onCancel, onEdit, onReschedule, onLogTime, reloadToken }) => {
    const [meetings, setMeetings] = useState<MeetingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [layout, setLayout] = useState<'month' | 'table'>('month');
    const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf('month'));
    const [picked, setPicked] = useState<string>(dayKey(dayjs()));
    // Project tab only: cost is a project question. On a person's own Meetings screen it would
    // be a running total of what their calendar costs the company, which is not a number any
    // screen should put in front of the person it is about.
    const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [dayOpen, setDayOpen] = useState(false);
    const halfColors = useHalfColors();
    // The day a dragged meeting is currently over, so the grid can show where it would land.
    const [dragOverDay, setDragOverDay] = useState<string | null>(null);

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
        let total = 0;
        let clearDays = 0;
        let partFreeDays = 0;
        for (const d of inMonth) {
            const list = byDay.get(dayKey(d)) ?? [];
            total += list.length;
            if (!list.length) { clearDays += 1; continue; }
            // A day with any meeting has at most ONE free half — the meeting has to land in
            // the morning or the afternoon — so counting free halves here is the same as
            // counting these days, and the day is the thing you actually schedule against.
            const { am, pm } = splitHalves(list, d);
            const halfOpen = !am.length || !pm.length;
            // FUTURE only. A free morning last Tuesday is not a slot, and counting it inflated
            // the figure with capacity nobody can use.
            if (halfOpen && !d.isBefore(today)) partFreeDays += 1;
        }
        // NOT "free half-days" across the month: that was clear days doubled, so it restated
        // the number beside it instead of adding one. This is the thing Clear days cannot
        // say — where a half-day still fits on a day already partly committed.
        return { total, clearDays, partFreeDays };
    }, [gridDays, byDay, cursor]);

    const modeCell = (m: MeetingRow) => (
        m.isOnline ? (
            m.meetingLink ? (
                <a href={m.meetingLink} target="_blank" rel="noreferrer" style={{ color: '#1E3A8A', fontWeight: 600 }}>
                    <AppIcon name="bi-camera-video" className="me-1" />Online · Join
                </a>
            ) : (
                <span><AppIcon name="bi-camera-video" className="me-1" />Online</span>
            )
        ) : (
            <span title={m.location || ''}><AppIcon name="bi-geo-alt" className="me-1" />{m.location || 'Offline'}</span>
        )
    );

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
            accessorFn: (m: MeetingRow) => `${dayjs(m.startDate).format('hh:mm A')} - ${dayjs(m.endDate).format('hh:mm A')}`,
            header: 'Time',
        },
        // Not on the project's own tab: every row there belongs to the project whose page
        // this is, so the column would repeat one value down the whole table. It earns its
        // width only on a list that mixes projects — a person's own meetings.
        ...(mode !== 'project' ? [{
            id: 'project',
            accessorFn: (m: MeetingRow) => m.projectName || '',
            header: 'Project',
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                if (!m.projectName) return <span style={{ color: '#94A3B8' }}>Not linked</span>;
                return (
                    <div>
                        <div style={{ fontWeight: 600, color: '#1E3A8A' }}>
                            <ProjectLink name={m.projectName} onOpen={() => openProject(m.projectId)} />
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
                            {isCancelled(m) && <CancelledTag reason={m.cancelReason} />}
                            {isAwaitingTime(m) && <AwaitingTag />}
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
            accessorFn: (m: MeetingRow) => (m.isOnline ? 'Online' : m.location || 'In person'),
            header: 'Mode',
            Cell: ({ row }: any) => modeCell(row.original as MeetingRow),
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
        ...(onDelete || onCancel || onEdit || onLogTime ? [{
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            Cell: ({ row }: any) => {
                const m = row.original as MeetingRow;
                return (
                    <div style={{ display: 'flex', gap: 4 }}>
                        {onLogTime && isHeld(m) && !isCancelled(m) && (
                            <button
                                type="button"
                                onClick={() => onLogTime(m)}
                                title={m.loggedMinutes ? 'Edit your logged time' : 'Log your time'}
                                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: m.loggedMinutes ? '#16A34A' : '#B45309' }}
                            >
                                <AppIcon name="bi-stopwatch" className="fs-5" />
                            </button>
                        )}
                        {onEdit && !isCancelled(m) && (
                            <button
                                type="button"
                                onClick={() => onEdit(m)}
                                title="Edit meeting"
                                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#1E3A8A' }}
                            >
                                <AppIcon name="bi-pencil" className="fs-5" />
                            </button>
                        )}
                        {onCancel && (
                            <button
                                type="button"
                                onClick={() => onCancel({ id: m.id, cancelled: !isCancelled(m) })}
                                title={isCancelled(m) ? 'Restore meeting' : 'Cancel meeting'}
                                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: isCancelled(m) ? '#16A34A' : '#B45309' }}
                            >
                                <AppIcon name={isCancelled(m) ? 'bi-arrow-counterclockwise' : 'bi-x-circle'} className="fs-5" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(m.id)}
                                title="Delete meeting"
                                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#DC2626' }}
                            >
                                <AppIcon name="bi-trash" className="fs-5" />
                            </button>
                        )}
                    </div>
                );
            },
        } as MRT_ColumnDef<MeetingRow>] : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [onDelete, onCancel, onEdit, onLogTime, mode, openProject]);

    const pickedList = byDay.get(picked) ?? [];
    const pickedHalves = splitHalves(pickedList, dayjs(picked));
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
        `${dayjs(m.startDate).format('hh:mm A')} – ${dayjs(m.endDate).format('hh:mm A')}`;


    return (
        <div style={{ background: '#fff', border: '1px solid #EEF2F6', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #EEF2F6', flexWrap: 'wrap' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1E3A8A14', color: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <button
                        type="button"
                        onClick={onCreate}
                        style={{
                            border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                            background: '#1E3A8A', color: '#fff', fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
                        }}
                    >
                        <AppIcon name="bi-plus" className="me-1" />New meeting
                    </button>
                )}
            </div>

            {analytics && analytics.totalMeetings > 0 && (
                <>
                    <CostSummary data={analytics} onOpenBreakdown={() => setBreakdownOpen(true)} />
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
                    searchPlaceholder="Search meeting, project, organizer or attendee…"
                />
            ) : (
                <div style={{ padding: 16, fontFamily: 'Inter' }}>
                    {/* ── month bar ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setCursor(cursor.subtract(1, 'month'))} style={navBtn} aria-label="Previous month">
                            <AppIcon name="bi-chevron-left" />
                        </button>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', minWidth: 150 }}>
                            {cursor.format('MMMM YYYY')}
                        </div>
                        <button type="button" onClick={() => setCursor(cursor.add(1, 'month'))} style={navBtn} aria-label="Next month">
                            <AppIcon name="bi-chevron-right" />
                        </button>
                        <button
                            type="button"
                            onClick={() => { setCursor(dayjs().startOf('month')); setPicked(todayKey); }}
                            style={{ ...navBtn, width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 600 }}
                        >
                            Today
                        </button>

                        <div style={{ flex: 1 }} />

                        {/* The three numbers somebody actually schedules against. */}
                        <div style={{ display: 'flex', gap: 16 }}>
                            <Stat label="Meetings" value={monthStats.total} color="#1E3A8A" />
                            <Stat label="Clear days" value={monthStats.clearDays} color="#2563EB" />
                            <Stat label="Part-free days" value={monthStats.partFreeDays} color="#16A34A" />
                        </div>
                    </div>

                    {/* ── weekday header ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* ── the grid ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                        {gridDays.map((d) => {
                            const k = dayKey(d);
                            const list = byDay.get(k) ?? [];
                            const { am, pm } = splitHalves(list, d);
                            const clear = list.length === 0;
                            const outside = d.month() !== cursor.month();
                            const isToday = k === todayKey;
                            const isPicked = k === picked;
                            const halfWord = (n: number, label: string) =>
                                n ? `${label}: ${n} meeting${n > 1 ? 's' : ''}` : `${label}: free`;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => { setPicked(k); setDayOpen(true); }}
                                    // Native HTML5 DnD: the gesture is "put this card on that
                                    // day", which is exactly what dragover/drop model. Guarded on
                                    // onReschedule so read-only surfaces stay read-only.
                                    onDragOver={onReschedule ? (e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                        if (dragOverDay !== k) setDragOverDay(k);
                                    } : undefined}
                                    onDragLeave={onReschedule ? () => {
                                        setDragOverDay((cur) => (cur === k ? null : cur));
                                    } : undefined}
                                    onDrop={onReschedule ? (e) => {
                                        e.preventDefault();
                                        setDragOverDay(null);
                                        const id = e.dataTransfer.getData('text/meeting-id');
                                        const found = meetings.find((mm) => mm.id === id);
                                        if (found) rescheduleTo(found, k);
                                    } : undefined}
                                    title={`${halfWord(am.length, 'Morning')} · ${halfWord(pm.length, 'Afternoon')}`}
                                    style={{
                                        textAlign: 'left', cursor: 'pointer', minHeight: 96, padding: '6px 7px',
                                        borderRadius: 9,
                                        // A wholly clear day still reads grey at a glance; once either
                                        // half is taken the cell goes white and the two bars carry the
                                        // detail, so the background never contradicts them.
                                        background: dragOverDay === k ? '#EFF4FF' : (clear ? '#F1F5F9' : '#FFFFFF'),
                                        // The drop target states itself. Without it a drag across
                                        // a 42-cell grid is a guess about which cell is under the
                                        // cursor.
                                        border: dragOverDay === k
                                            ? '2px dashed #1E3A8A'
                                            : isPicked ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                                        // Days outside the month recede, so the month's own shape is
                                        // still the first thing read.
                                        opacity: outside ? 0.35 : 1,
                                        boxShadow: isToday ? 'inset 0 0 0 2px #16A34A' : 'none',
                                        display: 'flex', flexDirection: 'column', gap: 3,
                                    }}
                                >
                                    {/* Date and halves on ONE line. They were stacked, and the row
                                        the halves occupied was costing two meetings out of every
                                        cell — the date is 12px of text with the whole width beside
                                        it going spare, so the pills sit in it.
                                        Left is the morning, right the afternoon: the order a day is
                                        lived in, so the pair reads without a key once seen. */}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{
                                            fontSize: 12, fontWeight: 800, minWidth: 15,
                                            color: clear ? '#94A3B8' : '#1E293B',
                                        }}>
                                            {d.format('D')}
                                        </span>
                                        <span style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }} aria-hidden>
                                            <HalfPill label="AM" count={am.length} colors={halfColors} />
                                            <HalfPill label="PM" count={pm.length} colors={halfColors} />
                                        </span>
                                    </span>

                                    {list.slice(0, 4).map((m) => (
                                        <span
                                            key={m.id}
                                            draggable={!!onReschedule && !isCancelled(m)}
                                            onDragStart={onReschedule ? (e) => {
                                                e.stopPropagation();
                                                e.dataTransfer.setData('text/meeting-id', m.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                            } : undefined}
                                            // The whole line on hover: a month cell is too narrow to
                                            // hold time, title AND project without clipping, and the
                                            // clipped part is often the project. The time is named
                                            // because dragging changes the DAY and never the clock.
                                            title={onReschedule
                                                ? `${dayjs(m.startDate).format('h:mm A')} ${m.title}${m.projectName ? ` — ${m.projectName}` : ''}\nDrag to another day — the time stays ${dayjs(m.startDate).format('h:mm A')}`
                                                : `${dayjs(m.startDate).format('h:mm A')} ${m.title}${m.projectName ? ` — ${m.projectName}` : ''}`}
                                            style={{
                                                fontSize: 9.5, fontWeight: 600, lineHeight: 1.3,
                                                color: '#1E3A8A', background: '#EFF4FF',
                                                borderRadius: 4, padding: '1px 4px',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                cursor: onReschedule && !isCancelled(m) ? 'grab' : 'inherit',
                                            }}
                                        >
                                            {/* Time, then what it is, then whose it is — and the
                                                project is toned back so the title still wins the
                                                glance. On a project's own tab it is dropped: every
                                                meeting there belongs to that project. */}
                                            <span style={{ fontWeight: 800 }}>{dayjs(m.startDate).format('h:mm A')}</span>
                                            {' '}{m.title}
                                            {mode !== 'project' && m.projectName && (
                                                <span style={{ color: '#7C9BD6', fontWeight: 600 }}> {m.projectName}</span>
                                            )}
                                        </span>
                                    ))}
                                    {list.length > 4 && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                                            +{list.length - 4} more
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <DayDetail
                        dayKeyValue={picked}
                        halves={pickedHalves}
                        open={dayOpen}
                        onClose={() => setDayOpen(false)}
                        timeRange={timeRange}
                        modeCell={modeCell}
                        onDelete={onDelete}
                        onCancel={onCancel}
                        onLogTime={onLogTime ? (m) => { setDayOpen(false); onLogTime(m); } : undefined}
                        onEdit={onEdit ? (m) => { setDayOpen(false); onEdit(m); } : undefined}
                    />

                    {/* ── legend ── */}
                    {/* Four samples spelled out every COMBINATION of two states, which is three
                        more than anyone needs: morning-versus-afternoon is positional and reads
                        itself. Only the states need naming, and there are three. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                        {[
                            { count: 0, label: 'Free' },
                            { count: 1, label: '1 meeting' },
                            { count: 2, label: '2 or more' },
                        ].map((s) => (
                            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#64748B' }}>
                                <span style={{ display: 'inline-flex', width: 30 }}>
                                    <HalfPill label="AM" count={s.count} colors={halfColors} />
                                </span>
                                {s.label}
                            </span>
                        ))}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
                            <span style={{ width: 14, height: 14, borderRadius: 4, background: '#fff', boxShadow: 'inset 0 0 0 2px #16A34A' }} />
                            Today
                        </span>
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
