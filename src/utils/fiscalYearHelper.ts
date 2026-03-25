import dayjs, { Dayjs } from 'dayjs';
import { generateFiscalYearFromGivenYear } from './file';

/**
 * Calculate the fiscal month number (1-12) based on calendar month
 *
 * @param calendarMonth - Current calendar month (1-12, Jan=1, Dec=12)
 * @param fiscalStartMonth - Fiscal year start month (1-12, e.g., 4 for April)
 * @returns Fiscal month number (1-12)
 *
 * @example
 * // Fiscal year starts in April (month 4)
 * calculateFiscalMonth(11, 4) // November = 8 (8th month in fiscal year)
 * calculateFiscalMonth(4, 4)  // April = 1 (1st month in fiscal year)
 * calculateFiscalMonth(3, 4)  // March = 12 (12th month in fiscal year)
 */
export const calculateFiscalMonth = (
    calendarMonth: number,
    fiscalStartMonth: number
): number => {
    let fiscalMonth = calendarMonth - fiscalStartMonth + 1;

    // Handle wrap-around (e.g., Jan-Mar when FY starts in April)
    if (fiscalMonth <= 0) {
        fiscalMonth += 12;
    }

    return fiscalMonth;
};

/**
 * Get the current fiscal month based on company's fiscal year configuration
 *
 * @param today - Current date (defaults to today)
 * @param fromAdmin - Whether the request is from admin context
 * @returns Promise<number> - Current fiscal month (1-12)
 */
export const getCurrentFiscalMonth = async (
    today: Dayjs = dayjs(),
    fromAdmin: boolean = false
): Promise<number> => {
    const { startDate } = await generateFiscalYearFromGivenYear(today, fromAdmin);
    const fiscalStartMonth = dayjs(startDate).month() + 1; // 0-indexed to 1-indexed
    const currentCalendarMonth = today.month() + 1;

    return calculateFiscalMonth(currentCalendarMonth, fiscalStartMonth);
};

/**
 * Get fiscal year start month from company configuration
 *
 * @param fromAdmin - Whether the request is from admin context
 * @returns Promise<number> - Fiscal year start month (1-12)
 */
export const getFiscalYearStartMonth = async (fromAdmin: boolean = false): Promise<number> => {
    const { startDate } = await generateFiscalYearFromGivenYear(dayjs(), fromAdmin);
    return dayjs(startDate).month() + 1;
};

/**
 * Calculate pro-rated months for leave calculation based on joining date
 *
 * This function handles two scenarios:
 * 1. Employee joined BEFORE current fiscal year: Full 12 months (no pro-rating)
 * 2. Employee joined DURING current fiscal year: Remaining months (join date to FY end)
 *
 * @param dateOfJoining - Employee's date of joining
 * @param fiscalYearStart - Current fiscal year start date
 * @param fiscalYearEnd - Current fiscal year end date
 * @param today - Current date (defaults to today)
 * @returns Number of months to use for pro-rating (1-12)
 *
 * @example
 * // Employee joined before FY (full 12 months)
 * const proRated = calculateProRatedMonths(
 *     dayjs('2024-03-15'),  // Joined before FY
 *     dayjs('2025-04-01'),  // FY start
 *     dayjs('2026-03-31'),  // FY end
 *     dayjs('2025-11-15')   // Today
 * );
 * // Returns: 12 (full year - no pro-rating for existing employees)
 *
 * @example
 * // Employee joined mid-year (use remaining months)
 * const proRated = calculateProRatedMonths(
 *     dayjs('2025-06-06'),  // Joined in June
 *     dayjs('2025-04-01'),  // FY start
 *     dayjs('2026-03-31'),  // FY end
 *     dayjs('2025-11-15')   // Today
 * );
 * // Returns: 10 (remaining months: June to March)
 */
export const calculateProRatedMonths = (
    dateOfJoining: Dayjs,
    fiscalYearStart: Dayjs,
    fiscalYearEnd: Dayjs,
    today: Dayjs = dayjs()
): number => {
    // Scenario 1: Employee joined before current fiscal year
    // Give full 12 months - no pro-rating needed for existing employees
    if (dateOfJoining.isBefore(fiscalYearStart, 'day')) {
        return 12;
    }

    // Scenario 2: Employee joined during current fiscal year
    // Calculate remaining months from join date to fiscal year end
    const remainingMonths = fiscalYearEnd.diff(dateOfJoining, 'month') + 1;

    // Ensure we return at least 1 month and don't exceed 12
    return Math.max(1, Math.min(remainingMonths, 12));
};
