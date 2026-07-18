/**
 * useApplyLeave — orchestration hook for the redesigned (v4) Apply-Leave modal.
 *
 * Owns: balances, leave policy, approval chain (with resolved approver names),
 * the live allocation PREVIEW (frontend mirror engine), document upload, and submit.
 * Reuses existing utils/services — does NOT reimplement allocation or day-counting.
 *
 * Adapted from the design `integration/useApplyLeave.ts`:
 *  - `toUiTypes` maps OUR real `leavesSummary` keys (numberOfDays / leaveTaken / pendingDays /
 *    availableBalance / carriedForward) and resolves `leaveTypeId` by name from leave-options.
 *  - approval chain uses the self-readable endpoint (no employeeId arg).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@redux/store';
import {
    allocateLeave,
    expandChargeableDates,
    isWithinProbation,
    type AllocationResult,
    type TypeBalance,
} from '@utils/leaveAllocation';
import {
    createEmployeeLeaveRequest,
    updateEmployeeRequestById,
    fetchEmployeeLeaveBalance,
    fetchEmployeeLeaves,
    fetchAllEmployees,
    uploadLeaveDocuments,
    fetchLeaveApprovalChain,
    fetchLeaveApprovalStatus,
    type LeaveDocument,
    type ApprovalChainLevel,
    type LeaveApprovalStatus,
} from '@services/employee';
import { fetchConfiguration, fetchLeaveOptions, fetchSalaryDataForDateRangeMonthly, fetchAllPublicHolidays, fetchCompanyOverview } from '@services/company';
import { setMonthlyApiData } from '@redux/slices/salaryData';
import { LEAVE_POLICY_KEY } from '@constants/configurations-key';
import { buildCumulativeInputs } from '@utils/balanceProgressUtils';
import { calculateFiscalMonth } from '@utils/fiscalYearHelper';
import { resolveActiveOrgId } from '@utils/activeOrg';

const DEFAULT_PRIORITY = ['Casual Leaves', 'Sick Leaves', 'Floater Leaves', 'Annual Leaves'];

export interface SameDayPenaltyConfig {
    enabled: boolean;
    cutoffTime: string;
    penaltyType: 'halfDaySalaryDeduction' | 'halfPaidLeave' | 'fixedAmountDeduction';
    fixedDeductionAmount?: number;
}

/** Brand-aligned colour per leave type (matches the v4 design). */
export function colorForType(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('unpaid')) return '#9aa0a6';
    if (n.includes('sick')) return '#C2606B';
    if (n.includes('floater')) return '#C98A2B';
    if (n.includes('matern')) return '#9B59B6';
    if (n.includes('annual') || n.includes('earned') || n.includes('privilege')) return '#3E8E6E';
    return '#2F5E8C'; // casual / default
}

export interface UiLeaveType {
    leaveTypeId?: string;
    leaveType: string;
    available: number;
    total?: number;
    isPaid: boolean;
    color: string;
}

export interface UseApplyLeaveArgs {
    employeeId: string;
    branchId?: string;
    dateOfJoining?: string | Date | null;
    workingAndOffDays?: Record<string, string>;
    holidays?: string[];
}

export interface ApplyLeaveState {
    from: string | null;
    to: string | null;
    isHalfDay: boolean;
    halfDaySession: 'AM' | 'PM' | null;
    /** undefined => Auto allocation; otherwise a specific type name. */
    leaveTypeName?: string;
    leaveTypeId?: string;
    /** true after the user picks "Use other" in the Sick-confirm prompt. */
    excludeSick?: boolean;
    reason: string;
    files: File[];
}

