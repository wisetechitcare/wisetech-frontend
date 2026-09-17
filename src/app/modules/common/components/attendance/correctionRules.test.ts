/**
 * The rules a correction obeys ABOUT THE DAY it corrects.
 *
 * `attendanceRequest.test.ts` covers what makes a request well-formed on its own.
 * These cover what the day already holds — a recorded punch, a half already
 * awaiting approval, a window the admin has closed — and they used to live in five
 * places: inline in the calendar panel, twice inside Graphs.tsx, and in two admin
 * modals that between them enforced about half of it.
 */
import { describe, expect, it } from 'vitest';
import {
  correctionContextFromDay,
  correctionRefusal,
  firstOpenKind,
  kindBlockedReason,
  nothingLeftToRaise,
  recordedOrderProblem,
  type CorrectionDayContext,
} from './attendanceRequest';

const ctx = (over: Partial<CorrectionDayContext> = {}): CorrectionDayContext => ({
  recordedCheckIn: null,
  recordedCheckOut: null,
  pendingCheckIn: false,
  pendingCheckOut: false,
  ...over,
});

const KINDS = ['checkin', 'checkout', 'both'] as const;

describe('correctionContextFromDay — what the day already holds', () => {
  const day = (request?: object) => ({
    actual: { checkIn: '09:59', checkOut: null },
    request: request as never,
  });

  it('reads the recorded punches', () => {
    const c = correctionContextFromDay(day());
    expect(c.recordedCheckIn).toBe('09:59');
    expect(c.recordedCheckOut).toBeNull();
  });

  it('counts a PENDING request\'s halves as already raised', () => {
    const c = correctionContextFromDay(day({ id: 'r1', status: 'pending', hasCheckIn: false, hasCheckOut: true }));
    expect(c.pendingCheckOut).toBe(true);
    expect(c.pendingCheckIn).toBe(false);
  });

  /** An approved or rejected request is a closed record, not a half in flight. */
  it('ignores a decided request', () => {
    const c = correctionContextFromDay(day({ id: 'r1', status: 'approved', hasCheckIn: true, hasCheckOut: true }));
    expect(c.pendingCheckIn).toBe(false);
    expect(c.pendingCheckOut).toBe(false);
  });

  /**
   * Editing a pending request must not be blocked by THAT request. Its halves are
   * the ones being edited, not a competing correction sitting on top of them.
   */
  it('does not count the request being edited against itself', () => {
    const c = correctionContextFromDay(day({ id: 'r1', status: 'pending', hasCheckIn: true, hasCheckOut: true }), 'r1');
    expect(c.pendingCheckIn).toBe(false);
    expect(c.pendingCheckOut).toBe(false);
  });

  it('yields an empty context before the day has loaded', () => {
    expect(correctionContextFromDay(null)).toEqual(ctx());
  });
});

describe('kindBlockedReason — which kinds can be chosen', () => {
  it('opens every kind on an untouched day with a check-in', () => {
    const c = ctx({ recordedCheckIn: '09:59' });
    expect(KINDS.map((k) => kindBlockedReason(k, c))).toEqual([null, null, null]);
  });

  /** "You cannot correct a check-out with no check-in to anchor it." */
  it('closes check-out when there is no check-in', () => {
    expect(kindBlockedReason('checkout', ctx())).toMatch(/raise that first/);
  });

  /** A raised-but-unapproved check-in anchors a check-out as well as a punch does. */
  it('lets a pending check-in anchor a check-out', () => {
    expect(kindBlockedReason('checkout', ctx({ pendingCheckIn: true }))).toBeNull();
  });

  /** `both` brings its own check-in, so the anchor rule does not apply to it. */
  it('keeps both open with no check-in', () => {
    expect(kindBlockedReason('both', ctx())).toBeNull();
  });

  it('closes a half that is already awaiting approval', () => {
    expect(kindBlockedReason('checkin', ctx({ pendingCheckIn: true }))).toMatch(/already awaiting approval/);
    expect(kindBlockedReason('checkout', ctx({ recordedCheckIn: '09:00', pendingCheckOut: true }))).toMatch(/already awaiting approval/);
  });

  it('closes both when either half is already awaiting approval', () => {
    expect(kindBlockedReason('both', ctx({ pendingCheckIn: true }))).toMatch(/other half on its own/);
  });
});

