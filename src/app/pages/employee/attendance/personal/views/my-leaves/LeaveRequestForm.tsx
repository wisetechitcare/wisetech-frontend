import { useEffect, useState } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import Flatpickr from 'react-flatpickr';
import Select from 'react-select';
import { KTCardBody } from '@metronic/helpers';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import TextInput from '@app/modules/common/inputs/TextInput';
import { createEmployeeLeaveRequest, fetchEmployeeLeaves, updateEmployeeRequestById, fetchEmployeeDiscretionaryBalanceById } from '@services/employee';
import { ILeaveRequest } from '@models/employee';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchConfiguration, fetchLeaveOptions } from '@services/company';
import { savePersonalLeaves } from '@redux/slices/leaves';
import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, LeaveApprovedStatus, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES, LEAVE_MANAGEMENT_TYPE } from '@constants/statistics';
import { LeaveTypes } from '@constants/attendance';
import { transformLeaves } from '../../OverviewView';
import { SANDWICH_LEAVE_KEY } from '@constants/configurations-key';
import dayjs from 'dayjs';
import { fetchAllAddonLeavesAllowances } from '@services/addonLeavesAllowance';
import { Form as BootstrapForm } from "react-bootstrap";
import { calculateProRatedMonths } from '@utils/fiscalYearHelper';
import { validateMonthlyLeaveLimit } from '@utils/monthlyLeaveValidator';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import eventBus from '@utils/EventBus';
let initialValues: ILeaveRequest = {
  employeeId: "",
  leaveTypeId: "",
  dateFrom: "",
  dateTo: "",
  reason: "",
  status: 0,
};

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
  const [sandwhichConfiguration, setsandwhichConfiguration] = useState('')
  const [limit, setLimit] = useState<number>(0);
  const [usedLeaves, setUsedLeaves] = useState<number>(0);
  const [countTotalLeaves, setCountTotalLeaves]= useState<number>(0);
  const [discretionaryLeaveBalance, setDiscretionaryLeaveBalance] = useState<number>(0);
  const [discretionaryLeaveBoolean, setDiscretionaryLeaveBoolean] = useState<boolean>(false);
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

  const allowedPerMonthFromRedux = useSelector((state: RootState) => state.employee.currentEmployee?.allowedPerMonth);
  const [allowedPerMonth, setAllowedPerMonth] = useState(allowedPerMonthFromRedux || 1);
  const [currentMonthUsage, setCurrentMonthUsage] = useState<number>(0);
  const [showMonthlyLimitInfo, setShowMonthlyLimitInfo] = useState(false);

  // Update allowedPerMonth when Redux value changes
  useEffect(() => {
    if (allowedPerMonthFromRedux && allowedPerMonthFromRedux !== allowedPerMonth) {
      setAllowedPerMonth(allowedPerMonthFromRedux);
    }
  }, [allowedPerMonthFromRedux]);

  const dispatch = useDispatch();
  const userAgent = useSelector((state: RootState) => state.userAgent.userAgent);
  const isIosAndDeviceIsMobile = userAgent.os.name === 'iOS' && userAgent.device.type === 'Mobile';

  useEffect(() => {
    const fetchOptions = async () => {
      if (!startDateNew || !endDateNew || !employeeId || !employeeBranchId) return;
      try {
        // Fetch leaves and options
        const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
        const { data: { leaveOptions } } = await fetchLeaveOptions();
        const result = await fetchEmployeeDiscretionaryBalanceById(employeeId);

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

        const discretionaryLeaveBalance = result?.data?.employee?.discretionaryLeaveBalance;
        const discretionaryLeaveBoolean = result?.data?.employee?.discretionaryLeaveBoolean;
        
        // Filter options by branch
        const leaveOptionsData = leaveOptions.filter(
          (option: any) => option.branchId === employeeBranchId
        );

        const allLeaveOption = leaveOptionsData.map((option: any) => {
          
        const isCasual = discretionaryLeaveBoolean && option.leaveType.toLowerCase().includes(CASUAL_LEAVES.toLowerCase());
        const discretionaryExtra = isCasual ? Number(discretionaryLeaveBalance ?? 0) : 0;
        const finalNumberOfDays = (Number(option.numberOfDays) || 0) + discretionaryExtra;
        // debugger;
          return {
            ...option,
            ...({leaveType: option?.leaveType?.toLowerCase().includes("floater leave") ? "Paid Leaves" : option?.leaveType}), 
            numberOfDays: finalNumberOfDays,
            isDiscretionaryApplied: isCasual,
          };
        });
  

        // Fetch TRANSFER requests
        const { getAllLeaveManagements } = await import('@services/employee');
        const transferResponse = await getAllLeaveManagements(employeeId);
        const transferRequests = transferResponse.data.leaveManagements || [];

        // Calculate previous fiscal year range
        const currentFiscalStart = dayjs(startDateNew);
        const previousFiscalEnd = currentFiscalStart.subtract(1, 'day').format('YYYY-MM-DD');
        const previousFiscalStart = currentFiscalStart.subtract(1, 'year').format('YYYY-MM-DD');


        // Get the actual current fiscal year (where today's date falls)
        const { generateFiscalYearFromGivenYear } = await import('@utils/file');
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

        // Calculate tenure months (for Annual Leaves)
        // If employee joined before fiscal year start, count from fiscal year start
        // If employee joined after fiscal year start, count from joining date
        // This ensures the count resets every April 1st
        // For past/future fiscal years, calculate as of the fiscal year end date
        const joiningDate = dayjs(dateOfJoiningInString);
        const fiscalStart = dayjs(actualCurrentFiscalStart);
        const fiscalEnd = dayjs(actualCurrentFiscalEnd);
        const today = dayjs();

        // Use the appropriate end date for calculation
        // If viewing current fiscal year and it's not ended yet, use today
        // Otherwise, use the fiscal year end date
        const calculationDate = fiscalEnd.isAfter(today) && fiscalStart.isBefore(today)
            ? today
            : fiscalEnd;

        const startDate = joiningDate.isAfter(fiscalStart) ? joiningDate : fiscalStart;
        const tenureMonths = calculationDate.diff(startDate, 'month') + 1;

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
        const unpaidLeavesTaken = fiscalYearFilteredLeaves.filter(
          (leave: any) => leave.leaveOptions.leaveType === UNPAID_LEAVES && leave.status === Status.Approved
        );

        // Calculate total days taken (not just count of records)
        const casualDaysTaken = casualLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const annualDaysTaken = annualLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const maternalDaysTaken = maternalLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const sickDaysTaken = sickLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const floaterDaysTaken = floaterLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);
        const unpaidDaysTaken = unpaidLeavesTaken.reduce((total:any, leave:any) => total + calculateLeaveDays(leave), 0);

        const response = await fetchAllAddonLeavesAllowances();
        // if (!response?.hasError && response.data?.addonLeavesAllowances) {
        //     setAllowances(response.data.addonLeavesAllowances);
        // }
        let addonLeaveAllowanceCount = 0;
        // Calculate experience as of the fiscal year START date
        // Experience-based leaves are distributed at the start of fiscal year
        // e.g., Employee joins Nov 2025, completes 1 year in Nov 2026,
        // fiscal year starts March 2027 - they get addon leaves for 1+ year experience
        const experienceAtFiscalStart = dayjs(startDateNew).diff(dateOfJoiningInString, 'year');

        if(!response?.hasError && response.data?.addonLeavesAllowances) {
          const addonAllowance = response.data.addonLeavesAllowances.find((addon: any) => addon.experienceInCompany === experienceAtFiscalStart);
          if(addonAllowance){
            addonLeaveAllowanceCount = addonAllowance?.addonLeavesCount || 0;
          }

          if(experienceAtFiscalStart>10){
            let newAddon = response.data.addonLeavesAllowances.find((addon: any) => addon.experienceInCompany === 11);
            addonLeaveAllowanceCount = newAddon?.addonLeavesCount || 0;
          }
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

        // Process leave options
        setStatusOptions(
          allLeaveOption
            .map((option: any) => {
              // Special handling for casual leaves
              if (option.leaveType === CASUAL_LEAVES) {
                const casualLeaveOption = allLeaveOption.find(
                  (opt: any) => opt.leaveType === CASUAL_LEAVES
                );
                const totalYearlyCasualLeaves = Number(casualLeaveOption?.numberOfDays) || 0;
                const transferredCasual = transferredLeaves[CASUAL_LEAVES] || 0;
                const transferringCasual = currentFiscalTransferredLeaves[CASUAL_LEAVES] || 0;
                // console.log("totalYearlyCasualLeaves",totalYearlyCasualLeaves);
                // console.log("transferredCasual",transferredCasual);
                // console.log("transferringCasual",transferringCasual);

                const monthlyCasualLeave = totalYearlyCasualLeaves / monthsInYear;

                // Calculate pro-rated leaves based on pro-rated months (considers mid-year joining)
                let proRatedLeaves = Math.floor((monthlyCasualLeave * proRatedMonths * 10) / 10);
                // Apply allowedPerMonth cap
                proRatedLeaves = Math.min(proRatedLeaves, allowedPerMonth * proRatedMonths);

                // Add transferred leaves to pro-rated amount
                const totalWithTransferred = proRatedLeaves + transferredCasual;
                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(
                  0,
                  totalWithTransferred - casualDaysTaken - transferringCasual
                );

                // Only show if at least 0.5 days available
                if (availableLeaves >= 1) {
                  // Format to show .0 for whole numbers, otherwise show 1 decimal
                  const displayDays = Number.isInteger(availableLeaves)
                    ? availableLeaves.toFixed(0)
                    : availableLeaves.toFixed(1);

                  return {
                    value: option.id,
                    label: `${option.leaveType} (${Math.floor(Number(displayDays))} days)`,
                    limit: Math.floor(totalWithTransferred) // Use total with transferred as the limit
                  };
                }
                return null;
              }
              else if (option.leaveType === ANNUAL_LEAVES) {
                const transferredAnnual = transferredLeaves[ANNUAL_LEAVES] || 0;
                const transferringAnnual = currentFiscalTransferredLeaves[ANNUAL_LEAVES] || 0;

                // NEW LOGIC: Based on tenure (months since joining or fiscal year start)
                // Employee gets 1 leave at start, then +1 for each month
                // Resets every April 1st (fiscal year start)
                let proRatedLeaves = tenureMonths;

                // Apply allowedPerMonth cap
                proRatedLeaves = Math.min(proRatedLeaves, allowedPerMonth * tenureMonths);

                // Add addon leave allowance (experience-based leaves) and transferred leaves
                const totalWithAddon = proRatedLeaves + (+ Number(addonLeaveAllowanceCount) || 0);
                const totalWithTransferred = totalWithAddon + transferredAnnual;

                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(
                  0,
                  totalWithTransferred - annualDaysTaken - transferringAnnual
                );

                if (availableLeaves >= 1) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days)`,
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
                const totalWithTransferred = option.numberOfDays + transferredMaternal;

                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(
                  0,
                  totalWithTransferred - maternalDaysTaken - transferringMaternal
                );

                if (availableLeaves >= 1) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
              else{
                // For other leave types (Sick, Floater, Unpaid) - no pro-rating
                const transferredOther = transferredLeaves[option.leaveType] || 0;
                const transferringOther = currentFiscalTransferredLeaves[option.leaveType] || 0;
                const totalWithTransferred = option.numberOfDays + transferredOther;

                // Get days taken for this specific leave type
                let daysTaken = 0;
                if (option.leaveType === SICK_LEAVES) {
                  daysTaken = sickDaysTaken;
                } else if (option.leaveType === FLOATER_LEAVES) {
                  daysTaken = floaterDaysTaken;
                }
                 else if (option.leaveType === UNPAID_LEAVES) {
                  daysTaken = unpaidDaysTaken;
                }

                // Calculate available leaves (subtract taken leaves AND leaves being transferred)
                const availableLeaves = Math.max(0, totalWithTransferred - daysTaken - transferringOther);

                // Only show if at least 1 day available
                if (availableLeaves >= 1) {
                  return {
                    value: option.id,
                    label: `${option.leaveType} (${availableLeaves} days)`,
                    limit: Math.floor(totalWithTransferred)
                  };
                }
                return null;
              }
            })
            .filter((option: any) => option !== null) // Remove null entries
        );
      } catch (error) {
        console.error("❌ [LeaveRequestForm] Error fetching leave options:", error);
        // Consider adding error state handling here
      }
    };

    if (employeeId && employeeBranchId && startDateNew && endDateNew) {
      fetchOptions();
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

    // Only count approved leaves as "used" - pending leaves should not reduce available balance
    const usedLeaves = employeeLeavesData.filter((leave: any) =>
      (leave.leaveTypeId === leaveTypeSelected.value &&
       leave.status === LeaveApprovedStatus.Approved)
    ).length;

    const exactLeaves = Math.max(0, limit - usedLeaves);
    setUsedLeaves(usedLeaves);
    setCountTotalLeaves(exactLeaves);

    // Show warning only when there are no leaves remaining
    if (exactLeaves <= 0) {
      setWarningMessage(`You have used all ${limit} of your allowed ${leaveTypeSelected.label.toLowerCase()}.`);
    }
  }, [leaveTypeSelected, employeeLeavesData]);

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
            setsandwhichConfiguration(customRules);
            // console.log("customRules",customRules);
          }
          catch (error ) {
          }
      }
      fetchConfigurations();
    },[])

  // Calculate current month's combined usage for info banner
  useEffect(() => {
    if (!employeeLeavesData || employeeLeavesData.length === 0) {
      setCurrentMonthUsage(0);
      setShowMonthlyLimitInfo(false);
      return;
    }

    const currentMonth = dayjs().format('YYYY-MM');
    const countedLeaveTypes = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];

    let monthUsage = 0;

    employeeLeavesData
      .filter((leave: any) => {
        const isCountedType = countedLeaveTypes.includes(leave.leaveOptions?.leaveType);
        const isApprovedOrPending = leave.status === Status.Approved || leave.status === Status.ApprovalNeeded;
        return isCountedType && isApprovedOrPending;
      })
      .forEach((leave: any) => {
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

    setCurrentMonthUsage(monthUsage);
    setShowMonthlyLimitInfo(true);
  }, [employeeLeavesData]);

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

          // Check allowedPerMonth limit - COMBINED across ALL leave types (only for new requests, not updates)
          // This validation applies to both admin and employee users
          // Skip validation for Unpaid Leaves - they are not subject to monthly limit
          const isUnpaidLeave = leaveTypeSelected?.label?.toLowerCase().includes('unpaid') || false;

          if (!leave && !isUnpaidLeave) {
            const validationResult = await validateMonthlyLeaveLimit(
              employeeId,
              values.dateFrom,
              values.dateTo,
              allowedPerMonth
            );

            if (!validationResult.isValid) {
              errorConfirmation(validationResult.errorMessage || 'Monthly leave limit exceeded');
              setLoading(false);
              setSubmitting(false);
              return; // Stop submission
            }
          }

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
              errorConfirmation('Failed to update leave');
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
              errorConfirmation('Failed to apply for leave');
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
        } catch {
          errorConfirmation('Failed to apply for leave');
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
        const calculateLeaveCount = (fromDate: string, toDate: string) => {
          if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            if (start > end) {
              setLeaveCount(0);
              return;
            }
            let leaveDays = 0;

            // Track leaves per month for monthly limit validation
            const requestedLeavesPerMonth: Record<string, number> = {};

            for (
              let date = new Date(start);
              date <= end;
              date.setDate(date.getDate() + 1)
            ) {
              const dayOfWeek = date.getDay();
              let countDay = false;

              if (sandwhichConfiguration) {
                leaveDays += 1;
                countDay = true;
              } else if (dayOfWeek !== 0 && dayOfWeek !== 6 ){
                leaveDays +=1;
                countDay = true;
              }

              // Track working days per month for monthly limit check
              if (countDay) {
                const monthKey = dayjs(date).format('YYYY-MM');
                requestedLeavesPerMonth[monthKey] = (requestedLeavesPerMonth[monthKey] || 0) + 1;
              }
            }

            // Calculate existing leaves per month (approved + pending, all leave types)
            const existingLeavesPerMonth: Record<string, number> = {};
            const countedLeaveTypes = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];

            if (employeeLeavesData && employeeLeavesData.length > 0) {
              const relevantLeaves = employeeLeavesData.filter((leave: any) => {
                const isCountedType = countedLeaveTypes.includes(leave.leaveOptions?.leaveType);
                const isApprovedOrPending = leave.status === Status.Approved || leave.status === Status.ApprovalNeeded;
                return isCountedType && isApprovedOrPending;
              });

              relevantLeaves.forEach((leave: any) => {
                const leaveFromDate = dayjs(leave.dateFrom);
                const leaveToDate = dayjs(leave.dateTo);
                let leaveDate = leaveFromDate;

                while (leaveDate.isBefore(leaveToDate) || leaveDate.isSame(leaveToDate, 'day')) {
                  const monthKey = leaveDate.format('YYYY-MM');
                  const dayOfWeek = leaveDate.day();

                  // Count only working days (matching backend logic)
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    existingLeavesPerMonth[monthKey] = (existingLeavesPerMonth[monthKey] || 0) + 1;
                  }

                  leaveDate = leaveDate.add(1, 'day');
                }
              });
            }

            // Check if any month exceeds the monthly limit (existing + requested)
            let monthlyLimitExceeded = false;
            let exceededMonth = '';
            let existingCount = 0;
            let requestingCount = 0;
            let totalCount = 0;

            for (const monthKey in requestedLeavesPerMonth) {
              const requestedInMonth = requestedLeavesPerMonth[monthKey];
              const existingInMonth = existingLeavesPerMonth[monthKey] || 0;
              const total = requestedInMonth + existingInMonth;

              if (total > allowedPerMonth) {
                monthlyLimitExceeded = true;
                exceededMonth = dayjs(monthKey + '-01').format('MMMM YYYY');
                existingCount = existingInMonth;
                requestingCount = requestedInMonth;
                totalCount = total;
                break;
              }
            }

            // Clear previous warnings first
            setWarningMessage('');

            // Check if unpaid leave is selected (unpaid leaves are not subject to monthly limit)
            const isUnpaidLeaveSelected = leaveTypeSelected?.label?.toLowerCase().includes('unpaid') || false;

            // Priority 1: Check if requesting ONLY weekend days (no working days)
            if (leaveDays === 0) {
              setWarningMessage(`⚠️ Weekend Leave Not Allowed: The selected date range contains only weekend days (Saturday/Sunday). Please select dates that include at least one working day.`);
            }
            // Priority 2: Check monthly limit (applies to paid leave types only - skip for Unpaid Leaves)
            else if (monthlyLimitExceeded && !isUnpaidLeaveSelected) {
              if (existingCount > 0) {
                setWarningMessage(`⚠️ Monthly Limit Alert: You have already taken/requested ${existingCount} ${existingCount === 1 ? 'leave' : 'leaves'} in ${exceededMonth}. Adding ${requestingCount} more would total ${totalCount} ${totalCount === 1 ? 'leave' : 'leaves'}, exceeding your limit of ${allowedPerMonth}. Please adjust your dates.`);
              } else {
                setWarningMessage(`⚠️ Monthly Limit Alert: You are trying to request ${requestingCount} ${requestingCount === 1 ? 'leave' : 'leaves'} in ${exceededMonth}, but you are allowed only ${allowedPerMonth} ${allowedPerMonth === 1 ? 'leave' : 'leaves'} per month (combined across all leave types). Please adjust your dates.`);
              }
            }
            // Priority 2: Check individual leave type balance
            else if(leaveDays > countTotalLeaves && leaveTypeSelected) {
              setWarningMessage(`You have used ${usedLeaves} of your ${limit} allowed leaves. Only ${countTotalLeaves} leaves remain.`);
            }

            setLeaveCount(leaveDays);
          } else {
            setLeaveCount(0);
          }
        };

        const customStyles = {
          control: (provided: any) => ({
            ...provided,
            border: '1px dashed #AA393D',
            boxShadow: 'none',
            '&:hover': {
              border: '1px dashed #AA393D',
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

        useEffect(() => {
          if (leave) {
            setFieldValue('employeeId', leave.employeeId);
            setFieldValue('leaveTypeId', leave.leaveTypeId);
            setFieldValue('dateFrom', leave.dateFrom);
            setFieldValue('dateTo', leave.dateTo);
            setFieldValue('reason', leave.reason || '');
            setFieldValue('status', leave.statusNumber);
            calculateLeaveCount(leave.dateFrom, leave.dateTo);
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
          <Form onSubmit={handleSubmit} noValidate className="form" placeholder={''}>
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

              <div className="row mb-9">
                <div className="col-lg-12">
                  <label className="required fs-6 fw-bold mb-3">Leave Type</label>
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
                      // console.log("allLeaveOption:: ",allLeaveOption);
                      setLeaveTypeSelected(statusOptions?.filter(val=>val.value === leaveTypeId)[0] || null);
                    }}
                    placeholder="Select leave type"
                    className="basic-single"
                    classNamePrefix="select"
                    styles={customStyles}
                  />
                  {touched.leaveTypeId && errors.leaveTypeId && (
                    <div className="fv-plugins-message-container">
                      <div className="fv-help-block">{errors.leaveTypeId}</div>
                    </div>
                  )}
                </div>
                {warningMessage && (
                  <div className="col-lg-12 mt-4">  
                    <div className="alert alert-warning" role="alert">
                      {warningMessage}
                    </div>
                  </div>
                )}
              </div>

              <div className="row mb-9">
                <div className="col-lg-6">
                  <label className="required fs-6 fw-bold form-label mb-3">
                    From Date
                  </label>
                  {isIosAndDeviceIsMobile ? (
                    <BootstrapForm.Group controlId="dateFrom" className="mb-3">
                      <BootstrapForm.Control
                        type="date"
                        value={values.dateFrom || ""}
                        onChange={(e) => {
                          setFieldValue("dateFrom", e.target.value, true);
                          calculateLeaveCount(e.target.value, values.dateTo || "");
                        }}
                        isInvalid={Boolean(errors.dateFrom && touched.dateFrom)}
                        required
                      />
                      <BootstrapForm.Control.Feedback type="invalid">
                        {errors.dateFrom}
                      </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                  ) : (
                    <>
                      <Flatpickr
                        value={values.dateFrom}
                        className="form-control form-control-lg form-control-solid"
                        placeholder="Select From Date"
                        onChange={(selectedDates: Date[]) => {
                          if (!selectedDates?.length) return;
                          const selectedDate = selectedDates[0];
                          const formattedDate = selectedDate.toLocaleDateString('en-CA');
                          setFieldValue("dateFrom", formattedDate, true);
                          calculateLeaveCount(formattedDate, values.dateTo || "");
                        }}
                        options={{
                          dateFormat: "Y-m-d",
                          altInput: true,
                          altFormat: "F j, Y",
                          minDate: dateOfJoiningInString,
                        }}
                      />
                      {touched.dateFrom && errors.dateFrom && (
                        <div className="fv-plugins-message-container">
                          <div className="fv-help-block">{errors.dateFrom}</div>
                        </div>
                      )}
                    </>
                  )}

                </div>
                <div className="col-lg-6">
                  <label className="required fs-6 fw-bold form-label mb-3">
                    To Date
                  </label>
                  {isIosAndDeviceIsMobile ? (
                    <BootstrapForm.Group controlId="dateTo" className="mb-3">
                      <BootstrapForm.Control
                        type="date"
                        value={values.dateTo || ""}
                        onChange={(e) => {
                          setFieldValue("dateTo", e.target.value, true);
                          calculateLeaveCount(values.dateFrom || "", e.target.value);
                        }}
                        isInvalid={Boolean(errors.dateTo && touched.dateTo)}
                        required
                      />
                      <BootstrapForm.Control.Feedback type="invalid">
                        {errors.dateTo}
                      </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                  ) : (
                    <>
                      <Flatpickr
                        value={values.dateTo}
                        className="form-control form-control-lg form-control-solid"
                        placeholder="Select To Date"
                        onChange={(selectedDates: Date[]) => {
                          const selectedDate = selectedDates[0];
                          const formattedDate = selectedDate.toLocaleDateString('en-CA');
                          setFieldValue('dateTo', formattedDate, true);
                          calculateLeaveCount(values.dateFrom.toString(), formattedDate);
                        }}
                        options={{
                          dateFormat: 'Y-m-d',
                          altInput: true,
                          altFormat: 'F j, Y',
                          minDate: values.dateFrom || dateOfJoiningInString,
                        }}
                      />
                      {touched.dateTo && errors.dateTo && (
                        <div className="fv-plugins-message-container">
                          <div className="fv-help-block">{errors.dateTo}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="row mb-9">
                <div className="col-lg-12">
                  <div className="col-lg-6">
                    <label className="fs-6 fw-bold form-label mb-3">
                      Number of Leave Days
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg form-control-solid"
                      value={leaveCount}
                      readOnly
                    />
                  </div>
                </div>
              </div>

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

              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary me-2"
                  disabled={!isValid || isSubmitting || leaveCount === 0 || loading || (!isAdmin && leaveCount > countTotalLeaves) || warningMessage.includes('Monthly Limit Alert') }
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
