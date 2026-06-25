import { useEffect, useRef, useState } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { KTCardBody } from '@metronic/helpers';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import TextInput from '@app/modules/common/inputs/TextInput';
import { createEmployeeLeaveRequest, fetchEmployeeLeaves, updateEmployeeRequestById, fetchEmployeeLeaveBalance, getAllLeaveManagements, fetchEmployeeDiscretionaryBalanceById } from '@services/employee';
import { validateMonthlyLeaveLimit } from '@utils/monthlyLeaveValidator';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { ILeaveRequest } from '@models/employee';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchConfiguration, fetchLeaveOptions } from '@services/company';
import { savePersonalLeaves } from '@redux/slices/leaves';
import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, LeaveApprovedStatus, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES, LEAVE_MANAGEMENT_TYPE } from '@constants/statistics';
import { LeaveStatus, LeaveTypes } from '@constants/attendance';
import { transformLeaves } from '../../OverviewView';
import { SANDWICH_LEAVE_KEY } from '@constants/configurations-key';
import dayjs from 'dayjs';
import { fetchAllAddonLeavesAllowances } from '@services/addonLeavesAllowance';
import { calculateProRatedMonths } from '@utils/fiscalYearHelper';
import { getCumulativeAllowedLeaves, getCurrentFiscalMonthIndex, calculateLeavesTakenByType, calculateCumulativeSummary } from '@utils/balanceProgressUtils';
import { getWorkingDays } from '@utils/leaves';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import LeaveRequestCalendar from './LeaveRequestCalendar';
import { SmartBalanceCard } from './leave/SmartBalanceCard';
import { computeTypeBalanceStats, formatFiscalResetLabel } from './leave/balanceStats';
import { computeLeaveBreakdown } from '@utils/leaveCalcEngine';

const extractApiErrorMessage = (err: any): string | null => {
  const data = err?.response?.data;

  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  const message = data?.message;
  if (typeof message === 'string' && message.trim()) return message;

  const validationError = data?.validationError;
  if (Array.isArray(validationError) && validationError.length > 0) {
    const first = validationError[0];
    const field = typeof first?.field === 'string' && first.field ? `${first.field}: ` : '';
    const errors = Array.isArray(first?.errors) ? first.errors.filter(Boolean).join(', ') : '';
    if (errors) return `${field}${errors}`;
  }

  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return null;
};
let initialValues: ILeaveRequest = {
  employeeId: "",
  leaveTypeId: "",
  dateFrom: "",
  dateTo: "",
  reason: "",
  status: 0,
};

const isPendingLeaveStatus = (status: number) =>
  status === Status.ApprovalNeeded || status === LeaveStatus.PendingHR;

const leaveRequestSchema = Yup.object().shape({
  leaveTypeId: Yup.string().required('Leave Type is required'),
  status: Yup.number().required('Leave status is required'),
  dateFrom: Yup.date().required('From Date is required'),
  dateTo: Yup.date().required('To Date is required'),
  reason: Yup.string(),
});

// Status options for admin dropdown
const leaveStatusOptions = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Approved' },
  { value: 2, label: 'Rejected' },
];

