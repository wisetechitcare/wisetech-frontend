/**
 * Ex-employees who still hold paid leave nobody converted — and the Admin/HR path to settle it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────────────────────
 * Leave conversion is employee-initiated, and fiscalYearRollover only iterates ACTIVE employees.
 * So an employee who exits without converting leaves their balance stranded: never rolled forward,
 * never encashed, never expired. It sits there until the ex-employee asks about it.
 *
 * Giving HR an on-behalf conversion does not by itself fix that — it moves "the employee forgot" to
 * "HR forgot", the same failure mode one desk over, with nothing to trigger it. This panel is the
 * half that makes the capability get used rather than merely exist: it turns remembering into
 * seeing.
 *
 * ── What it does not decide ──────────────────────────────────────────────────────────────────
 * Nothing here is an authorisation boundary. The server requires isAdminOrHR plus
 * requireAccessToEmployee for any non-self target, refuses unless the leave policy has
 * leaveConversion.onBehalf.enabled, and enforces the ceilings and settlement window. This panel
 * reflects that state; it never grants it.
 */
import { useCallback, useEffect, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { IconBox, TRIO, WtButton, Spinner, StatusBadge } from '@app/modules/common/components/ui/tw';
import { fetchUnsettledLeavers, type UnsettledLeaver } from '@services/employee';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import ConvertLeavesModal from '@pages/employee/attendance/personal/views/my-leaves/ConvertLeavesModal';

export default function UnsettledLeaversPanel() {
    const [leavers, setLeavers] = useState<UnsettledLeaver[]>([]);
    const [loading, setLoading] = useState(true);
    const [onBehalfEnabled, setOnBehalfEnabled] = useState(false);
    const [windowDays, setWindowDays] = useState(0);
    const [target, setTarget] = useState<UnsettledLeaver | null>(null);
    const [denied, setDenied] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetchUnsettledLeavers();
            setLeavers(res.data.leavers ?? []);
            setOnBehalfEnabled(!!res.data.onBehalfEnabled);
            setWindowDays(res.data.settlementWindowDays ?? 0);
            setDenied(false);
        } catch (err: any) {
            // 403 is the expected answer for a non-Admin/HR viewer: render nothing rather than an
            // error, since this panel simply is not theirs.
            if (err?.response?.status === 403) setDenied(true);
            else console.error('[UnsettledLeavers] load failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEventBus(EVENT_KEYS.leaveManagementRequestCreated, load);
    useEventBus(EVENT_KEYS.leaveManagementRequestUpdated, load);

    // Nothing stranded, or not this user's panel — say nothing rather than showing an empty card.
    if (denied || (!loading && leavers.length === 0)) return null;

    return (
        <>
            <div className="mt-8">
                <div className="mb-2.5 flex items-center gap-3">
                    <IconBox icon="user-tick" trio={TRIO.amber} size={44} fs="fs-1" />
                    <div className="min-w-0">
                        <span className="font-bold text-[20px] text-slate-900 dark:text-slate-100">
                            Leavers with Unsettled Leave
                        </span>
                        <p className="m-0 text-[12.5px] text-slate-500 dark:text-slate-400">
                            Exited employees still holding paid leave. Their balance does not roll over, expire or
                            settle itself.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 py-6 text-[13px] text-slate-500">
                        <Spinner size={16} /> Loading…
                    </div>
                ) : (
                    <>
                        {!onBehalfEnabled && (
                            <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                                Settling leave on an employee's behalf is <strong>turned off</strong>. Enable
                                <strong> Leave Policy → Conversion → On behalf</strong> to act on this list. Until then
                                these balances are visible but cannot be settled.
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                            {leavers.map((l) => (
                                <div
                                    key={l.employeeId}
                                    className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/60"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-[14px] font-bold text-slate-900 dark:text-slate-100">
                                                {l.employeeName}
                                            </span>
                                            {l.employeeCode && (
                                                <span className="text-[11.5px] text-slate-400">{l.employeeCode}</span>
                                            )}
                                            {l.windowClosed && (
                                                <StatusBadge trio={TRIO.rose} label="Window closed" />
                                            )}
                                            {l.hasOpenConversion && (
                                                <StatusBadge trio={TRIO.blue} label="Request raised" />
                                            )}
                                        </div>
                                        <p className="m-0 mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                                            Exited {l.dateOfExit} · {l.daysSinceExit} day(s) ago
                                            {windowDays > 0 && !l.windowClosed
                                                ? ` · ${Math.max(0, windowDays - l.daysSinceExit)} day(s) left to settle`
                                                : ''}
                                        </p>
                                        <p className="m-0 mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                                            {Object.entries(l.balanceByType)
                                                .map(([type, days]) => `${type}: ${days}`)
                                                .join(' · ')}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                                        <span className="whitespace-nowrap text-[18px] font-extrabold text-slate-900 dark:text-slate-100">
                                            {l.totalDays} <span className="text-[12px] font-semibold text-slate-400">days</span>
                                        </span>
                                        <WtButton
                                            tone="accent"
                                            disabled={!onBehalfEnabled || l.hasOpenConversion}
                                            onClick={() => setTarget(l)}
                                            className="w-full sm:w-auto"
                                        >
                                            {l.hasOpenConversion ? 'Already raised' : 'Settle'}
                                        </WtButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/*
              The SAME modal the employee uses, targeted at the leaver — not a second encashment
              screen. A parallel admin copy would drift from the employee one, which is exactly how
              the two leave calendars this codebase already deleted came about.
            */}
            {target && (
                <ConvertLeavesModal
                    show
                    onHide={() => setTarget(null)}
                    target={{
                        employeeId: target.employeeId,
                        branchId: target.branchId,
                        employeeName: target.employeeName,
                    }}
                    leaveBalances={{
                        totalLeaves: target.totalDays,
                        casualLeaves: target.balanceByType['Casual Leaves'] ?? 0,
                        sickLeaves: target.balanceByType['Sick Leaves'] ?? 0,
                        floaterLeaves: target.balanceByType['Floater Leaves'] ?? 0,
                        annualLeaves: target.balanceByType['Annual Leaves'] ?? 0,
                        maternalLeaves: target.balanceByType['Maternal Leaves'] ?? 0,
                    }}
                    onSuccess={() => { setTarget(null); load(); }}
                />
            )}
        </>
    );
}
