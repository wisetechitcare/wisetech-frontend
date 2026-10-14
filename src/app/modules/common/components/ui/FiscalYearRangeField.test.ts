/**
 * Pure day-pick transform for the fiscal range dialog. Layout stays in the component;
 * a wrong restart vs end-edit here silently corrupts the stored FY string.
 */
import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { applyFiscalRangeDayPick } from './fiscalYearRangePick';

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
