/**
 * The day detail — read first, write nested inside.
 *
 * This is the half of the click the legacy calendar never had. There, clicking
 * ANY day went straight to a correction form: a present day, a weekend, a
 * holiday, a future date. Three of those then failed with an error, so the
 * primary affordance for "what happened on this day" was a form that says no.
 *
 * Here the day opens as a record. The correction lives inside it and appears
 * only when the server said the day permits one (`canRaiseCorrection`), so the
 * UI cannot offer an action its own endpoint would reject.
 *
 * The form itself is `AttendanceCorrectionForm`, driven by
 * `useAttendanceCorrection` — the SAME form every other correction screen in the
 * app now renders (the report table, the open-request table, and both admin
 * modals). This panel supplies only what is its own: the record above it, and the
 * way back to that record.
 *
 * The guards all live in that engine now:
 *   · check-out requires a check-in (recorded, or already pending)
 *   · the admin's correction window — read from the server's verdict on the day,
 *     which enforces the same rule on the write. This panel used to fetch
 *     `restrictAttendanceTo7Days` and compute the window itself; the server did
 *     not enforce it at all, so the two could disagree
 *   · `validatePreviousDaysAttendance` — earlier gaps first; three requests, so it
 *     runs on ENTERING the form, never on paint
 */
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { Box, Divider, Stack } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, PlainDialogHeader } from '@app/modules/common/components/ui/glass';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { ToneChip } from '@app/modules/common/components/ui/chips';
import { InlineNotice } from '@app/modules/common/components/ui/InlineNotice';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import type { RootState } from '@redux/store';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import RaiseRequestForEmployee from '../RaiseRequestForEmployee';
import { formatTimeString } from '@utils/date';
import { legendLabel, resolveDayVisual, type DayLabelOverrides, type DayToneOverrides, type ModifierToneOverrides } from './dayTokens';
import type { CalendarDay } from './types';
import { AttendanceCorrectionForm } from '@app/modules/common/components/attendance/AttendanceCorrectionForm';
import { useAttendanceCorrection } from '@app/modules/common/components/attendance/useAttendanceCorrection';
import {
    correctionContextFromDay,
    correctionRefusal,
    nothingLeftToRaise,
} from '@app/modules/common/components/attendance/attendanceRequest';

export interface DayDetailPanelProps {
    day: CalendarDay | null;
    open: boolean;
    overrides?: DayToneOverrides;
    modifierOverrides?: ModifierToneOverrides;
    labels?: DayLabelOverrides;
    onClose: () => void;
    /** Fired after a successful submit so the caller can invalidate its query. */
    onSubmitted?: () => void;
}

type Mode = 'read' | 'form';

