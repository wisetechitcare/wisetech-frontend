import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import durationPlugin from 'dayjs/plugin/duration';
import {
  ENFORCE_ONSITE_DEADLINE_KEY,
  GRACE_TIME_ON_SITE_KEY,
} from '@constants/configurations-key';
import { ATTENDANCE_STATUS, WORKING_METHOD_TYPE } from '@constants/attendance';

dayjs.extend(customParseFormat);
dayjs.extend(durationPlugin);

/** Semantic color tokens for attendance tables */
export const ATTENDANCE_COLORS = {
  success: '#28A745',
  danger: '#DC3545',
  muted: '#6C757D',
  normal: '#212529',
} as const;

export type AttendanceColorTone = 'success' | 'danger' | 'muted' | 'normal';

export type CheckInColorResult = {
  tone: AttendanceColorTone;
  color: string;
  isLate: boolean;
  tooltip?: string;
};

export type CheckOutColorResult = {
  tone: AttendanceColorTone;
  color: string;
};

const MISSING = new Set(['-NA-', '-', 'N/A', 'NA', '']);

export function isAttendanceTimeMissing(value?: string | null): boolean {
  if (value == null) return true;
  return MISSING.has(String(value).trim());
}

export function normalizeWorkingMethodKey(method?: string | null): string {
  return String(method ?? '')
    .trim()
    .replace(/-/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function isOnsiteWorkingMethod(method?: string | null): boolean {
  const key = normalizeWorkingMethodKey(method);
  return key === 'onsite' || method === WORKING_METHOD_TYPE.ON_SITE;
}

/** Reads Enforce Onsite Deadline from leave-management JSON (default: enforced). */
export function isOnsiteDeadlineEnforced(
  leaveConfig?: Record<string, unknown> | null
): boolean {
  const config = leaveConfig ?? {};
  const raw = config[ENFORCE_ONSITE_DEADLINE_KEY];
  if (typeof raw === 'boolean') return raw;
  if (raw === undefined || raw === null) return true;
  const lowered = String(raw).trim().toLowerCase();
  if (lowered === 'false' || lowered === '0' || lowered === 'no') return false;
  return true;
}

function parseOnsiteClockDeadline(raw: unknown): { hour: number; minute: number; label: string } {
  const source =
    raw !== undefined && raw !== null && String(raw).trim() !== ''
      ? String(raw)
      : '11:00';
  const parts = source.split(/\s+/)[0].split(':').map(Number);
  const hour = Number.isFinite(parts[0]) ? parts[0] : 11;
  const minute = Number.isFinite(parts[1]) ? parts[1] : 0;
  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { hour, minute, label };
}

/**
 * Parses grace duration from "00:29:59", "00:30", or "00:30:00 Hrs".
 */
export function parseGraceDurationMinutes(graceRaw?: string | null): number {
  const graceStr = String(graceRaw ?? '')
    .replace(/Hrs/gi, '')
    .trim();
  const parts = graceStr.split(':').map(Number).filter((n) => !Number.isNaN(n));
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return hours * 60 + minutes + Math.floor(seconds / 60);
}

/**
 * Parses check-in / threshold strings (24h or 12h) on a reference calendar day.
 */
export function parseAttendanceTime(
  timeStr: string,
  referenceDate: string = dayjs().format('YYYY-MM-DD')
): Dayjs | null {
  const trimmed = timeStr.trim();
  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD h:mm:ss A',
    'YYYY-MM-DD h:mm A',
    'HH:mm:ss',
    'HH:mm',
    'h:mm:ss A',
    'h:mm A',
  ];

  for (const fmt of formats) {
    const withDate = fmt.includes('YYYY') ? trimmed : `${referenceDate} ${trimmed}`;
    const parsed = dayjs(withDate, fmt, true);
    if (parsed.isValid()) return parsed;
  }

  const loose = dayjs(`${referenceDate} ${trimmed}`);
  return loose.isValid() ? loose : null;
}

function formatLateByMinutes(lateMinutes: number): string {
  if (lateMinutes <= 0) return '';
  const hours = Math.floor(lateMinutes / 60);
  const mins = lateMinutes % 60;
  if (hours > 0 && mins > 0) return `Late by ${hours}h ${mins}m`;
  if (hours > 0) return `Late by ${hours}h`;
  return `Late by ${mins} minute${mins === 1 ? '' : 's'}`;
}

export type ResolveCheckInColorInput = {
  checkIn?: string | null;
  workingMethod?: string | null;
  /** Row date (YYYY-MM-DD) for onsite clock deadline */
  date?: string | null;
  /** Office path: precomputed allowed latest check-in (shift start + grace) as HH:mm:ss */
  lateCheckInThreshold?: string | null;
  leaveConfig?: Record<string, unknown> | null;
  /** Weekend/holiday/leave rows — show muted, no red/green */
  skipColoring?: boolean;
};

/**
 * Check-in color: green if on-time/early, red if late, muted if missing/neutral row.
 */
export function resolveCheckInColor(input: ResolveCheckInColorInput): CheckInColorResult {
  const {
    checkIn,
    workingMethod,
    date,
    lateCheckInThreshold,
    leaveConfig,
    skipColoring = false,
  } = input;

  if (skipColoring || isAttendanceTimeMissing(checkIn)) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted, isLate: false };
  }

  const referenceDate = date || dayjs().format('YYYY-MM-DD');
  const checkInTime = parseAttendanceTime(checkIn!, referenceDate);
  if (!checkInTime) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted, isLate: false };
  }

  if (isOnsiteWorkingMethod(workingMethod)) {
    if (!isOnsiteDeadlineEnforced(leaveConfig)) {
      return {
        tone: 'success',
        color: ATTENDANCE_COLORS.success,
        isLate: false,
        tooltip: 'On-site check-in (deadline not enforced)',
      };
    }

    const { hour, minute, label } = parseOnsiteClockDeadline(
      leaveConfig?.[GRACE_TIME_ON_SITE_KEY]
    );
    const deadline = checkInTime
      .hour(hour)
      .minute(minute)
      .second(59)
      .millisecond(999);

    if (checkInTime.isAfter(deadline)) {
      const lateMinutes = checkInTime.diff(deadline, 'minute');
      return {
        tone: 'danger',
        color: ATTENDANCE_COLORS.danger,
        isLate: true,
        tooltip: `${formatLateByMinutes(lateMinutes)} (deadline ${label})`,
      };
    }

    return {
      tone: 'success',
      color: ATTENDANCE_COLORS.success,
      isLate: false,
      tooltip: `Within on-site deadline (${label})`,
    };
  }

  if (!lateCheckInThreshold || isAttendanceTimeMissing(lateCheckInThreshold)) {
    return { tone: 'normal', color: ATTENDANCE_COLORS.normal, isLate: false };
  }

  const allowedTime = parseAttendanceTime(lateCheckInThreshold, referenceDate);
  if (!allowedTime) {
    return { tone: 'normal', color: ATTENDANCE_COLORS.normal, isLate: false };
  }

  if (checkInTime.isAfter(allowedTime)) {
    const lateMinutes = checkInTime.diff(allowedTime, 'minute');
    return {
      tone: 'danger',
      color: ATTENDANCE_COLORS.danger,
      isLate: true,
      tooltip: formatLateByMinutes(lateMinutes),
    };
  }

  return {
    tone: 'success',
    color: ATTENDANCE_COLORS.success,
    isLate: false,
  };
}

