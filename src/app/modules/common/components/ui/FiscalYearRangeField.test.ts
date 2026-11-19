/**
 * Pure day-pick transform for the fiscal range dialog. Layout stays in the component;
 * a wrong restart vs end-edit here silently corrupts the stored FY string.
 */
import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { applyFiscalRangeDayPick } from './fiscalYearRangePick';
import { parseDate } from '@internationalized/date';
import { fiscalRangeFromString, fiscalStringFromRange } from './FiscalYearRangeField';

const d = (iso: string) => dayjs(iso).startOf('day');

describe('applyFiscalRangeDayPick', () => {
  it('first click sets start and waits for end', () => {
    const next = applyFiscalRangeDayPick({ from: null, to: null, bound: 'start' }, d('2026-04-01'));
    expect(next.from!.format('YYYY-MM-DD')).toBe('2026-04-01');
    expect(next.to).toBeNull();
    expect(next.bound).toBe('end');
  });

  it('second click sets end without clearing start', () => {
    const next = applyFiscalRangeDayPick(
      { from: d('2026-04-01'), to: null, bound: 'end' },
      d('2027-03-31'),
    );
    expect(next.from!.format('YYYY-MM-DD')).toBe('2026-04-01');
    expect(next.to!.format('YYYY-MM-DD')).toBe('2027-03-31');
    expect(next.bound).toBe('start');
  });

  it('editing End alone keeps start when both are already set', () => {
    const next = applyFiscalRangeDayPick(
      { from: d('2026-04-01'), to: d('2027-03-31'), bound: 'end' },
      d('2027-06-30'),
    );
    expect(next.from!.format('YYYY-MM-DD')).toBe('2026-04-01');
    expect(next.to!.format('YYYY-MM-DD')).toBe('2027-06-30');
  });

  it('editing Start with a complete range restarts (clears end)', () => {
    const next = applyFiscalRangeDayPick(
      { from: d('2026-04-01'), to: d('2027-03-31'), bound: 'start' },
      d('2025-04-01'),
    );
    expect(next.from!.format('YYYY-MM-DD')).toBe('2025-04-01');
    expect(next.to).toBeNull();
    expect(next.bound).toBe('end');
  });
});

// The kit adapter's value conversion: the stored string is the contract with every caller and the API.

describe('FiscalYearRangeField value conversion', () => {
  it('reads the stored ISO range', () => {
    const r = fiscalRangeFromString('2026-04-01 to 2027-03-31');
    expect(r?.start.toString()).toBe('2026-04-01');
    expect(r?.end.toString()).toBe('2027-03-31');
  });

  it('reads a legacy DD/MM/YYYY range', () => {
    const r = fiscalRangeFromString('01/04/2026 to 31/03/2027');
    expect(r?.start.toString()).toBe('2026-04-01');
    expect(r?.end.toString()).toBe('2027-03-31');
  });

  it('treats empty or one-sided values as no range', () => {
    expect(fiscalRangeFromString('')).toBeNull();
    expect(fiscalRangeFromString(null)).toBeNull();
    expect(fiscalRangeFromString('2026-04-01')).toBeNull();
  });

  it('writes a complete range back as ISO', () => {
    expect(fiscalStringFromRange({ start: parseDate('2026-04-01'), end: parseDate('2027-03-31') })).toBe('2026-04-01 to 2027-03-31');
  });

  it('clears to empty when the range is cleared', () => {
    expect(fiscalStringFromRange(null)).toBe('');
  });

  it('holds back a half-typed year instead of storing it', () => {
    expect(fiscalStringFromRange({ start: parseDate('0002-04-01'), end: parseDate('2027-03-31') })).toBeUndefined();
  });
});
