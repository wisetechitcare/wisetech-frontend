import { describe, expect, it } from 'vitest';
import { parseDate } from '@internationalized/date';
import { isAllowedDate, isCompleteDate, parseIsoDate, toCalendarConstraints } from './iso-date';

describe('parseIsoDate', () => {
  it('reads a calendar day without a time-zone shift', () => {
    expect(parseIsoDate('2026-10-28')?.toString()).toBe('2026-10-28');
  });

  it('returns null for empty, malformed and impossible days', () => {
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate('28/10/2026')).toBeNull();
    expect(parseIsoDate('2023-02-29')).toBeNull();
    expect(parseIsoDate('2024-02-29')?.toString()).toBe('2024-02-29');
  });
});

describe('isCompleteDate', () => {
  it('is false while a year is still being typed', () => {
    expect(isCompleteDate(parseDate('0202-10-28'))).toBe(false);
    expect(isCompleteDate(parseDate('2026-10-28'))).toBe(true);
  });
});

describe('ISO constraints', () => {
  const constraints = {
    minValue: '2026-10-10',
    maxValue: '2026-10-20',
    isDateUnavailable: (date: string) => date === '2026-10-16',
  };

  it('converts to the CalendarDate props pickers take', () => {
    const converted = toCalendarConstraints(constraints);
    expect(converted.minValue?.toString()).toBe('2026-10-10');
    expect(converted.maxValue?.toString()).toBe('2026-10-20');
    expect(converted.isDateUnavailable?.(parseDate('2026-10-16'))).toBe(true);
    expect(toCalendarConstraints({}).isDateUnavailable).toBeUndefined();
  });

  it('allows only days inside the bounds that are not blocked', () => {
    expect(isAllowedDate(parseDate('2026-10-15'), constraints)).toBe(true);
    expect(isAllowedDate(parseDate('2026-10-09'), constraints)).toBe(false);
    expect(isAllowedDate(parseDate('2026-10-21'), constraints)).toBe(false);
    expect(isAllowedDate(parseDate('2026-10-16'), constraints)).toBe(false);
    expect(isAllowedDate(parseDate('1999-01-01'), {})).toBe(true);
  });
});
