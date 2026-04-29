// import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES } from "@constants/statistics";
// import { toAbsoluteUrl } from "@metronic/helpers";
// import { CustomLeaves, Leaves } from "@models/employee";
// import { saveLeaves } from "@redux/slices/attendanceStats";
// import { RootState, store } from "@redux/store";
// import { fetchPublicHolidays, fetchLeaveOptions } from "@services/company";
// import { fetchEmployeeLeaveBalance, fetchEmployeeLeaves, getAllLeaveManagements, fetchEmployeeDiscretionaryBalanceById } from "@services/employee";
// import { hasPermission } from "@utils/authAbac";
// import { generateFiscalYearFromGivenYear } from "@utils/file";
// import { customLeaves, filterLeavesPublicHolidays, handleDatesChange, leavesBalance } from "@utils/statistics";
// import { fetchAllAddonLeavesAllowances } from "@services/addonLeavesAllowance";
// import dayjs from "dayjs";
// import { useEffect, useMemo, useState, useCallback } from "react";
// import { Card } from "react-bootstrap";
// import { useDispatch, useSelector } from "react-redux";
// import ConvertLeavesModal from "./ConvertLeavesModal";
// import EncashTransferLeavesModal from "./EncashTransferLeavesModal";
// import MyLeaveManagementRequests from "./MyLeaveManagementRequests";
// import LeaveBalanceItem from "./LeaveBalanceItem";
// import { useEventBus } from "@hooks/useEventBus";
// import { EVENT_KEYS } from "@constants/eventKeys";
// import {
//     getTotalWeekendsBetweenDates,
//     calculateLeavesTakenByType,
//     calculateTransferredLeaves,
//     hasPendingOrApprovedEncashTransfer,
//     calculateLeaveBalances,
//     buildLeaveData,
//     // calculateSummaryCounters,
//     calculateTotalAvailableLeaves
// } from "@utils/balanceProgressUtils";
// import { calculateProRatedMonths } from "@utils/fiscalYearHelper";

// const BalanceProgress = ({ fromAdmin = false, resource, viewOwn = false, viewOthers = false, startDateNew, endDateNew }: { fromAdmin?: boolean, resource: string, viewOwn?: boolean, viewOthers?: boolean, startDateNew: string, endDateNew: string }) => {
//     // console.log("BalanceProgress rendered with props:", { fromAdmin, resource, viewOwn, viewOthers, startDateNew, endDateNew });
//     const dispatch = useDispatch();
//     const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee?.id);

//     const workingAndOffDaysString = useSelector((state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays);
//     const branchWorkingDays = useMemo(() => {
//         return workingAndOffDaysString ? JSON.parse(workingAndOffDaysString) : {}
//     }, [workingAndOffDaysString]);

//     const [currentYear] = useState(new Date().getFullYear() + "");
//     const country = "India";
//     const [leaves, setLeaves] = useState<CustomLeaves[]>([]);
//     const [leaveBalances, setLeaveBalances] = useState<Record<string, number>>({});
//     const [proRatedBalances, setProRatedBalances] = useState<Record<string, number>>({});
//     const [leavesTakenCount, setLeavesTakenCount] = useState<Record<string, number>>({});
//     const [holidays, setHolidays] = useState<number>(0);
//     const [weekendCount, setWeekendCount] = useState<number>(0);
//     const [totalLeaves, setTotalLeaves] = useState<CustomLeaves[]>([]);
//     const [showConvertModal, setShowConvertModal] = useState(false);
//     const [showEncashTransferModal, setShowEncashTransferModal] = useState(false);
//     const [shouldShowConvertButton, setShouldShowConvertButton] = useState(true);
//     const [discretionaryLeaveBalance, setDiscretionaryLeaveBalance] = useState(0);
//     const [discretionaryLeaveBoolean, setDiscretionaryLeaveBoolean] = useState(false);
//     const [approvedRequestInfo, setApprovedRequestInfo] = useState<{ transfer?: any; encash?: any } | null>(null);
//     const [addonLeaveAllowanceCount, setAddonLeaveAllowanceCount] = useState(0);
//     const [allowedPerMonth, setAllowedPerMonth] = useState(1);
//     const [refreshTrigger, setRefreshTrigger] = useState(0);

//     const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
//     const employeeBranchId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.branchId : state.employee.currentEmployee?.branchId);
//     const allowedPerMonthFromState = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.allowedPerMonth : state.employee.currentEmployee?.allowedPerMonth);

//     // Check if we're in the fiscal end month
//     const isInFiscalEndMonth = useMemo(() => {
//         if (!endDateNew) return false;

//         const fiscalEndDate = dayjs(endDateNew);
//         const today = dayjs();

//         // Get the fiscal end month and year
//         const fiscalEndMonth = fiscalEndDate.month(); // 0-11
//         const fiscalEndYear = fiscalEndDate.year();

//         // Get current month and year
//         const currentMonth = today.month(); // 0-11
//         const currentYear = today.year();

//         // Button should show only in the fiscal end month and year
//         return currentMonth === fiscalEndMonth && currentYear === fiscalEndYear;
//     }, [endDateNew]);

//     // Check if the fiscal year is current or future (not past)
//     const isFiscalYearCurrentOrFuture = useMemo(() => {
//         if (!endDateNew) return false;

//         const fiscalEndDate = dayjs(endDateNew);
//         const today = dayjs();

//         // If fiscal year end date is in the future or today, it's current or future
//         return fiscalEndDate.isAfter(today) || fiscalEndDate.isSame(today, 'day');
//     }, [endDateNew]);

//     // Function to refresh leave management data
//     const refreshLeaveManagementData = () => {
//         if (selectedEmployeeId && startDateNew && endDateNew) {
//             getAllLeaveManagements(selectedEmployeeId).then(response => {
//                 const requests = response.data.leaveManagements || [];

//                 // Check if there's any pending (0) or approved (1) request
//                 const hasPendingOrApprovedRequest = requests.some(
//                     (req: any) => req.status === 0 || req.status === 1
//                 );

//                 // Calculate leaves being transferred/encashed in current fiscal year
//                 const currentFiscalTransferred: Record<string, number> = {};

//                 // Find ALL TRANSFER requests (not just one)
//                 const currentFiscalTransferRequests = requests.filter((req: any) => {
//                     if (req.managementType !== 'TRANSFER') return false;
//                     if (req.status !== 0 && req.status !== 1) return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 // Find ALL ENCASH requests (not just one)
//                 const currentFiscalEncashRequests = requests.filter((req: any) => {
//                     if (req.managementType !== 'CASH') return false;
//                     if (req.status !== 0 && req.status !== 1) return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 // Add ALL TRANSFER request leaves
//                 currentFiscalTransferRequests.forEach((transferRequest: any) => {
//                     if (transferRequest?.leaveTypeIds && Array.isArray(transferRequest.leaveTypeIds)) {
//                         transferRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
//                             const leaveType = leaveTypeItem.leaveType;
//                             const count = leaveTypeItem.count || 0;
//                             currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
//                         });
//                     }
//                 });

//                 // Add ALL ENCASH request leaves
//                 currentFiscalEncashRequests.forEach((encashRequest: any) => {
//                     if (encashRequest?.leaveTypeIds && Array.isArray(encashRequest.leaveTypeIds)) {
//                         encashRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
//                             const leaveType = leaveTypeItem.leaveType;
//                             const count = leaveTypeItem.count || 0;
//                             currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
//                         });
//                     }
//                 });

