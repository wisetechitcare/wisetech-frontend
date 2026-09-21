/**
 * Turning a draft into the wire payload, and an existing request back into a draft.
 *
 * Both used to be written five times. Two of the copies (inside Graphs.tsx) built
 * the instant with `dayjs(\`${date} ${hhmm}\`)` — the BROWSER's timezone — so an
 * admin in one branch correcting an employee in another stored a time shifted by
 * the gap between them. The calendar composed it in the employee's own branch
 * timezone; now everything does.
 */
import { describe, expect, it } from 'vitest';
import { buildCorrectionPayload, draftFromRequest } from './correctionPayload';
import type { AttendanceRequestDraft } from './attendanceRequest';

const draft = (over: Partial<AttendanceRequestDraft> = {}): AttendanceRequestDraft => ({
  kind: 'checkout',
  checkIn: '',
  checkOut: '19:50',
  workingMethodId: 'wm-office',
  remarks: '  forgot  ',
  ...over,
});

const base = {
  date: '2026-09-15',
  timezone: 'Asia/Kolkata',
  employeeId: 'emp-1',
  companyId: 'co-1',
};

describe('buildCorrectionPayload — the instant is composed in the EMPLOYEE\'s timezone', () => {
  it('composes 19:50 IST as 14:20 UTC', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft(), status: 0 });
    expect(p.checkOut).toBe('2026-09-15T14:20:00.000Z');
  });

  /** The same wall-clock time in another branch is a different instant. */
  it('composes in a non-IST branch timezone', () => {
    const p = buildCorrectionPayload({ ...base, timezone: 'Asia/Dubai', mode: 'raise', draft: draft(), status: 0 });
    expect(p.checkOut).toBe('2026-09-15T15:50:00.000Z');
  });

  it('trims the remark and carries the identity fields', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft(), status: 0 });
    expect(p).toMatchObject({ employeeId: 'emp-1', companyId: 'co-1', workingMethodId: 'wm-office', remarks: 'forgot', status: 0 });
  });
});

describe('buildCorrectionPayload — the half a kind does not want', () => {
  /**
   * RAISE omits it. The server merges a raise into the day's pending request, and
   * an omitted half is left as it was — so raising a check-out beside a pending
   * check-in completes that request instead of nulling its check-in.
   */
  it('omits the unwanted half on a raise', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft(), status: 0 });
    expect('checkIn' in p).toBe(false);
  });

  /**
   * EDIT nulls it. An edit updates one known row, where an omitted key means
   * "unchanged" — so switching a request from Both to Check-out only would
   * otherwise silently keep the check-in the form no longer shows.
   */
  it('nulls the unwanted half on an edit, and sends the id', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'edit', requestId: 'req-9', draft: draft(), status: 0 });
    expect(p.checkIn).toBeNull();
    expect(p.id).toBe('req-9');
  });

  it('sends both halves for both', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft({ kind: 'both', checkIn: '09:59' }), status: 0 });
    expect(p.checkIn).toBe('2026-09-15T04:29:00.000Z');
    expect(p.checkOut).toBe('2026-09-15T14:20:00.000Z');
  });
});

describe('buildCorrectionPayload — location and provenance', () => {
  it('defaults the location to zero', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft(), status: 0 });
    expect([p.latitude, p.longitude]).toEqual([0, 0]);
  });

  it('carries a location the caller has', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'raise', draft: draft(), status: 0, location: { latitude: 19.1, longitude: 72.8 } });
    expect([p.latitude, p.longitude]).toEqual([19.1, 72.8]);
  });

  it('records who updated it when told', () => {
    const p = buildCorrectionPayload({ ...base, mode: 'edit', requestId: 'r', draft: draft(), status: 1, updatedById: 'admin-1' });
    expect(p.updatedById).toBe('admin-1');
    expect(p.status).toBe(1);
  });
});

describe('draftFromRequest — reading a request back onto the form', () => {
  /** Stored instants are shown as the employee's OWN wall clock. */
  it('reads a checkout-only request in the branch timezone', () => {
    const d = draftFromRequest({ checkIn: null, checkOut: '2026-09-15T14:20:00.000Z', workingMethodId: 'wm', remarks: 'forgot' }, 'Asia/Kolkata');
    expect(d).toEqual({ kind: 'checkout', checkIn: '', checkOut: '19:50', workingMethodId: 'wm', remarks: 'forgot' });
  });

  it('reads a request carrying both halves', () => {
    const d = draftFromRequest({ checkIn: '2026-09-15T04:29:00.000Z', checkOut: '2026-09-15T14:20:00.000Z' }, 'Asia/Kolkata');
    expect([d.kind, d.checkIn, d.checkOut]).toEqual(['both', '09:59', '19:50']);
  });

  it('reads a check-in-only request', () => {
    expect(draftFromRequest({ checkIn: '2026-09-15T04:29:00.000Z' }, 'Asia/Kolkata').kind).toBe('checkin');
  });

  /**
   * The legacy tables handed their modals a 12-hour DISPLAY string ("9:59 AM") and
   * then validated it as 24-hour, so an untouched edit failed its own validation.
   * Only raw instants are read here; a display string is ignored, never parsed.
   */
  it('ignores a display string instead of misreading it', () => {
    const d = draftFromRequest({ checkIn: '9:59 AM', checkOut: '-NA-' } as never, 'Asia/Kolkata');
    expect([d.checkIn, d.checkOut]).toEqual(['', '']);
  });
});