export default function LeaveRequestForm({ onClose, leave, selectedDateTimeInfo, startDateNew, endDateNew, isAdmin = false, employeeIdProp, employeeBranchIdProp, dateOfJoiningProp }: { onClose: () => void, leave?: any, selectedDateTimeInfo?: any, startDateNew?: string, endDateNew?: string, isAdmin?: boolean, employeeIdProp?: string, employeeBranchIdProp?: string, dateOfJoiningProp?: string }) {
  const [loading, setLoading] = useState(false);
  const [leaveCount, setLeaveCount] = useState<number>(0);
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string, limit: number }[]>([]);
  const employeeIdFromRedux = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const employeeId = employeeIdProp || employeeIdFromRedux; // Use prop if provided (admin mode), else Redux
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveTypeSelected, setLeaveTypeSelected] = useState<{ value: string; label: string, limit: number } | null>(null);
  const employeeLeavesDataFromRedux = useSelector((state: RootState) => state.leaves.personalLeaves);
  const [fetchedEmployeeLeavesData, setFetchedEmployeeLeavesData] = useState<any[]>([]); // Local state for fetched leaves
  // Use fetched leaves data (populated in useEffect) - fallback to Redux if not loaded yet
  const employeeLeavesData = fetchedEmployeeLeavesData.length > 0 ? fetchedEmployeeLeavesData : (employeeLeavesDataFromRedux || []);
  const [warningMessage, setWarningMessage] = useState('');
  const [sandwichLeaveEnabled, setSandwichLeaveEnabled] = useState(false);
  const [limit, setLimit] = useState<number>(0);
  const [usedLeaves, setUsedLeaves] = useState<number>(0);
  const [countTotalLeaves, setCountTotalLeaves]= useState<number>(0);
  const employeeBranchIdFromRedux = useSelector((state: RootState) => state.employee.currentEmployee.branchId);
  const employeeBranchId = employeeBranchIdProp || employeeBranchIdFromRedux; // Use prop if provided (admin mode), else Redux

  // Get branch working/off days configuration
  const workingAndOffDaysString = useSelector((state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays);
  const workingAndOffDays = workingAndOffDaysString ? JSON.parse(workingAndOffDaysString) : {};

  // Get public holidays from Redux
  const publicHolidays = useSelector((state: RootState) => state.attendanceStats.publicHolidays) || [];

  const dateOfJoiningFromRedux = useSelector((state: RootState) => state.employee.currentEmployee?.dateOfJoining);
  const dateOfJoining = dateOfJoiningProp || dateOfJoiningFromRedux; // Use prop if provided (admin mode), else Redux
  const dateOfJoiningInString = dayjs(dateOfJoining).format('YYYY-MM-DD');

  const [cumulativeSummary, setCumulativeSummary] = useState<{
    total: number; used: number; allowedTillNow: number; remaining: number;
  } | null>(null);

  const allowedPerMonthFromRedux = useSelector((state: RootState) => (state.employee.currentEmployee as any)?.allowedPerMonth);
  const [allowedPerMonth, setAllowedPerMonth] = useState<number>(allowedPerMonthFromRedux || 1);
  const [currentMonthUsage, setCurrentMonthUsage] = useState<number>(0);
  const [showMonthlyLimitInfo, setShowMonthlyLimitInfo] = useState(false);

  // Discretionary leave balance
  const [discretionaryLeaveBalance, setDiscretionaryLeaveBalance] = useState<number>(0);
  const [discretionaryLeaveBoolean, setDiscretionaryLeaveBoolean] = useState<boolean>(false);

  const dispatch = useDispatch();
  // F4: Track the last fetch context to avoid redundant API calls when only the
  //     `leave` prop reference changes (e.g. parent re-renders with new object identity).
  const lastFetchKey = useRef<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!startDateNew || !endDateNew || !employeeId || !employeeBranchId) return;
      try {
        // Fetch leaves and options
        const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
        const { data: { leaveOptions } } = await fetchLeaveOptions();

        // Fetch per-employee LeaveBalance (same source as BalanceProgress dashboard).
        // leaveOptions.numberOfDays is a branch-wide default and can differ from the
        // employee's actual allocation stored in LeaveBalance.totalAllocated.
        const balanceResponse = await fetchEmployeeLeaveBalance(employeeId);
        const leavesSummary: any[] = balanceResponse?.data?.leavesSummary || [];

        // Transform and store fetched leaves (for both admin AND employee mode)
        const transformedLeaves = transformLeaves(leaves || []);

        if (isAdmin) {
          setFetchedEmployeeLeavesData(transformedLeaves);
        } else {
          // For employee mode, also update local state to ensure we have fresh data
          setFetchedEmployeeLeavesData(transformedLeaves);
          // Also update Redux
          dispatch(savePersonalLeaves(transformedLeaves));
        }

        // Build a map of leaveType → actual allocated days (from LeaveBalance.totalAllocated).
        // This is the per-employee value, identical to what BalanceProgress displays.
        // leaveOptions.numberOfDays is a branch-wide default and diverges when an employee
        // has a custom allocation or addon leaves merged by the backend.
        const leaveBalanceMap: Record<string, number> = {};
        leavesSummary.forEach((summary: any) => {
          leaveBalanceMap[summary.leaveType] = Number(summary.numberOfDays) || 0;
        });

        // Filter options by branch
        const leaveOptionsData = leaveOptions.filter(
          (option: any) => option.branchId === employeeBranchId
        );

        const allLeaveOption = leaveOptionsData.map((option: any) => {
          return {
            ...option,
            numberOfDays: Number(option.numberOfDays) || 0,
          };
        });
  

        // Fetch TRANSFER requests
        const transferResponse = await getAllLeaveManagements(employeeId);
        const transferRequests = transferResponse.data.leaveManagements || [];

        // Calculate previous fiscal year range
        const currentFiscalStart = dayjs(startDateNew);
        const previousFiscalEnd = currentFiscalStart.subtract(1, 'day').format('YYYY-MM-DD');
        const previousFiscalStart = currentFiscalStart.subtract(1, 'year').format('YYYY-MM-DD');


        // Get the actual current fiscal year (where today's date falls)
        const { startDate: actualCurrentFiscalStart, endDate: actualCurrentFiscalEnd } = await generateFiscalYearFromGivenYear(dayjs());

        // console.log("LeaveRequestForm - Actual current fiscal year (today):", actualCurrentFiscalStart, "to", actualCurrentFiscalEnd);

        // Check if there's a PENDING/APPROVED ENCASH/TRANSFER in the actual current fiscal year (where today is)
        const hasRequestInActualCurrentFiscal = transferRequests.some((req: any) => {
          if (req.managementType !== LEAVE_MANAGEMENT_TYPE.TRANSFER && req.managementType !== LEAVE_MANAGEMENT_TYPE.CASH) return false;
          if (req.status !== 0 && req.status !== 1) return false;

          const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
          return createdDate >= actualCurrentFiscalStart && createdDate <= actualCurrentFiscalEnd;
        });


        // Check if the viewing fiscal year is current or previous compared to today
        const isViewingCurrentOrPreviousFiscal = endDateNew <= actualCurrentFiscalEnd;


        // Set balances to 0 if:
        // 1. There's a request in actual current fiscal year AND viewing current/previous fiscal years
        // OR
        // 2. There's a request in the fiscal year being viewed
        const hasRequestInViewingFiscal = transferRequests.some((req: any) => {
          if (req.managementType !== LEAVE_MANAGEMENT_TYPE.TRANSFER && req.managementType !== LEAVE_MANAGEMENT_TYPE.CASH) return false;
          if (req.status !== 0 && req.status !== 1) return false;

          const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
          return createdDate >= startDateNew && createdDate <= endDateNew;
        });

        const hasPendingOrApprovedTransfer = (hasRequestInActualCurrentFiscal && isViewingCurrentOrPreviousFiscal) || hasRequestInViewingFiscal;


        // Calculate transferred leaves (only if no pending/approved transfer exists)
        const transferredLeaves: Record<string, number> = {};

        if (!hasPendingOrApprovedTransfer) {
          // Get approved TRANSFER requests (NOT ENCASH) from previous fiscal year only
          const approvedTransfers = transferRequests.filter(
            (req: any) => {
              // Only TRANSFER type, not CASH (encash should not add leaves)
              const isApprovedTransfer = req.status === 1 && req.managementType === LEAVE_MANAGEMENT_TYPE.TRANSFER;
              if (!isApprovedTransfer) return false;

              // Filter by previous fiscal year
              const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
              const isFromPreviousFiscalYear = createdDate >= previousFiscalStart && createdDate <= previousFiscalEnd;

              return isFromPreviousFiscalYear;
            }
          );

          // Calculate transferred leave counts by type
          approvedTransfers.forEach((transfer: any) => {
            if (transfer.leaveTypeIds && Array.isArray(transfer.leaveTypeIds)) {
              transfer.leaveTypeIds.forEach((leaveTypeItem: any) => {
                const leaveType = leaveTypeItem.leaveType;
                const count = leaveTypeItem.count || 0;
                transferredLeaves[leaveType] = (transferredLeaves[leaveType] || 0) + count;
              });
            }
          });

          // console.log("LeaveRequestForm - Transferred leaves from approved TRANSFER requests:", transferredLeaves);
        }

        // Calculate pro-rated months based on joining date
        // For mid-year joiners: uses remaining months from join date to FY end
        // For employees present since FY start: uses elapsed months
        // Note: actualCurrentFiscalStart and actualCurrentFiscalEnd are already declared above
        const proRatedMonths = calculateProRatedMonths(
          dayjs(dateOfJoiningInString),
          dayjs(actualCurrentFiscalStart),
          dayjs(actualCurrentFiscalEnd),
          dayjs()
        );

        const monthsInYear = 12;


        // Helper function to calculate total leave days for a leave record
        // Uses branch working/off days config and excludes holidays with isWeekend=true
        const calculateLeaveDays = (leave: any): number => {
          if (!leave.dateFrom || !leave.dateTo) return 0;

          const start = new Date(leave.dateFrom);
          const end = new Date(leave.dateTo);
          let dayCount = 0;

          // Map day index to day name for workingAndOffDays lookup
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

          // Check if workingAndOffDays config is available
          const hasWorkingDaysConfig = workingAndOffDays && Object.keys(workingAndOffDays).length > 0;

          for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            const dayName = dayNames[dayOfWeek];
            const dateString = dayjs(date).format('YYYY-MM-DD');

            // Check if this day is an off day
            // If config available, use it; otherwise fallback to Sat-Sun as off days
            const isOffDay = hasWorkingDaysConfig
              ? workingAndOffDays[dayName] === "0"
              : (dayOfWeek === 0 || dayOfWeek === 6); // Fallback: Sunday=0, Saturday=6

            // Check if this date is a public holiday with isWeekend=true
            const isWeekendHoliday = publicHolidays && publicHolidays.length > 0 && publicHolidays.some((holiday: any) => {
              const holidayDate = dayjs(holiday.date).format('YYYY-MM-DD');
              return holidayDate === dateString && holiday.isWeekend === true;
            });

            // Count only if it's a working day and not a weekend holiday
            if (!isOffDay && !isWeekendHoliday) {
              dayCount++;
            }
          }

          return dayCount;
        };

        // Filter leaves by fiscal year date range
        const fiscalYearFilteredLeaves = leaves.filter((leave: any) => {
          const leaveDate = leave.dateFrom || leave.date;
          if (!leaveDate) return false;
          return leaveDate >= startDateNew && leaveDate <= endDateNew;
        });

        // Get leaves taken (filtered by fiscal year) - ONLY count approved leaves
        const casualLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === CASUAL_LEAVES && leave.status === Status.Approved
        );
        const annualLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === ANNUAL_LEAVES && leave.status === Status.Approved
        );
        const maternalLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === MATERNAL_LEAVES && leave.status === Status.Approved
        );
        const sickLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === SICK_LEAVES && leave.status === Status.Approved
        );
        const floaterLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === FLOATER_LEAVES && leave.status === Status.Approved
        );
        // Calculate total days taken (not just count of records)
        const casualDaysTaken = casualLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const annualDaysTaken = annualLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const maternalDaysTaken = maternalLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const sickDaysTaken = sickLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const floaterDaysTaken = floaterLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        // Use the shared utility for unpaid so the count matches the Balance page calculation.
        const publicHolidayDatesForUnpaid = publicHolidays.map((h: any) => dayjs(h.date).format('YYYY-MM-DD'));
        const approvedOnlyTaken = calculateLeavesTakenByType(fiscalYearFilteredLeaves, publicHolidayDatesForUnpaid, workingAndOffDays, false);
        const unpaidDaysTaken = approvedOnlyTaken[UNPAID_LEAVES] || 0;

        // Pending days per paid type — mirrors backend's usedDays+pendingDays cumulative check
        const casualDaysPending = fiscalYearFilteredLeaves
            .filter((leave: any) => leave.leaveOptions.leaveType === CASUAL_LEAVES && isPendingLeaveStatus(leave.status))
            .reduce((total: any, leave: any) => total + calculateLeaveDays(leave), 0);
        const annualDaysPending = fiscalYearFilteredLeaves
            .filter((leave: any) => leave.leaveOptions.leaveType === ANNUAL_LEAVES && isPendingLeaveStatus(leave.status))
            .reduce((total: any, leave: any) => total + calculateLeaveDays(leave), 0);
        const maternalDaysPending = fiscalYearFilteredLeaves
            .filter((leave: any) => leave.leaveOptions.leaveType === MATERNAL_LEAVES && isPendingLeaveStatus(leave.status))
            .reduce((total: any, leave: any) => total + calculateLeaveDays(leave), 0);
        const sickDaysPending = fiscalYearFilteredLeaves
            .filter((leave: any) => leave.leaveOptions.leaveType === SICK_LEAVES && isPendingLeaveStatus(leave.status))
            .reduce((total: any, leave: any) => total + calculateLeaveDays(leave), 0);
        const floaterDaysPending = fiscalYearFilteredLeaves
            .filter((leave: any) => leave.leaveOptions.leaveType === FLOATER_LEAVES && isPendingLeaveStatus(leave.status))
            .reduce((total: any, leave: any) => total + calculateLeaveDays(leave), 0);

        const response = await fetchAllAddonLeavesAllowances();
        let addonLeaveAllowanceCount = 0;

        // Mirror backend getFiscalYearExperience: fiscal-year slab, NOT calendar diff.
        // DOJ Apr-Dec → joined FY starting that year; Jan-Mar → joined FY starting prev year.
        // experience = (fyStartYear - joinFyStartYear) + 1, minimum 0.
        const fyStartYear = parseInt((startDateNew ?? '').split('-')[0], 10);
        const doj = dayjs(dateOfJoiningInString);
        const dojMonth = doj.month() + 1; // 1-based
        const joinFyStartYear = dojMonth >= 4 ? doj.year() : doj.year() - 1;
        const experienceYears = Math.max(0, fyStartYear - joinFyStartYear + 1);

        if (!response?.hasError && response.data?.addonLeavesAllowances) {
          // Mirror backend getApplicableTier: highest tier whose threshold <= experienceYears.
          const applicableTier = (response.data.addonLeavesAllowances as any[])
            .filter((addon: any) => addon.experienceInCompany <= experienceYears)
            .sort((a: any, b: any) => b.experienceInCompany - a.experienceInCompany)[0];
          addonLeaveAllowanceCount = applicableTier ? (Number(applicableTier.addonLeavesCount) || 0) : 0;
        }
        
        // Calculate leaves being transferred in current fiscal year (to subtract from available balance)
        const currentFiscalTransferredLeaves: Record<string, number> = {};

        // console.log("=== ENCASH/TRANSFER DEBUG ===");
        // console.log("All transfer requests:", transferRequests);
        // console.log("Current fiscal year range:", startDateNew, "to", endDateNew);
        // console.log("hasPendingOrApprovedTransfer:", hasPendingOrApprovedTransfer);

        if (hasPendingOrApprovedTransfer) {
          // Get ALL pending/approved TRANSFER requests from current fiscal year (not just one)
          const currentTransferRequests = transferRequests.filter((req: any) => {
            if (req.managementType !== LEAVE_MANAGEMENT_TYPE.TRANSFER) return false;
            if (req.status !== 0 && req.status !== 1) return false;

            const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
            return createdDate >= startDateNew && createdDate <= endDateNew;
          });

          // console.log("Found TRANSFER requests:", currentTransferRequests);

          // Get ALL pending/approved ENCASH (CASH) requests from current fiscal year (not just one)
          const currentEncashRequests = transferRequests.filter((req: any) => {
            if (req.managementType !== LEAVE_MANAGEMENT_TYPE.CASH) return false;
            if (req.status !== 0 && req.status !== 1) return false;

            const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
            return createdDate >= startDateNew && createdDate <= endDateNew;
          });

          // console.log("Found ENCASH requests:", currentEncashRequests);

          // Extract the leave counts from ALL transfer requests
          currentTransferRequests.forEach((transferRequest: any) => {
            if (transferRequest?.leaveTypeIds && Array.isArray(transferRequest.leaveTypeIds)) {
              transferRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
                const leaveType = leaveTypeItem.leaveType;
                const count = leaveTypeItem.count || 0;
                currentFiscalTransferredLeaves[leaveType] = (currentFiscalTransferredLeaves[leaveType] || 0) + count;
              });
            }
          });

          // Extract the leave counts from ALL encash requests (should also subtract from available)
          currentEncashRequests.forEach((encashRequest: any) => {
            if (encashRequest?.leaveTypeIds && Array.isArray(encashRequest.leaveTypeIds)) {
              encashRequest.leaveTypeIds.forEach((leaveTypeItem: any) => {
                const leaveType = leaveTypeItem.leaveType;
                const count = leaveTypeItem.count || 0;
                currentFiscalTransferredLeaves[leaveType] = (currentFiscalTransferredLeaves[leaveType] || 0) + count;
              });
            }
          });

          // console.log("Total leaves to subtract (transfer + encash):", currentFiscalTransferredLeaves);
        }

        // Use the backend-derived unpaidDays from the same LeaveBalance API that drives
        // the Balance card — this guarantees the dropdown is always consistent with 2/351 etc.
        // Fallback: recompute from leaveBalanceMap keys only (not allLeaveOption, which can
        // include branch-default leave types not present in the employee's LeaveBalance and
        // cause the total to drift vs. the balance page).
        const backendUnpaidDays = balanceResponse?.data?.unpaidDays;
        const totalPaidAllocated = Object.entries(leaveBalanceMap)
            .filter(([leaveType]) => leaveType !== UNPAID_LEAVES && leaveType !== MATERNAL_LEAVES)
            .reduce((sum: number, [, days]) => sum + days, 0);
        const derivedUnpaidDays = typeof backendUnpaidDays === 'number'
            ? backendUnpaidDays
            : Math.max(0, 365 - totalPaidAllocated);

        // Cumulative allowance summary for the modal info block.
        // Matches dashboard logic: uses centralized utility from balanceProgressUtils.
        {
          const publicHolidayDates = publicHolidays.map((h: any) => dayjs(h.date).format('YYYY-MM-DD'));
          const leavesTakenIncludingPending = calculateLeavesTakenByType(
            fiscalYearFilteredLeaves,
            publicHolidayDates,
            workingAndOffDays,
            true
          );
          // Derive fiscal start month from the prop so the cumulative pacing
          // is correct for companies that don't use an April fiscal year.
          const fiscalStartMonth = startDateNew ? dayjs(startDateNew).month() + 1 : 4;
          const cumulative = calculateCumulativeSummary(totalPaidAllocated, leavesTakenIncludingPending, fiscalStartMonth);
          setCumulativeSummary(cumulative);
        }

        // Process leave options
        setStatusOptions(
          allLeaveOption
            .map((option: any) => {
              // Special handling for casual leaves
              if (option.leaveType === CASUAL_LEAVES) {
                const casualLeaveOption = allLeaveOption.find(
                  (opt: any) => opt.leaveType === CASUAL_LEAVES
                );
                const totalYearlyCasualLeaves = leaveBalanceMap[CASUAL_LEAVES] ?? (Number(casualLeaveOption?.numberOfDays) || 0);
                const transferredCasual = transferredLeaves[CASUAL_LEAVES] || 0;
                const transferringCasual = currentFiscalTransferredLeaves[CASUAL_LEAVES] || 0;

                // Use full-year allocation (not pro-rated) so the option stays visible throughout
                // the fiscal year. Cumulative backend validation governs actual eligibility.
                const totalWithTransferred = totalYearlyCasualLeaves + transferredCasual;
                const availableLeaves = Math.max(0, totalWithTransferred - casualDaysTaken - transferringCasual);

                if (totalWithTransferred > 0) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days left)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
              else if (option.leaveType === ANNUAL_LEAVES) {
                const transferredAnnual = transferredLeaves[ANNUAL_LEAVES] || 0;
                const transferringAnnual = currentFiscalTransferredLeaves[ANNUAL_LEAVES] || 0;

                // leaveBalanceMap already includes addon leaves (backend merges them into totalAllocated).
                // Fall back to leaveOptions + addon if the employee has no LeaveBalance record yet.
                const fullYearAllocation = leaveBalanceMap[ANNUAL_LEAVES] ?? ((Number(option.numberOfDays) || 0) + (Number(addonLeaveAllowanceCount) || 0));
                const totalWithTransferred = fullYearAllocation + transferredAnnual;
                const availableLeaves = Math.max(0, totalWithTransferred - annualDaysTaken - transferringAnnual);

                if (totalWithTransferred > 0) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days left)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
              // Special handling for maternal leaves
              else if (option.leaveType === MATERNAL_LEAVES) {
                // Maternal leave - no pro-rating, full allocation available (special-purpose leave)
                const transferredMaternal = transferredLeaves[MATERNAL_LEAVES] || 0;
                const transferringMaternal = currentFiscalTransferredLeaves[MATERNAL_LEAVES] || 0;
                const totalWithTransferred = (leaveBalanceMap[MATERNAL_LEAVES] ?? option.numberOfDays) + transferredMaternal;

                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(
                  0,
                  totalWithTransferred - maternalDaysTaken - transferringMaternal
                );

                if (totalWithTransferred > 0) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days left)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
              else{
                // For other leave types (Sick, Floater, Unpaid) - no pro-rating
                const transferredOther = transferredLeaves[option.leaveType] || 0;
                const transferringOther = currentFiscalTransferredLeaves[option.leaveType] || 0;
                // For Unpaid Leaves, use the derived cap (365 - paid) instead of the raw DB value (365).
                // This ensures the dropdown is consistent with the Balance page calculation.
                const effectiveNumberOfDays = option.leaveType === UNPAID_LEAVES
                    ? derivedUnpaidDays
                    : (leaveBalanceMap[option.leaveType] ?? option.numberOfDays);
                const totalWithTransferred = effectiveNumberOfDays + transferredOther;

                // Get days taken for this specific leave type
                let daysTaken = 0;
                if (option.leaveType === SICK_LEAVES) {
                  daysTaken = sickDaysTaken;
                } else if (option.leaveType === FLOATER_LEAVES) {
                  daysTaken = floaterDaysTaken;
                } else if (option.leaveType === UNPAID_LEAVES) {
                  daysTaken = unpaidDaysTaken;
                }

                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(0, totalWithTransferred - daysTaken - transferringOther);

                if (totalWithTransferred > 0) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days left)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
            })
            .filter((option: any) => option !== null)
            .sort((a: any, b: any) => {
              // Unpaid always last; all other types alphabetically
              const aUnpaid = a.label.toLowerCase().includes('unpaid');
              const bUnpaid = b.label.toLowerCase().includes('unpaid');
              if (aUnpaid && !bUnpaid) return 1;
              if (!aUnpaid && bUnpaid) return -1;
              return a.label.localeCompare(b.label);
            })
        );
      } catch (error) {
        console.error("❌ [LeaveRequestForm] Error fetching leave options:", error);
        // Consider adding error state handling here
      }
    };

    if (employeeId && employeeBranchId && startDateNew && endDateNew) {
      // F4: Build a stable key from the context values that actually require a re-fetch.
      //     The leave.id is included so editing a different leave triggers a fresh fetch,
      //     but a new object reference for the same leave does not.
      const fetchKey = `${employeeId}|${employeeBranchId}|${startDateNew}|${endDateNew}|${leave?.id ?? ''}`;
      if (lastFetchKey.current !== fetchKey) {
        lastFetchKey.current = fetchKey;
        fetchOptions();
      }
    }
  }, [employeeId, employeeBranchId, startDateNew, endDateNew, leave]); // Re-fetch when modal opens/closes

  useEffect(() => {
    // Clear warning message when leave type changes
    setWarningMessage('');
    
    if (!leaveTypeSelected || !employeeLeavesData) {
      return;
    }

    const limit = leaveTypeSelected.limit;
    setLimit(limit);

    // Only count approved leaves as "used" — scoped to the CURRENT fiscal year.
    // Previously this counted ALL leaves across all fiscal years, so 3 leaves taken
    // in a previous FY were subtracted from this year's 12-leave balance, showing
    // a false "Only 9 remain" warning even when nothing had been used this year.
    const usedLeaves = employeeLeavesData
      .filter((leave: any) => {
        if (leave.leaveTypeId !== leaveTypeSelected.value) return false;
        if (leave.status !== LeaveApprovedStatus.Approved) return false;
        // Scope to current fiscal year using the same date range as the dropdown
        const leaveDate = leave.dateFrom || leave.date;
        if (!leaveDate) return false;
        if (startDateNew && leaveDate < startDateNew) return false;
        if (endDateNew && leaveDate > endDateNew) return false;
        return true;
      })
      .reduce((total: number, leave: any) => total + getWorkingDays(leave), 0);

    const exactLeaves = Math.max(0, limit - usedLeaves);
    setUsedLeaves(usedLeaves);
    setCountTotalLeaves(exactLeaves);

    // Show immediate warning if cumulative balance is exhausted (before dates are picked)
    const isUnpaidType = leaveTypeSelected?.label?.toLowerCase().includes('unpaid') || false;
    if (cumulativeSummary && cumulativeSummary.remaining === 0 && !isUnpaidType) {
      setWarningMessage(`⚠️ Cumulative Limit Alert: No remaining cumulative leave balance. You have used all ${cumulativeSummary.used} of ${cumulativeSummary.allowedTillNow} leaves allowed till now.`);
    }

    // BUG 1 FIX: Do NOT show the "all used" warning here (on leave type selection).
    // The warning is shown only after dates are picked, inside calculateLeaveCount,
    // which already checks `leaveDays > countTotalLeaves` at that point.
    // Showing the warning here (before any dates are selected) is premature and confusing.
  }, [leaveTypeSelected, employeeLeavesData, startDateNew, endDateNew]);

  // Set leaveTypeSelected when editing existing leave and statusOptions are loaded
  useEffect(() => {
    if (leave && leave.leaveTypeId && statusOptions.length > 0 && !leaveTypeSelected) {
      const matchedOption = statusOptions.find(opt => opt.value === leave.leaveTypeId);
      if (matchedOption) {
        setLeaveTypeSelected(matchedOption);
      }
    }
  }, [leave, statusOptions, leaveTypeSelected]);

  useEffect(() => {
      
      const fetchConfigurations = async () => {
          try {
            const configuration = await fetchConfiguration(SANDWICH_LEAVE_KEY);
            const jsonObjectSandwhich = JSON.parse(configuration.data.configuration.configuration);
            const customRules = jsonObjectSandwhich.isSandwichLeaveSixthEnabled || jsonObjectSandwhich.isSandwichLeaveFifthEnabled || jsonObjectSandwhich.isSandwichLeaveFourthEnabled || jsonObjectSandwhich.isSandwichLeaveThirdEnabled || jsonObjectSandwhich.isSandwichLeaveSecondEnabled || jsonObjectSandwhich.isSandwichLeaveFirstEnabled;
            setSandwichLeaveEnabled(!!customRules);
            // console.log("customRules",customRules);
          }
          catch (error ) {
          }
      }
      fetchConfigurations();
    },[])


  const setFieldValueRef = useRef<((field: string, value: any, shouldValidate?: boolean) => void) | null>(null);

  // Load discretionary leave balance for the current employee
  useEffect(() => {
    if (!employeeId) return;
    fetchEmployeeDiscretionaryBalanceById(employeeId)
      .then((result: any) => {
        const balance = result?.data?.employee?.discretionaryLeaveBalance;
        const enabled = result?.data?.employee?.discretionaryLeaveBoolean;
        if (balance != null) setDiscretionaryLeaveBalance(Number(balance));
        if (enabled != null) setDiscretionaryLeaveBoolean(Boolean(enabled));
      })
      .catch(() => {/* silently ignore — optional feature */});
  }, [employeeId]);

  useEffect(() => {
    const setFieldValue = setFieldValueRef.current;
    if (!setFieldValue) return;

    if (leave) {
      setFieldValue('employeeId', leave.employeeId);
      setFieldValue('leaveTypeId', leave.leaveTypeId);
      setFieldValue('dateFrom', leave.dateFrom);
      setFieldValue('dateTo', leave.dateTo);
      setFieldValue('reason', leave.reason || '');
      setFieldValue('status', leave.statusNumber);
      // Recalculate leave count when editing
      if (leave.dateFrom && leave.dateTo) {
        const start = new Date(leave.dateFrom);
        const end = new Date(leave.dateTo);
        let leaveDays = 0;
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          if (sandwichLeaveEnabled) {
            leaveDays += 1;
          } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            leaveDays += 1;
          }
        }
        setLeaveCount(leaveDays);
      }
    } else if (selectedDateTimeInfo && selectedDateTimeInfo.startStr) {
      setFieldValue('employeeId', '');
      setFieldValue('leaveTypeId', '');
      setFieldValue('dateFrom', selectedDateTimeInfo.startStr);
      setFieldValue('reason', '');
      setFieldValue('status', 0);
      setLeaveCount(0);
    } else {
      setFieldValue('employeeId', '');
      setFieldValue('leaveTypeId', '');
      setFieldValue('dateFrom', '');
      setFieldValue('dateTo', '');
      setFieldValue('reason', '');
      setFieldValue('status', 0);
      setLeaveCount(0);
    }
  }, [leave, selectedDateTimeInfo]);

  return (
    <Formik
      initialValues={{ ...initialValues, employeeId }}
      validationSchema={leaveRequestSchema}
      validateOnChange={true}
      validateOnBlur={true}
      onSubmit={async (values: ILeaveRequest, { setSubmitting, resetForm }: FormikHelpers<ILeaveRequest>) => {
        setLoading(true);
        try {
          const statusNumber = Number(values.status);

          // Use current logged-in user's ID (admin) for approvedById/rejectedById, not target employee
          const approvedById = statusNumber === 1 ? employeeIdFromRedux : undefined;
          const rejectedById = statusNumber === 2 ? employeeIdFromRedux : undefined;
          const leaveRequestData = {
            ...values,
            status: statusNumber,
            employeeId,
            ...(approvedById && { approvedById }),
            ...(rejectedById && { rejectedById })
          };

          let wasSuccessful = false;
          let createdLeaveId = '';
          let isUpdate = false;

          if (leave) {
            const res = await updateEmployeeRequestById(leave.id, leaveRequestData);
            if (res && !res.hasError) {
              successConfirmation('Successfully Leave Updated');
              wasSuccessful = true;
              createdLeaveId = leave.id;
              isUpdate = true;
              resetForm();
              setLeaveCount(0);
              onClose();
            } else {
              errorConfirmation(res?.detail || res?.message || 'Failed to update leave');
            }
          } else {
            const res = await createEmployeeLeaveRequest(leaveRequestData);
            if (res && !res.hasError) {
              successConfirmation('Successfully applied for leave');
              wasSuccessful = true;
              createdLeaveId = res.data?.id || '';
              resetForm();
              setLeaveCount(0);
              onClose();
            } else {
              errorConfirmation(res?.detail || res?.message || 'Failed to apply for leave');
            }
          }

          // Refresh data first, then emit event to ensure other components get latest data
          const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
          const personalLeaves = transformLeaves(leaves);
          dispatch(savePersonalLeaves(personalLeaves));

          // Emit event AFTER data is refreshed to ensure BalanceProgress gets latest data
          if (wasSuccessful) {
            if (isUpdate) {
              eventBus.emit(EVENT_KEYS.leaveRequestUpdated, { leaveId: createdLeaveId });
            } else {
              eventBus.emit(EVENT_KEYS.leaveRequestCreated, { leaveId: createdLeaveId });
            }
          }
        } catch (err: any) {
          const fallback = leave ? 'Failed to update leave' : 'Failed to apply for leave';
          errorConfirmation(extractApiErrorMessage(err) || fallback);
        } finally {
          setLoading(false);
          setSubmitting(false);
        }
      }}
    >
      {({
        values,
        touched,
        errors,
        setFieldValue,
        isValid,
        handleSubmit,
        isSubmitting,
        resetForm,
      }) => {
        setFieldValueRef.current = setFieldValue;

        const calculateLeaveCount = (fromDate: string, toDate: string) => {
          if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const hasWorkingDaysConfig = workingAndOffDays && Object.keys(workingAndOffDays).length > 0;
            if (start > end) {
              setLeaveCount(0);
              return;
            }
            // Build holiday set and isWeekend function — shared by breakdown and monthly tracking
            const holidaySet = new Set(
              (publicHolidays || [])
                .map((holiday: any) => dayjs(holiday?.date).format('YYYY-MM-DD'))
                .filter(Boolean)
            );

            const isWeekendFn = (date: Date): boolean => {
              const dayName = dayNames[date.getDay()];
              return hasWorkingDaysConfig
                ? workingAndOffDays[dayName] === '0'
                : (date.getDay() === 0 || date.getDay() === 6);
            };

            // Use the same engine as LeaveImpactCard so leaveCount and chargeable stay in sync.
            // Previously a naive loop excluded weekends but not public holidays, causing the
            // submit button to block valid submissions when holidays fell inside the range.
            const breakdown = sandwichLeaveEnabled
              ? null
              : computeLeaveBreakdown(start, end, holidaySet, isWeekendFn);

            let leaveDays = 0;

            // Track leaves per month for monthly limit validation
            const requestedLeavesPerMonth: Record<string, number> = {};

            if (breakdown) {
              // Non-sandwich: use engine-computed chargeable (excludes weekends + holidays)
              leaveDays = breakdown.chargeable;
              for (
                let date = new Date(start);
                date <= end;
                date.setDate(date.getDate() + 1)
              ) {
                const iso = dayjs(date).format('YYYY-MM-DD');
                if (!isWeekendFn(date) && !holidaySet.has(iso)) {
                  const monthKey = iso.substring(0, 7);
                  requestedLeavesPerMonth[monthKey] = (requestedLeavesPerMonth[monthKey] || 0) + 1;
                }
              }
            } else {
              // Sandwich: count all calendar days (sandwich adds non-working days between leave days)
              for (
                let date = new Date(start);
                date <= end;
                date.setDate(date.getDate() + 1)
              ) {
                leaveDays += 1;
                const monthKey = dayjs(date).format('YYYY-MM');
                requestedLeavesPerMonth[monthKey] = (requestedLeavesPerMonth[monthKey] || 0) + 1;
              }
            }

            // Calculate existing leaves per month (approved + pending, all leave types)
            const existingLeavesPerMonth: Record<string, number> = {};
            const countedLeaveTypes = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];

            if (employeeLeavesData && employeeLeavesData.length > 0) {
              const relevantLeaves = employeeLeavesData.filter((existingLeave: any) => {
                const isCountedType = countedLeaveTypes.includes(existingLeave.leaveOptions?.leaveType);
                const isApprovedOrPending = existingLeave.status === Status.Approved || isPendingLeaveStatus(existingLeave.status);
                const isCurrentEditingLeave = !!(leave?.id && existingLeave?.id === leave.id);
                return isCountedType && isApprovedOrPending && !isCurrentEditingLeave;
              });

              relevantLeaves.forEach((leave: any) => {
                const leaveFromDate = dayjs(leave.dateFrom);
                const leaveToDate = dayjs(leave.dateTo);
                let leaveDate = leaveFromDate;

                while (leaveDate.isBefore(leaveToDate) || leaveDate.isSame(leaveToDate, 'day')) {
                  const monthKey = leaveDate.format('YYYY-MM');
                  const dayOfWeek = leaveDate.day();

                  const dayName = dayNames[dayOfWeek];
                  const isOffDay = hasWorkingDaysConfig
                    ? workingAndOffDays[dayName] === '0'
                    : (dayOfWeek === 0 || dayOfWeek === 6);
                  const isHoliday = holidaySet.has(leaveDate.format('YYYY-MM-DD'));
                  // Count only working days (matching backend logic)
                  if (!isOffDay && !isHoliday) {
                    existingLeavesPerMonth[monthKey] = (existingLeavesPerMonth[monthKey] || 0) + 1;
                  }

                  leaveDate = leaveDate.add(1, 'day');
                }
              });
            }

            // Clear previous warnings first
            setWarningMessage('');

            // Check if unpaid leave is selected (unpaid leaves are not subject to monthly limit)
            const isUnpaidLeaveSelected = leaveTypeSelected?.label?.toLowerCase().includes('unpaid') || false;

            // Priority 1: Check if requesting ONLY weekend days (no working days)
            if (leaveDays === 0) {
              setWarningMessage(`⚠️ Weekend Leave Not Allowed: The selected date range contains only weekend days (Saturday/Sunday). Please select dates that include at least one working day.`);
            }
            // Priority 2: Cumulative fiscal-year check (source of truth for paid leave quota)
            else if (!isUnpaidLeaveSelected && cumulativeSummary && leaveDays > cumulativeSummary.remaining) {
              setWarningMessage(
                cumulativeSummary.remaining === 0
                  ? `⚠️ Cumulative Limit Alert: No remaining cumulative leave balance. You have used all ${cumulativeSummary.used} of ${cumulativeSummary.allowedTillNow} leaves allowed till now.`
                  : `⚠️ Cumulative Limit Alert: You can only apply for ${cumulativeSummary.remaining} more leave(s). You have used ${cumulativeSummary.used} of ${cumulativeSummary.allowedTillNow} allowed till now.`
              );
            }
            // Priority 3: Individual leave type balance
            else if(leaveDays > countTotalLeaves && leaveTypeSelected) {
              setWarningMessage(`⚠️ Insufficient Balance: You are requesting ${leaveDays} days, but you only have ${countTotalLeaves} ${countTotalLeaves === 1 ? 'leave' : 'leaves'} remaining.`);
            }

            setLeaveCount(leaveDays);
          } else {
            setLeaveCount(0);
          }
        };

        const hasLeaveTypeError = touched.leaveTypeId && !!errors.leaveTypeId;
        const customStyles = {
          control: (provided: any) => ({
            ...provided,
            border: hasLeaveTypeError ? '1px dashed #AA393D' : '1px solid #e4e6ea',
            boxShadow: 'none',
            '&:hover': {
              border: hasLeaveTypeError ? '1px dashed #AA393D' : '1px solid #b5b5c3',
            },
          }),
          option: (provided: any, state: any) => ({
            ...provided,
            color: state.isSelected ? '#721c24' : '#000',
            backgroundColor: state.isSelected ? '#f8d7da' : '#fff',
          }),
          singleValue: (provided: any) => ({
            ...provided,
            color: '#721c24',
          }),
        };

        return (
          <Form onSubmit={handleSubmit} noValidate className="form">
            <KTCardBody className="p-2">
              {/* Monthly Limit Info Banner */}
              {/* {showMonthlyLimitInfo && !leave && (
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <i className="bi bi-info-circle" style={{
                      fontSize: '20px',
                      color: '#0d6efd',
                      marginTop: '2px',
                      flexShrink: 0
                    }}></i>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        marginBottom: '6px'
                      }}>
                        Monthly Leave Limit lksdfj;saljk
                      </div>
                      <div style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        color: '#6b7280',
                        lineHeight: '1.6'
                      }}>
                        You have used{' '}
                        <span style={{ fontWeight: '600', color: currentMonthUsage >= allowedPerMonth ? '#dc2626' : '#1a1a1a' }}>
                          {currentMonthUsage} / {allowedPerMonth}
                        </span>{' '}
                        leaves this month (combined across all paid leave types).
                        {currentMonthUsage < allowedPerMonth ? (
                          <span style={{
                            display: 'inline-block',
                            marginLeft: '8px',
                            padding: '2px 8px',
                            backgroundColor: '#d1fae5',
                            color: '#059669',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {allowedPerMonth - currentMonthUsage} remaining
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            marginLeft: '8px',
                            padding: '2px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Limit reached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )} */}

              <div className="lrc-zone1 mb-9">
                <div className="lrc-zone1__type">
                  <label className="required fs-6 fw-bold mb-2">Leave Type</label>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find(
                      (option) => option.value.toString() === values.leaveTypeId
                    )}
                    onChange={(option) => {
                      const leaveTypeId = option?.value || "";
                      setWarningMessage('');
                      setFieldValue('leaveTypeId', leaveTypeId);
                      setLeaveTypeId(leaveTypeId.toString());
                      setLeaveTypeSelected(statusOptions?.filter(val=>val.value === leaveTypeId)[0] || null);
                    }}
                    placeholder="Select leave type"
                    className="basic-single"
                    classNamePrefix="select"
                    styles={customStyles}
                  />
                  {startDateNew && endDateNew && (
                    <p className="lrc-zone1__fiscal-hint">
                      Fiscal period: {dayjs(startDateNew).format('MMM YYYY')} – {dayjs(endDateNew).format('MMM YYYY')}
                    </p>
                  )}
                  {touched.leaveTypeId && errors.leaveTypeId && (
                    <div className="fv-plugins-message-container">
                      <div className="fv-help-block">{errors.leaveTypeId}</div>
                    </div>
                  )}
                </div>
                <SmartBalanceCard
                  stats={
                    leaveTypeSelected
                      ? computeTypeBalanceStats(
                          leaveTypeSelected.value,
                          leaveTypeSelected.label,
                          leaveTypeSelected.limit,
                          employeeLeavesData,
                          startDateNew,
                          endDateNew,
                        )
                      : null
                  }
                  cumulativeSummary={cumulativeSummary}
                  fiscalResetLabel={formatFiscalResetLabel(endDateNew)}
                />
              </div>

              <LeaveRequestCalendar
                fromDate={values.dateFrom}
                toDate={values.dateTo}
                setFieldValue={setFieldValue}
                calculateLeaveCount={calculateLeaveCount}
                publicHolidays={publicHolidays}
                workingAndOffDays={workingAndOffDays}
                dateOfJoining={dateOfJoiningInString}
                leaveTypeLabel={leaveTypeSelected?.label}
                leaveCount={leaveCount}
                countTotalLeaves={countTotalLeaves}
                cumulativeSummary={cumulativeSummary}
                employeeLeavesData={employeeLeavesData}
                isUnpaidType={leaveTypeSelected?.label?.toLowerCase().includes('unpaid') || false}
                editingLeaveId={leave?.id}
                inlineFormWarning={warningMessage || undefined}
                sandwichLeaveEnabled={sandwichLeaveEnabled}
              />

              <div className="row mb-9">
                <div className="col-lg-12">
                  <TextInput
                    formikField="reason"
                    label="Remarks"
                    isRequired={false}
                    placeholder="Remarks"
                  />
                </div>
              </div>
              {/* Status dropdown - only visible for admin in edit mode */}
              {isAdmin && leave && (
                <div className="row mb-9">
                  <div className="col-lg-12">
                    <label className="fs-6 fw-bold mb-3">Status</label>
                    <Select
                      options={leaveStatusOptions}
                      value={leaveStatusOptions.find(
                        (option) => option.value === values.status
                      )}
                      onChange={(option) => {
                        setFieldValue('status', option?.value ?? 0);
                      }}
                      placeholder="Select status"
                      className="basic-single"
                      classNamePrefix="select"
                    />
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end" style={{ position: 'sticky', bottom: 0, background: '#fff', paddingTop: '12px', paddingBottom: '4px', zIndex: 10, borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary me-2 lrc-submit-btn"
                  disabled={
                    !isValid || isSubmitting || leaveCount === 0 || loading ||
                    (!isAdmin && leaveCount > countTotalLeaves) ||
                    warningMessage.includes('Cumulative Limit Alert') ||
                    warningMessage.includes('Monthly Limit Alert')
                  }
                >
                  <span className="indicator-label">
                    {
                    loading ? <span className="indicator-progress" style={{ display: "block" }}>
                                  Please wait...
                                  <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                </span> : 'Submit'}
                  </span>
                </button>
                {/* <button
                  type="reset"
                  className="btn btn-light-primary"
                  disabled={isSubmitting || loading}
                  onClick={() => {
                    resetForm(); 
                    }
                  }
                >
                  <span className="indicator-label">Discard</span>
                </button> */}
                <button
                  type="button"
                  className="btn btn-light-primary"
                  onClick={onClose}
                >
                  <span className="indicator-label">Cancel</span>
                </button>
              </div>
            </KTCardBody>
          </Form>
        );
      }}
    </Formik>
  );
}

// BUG 2 FIX: The local stub that always returned { isValid: true } has been removed.
// The real validateMonthlyLeaveLimit is now imported from @utils/monthlyLeaveValidator
// at the top of this file.