//                 setTransferredLeavesInCurrentFiscal(currentFiscalTransferred);
//                 setShouldShowConvertButton(!hasPendingOrApprovedRequest);
//             }).catch(error => {
//                 console.error("Error refreshing leave management requests:", error);
//             });
//         }
//     };

//     // Listen for leave management request created event to refresh data
//     useEventBus(EVENT_KEYS.leaveManagementRequestCreated, refreshLeaveManagementData);

//     // Listen for leave management request updated event to refresh data (approve/reject/revoke)
//     useEventBus(EVENT_KEYS.leaveManagementRequestUpdated, refreshLeaveManagementData);

//     // Function to refresh leave data (for monthly limit card and leave balances)
//     // Wrapped in useCallback to maintain stable reference for event listeners
//     const refreshLeaveData = useCallback(() => {
//         // Increment trigger to force re-fetch of data
//         setRefreshTrigger(prev => prev + 1);
//     }, []); // Empty deps - function doesn't depend on any external values

//     // Listen for leave request events to refresh the monthly limit card
//     useEventBus(EVENT_KEYS.leaveRequestCreated, refreshLeaveData);
//     useEventBus(EVENT_KEYS.leaveRequestUpdated, refreshLeaveData);

//     // Calculate weekends once when startDateNew and endDateNew are set
//     useEffect(() => {
//         if (startDateNew && endDateNew && branchWorkingDays) {
//             const weekends = getTotalWeekendsBetweenDates(branchWorkingDays, startDateNew, endDateNew);
//             setWeekendCount(weekends);
//         }
//     }, [startDateNew, endDateNew, branchWorkingDays]);

//     // Fetch leave management requests to determine button visibility
//     useEffect(() => {
//         if (!selectedEmployeeId || !startDateNew || !endDateNew) return;

//         async function checkLeaveManagementRequests() {
//             try {
//                 const response = await getAllLeaveManagements(selectedEmployeeId);
//                 const requests = response.data.leaveManagements || [];

//                 // Check if there's any pending (0) or approved (1) request
//                 const hasPendingOrApprovedRequest = requests.some(
//                     (req: any) => req.status === 0 || req.status === 1
//                 );

//                 // Check for approved requests in the CURRENT viewing fiscal year to show info banner
//                 // Find both TRANSFER and ENCASH approved requests
//                 const approvedTransferRequest = requests.find((req: any) => {
//                     if (req.status !== 1) return false;
//                     if (req.managementType !== 'TRANSFER') return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 const approvedEncashRequest = requests.find((req: any) => {
//                     if (req.status !== 1) return false;
//                     if (req.managementType !== 'CASH') return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 if (approvedTransferRequest || approvedEncashRequest) {
//                     setApprovedRequestInfo({
//                         transfer: approvedTransferRequest,
//                         encash: approvedEncashRequest
//                     });
//                 } else {
//                     setApprovedRequestInfo(null);
//                 }

//                 // Calculate leaves being transferred/encashed in current fiscal year (for modal display)
//                 const currentFiscalTransferred: Record<string, number> = {};

//                 // Find ALL TRANSFER requests (not just one)
//                 const currentFiscalTransferRequests = requests.filter((req: any) => {
//                     if (req.managementType !== 'TRANSFER') return false;
//                     if (req.status !== 0 && req.status !== 1) return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 // Find ALL ENCASH requests (not just one)
//                 const currentFiscalEncashRequests = requests.filter((req: any) => {
//                     if (req.managementType !== 'CASH') return false;
//                     if (req.status !== 0 && req.status !== 1) return false;

//                     const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
//                     return createdDate >= startDateNew && createdDate <= endDateNew;
//                 });

//                 // Add ALL TRANSFER request leaves
//                 currentFiscalTransferRequests.forEach((transferRequest: any) => {
//                     if (transferRequest?.leaveTypeIds && Array.isArray(transferRequest.leaveTypeIds)) {
//                         transferRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
//                             const leaveType = leaveTypeItem.leaveType;
//                             const count = leaveTypeItem.count || 0;
//                             currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
//                         });
//                     }
//                 });

//                 // Add ALL ENCASH request leaves
//                 currentFiscalEncashRequests.forEach((encashRequest: any) => {
//                     if (encashRequest?.leaveTypeIds && Array.isArray(encashRequest.leaveTypeIds)) {
//                         encashRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
//                             const leaveType = leaveTypeItem.leaveType;
//                             const count = leaveTypeItem.count || 0;
//                             currentFiscalTransferred[leaveType] = (currentFiscalTransferred[leaveType] || 0) + count;
//                         });
//                     }
//                 });

//                 setTransferredLeavesInCurrentFiscal(currentFiscalTransferred);

//                 // Show button only if there are no pending/approved requests
//                 setShouldShowConvertButton(!hasPendingOrApprovedRequest);
//             } catch (error) {
//                 console.error("Error fetching leave management requests:", error);
//                 // On error, show the button to allow user to try
//                 setShouldShowConvertButton(true);
//                 setApprovedRequestInfo(null);
//             }
//         }

//         checkLeaveManagementRequests();
//     }, [selectedEmployeeId, startDateNew, endDateNew]);

//     useEffect(() => {
//         if (!startDateNew || !endDateNew || !selectedEmployeeId) {
//             return;
//         }

//         async function fetchData() {
//             try {
//                 const [leavesResponse, holidaysResponse, balanceResponse, leaveOptionsResponse, addonAllowancesResponse, response] = await Promise.all([
//                     fetchEmployeeLeaves(selectedEmployeeId),
//                     fetchPublicHolidays(currentYear, country),
//                     fetchEmployeeLeaveBalance(selectedEmployeeId),
//                     fetchLeaveOptions(),
//                     fetchAllAddonLeavesAllowances(),
//                     fetchEmployeeDiscretionaryBalanceById(selectedEmployeeId)
//                 ]);

//                 const { data: { leaves } } = leavesResponse;
//                 const { data: { publicHolidays } } = holidaysResponse;
//                 const { data: { leavesSummary } } = balanceResponse;
//                 const { data: { leaveOptions } } = leaveOptionsResponse;
//                 const { data: { employee } } = response;
//                 setDiscretionaryLeaveBalance(employee?.discretionaryLeaveBalance);
//                 setDiscretionaryLeaveBoolean(employee?.discretionaryLeaveBoolean);
//                 setAllowedPerMonth(employee?.allowedPerMonth || allowedPerMonthFromState || 1);

//                 const discretionaryLeaveBalances = employee?.discretionaryLeaveBalance;
//                 const discretionaryLeaveBooleans = employee?.discretionaryLeaveBoolean;

//                 // Process leaves data
//                 const processedLeaves = await customLeaves(leaves);

//                 // Filter leaves by date range
//                 const filteredLeaves = processedLeaves.filter(
//                     leave => {
//                         const leaveDate = leave.date || leave.dateFrom;
//                         return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
//                     }
//                 );

//                 // Set state and dispatch to Redux store
//                 setTotalLeaves(processedLeaves);
//                 dispatch(saveLeaves(processedLeaves));
//                 setLeaves(filteredLeaves);
//                 setHolidays(publicHolidays.length);

//                 // Filter leave options by branch

