import { describe, expect, it } from 'vitest';
import { csvCell, neutralizeCsvFormula } from './ExportButton';

describe('neutralizeCsvFormula (CSV/formula injection)', () => {
  it.each(['=1+1', '=HYPERLINK("http://x","Open")', '+cmd', '-2+3', '@SUM(A1)', '\tx', '\rx'])(
    'turns %j into text', (v) => {
      expect(neutralizeCsvFormula(v)).toBe(`'${v}`);
    },
  );

  it.each([' =1+1', ' =1+1', '＝1+1', '＠SUM(A1)', '﻿=1+1'])(
    'sees through leading whitespace and full-width forms: %j', (v) => {
      expect(neutralizeCsvFormula(v)).toBe(`'${v}`);
    },
  );

  it.each(['-120.50', '+5', '1,00,000.00', ' 42', '-', '', 'Cab to station', 'WT-RB-20260929-03'])(
    'leaves %j as it is', (v) => {
      expect(neutralizeCsvFormula(v)).toBe(v);
    },
  );
});

describe('csvCell', () => {
  it('always quotes, so ; and tabs stay inside the cell in semicolon locales', () => {
    expect(csvCell('a;=1+1')).toBe('"a;=1+1"');
    expect(csvCell('plain')).toBe('"plain"');
  });

  it('doubles inner quotes and neutralises before quoting', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });

  it('keeps numbers as numbers inside quotes', () => {
    expect(csvCell('-120.50')).toBe('"-120.50"');
  });
});
