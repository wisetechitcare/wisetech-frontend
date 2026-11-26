import { describe, expect, it } from 'vitest';
import { parseDate } from '@internationalized/date';
import {
  composeOrderedFiscalYearRange,
  fiscalRangeFromString,
  fiscalStringFromRange,
  formatFiscalYearRange,
  getDefaultFiscalYear,
  getFiscalPresetLabel,
  parseFiscalCalendarDate,
  parseTypedFiscalDate,
  parseTypedFiscalRangeInput,
  splitFiscalYearRange,
  toCanonicalFiscalYearRange,
} from './fiscalYearRange';

describe('formatFiscalYearRange', () => {
  it('reads a stored ISO range in the company date format', () => {
    expect(formatFiscalYearRange('2026-04-01 to 2027-03-31')).toBe('2026.04.01 – 2027.03.31');
  });

  it('reads a legacy DD/MM/YYYY range the same way', () => {
    expect(formatFiscalYearRange('01/04/2026 to 31/03/2027')).toBe('2026.04.01 – 2027.03.31');
  });

  it('shows the fallback for an empty or half range', () => {
    expect(formatFiscalYearRange('')).toBe('—');
    expect(formatFiscalYearRange(null)).toBe('—');
    expect(formatFiscalYearRange('2026-04-01', '')).toBe('');
  });
});

describe('parseTypedFiscalDate', () => {
  it('accepts company display YYYY.MM.DD', () => {
    expect(parseTypedFiscalDate('2026.04.01')).toBe('2026-04-01');
  });

  it('accepts natural forms like 1 Apr 2026', () => {
    expect(parseTypedFiscalDate('1 Apr 2026')).toBe('2026-04-01');
  });

  it('accepts a leap-day that exists', () => {
    expect(parseTypedFiscalDate('2024.02.29')).toBe('2024-02-29');
  });

  it('rejects an invalid calendar day', () => {
    expect(parseTypedFiscalDate('2023.02.29')).toBeNull();
  });

  it('rejects an invalid calendar day typed as ISO or DD/MM/YYYY (no silent roll-over)', () => {
    expect(parseTypedFiscalDate('2023-02-29')).toBeNull();
    expect(parseTypedFiscalDate('31/04/2026')).toBeNull();
  });

  it('accepts ISO and legacy DD/MM/YYYY', () => {
    expect(parseTypedFiscalDate('2026-04-01')).toBe('2026-04-01');
    expect(parseTypedFiscalDate('01/04/2026')).toBe('2026-04-01');
  });

  it('rejects partial or empty input', () => {
    expect(parseTypedFiscalDate('')).toBeNull();
    expect(parseTypedFiscalDate('2026.04')).toBeNull();
  });
});

describe('parseTypedFiscalRangeInput', () => {
  it('parses natural language range text', () => {
    expect(parseTypedFiscalRangeInput('1 Apr 2026 to 31 Mar 2027')).toBe('2026-04-01 to 2027-03-31');
  });

  it('parses dotted display with a dash separator', () => {
    expect(parseTypedFiscalRangeInput('2026.04.01 - 2027.03.31')).toBe('2026-04-01 to 2027-03-31');
  });

  it('orders inverted free-text ranges', () => {
    expect(parseTypedFiscalRangeInput('31 Mar 2027 to 1 Apr 2026')).toBe('2026-04-01 to 2027-03-31');
  });

  it('upgrades a legacy year-pair', () => {
    expect(parseTypedFiscalRangeInput('2030-2031')).toBe('2030-04-01 to 2031-03-31');
  });
});

describe('fiscal year accept / Apr–Mar', () => {
  it('orders wire dates when composing', () => {
    expect(composeOrderedFiscalYearRange('2027-03-31', '2026-04-01')).toBe('2026-04-01 to 2027-03-31');
  });

  it('ends a March-start fiscal year on the last day of February, leap years included', () => {
    expect(getDefaultFiscalYear(3)).toMatch(/^\d{4}-03-01 to \d{4}-02-(28|29)$/);
    expect(toCanonicalFiscalYearRange('2027-2028')).toBe('2027-04-01 to 2028-03-31');
  });

  it('returns an Apr–Mar ISO range for today by default', () => {
    const range = getDefaultFiscalYear();
    expect(range).toMatch(/^\d{4}-04-01 to \d{4}-03-31$/);
    expect(toCanonicalFiscalYearRange(range)).toBe(range);
  });

  it('returns a Jul–Jun ISO range when fiscal year starts in July', () => {
    const range = getDefaultFiscalYear(7);
    expect(range).toMatch(/^\d{4}-07-01 to \d{4}-06-30$/);
    expect(toCanonicalFiscalYearRange(range)).toBe(range);
  });

  it('returns a same-year Jan–Dec ISO range when fiscal year starts in January', () => {
    const range = getDefaultFiscalYear(1);
    expect(range).toMatch(/^(\d{4})-01-01 to \1-12-31$/);
    expect(toCanonicalFiscalYearRange(range)).toBe(range);
  });

  it('falls back to Apr–Mar for an invalid start month', () => {
    expect(getDefaultFiscalYear(0)).toMatch(/^\d{4}-04-01 to \d{4}-03-31$/);
    expect(getDefaultFiscalYear(13)).toMatch(/^\d{4}-04-01 to \d{4}-03-31$/);
  });
});

