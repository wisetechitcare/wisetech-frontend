import dayjs, { Dayjs } from 'dayjs';

/**
 * Centralized date format constants and utilities for consistent date display
 * across the application.
 */

export const DATE_FORMATS = {
  /** Full date: "15 Jul 2026" */
  FULL: 'DD MMM YYYY',
  /** Month and year: "Jul 2026" */
  MONTH_YEAR: 'MMM YYYY',
  /** Short date range: "15 Jul – 20 Jul" (same month) or "15 Jul 2026 – 20 Aug 2026" (different months) */
  DATE_RANGE_SHORT: 'DD MMM',
  /** Full date range: "15 Jul 2026 – 20 Aug 2026" */
  DATE_RANGE_FULL: 'DD MMM YYYY',
  /** Year only: "2026" */
  YEAR_ONLY: 'YYYY',
  /** Fiscal year: "FY 2026-27" */
  FISCAL_YEAR: 'FY YYYY',
  /** Date picker format: "15 Jul 2026" */
  DATE_PICKER: 'DD MMM YYYY',
  /** Day only: "15" */
  DAY_ONLY: 'D',
};

/**
 * Format a date range consistently
 * @param start Start date
 * @param end End date
 * @param isSameMonth Whether to use short format for same month ranges
 */
export function formatDateRange(start: Dayjs, end: Dayjs, isSameMonth = true): string {
  if (isSameMonth && start.isSame(end, 'month')) {
    return `${start.format(DATE_FORMATS.DATE_RANGE_SHORT)} – ${end.format(DATE_FORMATS.DATE_RANGE_SHORT)}`;
  }
  return `${start.format(DATE_FORMATS.DATE_RANGE_FULL)} – ${end.format(DATE_FORMATS.DATE_RANGE_FULL)}`;
}

/**
 * Build a fiscal year label, optionally clamped to today (year-to-date)
 * @param fiscalStart Start of fiscal year
 * @param rawEnd Natural end of fiscal year (unclamped)
 * @param clampedEnd Actual end date, may be clamped to today
 * @example
 * buildFiscalYearLabel(Apr 1 2026, Mar 31 2027, Jul 15 2026) → "FY 2026-27 · to 15 Jul"
 * buildFiscalYearLabel(Apr 1 2026, Mar 31 2027, Mar 31 2027) → "FY 2026-27"
 */
export function buildFiscalYearLabel(
  fiscalStart: Dayjs,
  rawEnd: Dayjs,
  clampedEnd: Dayjs
): string {
  const startYear = fiscalStart.format('YYYY');
  const endYear = rawEnd.format('YYYY');
  const base =
    startYear === endYear ? `FY ${startYear}` : `FY ${startYear}-${rawEnd.format('YY')}`;
  const isClamped = !clampedEnd.isSame(rawEnd, 'day');
  return isClamped ? `${base} · to ${clampedEnd.format(DATE_FORMATS.DAY_ONLY)} ${clampedEnd.format('MMM')}` : base;
}

/**
 * Get a display label for any period mode
 */
export function getPeriodLabel(
  mode: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'allyear' | 'custom',
  start: Dayjs | null,
  end: Dayjs | null,
  label?: string
): string {
  if (label) return label;

  switch (mode) {
    case 'daily':
      return start ? start.format(DATE_FORMATS.FULL) : 'Daily';
    case 'weekly':
      return start && end ? formatDateRange(start, end, false) : 'Weekly';
    case 'monthly':
      return start ? start.format(DATE_FORMATS.MONTH_YEAR) : 'Monthly';
    case 'yearly':
      return start ? start.format(DATE_FORMATS.YEAR_ONLY) : 'Yearly';
    case 'allyear':
      return 'All Time';
    case 'custom':
      return start && end ? formatDateRange(start, end, false) : 'Custom';
    default:
      return '';
  }
}
