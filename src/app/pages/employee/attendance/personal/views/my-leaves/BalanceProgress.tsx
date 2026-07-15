import { Status } from "@constants/statistics";
import { toAbsoluteUrl } from "@metronic/helpers";
import { CustomLeaves, Leaves } from "@models/employee";
import { saveLeaves } from "@redux/slices/attendanceStats";
import { RootState, store } from "@redux/store";
import { fetchPublicHolidays, fetchLeaveOptions } from "@services/company";
import { fetchEmployeeLeaveBalance, fetchEmployeeLeaves, getAllLeaveManagements } from "@services/employee";
import { fetchAllAddonLeavesAllowances } from "@services/addonLeavesAllowance";
import { hasPermission } from "@utils/authAbac";
import { parseWorkingDays } from "@utils/workingDays";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { customLeaves, filterLeavesPublicHolidays, handleDatesChange, leavesBalance } from "@utils/statistics";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Card } from "react-bootstrap";
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
                const { data: { leavesSummary } } = balanceResponse;
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
        () => calculateCumulativeSummary(cumulativeInputs.totalNonMaternalPaidAllocated, cumulativeInputs.takenIncludingPendingByType, fiscalStartMonth),
        [cumulativeInputs, fiscalStartMonth]
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
            <div
                style={{
                    display: "flex",
                    justifyContent: window.innerWidth < 576 ? "center" : "flex-end",
                }}
            >
            </div>

            {approvedRequestInfo && (
                <div className="mt-4 mb-0">
                    {approvedRequestInfo.transfer && (
                        <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '13px', borderLeft: '3px solid #0dcaf0' }}>
                            <i className="bi bi-info-circle me-2"></i>
                            <span>
                                Your leave transfer request has been approved.
                                {approvedRequestInfo.transfer.leaveTypeIds && Array.isArray(approvedRequestInfo.transfer.leaveTypeIds) && approvedRequestInfo.transfer.leaveTypeIds.length > 0 && (
                                    <> {approvedRequestInfo.transfer.leaveTypeIds.map((item: any, idx: number) => (
                                        <span key={idx}>
                                            {idx > 0 && ', '}
                                            {item.count} {item.leaveType}
                                        </span>
                                    ))} have been carried forward to the next fiscal year.</>
                                )}
                            </span>
                        </div>
                    )}
                    {approvedRequestInfo.encash && (
                        <div className="alert alert-success py-2 px-3 mb-0" style={{ fontSize: '13px', borderLeft: '3px solid #198754' }}>
                            <i className="bi bi-cash-coin me-2"></i>
                            <span>
                                Your leave encashment request has been approved.
                                {approvedRequestInfo.encash.leaveTypeIds && Array.isArray(approvedRequestInfo.encash.leaveTypeIds) && approvedRequestInfo.encash.leaveTypeIds.length > 0 && (
                                    <> {approvedRequestInfo.encash.leaveTypeIds.map((item: any, idx: number) => (
                                        <span key={idx}>
                                            {idx > 0 && ', '}
                                            {item.count} {item.leaveType}
                                        </span>
                                    ))} will be processed in your next salary.</>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <Card className="mt-4" style={{
                padding: '24px',
                borderRadius: '8px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb'
            }}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center" style={{
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <i className="bi bi-calendar-check" style={{ fontSize: '20px', color: '#0d6efd' }}></i>
                            <h5 className="mb-0" style={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: '600',
                                fontSize: '18px',
                                color: '#1a1a1a'
                            }}>Cumulative Leave Allowance</h5>
                        </div>
                        <p className="mb-0" style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            color: '#6b7280',
                            lineHeight: '1.6',
                            paddingLeft: '32px'
                        }}>
                            Leaves are distributed across the fiscal year. Allowed usage grows each month — you can use what is allowed till the current period.
                        </p>
                    </div>

                    <div className="d-flex flex-column flex-sm-row align-items-center" style={{
                        gap: '16px',
                        flex: '0 1 auto'
                    }}>
                        {(() => {
                            const { allowedTillNow, used, remaining } = cumulativeSummary;
                            return (
                                <>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '32px',
                                            fontWeight: '700',
                                            color: '#1a1a1a',
                                            lineHeight: '1'
                                        }}>
                                            {used}<span style={{ fontSize: '24px', color: '#9ca3af' }}> / {allowedTillNow}</span>
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Used Till Date
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '12px 20px',
                                        borderRadius: '8px',
                                        backgroundColor: remaining > 0 ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${remaining > 0 ? '#86efac' : '#fecaca'}`,
                                        minWidth: '140px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '20px',
                                            fontWeight: '700',
                                            color: remaining > 0 ? '#059669' : '#dc2626',
                                            lineHeight: '1'
                                        }}>
                                            {remaining}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            color: remaining > 0 ? '#059669' : '#dc2626',
                                            marginTop: '4px',
                                            fontWeight: '500'
                                        }}>
                                            {remaining > 0 ? 'Remaining Allowed' : 'Limit Reached'}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </Card>

            {/* Paid & Unpaid Leave Balance Cards */}
            <div className='d-flex flex-column flex-md-row' style={{ gap: '12px' }}>

                {/* LEFT CARD - Paid Leaves Balance */}
                <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <h5 className="mb-0" style={{
                                fontFamily: 'Barlow, sans-serif',
                                fontWeight: '600',
                                fontSize: '18px',
                                letterSpacing: '0.18px',
                                color: '#000'
                            }}>Paid Leaves Balance</h5>
                            <p className="mb-0" style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                color: '#7a8597',
                                marginTop: '4px',
                                lineHeight: '1.56'
                            }}>Your yearly pending leave balance</p>
                        </div>
                        {!fromAdmin && isFiscalYearCurrentOrFuture && (
                            <button
                                type="button"
                                className="btn"
                                onClick={() => setShowConvertModal(true)}
                                style={{
                                    borderColor: '#1E3A8A',
                                    color: '#1E3A8A',
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    borderRadius: '6px',
                                    border: '1px solid #1E3A8A',
                                    padding: '10px 16px',
                                    height: '44px',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: 'transparent'
                                }}
                            >Convert Leaves</button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {paidLeaves.map((leave: any, index: any) => (
                            <LeaveBalanceItem
                                key={index}
                                label={leave.label}
                                used={leave.used}
                                total={leave.total}
                                color={leave.color}
                            />
                        ))}
                    </div>

                    {/* Total Paid Leaves */}
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '2px solid #1E3A8A',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#000'
                        }}>Total Paid Leaves</span>
                        <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#000'
                        }}>{totalPaidUsed}/{totalPaidAssigned}</span>
                    </div>

                </Card>

                {/* RIGHT CARD - Unpaid Leaves Balance */}
                <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h5 className="mb-0" style={{
                            fontFamily: 'Barlow, sans-serif',
                            fontWeight: '600',
                            fontSize: '18px',
                            letterSpacing: '0.18px',
                            color: '#000'
                        }}>Unpaid Leaves Balance</h5>
                        <p className="mb-0" style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            color: '#7a8597',
                            marginTop: '4px',
                            lineHeight: '1.56'
                        }}>Your yearly unpaid leave usage</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {unpaidLeaves.map((leave: any, index: any) => (
                            <LeaveBalanceItem
                                key={index}
                                label={leave.label}
                                used={leave.used}
                                total={leave.total}
                                color={leave.color}
                            />
                        ))}
                    </div>

                    {/* Total Unpaid Leaves */}
                    {unpaidLeaves.length > 0 && (
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '12px',
                            borderTop: '2px solid #1E3A8A',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: '600',
                                fontSize: '14px',
                                color: '#000'
                            }}>Total Unpaid Leaves</span>
                            <span style={{
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: '600',
                                fontSize: '14px',
                                color: '#000'
                            }}>{totalUnpaidUsed}/{totalUnpaidAssigned}</span>
                        </div>
                    )}
                </Card>
            </div>

            {/* Grand Total - Paid + Unpaid */}
            <Card className="mt-3" style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: '#fff',
                border: '2px solid #1E3A8A'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{
                        fontFamily: 'Barlow, sans-serif',
                        fontWeight: '700',
                        fontSize: '16px',
                        letterSpacing: '0.16px',
                        color: '#1E3A8A'
                    }}>Total Leaves (Paid + Unpaid)</span>
                    <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#1E3A8A'
                    }}>{grandTotalUsed}/{grandTotalAssigned}</span>
                </div>
            </Card>

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
