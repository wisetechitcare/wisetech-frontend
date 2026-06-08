import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { fetchCompanyOverview, fetchAllPublicHolidays } from "@services/company";
import { fetchEmployeeLeaves, fetchEmpAttendanceStatistics, getAttendanceRequest } from "@services/employee";
import { customLeaves, filterLeavesPublicHolidays } from "@utils/statistics";

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
 * Validates if a user can raise an attendance request for a given date.
 *
 * Rule: For every previous working day (going back from selectedDate − 1),
 * the day must have EITHER:
 *   - An attendance record (check-in present), OR
 *   - Any attendance request (pending OR approved — status doesn't matter), OR
 *   - Be a non-working day (weekend / public holiday / branch off-day / approved leave)
 *
 * A working day with NO attendance AND NO request at all blocks the new request.
 * Having a pending request is sufficient — approval is not required.
 */
export async function validatePreviousDaysAttendance(params: ValidationParams): Promise<ValidationResult> {
  const { employeeId, selectedDate, dateOfJoining, workingAndOfDays, offDaysForTheBranch } = params;

  try {
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

    const publicHolidaysMap = new Map();
    publicHolidays.forEach((holiday: any) => {
      publicHolidaysMap.set(dayjs(holiday.date).format('YYYY-MM-DD'), holiday);
    });

    // Returns true for weekends, branch off-days, public holidays, and approved leaves.
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

    // Returns whether the day has any attendance record OR any request (any status).
    const checkDayHasData = async (date: string): Promise<{ hasCheckIn: boolean; hasAnyRequest: boolean }> => {
      const [attendanceRes, requestsRes] = await Promise.all([
        fetchEmpAttendanceStatistics(employeeId, date, date),
        getAttendanceRequest(employeeId, date, date),
      ]);
      const empAttendanceStatistics = attendanceRes?.data?.empAttendanceStatistics ?? [];
      const attendanceRequests = requestsRes?.data?.attendanceRequests ?? [];
      return {
        hasCheckIn: empAttendanceStatistics.length > 0 && empAttendanceStatistics[0].checkIn !== null,
        hasAnyRequest: attendanceRequests.length > 0,
      };
    };

    let dateToCheck = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    let canRaiseRequest = true;
    let blockingDate = '';
    let blockingReason = '';

    while (true) {
      // Don't check across month boundaries
      if (dayjs(dateToCheck).format('YYYY-MM') !== dayjs().format('YYYY-MM')) {
        canRaiseRequest = true;
        blockingDate = '';
        break;
      }

      // Don't check before date of joining
      if (dayjs(dateToCheck).isSameOrBefore(dayjs(dateOfJoining))) {
        canRaiseRequest = true;
        break;
      }

      // Safety: limit to 30 days to avoid excessive API calls
      if (dayjs(selectedDate).diff(dayjs(dateToCheck), 'days') > 30) {
        canRaiseRequest = true;
        break;
      }

      // Non-working days (weekends, holidays, off-days, leaves) are always fine
      if (isNonWorkingDay(dateToCheck)) {
        dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
        continue;
      }

      // Working day — check if there is any attendance or any request
      const { hasCheckIn, hasAnyRequest } = await checkDayHasData(dateToCheck);

      if (hasCheckIn || hasAnyRequest) {
        // Day has data (attendance or request, any status) → OK, check the day before
        dateToCheck = dayjs(dateToCheck).subtract(1, 'day').format('YYYY-MM-DD');
        continue;
      }

      // Working day with no attendance and no request → block
      canRaiseRequest = false;
      blockingDate = dateToCheck;
      blockingReason = 'No attendance or request found for this working day';
      break;
    }

    return { canRaiseRequest, blockingDate, blockingReason };
  } catch (error) {
    console.error('Error in validatePreviousDaysAttendance:', error);
    // On error, allow the request to not block user unnecessarily
    return { canRaiseRequest: true, blockingDate: '', blockingReason: '' };
  }
}