describe('getFiscalPresetLabel', () => {
  it('labels the default April start as Apr–Mar', () => {
    expect(getFiscalPresetLabel()).toBe('Apr–Mar');
    expect(getFiscalPresetLabel(4)).toBe('Apr–Mar');
  });

  it('labels January and July starts', () => {
    expect(getFiscalPresetLabel(1)).toBe('Jan–Dec');
    expect(getFiscalPresetLabel(7)).toBe('Jul–Jun');
  });

  it('labels October and other mid-year starts', () => {
    expect(getFiscalPresetLabel(10)).toBe('Oct–Sep');
    expect(getFiscalPresetLabel(2)).toBe('Feb–Jan');
  });

  it('falls back to Apr–Mar for an invalid start month', () => {
    expect(getFiscalPresetLabel(0)).toBe('Apr–Mar');
    expect(getFiscalPresetLabel(13)).toBe('Apr–Mar');
  });
});

describe('splitFiscalYearRange', () => {
  it('keeps the stored calendar day (no UTC shift)', () => {
    expect(splitFiscalYearRange('2026-04-01 to 2027-03-31')).toEqual({ from: '2026-04-01', to: '2027-03-31' });
  });
});

describe('parseFiscalCalendarDate', () => {
  it('parses real days and rejects impossible ones', () => {
    expect(parseFiscalCalendarDate('2024-02-29')?.toString()).toBe('2024-02-29');
    expect(parseFiscalCalendarDate('2023-02-29')).toBeNull();
    expect(parseFiscalCalendarDate('')).toBeNull();
  });
});

// The kit adapter's value conversion: the stored string is the contract with every caller and the API.

describe('fiscal range ↔ stored string', () => {
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

  it('reads an inverted stored range in order', () => {
    const r = fiscalRangeFromString('2027-03-31 to 2026-04-01');
    expect(r?.start.toString()).toBe('2026-04-01');
    expect(r?.end.toString()).toBe('2027-03-31');
  });

  it('treats empty or one-sided values as no range', () => {
    expect(fiscalRangeFromString('')).toBeNull();
    expect(fiscalRangeFromString(null)).toBeNull();
    expect(fiscalRangeFromString('2026-04-01')).toBeNull();
  });

  it('writes a complete range back as ISO', () => {
    expect(
      fiscalStringFromRange({
        start: parseDate('2026-04-01'),
        end: parseDate('2027-03-31'),
      }),
    ).toBe('2026-04-01 to 2027-03-31');
  });

  it('clears to empty when the range is cleared', () => {
    expect(fiscalStringFromRange(null)).toBe('');
  });

  it('holds back a half-typed year instead of storing it', () => {
    expect(
      fiscalStringFromRange({
        start: parseDate('0002-04-01'),
        end: parseDate('2027-03-31'),
      }),
    ).toBeUndefined();
  });

  it('reads a legacy year-pair as the Apr–Mar ISO range', () => {
    const r = fiscalRangeFromString('2030-2031');
    expect(r?.start.toString()).toBe('2030-04-01');
    expect(r?.end.toString()).toBe('2031-03-31');
  });

  it('writes inverted picks chronologically', () => {
    expect(
      fiscalStringFromRange({
        start: parseDate('2027-03-31'),
        end: parseDate('2026-04-01'),
      }),
    ).toBe('2026-04-01 to 2027-03-31');
  });

  it('round-trips a leap-day boundary inside the range', () => {
    const r = fiscalRangeFromString('2024-02-29 to 2025-02-28');
    expect(r?.start.toString()).toBe('2024-02-29');
    expect(r?.end.toString()).toBe('2025-02-28');
    expect(fiscalStringFromRange(r)).toBe('2024-02-29 to 2025-02-28');
  });

  it('reads a Jul–Jun stored range the same way as Apr–Mar', () => {
    const r = fiscalRangeFromString('2026-07-01 to 2027-06-30');
    expect(r?.start.toString()).toBe('2026-07-01');
    expect(r?.end.toString()).toBe('2027-06-30');
    expect(fiscalStringFromRange(r)).toBe('2026-07-01 to 2027-06-30');
  });
});
