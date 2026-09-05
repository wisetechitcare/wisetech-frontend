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
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { WtSelect } from '@app/modules/common/components/ui/WtSelect';
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
import { STATUS_LABEL, MODIFIER_LABEL, resolveDayVisual, type DayToneOverrides } from './dayTokens';
import type { CalendarDay } from './types';

export interface DayDetailPanelProps {
    day: CalendarDay | null;
    open: boolean;
    overrides?: DayToneOverrides;
    onClose: () => void;
    /** Fired after a successful submit so the caller can invalidate its query. */
    onSubmitted?: () => void;
}

type Mode = 'read' | 'pick' | 'form';
type RequestKind = 'checkin' | 'checkout';

export function DayDetailPanel({ day, open, overrides, onClose, onSubmitted }: DayDetailPanelProps) {
    const dark = useIsDark();
    const [mode, setMode] = useState<Mode>('read');
    const [kind, setKind] = useState<RequestKind>('checkin');
    const [time, setTime] = useState('');
    const [remarks, setRemarks] = useState('');
    const [methodId, setMethodId] = useState('');
    const [methods, setMethods] = useState<Array<{ value: string; label: string }>>([]);
    const [restrictionDays, setRestrictionDays] = useState(1);
    const [gate, setGate] = useState<{ checking: boolean; blocked: boolean; blockingDate: string }>({
        checking: false, blocked: false, blockingDate: '',
    });
    const [saving, setSaving] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);

    const employee = useSelector((s: RootState) => s.employee?.currentEmployee);
    const employeeId = employee?.id ?? '';
    const tz = employee?.branches?.timezone || MUMBAI_TZ;

    const visual = day ? resolveDayVisual(day.status, day.modifiers, overrides) : null;
    const tone = visual ? toneSurface(visual.trio, dark) : null;

    /* Reset to the read view whenever a different day opens. */
    useEffect(() => {
        if (!open) return;
        setMode('read');
        setTime('');
        setRemarks('');
        setMethodId('');
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

    const hasCheckIn = Boolean(day?.actual.checkIn);

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
        setKind(k);
        setTime('');
        setMode('form');
    };

    const submit = async () => {
        if (!day) return;
        if (!time) return errorConfirmation(`${kind === 'checkin' ? 'Check-in' : 'Check-out'} time is required`);
        if (!remarks.trim()) return errorConfirmation('Remarks are required');
        if (!methodId) return errorConfirmation('Working method is required');

        // Ordering guard, mirroring the legacy modal's conflict check.
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
                workingMethodId: methodId,
                remarks: remarks.trim(),
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
                    subtitle={STATUS_LABEL[day.status]}
                    onClose={onClose}
                />
            }
        >
            <div className="flex flex-col gap-4 p-1">
                {/* ── Record ─────────────────────────────────────────────── */}
                <section className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span
                            className="rounded-2xl border px-2.5 py-[4px] text-[11.5px] font-bold"
                            style={{ backgroundColor: tone.bg, borderColor: tone.bd, color: tone.fg }}
                        >
                            {STATUS_LABEL[day.status]}
                        </span>
                        {day.modifiers.map((m) => (
                            <span
                                key={m}
                                className="rounded-2xl border border-slate-200 px-2 py-[3px] text-[11px] font-semibold text-slate-600 dark:border-[#30363d] dark:text-slate-400"
                            >
                                {MODIFIER_LABEL[m]}
                            </span>
                        ))}
                    </div>

                    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
                        <Field k="Check in" v={day.actual.checkIn ?? '—'} hint={day.expected.checkIn ? `expected ${day.expected.checkIn}` : undefined} />
                        <Field k="Check out" v={day.actual.checkOut ?? '—'} hint={day.expected.checkOut ? `expected ${day.expected.checkOut}` : undefined} />
                        <Field k="Duration" v={formatMinutes(day.actual.minutesWorked)} />
                        <Field k="Work mode" v={day.workMode ?? '—'} />
                        {day.leave && (
                            <Field
                                k="Leave"
                                v={`${day.leave.type} · ${day.leave.fraction === 0.5 ? 'half day' : 'full day'}`}
                            />
                        )}
                        {day.holiday && <Field k="Holiday" v={day.holiday.name} />}
                        {day.request && (
                            <Field k="Correction" v={`${day.request.kind === 'check_in' ? 'Check-in' : 'Check-out'} · ${day.request.status}`} />
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
                                <WtButton onClick={startCorrection}>Raise a correction</WtButton>
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
                                    <WtButton inverted onClick={() => pickKind('checkin')}>Check-in</WtButton>
                                    <WtButton
                                        inverted
                                        disabled={!hasCheckIn}
                                        onClick={() => pickKind('checkout')}
                                    >
                                        Check-out
                                    </WtButton>
                                </div>
                                {!hasCheckIn && (
                                    <p className="m-0 flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                                        <KTIcon iconName="information-2" className="fs-7" />
                                        There is no check-in yet, so raise that first.
                                    </p>
                                )}
                            </div>
                        )}

                        {mode === 'form' && !gate.blocked && (
                            <div className="flex flex-col gap-3">
                                <p className="m-0 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                                    {kind === 'checkin' ? 'Check-in' : 'Check-out'} correction
                                </p>

                                <Labelled label={`${kind === 'checkin' ? 'Check-in' : 'Check-out'} time`} required>
                                    <TimeWheelField value={time} onChange={setTime} />
                                </Labelled>

                                <Labelled label="Working method" required>
                                    {/* WtSelect, not a raw <select> — the kit's dropdown ENGINE.
                                        A bespoke one would theme wrong in dark mode and be the
                                        fourth select in this codebase. */}
                                    <WtSelect
                                        options={methods}
                                        value={methods.find((m) => m.value === methodId) ?? null}
                                        onChange={(opt: { value: string } | null) => setMethodId(opt?.value ?? '')}
                                        ariaLabel="Working method"
                                        placeholder="Select…"
                                        isLoading={!methods.length}
                                        error={mode === 'form' && !methodId && saving}
                                        size="sm"
                                    />
                                </Labelled>

                                <Labelled label="Remarks" required>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows={2}
                                        className="w-full resize-y rounded-lg border border-slate-200 bg-transparent px-2.5 py-2 text-[13px] text-slate-900 dark:border-[#30363d] dark:text-slate-100"
                                        placeholder="Why is this correction needed?"
                                    />
                                </Labelled>

                                <div className="flex flex-wrap justify-between gap-2">
                                    <WtButton ghost onClick={() => setMode('pick')}>Back</WtButton>
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

function Labelled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className={cn('flex flex-col gap-1')}>
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                {label}
                {required && <span className="ml-0.5 text-rose-500">*</span>}
            </span>
            {children}
        </label>
    );
}

function formatMinutes(m: number | null): string {
    if (m == null || m <= 0) return '—';
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
