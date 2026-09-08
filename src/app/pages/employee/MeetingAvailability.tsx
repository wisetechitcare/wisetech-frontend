import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { getMeetingsByEmployee } from '@services/employee';

/**
 * Everyone's day, beside the form that is filling it.
 *
 * ─── WHY IT SITS NEXT TO THE FIELDS AND NOT BEHIND A BUTTON ──────────────────
 * The question a scheduling form has to answer is "can these people actually make it", and the
 * answer changes with every edit to the time or the roster. A "check availability" button would
 * be asked once, before the last change. Rendering the day live means the clash is visible at
 * the moment it is created, not after the invite goes out.
 *
 * ─── ONE REQUEST PER PARTICIPANT, CACHED ─────────────────────────────────────
 * `getMeetingsByEmployee` is what exists, so a roster of eleven is eleven calls. They are cached
 * by employee id for the life of the dialog, so adding a twelfth person costs ONE request rather
 * than twelve, and dragging the time costs none — the day is already in hand and the overlap is
 * recomputed locally.
 *
 * A batch endpoint (ids + window → busy blocks) is the right shape for this and would collapse
 * it to a single call; this is deliberately built so that swap is a change to `loadFor` alone.
 */

export interface MeetingAvailabilityProps {
    /** Internal participants, by employee id. */
    participantIds: string[];
    /** Employee id → display name, for labelling the blocks. */
    nameById: Record<string, { name: string; avatar: string | null }>;
    /** The meeting being scheduled, so it can be drawn among the rest. */
    startIso: string;
    endIso: string;
    /** Excluded from clash detection when editing an existing meeting. */
    ignoreMeetingId?: string;
}

interface Busy { id: string; who: string; title: string; start: Dayjs; end: Dayjs }

/** The window the day is drawn over. Widened to hold anything outside it. */
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 20;
const ROW_H = 34;

const overlaps = (aS: Dayjs, aE: Dayjs, bS: Dayjs, bE: Dayjs) => aS.isBefore(bE) && bS.isBefore(aE);