describe('firstOpenKind and nothingLeftToRaise', () => {
  it('opens on the first kind that can actually be chosen', () => {
    expect(firstOpenKind(KINDS, ctx({ recordedCheckIn: '09:00' }))).toBe('checkin');
    expect(firstOpenKind(KINDS, ctx({ pendingCheckIn: true }))).toBe('checkout');
  });

  it('respects a preferred kind when it is open', () => {
    expect(firstOpenKind(KINDS, ctx(), 'both')).toBe('both');
  });

  it('is nothing-left only when BOTH halves are awaiting approval', () => {
    expect(nothingLeftToRaise(ctx({ pendingCheckIn: true }))).toBe(false);
    expect(nothingLeftToRaise(ctx({ pendingCheckIn: true, pendingCheckOut: true }))).toBe(true);
  });
});

describe('recordedOrderProblem — a half must sit sensibly beside the recorded one', () => {
  const fmt = (t: string) => t;

  it('refuses a check-in after the recorded check-out', () => {
    expect(
      recordedOrderProblem({ kind: 'checkin', checkIn: '19:00', checkOut: '' }, ctx({ recordedCheckOut: '18:00' }), fmt),
    ).toMatch(/cannot be after the existing check-out/);
  });

  it('refuses a check-out before the recorded check-in', () => {
    expect(
      recordedOrderProblem({ kind: 'checkout', checkIn: '', checkOut: '08:00' }, ctx({ recordedCheckIn: '09:00' }), fmt),
    ).toMatch(/cannot be before the existing check-in/);
  });

  it('accepts a correctly ordered half', () => {
    expect(recordedOrderProblem({ kind: 'checkout', checkIn: '', checkOut: '19:50' }, ctx({ recordedCheckIn: '09:59' }), fmt)).toBeNull();
  });

  /** `both` carries its own pair, ordered by the shared validator. */
  it('skips both, which is validated against itself', () => {
    expect(recordedOrderProblem({ kind: 'both', checkIn: '19:00', checkOut: '20:00' }, ctx({ recordedCheckOut: '18:00' }), fmt)).toBeNull();
  });
});

describe('correctionRefusal — the server said no, and the form says why', () => {
  const fmtDate = (d: string) => d;

  it('says nothing when the day permits a correction', () => {
    expect(correctionRefusal({ canRaiseCorrection: true }, fmtDate)).toBeNull();
    expect(correctionRefusal(null, fmtDate)).toBeNull();
  });

  it('names the earliest open date when the window has closed', () => {
    expect(
      correctionRefusal({ canRaiseCorrection: false, correctionRefusedReason: 'outside_window', correctionEarliestDate: '2026-08-18' }, fmtDate),
    ).toMatch(/2026-08-18/);
  });

  it('points a leave day at the leave request', () => {
    expect(correctionRefusal({ canRaiseCorrection: false, correctionRefusedReason: 'day_type' }, fmtDate)).toMatch(/leave/);
  });

  it('explains a future day and an unemployed day', () => {
    expect(correctionRefusal({ canRaiseCorrection: false, correctionRefusedReason: 'future' }, fmtDate)).toMatch(/not happened yet/);
    expect(correctionRefusal({ canRaiseCorrection: false, correctionRefusedReason: 'not_employed' }, fmtDate)).toMatch(/employ/);
  });
});

describe('correctionRefusal — an admin is exempt from the window, and only the window', () => {
  const fmtDate = (d: string) => d;
  const closed = (status: string) => ({
    status,
    canRaiseCorrection: false,
    correctionRefusedReason: 'outside_window' as const,
    correctionEarliestDate: '2026-08-19',
  });

  /** The server exempts approvers from the window; the admin dialogs must not block what it accepts. */
  it('does not refuse an old working day for an admin', () => {
    expect(correctionRefusal(closed('absent'), fmtDate, { exemptFromWindow: true })).toBeNull();
    expect(correctionRefusal(closed('weekly_off'), fmtDate, { exemptFromWindow: true })).toBeNull();
  });

  it('still refuses the same day for an employee', () => {
    expect(correctionRefusal(closed('absent'), fmtDate)).toMatch(/correction window/);
  });

  /**
   * The server checks the window BEFORE the day type, so an old leave day arrives reported
   * as `outside_window`. Lifting that refusal blindly would open leave days to admins.
   */
  it('still refuses an old LEAVE day for an admin, as a leave day', () => {
    expect(correctionRefusal(closed('leave'), fmtDate, { exemptFromWindow: true })).toMatch(/leave/);
  });

  it('leaves every other refusal in place for an admin', () => {
    const future = { status: 'future', canRaiseCorrection: false, correctionRefusedReason: 'future' as const };
    expect(correctionRefusal(future, fmtDate, { exemptFromWindow: true })).toMatch(/not happened yet/);
  });
});
