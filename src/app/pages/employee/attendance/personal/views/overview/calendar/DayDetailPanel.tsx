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
 * ONE correction screen, not two. Choosing what to correct used to be a step of
 * its own, so switching from "Check-in" to "Both" after seeing the times meant
 * going backwards. The choice now sits at the top of the form itself, which is
 * how the admin's raise-for-someone modal has always worked.
 *
 * Guards carried over verbatim from the legacy modal — deliberately, since
 * dropping one silently would be a behaviour regression:
 *   · check-out requires an existing check-in
 *   · the restriction-days window (`restrictAttendanceTo7Days`)
 *   · `validatePreviousDaysAttendance` — earlier gaps must be filled first
 *
 * The last of those costs three requests, so it runs on ENTERING the form,
 * never on paint. Moving it server-side belongs with the rest of the gate work;
 * it is noted, not quietly skipped.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, PlainDialogHeader } from '@app/modules/common/components/ui/glass';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { ToneChip } from '@app/modules/common/components/ui/chips';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import type { RootState } from '@redux/store';
import { createUpdateAttendanceRequest } from '@services/employee';
import { fetchWorkingMethods } from '@services/options';
import { fetchConfiguration } from '@services/company';
import { RESTRICT_ATTENDANCE_TO_7_DAYS_KEY } from '@constants/configurations-key';
import { safeJsonParse } from '@utils/safeJson';
import { parseWorkingDays } from '@utils/workingDays';
import { validatePreviousDaysAttendance } from '@utils/attendanceValidation';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import RaiseRequestForEmployee from '../RaiseRequestForEmployee';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { MUMBAI_TZ, formatTimeString } from '@utils/date';
import { legendLabel, resolveDayVisual, type DayLabelOverrides, type DayToneOverrides, type ModifierToneOverrides } from './dayTokens';
import type { CalendarDay } from './types';
import { AttendanceRequestFields } from '@app/modules/common/components/attendance/AttendanceRequestFields';
import {
    emptyDraft,
    seedDraft,
    validateAttendanceRequest,
    wantsCheckIn,
    wantsCheckOut,
    type AttendanceRequestDraft,
    type RequestKind,
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

/** Offered in this order: correcting ONE punch is the common case. */
const KINDS = ['checkin', 'checkout', 'both'] as const;

// The kind union and the field rules are shared with the admin raise-for-someone
// modal — see modules/common/components/attendance/attendanceRequest.

export function DayDetailPanel({ day, open, overrides, modifierOverrides, labels, onClose, onSubmitted }: DayDetailPanelProps) {
    const dark = useIsDark();
    const [mode, setMode] = useState<Mode>('read');
    const [draft, setDraft] = useState<AttendanceRequestDraft>(() => emptyDraft('checkin'));
    const kind = draft.kind;
    const time = kind === 'checkin' ? draft.checkIn : draft.checkOut;
    const [methods, setMethods] = useState<Array<{ value: string; label: string }>>([]);
    /**
     * 0 = any day. The window RESTRICTS only when an admin has set one.
     *
     * This started at 1 — today only — which closed the gate before the config
     * had even loaded, so opening a day quickly enough refused a correction
     * whatever the policy said. Combined with the parse fallback below it meant
     * an unconfigured company could not correct yesterday at all.
     *
     * The server accepts a correction for ANY date, so defaulting closed also
     * made the browser stricter than the API it talks to — a rule with no
     * enforcement behind it, applied only to the people using the UI.
     */
    const [restrictionDays, setRestrictionDays] = useState(0);
    const [gate, setGate] = useState<{ checking: boolean; blocked: boolean; blockingDate: string }>({
        checking: false, blocked: false, blockingDate: '',
    });
    const [saving, setSaving] = useState(false);
    /** Errors stay quiet until a submit is attempted — a form that is red before
        you have typed anything is scolding, not helping. */
    const [attempted, setAttempted] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);

    const employee = useSelector((s: RootState) => s.employee?.currentEmployee);
    const employeeId = employee?.id ?? '';
    const companyId = employee?.companyId ?? '';
    const tz = employee?.branches?.timezone || MUMBAI_TZ;

    const visual = day ? resolveDayVisual(day.status, day.modifiers, overrides, day.lateMark?.lateMinutes, modifierOverrides) : null;
    const tone = visual ? toneSurface(visual.trio, dark) : null;

    /* Reset to the read view whenever a different day opens. */
    useEffect(() => {
        if (!open) return;
        setMode('read');
        setDraft(emptyDraft('checkin'));
        setAttempted(false);
        setGate({ checking: false, blocked: false, blockingDate: '' });
    }, [open, day?.date]);

    /* Working methods + the restriction window. Loaded once, on first open. */
    useEffect(() => {
        if (!open || methods.length) return;
        (async () => {
            try {
                const { data: { workingMethods } } = await fetchWorkingMethods();
                setMethods((workingMethods ?? []).map((m: { id: string; type: string }) => ({ value: m.id, label: m.type })));
            } catch {
                /* The dropdown stays empty and the form blocks on it — better than a silent wrong value. */
            }
            try {
                const res = await fetchConfiguration(RESTRICT_ATTENDANCE_TO_7_DAYS_KEY);
                const parsed = safeJsonParse(res?.data?.configuration?.configuration || '{}');
                const raw = parsed?.[RESTRICT_ATTENDANCE_TO_7_DAYS_KEY];
                // The value migrated from boolean to number; both shapes are still
                // in the wild. Anything else means "not configured" and allows any
                // day — the same answer the `catch` below already gave, which is
                // the contradiction this fixes: a fetch ERROR failed open while an
                // unrecognised VALUE failed closed.
                setRestrictionDays(typeof raw === 'boolean' ? (raw ? 7 : 0) : typeof raw === 'number' && raw >= 0 ? raw : 0);
            } catch {
                setRestrictionDays(0); // fail open, matching the legacy fallback
            }
        })();
    }, [open, methods.length]);

    const withinRestriction = useMemo(() => {
        if (!day || !restrictionDays || restrictionDays <= 0) return true;
        return dayjs().diff(dayjs(day.date), 'day') <= restrictionDays - 1;
    }, [day, restrictionDays]);

    /**
     * A PENDING check-in request counts as a check-in for this gate.
     *
     * The rule is "you cannot ask to correct a check-out with no check-in to
     * anchor it", and a raised-but-unapproved check-in satisfies that just as
     * well as a punch does. Reading only `actual.checkIn` meant someone who
     * forgot both punches had to raise the check-in, wait for an approver, and
     * come back for the check-out — two round trips for one forgotten day.
     *
     * The server was already built for it: `saveAttendanceRequest` finds an
     * existing request for the same date and MERGES the missing half into it,
     * so the second raise completes the pending correction rather than
     * competing with it.
     */
    // Read the HALVES, not the label: a request carrying both used to report
    // `check_in`, so the check-out half looked free and could be overwritten.
    const pending = day?.request?.status === 'pending';
    const pendingCheckInRequest = Boolean(pending && day?.request?.hasCheckIn);
    const pendingCheckOutRequest = Boolean(pending && day?.request?.hasCheckOut);
    const hasCheckIn = Boolean(day?.actual.checkIn) || pendingCheckInRequest;

    /**
     * The times a PENDING correction is asking for, shown beside the recorded
     * ones. Only while pending: once approved they become the recorded time, and
     * once rejected they are not what anyone should read off this row.
     */
    const requestedCheckIn = pending ? (day?.request?.checkIn ?? null) : null;
    const requestedCheckOut = pending ? (day?.request?.checkOut ?? null) : null;

    /**
     * Nothing left to raise — both halves are already awaiting approval.
     *
     * Not the same as "a request exists": a pending check-in with no check-out
     * still leaves the check-out worth raising, which is the case the server's
     * merge exists for. Only when both are spoken for does the action have
     * nothing to do, and then it says so rather than opening a form that would
     * close every option.
     */
    const nothingLeftToRaise = pendingCheckInRequest && pendingCheckOutRequest;

    /**
     * Why the raise action is unavailable, or null when it is available.
     *
     * Decided at the ENTRY POINT. The restriction window used to be checked only
     * when a kind was clicked, so someone opened the day, pressed Raise a
     * Request, chose Check-in, and only then met "you are not allowed to raise
     * an attendance request for this date" — three steps in before being told
     * no. That is precisely the failure this panel was built to remove: the
     * legacy calendar's primary affordance was a form that says no.
     *
     * The window is stated as a rule rather than as "contact admin", because
     * the rule is knowable and the admin cannot change it per-request anyway.
     */
    const raiseBlockedReason: string | null = nothingLeftToRaise
        ? 'Both times awaiting approval'
        : !withinRestriction
          ? restrictionDays === 1
              ? 'Corrections can only be raised on the day itself'
              : `Corrections close ${restrictionDays} days after the date`
          : null;

    /**
     * Why a kind is closed, or null when it is open.
     *
     * Handed to the shared fields as-is, so the segment that is greyed and the
     * sentence explaining it come from one predicate rather than two.
     */
    const kindBlocked = useCallback((k: RequestKind): string | null => {
        if (k === 'checkin' && pendingCheckInRequest) return 'A check-in correction for this day is already awaiting approval.';
        if (k === 'checkout' && pendingCheckOutRequest) return 'A check-out correction for this day is already awaiting approval.';
        if (k === 'checkout' && !hasCheckIn) return 'There is no check-in yet, so raise that first.';
        // `both` supplies its own check-in, so the "raise that first" rule does
        // not apply to it — but either half already awaiting approval means one
        // of the two times it carries would land on top of a pending one.
        if (k === 'both' && (pendingCheckInRequest || pendingCheckOutRequest)) {
            return 'Part of this day is already awaiting approval, so raise the other half on its own.';
        }
        return null;
    }, [pendingCheckInRequest, pendingCheckOutRequest, hasCheckIn]);

    // The same gate the legacy calendar used for its "Raise Request for Another
    // Employee" button, carried over so the admin path survives its deletion.
    const canRaiseForOthers = hasPermission(
        resourceNameMapWithCamelCase.attendanceRequest,
        permissionConstToUseWithHasPermission.editOthers,
    );

    /** The "earlier gaps first" rule — three requests, so only on entering the flow. */
    const runGate = useCallback(async () => {
        if (!day || !employeeId) return;
        setGate({ checking: true, blocked: false, blockingDate: '' });
        try {
            const result = await validatePreviousDaysAttendance({
                employeeId,
                selectedDate: day.date,
                dateOfJoining: String(employee?.dateOfJoining ?? ''),
                workingAndOfDays: parseWorkingDays(employee?.branches?.workingAndOffDays) || {},
                offDaysForTheBranch: [],
            });
            setGate({ checking: false, blocked: !result.canRaiseRequest, blockingDate: result.blockingDate });
        } catch {
            // Fail open, exactly as the legacy modal does — a validation
            // outage must not lock people out of correcting their attendance.
            setGate({ checking: false, blocked: false, blockingDate: '' });
        }
    }, [day, employeeId, employee?.dateOfJoining, employee?.branches?.workingAndOffDays]);

    /**
     * Open on what is being CORRECTED, not on an empty field.
     *
     * The rule itself is `seedDraft`, shared with the admin's raise-for-someone
     * modal — this only supplies the record it reads. Re-run on every kind
     * change, not just on entry: switching to "Both" has to fill in the half the
     * previous kind had cleared.
     */
    const seed = useCallback(
        (base: AttendanceRequestDraft, k: RequestKind): AttendanceRequestDraft =>
            seedDraft(base, k, day ? { ...day.actual, workMode: day.workMode } : null, methods),
        [day, methods],
    );

    const startCorrection = () => {
        // Open on a kind that can actually be chosen. Landing on a closed
        // segment would show a form whose own selector says it is unavailable.
        const first = KINDS.find((k) => !kindBlocked(k)) ?? 'checkin';
        setDraft((d) => seed(d, first));
        setAttempted(false);
        setMode('form');
        void runGate();
    };

    /**
     * Kind changes re-seed; every other edit passes straight through.
     *
     * The shared fields already call `applyKind`, which clears the times the new
     * kind does not want. What it cannot do is REFILL from the day's record —
     * that is state it has never been given — so the caller finishes the job.
     */
    const onDraftChange = (next: AttendanceRequestDraft) => {
        setDraft(next.kind === draft.kind ? next : seed(next, next.kind));
    };

    const submit = async () => {
        if (!day) return;
        setAttempted(true);

        // The SHARED rules — the same ones the admin modal validates against, so
        // the two forms cannot disagree about what a valid request is.
        const problem = validateAttendanceRequest(draft);
        if (problem) return errorConfirmation(problem);

        /**
         * This guard stays HERE: it compares against the punch already on the
         * day, which is state the shared validator has no access to.
         *
         * Skipped for `both`, which carries its own pair — the shared validator
         * already orders those two against each other, and there is no third
         * time on the day to sit them beside.
         */
        const other = kind === 'both' ? null : kind === 'checkin' ? day.actual.checkOut : day.actual.checkIn;
        if (other) {
            const proposed = dayjs(`${day.date} ${time}`);
            const existing = dayjs(`${day.date} ${other}`);
            // Read back in the viewer's own 12/24h setting — quoting a 24h time
            // at someone whose screen is showing 12h reads as a third value.
            if (kind === 'checkin' && proposed.isAfter(existing)) {
                return errorConfirmation(
                    `Check-in (${formatTimeString(time)}) cannot be after the existing check-out (${formatTimeString(other)})`,
                );
            }
            if (kind === 'checkout' && proposed.isBefore(existing)) {
                return errorConfirmation(
                    `Check-out (${formatTimeString(time)}) cannot be before the existing check-in (${formatTimeString(other)})`,
                );
            }
        }

        setSaving(true);
        try {
            // Composed in the employee's OWN branch timezone, matching how the
            // server buckets the business day.
            const at = (hhmm: string) =>
                dayjs.tz(`${day.date} ${hhmm}`, 'YYYY-MM-DD HH:mm', tz).toISOString();
            await createUpdateAttendanceRequest({
                employeeId,
                // REQUIRED. `AttendanceRequests.companyId` is non-nullable with a
                // relation, and the handler spreads the request body straight into
                // `prisma.create`, so omitting it throws before anything is written —
                // a 500 the form could only report as "please try again later".
                // It only surfaced on a day with no existing request: a date that
                // already had one takes the update path, where the column is set.
                companyId,
                workingMethodId: draft.workingMethodId,
                remarks: draft.remarks.trim(),
                latitude: 0,
                longitude: 0,
                status: 0,
                // Driven by the kind, so `both` sends two times and each of the
                // one-sided kinds sends only its own — the half it omits is left
                // untouched by the server's same-date merge rather than nulled.
                ...(wantsCheckIn(draft.kind) ? { checkIn: at(draft.checkIn) } : {}),
                ...(wantsCheckOut(draft.kind) ? { checkOut: at(draft.checkOut) } : {}),
            } as never);
            successConfirmation('Attendance request saved successfully');
            onSubmitted?.();
            onClose();
        } catch {
            errorConfirmation('Attendance request failed. Please try again later.');
        } finally {
            setSaving(false);
        }
    };

    if (!day || !visual || !tone) return null;

    const amber = toneSurface(TRIO.amber, dark);

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
                            <Notice tone={amber}>
                                {day.lateMark.reason}
                                {day.lateMark.lateMinutes > 0 && ` · ${day.lateMark.lateMinutes} min late`}
                            </Notice>
                        )}
                    </Stack>

                    {/* ── Correction ─────────────────────────────────────── */}
                    {day.canRaiseCorrection && (
                        <>
                            <Divider />

                            {mode === 'read' && (
                                <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
                                    {/* Hidden rather than disabled once both halves are
                                        spoken for. A disabled control implies "not yet" —
                                        that something you could do would enable it. Nothing
                                        on this screen can: it takes an approver, elsewhere.
                                        So the action goes and the state speaks for itself,
                                        which also stops the eye landing on a grey rectangle
                                        before reading why. */}
                                    {raiseBlockedReason ? (
                                        <ToneChip
                                            tone="warning"
                                            icon={<KTIcon iconName="time" className="fs-7" />}
                                            label={raiseBlockedReason}
                                        />
                                    ) : (
                                        <WtButton onClick={startCorrection}>Raise a Request</WtButton>
                                    )}
                                    {/* Carried over from the legacy calendar rather than lost with it:
                                        admins could raise a request on someone else's behalf from the
                                        day they clicked. Same permission gate, same modal. */}
                                    {canRaiseForOthers && (
                                        <WtButton inverted onClick={() => setAdminOpen(true)}>
                                            Raise for another employee
                                        </WtButton>
                                    )}
                                </Stack>
                            )}

                            {mode === 'form' && (
                                <Stack spacing={1.5}>
                                    {gate.checking && (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <CircularProgress size={14} />
                                            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                                                Checking earlier days…
                                            </Typography>
                                        </Stack>
                                    )}

                                    {gate.blocked && !gate.checking && (
                                        <Notice tone={amber}>
                                            No attendance or request found for{' '}
                                            {dayjs(gate.blockingDate).format('DD-MM-YYYY')}. Mark attendance or
                                            raise a request for that day first.
                                        </Notice>
                                    )}

                                    {!gate.blocked && (
                                        <>
                                            {/* The SAME fields the admin's raise-for-someone modal
                                                renders, now including the kind selector — one screen,
                                                so changing your mind about what you are correcting
                                                does not mean going back a step. */}
                                            <AttendanceRequestFields
                                                value={draft}
                                                onChange={onDraftChange}
                                                methods={methods}
                                                kinds={KINDS}
                                                kindDisabled={kindBlocked}
                                                showErrors={attempted}
                                                disabled={saving}
                                            />

                                            {/* One reason per closed option, from the same
                                                predicate that closed it — so a greyed segment
                                                can never sit there unexplained.

                                                `both` is left out on purpose. It only ever
                                                closes because one of the halves is pending,
                                                which the half's own line already says, so
                                                listing it too would state the same fact
                                                twice. Its segment still carries the reason
                                                on hover. */}
                                            {(['checkin', 'checkout'] as const)
                                                .map((k) => kindBlocked(k))
                                                .filter((r, i, all): r is string => Boolean(r) && all.indexOf(r) === i)
                                                .map((reason) => (
                                                    <Hint key={reason}>{reason}</Hint>
                                                ))}

                                            {/* Says what will happen, because "it merged into
                                                the one I already raised" is surprising if you
                                                were expecting a second request. */}
                                            {pendingCheckInRequest && !pendingCheckOutRequest && (
                                                <Hint>A check-out will be added to that same pending request.</Hint>
                                            )}
                                        </>
                                    )}

                                    {/**
                                     * One way back, whatever the form happens to be showing.
                                     *
                                     * Outside the gate conditions on purpose: the blocked
                                     * branch explains that an earlier day needs fixing first,
                                     * and without this it stranded you on that message with
                                     * closing the whole dialog as the only exit — taking the
                                     * record you opened it to read with it.
                                     */}
                                    <Stack direction="row" flexWrap="wrap" justifyContent="space-between" gap={1}>
                                        <WtButton
                                            inverted
                                            onClick={() => setMode('read')}
                                            startIcon={<KTIcon iconName="arrow-left" className="fs-5" />}
                                        >
                                            Back
                                        </WtButton>
                                        {!gate.blocked && (
                                            <WtButton onClick={submit} disabled={saving}>
                                                {saving ? 'Saving…' : 'Submit request'}
                                            </WtButton>
                                        )}
                                    </Stack>
                                </Stack>
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

/** A tinted line of explanation. One shape for every warning on this screen. */
function Notice({ tone, children }: { tone: { bg: string; bd: string; fg: string }; children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                m: 0,
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                border: `1px solid ${tone.bd}`,
                bgcolor: tone.bg,
                color: tone.fg,
                fontSize: 12,
                fontWeight: 600,
            }}
        >
            {children}
        </Typography>
    );
}

/** Quiet guidance — never an error, so it never borrows the error colour. */
function Hint({ children }: { children: React.ReactNode }) {
    return (
        <Stack direction="row" spacing={0.75} alignItems="flex-start">
            <KTIcon iconName="information-2" className="fs-7" />
            <Typography sx={{ fontSize: 11.5, lineHeight: 1.45, color: 'text.secondary' }}>{children}</Typography>
        </Stack>
    );
}

function formatMinutes(m: number | null): string {
    if (m == null || m <= 0) return '—';
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