export function resolveCheckOutColor(checkOut?: string | null): CheckOutColorResult {
  if (isAttendanceTimeMissing(checkOut)) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted };
  }
  return { tone: 'normal', color: ATTENDANCE_COLORS.normal };
}

/** Whether check-in should use late/on-time colors for this row */
export function shouldApplyCheckInColoring(
  status?: string | null,
  isWeekendOrHoliday?: boolean
): boolean {
  if (!status) return true;
  const { LEAVE, WEEKEND, HOLIDAY, ABSENT } = ATTENDANCE_STATUS;
  if (status === LEAVE || status === HOLIDAY) return false;
  if (status === WEEKEND && isWeekendOrHoliday) return false;
  if (status === ABSENT) return false;
  return true;
}

export function getCheckInColorClass(result: CheckInColorResult): string {
  switch (result.tone) {
    case 'success':
      return 'text-success';
    case 'danger':
      return 'text-danger';
    case 'muted':
      return 'text-muted';
    default:
      return 'text-dark';
  }
}

export function getCheckOutColorClass(result: CheckOutColorResult): string {
  return result.tone === 'muted' ? 'text-muted' : 'text-dark';
}

const REQUIRED_SHIFT_MINUTES_DEFAULT = 8 * 60;

function parseDurationMinutesLocal(durationStr?: string | null): number | null {
  if (isAttendanceTimeMissing(durationStr)) return null;
  const hoursMatch = String(durationStr).match(/(\d+)H/i);
  const minutesMatch = String(durationStr).match(/(\d+)M/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

export type DurationColorResult = {
  tone: AttendanceColorTone;
  color: string;
  showPill: boolean;
  tooltip?: string;
};

/**
 * Duration color: red pill when shift incomplete, dark when complete, muted when no checkout.
 */
export function resolveDurationColor(
  duration?: string | null,
  checkOut?: string | null,
  requiredMinutes: number = REQUIRED_SHIFT_MINUTES_DEFAULT,
  skipHighlight = false
): DurationColorResult {
  if (isAttendanceTimeMissing(checkOut)) {
    return {
      tone: 'muted',
      color: ATTENDANCE_COLORS.muted,
      showPill: false,
      tooltip: 'Check-out not recorded',
    };
  }

  const total = parseDurationMinutesLocal(duration);
  if (total === null) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted, showPill: false };
  }

  if (!skipHighlight && total < requiredMinutes) {
    const shortBy = requiredMinutes - total;
    const hours = Math.floor(shortBy / 60);
    const mins = shortBy % 60;
    const workedH = Math.floor(total / 60);
    const workedM = total % 60;
    const worked =
      workedH > 0 ? `${workedH}h ${workedM}m` : `${workedM}m`;
    const requiredLabel = `${requiredMinutes / 60}h`;
    const shortfall =
      hours > 0 && mins > 0
        ? `Short by ${hours}h ${mins}m`
        : hours > 0
          ? `Short by ${hours}h`
          : `Short by ${mins} minute${mins === 1 ? '' : 's'}`;

    return {
      tone: 'danger',
      color: ATTENDANCE_COLORS.danger,
      showPill: true,
      tooltip: `Shift incomplete: ${worked} / ${requiredLabel} required (${shortfall})`,
    };
  }

  return {
    tone: 'normal',
    color: ATTENDANCE_COLORS.normal,
    showPill: false,
  };
}

export function getDurationColorClass(result: DurationColorResult): string {
  switch (result.tone) {
    case 'danger':
      return 'text-danger';
    case 'muted':
      return 'text-muted';
    default:
      return 'text-dark';
  }
}
