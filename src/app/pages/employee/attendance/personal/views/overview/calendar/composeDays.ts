/**
 * composeDays — raw records in, resolved days out.
 *
 * ⚠️ THIS FILE IS A BRIDGE. It is a client-side stand-in for the server's
 * `composeDays`, written with the SAME inputs and the SAME output so the move
 * is a copy, not a rewrite. When `GET /api/employee/attendance/calendar` ships,
 * delete this file and the adapter that feeds it — do not keep both.
 *
 * It exists because the UI can migrate in a week and the endpoint cannot, and
 * because leaving the calendar on `transformAttendance` for that week means
 * shipping the new grid with the old truth defects still in it.
 *
 * It is deliberately PURE — no Redux, no services, no `store.getState()`. That
 * is what makes it testable now and liftable later. `transformAttendance`, by
 * contrast, reaches into the store from inside a `.map()`.
 *
 * ── What this fixes that `transformAttendance` gets wrong ──────────────────
 *
 *  T-01  Half-day leave is 0.5, not a full LEAVE tile. `isHalfDay` and
 *        `halfDaySession` are already on ILeaves and are simply never read.
 *  T-02  Attendance OUTRANKS the calendar. The current code returns HOLIDAY
 *        before it ever looks at a punch, so working a holiday is
 *        unrepresentable. Here a punch wins and the holiday becomes context.
 *  T-03  A pending correction is its own state, not an unexplained absence.
 *  T-04  ONE weekend predicate, via `isNonWorkingWeekday` + `parseWorkingDays`
 *        (the guarded parse — a raw JSON.parse crashes on the string "null").
 *  T-05  ONE timezone, the employee's branch, threaded through every bucket.
 *        The current code hardcodes MUMBAI_TZ.
 *  T-06  Padding days are marked `inMonth: false` and dimmed uniformly.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { isNonWorkingWeekday } from '@utils/workingDays';
import type { CalendarDay, CalendarSummary, DayModifier, DayStatus } from './types';

dayjs.extend(utc);
dayjs.extend(timezone);

const CELLS = 42;

/** Raw attendance row as the API returns it (`Attendance` in models/employee). */
export interface RawAttendance {
  id?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  leaveTrackedId?: string | null;
  requestRaised?: boolean | null;
  workingMethod?: { type?: string | null } | null;
}

export interface RawLeave {
  dateFrom?: string;
  dateTo?: string;
  statusNumber?: number;
  type?: string;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
  id?: string;
}

export interface RawHoliday {
  date?: string;
  isActive?: boolean;
  holiday?: { name?: string } | null;
  observedIn?: string | null;
}

export interface RawRequest {
  id?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: number; // 0 pending · 1 approved · 2 rejected
}

export interface ComposeInput {
  /** YYYY-MM */
  month: string;
  /** IANA zone of the employee's branch. Never a hardcoded default. */
  timezone: string;
  attendance: RawAttendance[];
  leaves: RawLeave[];
  holidays: RawHoliday[];
  requests: RawRequest[];
  /** Parsed branch working/off days, or null when unset. */
  workingDays: Record<string, string> | null;
  dateOfJoining?: string | null;
  dateOfExit?: string | null;
}

