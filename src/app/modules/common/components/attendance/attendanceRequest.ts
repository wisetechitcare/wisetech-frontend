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

/**
 * What each kind is CALLED. Lives with the kind model, not with a form, because
 * both flows name the same three things and a second copy is how the admin
 * modal and the day panel would come to disagree about the word "Both".
 */
export const KIND_LABEL: Record<RequestKind, string> = {
    both: 'Both',
    checkin: 'Check-in',
    checkout: 'Check-out',
};

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

/** The recorded day a correction starts from. Both forms have one; they fetch it differently. */
export interface AttendanceRecordLike {
  /** `HH:mm`, or null when nothing was punched. */
  checkIn?: string | null;
  checkOut?: string | null;
  /** The working method's LABEL (e.g. "Office"), which is what the record stores. */
  workMode?: string | null;
}

/**
 * Open the form on what is being CORRECTED, not on an empty field.
 *
 * Clearing both times is right for the raise case — a missing day with nothing
 * recorded — but the same form serves "fix the time that is already there", and
 * an empty wheel beside a row reading 07:13 asks the user to re-enter a value
 * the screen is already showing.
 *
 * Seeded from the RECORDED time only, never from the expected one: pre-filling a
 * correction with the policy threshold would quietly invite everyone to claim
 * they arrived exactly on it.
 *
 * The working method is seeded the same way — the day already says Office, so
 * asking again is a question the record answers. Matched on the LABEL, because
 * `workMode` is the method's type rather than its id. An existing choice is
 * never overwritten; this only fills a blank.
 *
 * Lives here rather than in either form because it is a rule about drafts, and
 * the admin modal opening empty while the day panel opened seeded was the two
 * of them answering the same question differently.
 */
export function seedDraft(
  base: AttendanceRequestDraft,
  kind: RequestKind,
  record: AttendanceRecordLike | null | undefined,
  methods: ReadonlyArray<{ value: string; label: string }> = [],
): AttendanceRequestDraft {
  const method = record?.workMode
    ? methods.find((m) => m.label.toLowerCase() === record.workMode!.toLowerCase())?.value
    : undefined;

  return applyKind(
    {
      ...base,
      checkIn: wantsCheckIn(kind) ? record?.checkIn ?? '' : '',
      checkOut: wantsCheckOut(kind) ? record?.checkOut ?? '' : '',
      workingMethodId: base.workingMethodId || method || '',
    },
    kind,
  );
}
