/**
 * The shared rules. These are the ones the admin form's Yup schema and the
 * employee form's submit guard used to state separately — and disagree about.
 */
import { describe, expect, it } from 'vitest';
import {
  applyKind,
  emptyDraft,
  isValidTime,
  validateAttendanceRequest,
  wantsCheckIn,
  wantsCheckOut,
  type AttendanceRequestDraft,
} from './attendanceRequest';

const complete = (over: Partial<AttendanceRequestDraft> = {}): AttendanceRequestDraft => ({
  kind: 'both',
  checkIn: '09:00',
  checkOut: '18:00',
  workingMethodId: 'wm-1',
  remarks: 'Forgot to punch',
  ...over,
});

describe('a kind decides which halves are wanted', () => {
  it('maps each kind to its halves', () => {
    expect([wantsCheckIn('both'), wantsCheckOut('both')]).toEqual([true, true]);
    expect([wantsCheckIn('checkin'), wantsCheckOut('checkin')]).toEqual([true, false]);
    expect([wantsCheckIn('checkout'), wantsCheckOut('checkout')]).toEqual([false, true]);
  });

  /** The guard against submitting a time the form no longer shows. */
  it('clears the half a kind no longer wants', () => {
    const d = complete();
    expect(applyKind(d, 'checkin')).toMatchObject({ kind: 'checkin', checkIn: '09:00', checkOut: '' });
    expect(applyKind(d, 'checkout')).toMatchObject({ kind: 'checkout', checkIn: '', checkOut: '18:00' });
  });
});

describe('time format', () => {
  it.each(['00:00', '09:05', '23:59'])('accepts %s', (t) => expect(isValidTime(t)).toBe(true));
  it.each(['9:00', '24:00', '12:60', '', '1200', 'noon'])('rejects %s', (t) => expect(isValidTime(t)).toBe(false));
});

describe('validation — the rule both forms now share', () => {
  it('passes a complete draft', () => {
    expect(validateAttendanceRequest(complete())).toBeNull();
  });

  /**
   * The bug this module exists to prevent: the admin schema required BOTH times
   * while its handler was written for either-or, so a check-in-only correction
   * was impossible.
   */
  it('accepts a check-in-only request', () => {
    expect(validateAttendanceRequest(complete({ kind: 'checkin', checkOut: '' }))).toBeNull();
  });

  it('accepts a check-out-only request', () => {
    expect(validateAttendanceRequest(complete({ kind: 'checkout', checkIn: '' }))).toBeNull();
  });

  it('demands the half its kind wants', () => {
    expect(validateAttendanceRequest(complete({ kind: 'checkin', checkIn: '' }))).toMatch(/check-in time/i);
    expect(validateAttendanceRequest(complete({ kind: 'checkout', checkOut: '' }))).toMatch(/check-out time/i);
  });

  it('rejects a malformed time', () => {
    expect(validateAttendanceRequest(complete({ checkIn: '9am' }))).toMatch(/24-hour/i);
  });

  it('requires check-out to be after check-in when both are present', () => {
    expect(validateAttendanceRequest(complete({ checkIn: '18:00', checkOut: '09:00' }))).toMatch(/after check-in/i);
    expect(validateAttendanceRequest(complete({ checkIn: '09:00', checkOut: '09:00' }))).toMatch(/after check-in/i);
  });

  /** A one-sided request is anchored server-side, so this form cannot order it. */
  it('does not order a one-sided request against a leftover value', () => {
    expect(validateAttendanceRequest(complete({ kind: 'checkout', checkIn: '', checkOut: '09:00' }))).toBeNull();
  });

  it('requires a working method and a remark', () => {
    expect(validateAttendanceRequest(complete({ workingMethodId: '' }))).toMatch(/working method/i);
    expect(validateAttendanceRequest(complete({ remarks: '   ' }))).toMatch(/remark/i);
  });

  it('starts empty and invalid', () => {
    expect(validateAttendanceRequest(emptyDraft())).toBeTruthy();
  });
});
