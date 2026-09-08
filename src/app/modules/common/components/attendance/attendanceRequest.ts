/**
 * What makes an attendance-correction request valid — the ONE rule set.
 *
 * Two forms raise these: an employee correcting their own day from the calendar,
 * and an admin raising one on someone's behalf. They differ in who they are for
 * and what else they collect (an employee never picks the approval status), but
 * the rules about the REQUEST itself are identical, and keeping two copies of
 * them is what produced the bug where an admin form required both times while
 * its own submit handler was written for either-or — the handler's "at least
 * one" guard could never run.
 *
 * So the rules live here, in one place, with no React and no Formik, and both
 * forms ask this module rather than restating it.
 */

/** Which punch(es) a request is for. */
export type RequestKind = 'checkin' | 'checkout' | 'both';

export const wantsCheckIn = (k: RequestKind): boolean => k === 'both' || k === 'checkin';
export const wantsCheckOut = (k: RequestKind): boolean => k === 'both' || k === 'checkout';

/** 24-hour `HH:mm`. Anchored, so "9:00" and "24:00" are both rejected. */
export const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (v: string): boolean => TIME_24H.test(v);

export interface AttendanceRequestDraft {
  kind: RequestKind;
  /** `HH:mm`, empty when the kind does not want it. */
  checkIn: string;
  checkOut: string;
  workingMethodId: string;
  remarks: string;
}

export const emptyDraft = (kind: RequestKind = 'both'): AttendanceRequestDraft => ({
  kind,
  checkIn: '',
  checkOut: '',
  workingMethodId: '',
  remarks: '',
});

/** Minutes since midnight, for comparing two `HH:mm` strings without a date. */
const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/**
 * The first problem with a draft, or `null` when it is submittable.
 *
 * One message at a time and in field order, so the form points at the thing to
 * fix next rather than listing everything that is not filled in yet.
 */
export function validateAttendanceRequest(draft: AttendanceRequestDraft): string | null {
  const { kind, checkIn, checkOut, workingMethodId, remarks } = draft;

  if (wantsCheckIn(kind)) {
    if (!checkIn) return 'Check-in time is required.';
    if (!isValidTime(checkIn)) return 'Enter the check-in time as HH:MM in 24-hour format.';
  }

  if (wantsCheckOut(kind)) {
    if (!checkOut) return 'Check-out time is required.';
    if (!isValidTime(checkOut)) return 'Enter the check-out time as HH:MM in 24-hour format.';
  }

  // Only meaningful when the request carries both halves. A check-out-only
  // request is anchored against a check-in that already exists (or is already
  // pending), which the server holds — not something this form can compare.
  if (kind === 'both' && isValidTime(checkIn) && isValidTime(checkOut)) {
    if (minutes(checkOut) <= minutes(checkIn)) return 'Check-out must be after check-in.';
  }

  if (!workingMethodId) return 'Select a working method.';
  if (!remarks.trim()) return 'Add a remark explaining the correction.';

  return null;
}

/**
 * Clear the half a kind no longer wants.
 *
 * Called when the kind changes, so a time typed and then excluded is never
 * submitted — the payload's shape must follow the visible form, not what was
 * left behind in state.
 */
export function applyKind(draft: AttendanceRequestDraft, kind: RequestKind): AttendanceRequestDraft {
  return {
    ...draft,
    kind,
    checkIn: wantsCheckIn(kind) ? draft.checkIn : '',
    checkOut: wantsCheckOut(kind) ? draft.checkOut : '',
  };
}
