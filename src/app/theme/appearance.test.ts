/**
 * The appearance engine's pure half — the parts that decide what a setting
 * MEANS, independent of React or the DOM.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND,
  BRAND_PRESETS,
  normalizeBrand,
  readableOn,
  resolveMode,
  shade,
} from './appearance';

describe('mode resolves, and system keeps following', () => {
  it('pins an explicit choice whatever the OS says', () => {
    expect(resolveMode('light', true)).toBe('light');
    expect(resolveMode('dark', false)).toBe('dark');
  });

  it('defers to the OS only for `system`', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
  });
});

describe('a brand is repaired per role, never wholesale', () => {
  it('keeps the valid roles and replaces only the broken one', () => {
    const b = normalizeBrand({ primary: '#123456', secondary: 'nonsense', accent: '#ABCDEF', ink: '#000000' });
    expect(b.primary).toBe('#123456');
    expect(b.secondary).toBe(DEFAULT_BRAND.secondary);
    expect(b.accent).toBe('#ABCDEF');
    expect(b.ink).toBe('#000000');
  });

  it('survives junk entirely', () => {
    expect(normalizeBrand(null)).toEqual(DEFAULT_BRAND);
    expect(normalizeBrand('nope')).toEqual(DEFAULT_BRAND);
    expect(normalizeBrand({ primary: 42 })).toEqual(DEFAULT_BRAND);
  });

  it('ships presets that are themselves valid', () => {
    BRAND_PRESETS.forEach((p) => expect(normalizeBrand(p.brand)).toEqual(p.brand));
  });
});

describe('derived colours', () => {
  it('picks a foreground that actually contrasts', () => {
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn('#FFFFFF')).toBe('#0f172a');
    // The shipped navy is dark enough for white text.
    expect(readableOn(DEFAULT_BRAND.primary)).toBe('#ffffff');
  });

  it('falls back rather than painting garbage', () => {
    expect(readableOn('rebeccapurple')).toBe('#ffffff');
    expect(shade('rebeccapurple', 0.5)).toBe('rebeccapurple');
  });

  it('mixes toward white and black', () => {
    expect(shade('#000000', 1)).toBe('#ffffff');
    expect(shade('#ffffff', -1)).toBe('#000000');
    expect(shade('#808080', 0)).toBe('#808080');
  });

  it('always yields a valid hex, so a derived value can never break a style', () => {
    [-1, -0.4, 0, 0.4, 1].forEach((amount) => {
      BRAND_PRESETS.forEach((p) => expect(shade(p.brand.primary, amount)).toMatch(/^#[0-9a-f]{6}$/));
    });
  });

  /** Dark mode brightens the CHOSEN colour rather than falling back to a stock blue. */
  it('brightens a brand for dark mode without changing its identity', () => {
    const lightened = shade(DEFAULT_BRAND.primary, 0.42);
    expect(lightened).not.toBe(DEFAULT_BRAND.primary);
    expect(readableOn(lightened)).toBeTruthy();
  });
});
