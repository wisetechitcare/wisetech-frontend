import { describe, it, expect } from 'vitest';
import {
  serverIsNonWorkingDay,
  serverIsLate,
  serverIsEarlyCheckout,
  serverLateMinutes,
  serverEarlyMinutes,
  formatVerdictMinutes,
} from './attendanceVerdicts';

describe('attendance server verdicts', () => {
  it('returns undefined when the row carries no verdict, so the caller falls back', () => {
    for (const row of [undefined, null, {}, { checkIn: 'x' }]) {
      expect(serverIsNonWorkingDay(row)).toBeUndefined();
      expect(serverIsLate(row)).toBeUndefined();
      expect(serverIsEarlyCheckout(row)).toBeUndefined();
    }
  });

  it('reads the day kind', () => {
    expect(serverIsNonWorkingDay({ dayKind: 'working' })).toBe(false);
    expect(serverIsNonWorkingDay({ dayKind: 'weekend' })).toBe(true);
    expect(serverIsNonWorkingDay({ dayKind: 'holiday' })).toBe(true);
  });

  it('reads the late verdict, and treats a waived row as not late', () => {
    expect(serverIsLate({ lateMark: { isLate: true } })).toBe(true);
    expect(serverIsLate({ lateMark: { isLate: false } })).toBe(false);
    expect(serverIsLate({ lateWaived: true })).toBe(false);
    // An explicit verdict wins over the legacy flag.
    expect(serverIsLate({ lateMark: { isLate: true }, lateWaived: true })).toBe(true);
  });

  it('reads the early-check-out verdict and its minutes', () => {
    expect(serverIsEarlyCheckout({ earlyCheckout: { isEarly: true, earlyMinutes: 30 } })).toBe(true);
    expect(serverEarlyMinutes({ earlyCheckout: { isEarly: true, earlyMinutes: 30 } })).toBe(30);
    expect(serverEarlyMinutes({ earlyCheckout: { isEarly: false, earlyMinutes: 0 } })).toBeUndefined();
    expect(serverLateMinutes({ lateMark: { isLate: true, lateMinutes: 65 } })).toBe(65);
  });

  it('formats minutes the one way cards write them', () => {
    expect(formatVerdictMinutes(65)).toBe('1h 5m');
    expect(formatVerdictMinutes(45)).toBe('45m');
    expect(formatVerdictMinutes(-3)).toBe('0m');
  });
});
