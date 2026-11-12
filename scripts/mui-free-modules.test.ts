// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs without types
import { reachLegacyUi } from './legacy-ui-reach.mjs';

type Row = { file: string; specs: string[]; chain: string[] };
const ROOT = path.resolve(__dirname, '..');

/**
 * Directories (relative to the repo root) that must stay MUI-free: no file in them, and no module they
 * import at runtime, may reach @mui/material|system|lab|x-*, @emotion/*, react-bootstrap or
 * material-react-table. Add a module here the moment its migration lands; the list only grows.
 */
const MUI_FREE_ROOTS: string[] = [
  'src/app/pages/employee/reimbursement',
];

describe('MUI-free modules', () => {
  it.each(MUI_FREE_ROOTS)('%s reaches no legacy UI', (dir) => {
    const hits = (reachLegacyUi(ROOT, dir) as Row[]).map((r) => `${r.file} [${r.specs.join(', ')}]\n  ${r.chain.join(' -> ')}`);
    expect(hits).toEqual([]);
  });

  it('Reimbursement is locked MUI-free (the first module on the list)', () => {
    expect(MUI_FREE_ROOTS).toContain('src/app/pages/employee/reimbursement');
  });

  it('smoke: the analyser runs on the live kit and src/ds is MUI-free', () => {
    expect(reachLegacyUi(ROOT, 'src/ds')).toEqual([]);
  });
});

describe('reachLegacyUi (fixture repo)', () => {
  let root: string;
  const write = (rel: string, body: string) => {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  };
  const reach = (dir: string): Row[] => reachLegacyUi(root, dir);

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-ui-reach-'));
    write('tsconfig.json', '{ // comments allowed\n "compilerOptions": { "paths": { "@lib/*": ["./src/lib/*"], "@lib": ["./src/lib"] } } }');
    // lazy boundary, as MaterialTable -> MaterialTableImpl
    write('src/lazy/Page.tsx', "import Wrapper from '@lib/Wrapper';\nexport default () => Wrapper;");
    write('src/lib/Wrapper.tsx', "import { lazy } from 'react';\nexport default lazy(() => import('./Impl'));");
    write('src/lib/Impl.tsx', "import { Box } from '@mui/material';\nexport default Box;");
    // barrel: only the imported NAME is followed
    write('src/lib/index.ts', "export { Clean } from './Clean';\nexport { Dirty } from './Dirty';\nexport { Thing } from './Thing';");
    write('src/lib/Clean.tsx', 'export const Clean = 1;');
    write('src/lib/Dirty.tsx', "import Button from '@mui/material/Button';\nexport const Dirty = Button;");
    write('src/lib/Thing.tsx', "import Button from '@mui/material/Button';\nexport const Thing = Button;");
    write('src/barrel/UsesClean.tsx', "import { Clean } from '@lib';\nexport default Clean;");
    write('src/barrel/UsesDirty.tsx', "import { Dirty } from '@lib';\nexport default Dirty;");
    // type-only and icon imports are NOT reported
    write('src/skip/Types.tsx', "import type { SxProps } from '@mui/material';\nimport { type Theme } from '@mui/material/styles';\nimport Close from '@mui/icons-material/Close';\nexport type T = SxProps | Theme;\nexport default Close;");
    // mixed file: a legacy import AND a re-export in the same START file
    write('src/mixed/Start.tsx', "import { Box } from '@mui/material';\nexport { Clean } from '@lib/Clean';\nexport default Box;");
    // namespace import of a barrel
    write('src/ns/Start.tsx', "import * as L from '@lib/index';\nexport default L;");
    // lazy(() => import(barrel))
    write('src/lazybarrel/Start.tsx', "import { lazy } from 'react';\nexport default lazy(() => import('@lib/index'));");
    // side-effect import of a barrel
    write('src/side/Start.tsx', "import '@lib/index';");
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('follows a lazy(() => import()) boundary through a tsconfig alias', () => {
    const hit = reach('src/lazy').find((r) => r.file === 'src/lib/Impl.tsx');
    expect(hit?.specs).toEqual(['@mui/material']);
    expect(hit?.chain).toEqual(['src/lazy/Page.tsx', 'src/lib/Wrapper.tsx', 'src/lib/Impl.tsx']);
  });

  it('follows a named import through a barrel to only that re-export', () => {
    expect(reach('src/barrel').map((r) => r.file).sort()).toEqual(['src/lib/Dirty.tsx']);
    expect(reach('src/barrel').find((r) => r.file === 'src/lib/Dirty.tsx')?.chain).toEqual([
      'src/barrel/UsesDirty.tsx',
      'src/lib/Dirty.tsx',
    ]);
  });

  it('does not report type-only imports or @mui/icons-material', () => {
    expect(reach('src/skip')).toEqual([]);
  });

  it('keeps a start file own imports when it also has a re-export (mixed file)', () => {
    expect(reach('src/mixed').map((r) => r.file)).toEqual(['src/mixed/Start.tsx']);
  });

  it.each(['src/ns', 'src/lazybarrel', 'src/side'])('%s: a whole-module arrival at a barrel follows every re-export', (dir) => {
    const files = reach(dir).map((r) => r.file).sort();
    expect(files).toEqual(['src/lib/Dirty.tsx', 'src/lib/Thing.tsx']);
  });

  it('gives the same answer for a relative root (the original miss)', () => {
    const rel = path.relative(process.cwd(), root);
    expect(reachLegacyUi(rel, 'src/lazy')).toEqual(reach('src/lazy'));
  });
});
