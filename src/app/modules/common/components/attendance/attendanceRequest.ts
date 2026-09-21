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

/* ────────────────────────────────────────────────────────────────────────────
 * Rules about the DAY a correction corrects.
 *
 * Everything above is about the request on its own. What follows is about what
 * the day already holds — a recorded punch, a half already awaiting approval, a
 * window the admin has closed — and it used to live in five places: inline in the
 * calendar panel, twice inside Graphs.tsx, and in two admin modals that between
 * them enforced about half of it. One copy, here, and every correction screen
 * reads it.
 * ──────────────────────────────────────────────────────────────────────────── */

/** What the day already holds, as far as a correction is concerned. */
export interface CorrectionDayContext {
  /** Recorded punches, `HH:mm` in the employee's branch timezone. */
  recordedCheckIn: string | null;
  recordedCheckOut: string | null;
  /** Another PENDING request for the day already carries this half. */
  pendingCheckIn: boolean;
  pendingCheckOut: boolean;
}

/** The slice of a server calendar day these rules read. */
export interface CorrectionDayLike {
  /** The server's day status (`present`, `weekly_off`, `leave`, …). */
  status?: string;
  actual?: { checkIn?: string | null; checkOut?: string | null } | null;
  request?: { id?: string; status?: string; hasCheckIn?: boolean; hasCheckOut?: boolean } | null;
  canRaiseCorrection?: boolean;
  correctionRefusedReason?: 'not_employed' | 'future' | 'outside_window' | 'day_type';
  correctionEarliestDate?: string;
}

/**
 * Read the day into a correction context.
 *
 * Only a PENDING request counts as a half in flight — a decided one is a closed
 * record. And the request being EDITED is never counted against itself: its halves
 * are the ones on the form, not a competing correction sitting on top of them.
 */
export function correctionContextFromDay(
  day: CorrectionDayLike | null | undefined,
  editingRequestId?: string | null,
): CorrectionDayContext {
  const req = day?.request;
  const inFlight = Boolean(req && req.status === 'pending' && (!editingRequestId || req.id !== editingRequestId));
  return {
    recordedCheckIn: day?.actual?.checkIn ?? null,
    recordedCheckOut: day?.actual?.checkOut ?? null,
    pendingCheckIn: inFlight && Boolean(req?.hasCheckIn),
    pendingCheckOut: inFlight && Boolean(req?.hasCheckOut),
  };
}

/**
 * Why a kind cannot be chosen, or null when it can.
 *
 * A raised-but-unapproved check-in anchors a check-out exactly as a punch does, so
 * someone who forgot both punches raises them back to back instead of waiting for
 * an approver in between.
 */
export function kindBlockedReason(kind: RequestKind, ctx: CorrectionDayContext): string | null {
  const hasCheckIn = Boolean(ctx.recordedCheckIn) || ctx.pendingCheckIn;
  if (kind === 'checkin' && ctx.pendingCheckIn) return 'A check-in correction for this day is already awaiting approval.';
  if (kind === 'checkout' && ctx.pendingCheckOut) return 'A check-out correction for this day is already awaiting approval.';
  if (kind === 'checkout' && !hasCheckIn) return 'There is no check-in yet, so raise that first.';
  // `both` supplies its own check-in, so the anchor rule does not apply to it — but
  // either half already awaiting approval means one of its two times would land on
  // top of a pending one.
  if (kind === 'both' && (ctx.pendingCheckIn || ctx.pendingCheckOut)) {
    return 'Part of this day is already awaiting approval, so raise the other half on its own.';
  }
  return null;
}

/** Both halves are already awaiting approval — there is nothing left to raise. */
export const nothingLeftToRaise = (ctx: CorrectionDayContext): boolean => ctx.pendingCheckIn && ctx.pendingCheckOut;

/**
 * The kind to open on: the preferred one when it is open, else the first open one.
 * Landing on a closed segment would show a form whose own selector says it is
 * unavailable.
 */
