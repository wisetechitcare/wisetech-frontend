import { describe, expect, it } from 'vitest';
import { neutralizeCsvFormula } from './ExportButton';

describe('neutralizeCsvFormula (CSV/formula injection)', () => {
  it.each(['=1+1', '=HYPERLINK("http://x","Open")', '+cmd', '-2+3', '@SUM(A1)', '\tx', '\rx'])(
    'turns %j into text', (v) => {
      expect(neutralizeCsvFormula(v)).toBe(`'${v}`);
    },
  );

  it.each(['-120.50', '+5', '1,00,000.00', '-', '', 'Cab to station', 'WT-RB-20260929-03'])(
    'leaves %j as it is', (v) => {
      expect(neutralizeCsvFormula(v)).toBe(v);
    },
  );
});