export function composeDays(input: ComposeInput): CalendarDay[] {
  const { month, timezone: tz } = input;
  const cursor = dayjs(`${month}-01`);
  const gridStart = cursor.startOf('month').subtract((cursor.startOf('month').day() + 6) % 7, 'day');

  const attendanceByDate = indexAttendance(input.attendance, tz);
  const holidayByDate = indexHolidays(input.holidays, tz);
  const requestByDate = indexRequests(input.requests, tz);
  const leaveOf = leaveResolver(input.leaves);

  const today = dayjs().tz(tz).format('YYYY-MM-DD');
  const joined = input.dateOfJoining ? dayjs(input.dateOfJoining).format('YYYY-MM-DD') : null;
  const exited = input.dateOfExit ? dayjs(input.dateOfExit).format('YYYY-MM-DD') : null;

  return Array.from({ length: CELLS }, (_, i) => {
    const d = gridStart.add(i, 'day');
    const date = d.format('YYYY-MM-DD');

    const row = attendanceByDate.get(date);
    const holiday = holidayByDate.get(date);
    const request = requestByDate.get(date);
    const leave = leaveOf(date);
    const isOffDay = isNonWorkingWeekday(d.toDate(), input.workingDays);

    const base = {
      date,
      inMonth: d.month() === cursor.month(),
      actual: {
        checkIn: row?.checkIn ? dayjs(row.checkIn).tz(tz).format('HH:mm') : null,
        checkOut: row?.checkOut ? dayjs(row.checkOut).tz(tz).format('HH:mm') : null,
        minutesWorked: minutesBetween(row?.checkIn, row?.checkOut),
      },
      // The shift is not available client-side — only the server resolves
      // day-wise shifts and per-employee overrides. Left null on purpose rather
      // than guessed from a global default, which is exactly the fork the
      // verdict annotator was written to close.
      expected: { checkIn: null, checkOut: null, source: null },
      workMode: row?.workingMethod?.type ?? null,
      ...(holiday && { holiday }),
      ...(request && { request }),
      ...(leave && { leave }),
    } satisfies Omit<CalendarDay, 'status' | 'modifiers'>;

    const modifiers: DayModifier[] = [];
    if (request?.status === 'pending') modifiers.push('request_pending');
    if (request?.status === 'rejected') modifiers.push('request_rejected');
    if (row?.requestRaised) modifiers.push('regularized');
    if (row?.checkIn && !row?.checkOut) modifiers.push('missing_check_out');
    if (!row?.checkIn && row?.checkOut) modifiers.push('missing_check_in');
    if (row?.workingMethod?.type === 'Hybrid') modifiers.push('remote');
    if (row?.workingMethod?.type === 'On-site') modifiers.push('on_site');

    const status = resolveStatus({
      date,
      today,
      joined,
      exited,
      hasPunch: Boolean(row?.checkIn || row?.checkOut),
      leaveFraction: leave?.fraction ?? null,
      isHoliday: Boolean(holiday),
      isOffDay,
      modifiers,
    });

    return { ...base, status, modifiers, canRaiseCorrection: canCorrect(status, date, today, joined) };
  });
}

/**
 * The precedence ladder, stated once and in one place.
 *
 * Order is the whole point. `transformAttendance` runs the holiday check
 * BEFORE the punch check, which is why T-02 exists.
 */
function resolveStatus(c: {
  date: string;
  today: string;
  joined: string | null;
  exited: string | null;
  hasPunch: boolean;
  leaveFraction: 0.5 | 1 | null;
  isHoliday: boolean;
  isOffDay: boolean;
  modifiers: DayModifier[];
}): DayStatus {
  if (c.joined && c.date < c.joined) return 'not_employed';
  if (c.exited && c.date > c.exited) return 'not_employed';
  if (c.date > c.today) return 'future';

  // ── Attendance outranks the calendar. A punch on a holiday is a worked
  //    holiday, not a holiday — the holiday survives as context on the day.
  if (c.hasPunch) {
    if (c.isHoliday || c.isOffDay) c.modifiers.push('worked_on_off_day');
    return c.leaveFraction === 0.5 ? 'half_day' : 'present';
  }

  if (c.leaveFraction) return c.leaveFraction === 0.5 ? 'half_day' : 'leave';
  if (c.isHoliday) return 'holiday';
  if (c.isOffDay) return 'weekly_off';
  return 'absent';
}

/** Mirrors the existing modal's rules, so the tooltip never invites a refused click. */
function canCorrect(status: DayStatus, date: string, today: string, joined: string | null): boolean {
  if (status === 'not_employed' || status === 'future') return false;
  if (date > today) return false;
  if (joined && date < joined) return false;
  return status === 'absent' || status === 'present' || status === 'half_day';
}

/* ── Indexing ─────────────────────────────────────────────────────────── */

/**
 * Buckets a punch by its business day in the BRANCH timezone.
 *
 * The server already stores this as `Attendance.attendanceDate` (a `@db.Date`
 * under a unique index); once the endpoint ships, that column replaces this
 * function entirely and the bucketing stops being a client concern.
 */
function indexAttendance(rows: RawAttendance[], tz: string): Map<string, RawAttendance> {
  const map = new Map<string, RawAttendance>();
  rows.forEach((r) => {
    const anchor = r.checkIn ?? r.checkOut;
    if (!anchor) return;
    const key = dayjs(anchor).tz(tz).format('YYYY-MM-DD');
    const existing = map.get(key);
    // Defensive: legacy data can hold more than one row per day (the unique
    // index only protects rows written since `attendanceDate` existed). Keep
    // the widest span rather than letting row order decide.
    if (!existing) map.set(key, r);
    else
      map.set(key, {
        ...existing,
        checkIn: earliest(existing.checkIn, r.checkIn),
        checkOut: latest(existing.checkOut, r.checkOut),
        requestRaised: existing.requestRaised || r.requestRaised,
        workingMethod: existing.workingMethod ?? r.workingMethod,
      });
  });
  return map;
}

