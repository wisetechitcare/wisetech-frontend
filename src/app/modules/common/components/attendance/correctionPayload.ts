/**
 * The wire edge of an attendance correction: draft → payload, request → draft.
 *
 * Kept apart from `attendanceRequest.ts` only because these need a timezone
 * library and those rules need nothing — the rule module stays dependency-free.
 *
 * Both functions used to be written once per screen, five times. Two of those
 * copies, inside Graphs.tsx, built the instant as `dayjs(`${date} ${hhmm}`)`,
 * which is the BROWSER's timezone: an admin in one branch correcting an employee
 * in another stored a time shifted by the gap between them. Composition here is
 * always in the employee's own branch timezone, which is how the server buckets
 * the business day.
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { wantsCheckIn, wantsCheckOut, type AttendanceRequestDraft, type RequestKind } from './attendanceRequest';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export type CorrectionMode = 'raise' | 'edit';

export interface BuildCorrectionPayloadInput {
  mode: CorrectionMode;
  /** Required for `edit` — the one row being changed. */
  requestId?: string;
  draft: AttendanceRequestDraft;
  /** The business day, `YYYY-MM-DD`. */
  date: string;
  /** The EMPLOYEE's branch timezone, never the viewer's. */
  timezone: string;
  employeeId: string;
  companyId: string;
  /** 0 pending, 1 approved, 2 rejected. The server decides what the actor may set. */
  status: number;
  /** Where the day was recorded, when the caller knows. Defaults to 0,0. */
  location?: { latitude?: number | null; longitude?: number | null } | null;
  /** The admin who made the change, for the request's provenance. */
  updatedById?: string | null;
}

/** An `HH:mm` on a business day, as the instant it names in that timezone. */
const instant = (date: string, hhmm: string, tz: string) =>
  dayjs.tz(`${date} ${hhmm}`, 'YYYY-MM-DD HH:mm', tz).toISOString();

export function buildCorrectionPayload(input: BuildCorrectionPayloadInput): Record<string, unknown> {
  const { mode, requestId, draft, date, timezone: tz, employeeId, companyId, status, location, updatedById } = input;

  /**
   * The half a kind does not want is OMITTED on a raise and NULLED on an edit.
   *
   * A raise merges into the day's pending request, where an absent key leaves that
   * half as it was — so raising a check-out beside a pending check-in completes
   * the request instead of wiping its check-in. An edit updates one known row,
   * where an absent key also means "unchanged" — so switching a request from Both
   * to Check-out only would silently keep a check-in the form no longer shows.
   */
  const half = (wanted: boolean, hhmm: string) =>
    wanted ? instant(date, hhmm, tz) : mode === 'edit' ? null : undefined;

  const checkIn = half(wantsCheckIn(draft.kind), draft.checkIn);
  const checkOut = half(wantsCheckOut(draft.kind), draft.checkOut);

  return {
    ...(mode === 'edit' && requestId ? { id: requestId } : {}),
    employeeId,
    // REQUIRED: `AttendanceRequests.companyId` is non-nullable, and a raise that
    // omits it fails the insert before anything is written.
    companyId,
    workingMethodId: draft.workingMethodId,
    remarks: draft.remarks.trim(),
    latitude: Number(location?.latitude) || 0,
    longitude: Number(location?.longitude) || 0,
    status,
    ...(checkIn !== undefined ? { checkIn } : {}),
    ...(checkOut !== undefined ? { checkOut } : {}),
    ...(updatedById ? { updatedById } : {}),
  };
}

export interface RequestLike {
  /** Raw stored instants (ISO). Display strings are ignored, never parsed. */
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  workingMethodId?: string | null;
  remarks?: string | null;
}

/**
 * A stored instant as the employee's wall clock, or '' when it is not an instant.
 *
 * The legacy tables handed their modals a 12-hour DISPLAY string ("9:59 AM") and
 * then validated it as 24-hour, so opening an edit and saving it untouched failed
 * its own validation. Only a real ISO instant is read; anything else is ignored.
 */
function wallClock(value: string | Date | null | undefined, tz: string): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}T/.test(value)) return '';
  const d = dayjs.utc(value);
  return d.isValid() ? d.tz(tz).format('HH:mm') : '';
}

/** Read an existing request back onto the form, in the employee's own timezone. */
export function draftFromRequest(request: RequestLike, tz: string): AttendanceRequestDraft {
  const checkIn = wallClock(request.checkIn, tz);
  const checkOut = wallClock(request.checkOut, tz);
  const kind: RequestKind = checkIn && checkOut ? 'both' : checkOut ? 'checkout' : 'checkin';
  return {
    kind,
    checkIn,
    checkOut,
    workingMethodId: request.workingMethodId ?? '',
    remarks: request.remarks ?? '',
  };
}

/**
 * The `YYYY-MM` a business day belongs to, or '' when there is no readable day.
 *
 * Empty is deliberate and load-bearing: the calendar query enables itself on
 * `Boolean(employeeId && month)`, and `dayjs('').format('YYYY-MM')` returns the literal
 * string "Invalid Date" — truthy. That turned "no day selected yet" into a real request
 * for `month=Invalid%20Date`, which the server answered 400, repeatedly, because React
 * Query refetches on every socket event.
 */
export function calendarMonthKey(date: string | Date | null | undefined): string {
  if (date == null || date === '') return '';
  const d = dayjs(date);
  return d.isValid() ? d.format('YYYY-MM') : '';
}
