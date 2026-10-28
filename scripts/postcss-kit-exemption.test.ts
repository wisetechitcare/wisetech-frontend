import { describe, expect, test } from 'vitest';
import { exemptKitFromUtility, isLegacyStylesheet } from './postcss-kit-exemption';

const decl = (prop: string, important = true) => ({ type: 'decl' as const, prop, important });
const rule = (selectors: string[], nodes = [decl('padding-left'), decl('padding-right')], parent?: { type: string; name: string }) =>
  ({ type: 'rule' as const, selectors, nodes, parent });

describe('Bootstrap utilities skip kit elements', () => {
  test('a single-class !important utility gets the zero-specificity exemption', () => {
    const r = rule(['.px-4']);
    expect(exemptKitFromUtility(r)).toBe(true);
    expect(r.selectors).toEqual(['.px-4:not(:where([data-slot]))']);
  });

  test('custom properties alongside !important declarations still count as a utility', () => {
    const r = rule(['.bg-white'], [decl('--bs-bg-opacity', false), decl('background-color')]);
    expect(exemptKitFromUtility(r)).toBe(true);
  });

  test.each([
    ['component rules (not all !important)', rule(['.card'], [decl('padding', false)])],
    ['compound selectors', rule(['.btn.btn-primary'])],
    ['descendant selectors', rule(['.modal .px-4'])],
    ['element selectors', rule(['button'])],
    ['pseudo-class selectors', rule(['.bg-hover-primary:hover'])],
    ['keyframe steps', rule(['.from'], undefined, { type: 'atrule', name: 'keyframes' })],
  ])('leaves %s alone', (_label, r) => {
    const before = [...r.selectors];
    expect(exemptKitFromUtility(r)).toBe(false);
    expect(r.selectors).toEqual(before);
  });

  test('only Metronic stylesheets are rewritten', () => {
    expect(isLegacyStylesheet('C:/repo/src/_metronic/assets/sass/style.scss')).toBe(true);
    expect(isLegacyStylesheet(['C:', 'repo', 'src', '_metronic', 'a.scss'].join(String.fromCharCode(92)))).toBe(true);
    expect(isLegacyStylesheet('C:/repo/src/main.css')).toBe(false);
    expect(isLegacyStylesheet(undefined)).toBe(false);
  });
});