//                 const leaveOptionsData = leaveOptions.filter(
//                     (option: any) => option.branchId === employeeBranchId
//                 );

//                 const allLeaveOption = leaveOptionsData.map((option: any) => {
//                     const isCasual = discretionaryLeaveBooleans && option.leaveType.toLowerCase().includes(CASUAL_LEAVES.toLowerCase());
//                     const discretionaryExtra = isCasual ? Number(discretionaryLeaveBalances ?? 0) : 0;
//                     const finalNumberOfDays = (Number(option.numberOfDays) || 0) + discretionaryExtra;
//                     return {
//                         ...option,
//                         numberOfDays: finalNumberOfDays,
//                         isDiscretionaryApplied: isCasual,
//                     };
//                 });

//                 // Get current fiscal year dates
//                 const { startDate: fiscalYearStartDate, endDate: fiscalYearEndDate } =
//                     await generateFiscalYearFromGivenYear(dayjs(), fromAdmin);

//                 // Calculate pro-rated months based on joining date
//                 // For mid-year joiners: uses remaining months
//                 // For employees present since FY start: uses elapsed months
//                 const proRatedMonths = calculateProRatedMonths(
//                     dayjs(dateOfJoining),
//                     dayjs(fiscalYearStartDate),
//                     dayjs(fiscalYearEndDate),
//                     dayjs()
//                 );

//                 // Calculate addon leave allowance
//                 // Experience-based leaves are distributed at the start of fiscal year
//                 // Calculate experience as of the fiscal year START date
//                 let addonLeaveAllowanceCount = 0;
//                 const experienceAtFiscalStart = dayjs(startDateNew).diff(dayjs(dateOfJoining).format('YYYY-MM-DD'), 'year');

//                 if (!addonAllowancesResponse?.hasError) {
//                     const addonAllowance = addonAllowancesResponse.data.addonLeavesAllowances.find(
//                         (addon: any) => addon.experienceInCompany === experienceAtFiscalStart
//                     );
//                     if (addonAllowance) {
//                         addonLeaveAllowanceCount = addonAllowance?.addonLeavesCount || 0;
//                         setAddonLeaveAllowanceCount(addonLeaveAllowanceCount);

//                     }
//                 }
//                 // console.log("addonLeaveAllowanceCount",addonLeaveAllowanceCount);
//                 // console.log("experienceInCompany",experienceInCompany);

//                 // Filter by fiscal year date range (startDateNew to endDateNew)
//                 // NOTE: We use ALL leaves (not filtered by branch) because employees may have taken leaves
//                 // with leave types from previous branch configurations or other scenarios
//                 const fiscalYearFilteredLeaves = processedLeaves.filter((leave: any) => {
//                     const leaveDate = leave.dateFrom || leave.date;
//                     return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
//                 });

//                 // Calculate leaves taken by type
//                 const leavesTaken = calculateLeavesTakenByType(fiscalYearFilteredLeaves);

//                 // Fetch TRANSFER requests
//                 const transferResponse = await getAllLeaveManagements(selectedEmployeeId);
//                 const transferRequests = transferResponse.data.leaveManagements || [];

//                 // Check if there's a pending or approved encash/transfer
//                 const hasPendingOrApprovedTransfer = await hasPendingOrApprovedEncashTransfer(
//                     transferRequests,
//                     startDateNew,
//                     endDateNew
//                 );

//                 // Calculate transferred leaves (only if no pending/approved transfer exists)
//                 const transferredLeaves = hasPendingOrApprovedTransfer
//                     ? {}
//                     : await calculateTransferredLeaves(transferRequests, startDateNew, endDateNew);

//                 // Build branch leave balances map
//                 const branchLeaveBalances: Record<string, number> = {};
//                 allLeaveOption.forEach((option: any) => {
//                     branchLeaveBalances[option.leaveType] = option.numberOfDays;
//                 });

//                 // Calculate tenure months (for Annual Leaves)
//                 // If employee joined before fiscal year start, count from fiscal year start
//                 // If employee joined after fiscal year start, count from joining date
//                 // This ensures the count resets every April 1st
//                 // For past/future fiscal years, calculate as of the fiscal year end date
//                 const joiningDate = dayjs(dateOfJoining);
//                 const fiscalStart = dayjs(fiscalYearStartDate);
//                 const fiscalEnd = dayjs(fiscalYearEndDate);
//                 const today = dayjs();

//                 // Use the appropriate end date for calculation
//                 // If viewing current fiscal year and it's not ended yet, use today
//                 // Otherwise, use the fiscal year end date
//                 const calculationDate = fiscalEnd.isAfter(today) && fiscalStart.isBefore(today)
//                     ? today
//                     : fiscalEnd;

//                 const startDate = joiningDate.isAfter(fiscalStart) ? joiningDate : fiscalStart;
//                 const tenureMonths = calculationDate.diff(startDate, 'month') + 1;

//                 // Calculate leave balances with pro-rating
//                 const { balances, proRated } = calculateLeaveBalances(
//                     branchLeaveBalances,
//                     transferredLeaves,
//                     addonLeaveAllowanceCount,
//                     proRatedMonths,
//                     hasPendingOrApprovedTransfer,
//                     employee?.allowedPerMonth || allowedPerMonthFromState || 1,
//                     tenureMonths
//                 );
//                 setLeaveBalances(balances);
//                 setProRatedBalances(proRated);
//                 setLeavesTakenCount(leavesTaken);

//             } catch (error) {
//                 console.error("Error fetching data:", error);
//             }
//         }

//         fetchData();
//     }, [selectedEmployeeId, startDateNew, endDateNew, currentYear, country, dispatch, employeeBranchId, dateOfJoining, refreshTrigger]);


//     // Use memoization for expensive calculation of leave balances
//     const balanceLeaveMap = useMemo(() =>
//         leavesBalance(leaves.filter(leave => leave.status === Status.Approved)),
//         [totalLeaves]);

//     // const leaveData = useMemo(() => buildLeaveData(leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth),
//     //     [leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth]);

//     const {
//         paidLeaves,
//         unpaidLeaves,
//         totalPaidUsed,
//         totalPaidAssigned,
//         totalUnpaidUsed,
//         totalUnpaidAssigned,
//         grandTotalUsed,
//         grandTotalAssigned
//     } = useMemo(() => buildLeaveData(leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth),
//         [leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth]);

//     const res1 = viewOthers && hasPermission(resource, "readOthers", { employeeId: selectedEmployeeId });
//     const res2 = viewOwn && hasPermission(resource, "readOwn", { employeeId: selectedEmployeeId });
//     // const summaryCounters = useMemo(() => calculateSummaryCounters(leaves, holidays, weekendCount),
//     //     [leaves, holidays, weekendCount]);

//     // Calculate leaves being transferred in current fiscal year (to subtract from modal display)
//     const [transferredLeavesInCurrentFiscal, setTransferredLeavesInCurrentFiscal] = useState<Record<string, number>>({});

//     const availableLeaves = useMemo(() =>
//         calculateTotalAvailableLeaves(proRatedBalances, leaveBalances, leavesTakenCount, transferredLeavesInCurrentFiscal),
//         [proRatedBalances, leaveBalances, leavesTakenCount, transferredLeavesInCurrentFiscal]
//     );

//     if (!res2 && !res1) {
//         return null;
//     }