function indexHolidays(rows: RawHoliday[], tz: string): Map<string, { name: string; observedIn: string | null }> {
  const map = new Map<string, { name: string; observedIn: string | null }>();
  rows.forEach((h) => {
    if (!h?.date || h.isActive === false) return;
    map.set(dayjs(h.date).tz(tz).format('YYYY-MM-DD'), {
      name: h.holiday?.name || 'Public holiday',
      observedIn: h.observedIn ?? null,
    });
  });
  return map;
}

function indexRequests(rows: RawRequest[], tz: string): Map<string, NonNullable<CalendarDay['request']>> {
  const map = new Map<string, NonNullable<CalendarDay['request']>>();
  rows.forEach((r) => {
    const anchor = r.checkIn ?? r.checkOut;
    if (!anchor) return;
    const key = dayjs(anchor).tz(tz).format('YYYY-MM-DD');
    // A pending request is the state worth surfacing, so it wins over a
    // decided one on the same day.
    if (map.has(key) && r.status !== 0) return;
    map.set(key, {
      id: r.id ?? '',
      kind: r.checkIn ? 'check_in' : 'check_out',
      status: r.status === 1 ? 'approved' : r.status === 2 ? 'rejected' : 'pending',
      stage: null, // only the approval chain knows this; server-side field
    });
  });
  return map;
}

/**
 * Approved leaves only, expanded across their span.
 *
 * A half-day leave yields fraction 0.5 — the number the balance ledger already
 * holds and the calendar currently rounds up to a full day.
 */
function leaveResolver(leaves: RawLeave[]) {
  const approved = leaves.filter((l) => l.statusNumber === 1 && l.dateFrom);
  return (date: string): NonNullable<CalendarDay['leave']> | null => {
    for (const l of approved) {
      const from = dayjs(l.dateFrom).format('YYYY-MM-DD');
      const to = l.dateTo ? dayjs(l.dateTo).format('YYYY-MM-DD') : from;
      if (date < from || date > to) continue;
      // A half-day flag applies to a single-day request; a multi-day span is full days.
      const isHalf = Boolean(l.isHalfDay) && from === to;
      return {
        type: l.type || 'Leave',
        fraction: isHalf ? 0.5 : 1,
        session:
          isHalf && l.halfDaySession
            ? l.halfDaySession.toLowerCase().includes('second')
              ? 'second_half'
              : 'first_half'
            : null,
        leaveId: l.id ?? '',
      };
    }
    return null;
  };
}

/* ── Summary ──────────────────────────────────────────────────────────── */

export function summarize(days: CalendarDay[]): CalendarSummary {
  const inMonth = days.filter((d) => d.inMonth);
  const has = (d: CalendarDay, m: DayModifier) => d.modifiers.includes(m);
  return {
    present: inMonth.filter((d) => d.status === 'present').length,
    // Half-days count as 0.5 here too — a summary that disagrees with the tile
    // is the same defect one level up.
    leave: inMonth.reduce((n, d) => n + (d.status === 'leave' ? 1 : d.leave?.fraction === 0.5 ? 0.5 : 0), 0),
    absent: inMonth.filter((d) => d.status === 'absent').length,
    late: inMonth.filter((d) => has(d, 'late_in')).length,
    missingPunch: inMonth.filter((d) => has(d, 'missing_check_in') || has(d, 'missing_check_out')).length,
    pending: inMonth.filter((d) => has(d, 'request_pending')).length,
    workedOffDays: inMonth.filter((d) => has(d, 'worked_on_off_day')).length,
    holidays: inMonth.filter((d) => d.status === 'holiday').length,
    weeklyOffs: inMonth.filter((d) => d.status === 'weekly_off').length,
    minutesWorked: inMonth.reduce((n, d) => n + (d.actual.minutesWorked ?? 0), 0),
  };
}

/* ── Small helpers ────────────────────────────────────────────────────── */

function minutesBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const m = dayjs(b).diff(dayjs(a), 'minute');
  return m > 0 ? m : null;
}

const earliest = (a?: string | null, b?: string | null) =>
  !a ? (b ?? null) : !b ? a : dayjs(a).isBefore(dayjs(b)) ? a : b;

const latest = (a?: string | null, b?: string | null) =>
  !a ? (b ?? null) : !b ? a : dayjs(a).isAfter(dayjs(b)) ? a : b;
