import { Status } from "@constants/statistics";
import { KTIcon } from "@metronic/helpers";
import { CustomLeaves, Leaves } from "@models/employee";
import { saveLeaves } from "@redux/slices/attendanceStats";
import { RootState, store } from "@redux/store";
import { fetchPublicHolidays, fetchLeaveOptions, fetchConfiguration } from "@services/company";
import { isWithinProbation } from "@utils/leaveAllocation";
import { LEAVE_POLICY_KEY } from "@constants/configurations-key";
import { fetchEmployeeLeaveBalance, fetchEmployeeLeaves, getAllLeaveManagements } from "@services/employee";
import { fetchAllAddonLeavesAllowances } from "@services/addonLeavesAllowance";
import { hasPermission } from "@utils/authAbac";
import { parseWorkingDays } from "@utils/workingDays";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { customLeaves, filterLeavesPublicHolidays, handleDatesChange, leavesBalance } from "@utils/statistics";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, useCallback } from "react";
// Shared glass UI kit — single source of truth for the leave-management look.
import { GlassCard, WtButton, IconBox, SectionHead, BRAND, TRIO } from "@app/modules/common/components/ui/tw";
import { useDispatch, useSelector } from "react-redux";
import ConvertLeavesModal from "./ConvertLeavesModal";
import EncashTransferLeavesModal from "./EncashTransferLeavesModal";
import MyLeaveManagementRequests from "./MyLeaveManagementRequests";
import LeaveBalanceItem from "./LeaveBalanceItem";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import {
    getTotalWeekendsBetweenDates,
    calculateLeavesTakenByType,
    calculateTransferredLeaves,
    hasPendingOrApprovedEncashTransfer,
    calculateLeaveBalances,
    buildLeaveData,
    calculateTotalAvailableLeaves,
    calculateCumulativeSummary,
    buildCumulativeInputs,
    CumulativeInputs,
} from "@utils/balanceProgressUtils";
import { calculateProRatedMonths } from "@utils/fiscalYearHelper";