export default function MeetingAvailability({
    participantIds, nameById, startIso, endIso, ignoreMeetingId,
}: MeetingAvailabilityProps) {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const [busy, setBusy] = useState<Busy[]>([]);
    const [loading, setLoading] = useState(false);
    // employeeId → their meetings, so a roster change never refetches what is already held.
    const cache = useRef<Map<string, any[]>>(new Map());

    useEffect(() => {
        let cancelled = false;
        const missing = participantIds.filter((id) => !cache.current.has(id));
        if (!missing.length) { rebuild(); return; }

        setLoading(true);
        Promise.all(missing.map((id) =>
            getMeetingsByEmployee(id)
                .then((res: any) => cache.current.set(id, res?.data?.meetings || res?.meetings || []))
                .catch(() => cache.current.set(id, [])),
        )).finally(() => {
            if (cancelled) return;
            setLoading(false);
            rebuild();
        });

        function rebuild() {
            if (cancelled) return;
            const day = dayjs(startIso);
            const rows: Busy[] = [];
            const seen = new Set<string>();
            for (const id of participantIds) {
                for (const m of cache.current.get(id) || []) {
                    if (!m?.startDate || !m?.endDate) continue;
                    if (ignoreMeetingId && m.id === ignoreMeetingId) continue;
                    const s = dayjs(m.startDate);
                    if (!s.isSame(day, 'day')) continue;
                    // One row per person per meeting — a meeting both of them are on is two
                    // rows, because the clash is about the PEOPLE, not the calendar entry.
                    const key = `${id}:${m.id}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    rows.push({
                        id: key,
                        who: nameById[id]?.name || 'Someone',
                        title: m.title || 'Busy',
                        start: s,
                        end: dayjs(m.endDate),
                    });
                }
            }
            setBusy(rows);
        }

        return () => { cancelled = true; };
    }, [participantIds, startIso, nameById, ignoreMeetingId]);

    const meStart = dayjs(startIso);
    const meEnd = dayjs(endIso);

    /** Whoever this meeting would double-book. */
    const clashes = useMemo(
        () => busy.filter((b) => overlaps(meStart, meEnd, b.start, b.end)),
        [busy, startIso, endIso],
    );

    /**
     * Start times, on the half hour, where NOBODY is busy for the meeting's whole length.
     * Three is enough to be useful; a list of every free slot is a second problem to read.
     */
    const freeAt = useMemo(() => {
        const mins = Math.max(meEnd.diff(meStart, 'minute'), 15);
        const day = meStart.startOf('day');
        const out: string[] = [];
        for (let m = DAY_START_HOUR * 60; m + mins <= DAY_END_HOUR * 60 && out.length < 3; m += 30) {
            const s = day.add(m, 'minute');
            if (s.isBefore(dayjs())) continue;
            if (busy.some((b) => overlaps(s, s.add(mins, 'minute'), b.start, b.end))) continue;
            if (overlaps(s, s.add(mins, 'minute'), meStart, meEnd)) continue;
            out.push(s.format('HH:mm'));
        }
        return out;
    }, [busy, startIso, endIso]);

    const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
    const topFor = (t: Dayjs) => ((t.hour() + t.minute() / 60) - DAY_START_HOUR) * ROW_H;
    const heightFor = (s: Dayjs, e: Dayjs) => Math.max((e.diff(s, 'minute') / 60) * ROW_H, 18);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: 'text.primary' }}>
                    {meStart.format('ddd D MMM')} · everyone’s day
                </Typography>
                {loading && <CircularProgress size={13} />}
            </Stack>

            <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                <Box sx={{ position: 'relative', height: hours.length * ROW_H }}>
                    {hours.map((h, i) => (
                        <Box
                            key={h}
                            sx={{
                                position: 'absolute', left: 0, right: 0, top: i * ROW_H, height: ROW_H,
                                borderTop: '1px solid', borderColor: 'divider',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ position: 'absolute', left: 0, top: -8, color: 'text.secondary', fontSize: 11 }}
                            >
                                {String(h).padStart(2, '0')}:00
                            </Typography>
                        </Box>
                    ))}

                    {/* This meeting, drawn among the rest rather than described above them. */}
                    <Box
                        sx={{
                            position: 'absolute', left: 46, right: 6,
                            top: topFor(meStart), height: heightFor(meStart, meEnd),
                            borderRadius: 1, px: 1, display: 'flex', alignItems: 'center',
                            bgcolor: alpha(theme.palette.primary.main, dark ? 0.4 : 0.22),
                            border: `1px solid ${theme.palette.primary.main}`,
                            fontSize: 11.5, fontWeight: 600, color: 'text.primary', zIndex: 2,
                        }}
                    >
                        This meeting · {meStart.format('HH:mm')}–{meEnd.format('HH:mm')}
                    </Box>

                    {busy.map((b) => {
                        const clash = overlaps(meStart, meEnd, b.start, b.end);
                        const c = clash ? theme.palette.error.main : theme.palette.text.disabled;
                        return (
                            <Tooltip key={b.id} title={`${b.who} · ${b.title}`}>
                                <Box
                                    sx={{
                                        position: 'absolute', left: 58, right: 0,
                                        top: topFor(b.start), height: heightFor(b.start, b.end),
                                        borderRadius: 1, px: 1, display: 'flex', alignItems: 'center',
                                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                        bgcolor: clash ? alpha(c, dark ? 0.3 : 0.14) : 'background.paper',
                                        border: `1px solid ${clash ? c : theme.palette.divider}`,
                                        color: clash ? c : 'text.secondary',
                                        fontSize: 11.5, zIndex: clash ? 3 : 1,
                                    }}
                                >
                                    {b.who} · {b.title}
                                </Box>
                            </Tooltip>
                        );
                    })}
                </Box>
            </Box>

            <Box sx={{ pt: 1.5, mt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                {clashes.length > 0 && (
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'error.main', mb: 1 }}>
                        {new Set(clashes.map((c) => c.who)).size} participant
                        {new Set(clashes.map((c) => c.who)).size === 1 ? ' has' : 's have'} a conflict
                    </Typography>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    {participantIds.length ? 'Everyone free at' : 'Add participants to see their day'}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {freeAt.map((t) => (
                        <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    ))}
                    {participantIds.length > 0 && freeAt.length === 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            No free slot left today
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
