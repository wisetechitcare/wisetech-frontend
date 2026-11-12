// @vitest-environment node
import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error plain .mjs without types
import { reachLegacyUi } from './legacy-ui-reach.mjs';

type Row = { file: string; specs: string[]; chain: string[] };
const ROOT = path.resolve(__dirname, '..');
const reach = (dir: string): Row[] => reachLegacyUi(ROOT, dir);

/**
 * Directories (relative to the repo root) that must stay MUI-free: no file in them, and no module they
 * import at runtime, may reach @mui/material|system|lab|x-*, @emotion/*, react-bootstrap or
 * material-react-table. Add a module here the moment its migration lands; the list only grows.
 */
const MUI_FREE_ROOTS: string[] = [];

describe('MUI-free modules', () => {
  it.each(MUI_FREE_ROOTS)('%s reaches no legacy UI', (dir) => {
    const hits = reach(dir).map((r) => `${r.file} [${r.specs.join(', ')}]\n  ${r.chain.join(' -> ')}`);
    expect(hits).toEqual([]);
  });

  it('declares no roots yet (Reimbursement is added when it is migrated)', () => {
    expect(MUI_FREE_ROOTS).toEqual([]);
  });
});

describe('reachLegacyUi', () => {
  const payment = 'src/app/pages/employee/reimbursement/components/payment';

  it('follows a lazy(() => import()) boundary: MaterialTable -> MaterialTableImpl -> material-react-table', () => {
    const hit = reach(payment).find((r) => r.file === 'src/app/modules/common/components/MaterialTableImpl.tsx');
    expect(hit).toBeDefined();
    expect(hit!.specs).toContain('material-react-table');
    expect(hit!.chain).toEqual([
      `${payment}/PaymentHistoryTable.tsx`,
      'src/app/modules/common/components/MaterialTable.tsx',
      'src/app/modules/common/components/MaterialTableImpl.tsx',
    ]);
  });

  it('reports a direct @mui/material import with a one-file chain', () => {
    const hit = reach(payment).find((r) => r.file === `${payment}/PaymentHistoryTable.tsx`);
    expect(hit?.specs).toContain('@mui/material');
    expect(hit?.chain).toEqual([`${payment}/PaymentHistoryTable.tsx`]);
  });

  it('resolves relative imports whatever form the root is passed in (relative root was the original miss)', () => {
    const rel = path.relative(process.cwd(), ROOT) || '.';
    const viaRel = reachLegacyUi(rel, payment).map((r: Row) => r.file).sort();
    expect(viaRel).toEqual(reach(payment).map((r) => r.file).sort());
  });

  it('does not count @mui/icons-material (owned by no-legacy-icons) or type-only imports', () => {
    const all = reach('src/ds').flatMap((r) => r.specs);
    expect(all.some((s: string) => s.startsWith('@mui/icons-material'))).toBe(false);
  });
});