/** Map OUR `leavesSummary` shape → UI types. leaveTypeId resolved via leave-options by name. */
function toUiTypes(leavesSummary: any, idByName: Map<string, string>): UiLeaveType[] {
    if (!leavesSummary) return [];
    const entries = Array.isArray(leavesSummary) ? leavesSummary : Object.values(leavesSummary);
    // Defence in depth: collapse any same-named duplicates (the backend already scopes to the
    // employee's branch, but a single row per leave type must hold here too — the allocation
    // engine matches balances by name, so duplicates would otherwise distort availability).
    const seen = new Set<string>();
    return entries.map((e: any) => {
        const leaveType = e.leaveType ?? e.type ?? e.name ?? '';
        const allocated = Number(e.numberOfDays ?? e.allocated ?? 0);
        const carried = Number(e.carriedForward ?? 0);
        const available =
            e.availableBalance != null
                ? Number(e.availableBalance)
                : e.available != null
                  ? Number(e.available)
                  : allocated + carried - Number(e.leaveTaken ?? e.used ?? 0) - Number(e.pendingDays ?? e.pending ?? 0);
        const isPaid = e.isPaid !== false && !String(leaveType).toLowerCase().includes('unpaid');
        return {
            leaveTypeId: idByName.get(String(leaveType)),
            leaveType,
            available: Math.max(0, available),
            total: allocated + carried,
            isPaid,
            color: colorForType(leaveType),
        };
    }).filter((t) => {
        const key = String(t.leaveType);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function useApplyLeave(args: UseApplyLeaveArgs) {
    const { employeeId, branchId, dateOfJoining, workingAndOffDays, holidays } = args;

    const dispatch = useDispatch();

    // lopPerDay is the salary module's authoritative per-day rate — single source of truth.
    // Fetched below on mount (if not already in Redux from a prior salary-page visit).
    const salaryApiData = useSelector((s: RootState) => s.salaryData?.monthlyApiData);
    const lopPerDay = useMemo(
        () => ((salaryApiData?.salaryData?.[0] as any)?.employeeCardDetails?.dailySalary as number | undefined) ?? 0,
        [salaryApiData],
    );

    const [types, setTypes] = useState<UiLeaveType[]>([]);
    const [priority, setPriority] = useState<string[]>(DEFAULT_PRIORITY);
    const [overflow, setOverflow] = useState<'spillToUnpaid' | 'block'>('spillToUnpaid');
    const [probation, setProbation] = useState({ enabled: false, durationDays: 90, allowUnpaid: true });
    // Cumulative monthly-pacing pool (paid, non-Maternal, non-Unpaid) — mirrors the BE pool in
    // leaveAllocationService so the live preview applies the same cap the server will book against.
    const [cumulativePool, setCumulativePool] = useState<{ totalPaidAllocated: number; usedPlusPendingPaid: number }>(
        { totalPaidAllocated: 0, usedPlusPendingPaid: 0 },
    );
    const [sameDayPenalty, setSameDayPenalty] = useState<SameDayPenaltyConfig | null>(null);
    // This employee's existing leaves, fetched fresh on mount. Used ONLY to compute blocked
    // dates in the calendar — kept local (not dispatched to the shared leaves slice) so it
    // never overwrites the transformed data the My-Leaves table renders from.
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    // Public holidays fetched fresh on mount: `dates` for blocking/preview, `names` (ISO → e.g.
    // "Independence Day") for the calendar tooltip. Kept local so the modal is self-sufficient
    // and never depends on another screen having populated the shared attendanceStats slice.
    const [holidayInfo, setHolidayInfo] = useState<{ dates: string[]; names: Record<string, string>; colors: Record<string, string> }>({ dates: [], names: {}, colors: {} });
    const [chain, setChain] = useState<ApprovalChainLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const holidaySet = useMemo(() => new Set([...(holidays ?? []), ...holidayInfo.dates]), [holidays, holidayInfo]);
    const balances: TypeBalance[] = useMemo(
        () => types.map((t) => ({ leaveType: t.leaveType, available: t.available, isPaid: t.isPaid })),
        [types],
    );
    const idByName = useMemo(() => new Map(types.map((t) => [t.leaveType, t.leaveTypeId ?? ''])), [types]);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                // Salary fetch: current month, only if not already in Redux (salary page not yet visited).
                const now = new Date();
                const y = now.getFullYear(), mo = String(now.getMonth() + 1).padStart(2, '0');
                const startDate = `${y}-${mo}-01`;
                const endDate   = `${y}-${mo}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

                const [balRes, optRes, policyRes, chainRows, empRes, salRes, leavesRes, coRes] = await Promise.all([
                    fetchEmployeeLeaveBalance(employeeId),
                    fetchLeaveOptions(branchId).catch(() => null),
                    fetchConfiguration(LEAVE_POLICY_KEY).catch(() => null),
                    fetchLeaveApprovalChain().catch(() => [] as ApprovalChainLevel[]),
                    fetchAllEmployees(true).catch(() => null),
                    salaryApiData
                        ? Promise.resolve(null)
                        : fetchSalaryDataForDateRangeMonthly({ employeeId, startDate, endDate }).catch(() => null),
                    fetchEmployeeLeaves(employeeId).catch(() => null),
                    fetchCompanyOverview().catch(() => null),
                ]);
                if (!alive) return;

                // Keep fresh leaves local for blockedDates — do NOT dispatch to the shared
                // leaves slice (that holds transformed table data; raw rows would break it).
                setMyLeaves(leavesRes?.data?.leaves ?? []);

                // Public holidays, fetched fresh with their configured names. Resolved via the
                // active org id (same path the attendance overview uses). Kept local to this hook.
                // observedIn is intentionally omitted so we receive the SAME full company set the
                // server charges against (getPublicHolidaysByDateRange has no region filter). A
                // region filter here would drop holidays the backend still books, diverging the
                // preview's chargeable days from the actual booking.
                const companyId = resolveActiveOrgId(coRes?.data?.companyOverview) ?? '';
                if (companyId) {
                    fetchAllPublicHolidays(undefined, companyId)
                        .then((phRes: any) => {
                            if (!alive) return;
                            const list: any[] = phRes?.data?.publicHolidays ?? [];
                            const dates: string[] = [];
                            const names: Record<string, string> = {};
                            const colors: Record<string, string> = {};
                            list.forEach((h: any) => {
                                const iso = String(h?.date ?? '').slice(0, 10);
                                if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
                                dates.push(iso);
                                const nm = h?.holiday?.name ?? h?.name ?? '';
                                if (nm) names[iso] = String(nm);
                                const col = h?.colorCode ?? h?.holiday?.colorCode ?? '';
                                if (col) colors[iso] = String(col);
                            });
                            setHolidayInfo({ dates, names, colors });
                        })
                        .catch(() => {});
                }

                if (salRes?.message) dispatch(setMonthlyApiData(salRes.message));

                // name → leaveTypeId from leave options (leavesSummary has no id).
                const options = (optRes?.data?.leaveOptions ?? optRes?.leaveOptions ?? []) as any[];
                const nameToId = new Map<string, string>(
                    options.map((o: any) => [String(o.leaveType), String(o.id)]),
                );
                setTypes(toUiTypes(balRes?.data?.leavesSummary, nameToId));

                // Cumulative pool from the same authoritative leavesSummary the dashboard uses.
                // buildCumulativeInputs counts only the four paced paid types (Annual/Casual/Sick/
                // Floater), excludes Maternal + Unpaid, and uses numberOfDays (no carry) + taken+pending.
                const cum = buildCumulativeInputs(balRes?.data?.leavesSummary ?? []);
                setCumulativePool({
                    totalPaidAllocated: cum.totalNonMaternalPaidAllocated,
                    usedPlusPendingPaid: Object.values(cum.takenIncludingPendingByType).reduce(
                        (s: number, v) => s + (Number(v) || 0),
                        0,
                    ),
                });

                const cfgRaw = policyRes?.data?.configuration?.configuration ?? policyRes?.data?.configuration;
                const cfg = typeof cfgRaw === 'string' ? JSON.parse(cfgRaw) : cfgRaw ?? {};
                setPriority(
                    Array.isArray(cfg.allocationPriority) && cfg.allocationPriority.length
                        ? cfg.allocationPriority.map(String)
                        : DEFAULT_PRIORITY,
                );
                setOverflow(cfg.cumulativeOverflow === 'block' ? 'block' : 'spillToUnpaid');
                setProbation({
                    enabled: !!cfg?.probation?.enabled,
                    durationDays: Number(cfg?.probation?.durationDays) || 90,
                    allowUnpaid: cfg?.probation?.allowUnpaidDuringProbation !== false,
                });
                const sp = cfg?.sameDayPenalty ?? {};
                setSameDayPenalty(
                    sp.enabled
                        ? {
                              enabled: true,
                              cutoffTime: sp.cutoffTime ?? '12:00',
                              penaltyType: sp.penaltyType === 'halfPaidLeave' ? 'halfPaidLeave'
                                  : sp.penaltyType === 'fixedAmountDeduction' ? 'fixedAmountDeduction'
                                  : 'halfDaySalaryDeduction',
                              fixedDeductionAmount: Number(sp.fixedDeductionAmount) || 0,
                          }
                        : null,
                );

                // Resolve approverId → name/role from the employees list (shape-tolerant).
                const empList = (empRes?.data?.employees ?? empRes?.data ?? empRes ?? []) as any[];
                const byId = new Map((Array.isArray(empList) ? empList : []).map((e: any) => [e.id, e]));
                setChain(
                    chainRows.map((c) => {
                        const e: any = byId.get(c.approverId);
                        const name = e
                            ? `${e.users?.firstName ?? e.firstName ?? ''} ${e.users?.lastName ?? e.lastName ?? ''}`.trim()
                            : undefined;
                        const role = e?.designations?.role ?? e?.designation ?? e?.role ?? undefined;
                        return { ...c, approverName: name || c.approverId, approverRole: role };
                    }),
                );
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [employeeId, branchId]);

    const preview = useCallback(
        // `sandwichDates` are the interior off-days the BACKEND rule engine docks as Unpaid — the
        // caller fetches them from the sandwich preview endpoint (single source of truth). Empty
        // under the default rule set, so off-days follow normal payroll (strictly rule-driven).
        (
            s: ApplyLeaveState,
            sandwichDates: string[] = [],
            /**
             * The segments of the request currently being EDITED. Its days are still booked as
             * pending against `balances` and the cumulative pool, so re-allocating the same span
             * would find the type exhausted and spill those very days to Unpaid — the edit screen
             * would contradict the view screen for one unchanged leave. The backend has no such
             * problem (it deletes the group, THEN re-allocates), so the preview credits them back
             * to mirror it. Empty on apply.
             */
            creditBack: Array<{ leaveType: string; days: number; isPaid: boolean }> = [],
        ): AllocationResult | null => {
            if (!s.from || !s.to) return null;
            const chargeableDates = expandChargeableDates(s.from, s.to, workingAndOffDays ?? {}, holidaySet);
            if (chargeableDates.length === 0) return null;
            const unit = s.isHalfDay ? 0.5 : 1;
            // Credit the edited request back to the pools it currently occupies.
            const creditByType = new Map<string, number>();
            let creditPaidDays = 0;
            for (const c of creditBack) {
                if (!c.leaveType) continue;
                creditByType.set(c.leaveType, (creditByType.get(c.leaveType) ?? 0) + (c.days || 0));
                if (c.isPaid) creditPaidDays += c.days || 0;
            }
            const effectiveBalances = creditByType.size
                ? balances.map((b) =>
                      creditByType.has(b.leaveType)
                          ? { ...b, available: b.available + (creditByType.get(b.leaveType) ?? 0) }
                          : b,
                  )
                : balances;
            const probationActive = probation.enabled && isWithinProbation(dateOfJoining, probation.durationDays);
            const order = s.leaveTypeName
                ? [s.leaveTypeName]
                : priority.filter((t) => !(s.excludeSick && /sick/i.test(t)));
            // Half-day ranges can't sandwich, so ignore any supplied dates for them.
            const effectiveSandwich = unit === 0.5 ? [] : sandwichDates;
            // Fiscal month from dateTo — matches the BE (getFiscalMonthIndex(dateTo)) so the preview
            // applies the SAME cumulative cap the server books against (spill-to-unpaid or block).
            const fiscalMonthIndex = calculateFiscalMonth(new Date(s.to + 'T00:00:00').getMonth() + 1, 4);
            return allocateLeave({
                chargeableDates,
                sandwichDates: effectiveSandwich,
                balances: effectiveBalances,
                priorityOrder: order,
                probationActive,
                probationAllowUnpaid: probation.allowUnpaid,
                unit,
                cumulative: {
                    totalPaidAllocated: cumulativePool.totalPaidAllocated,
                    // Same credit-back as the per-type balances: the edited request's paid days are
                    // already inside usedPlusPendingPaid, and double-counting them would fire the
                    // cumulative cap against a leave that is merely being re-saved.
                    usedPlusPendingPaid: Math.max(0, cumulativePool.usedPlusPendingPaid - creditPaidDays),
                    fiscalMonthIndex,
                    overflow,
                },
            });
        },
        [balances, priority, probation, dateOfJoining, workingAndOffDays, holidaySet, cumulativePool, overflow],
    );

    const submit = useCallback(
        async (s: ApplyLeaveState) => {
            setSubmitting(true);
            try {
                let documents: LeaveDocument[] = [];
                if (s.files.length) documents = await uploadLeaveDocuments(s.files);
                const autoAllocate = !s.leaveTypeId;
                const isHalfDayValid = s.isHalfDay && !!s.halfDaySession;
                const payload = {
                    employeeId,
                    dateFrom: s.from!,
                    dateTo: s.to!,
                    reason: s.reason || undefined,
                    isHalfDay: isHalfDayValid,
                    halfDaySession: isHalfDayValid ? (s.halfDaySession ?? 'AM') : undefined,
                    autoAllocate,
                    ...(autoAllocate ? {} : { leaveTypeId: s.leaveTypeId }),
                    ...(documents.length ? { documents } : {}),
                    status: 0,
                } as any;
                const res = await createEmployeeLeaveRequest(payload);
                if (res?.hasError) throw new Error(res?.detail || res?.message || 'Failed to apply for leave');
                return res?.data; // { requestGroupId, segments, paidDays, unpaidDays, notes, totalDays }
            } finally {
                setSubmitting(false);
            }
        },
        [employeeId],
    );

    // Edit an existing request. `id` is a LeaveTracker segment id; the backend PUT is group-aware
    // and re-allocates the whole request. Same payload shape as create.
    const update = useCallback(
        async (id: string, s: ApplyLeaveState) => {
            setSubmitting(true);
            try {
                let documents: LeaveDocument[] = [];
                if (s.files.length) documents = await uploadLeaveDocuments(s.files);
                const autoAllocate = !s.leaveTypeId;
                const isHalfDayValid = s.isHalfDay && !!s.halfDaySession;
                // NOTE: the PUT handler rejects `employeeId` and `status` as restricted fields — the
                // owner is derived from the existing leave record, and status is never changed on
                // edit. Sending either throws BadRequestError, so the update payload omits both
                // (unlike the create payload). Admin-on-behalf edits are scoped by the record's id.
                const payload = {
                    dateFrom: s.from!,
                    dateTo: s.to!,
                    reason: s.reason || undefined,
                    isHalfDay: isHalfDayValid,
                    halfDaySession: isHalfDayValid ? (s.halfDaySession ?? 'AM') : undefined,
                    autoAllocate,
                    ...(autoAllocate ? {} : { leaveTypeId: s.leaveTypeId }),
                    ...(documents.length ? { documents } : {}),
                } as any;
                const res = await updateEmployeeRequestById(id, payload);
                if (res?.hasError) throw new Error(res?.detail || res?.message || 'Failed to update leave');
                return res?.data;
            } finally {
                setSubmitting(false);
            }
        },
        [employeeId],
    );

    /**
     * Live approval status for a submitted request. `requestId` is the requestGroupId
     * (auto-allocated) or the LeaveTracker id (manual). Returns null when no workflow
     * instance exists (no chain configured) so the UI falls back to the static preview.
     */
    const fetchStatus = useCallback(
        async (requestId: string): Promise<LeaveApprovalStatus | null> => {
            if (!requestId) return null;
            try {
                return await fetchLeaveApprovalStatus(requestId);
            } catch {
                return null;
            }
        },
        [],
    );

    return { loading, submitting, types, balances, priority, overflow, probation, chain, myLeaves, holidayInfo, preview, submit, update, fetchStatus, lopPerDay, sameDayPenalty };
}
