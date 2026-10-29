import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { exemptKitFromUtility, isLegacyStylesheet, kitClassNames } from './postcss-kit-exemption';

const decl = (prop: string, important = true) => ({ type: 'decl' as const, prop, important });
const rule = (selectors: string[], nodes = [decl('padding-left'), decl('padding-right')], parent?: { type: string; name: string }) =>
  ({ type: 'rule' as const, selectors, nodes, parent });
const KIT = new Set(['px-4', 'bg-white', 'border', 'text-white']);

describe('Bootstrap utilities the kit also uses skip kit elements', () => {
  test('a colliding single-class !important utility gets the zero-specificity exemption', () => {
    const r = rule(['.px-4']);
    expect(exemptKitFromUtility(r, KIT)).toBe(true);
    expect(r.selectors).toEqual(['.px-4:not(:where([data-slot]))']);
  });

  test('custom properties alongside !important declarations still count as a utility', () => {
    const r = rule(['.bg-white'], [decl('--bs-bg-opacity', false), decl('background-color')]);
    expect(exemptKitFromUtility(r, KIT)).toBe(true);
  });

  test('Bootstrap-only layout classes keep applying to kit buttons (w-100, d-none, me-2)', () => {
    for (const name of ['.w-100', '.d-none', '.me-2']) {
      const r = rule([name]);
      expect(exemptKitFromUtility(r, KIT)).toBe(false);
      expect(r.selectors).toEqual([name]);
    }
  });

  test('in a grouped rule only the colliding selector is exempted', () => {
    const r = rule(['.px-4', '.ps-4']);
    exemptKitFromUtility(r, KIT);
    expect(r.selectors).toEqual(['.px-4:not(:where([data-slot]))', '.ps-4']);
  });

  test.each([
    ['component rules (not all !important)', rule(['.border'], [decl('padding', false)])],
    ['compound selectors', rule(['.btn.btn-primary'])],
    ['descendant selectors', rule(['.modal .px-4'])],
    ['element selectors', rule(['button'])],
    ['pseudo-class selectors', rule(['.bg-white:hover'])],
    ['keyframe steps', rule(['.border'], undefined, { type: 'atrule', name: 'keyframes' })],
  ])('leaves %s alone', (_label, r) => {
    const before = [...r.selectors];
    expect(exemptKitFromUtility(r, KIT)).toBe(false);
    expect(r.selectors).toEqual(before);
  });

  test('only Metronic stylesheets are rewritten', () => {
    expect(isLegacyStylesheet('C:/repo/src/_metronic/assets/sass/style.scss')).toBe(true);
    expect(isLegacyStylesheet(['C:', 'repo', 'src', '_metronic', 'a.scss'].join(String.fromCharCode(92)))).toBe(true);
    expect(isLegacyStylesheet('C:/repo/src/main.css')).toBe(false);
    expect(isLegacyStylesheet(undefined)).toBe(false);
  });

  test('the kit class set is read from the kit source (button classes, not prefixed ones)', () => {
    const names = kitClassNames(path.resolve(__dirname, '../src/ds'));
    expect(names.has('px-4')).toBe(true);
    expect(names.has('bg-white')).toBe(true);
    expect(names.has('w-100')).toBe(false);
    expect([...names].some((n) => n.includes(':'))).toBe(false);
  });
});
