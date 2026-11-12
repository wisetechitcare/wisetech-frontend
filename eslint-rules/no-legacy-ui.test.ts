// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { Linter, RuleTester } from 'eslint';

const require = createRequire(import.meta.url);
const rule = require('./no-legacy-ui.cjs');
const { isBootstrapOnly } = require('./bootstrapClasses.cjs');

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const parser = require.resolve('@typescript-eslint/parser');
const tester = new RuleTester({
  parser,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const bad = (code: string) => ({ code, errors: 1 });

tester.run('no-legacy-ui', rule, {
  valid: [
    '<div className="flex items-center gap-2 px-5 text-muted-foreground rounded-2xl col-span-2 md:flex-row" />',
    // Names Tailwind ALSO defines must never be reported.
    '<div className="gap-3 text-gray-700 flex-row text-start w-100 table table-row col-auto col-3 flex-wrap shrink-0 cursor-pointer ms-3 me-2 ps-4 pe-4 border-t border-s rounded-t-lg" />',
    "import type { SxProps } from '@mui/material';",
    "import { type Theme } from '@mui/material/styles';",
    "import X from '@mui/icons-material/Close';",
    "import { useState } from 'react';",
    // Compared / looked-up strings are not classes.
    "<div className={cn(variant === 'card' && 'p-2', MAP['btn'])} />",
    '<div title="d-flex" />',
    '<div className={`flex ${a}-6`} />',
  ],
  invalid: [
    bad('<div className="d-flex" />'),
    bad("<div className={cn('md:justify-content-between', x)} />"),
    bad('<div className={`fw-bold ${a}`} />'),
    bad('<div className="col-lg-6" />'),
    bad('<div className="btn btn-primary" />'),
    bad('<div className="text-muted" />'),
    bad('<div className="min-w-150px" />'),
    bad('<div className={x ? "flex" : "!d-none"} />'),
    bad('<div className={`btn-${variant}`} />'),
    bad("import { Box } from '@mui/material';"),
    bad("import Tooltip from '@mui/material/Tooltip';"),
    bad("import { styled } from '@emotion/styled';"),
    bad("import { Modal } from 'react-bootstrap';"),
    bad("import 'react-bootstrap/dist/x';"),
    bad("import { type MRT_ColumnDef, MaterialReactTable } from 'material-react-table';"),
    bad("export { Box } from '@mui/material';"),
    bad("const B = lazy(() => import('@mui/material/Button'));"),
    bad("const B = require('react-bootstrap');"),
    bad('<div className="data-[state=open]:d-flex" />'),
    bad('<div className="aria-[expanded=true]:fw-bold" />'),
    bad('<div className="supports-[display:grid]:d-flex" />'),
    bad('<div className="group-hover/menu:d-flex" />'),
    { code: '<div className="d-flex fw-bold" />', errors: 1 }, // one report per string literal
    { code: "import { Box } from '@mui/material'; <div className=\"row\" />", errors: 2 },
    {
      code: '<div className="d-flex" />',
      errors: [{ message: /Bootstrap-only class "d-flex".*flex/ }],
    },
    {
      code: "import { Box } from '@mui/material';",
      options: [{ classes: false }],
      errors: 1,
    },
  ],
});

describe('rule options', () => {
  it('imports:false reports only classes, classes:false reports only imports', () => {
    const linter = new Linter();
    linter.defineParser('ts', require(parser));
    linter.defineRule('wisetech/no-legacy-ui', rule);
    const run = (opts: object) =>
      linter.verify(
        "import { Box } from '@mui/material'; export const a = <div className=\"d-flex\" />;",
        {
          parser: 'ts',
          parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
          rules: { 'wisetech/no-legacy-ui': ['error', opts] },
        },
        'x.tsx',
      );
    expect(run({ imports: false }).map((m) => m.message)).toEqual([expect.stringContaining('d-flex')]);
    expect(run({ classes: false }).map((m) => m.message)).toEqual([expect.stringContaining('@mui/material')]);
  });
});

describe('bootstrapClasses.isBootstrapOnly', () => {
  it.each([
    'row', 'col', 'col-md-6', 'col-xl-auto', 'g-4', 'gx-2', 'gy-3', 'd-none', 'd-md-flex', 'd-inline-block',
    'align-items-center', 'justify-content-end', 'flex-column', 'flex-md-row', 'flex-center', 'fw-bold', 'fs-2x',
    'fs-6', 'fs-base', 'lh-1', 'text-muted', 'text-dark', 'text-truncate', 'text-hover-primary', 'bg-light',
    'bg-light-primary', 'bg-body', 'mw-100', 'mh-200px', 'min-w-150px', 'h-40px', 'position-relative',
    'rounded-3', 'rounded-circle', 'rounded-pill', 'border-top', 'border-start-2', 'user-select-none', 'pe-none',
    'pe-auto', 'visually-hidden', 'btn', 'btn-sm', 'card', 'card-body', 'badge-light', 'modal-dialog', 'nav-item',
    'form-control', 'form', 'table-striped', 'table-row-dashed', 'table-row-gray-300', 'spinner-border',
    'symbol-40px', 'separator', 'menu-item', 'svg-icon-2', 'fv-row', 'bullet', 'md:d-flex', '!fw-bold', 'dark:text-muted',
  ])('flags %s', (t: string) => expect(isBootstrapOnly(t)).toBe(true));

  it.each([
    'flex', 'items-center', 'font-semibold', 'text-muted-foreground', 'px-5', 'gap-3', 'text-gray-700', 'flex-row',
    'flex-col', 'text-start', 'w-100', 'table', 'table-row', 'table-cell', 'col-span-2', 'col-auto', 'col-3',
    'flex-wrap', 'shrink-0', 'cursor-pointer', 'ms-3', 'me-2', 'ps-4', 'pe-4', 'rounded-2xl', 'rounded-t-lg',
    'border-t', 'border-2', 'hidden', 'md:flex-row', 'min-w-[150px]', 'w-px', 'uppercase', 'truncate',
  ])('leaves %s alone', (t: string) => expect(isBootstrapOnly(t)).toBe(false));
});

describe('kit purity', () => {
  it('reports 0 Bootstrap-only classes across every src/ds/**/*.tsx (no Tailwind false positives)', () => {
    const root = path.resolve(__dirname, '..', 'src', 'ds');
    const files: string[] = [];
    (function walk(d: string) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (f.endsWith('.tsx')) files.push(f);
      }
    })(root);
    expect(files.length).toBeGreaterThan(20);

    const linter = new Linter();
    linter.defineParser('ts', require(parser));
    linter.defineRule('wisetech/no-legacy-ui', rule);
    const reports: string[] = [];
    for (const f of files) {
      const msgs = linter.verify(
        fs.readFileSync(f, 'utf8'),
        {
          parser: 'ts',
          parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
          rules: { 'wisetech/no-legacy-ui': ['error', { imports: false }] },
        },
        f,
      );
      // Only this rule's findings. The Linter is built with `wisetech/no-legacy-ui` alone, so an
      // `eslint-disable` comment in kit code that names any OTHER rule makes ESLint emit its own
      // problem — "Definition for rule 'react-hooks/exhaustive-deps' was not found" — with a null
      // ruleId. Collecting those made this test fail over a legitimate disable comment in
      // page-tabs.tsx, which has nothing to do with Bootstrap classes. The test is about the rule's
      // own output, so filter to it rather than teach this Linter every plugin the real config has.
      for (const m of msgs) {
        if (m.ruleId !== 'wisetech/no-legacy-ui') continue;
        reports.push(`${path.relative(root, f)}:${m.line} ${m.message}`);
      }
    }
    expect(reports).toEqual([]);
  });
});
