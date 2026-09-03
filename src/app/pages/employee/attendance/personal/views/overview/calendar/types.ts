/**
 * The resolved-day model the calendar renders.
 *
 * These types are the CONTRACT with `GET /api/employee/attendance/calendar`.
 * The grid, the cell, the tooltip and the legend all read this shape and
 * nothing else — no component below `MonthGrid` touches Redux, a service, or
 * a date library for business meaning. That is what stops the browser from
 * re-deriving day status the way `transformAttendance` does today.
 *
 * Until the endpoint ships, an adapter maps the existing `IAttendance[]` into
 * `CalendarDay[]` (see `adaptLegacyRows`), so the UI can migrate first and the
 * server can catch up without a second rewrite.
 */

/** Exactly one per day. Mutually exclusive. */
export type DayStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'half_day'
  | 'holiday'
  | 'weekly_off'
  | 'not_employed'
  | 'future';

/**
 * Zero or more per day, independent of status.
 *
 * The split is the point: a flat enum forces "present" and "late" to compete
 * for the same slot, which is why worked-on-a-holiday is unrepresentable in
 * the current model and why the legend has to merge entries.
 */
export type DayModifier =
  | 'late_in'
  | 'early_in'
  | 'early_out'
  | 'late_out'
  | 'missing_check_in'
  | 'missing_check_out'
  | 'regularized'
  | 'request_pending'
  | 'request_rejected'
  | 'worked_on_off_day'
  | 'overtime'
  | 'remote'
  | 'on_site';

export interface CalendarDay {
  /** YYYY-MM-DD in the employee's branch timezone. Never re-parsed for meaning. */
  date: string;
  status: DayStatus;
  modifiers: DayModifier[];
  /** false for the leading/trailing days of adjacent months. */
  inMonth: boolean;

  actual: {
    checkIn: string | null;
    checkOut: string | null;
    minutesWorked: number | null;
  };
  /** The shift the day was judged against. A time alone is data; a time against its threshold is a judgement. */
  expected: {
    checkIn: string | null;
    checkOut: string | null;
    source: 'day_wise_shift' | 'company_default' | 'override' | null;
  };

  leave?: {
    type: string;
    fraction: 0.5 | 1;
    session: 'first_half' | 'second_half' | null;
    leaveId: string;
  };
  holiday?: { name: string; observedIn: string | null };
  request?: {
    id: string;
    kind: 'check_in' | 'check_out';
    status: 'pending' | 'approved' | 'rejected';
    stage: string | null;
  };

  workMode: string | null;
  /** Verbatim from the server's `evaluateLateMark`. Never recomputed here. */
  lateMark?: {
    isLate: boolean;
    rule: string;
    reason: string;
    lateMinutes: number;
    thresholdLabel: string;
  };
  /** Whether policy allows raising a correction — decided by the server, not by the tile. */
  canRaiseCorrection?: boolean;
}

export interface CalendarSummary {
  present: number;
  leave: number;
  absent: number;
  late: number;
  missingPunch: number;
  pending: number;
  workedOffDays: number;
  holidays: number;
  weeklyOffs: number;
  minutesWorked: number;
}

/** A filterable legend key is either a status or a modifier. */
export type LegendKey = DayStatus | DayModifier;

export interface LegendEntry {
  key: LegendKey;
  label: string;
  count: number;
}

export interface AttendanceCalendarResponse {
  month: string;
  timezone: string;
  employeeId: string;
  days: CalendarDay[];
  summary: CalendarSummary;
  legend: LegendEntry[];
}
