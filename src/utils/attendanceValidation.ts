import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { fetchCompanyOverview, fetchAllPublicHolidays } from "@services/company";
import { fetchEmployeeLeaves, fetchEmpAttendanceStatistics, getAttendanceRequest } from "@services/employee";
import { customLeaves, filterLeavesPublicHolidays } from "@utils/statistics";
import { Status } from "@constants/statistics";

dayjs.extend(isSameOrBefore);

interface ValidationResult {
  canRaiseRequest: boolean;
  blockingDate: string;
  blockingReason: string;
}

interface ValidationParams {
  employeeId: string;
  selectedDate: string;  // The date user wants to raise request for (YYYY-MM-DD format)
  dateOfJoining: string;
  workingAndOfDays: Record<string, string>;
  offDaysForTheBranch: string[];
}

/**
 * Validates if a user can raise an attendance request for a given date
 * by checking if all previous days' attendance conditions are met.
 * This mirrors the logic in checkPreviousAttendanceAndSetStateNew() from MarkAttendance.tsx
 */
export async function validatePreviousDaysAttendance(params: ValidationParams): Promise<ValidationResult> {
  const { employeeId, selectedDate, dateOfJoining, workingAndOfDays, offDaysForTheBranch } = params;

  try {
    // 1. Fetch required data
    const { data: { companyOverview } } = await fetchCompanyOverview();
    const companyId = companyOverview[0].id;

    const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
    const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);
 
    const totalLeaves = await customLeaves(leaves);
    const startDate = dayjs().startOf('year').format('YYYY-MM-DD');
    const endDate = dayjs().endOf('year').format('YYYY-MM-DD');
    const filteredLeavesHolidays = filterLeavesPublicHolidays(startDate, endDate, true, false, true);
 
    const leavesDates = filteredLeavesHolidays?.customLeaves?.map((leave: any) =>
      dayjs(leave.date).format('YYYY-MM-DD')
    ) || [];
 
    const holidaysDates = filteredLeavesHolidays?.publicHolidays?.map((holiday: any) =>
      dayjs(holiday.date).format('YYYY-MM-DD')
    ) || [];

    // Create publicHolidaysMap for isWeekend property check
    const publicHolidaysMap = new Map();
    publicHolidays.forEach((holiday: any) => {
      publicHolidaysMap.set(dayjs(holiday.date).format('YYYY-MM-DD'), holiday);
    });

    // Helper: isNonWorkingDay
    const isNonWorkingDay = (date: string) => {
      const dayName = dayjs(date).format('dddd').toLowerCase();
      const isWeekend = workingAndOfDays?.[dayName] === "0";
      const isOffDay = offDaysForTheBranch?.includes(dayName);
      const isHoliday = holidaysDates?.includes(date);
      const isLeave = leavesDates?.includes(date);
      const holidayObj = publicHolidaysMap.get(date);
      const isHolidayMarkedAsWeekend = holidayObj && holidayObj.isWeekend === true;
      return isWeekend || isOffDay || isHoliday || isLeave || isHolidayMarkedAsWeekend;
    };

    // Helper: checkAttendanceStatus for a given date
    const checkAttendanceStatus = async (date: string) => {
      const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, date, date);
      const { data: { attendanceRequests } } = await getAttendanceRequest(employeeId, date, date);

      const hasPendingRequest = attendanceRequests.some((req: any) => {
        return Number(req?.status) == Status.ApprovalNeeded;
      });

      const hasCompleteRequest = attendanceRequests.some((req: any) =>
        Number(req?.status) == Status.Approved && (req.checkIn !== null && req.checkOut !== null)
      );

      return {
        hasAttendanceRecord: empAttendanceStatistics.length > 0,
        hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
        hasCheckOut: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkOut !== null,
        hasAttendanceRequest: attendanceRequests.length > 0,
        hasRequestCheckIn: attendanceRequests.length > 0 && attendanceRequests[0].checkIn !== null,
        hasRequestCheckOut: attendanceRequests.length > 0 && attendanceRequests[0].checkOut !== null,
        hasPendingRequest: hasPendingRequest || hasCompleteRequest,
      };
    };

    // Main validation loop - start from selectedDate - 1 (day before the selected date)
    let dateToCheck = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    let canRaiseRequest = true;
    let blockingDate = '';
    let blockingReason = '';

    while (true) {

      if (dayjs(dateToCheck).format('YYYY-MM') !== dayjs().format('YYYY-MM')) {
        canRaiseRequest = true;
        blockingDate = "";
        break;
      }

      const attendanceStatus = await checkAttendanceStatus(dateToCheck);
      const isNonWorking = isNonWorkingDay(dateToCheck);

      // Rule: If date <= dateOfJoining, allow (no previous days to check)
      if (dayjs(dateToCheck).isSameOrBefore(dayjs(dateOfJoining))) {
        canRaiseRequest = true;
        break;
      }

      // Rule: If has both checkIn AND checkOut in attendance, allow
      if (attendanceStatus?.hasCheckIn && attendanceStatus?.hasCheckOut) {
        canRaiseRequest = true;
        break;
      }

      // Rule: If has request with both checkIn AND checkOut, continue checking previous day
      if (attendanceStatus?.hasRequestCheckIn && attendanceStatus?.hasRequestCheckOut) {
        blockingDate = dateToCheck;
        canRaiseRequest = false;
        dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
        continue;
      }

      // Rule: Non-working day checks
      if (isNonWorking) {
        if (attendanceStatus?.hasCheckIn || attendanceStatus?.hasRequestCheckIn) {
          // Has check-in but missing check-out on non-working day
          canRaiseRequest = false;
          blockingDate = dateToCheck;
          blockingReason = 'Incomplete check-out on non-working day';
          break;
        } else if (attendanceStatus?.hasCheckOut || attendanceStatus?.hasRequestCheckOut) {
          // Has check-out but missing check-in on non-working day
          canRaiseRequest = false;
          blockingDate = dateToCheck;
          blockingReason = 'Incomplete check-in on non-working day';
          break;
        } else {
          // No attendance on non-working day - continue checking previous day
          blockingDate = dateToCheck;
          canRaiseRequest = false;
          dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
          continue;
        }
      }

      // Rule: Working day checks
      if (attendanceStatus?.hasCheckIn || attendanceStatus?.hasRequestCheckIn) {
        // Has check-in but missing check-out on working day
        canRaiseRequest = false;
        blockingDate = dateToCheck;
        blockingReason = 'Incomplete check-out on working day';
        break;
      } else if (attendanceStatus?.hasCheckOut || attendanceStatus?.hasRequestCheckOut) {
        // Has check-out but missing check-in on working day
        canRaiseRequest = false;
        blockingDate = dateToCheck;
        blockingReason = 'Incomplete check-in on working day';
        break;
      } else if (!isNonWorking) {
        // Missing attendance entirely on working day
        canRaiseRequest = false;
        blockingDate = dateToCheck;
        blockingReason = 'Missing attendance on working day';
        break;
      }

      dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');

      // Safety: limit to 30 days to avoid infinite loop
      if (dayjs(selectedDate).diff(dayjs(dateToCheck), 'days') > 30) {
        break;
      }
    }

    return { canRaiseRequest, blockingDate, blockingReason };
  } catch (error) {
    console.error('Error in validatePreviousDaysAttendance:', error);
    // On error, allow the request to not block user unnecessarily
    return { canRaiseRequest: true, blockingDate: '', blockingReason: '' };
  }
}