export function DayDetailPanel({ day, open, overrides, modifierOverrides, labels, onClose, onSubmitted }: DayDetailPanelProps) {
    const dark = useIsDark();
    const [mode, setMode] = useState<Mode>('read');
    const [adminOpen, setAdminOpen] = useState(false);

    const employeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id) ?? '';

    const visual = day ? resolveDayVisual(day.status, day.modifiers, overrides, day.lateMark?.lateMinutes, modifierOverrides) : null;
    const tone = visual ? toneSurface(visual.trio, dark) : null;

    /* Reset to the read view whenever a different day opens. */
    useEffect(() => {
        if (!open) return;
        setMode('read');
    }, [open, day?.date]);

    /**
     * The shared correction engine, live only while the form is showing — which is
     * when it seeds the draft and runs the earlier-days gate, exactly as entering
     * this panel's form always did.
     */
    const correction = useAttendanceCorrection({
        open: open && mode === 'form',
        date: day?.date ?? '',
        employeeId,
        successMessage: 'Attendance request saved successfully',
        onSaved: () => {
            onSubmitted?.();
            onClose();
        },
    });

    /**
     * The same day-context rules the form uses, read here for the RECORD view:
     * whether to offer the action at all, and what to say when not.
     */
    const context = correctionContextFromDay(day);
    const pending = day?.request?.status === 'pending';

    /**
     * The times a PENDING correction is asking for, shown beside the recorded ones.
     * Only while pending: once approved they become the recorded time, and once
     * rejected they are not what anyone should read off this row.
     */
    const requestedCheckIn = pending ? (day?.request?.checkIn ?? null) : null;
    const requestedCheckOut = pending ? (day?.request?.checkOut ?? null) : null;

    /**
     * A closed WINDOW is explained; other refusals (a future day, a leave day) simply
     * offer no action, as this panel always has. The window used to be computed here
     * from a config fetch — it is now the server's verdict, the same one the write
     * enforces.
     */
    const windowClosed = day?.correctionRefusedReason === 'outside_window';
    const windowReason = windowClosed ? correctionRefusal(day, (iso) => dayjs(iso).format('D MMM YYYY')) : null;

    // The same gate the legacy calendar used for its "Raise Request for Another
    // Employee" button, carried over so the admin path survives its deletion.
    const canRaiseForOthers = hasPermission(
        resourceNameMapWithCamelCase.attendanceRequest,
        permissionConstToUseWithHasPermission.editOthers,
    );

    if (!day || !visual || !tone) return null;

    return (
        <>
            {/**
             * `plain`, not frosted. Glass reads well over a dashboard; over a
             * column of inputs it shows the calendar through the surface a
             * person is trying to read. Same dialog, same scroll region and
             * phone full-screen — the blur turned off.
             */}
            <GlassDialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                plain
                header={
                    <PlainDialogHeader
                        title={dayjs(day.date).format('dddd, D MMMM YYYY')}
                        subtitle={legendLabel(day.status, labels)}
                        onClose={onClose}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* ── Record ─────────────────────────────────────────── */}
                    <Stack spacing={1.25}>
                        <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                            <ToneChip color={visual.trio.c} label={legendLabel(day.status, labels)} />
                            {day.modifiers.map((m) => (
                                <ToneChip key={m} tone="neutral" label={legendLabel(m, labels)} />
                            ))}
                        </Stack>

                        <Box
                            component="dl"
                            sx={{
                                m: 0,
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                                columnGap: 2,
                                rowGap: 1.25,
                            }}
                        >
                            {/* The recorded time, and — when a correction is in flight —
                                what it is being asked to become. Showing only "—" beside
                                "Approval pending" left the reader with no way to see what
                                they had actually asked for without leaving the screen.

                                Every time on this row goes through `formatTimeString`, so
                                it follows the app-wide 12/24h setting. The server always
                                sends 24h, and printing that raw put "18:51" beside a
                                picker showing "6:51 PM" — the same instant, twice, in two
                                notations. */}
                            <Field
                                k="Check in"
                                v={formatTimeString(day.actual.checkIn, '—')}
                                hint={
                                    requestedCheckIn
                                        ? `requested ${formatTimeString(requestedCheckIn)}`
                                        : day.expected.checkIn
                                          ? `expected ${formatTimeString(day.expected.checkIn)}`
                                          : undefined
                                }
                            />
                            <Field
                                k="Check out"
                                v={formatTimeString(day.actual.checkOut, '—')}
                                hint={
                                    requestedCheckOut
                                        ? `requested ${formatTimeString(requestedCheckOut)}`
                                        : day.expected.checkOut
                                          ? `expected ${formatTimeString(day.expected.checkOut)}`
                                          : undefined
                                }
                            />
                            <Field k="Duration" v={formatMinutes(day.actual.minutesWorked)} />
                            <Field k="Work mode" v={day.workMode ?? '—'} />
                            {day.leave && (
                                <Field
                                    k="Leave"
                                    v={`${day.leave.type} · ${day.leave.fraction === 0.5 ? 'half day' : 'full day'}`}
                                />
                            )}
                            {day.holiday && <Field k="Holiday" v={day.holiday.name} />}
                            {/* Names both halves when the request carries both — calling a
                                check-in-and-check-out request "Check-in" is what made it look
                                like the check-out was still free to raise. */}
                            {day.request && (
                                <Field
                                    k="Correction"
                                    v={`${
                                        day.request.kind === 'both'
                                            ? 'Check-in & check-out'
                                            : day.request.kind === 'check_in'
                                              ? 'Check-in'
                                              : 'Check-out'
                                    } · ${day.request.status}`}
                                />
                            )}
                        </Box>

                        {day.lateMark?.isLate && (
                            <InlineNotice>
                                {day.lateMark.reason}
                                {day.lateMark.lateMinutes > 0 && ` · ${day.lateMark.lateMinutes} min late`}
                            </InlineNotice>
                        )}
                    </Stack>

                    {/* ── Correction ─────────────────────────────────────── */}
                    {(day.canRaiseCorrection || windowClosed) && (
                        <>
                            <Divider />

                            {mode === 'read' && (
                                <Stack spacing={1}>
                                    {windowReason && <InlineNotice icon="lock-2">{windowReason}</InlineNotice>}
                                    <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                                        {/* Hidden rather than disabled once both halves are
                                            spoken for. A disabled control implies "not yet" —
                                            that something you could do would enable it. Nothing
                                            on this screen can: it takes an approver, elsewhere. */}
                                        {day.canRaiseCorrection &&
                                            (nothingLeftToRaise(context) ? (
                                                <ToneChip
                                                    tone="warning"
                                                    icon={<KTIcon iconName="time" className="fs-7" />}
                                                    label="Both times awaiting approval"
                                                />
                                            ) : (
                                                <WtButton onClick={() => setMode('form')}>Raise a Request</WtButton>
                                            ))}
                                        {/* Carried over from the legacy calendar rather than lost with it:
                                            admins could raise a request on someone else's behalf from the
                                            day they clicked. Same permission gate, same modal. */}
                                        {canRaiseForOthers && (
                                            <WtButton inverted onClick={() => setAdminOpen(true)}>
                                                Raise for another employee
                                            </WtButton>
                                        )}
                                    </Stack>
                                </Stack>
                            )}

                            {mode === 'form' && (
                                <AttendanceCorrectionForm correction={correction} onBack={() => setMode('read')} />
                            )}
                        </>
                    )}
                </Box>
            </GlassDialog>

            {/* Admin path, preserved from the legacy calendar. A sibling of the
                dialog rather than a child, so closing the day panel does not
                unmount it mid-flow. */}
            <RaiseRequestForEmployee
                show={adminOpen}
                onHide={() => setAdminOpen(false)}
                selectedDate={day.date}
            />
        </>
    );
}

function Field({ k, v, hint }: { k: string; v: string; hint?: string }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Box component="dt" sx={{ m: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'text.disabled' }}>
                {k}
            </Box>
            <Box
                component="dd"
                sx={{
                    m: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {v}
                {hint && (
                    <Box component="span" sx={{ ml: 0.75, fontSize: 11, fontWeight: 500, color: 'text.disabled' }}>
                        {hint}
                    </Box>
                )}
            </Box>
        </Box>
    );
}

function formatMinutes(m: number | null): string {
    if (m == null || m <= 0) return '—';
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
