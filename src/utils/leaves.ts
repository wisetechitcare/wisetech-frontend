import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Calculate total leave days from date range (inclusive)
 * @param leave - Leave object with dateFrom and dateTo
 * @returns Number of days in the leave period
 */
export const getLeaveDays = (leave: { dateFrom: any; dateTo: any; isHalfDay?: boolean | null }): number => {
    const from = dayjs(leave.dateFrom);
    const to = dayjs(leave.dateTo);
    const days = to.diff(from, 'day') + 1;
    if (days <= 0) return 0;
    // Half-day leaves are constrained to a single day and always cost 0.5.
    if (leave.isHalfDay) return 0.5;
    return days;
};

/**
 * Calculate working days in leave period (excluding weekends)
 * @param leave - Leave object with dateFrom and dateTo
 * @param publicHolidays - Array of public holiday dates (optional)
 * @returns Number of working days
 */
export const getWorkingDays = (
    leave: { dateFrom: any; dateTo: any; isHalfDay?: boolean | null },
    publicHolidays: string[] = []
): number => {
    const from = dayjs(leave.dateFrom);
    const to = dayjs(leave.dateTo);
    let workingDays = 0;

    let current = from;
    while (current.isSameOrBefore(to)) {
        const dayOfWeek = current.day(); // 0 = Sunday, 6 = Saturday
        const dateStr = current.format('YYYY-MM-DD');

        // Count if not weekend and not public holiday
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !publicHolidays.includes(dateStr)) {
            workingDays++;
        }

        current = current.add(1, 'day');
    }

    // Half-day leaves cost 0.5 of a working day (mirrors the backend getChargeableLeaveDays).
    if (leave.isHalfDay && workingDays > 0) return 0.5;

    return workingDays;
};

/**
 * Calculate leave days for multiple leaves
 * @param leaves - Array of leave objects
 * @returns Total leave days
 */
export const getTotalLeaveDays = (leaves: Array<{ dateFrom: any; dateTo: any }>): number => {
    return leaves.reduce((total, leave) => total + getLeaveDays(leave), 0);
};

/**
 * Calculate working days for multiple leaves
 * @param leaves - Array of leave objects
 * @param publicHolidays - Array of public holiday dates
 * @returns Total working days
 */
export const getTotalWorkingDays = (
    leaves: Array<{ dateFrom: any; dateTo: any }>,
    publicHolidays: string[] = []
): number => {
    return leaves.reduce((total, leave) => total + getWorkingDays(leave, publicHolidays), 0);
};