const BalanceProgress = ({ fromAdmin = false, resource, viewOwn = false, viewOthers = false, startDateNew, endDateNew }: { fromAdmin?: boolean, resource: string, viewOwn?: boolean, viewOthers?: boolean, startDateNew: string, endDateNew: string }) => {
    const dispatch = useDispatch();
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee?.id);

    const workingAndOffDaysString = useSelector((state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays);
    const branchWorkingDays = useMemo(() => {
        return parseWorkingDays(workingAndOffDaysString)
    }, [workingAndOffDaysString]);

    const [currentYear] = useState(new Date().getFullYear() + "");
    const country = "India";
    const [leaves, setLeaves] = useState<CustomLeaves[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<Record<string, number>>({});
    const [proRatedBalances, setProRatedBalances] = useState<Record<string, number>>({});
    const [leavesTakenCount, setLeavesTakenCount] = useState<Record<string, number>>({});
    const [cumulativeInputs, setCumulativeInputs] = useState<CumulativeInputs>({ totalNonMaternalPaidAllocated: 0, takenIncludingPendingByType: {} });
    // SINGLE SOURCE OF TRUTH: the backend now computes the Cumulative Leave Allowance and returns it on
    // the leave-balance API. We display that verbatim; the client-side derivation below is only a
    // fallback for an older backend that didn't send it.
    const [backendCumulative, setBackendCumulative] = useState<{ totalPaidAllocated: number; used: number; allowedTillNow: number; remaining: number } | null>(null);
    const [holidays, setHolidays] = useState<number>(0);
    const [weekendCount, setWeekendCount] = useState<number>(0);
    const [totalLeaves, setTotalLeaves] = useState<CustomLeaves[]>([]);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showEncashTransferModal, setShowEncashTransferModal] = useState(false);
    const [shouldShowConvertButton, setShouldShowConvertButton] = useState(true);
    const [approvedRequestInfo, setApprovedRequestInfo] = useState<{ transfer?: any; encash?: any } | null>(null);
    const [addonLeaveAllowanceCount, setAddonLeaveAllowanceCount] = useState(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    const employeeBranchId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.branchId : state.employee.currentEmployee?.branchId);

    // New-Joiner Probation: paid leave is blocked during the probation window. Fetch the policy
    // so the balance card can signal it (the paid allocation is still shown — it's entitlement —
    // but the banner makes clear it isn't usable until probation ends).
    const [probationCfg, setProbationCfg] = useState<{ enabled: boolean; durationDays: number; allowUnpaid: boolean }>({ enabled: false, durationDays: 90, allowUnpaid: true });
    useEffect(() => {
        (async () => {
            try {
                const { data: { configuration } } = await fetchConfiguration(LEAVE_POLICY_KEY);
                const raw = configuration?.configuration;
                const cfg = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
                const p = cfg?.probation ?? {};
                setProbationCfg({
                    enabled: !!p.enabled,
                    durationDays: Number(p.durationDays) > 0 ? Number(p.durationDays) : 90,
                    allowUnpaid: p.allowUnpaidDuringProbation !== false,
                });
            } catch { /* keep defaults — no banner */ }
        })();
    }, []);
    const probationActive = probationCfg.enabled && isWithinProbation(dateOfJoining as any, probationCfg.durationDays);
    const probationEndLabel = useMemo(
        () => (dateOfJoining ? dayjs(dateOfJoining).add(probationCfg.durationDays, 'day').format('DD MMM, YYYY') : ''),
        [dateOfJoining, probationCfg.durationDays],
    );

    const isInFiscalEndMonth = useMemo(() => {
        if (!endDateNew) return false;
        const fiscalEndDate = dayjs(endDateNew);
        const today = dayjs();
        const fiscalEndMonth = fiscalEndDate.month();
        const fiscalEndYear = fiscalEndDate.year();
        const currentMonth = today.month();
        const currentYear = today.year();
        return currentMonth === fiscalEndMonth && currentYear === fiscalEndYear;
    }, [endDateNew]);

    const isFiscalYearCurrentOrFuture = useMemo(() => {
        if (!endDateNew) return false;
        const fiscalEndDate = dayjs(endDateNew);
        const today = dayjs();
        return fiscalEndDate.isAfter(today) || fiscalEndDate.isSame(today, 'day');
    }, [endDateNew]);

    const refreshLeaveManagementData = () => {
        if (selectedEmployeeId && startDateNew && endDateNew) {
            getAllLeaveManagements(selectedEmployeeId).then(response => {
                const requests = response.data.leaveManagements || [];
                const hasPendingOrApprovedRequest = requests.some(
                    (req: any) => req.status === 0 || req.status === 1
                );
                const currentFiscalTransferred: Record<string, number> = {};

                const currentFiscalTransferRequests = requests.filter((req: any) => {
                    if (req.managementType !== 'TRANSFER') return false;
                    if (req.status !== 0 && req.status !== 1) return false;
                    const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return createdDate >= startDateNew && createdDate <= endDateNew;
                });

                const currentFiscalEncashRequests = requests.filter((req: any) => {
                    if (req.managementType !== 'CASH') return false;
                    if (req.status !== 0 && req.status !== 1) return false;
                    const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return createdDate >= startDateNew && createdDate <= endDateNew;
                });

                currentFiscalTransferRequests.forEach((transferRequest: any) => {
                    if (transferRequest?.leaveTypeIds && Array.isArray(transferRequest.leaveTypeIds)) {
                        transferRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
                            const leaveType = leaveTypeItem.leaveType;
                            const count = leaveTypeItem.count || 0;
                            currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
                        });
                    }
                });

                currentFiscalEncashRequests.forEach((encashRequest: any) => {
                    if (encashRequest?.leaveTypeIds && Array.isArray(encashRequest.leaveTypeIds)) {
                        encashRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
                            const leaveType = leaveTypeItem.leaveType;
                            const count = leaveTypeItem.count || 0;
                            currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
                        });
                    }
                });

                setTransferredLeavesInCurrentFiscal(currentFiscalTransferred);
                setShouldShowConvertButton(!hasPendingOrApprovedRequest);
            }).catch(error => {
                console.error("Error refreshing leave management requests:", error);
            });
        }
    };

    useEventBus(EVENT_KEYS.leaveManagementRequestCreated, refreshLeaveManagementData);
    useEventBus(EVENT_KEYS.leaveManagementRequestUpdated, refreshLeaveManagementData);

    const refreshLeaveData = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useEventBus(EVENT_KEYS.leaveRequestCreated, refreshLeaveData);
    useEventBus(EVENT_KEYS.leaveRequestUpdated, refreshLeaveData);
    useEventBus(EVENT_KEYS.leaveOptionsUpdated, refreshLeaveData);
    useEventBus(EVENT_KEYS.addonLeavesAllowanceUpdated, refreshLeaveData);

    useEffect(() => {
        if (startDateNew && endDateNew && branchWorkingDays) {
            const weekends = getTotalWeekendsBetweenDates(branchWorkingDays, startDateNew, endDateNew);
            setWeekendCount(weekends);
        }
    }, [startDateNew, endDateNew, branchWorkingDays]);

    useEffect(() => {
        if (!startDateNew || !endDateNew || !selectedEmployeeId) {
            return;
        }

        async function fetchData() {
            try {
                const [leavesResponse, holidaysResponse, balanceResponse, leaveOptionsResponse, addonResponse, transferResponse] = await Promise.all([
                    fetchEmployeeLeaves(selectedEmployeeId),
                    fetchPublicHolidays(currentYear, country),
                    fetchEmployeeLeaveBalance(selectedEmployeeId),
                    fetchLeaveOptions(),
                    fetchAllAddonLeavesAllowances(),
                    getAllLeaveManagements(selectedEmployeeId),
                ]);

                const { data: { leaves } } = leavesResponse;
                const { data: { publicHolidays } } = holidaysResponse;
                const { data: { leavesSummary, cumulativeSummary: backendCumulativeSummary } } = balanceResponse;
                setBackendCumulative(backendCumulativeSummary ?? null);
                const { data: { leaveOptions } } = leaveOptionsResponse;

                // Compute addon leave allowance (experience-based extra annual leaves)
                let addonLeaveAllowanceCount = 0;
                const experienceAtFiscalStart = dayjs(startDateNew).diff(dayjs(dateOfJoining), 'year');
                if (!addonResponse?.hasError && addonResponse?.data?.addonLeavesAllowances) {
                    const addons = addonResponse.data.addonLeavesAllowances;
                    const cap = experienceAtFiscalStart > 10 ? 11 : experienceAtFiscalStart;
                    const match = addons.find((a: any) => a.experienceInCompany === cap);
                    addonLeaveAllowanceCount = match?.addonLeavesCount || 0;
                }

                // Process transfer / encash requests (single API call, shared with hasPendingOrApprovedTransfer)
                const transferRequests = transferResponse.data.leaveManagements || [];

                const hasPendingOrApprovedRequest = transferRequests.some(
                    (req: any) => req.status === 0 || req.status === 1
                );

                const approvedTransferRequest = transferRequests.find((req: any) => {
                    if (req.status !== 1 || req.managementType !== 'TRANSFER') return false;
                    const d = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return d >= startDateNew && d <= endDateNew;
                });
                const approvedEncashRequest = transferRequests.find((req: any) => {
                    if (req.status !== 1 || req.managementType !== 'CASH') return false;
                    const d = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return d >= startDateNew && d <= endDateNew;
                });
                setApprovedRequestInfo(
                    approvedTransferRequest || approvedEncashRequest
                        ? { transfer: approvedTransferRequest, encash: approvedEncashRequest }
                        : null
                );

                const currentFiscalTransferred: Record<string, number> = {};
                transferRequests
                    .filter((req: any) =>
                        (req.managementType === 'TRANSFER' || req.managementType === 'CASH') &&
                        (req.status === 0 || req.status === 1) &&
                        (() => { const d = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : ''; return d >= startDateNew && d <= endDateNew; })()
                    )
                    .forEach((req: any) => {
                        (req.leaveTypeIds || []).forEach((item: any) => {
                            currentFiscalTransferred[item.leaveType] = (currentFiscalTransferred[item.leaveType] || 0) + (item.count || 0);
                        });
                    });
                setTransferredLeavesInCurrentFiscal(currentFiscalTransferred);
                setShouldShowConvertButton(!hasPendingOrApprovedRequest);

                const processedLeaves = await customLeaves(leaves);

                const filteredLeaves = processedLeaves.filter(
                    leave => {
                        const leaveDate = leave.date || leave.dateFrom;
                        return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
                    }
                );

                setTotalLeaves(processedLeaves);
                dispatch(saveLeaves(processedLeaves));
                setLeaves(filteredLeaves);
                setHolidays(publicHolidays.length);

                const { startDate: fiscalYearStartDate, endDate: fiscalYearEndDate } =
                    await generateFiscalYearFromGivenYear(dayjs(), fromAdmin);

                const proRatedMonths = calculateProRatedMonths(
                    dayjs(dateOfJoining),
                    dayjs(fiscalYearStartDate),
                    dayjs(fiscalYearEndDate),
                    dayjs()
                );

                const fiscalYearFilteredLeaves = processedLeaves.filter((leave: any) => {
                    const leaveDate = leave.dateFrom || leave.date;
                    return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
                });

                const publicHolidayDates: string[] = (publicHolidays || [])
                    .map((h: any) => h?.date)
                    .filter(Boolean)
                    .map((d: any) => dayjs(d).format('YYYY-MM-DD'));

                const leavesTaken = calculateLeavesTakenByType(
                    fiscalYearFilteredLeaves,
                    publicHolidayDates,
                    branchWorkingDays
                );

                const hasPendingOrApprovedTransfer = await hasPendingOrApprovedEncashTransfer(
                    transferRequests,
                    startDateNew,
                    endDateNew
                );

                const transferredLeaves = hasPendingOrApprovedTransfer
                    ? {}
                    : await calculateTransferredLeaves(transferRequests, startDateNew, endDateNew);

                const branchLeaveBalances: Record<string, number> = {};
                leavesSummary.forEach((summary: any) => {
                    const days = Number(summary.numberOfDays) || 0;
                    branchLeaveBalances[summary.leaveType] = days;
                });

                const joiningDate = dayjs(dateOfJoining);
                const fiscalStart = dayjs(fiscalYearStartDate);
                const fiscalEnd = dayjs(fiscalYearEndDate);
                const today = dayjs();

                const calculationDate = fiscalEnd.isAfter(today) && fiscalStart.isBefore(today)
                    ? today
                    : fiscalEnd;

                const startDate = joiningDate.isAfter(fiscalStart) ? joiningDate : fiscalStart;
                const tenureMonths = calculationDate.diff(startDate, 'month') + 1;

                // Pass 0 for addon: the backend leave-balance API already returns Annual
                // numberOfDays INCLUDING the experience-based addon (recalculateBalance is the
                // single source of truth). Passing addonLeaveAllowanceCount here too would
                // double-count it (e.g. base 0 + addon 10 from backend, +10 again = 20).
                const { balances, proRated } = calculateLeaveBalances(
                    branchLeaveBalances,
                    transferredLeaves,
                    0,
                    proRatedMonths,
                    hasPendingOrApprovedTransfer,
                    tenureMonths
                );
                setLeaveBalances(balances);
                setProRatedBalances(proRated);
                setLeavesTakenCount(leavesTaken);
                // Cumulative inputs come straight from the authoritative leavesSummary (leave_balance),
                // via the shared helper — identical source to the Apply-Leave modal.
                setCumulativeInputs(buildCumulativeInputs(leavesSummary));

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        fetchData();
    }, [selectedEmployeeId, startDateNew, endDateNew, currentYear, country, dispatch, employeeBranchId, dateOfJoining, refreshTrigger]);

    const balanceLeaveMap = useMemo(() =>
        leavesBalance(leaves.filter(leave => leave.status === Status.Approved)),
        [leaves]);

    const {
        paidLeaves,
        unpaidLeaves,
        totalPaidUsed,
        totalPaidAssigned,
        totalUnpaidUsed,
        totalUnpaidAssigned,
        grandTotalUsed,
        grandTotalAssigned
    } = useMemo(() => buildLeaveData(leavesTakenCount, proRatedBalances, leaveBalances),
        [leavesTakenCount, proRatedBalances, leaveBalances]);

    // Fiscal year start month derived from the prop (e.g. "2026-04-01" → 4)
    const fiscalStartMonth = useMemo(
        () => (startDateNew ? dayjs(startDateNew).month() + 1 : 4),
        [startDateNew]
    );

    // Single source of truth for the cumulative summary — used in both the header card
    // and the sub-section so they always show the same numbers. Inputs are built from the
    // authoritative leavesSummary via buildCumulativeInputs (shared with the Apply-Leave modal).
    const cumulativeSummary = useMemo(
        () => {
            // Prefer the backend-computed summary (single source of truth). Fall back to the shared
            // client derivation only if an older backend didn't send it.
            if (backendCumulative) {
                return {
                    total: backendCumulative.totalPaidAllocated ?? 0,
                    used: backendCumulative.used ?? 0,
                    allowedTillNow: backendCumulative.allowedTillNow ?? 0,
                    remaining: backendCumulative.remaining ?? 0,
                };
            }
            return calculateCumulativeSummary(cumulativeInputs.totalNonMaternalPaidAllocated, cumulativeInputs.takenIncludingPendingByType, fiscalStartMonth);
        },
        [backendCumulative, cumulativeInputs, fiscalStartMonth]
    );

    const res1 = viewOthers && hasPermission(resource, "readOthers", { employeeId: selectedEmployeeId });
    const res2 = viewOwn && hasPermission(resource, "readOwn", { employeeId: selectedEmployeeId });

    const [transferredLeavesInCurrentFiscal, setTransferredLeavesInCurrentFiscal] = useState<Record<string, number>>({});

    const availableLeaves = useMemo(() =>
        calculateTotalAvailableLeaves(proRatedBalances, leaveBalances, leavesTakenCount, transferredLeavesInCurrentFiscal),
        [proRatedBalances, leaveBalances, leavesTakenCount, transferredLeavesInCurrentFiscal]
    );

    if (!res2 && !res1) {
        return null;
    }

    return (
        <>
            {approvedRequestInfo && (
                <div className="flex flex-col gap-2.5 mt-6">
                    {approvedRequestInfo.transfer && (
                        <GlassCard preset="row" accentEdge="cyan" className="flex items-start gap-2.5">
                            <IconBox icon="information-5" trio={TRIO.cyan} size={34} fs="fs-4" />
                            <p className="text-[13px] text-slate-500 leading-normal m-0">
                                Your leave transfer request has been approved.
                                {approvedRequestInfo.transfer.leaveTypeIds && Array.isArray(approvedRequestInfo.transfer.leaveTypeIds) && approvedRequestInfo.transfer.leaveTypeIds.length > 0 && (
                                    <> {approvedRequestInfo.transfer.leaveTypeIds.map((item: any, idx: number) => (
                                        <span key={idx}>
                                            {idx > 0 && ', '}
                                            <strong>{item.count} {item.leaveType}</strong>
                                        </span>
                                    ))} have been carried forward to the next fiscal year.</>
                                )}
                            </p>
                        </GlassCard>
                    )}
                    {approvedRequestInfo.encash && (
                        <GlassCard preset="row" accentEdge="green" className="flex items-start gap-2.5">
                            <IconBox icon="dollar" trio={TRIO.green} size={34} fs="fs-4" />
                            <p className="text-[13px] text-slate-500 leading-normal m-0">
                                Your leave encashment request has been approved.
                                {approvedRequestInfo.encash.leaveTypeIds && Array.isArray(approvedRequestInfo.encash.leaveTypeIds) && approvedRequestInfo.encash.leaveTypeIds.length > 0 && (
                                    <> {approvedRequestInfo.encash.leaveTypeIds.map((item: any, idx: number) => (
                                        <span key={idx}>
                                            {idx > 0 && ', '}
                                            <strong>{item.count} {item.leaveType}</strong>
                                        </span>
                                    ))} will be processed in your next salary.</>
                                )}
                            </p>
                        </GlassCard>
                    )}
                </div>
            )}

            {/* Cumulative Leave Allowance */}
            <GlassCard preset="section" className="mt-6 sm:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center flex-wrap gap-4">
                    <div className="flex-auto min-w-0">
                        <SectionHead tone={TRIO.blue} icon="calendar-tick" title="Cumulative Leave Allowance"
                            desc="Leaves are distributed across the fiscal year. Allowed usage grows each month — you can use what is allowed till the current period." />
                    </div>

                    {(() => {
                        const { allowedTillNow, used, remaining } = cumulativeSummary;
                        const ok = remaining > 0;
                        return (
                            <div className="flex flex-row gap-4 items-center shrink-0 self-stretch md:self-center">
                                <div className="text-center flex-1 md:flex-none">
                                    <p className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 leading-none m-0">
                                        {used}<span className="text-[20px] sm:text-[24px] text-slate-400"> / {allowedTillNow}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.05em] font-bold m-0">Used Till Date</p>
                                </div>
                                <div className="px-5 py-3 rounded-[10px] min-w-[140px] text-center flex-1 md:flex-none border"
                                    style={{ backgroundColor: ok ? TRIO.green.bg : TRIO.rose.bg, borderColor: ok ? TRIO.green.bd : TRIO.rose.bd }}>
                                    <p className="text-[20px] font-extrabold leading-none m-0" style={{ color: ok ? TRIO.green.c : TRIO.rose.c }}>{remaining}</p>
                                    <p className="text-[11.5px] mt-1 font-semibold m-0" style={{ color: ok ? TRIO.green.c : TRIO.rose.c }}>{ok ? 'Remaining Allowed' : 'Limit Reached'}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </GlassCard>

            {/* New-Joiner Probation banner — paid leave is blocked until the probation window ends */}
            {probationActive && (
                <GlassCard preset="row" accentEdge="amber" className="mt-6 flex items-start gap-3" style={{ backgroundColor: TRIO.amber.bg }}>
                    <IconBox icon="lock" trio={TRIO.amber} size={38} fs="fs-3" />
                    <div>
                        <p className="font-bold text-[15px] m-0" style={{ color: '#8a5a1e' }}>You're in your probation period</p>
                        <p className="text-[13.5px] mt-0.5 leading-normal m-0" style={{ color: '#9a6a2e' }}>
                            {probationCfg.allowUnpaid
                                ? <>Paid leave is not available yet — during probation you can only apply for <strong>Unpaid leave</strong>. Your paid balances below are your yearly entitlement and unlock {probationEndLabel ? <>on <strong>{probationEndLabel}</strong></> : 'after probation ends'}.</>
                                : <>Leave is not available during probation. Your paid balances below are your yearly entitlement and unlock {probationEndLabel ? <>on <strong>{probationEndLabel}</strong></> : 'after probation ends'}.</>}
                        </p>
                    </div>
                </GlassCard>
            )}

            {/* Paid & Unpaid Leave Balance Cards */}
            <div className={`flex flex-col md:flex-row gap-3 mt-6 ${probationActive ? 'opacity-[0.85]' : ''}`}>

                {/* LEFT CARD - Paid Leaves Balance */}
                <GlassCard preset="section" className="flex-1">
                    <div className="flex gap-4 items-start mb-5 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-[18px] tracking-[0.01em] text-slate-900 m-0">Paid Leaves Balance</p>
                            <p className="text-[14px] text-slate-500 mt-1 leading-[1.55] m-0">Your yearly pending leave balance</p>
                        </div>
                        {!fromAdmin && isFiscalYearCurrentOrFuture && (
                            <WtButton inverted onClick={() => setShowConvertModal(true)}
                                startIcon={<KTIcon iconName="arrow-two-diagonals" className="fs-5" />}
                                className="h-11 whitespace-nowrap w-full sm:w-auto">
                                Convert Leaves
                            </WtButton>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {paidLeaves.map((leave: any, index: any) => (
                            <LeaveBalanceItem key={index} label={leave.label} used={leave.used} total={leave.total} color={leave.color} />
                        ))}
                    </div>

                    {/* Total Paid Leaves */}
                    <div className="mt-4 pt-3 border-t-2 flex justify-between items-center" style={{ borderTopColor: BRAND.navy }}>
                        <p className="font-bold text-[14px] text-slate-900 m-0">Total Paid Leaves</p>
                        <p className="font-bold text-[14px] text-slate-900 m-0">{totalPaidUsed}/{totalPaidAssigned}</p>
                    </div>
                </GlassCard>

                {/* RIGHT CARD - Unpaid Leaves Balance */}
                <GlassCard preset="section" className="flex-1">
                    <div className="mb-5">
                        <p className="font-bold text-[18px] tracking-[0.01em] text-slate-900 m-0">Unpaid Leaves Balance</p>
                        <p className="text-[14px] text-slate-500 mt-1 leading-[1.55] m-0">Your yearly unpaid leave usage</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {unpaidLeaves.map((leave: any, index: any) => (
                            <LeaveBalanceItem key={index} label={leave.label} used={leave.used} total={leave.total} color={leave.color} />
                        ))}
                    </div>

                    {/* Total Unpaid Leaves */}
                    {unpaidLeaves.length > 0 && (
                        <div className="mt-4 pt-3 border-t-2 flex justify-between items-center" style={{ borderTopColor: BRAND.navy }}>
                            <p className="font-bold text-[14px] text-slate-900 m-0">Total Unpaid Leaves</p>
                            <p className="font-bold text-[14px] text-slate-900 m-0">{totalUnpaidUsed}/{totalUnpaidAssigned}</p>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Grand Total - Paid + Unpaid */}
            <GlassCard preset="row" className="mt-3 px-5 py-4 border-2 flex justify-between items-center gap-2" style={{ borderColor: BRAND.navy }}>
                <p className="font-extrabold text-[16px] tracking-[0.01em] m-0" style={{ color: BRAND.navy }}>Total Leaves (Paid + Unpaid)</p>
                <p className="font-extrabold text-[16px] m-0" style={{ color: BRAND.navy }}>{grandTotalUsed}/{grandTotalAssigned}</p>
            </GlassCard>

            <ConvertLeavesModal
                show={showConvertModal}
                onHide={() => setShowConvertModal(false)}
                leaveBalances={availableLeaves}
                onSuccess={() => {
                    setShowConvertModal(false);
                    setShouldShowConvertButton(false);
                }}
            />

            <EncashTransferLeavesModal
                show={showEncashTransferModal}
                onHide={() => setShowEncashTransferModal(false)}
                leaveBalances={availableLeaves}
                onSuccess={() => {
                    setShowEncashTransferModal(false);
                }}
            />

        </>
    );
};

export default BalanceProgress;
