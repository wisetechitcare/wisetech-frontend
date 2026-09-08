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
 * Guards carried over verbatim from the legacy modal — deliberately, since
 * dropping one silently would be a behaviour regression:
 *   · check-out requires an existing check-in
 *   · the restriction-days window (`restrictAttendanceTo7Days`)
 *   · `validatePreviousDaysAttendance` — earlier gaps must be filled first
 *
 * The last of those costs three requests, so it runs on OPEN, never on paint.
 * Moving it server-side belongs with the rest of the gate work; it is noted,
 * not quietly skipped.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/tw/Glass';
import { WtButton } from '@app/modules/common/components/ui/tw/Buttons';
import { Spinner } from '@app/modules/common/components/ui/tw/Spinner';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { cn } from '@app/modules/common/components/ui/tw/cn';
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
import { MUMBAI_TZ } from '@utils/date';
import { legendLabel, resolveDayVisual, type DayLabelOverrides, type DayToneOverrides, type ModifierToneOverrides } from './dayTokens';
import type { CalendarDay } from './types';
import { AttendanceRequestFields } from '@app/modules/common/components/attendance/AttendanceRequestFields';
import {
    applyKind,
    emptyDraft,
    validateAttendanceRequest,
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

type Mode = 'read' | 'pick' | 'form';
// The kind union and the field rules are shared with the admin raise-for-someone
// modal — see modules/common/components/attendance/attendanceRequest.

export function DayDetailPanel({ day, open, overrides, modifierOverrides, labels, onClose, onSubmitted }: DayDetailPanelProps) {
    const dark = useIsDark();
    const [mode, setMode] = useState<Mode>('read');
    const [draft, setDraft] = useState<AttendanceRequestDraft>(() => emptyDraft('checkin'));
    const kind = draft.kind;
    const time = kind === 'checkin' ? draft.checkIn : draft.checkOut;
    const [methods, setMethods] = useState<Array<{ value: string; label: string }>>([]);
    const [restrictionDays, setRestrictionDays] = useState(1);
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
                // The value migrated from boolean to number; both shapes are still in the wild.
                setRestrictionDays(typeof raw === 'boolean' ? (raw ? 7 : 0) : typeof raw === 'number' && raw >= 0 ? raw : 1);
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
     * A half that is already awaiting approval cannot be raised again.
     *
     * The server merges a second request for the same date into the first, so
     * raising the SAME half twice does not create a duplicate — it silently
     * overwrites the pending one. That is worse than a duplicate: the employee
     * thinks they have filed a second correction and the approver sees only the
     * newer time, with no sign the first was replaced.
     *
     * So the half that is pending is closed, and the OTHER half stays open —
     * which is the case that made merging worth having.
     */
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

    const kindBlocked = (k: RequestKind): string | null => {
        if (k === 'checkin' && pendingCheckInRequest) return 'A check-in correction for this day is already awaiting approval.';
        if (k === 'checkout' && pendingCheckOutRequest) return 'A check-out correction for this day is already awaiting approval.';
        if (k === 'checkout' && !hasCheckIn) return 'There is no check-in yet, so raise that first.';
        return null;
    };

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

    const startCorrection = () => {
        setMode('pick');
        void runGate();
    };

    const pickKind = (k: RequestKind) => {
        if (!withinRestriction) {
            errorConfirmation('You are not allowed to raise an attendance request for this date. Contact admin for assistance.');
            return;
        }
        setDraft(applyKind({ ...draft, checkIn: '', checkOut: '' }, k));
        setAttempted(false);
        setMode('form');
    };

    const submit = async () => {
        if (!day) return;
        setAttempted(true);

        // The SHARED rules — the same ones the admin modal validates against, so
        // the two forms cannot disagree about what a valid request is.
        const problem = validateAttendanceRequest(draft);
        if (problem) return errorConfirmation(problem);

        // This guard stays HERE: it compares against the punch already on the
        // day, which is state the shared validator has no access to.
        const other = kind === 'checkin' ? day.actual.checkOut : day.actual.checkIn;
        if (other) {
            const proposed = dayjs(`${day.date} ${time}`);
            const existing = dayjs(`${day.date} ${other}`);
            if (kind === 'checkin' && proposed.isAfter(existing)) {
                return errorConfirmation(`Check-in (${time}) cannot be after the existing check-out (${other})`);
            }
            if (kind === 'checkout' && proposed.isBefore(existing)) {
                return errorConfirmation(`Check-out (${time}) cannot be before the existing check-in (${other})`);
            }
        }

        setSaving(true);
        try {
            // Composed in the employee's OWN branch timezone, matching how the
            // server buckets the business day.
            const iso = dayjs.tz(`${day.date} ${time}`, 'YYYY-MM-DD HH:mm', tz).toISOString();
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
                ...(kind === 'checkin' ? { checkIn: iso, checkOut: null } : { checkOut: iso }),
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

    return (
        <>
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            header={
                <GlassHeader
                    title={dayjs(day.date).format('dddd, D MMMM YYYY')}
                    subtitle={legendLabel(day.status, labels)}
                    onClose={onClose}
                />
            }
        >
            <div className="flex flex-col gap-4 p-4 sm:p-5">
                {/* ── Record ─────────────────────────────────────────────── */}
                <section className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span
                            className="rounded-2xl border px-2.5 py-[4px] text-[11.5px] font-bold"
                            style={{ backgroundColor: tone.bg, borderColor: tone.bd, color: tone.fg }}
                        >
                            {legendLabel(day.status, labels)}
                        </span>
                        {day.modifiers.map((m) => (
                            <span
                                key={m}
                                className="rounded-2xl border border-slate-200 px-2 py-[3px] text-[11px] font-semibold text-slate-600 dark:border-[#30363d] dark:text-slate-400"
                            >
                                {legendLabel(m, labels)}
                            </span>
                        ))}
                    </div>

                    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
                        {/* The recorded time, and — when a correction is in flight —
                            what it is being asked to become. Showing only "—" beside
                            "Approval pending" left the reader with no way to see what
                            they had actually asked for without leaving the screen. */}
                        <Field
                            k="Check in"
                            v={day.actual.checkIn ?? '—'}
                            hint={
                                requestedCheckIn
                                    ? `requested ${requestedCheckIn}`
                                    : day.expected.checkIn
                                      ? `expected ${day.expected.checkIn}`
                                      : undefined
                            }
                        />
                        <Field
                            k="Check out"
                            v={day.actual.checkOut ?? '—'}
                            hint={
                                requestedCheckOut
                                    ? `requested ${requestedCheckOut}`
                                    : day.expected.checkOut
                                      ? `expected ${day.expected.checkOut}`
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
                    </dl>

                    {day.lateMark?.isLate && (
                        <p className="m-0 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold"
                           style={{ backgroundColor: toneSurface(TRIO.amber, dark).bg, borderColor: toneSurface(TRIO.amber, dark).bd, color: toneSurface(TRIO.amber, dark).fg }}>
                            {day.lateMark.reason}
                            {day.lateMark.lateMinutes > 0 && ` · ${day.lateMark.lateMinutes} min late`}
                        </p>
                    )}
                </section>

                {/* ── Correction ─────────────────────────────────────────── */}
                {day.canRaiseCorrection && (
                    <section className="border-t border-slate-200 pt-3 dark:border-[#30363d]">
                        {mode === 'read' && (
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Hidden rather than disabled once both halves are
                                    spoken for. A disabled control implies "not yet" —
                                    that something you could do would enable it. Nothing
                                    on this screen can: it takes an approver, elsewhere.
                                    So the action goes and the state speaks for itself,
                                    which also stops the eye landing on a grey rectangle
                                    before reading why. */}
                                {nothingLeftToRaise ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-2.5 py-[5px] text-[11.5px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                                        <KTIcon iconName="time" className="fs-7" />
                                        Both times awaiting approval
                                    </span>
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
                            </div>
                        )}

                        {gate.checking && (
                            <p className="m-0 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                                <Spinner size={14} /> Checking earlier days…
                            </p>
                        )}

                        {gate.blocked && !gate.checking && (
                            <p className="m-0 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                                No attendance or request found for {dayjs(gate.blockingDate).format('DD-MM-YYYY')}. Mark
                                attendance or raise a request for that day first.
                            </p>
                        )}

                        {mode === 'pick' && !gate.checking && !gate.blocked && (
                            <div className="flex flex-col gap-2">
                                <p className="m-0 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                                    What would you like to correct?
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {(['checkin', 'checkout'] as const).map((k) => (
                                        <WtButton
                                            key={k}
                                            inverted
                                            disabled={Boolean(kindBlocked(k))}
                                            onClick={() => pickKind(k)}
                                        >
                                            {k === 'checkin' ? 'Check-in' : 'Check-out'}
                                        </WtButton>
                                    ))}
                                </div>

                                {/* One reason per closed option, from the same
                                    predicate that closed it — so a disabled button
                                    can never sit there unexplained. */}
                                {(['checkin', 'checkout'] as const)
                                    .map((k) => kindBlocked(k))
                                    .filter((reason, i, all): reason is string => Boolean(reason) && all.indexOf(reason) === i)
                                    .map((reason) => (
                                        <p
                                            key={reason}
                                            className="m-0 flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400"
                                        >
                                            <KTIcon iconName="information-2" className="fs-7" />
                                            {reason}
                                        </p>
                                    ))}

                                {/* Says what will happen, because "it merged into
                                    the one I already raised" is surprising if you
                                    were expecting a second request. */}
                                {pendingCheckInRequest && !pendingCheckOutRequest && (
                                    <p className="m-0 flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                                        <KTIcon iconName="information-2" className="fs-7" />
                                        A check-out will be added to that same pending request.
                                    </p>
                                )}
                            </div>
                        )}

                        {/**
                         * One way back for the WHOLE pick step, not just the branch that
                         * offers the two buttons.
                         *
                         * The form had a Back and this step had none, so choosing to
                         * correct a day left closing the entire dialog as the only exit,
                         * taking the record you opened it to read with it. The blocked
                         * branch was worse: it explains that an earlier day needs fixing
                         * first and then stranded you on that message.
                         *
                         * Outside the gate conditions on purpose — a step you can enter
                         * is a step you can leave, whatever it happens to be showing.
                         */}
                        {mode === 'pick' && (
                            <div className="flex">
                                <WtButton inverted onClick={() => setMode('read')} startIcon={<KTIcon iconName="arrow-left" className="fs-5" />}>Back</WtButton>
                            </div>
                        )}

                        {mode === 'form' && !gate.blocked && (
                            <div className="flex flex-col gap-3">
                                <p className="m-0 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                                    {kind === 'checkin' ? 'Check-in' : 'Check-out'} correction
                                </p>

                                {/* The SAME fields the admin's raise-for-someone modal
                                    renders. No kind selector here — this flow picks the
                                    kind in the step before, so offering it again would
                                    be a second way to change the same thing. */}
                                <AttendanceRequestFields
                                    value={draft}
                                    onChange={setDraft}
                                    methods={methods}
                                    showErrors={attempted}
                                    disabled={saving}
                                />

                                <div className="flex flex-wrap justify-between gap-2">
                                    <WtButton inverted onClick={() => setMode('pick')} startIcon={<KTIcon iconName="arrow-left" className="fs-5" />}>Back</WtButton>
                                    <WtButton onClick={submit} disabled={saving}>
                                        {saving ? 'Saving…' : 'Submit request'}
                                    </WtButton>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>
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
        <div className="min-w-0">
            <dt className="m-0 text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-400 dark:text-slate-500">{k}</dt>
            <dd className="m-0 truncate text-[13px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {v}
                {hint && <span className="ml-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">{hint}</span>}
            </dd>
        </div>
    );
}

function formatMinutes(m: number | null): string {
    if (m == null || m <= 0) return '—';
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
