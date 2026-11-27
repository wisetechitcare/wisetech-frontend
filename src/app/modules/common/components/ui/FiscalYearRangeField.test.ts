/**
 * Pure day-pick transform for the fiscal range popover. Layout stays in the component;
 * a wrong restart vs end-edit here silently corrupts the stored FY string.
 */
import { describe, expect, it } from 'vitest';
import { parseDate } from '@internationalized/date';

import { applyFiscalCalendarDayPick } from './fiscalYearRangePick';
import { buildFiscalYearPresets } from './FiscalYearRangeField';

const c = (iso: string) => parseDate(iso);

describe('applyFiscalCalendarDayPick', () => {
  it('first click sets start and waits for end', () => {
    const next = applyFiscalCalendarDayPick(
      { from: null, to: null, bound: 'start' },
      c('2026-04-01'),
    );
    expect(next.from!.toString()).toBe('2026-04-01');
    expect(next.to).toBeNull();
    expect(next.bound).toBe('end');
  });

  it('second click sets end without clearing start', () => {
    const next = applyFiscalCalendarDayPick(
      { from: c('2026-04-01'), to: null, bound: 'end' },
      c('2027-03-31'),
    );
    expect(next.from!.toString()).toBe('2026-04-01');
    expect(next.to!.toString()).toBe('2027-03-31');
    expect(next.bound).toBe('start');
  });

  it('editing End alone keeps start when both are already set', () => {
    const next = applyFiscalCalendarDayPick(
      { from: c('2026-04-01'), to: c('2027-03-31'), bound: 'end' },
      c('2027-06-30'),
    );
    expect(next.from!.toString()).toBe('2026-04-01');
    expect(next.to!.toString()).toBe('2027-06-30');
  });

  it('editing Start with a complete range restarts (clears end)', () => {
    const next = applyFiscalCalendarDayPick(
      { from: c('2026-04-01'), to: c('2027-03-31'), bound: 'start' },
      c('2025-04-01'),
    );
    expect(next.from!.toString()).toBe('2025-04-01');
    expect(next.to).toBeNull();
    expect(next.bound).toBe('end');
  });
});

describe('buildFiscalYearPresets', () => {
  it('defaults to an Apr–Mar preset for today', () => {
    const presets = buildFiscalYearPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.label).toBe('Apr–Mar');
    expect(presets[0]?.title).toBe('Set to current Apr–Mar fiscal year');
    expect(presets[0]?.value.start.toString()).toMatch(/^\d{4}-04-01$/);
    expect(presets[0]?.value.end.toString()).toMatch(/^\d{4}-03-31$/);
  });

  it('builds a Jul–Jun preset when fiscalStartMonth is 7', () => {
    const presets = buildFiscalYearPresets(7);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.label).toBe('Jul–Jun');
    expect(presets[0]?.value.start.toString()).toMatch(/^\d{4}-07-01$/);
    expect(presets[0]?.value.end.toString()).toMatch(/^\d{4}-06-30$/);
  });

  it('builds a same-year Jan–Dec preset when fiscalStartMonth is 1', () => {
    const presets = buildFiscalYearPresets(1);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.label).toBe('Jan–Dec');
    expect(presets[0]?.value.start.toString()).toMatch(/^(\d{4})-01-01$/);
    const startYear = presets[0]!.value.start.year;
    expect(presets[0]?.value.end.toString()).toBe(`${startYear}-12-31`);
  });

  it('honours an explicit preset label override', () => {
    const presets = buildFiscalYearPresets(4, 'Company FY');
    expect(presets[0]?.label).toBe('Company FY');
    expect(presets[0]?.title).toBe('Set to current Company FY fiscal year');
  });
});
