import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import durationPlugin from 'dayjs/plugin/duration';
import {
  ENFORCE_ONSITE_DEADLINE_KEY,
  ONSITE_HOLIDAY_WEEKEND_EXEMPTION_KEY,
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

/**
 * Master policy switch — Attendance Settings → "On-site, Holiday & Weekend Settings
 * for late attendance". When ON, on-site check-ins never show a late mark (holiday and
 * weekend rows are already muted by `shouldApplyCheckInColoring`). Stored by the
 * settings UI as "1" / "0"; absent → OFF.
 * Mirrors the backend `isOnsiteHolidayWeekendExemptionEnabled`; keep the two in step.
 */
export function isOnsiteHolidayWeekendExemptionEnabled(
  leaveConfig?: Record<string, unknown> | null
): boolean {
  const raw = (leaveConfig ?? {})[ONSITE_HOLIDAY_WEEKEND_EXEMPTION_KEY];
  if (raw === undefined || raw === null) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw > 0;
  const lowered = String(raw).trim().toLowerCase();
  return lowered === '1' || lowered === 'true' || lowered === 'yes' || lowered === 'on';
}

/**
 * On-site check-ins are never late by DEFAULT — the deadline applies only when
 * "Enforce Onsite Deadline" is explicitly ON *and* a "Grace Time - On Site" is set.
 * Mirrors the backend `parseOnsiteGraceConfig`; keep the two in step.
 */
export function isOnsiteDeadlineEnforced(
  leaveConfig?: Record<string, unknown> | null
): boolean {
  const config = leaveConfig ?? {};
  const raw = config[ENFORCE_ONSITE_DEADLINE_KEY];
  const toggledOn =
    typeof raw === 'boolean'
      ? raw
      : raw !== undefined && raw !== null
        ? ['true', '1', 'yes', 'on'].includes(String(raw).trim().toLowerCase())
        : false;
  if (!toggledOn) return false;

  const deadline = config[GRACE_TIME_ON_SITE_KEY];
  return deadline !== undefined && deadline !== null && String(deadline).trim() !== '';
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
  /**
   * This row's calendar verdict: the day is a weekend, a branch off-day or a public
   * holiday. Feeds the master policy switch below (ladder rule 2), which covers
   * on-site *and* holiday *and* weekend — not just on-site.
   */
  isWeekendOrHoliday?: boolean;
  /**
   * Server verdict: this day's late mark is waived (the previous work day ran past the
   * configured late-night cutoff). Comes from the API — the rule lives on the backend so
   * every screen and payroll agree; never re-derive it here.
   */
  lateWaived?: boolean;
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
    lateWaived = false,
    isWeekendOrHoliday = false,
  } = input;

  if (skipColoring || isAttendanceTimeMissing(checkIn)) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted, isLate: false };
  }

  // Late-night waiver — worked past the cutoff the previous day, so today is never late.
  if (lateWaived) {
    return {
      tone: 'success',
      color: ATTENDANCE_COLORS.success,
      isLate: false,
      tooltip: 'On time — late mark waived after a late-night shift the previous day',
    };
  }

  const referenceDate = date || dayjs().format('YYYY-MM-DD');
  const checkInTime = parseAttendanceTime(checkIn!, referenceDate);
  if (!checkInTime) {
    return { tone: 'muted', color: ATTENDANCE_COLORS.muted, isLate: false };
  }

  // Master policy switch — ladder rule 2 of the backend `evaluateLateMark`, which has
  // THREE legs: on-site, public holiday, weekend/off day. This sat inside the on-site
  // branch below, so an OFFICE check-in on a weekend or holiday skipped it entirely and
  // was scored against shift+grace — the red weekend rows in the attendance report.
  // It must stay ABOVE the working-method split for the same reason it outranks the
  // on-site deadline: company policy cannot be reintroduced by a lower rule.
  if (isOnsiteHolidayWeekendExemptionEnabled(leaveConfig)) {
    const onSite = isOnsiteWorkingMethod(workingMethod);
    if (onSite || isWeekendOrHoliday) {
      return {
        tone: 'success',
        color: ATTENDANCE_COLORS.success,
        isLate: false,
        tooltip: onSite
          ? 'On-site check-in — late marks disabled by company policy'
          : 'Worked on a weekend/holiday — late marks disabled by company policy',
      };
    }
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

  // Make the grace window visible: both branches spell out the on-time deadline
  // (shift start + grace) so a check-in that lands after the shift but before the
  // deadline reads as on-time for an obvious reason, not a mystery.
  const deadlineLabel = allowedTime.format('h:mm:ss A');

  if (checkInTime.isAfter(allowedTime)) {
    const lateMinutes = checkInTime.diff(allowedTime, 'minute');
    const lateText = formatLateByMinutes(lateMinutes) || 'Late';
    return {
      tone: 'danger',
      color: ATTENDANCE_COLORS.danger,
      isLate: true,
      tooltip: `${lateText} — on-time grace ends ${deadlineLabel}`,
    };
  }

  return {
    tone: 'success',
    color: ATTENDANCE_COLORS.success,
    isLate: false,
    tooltip: `On time — within grace (deadline ${deadlineLabel})`,
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
