/**
 * Leave-day counting + branch-weekend helpers.
 *
 * These COUNT the stored, already-booked leave rows (Redux `attendanceStats.leaves`) over a month
 * or fiscal-year range. They deliberately do NOT re-apply any sandwich logic: sandwich days are now
 * decided once, on the backend rule engine (SANDWICH_RULES.md v7.0), and persisted as the correct
 * paid/unpaid `LeaveTracker` rows. Re-classifying them on the client was the old D-7 divergence
 * between the payslip display and actual payroll — this module replaces the legacy
 * `sandwhichConfiguration.ts` for salary display.
 */
import { LeaveTypes, LeaveStatus } from '@constants/attendance';
import { Employee } from '@redux/slices/employee';
import { store } from '@redux/store';
import { fetchBranchById } from '@services/company';
import { generateFiscalYearFromGivenYear } from './file';
import { parseWorkingDays } from './workingDays';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const PAID_LEAVE_TYPES = [
    LeaveTypes.CASUAL_LEAVE,
    LeaveTypes.MATERNAL_LEAVE,
    LeaveTypes.FLOATER_LEAVE,
    LeaveTypes.SICK_LEAVE,
    LeaveTypes.ANNUAL_LEAVE,
];

const approvedLeaves = () =>
    store.getState().attendanceStats.leaves.filter((leave: any) => leave.status == LeaveStatus.Approved);

/** Weekday numbers (0=Sun … 6=Sat) that are the current employee's branch off-days. */
export async function getAllWeekends(): Promise<number[]> {
    const branchId = store.getState().employee.currentEmployee?.branchId;
    if (!branchId) {
        console.warn('BranchId not found');
        return [];
    }
    try {
        const { data } = await fetchBranchById(branchId);
        // The API may return workingAndOffDays as a JSON string OR an already-parsed object; raw
        // JSON.parse crashes on the latter ("[object Object]" is not valid JSON) and on the literal
        // "null". parseWorkingDays normalises every shape to a {day: "1"|"0"} map. [[project_working_days_parse_safety]]
        const weekendsConfig = parseWorkingDays(data?.branch?.workingAndOffDays);
        const dayMap: { [key: string]: number } = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
        };
        return Object.keys(dayMap)
            .filter(day => weekendsConfig[day]?.trim?.() === '0')
            .map(day => dayMap[day]);
    } catch (error) {
        console.error('Error in getAllWeekends:', error);
        return [];
    }
}

/** Count paid-type leave DAYS booked within the given month. */
export async function getAllPaidLeavesCurrentMonth(
    year: Dayjs, month: Dayjs, _fromAdmin?: boolean, _employee?: Employee[],
): Promise<number> {
    const currentMonth = dayjs(`${year.year()}-${String(month.month() + 1).padStart(2, '0')}-01`, 'YYYY-MM-DD');
    if (!currentMonth.isValid()) return 0;

    let count = 0;
    for (const leave of approvedLeaves()) {
        if (!PAID_LEAVE_TYPES.includes(leave.leaveOptions.leaveType as LeaveTypes)) continue;
        const start = dayjs(leave.date || leave.dateFrom);
        const end = leave.dateTo ? dayjs(leave.dateTo) : start;
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            if (cur.format('YYYY-MM') === currentMonth.format('YYYY-MM')) count += leave.isHalfDay ? 0.5 : 1;
            cur = cur.add(1, 'day');
        }
    }
    return count;
}

/** Count Unpaid leave DAYS booked within the given month. */
export async function getAllUnPaidLeavesCurrentMonth(
    year: Dayjs, month: Dayjs, _fromAdmin?: boolean, _employee?: Employee[],
): Promise<number> {
    const currentMonth = dayjs(`${year.year()}-${String(month.month() + 1).padStart(2, '0')}-01`, 'YYYY-MM-DD');
    if (!currentMonth.isValid()) return 0;

    let count = 0;
    for (const leave of approvedLeaves()) {
        if (leave.leaveOptions.leaveType !== LeaveTypes.UNPAID_LEAVE) continue;
        const start = dayjs(leave.date || leave.dateFrom);
        const end = leave.dateTo ? dayjs(leave.dateTo) : start;
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            if (cur.format('YYYY-MM') === currentMonth.format('YYYY-MM')) count += leave.isHalfDay ? 0.5 : 1;
            cur = cur.add(1, 'day');
        }
    }
    return count;
}

/** Count paid-type leave DAYS from `startDateOfMonthOrYear` to today (or fiscal-year end). */
export async function getAllPaidLeaveOfYearFilteredByStartAndEndDate(
    year: Dayjs, _fromAdmin?: boolean, _employee?: Employee[], startDateOfMonthOrYear?: Dayjs,
): Promise<number> {
    const { endDate } = await generateFiscalYearFromGivenYear(year, true);
    const rangeStart = dayjs(startDateOfMonthOrYear);
    const rangeEnd = dayjs(endDate).isSameOrBefore(dayjs()) ? dayjs(endDate) : dayjs();

    let count = 0;
    for (const leave of approvedLeaves()) {
        const start = dayjs(leave.date || leave.dateFrom);
        const end = leave.dateTo ? dayjs(leave.dateTo) : start;
        if (end.isBefore(rangeStart) || start.isAfter(rangeEnd)) continue;
        if (!PAID_LEAVE_TYPES.includes(leave.leaveOptions.leaveType as LeaveTypes)) continue;
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            if (cur.isBetween(rangeStart, rangeEnd, 'day', '[]')) count += leave.isHalfDay ? 0.5 : 1;
            cur = cur.add(1, 'day');
        }
    }
    return count;
}

/** Count Unpaid leave DAYS from `startDateOfMonthOrYear` to today (or fiscal-year end). */
export async function getAllUnPaidLeavesForCurrentYear(
    year: Dayjs, _fromAdmin?: boolean, _employee?: Employee[], startDateOfMonthOrYear?: Dayjs,
): Promise<number> {
    const { endDate } = await generateFiscalYearFromGivenYear(year, true);
    const rangeStart = dayjs(startDateOfMonthOrYear);
    const rangeEnd = dayjs(endDate).isSameOrBefore(dayjs()) ? dayjs(endDate) : dayjs();

    let count = 0;
    for (const leave of approvedLeaves()) {
        if (leave.leaveOptions.leaveType !== LeaveTypes.UNPAID_LEAVE) continue;
        const start = dayjs(leave.date || leave.dateFrom);
        const end = leave.dateTo ? dayjs(leave.dateTo) : start;
        let cur = start.clone();
        while (cur.isSameOrBefore(end)) {
            if (cur.isBetween(rangeStart, rangeEnd, 'day', '[]')) count += leave.isHalfDay ? 0.5 : 1;
            cur = cur.add(1, 'day');
        }
    }
    return count;
}