//     return (
//         <>
//             <div
//                 style={{
//                     display: "flex",
//                     justifyContent: window.innerWidth < 576 ? "center" : "flex-end",
//                 }}
//             >
//                 {/* <DateNavigation fiscalYear={fiscalYear} setYear={setYear} /> */}
//             </div>

//             {approvedRequestInfo && (
//                 <div className="mt-4 mb-0">
//                     {approvedRequestInfo.transfer && (
//                         <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: '13px', borderLeft: '3px solid #0dcaf0' }}>
//                             <i className="bi bi-info-circle me-2"></i>
//                             <span>
//                                 Your leave transfer request has been approved.
//                                 {approvedRequestInfo.transfer.leaveTypeIds && Array.isArray(approvedRequestInfo.transfer.leaveTypeIds) && approvedRequestInfo.transfer.leaveTypeIds.length > 0 && (
//                                     <> {approvedRequestInfo.transfer.leaveTypeIds.map((item: any, idx: number) => (
//                                         <span key={idx}>
//                                             {idx > 0 && ', '}
//                                             {item.count} {item.leaveType}
//                                         </span>
//                                     ))} have been carried forward to the next fiscal year.</>
//                                 )}
//                             </span>
//                         </div>
//                     )}
//                     {approvedRequestInfo.encash && (
//                         <div className="alert alert-success py-2 px-3 mb-0" style={{ fontSize: '13px', borderLeft: '3px solid #198754' }}>
//                             <i className="bi bi-cash-coin me-2"></i>
//                             <span>
//                                 Your leave encashment request has been approved.
//                                 {approvedRequestInfo.encash.leaveTypeIds && Array.isArray(approvedRequestInfo.encash.leaveTypeIds) && approvedRequestInfo.encash.leaveTypeIds.length > 0 && (
//                                     <> {approvedRequestInfo.encash.leaveTypeIds.map((item: any, idx: number) => (
//                                         <span key={idx}>
//                                             {idx > 0 && ', '}
//                                             {item.count} {item.leaveType}
//                                         </span>
//                                     ))} will be processed in your next salary.</>
//                                 )}
//                             </span>
//                         </div>
//                     )}
//                 </div>
//             )}

//             {/* Monthly Limit Card - Shows combined usage across all leave types */}
//             <Card className="mt-4" style={{
//                 padding: '24px',
//                 borderRadius: '8px',
//                 backgroundColor: '#fff',
//                 boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
//                 border: '1px solid #e5e7eb'
//             }}>
//                 <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center" style={{
//                     flexWrap: 'wrap',
//                     gap: '16px'
//                 }}>
//                     {/* Left section - Info */}
//                     <div style={{ flex: '1 1 auto', minWidth: '0' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
//                             <i className="bi bi-calendar-check" style={{ fontSize: '20px', color: '#0d6efd' }}></i>
//                             <h5 className="mb-0" style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '18px',
//                                 color: '#1a1a1a'
//                             }}>Monthly Leave Limit</h5>
//                         </div>
//                         <p className="mb-0" style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontSize: '14px',
//                             color: '#6b7280',
//                             lineHeight: '1.6',
//                             paddingLeft: '32px'
//                         }}>
//                             Combined across all paid leave types (Annual, Sick, Casual, Paid, Maternal)
//                         </p>
//                     </div>

//                     {/* Right section - Stats */}
//                     <div className="d-flex flex-column flex-sm-row align-items-center" style={{
//                         gap: '16px',
//                         flex: '0 1 auto'
//                     }}>
//                         {(() => {
//                             // Calculate current month usage
//                             const currentMonth = dayjs().format('YYYY-MM');
//                             const countedLeaveTypes = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];
//                             let monthUsage = 0;

//                             leaves.filter((leave: any) => {
//                                 const leaveType = leave.leaveOptions?.leaveType;

//                                 // Use case-insensitive comparison with trimmed strings
//                                 const normalizedLeaveType = leaveType?.trim().toLowerCase();
//                                 const isCountedType = countedLeaveTypes.some(
//                                     type => type.trim().toLowerCase() === normalizedLeaveType
//                                 );
//                                 const isApprovedOrPending = leave.status === Status.Approved || leave.status === Status.ApprovalNeeded;

//                                 return isCountedType && isApprovedOrPending;
//                             }).forEach((leave: any) => {
//                                 const leaveFromDate = dayjs(leave.dateFrom);
//                                 const leaveToDate = dayjs(leave.dateTo);
//                                 let leaveDate = leaveFromDate;

//                                 while (leaveDate.isBefore(leaveToDate) || leaveDate.isSame(leaveToDate, 'day')) {
//                                     if (leaveDate.format('YYYY-MM') === currentMonth) {
//                                         const dayOfWeek = leaveDate.day();
//                                         if (dayOfWeek !== 0 && dayOfWeek !== 6) {
//                                             monthUsage++;
//                                         }
//                                     }
//                                     leaveDate = leaveDate.add(1, 'day');
//                                 }
//                             });

//                             const remaining = allowedPerMonth - monthUsage;
//                             const percentage = (monthUsage / allowedPerMonth) * 100;

//                             return (
//                                 <>
//                                     {/* Usage fraction */}
//                                     <div style={{ textAlign: 'center' }}>
//                                         <div style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontSize: '32px',
//                                             fontWeight: '700',
//                                             color: '#1a1a1a',
//                                             lineHeight: '1'
//                                         }}>
//                                             {monthUsage}<span style={{ fontSize: '24px', color: '#9ca3af' }}> / {allowedPerMonth}</span>
//                                         </div>
//                                         <div style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontSize: '12px',
//                                             color: '#6b7280',
//                                             marginTop: '4px',
//                                             textTransform: 'uppercase',
//                                             letterSpacing: '0.5px'
//                                         }}>
//                                             Used This Month
//                                         </div>
//                                     </div>

//                                     {/* Remaining badge */}
//                                     <div style={{
//                                         padding: '12px 20px',
//                                         borderRadius: '8px',
//                                         backgroundColor: remaining > 0 ? '#f0fdf4' : '#fef2f2',
//                                         border: `1px solid ${remaining > 0 ? '#86efac' : '#fecaca'}`,
//                                         minWidth: '140px',
//                                         textAlign: 'center'
//                                     }}>
//                                         <div style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontSize: '20px',
//                                             fontWeight: '700',
//                                             color: remaining > 0 ? '#059669' : '#dc2626',
//                                             lineHeight: '1'
//                                         }}>
//                                             {remaining > 0 ? remaining : 0}
//                                         </div>
//                                         <div style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontSize: '12px',
//                                             color: remaining > 0 ? '#059669' : '#dc2626',
//                                             marginTop: '4px',
//                                             fontWeight: '500'
//                                         }}>
//                                             {remaining > 0 ? 'Remaining' : 'Limit Reached'}
//                                         </div>
//                                     </div>
//                                 </>
//                             );
//                         })()}
//                     </div>
//                 </div>
//             </Card>

//             {/* leave balances and summary cards  */}
//             {/* <div className='d-flex flex-column flex-md-row' style={{ gap: '12px' }}>

