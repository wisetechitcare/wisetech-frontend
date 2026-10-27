import { describe, it, expect } from 'vitest';
import { parseAttendanceTime } from './attendanceColorUtils';

describe('parseAttendanceTime', () => {
  const day = '2026-10-22';
  const hhmm = (value: string) => parseAttendanceTime(value, day)?.format('YYYY-MM-DD HH:mm');

  it('reads 12-hour times on the reference day through the strict formats', () => {
    expect(hhmm('06:30 PM')).toBe('2026-10-22 18:30');
    expect(hhmm('6:30 PM')).toBe('2026-10-22 18:30');
    expect(hhmm('01:15 PM')).toBe('2026-10-22 13:15');
    expect(hhmm('09:45 AM')).toBe('2026-10-22 09:45');
    expect(hhmm('12:05 AM')).toBe('2026-10-22 00:05');
  });

  it('reads 24-hour times, with and without seconds', () => {
    expect(hhmm('18:30')).toBe('2026-10-22 18:30');
    expect(hhmm('09:05:30')).toBe('2026-10-22 09:05');
  });

  it('keeps an explicit date', () => {
    expect(hhmm('2026-10-20 07:10 PM')).toBe('2026-10-20 19:10');
  });

  it('returns null for garbage instead of guessing', () => {
    expect(parseAttendanceTime('not a time', day)).toBeNull();
  });
});
