import { describe, expect, it } from 'vitest';
import { formatFiscalYearRange } from './fiscalYearRange';

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