export function firstOpenKind(
  kinds: readonly RequestKind[],
  ctx: CorrectionDayContext,
  preferred?: RequestKind,
): RequestKind {
  if (preferred && kinds.includes(preferred) && !kindBlockedReason(preferred, ctx)) return preferred;
  return kinds.find((k) => !kindBlockedReason(k, ctx)) ?? kinds[0] ?? 'checkin';
}

/**
 * A single corrected half must sit sensibly beside the punch already recorded.
 *
 * `both` is skipped: it carries its own pair, which `validateAttendanceRequest`
 * already orders against each other, and there is no third time to compare with.
 * Compared in minutes on the same day — no Date, so no timezone to get wrong.
 */
export function recordedOrderProblem(
  draft: Pick<AttendanceRequestDraft, 'kind' | 'checkIn' | 'checkOut'>,
  ctx: CorrectionDayContext,
  formatTime: (hhmm: string) => string,
): string | null {
  if (draft.kind === 'checkin' && ctx.recordedCheckOut && isValidTime(draft.checkIn)) {
    if (minutes(draft.checkIn) > minutes(ctx.recordedCheckOut)) {
      return `Check-in (${formatTime(draft.checkIn)}) cannot be after the existing check-out (${formatTime(ctx.recordedCheckOut)})`;
    }
  }
  if (draft.kind === 'checkout' && ctx.recordedCheckIn && isValidTime(draft.checkOut)) {
    if (minutes(draft.checkOut) < minutes(ctx.recordedCheckIn)) {
      return `Check-out (${formatTime(draft.checkOut)}) cannot be before the existing check-in (${formatTime(ctx.recordedCheckIn)})`;
    }
  }
  return null;
}

/**
 * Why the server refused a correction for this day, as a sentence — or null.
 *
 * The decision is the server's (`attendanceCorrectionPolicy`, which also enforces
 * it on the write). This only words it, so the form can say why instead of
 * showing a button that fails.
 */
/**
 * Day statuses a correction may be raised on — the client mirror of the server's
 * `CORRECTABLE_STATUSES` in attendanceCorrectionPolicy. Leave is deliberately absent:
 * the leave reconciler owns attendance-overrides-leave.
 */
const CORRECTABLE_DAY_STATUSES: ReadonlySet<string> = new Set([
  'present', 'absent', 'half_day', 'pending', 'weekly_off', 'holiday',
]);

export function correctionRefusal(
  day: CorrectionDayLike | null | undefined,
  formatDate: (iso: string) => string,
  options: {
    /**
     * The viewer is raising on someone else's behalf as an approver. The server exempts
     * approvers from the admin's correction WINDOW (and only the window), so the admin
     * dialogs must not refuse a day it would accept.
     */
    exemptFromWindow?: boolean;
  } = {},
): string | null {
  if (!day || day.canRaiseCorrection !== false) return null;

  /**
   * The server judges the window BEFORE the day type, so an old leave day arrives
   * reported as `outside_window`. Lifting that refusal is only safe once the day type
   * has been checked here — otherwise an admin exemption would quietly open leave days.
   */
  if (options.exemptFromWindow && day.correctionRefusedReason === 'outside_window') {
    return day.status && !CORRECTABLE_DAY_STATUSES.has(day.status)
      ? correctionRefusal({ ...day, correctionRefusedReason: 'day_type' }, formatDate)
      : null;
  }

  switch (day.correctionRefusedReason) {
    case 'outside_window':
      return day.correctionEarliestDate
        ? `This date is outside the correction window. Corrections can be raised for ${formatDate(day.correctionEarliestDate)} onwards.`
        : 'This date is outside the correction window.';
    case 'day_type':
      return 'This day is recorded as leave. Edit the leave request instead of raising an attendance correction.';
    case 'future':
      return 'This day has not happened yet, so there is nothing to correct.';
    case 'not_employed':
      return 'The employee was not employed on this date.';
    default:
      return 'This day is not open for an attendance correction.';
  }
}