//                 <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
//                         <div style={{ flex: 1 }}>
//                             <h5 className="mb-0" style={{
//                                 fontFamily: 'Barlow, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '18px',
//                                 letterSpacing: '0.18px',
//                                 color: '#000'
//                             }}>Paid Leaves Balance</h5>
//                             <p className="mb-0" style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontSize: '14px',
//                                 color: '#7a8597',
//                                 marginTop: '4px',
//                                 lineHeight: '1.56'
//                             }}>Your yearly pending paid leave balance</p>
//                         </div>
//                         {!fromAdmin && isFiscalYearCurrentOrFuture && (
//                             <button
//                                 type="button"
//                                 className="btn"
//                                 onClick={() => setShowConvertModal(true)}
//                                 style={{
//                                     borderColor: '#9d4141',
//                                     color: '#9d4141',
//                                     fontFamily: 'Inter, sans-serif',
//                                     fontSize: '14px',
//                                     fontWeight: '500',
//                                     borderRadius: '6px',
//                                     border: '1px solid #9d4141',
//                                     padding: '10px 16px',
//                                     height: '44px',
//                                     whiteSpace: 'nowrap',
//                                     backgroundColor: 'transparent'
//                                 }}
//                             >Convert Leaves</button>
//                         )}
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                         {leaveData.map((leave: any, index: any) => {
//                             return (
//                             <LeaveBalanceItem
//                                 key={index}
//                                 label={leave.label}
//                                 used={leave.used}
//                                 total={leave.total}
//                                 color={leave.color}
//                                 discretionaryLeaveBalance={discretionaryLeaveBoolean === true ? Number(discretionaryLeaveBalance ?? 0) : 0}
//                                 allowedPerMonth={leave.allowedPerMonth}
//                                 showAllowedPerMonth={leave.showAllowedPerMonth}
//                             />
//                         )})}
//                     </div>
//                 </Card>

//                 <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ marginBottom: '20px' }}>
//                         <h5 className="mb-0" style={{
//                             fontFamily: 'Barlow, sans-serif',
//                             fontWeight: '600',
//                             fontSize: '18px',
//                             letterSpacing: '0.18px',
//                             color: '#000'
//                         }}>Unpaid Leaves Balance</h5>
//                         <p className="mb-0" style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontSize: '14px',
//                             color: '#7a8597',
//                             marginTop: '4px',
//                             lineHeight: '1.56'
//                         }}>Your yearly pending unpaid leave balance</p>
//                     </div>

//                     <div>
//                         <LeaveBalanceItem
//                             label="Unpaid Leaves"
//                             used={leaveBalances[UNPAID_LEAVES] ? leaveBalances[UNPAID_LEAVES].used : 0}
//                             total={leaveBalances[UNPAID_LEAVES] ? leaveBalances[UNPAID_LEAVES].total : 0}
//                             color="#f44336"
//                         />
//                     </div>

//                     {/* <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//                         {summaryCounters.map((item: any, idx: any) => {
//                             // Determine if this is the last item (odd one out)
//                             const isLastOddItem = idx === summaryCounters.length - 1 && summaryCounters.length % 2 !== 0;

//                             // If it's an even index and not the last odd item, create a row with two items
//                             if (idx % 2 === 0 && !isLastOddItem) {
//                                 const nextItem = summaryCounters[idx + 1];
//                                 return (
//                                     <div key={idx} style={{ display: 'flex', gap: '12px' }}>
//                                         <div style={{
//                                             flex: 1,
//                                             border: "1px solid #c1cbd9",
//                                             borderRadius: "8px",
//                                             padding: "12px",
//                                             height: '48px',
//                                             display: "flex",
//                                             justifyContent: "space-between",
//                                             alignItems: "center",
//                                         }}>
//                                             <span style={{
//                                                 fontFamily: 'Inter, sans-serif',
//                                                 fontSize: '14px',
//                                                 color: '#000',
//                                                 whiteSpace: 'nowrap'
//                                             }}>{item.label}</span>
//                                             <span style={{
//                                                 fontFamily: 'Inter, sans-serif',
//                                                 fontWeight: '500',
//                                                 fontSize: '14px',
//                                                 color: '#000'
//                                             }}>{item.value}</span>
//                                         </div>
//                                         {nextItem && (
//                                             <div style={{
//                                                 flex: 1,
//                                                 border: "1px solid #c1cbd9",
//                                                 borderRadius: "8px",
//                                                 padding: "12px",
//                                                 height: '48px',
//                                                 display: "flex",
//                                                 justifyContent: "space-between",
//                                                 alignItems: "center",
//                                             }}>
//                                                 <span style={{
//                                                     fontFamily: 'Inter, sans-serif',
//                                                     fontSize: '14px',
//                                                     color: '#000',
//                                                     whiteSpace: 'nowrap'
//                                                 }}>{nextItem.label}</span>
//                                                 <span style={{
//                                                     fontFamily: 'Inter, sans-serif',
//                                                     fontWeight: '500',
//                                                     fontSize: '14px',
//                                                     color: '#000'
//                                                 }}>{nextItem.value}</span>
//                                             </div>
//                                         )}
//                                     </div>
//                                 );
//                             } else if (isLastOddItem) {
//                                 // Last odd item takes only necessary width (not full width)
//                                 return (
//                                     <div key={idx} style={{
//                                         border: "1px solid #c1cbd9",
//                                         borderRadius: "8px",
//                                         padding: "12px",
//                                         height: '48px',
//                                         display: "flex",
//                                         justifyContent: "space-between",
//                                         alignItems: "center",
//                                         width: '100%',
//                                         maxWidth: '242px'
//                                     }}>
//                                         <span style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontSize: '14px',
//                                             color: '#000',
//                                             whiteSpace: 'nowrap'
//                                         }}>{item.label}</span>
//                                         <span style={{
//                                             fontFamily: 'Inter, sans-serif',
//                                             fontWeight: '500',
//                                             fontSize: '14px',
//                                             color: '#000'
//                                         }}>{item.value}</span>
//                                     </div>
//                                 );
//                             }
//                             // Skip odd indices as they're already rendered with their even pair
//                             return null;
//                         })}
//                     </div> */}
//             {/* </Card> */}
//             {/* // </div> */}

//             {/* leave balances - paid and unpaid cards */}
//             {/* <div className='d-flex flex-column flex-md-row' style={{ gap: '12px' }}>

//                 {/* LEFT CARD - Paid Leaves Balance */}
//                 {/* <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
//                         <div style={{ flex: 1 }}>
//                             <h5 className="mb-0" style={{
//                                 fontFamily: 'Barlow, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '18px',
//                                 letterSpacing: '0.18px',
//                                 color: '#000'
//                             }}>Paid Leaves Balance</h5>
//                             <p className="mb-0" style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontSize: '14px',
//                                 color: '#7a8597',
//                                 marginTop: '4px',
//                                 lineHeight: '1.56'
//                             }}>Your yearly pending leave balance</p>
//                         </div>
//                         {!fromAdmin && isFiscalYearCurrentOrFuture && (
//                             <button
//                                 type="button"
//                                 className="btn"
//                                 onClick={() => setShowConvertModal(true)}
//                                 style={{
//                                     borderColor: '#9d4141',
//                                     color: '#9d4141',
//                                     fontFamily: 'Inter, sans-serif',
//                                     fontSize: '14px',
//                                     fontWeight: '500',
//                                     borderRadius: '6px',
//                                     border: '1px solid #9d4141',
//                                     padding: '10px 16px',
//                                     height: '44px',
//                                     whiteSpace: 'nowrap',
//                                     backgroundColor: 'transparent'
//                                 }}
//                             >Convert Leaves</button>
//                         )}
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                         {paidLeaves.map((leave: any, index: any) => {
//                             return (
//                                 <LeaveBalanceItem
//                                     key={index}
//                                     label={leave.label}
//                                     used={leave.used}
//                                     total={leave.total}
//                                     color={leave.color}
//                                     discretionaryLeaveBalance={discretionaryLeaveBoolean === true ? Number(discretionaryLeaveBalance ?? 0) : 0}
//                                     allowedPerMonth={leave.allowedPerMonth}
//                                     showAllowedPerMonth={leave.showAllowedPerMonth}
//                                 />
//                             )
//                         })}
//                     </div>
//                 </Card> */}

//                 {/* RIGHT CARD - Unpaid Leaves Balance */}
//                 {/* <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ marginBottom: '20px' }}>
//                         <h5 className="mb-0" style={{
//                             fontFamily: 'Barlow, sans-serif',
//                             fontWeight: '600',
//                             fontSize: '18px',
//                             letterSpacing: '0.18px',
//                             color: '#000'
//                         }}>Unpaid Leaves Balance</h5>
//                         <p className="mb-0" style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontSize: '14px',
//                             color: '#7a8597',
//                             marginTop: '4px',
//                             lineHeight: '1.56'
//                         }}>Your yearly unpaid leave usage</p>
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                         {unpaidLeaves.map((leave: any, index: any) => {
//                             return (
//                                 <LeaveBalanceItem
//                                     key={index}
//                                     label={leave.label}
//                                     used={leave.used}
//                                     total={leave.total}
//                                     color={leave.color}
//                                     discretionaryLeaveBalance={0}
//                                     allowedPerMonth={undefined}
//                                     showAllowedPerMonth={leave.showAllowedPerMonth}
//                                 />
//                             )
//                         })}
//                     </div>
//                 </Card> */}
//             {/* </div> */}

//                         {/* leave balances - paid and unpaid cards */}
//             <div className='d-flex flex-column flex-md-row' style={{ gap: '12px' }}>

//                 {/* LEFT CARD - Paid Leaves Balance */}
//                 <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
//                         <div style={{ flex: 1 }}>
//                             <h5 className="mb-0" style={{
//                                 fontFamily: 'Barlow, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '18px',
//                                 letterSpacing: '0.18px',
//                                 color: '#000'
//                             }}>Paid Leaves Balance</h5>
//                             <p className="mb-0" style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontSize: '14px',
//                                 color: '#7a8597',
//                                 marginTop: '4px',
//                                 lineHeight: '1.56'
//                             }}>Your yearly pending leave balance</p>
//                         </div>
//                         {!fromAdmin && isFiscalYearCurrentOrFuture && (
//                             <button
//                                 type="button"
//                                 className="btn"
//                                 onClick={() => setShowConvertModal(true)}
//                                 style={{
//                                     borderColor: '#9d4141',
//                                     color: '#9d4141',
//                                     fontFamily: 'Inter, sans-serif',
//                                     fontSize: '14px',
//                                     fontWeight: '500',
//                                     borderRadius: '6px',
//                                     border: '1px solid #9d4141',
//                                     padding: '10px 16px',
//                                     height: '44px',
//                                     whiteSpace: 'nowrap',
//                                     backgroundColor: 'transparent'
//                                 }}
//                             >Convert Leaves</button>
//                         )}
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                         {paidLeaves.map((leave: any, index: any) => (
//                             <LeaveBalanceItem
//                                 key={index}
//                                 label={leave.label}
//                                 used={leave.used}
//                                 total={leave.total}
//                                 color={leave.color}
//                                 discretionaryLeaveBalance={discretionaryLeaveBoolean === true ? Number(discretionaryLeaveBalance ?? 0) : 0}
//                                 allowedPerMonth={leave.allowedPerMonth}
//                                 showAllowedPerMonth={leave.showAllowedPerMonth}
//                             />
//                         ))}
//                     </div>

//                     {/* Total Paid Leaves */}
//                     <div style={{
//                         marginTop: '16px',
//                         paddingTop: '12px',
//                         borderTop: '1px solid #e5e7eb',
//                         display: 'flex',
//                         justifyContent: 'space-between',
//                         alignItems: 'center'
//                     }}>
//                         <span style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontWeight: '600',
//                             fontSize: '14px',
//                             color: '#1a1a1a'
//                         }}>Total Paid Leaves</span>
//                         <span style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontWeight: '600',
//                             fontSize: '14px',
//                             color: '#1a1a1a'
//                         }}>{totalPaidUsed}/{totalPaidAssigned}</span>
//                     </div>
//                 </Card>

//                 {/* RIGHT CARD - Unpaid Leaves Balance */}
//                 <Card className="mt-4" style={{ flex: 1, padding: '20px', borderRadius: '12px' }}>
//                     <div style={{ marginBottom: '20px' }}>
//                         <h5 className="mb-0" style={{
//                             fontFamily: 'Barlow, sans-serif',
//                             fontWeight: '600',
//                             fontSize: '18px',
//                             letterSpacing: '0.18px',
//                             color: '#000'
//                         }}>Unpaid Leaves Balance</h5>
//                         <p className="mb-0" style={{
//                             fontFamily: 'Inter, sans-serif',
//                             fontSize: '14px',
//                             color: '#7a8597',
//                             marginTop: '4px',
//                             lineHeight: '1.56'
//                         }}>Your yearly unpaid leave usage</p>
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                         {unpaidLeaves.map((leave: any, index: any) => (
//                             <LeaveBalanceItem
//                                 key={index}
//                                 label={leave.label}
//                                 used={leave.used}
//                                 total={leave.total}
//                                 color={leave.color}
//                                 discretionaryLeaveBalance={0}
//                                 allowedPerMonth={undefined}
//                                 showAllowedPerMonth={leave.showAllowedPerMonth}
//                             />
//                         ))}
//                     </div>

//                     {/* Total Unpaid Leaves */}
//                     {unpaidLeaves.length > 0 && (
//                         <div style={{
//                             marginTop: '16px',
//                             paddingTop: '12px',
//                             borderTop: '1px solid #e5e7eb',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <span style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '14px',
//                                 color: '#1a1a1a'
//                             }}>Total Unpaid Leaves</span>
//                             <span style={{
//                                 fontFamily: 'Inter, sans-serif',
//                                 fontWeight: '600',
//                                 fontSize: '14px',
//                                 color: '#1a1a1a'
//                             }}>{totalUnpaidUsed}/{totalUnpaidAssigned}</span>
//                         </div>
//                     )}
//                 </Card>
//             </div>

//             {/* Grand Total - Paid + Unpaid */}
//             <Card className="mt-3" style={{
//                 padding: '16px 20px',
//                 borderRadius: '12px',
//                 backgroundColor: '',
//                 border: '1px solid #e5e7eb'
//             }}>
//                 <div style={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     // color: '#1a1a1a'
//                 }}>
//                     <span style={{
//                         fontFamily: 'Inter, sans-serif',
//                         fontWeight: '700',
//                         fontSize: '16px',
                        
//                     }}>Total Leaves (Paid + Unpaid)</span>
//                     <span style={{
//                         fontFamily: 'Inter, sans-serif',
//                         fontWeight: '700',
//                         fontSize: '16px',
//                     }}>{grandTotalUsed}/{grandTotalAssigned}</span>
//                 </div>
//             </Card>

//             <ConvertLeavesModal
//                 show={showConvertModal}
//                 onHide={() => setShowConvertModal(false)}
//                 leaveBalances={availableLeaves}
//                 onSuccess={() => {
//                     setShowConvertModal(false);
//                     // Hide button after successful request creation
//                     setShouldShowConvertButton(false);
//                 }}
//             />

//             <EncashTransferLeavesModal
//                 show={showEncashTransferModal}
//                 onHide={() => setShowEncashTransferModal(false)}
//                 leaveBalances={availableLeaves}
//                 onSuccess={() => {
//                     // Optionally refresh leave balances after successful submission
//                     setShowEncashTransferModal(false);
//                 }}
//             />

//         </>
//     );
// };

// export default BalanceProgress;


import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES } from "@constants/statistics";
import { toAbsoluteUrl } from "@metronic/helpers";
import { CustomLeaves, Leaves } from "@models/employee";
import { saveLeaves } from "@redux/slices/attendanceStats";
import { RootState, store } from "@redux/store";
import { fetchPublicHolidays, fetchLeaveOptions } from "@services/company";
import { fetchEmployeeLeaveBalance, fetchEmployeeLeaves, getAllLeaveManagements, fetchEmployeeDiscretionaryBalanceById } from "@services/employee";
import { hasPermission } from "@utils/authAbac";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { customLeaves, filterLeavesPublicHolidays, handleDatesChange, leavesBalance } from "@utils/statistics";
import { fetchAllAddonLeavesAllowances } from "@services/addonLeavesAllowance";
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
    calculateTotalAvailableLeaves
} from "@utils/balanceProgressUtils";
import { calculateProRatedMonths } from "@utils/fiscalYearHelper";

const BalanceProgress = ({ fromAdmin = false, resource, viewOwn = false, viewOthers = false, startDateNew, endDateNew }: { fromAdmin?: boolean, resource: string, viewOwn?: boolean, viewOthers?: boolean, startDateNew: string, endDateNew: string }) => {
    const dispatch = useDispatch();
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee?.id);

    const workingAndOffDaysString = useSelector((state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays);
    const branchWorkingDays = useMemo(() => {
        return workingAndOffDaysString ? JSON.parse(workingAndOffDaysString) : {}
    }, [workingAndOffDaysString]);

    const [currentYear] = useState(new Date().getFullYear() + "");
    const country = "India";
    const [leaves, setLeaves] = useState<CustomLeaves[]>([]);
    const [leaveBalances, setLeaveBalances] = useState<Record<string, number>>({});
    const [proRatedBalances, setProRatedBalances] = useState<Record<string, number>>({});
    const [leavesTakenCount, setLeavesTakenCount] = useState<Record<string, number>>({});
    const [holidays, setHolidays] = useState<number>(0);
    const [weekendCount, setWeekendCount] = useState<number>(0);
    const [totalLeaves, setTotalLeaves] = useState<CustomLeaves[]>([]);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showEncashTransferModal, setShowEncashTransferModal] = useState(false);
    const [shouldShowConvertButton, setShouldShowConvertButton] = useState(true);
    const [discretionaryLeaveBalance, setDiscretionaryLeaveBalance] = useState(0);
    const [discretionaryLeaveBoolean, setDiscretionaryLeaveBoolean] = useState(false);
    const [approvedRequestInfo, setApprovedRequestInfo] = useState<{ transfer?: any; encash?: any } | null>(null);
    const [addonLeaveAllowanceCount, setAddonLeaveAllowanceCount] = useState(0);
    const [allowedPerMonth, setAllowedPerMonth] = useState(1);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const dateOfJoining = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.dateOfJoining : state.employee.currentEmployee?.dateOfJoining);
    const employeeBranchId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.branchId : state.employee.currentEmployee?.branchId);
    const allowedPerMonthFromState = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.allowedPerMonth : state.employee.currentEmployee?.allowedPerMonth);

    // Check if we're in the fiscal end month
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

    // Check if the fiscal year is current or future (not past)
    const isFiscalYearCurrentOrFuture = useMemo(() => {
        if (!endDateNew) return false;
        const fiscalEndDate = dayjs(endDateNew);
        const today = dayjs();
        return fiscalEndDate.isAfter(today) || fiscalEndDate.isSame(today, 'day');
    }, [endDateNew]);

    // Function to refresh leave management data
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

    useEffect(() => {
        if (startDateNew && endDateNew && branchWorkingDays) {
            const weekends = getTotalWeekendsBetweenDates(branchWorkingDays, startDateNew, endDateNew);
            setWeekendCount(weekends);
        }
    }, [startDateNew, endDateNew, branchWorkingDays]);

    useEffect(() => {
        if (!selectedEmployeeId || !startDateNew || !endDateNew) return;

        async function checkLeaveManagementRequests() {
            try {
                const response = await getAllLeaveManagements(selectedEmployeeId);
                const requests = response.data.leaveManagements || [];

                const hasPendingOrApprovedRequest = requests.some(
                    (req: any) => req.status === 0 || req.status === 1
                );

                const approvedTransferRequest = requests.find((req: any) => {
                    if (req.status !== 1) return false;
                    if (req.managementType !== 'TRANSFER') return false;
                    const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return createdDate >= startDateNew && createdDate <= endDateNew;
                });

                const approvedEncashRequest = requests.find((req: any) => {
                    if (req.status !== 1) return false;
                    if (req.managementType !== 'CASH') return false;
                    const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
                    return createdDate >= startDateNew && createdDate <= endDateNew;
                });

                if (approvedTransferRequest || approvedEncashRequest) {
                    setApprovedRequestInfo({
                        transfer: approvedTransferRequest,
                        encash: approvedEncashRequest
                    });
                } else {
                    setApprovedRequestInfo(null);
                }

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
            } catch (error) {
                console.error("Error fetching leave management requests:", error);
                setShouldShowConvertButton(true);
                setApprovedRequestInfo(null);
            }
        }

        checkLeaveManagementRequests();
    }, [selectedEmployeeId, startDateNew, endDateNew]);

    useEffect(() => {
        if (!startDateNew || !endDateNew || !selectedEmployeeId) {
            return;
        }

        async function fetchData() {
            try {
                const [leavesResponse, holidaysResponse, balanceResponse, leaveOptionsResponse, addonAllowancesResponse, response] = await Promise.all([
                    fetchEmployeeLeaves(selectedEmployeeId),
                    fetchPublicHolidays(currentYear, country),
                    fetchEmployeeLeaveBalance(selectedEmployeeId),
                    fetchLeaveOptions(),
                    fetchAllAddonLeavesAllowances(),
                    fetchEmployeeDiscretionaryBalanceById(selectedEmployeeId)
                ]);

                const { data: { leaves } } = leavesResponse;
                const { data: { publicHolidays } } = holidaysResponse;
                const { data: { leavesSummary } } = balanceResponse;
                const { data: { leaveOptions } } = leaveOptionsResponse;
                const { data: { employee } } = response;
                setDiscretionaryLeaveBalance(employee?.discretionaryLeaveBalance);
                setDiscretionaryLeaveBoolean(employee?.discretionaryLeaveBoolean);
                setAllowedPerMonth(employee?.allowedPerMonth || allowedPerMonthFromState || 1);

                const discretionaryLeaveBalances = employee?.discretionaryLeaveBalance;
                const discretionaryLeaveBooleans = employee?.discretionaryLeaveBoolean;

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

                const leaveOptionsData = leaveOptions.filter(
                    (option: any) => option.branchId === employeeBranchId
                );

                const allLeaveOption = leaveOptionsData.map((option: any) => {
                    const isCasual = discretionaryLeaveBooleans && option.leaveType.toLowerCase().includes(CASUAL_LEAVES.toLowerCase());
                    const discretionaryExtra = isCasual ? Number(discretionaryLeaveBalances ?? 0) : 0;
                    const finalNumberOfDays = (Number(option.numberOfDays) || 0) + discretionaryExtra;
                    return {
                        ...option,
                        numberOfDays: finalNumberOfDays,
                        isDiscretionaryApplied: isCasual,
                    };
                });

                const { startDate: fiscalYearStartDate, endDate: fiscalYearEndDate } =
                    await generateFiscalYearFromGivenYear(dayjs(), fromAdmin);

                const proRatedMonths = calculateProRatedMonths(
                    dayjs(dateOfJoining),
                    dayjs(fiscalYearStartDate),
                    dayjs(fiscalYearEndDate),
                    dayjs()
                );

                let addonLeaveAllowanceCount = 0;
                const experienceAtFiscalStart = dayjs(startDateNew).diff(dayjs(dateOfJoining).format('YYYY-MM-DD'), 'year');

                if (!addonAllowancesResponse?.hasError) {
                    const addonAllowance = addonAllowancesResponse.data.addonLeavesAllowances.find(
                        (addon: any) => addon.experienceInCompany === experienceAtFiscalStart
                    );
                    if (addonAllowance) {
                        addonLeaveAllowanceCount = addonAllowance?.addonLeavesCount || 0;
                        setAddonLeaveAllowanceCount(addonLeaveAllowanceCount);
                    }
                }

                const fiscalYearFilteredLeaves = processedLeaves.filter((leave: any) => {
                    const leaveDate = leave.dateFrom || leave.date;
                    return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
                });

                const leavesTaken = calculateLeavesTakenByType(fiscalYearFilteredLeaves);

                const transferResponse = await getAllLeaveManagements(selectedEmployeeId);
                const transferRequests = transferResponse.data.leaveManagements || [];

                const hasPendingOrApprovedTransfer = await hasPendingOrApprovedEncashTransfer(
                    transferRequests,
                    startDateNew,
                    endDateNew
                );

                const transferredLeaves = hasPendingOrApprovedTransfer
                    ? {}
                    : await calculateTransferredLeaves(transferRequests, startDateNew, endDateNew);

                const branchLeaveBalances: Record<string, number> = {};
                allLeaveOption.forEach((option: any) => {
                    branchLeaveBalances[option.leaveType] = option.numberOfDays;
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

                const { balances, proRated } = calculateLeaveBalances(
                    branchLeaveBalances,
                    transferredLeaves,
                    addonLeaveAllowanceCount,
                    proRatedMonths,
                    hasPendingOrApprovedTransfer,
                    employee?.allowedPerMonth || allowedPerMonthFromState || 1,
                    tenureMonths
                );
                setLeaveBalances(balances);
                setProRatedBalances(proRated);
                setLeavesTakenCount(leavesTaken);

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        fetchData();
    }, [selectedEmployeeId, startDateNew, endDateNew, currentYear, country, dispatch, employeeBranchId, dateOfJoining, refreshTrigger]);

    // BUG 3 FIX: was depending on [totalLeaves] but computing from `leaves` (fiscal-filtered).
    // Changed dependency to [leaves] so the memo recalculates correctly on fiscal year change.
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
    } = useMemo(() => buildLeaveData(leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth),
        [leavesTakenCount, proRatedBalances, leaveBalances, allowedPerMonth]);

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

            {/* Monthly Limit Card */}
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
                            }}>Monthly Leave Limit</h5>
                        </div>
                        <p className="mb-0" style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            color: '#6b7280',
                            lineHeight: '1.6',
                            paddingLeft: '32px'
                        }}>
                            Combined across all paid leave types (Annual, Sick, Casual, Paid, Maternal)
                        </p>
                    </div>

                    <div className="d-flex flex-column flex-sm-row align-items-center" style={{
                        gap: '16px',
                        flex: '0 1 auto'
                    }}>
                        {(() => {
                            const currentMonth = dayjs().format('YYYY-MM');
                            const countedLeaveTypes = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];
                            let monthUsage = 0;

                            leaves.filter((leave: any) => {
                                const leaveType = leave.leaveOptions?.leaveType;
                                const normalizedLeaveType = leaveType?.trim().toLowerCase();
                                const isCountedType = countedLeaveTypes.some(
                                    type => type.trim().toLowerCase() === normalizedLeaveType
                                );
                                const isApprovedOrPending = leave.status === Status.Approved || leave.status === Status.ApprovalNeeded;
                                return isCountedType && isApprovedOrPending;
                            }).forEach((leave: any) => {
                                const leaveFromDate = dayjs(leave.dateFrom);
                                const leaveToDate = dayjs(leave.dateTo);
                                let leaveDate = leaveFromDate;

                                while (leaveDate.isBefore(leaveToDate) || leaveDate.isSame(leaveToDate, 'day')) {
                                    if (leaveDate.format('YYYY-MM') === currentMonth) {
                                        const dayOfWeek = leaveDate.day();
                                        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                                            monthUsage++;
                                        }
                                    }
                                    leaveDate = leaveDate.add(1, 'day');
                                }
                            });

                            const remaining = allowedPerMonth - monthUsage;

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
                                            {monthUsage}<span style={{ fontSize: '24px', color: '#9ca3af' }}> / {allowedPerMonth}</span>
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            marginTop: '4px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Used This Month
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
                                            {remaining > 0 ? remaining : 0}
                                        </div>
                                        <div style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            color: remaining > 0 ? '#059669' : '#dc2626',
                                            marginTop: '4px',
                                            fontWeight: '500'
                                        }}>
                                            {remaining > 0 ? 'Remaining' : 'Limit Reached'}
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
                                    borderColor: '#9d4141',
                                    color: '#9d4141',
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    borderRadius: '6px',
                                    border: '1px solid #9d4141',
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
                                discretionaryLeaveBalance={discretionaryLeaveBoolean === true ? Number(discretionaryLeaveBalance ?? 0) : 0}
                                allowedPerMonth={leave.allowedPerMonth}
                                showAllowedPerMonth={leave.showAllowedPerMonth}
                            />
                        ))}
                    </div>

                    {/* Total Paid Leaves */}
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '2px solid #9D4141',
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
                                discretionaryLeaveBalance={0}
                                allowedPerMonth={undefined}
                                showAllowedPerMonth={leave.showAllowedPerMonth}
                            />
                        ))}
                    </div>

                    {/* Total Unpaid Leaves */}
                    {unpaidLeaves.length > 0 && (
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '12px',
                            borderTop: '2px solid #9D4141',
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
                border: '2px solid #9D4141'
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
                        color: '#9D4141'
                    }}>Total Leaves (Paid + Unpaid)</span>
                    <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#9D4141'
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