/** Default required shift length when config is not passed (8 hours). */
export const REQUIRED_SHIFT_MINUTES = 8 * 60;

import { ATTENDANCE_COLORS } from '@utils/attendanceColorUtils';

/** @deprecated Use ATTENDANCE_COLORS from attendanceColorUtils */
export const ATTENDANCE_TIME_NORMAL_COLOR = ATTENDANCE_COLORS.normal;
/** @deprecated Use ATTENDANCE_COLORS from attendanceColorUtils */
export const ATTENDANCE_TIME_LATE_COLOR = ATTENDANCE_COLORS.danger;

const MISSING_DURATION = new Set(['-NA-', '-', 'N/A', 'NA', '']);

/**
 * Parses duration strings like "8H 30M" / "7H 56M" into total minutes.
 */
export function parseDurationToMinutes(durationStr?: string | null): number | null {
  if (!durationStr || MISSING_DURATION.has(String(durationStr).trim())) {
    return null;
  }
  const hoursMatch = String(durationStr).match(/(\d+)H/i);
  const minutesMatch = String(durationStr).match(/(\d+)M/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

export function isCheckOutMissing(checkOut?: string | null): boolean {
  if (checkOut == null) return true;
  const t = String(checkOut).trim();
  return t === '' || MISSING_DURATION.has(t);
}

export function isShiftIncomplete(
  durationStr?: string | null,
  requiredMinutes: number = REQUIRED_SHIFT_MINUTES
): boolean {
  const total = parseDurationToMinutes(durationStr);
  return total !== null && total < requiredMinutes;
}

/** Human-readable shortfall, e.g. "Short by 4 minutes" or "Short by 1h 4m". */
export function formatDurationShortfall(
  durationStr: string,
  requiredMinutes: number = REQUIRED_SHIFT_MINUTES
): string {
  const total = parseDurationToMinutes(durationStr);
  if (total === null || total >= requiredMinutes) return '';
  const shortBy = requiredMinutes - total;
  const hours = Math.floor(shortBy / 60);
  const mins = shortBy % 60;
  if (hours > 0 && mins > 0) return `Short by ${hours}h ${mins}m`;
  if (hours > 0) return `Short by ${hours}h`;
  return `Short by ${mins} minute${mins === 1 ? '' : 's'}`;
}

export function formatRequiredShiftLabel(requiredMinutes: number = REQUIRED_SHIFT_MINUTES): string {
  const hours = requiredMinutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${(requiredMinutes / 60).toFixed(1)}h`;
}
