import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { daysOpen } from './momDays';

describe('daysOpen', () => {
  it('counts calendar days from open to close', () => {
    expect(daysOpen('2026-10-01T23:00:00', '2026-10-05T01:00:00')).toBe(4);
    expect(daysOpen('2026-10-01', '2026-10-01')).toBe(0);
  });
  it('keeps counting to today while the line is open', () => {
    expect(daysOpen('2026-10-01', null, dayjs('2026-10-11T09:00:00'))).toBe(10);
  });
  it('never goes negative on a bad close date', () => {
    expect(daysOpen('2026-10-05', '2026-10-01')).toBe(0);
  });
});
