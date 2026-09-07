import { describe, test, expect } from 'vitest';
import { lightOf, readableOn, rowTone } from './MeetingsList';

/**
 * The half-day palette is configurable, so its readability cannot be checked by looking at it
 * once. These are the two guarantees the calendar makes about ANY colour somebody picks: the
 * pill's ink is legible on the colour, and the meeting row's ink is legible on the tint mixed
 * from it. A regression here is invisible in review and obvious to whoever has to read the
 * grid.
 */

/** WCAG relative luminance, then the standard contrast ratio. */
const contrast = (a: string, b: string) => {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, bl] = [0, 2, 4]
      .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The two shipped defaults, plus the corners a colour picker makes easy to reach.
const CANDIDATES = ['#1E3A8A', '#B45309', '#000000', '#FFFFFF', '#F8FAFC', '#FFFF00', '#0EA5E9', '#7C3AED'];

describe('lightOf', () => {
  test('mixes toward white, never past it', () => {
    expect(lightOf('#000000', 0)).toBe('#000000');
    expect(lightOf('#000000', 1)).toBe('#ffffff');
    expect(lightOf('#ffffff', 0.88)).toBe('#ffffff');
  });

  test('accepts three-digit hex, with or without the hash', () => {
    expect(lightOf('#000', 0)).toBe('#000000');
    expect(lightOf('000000', 0)).toBe('#000000');
  });

  test('always lands lighter than it started', () => {
    for (const c of CANDIDATES) {
      const tint = lightOf(c);
      expect(contrast(tint, '#FFFFFF')).toBeLessThanOrEqual(contrast(c, '#FFFFFF') + 1e-9);
    }
  });
});

describe('readable ink on any configured colour', () => {
  test('the pill is legible on every candidate', () => {
    for (const c of CANDIDATES) {
      // 4.5:1 is the AA threshold for body text; the pill is bold, so this is the strict read.
      expect(contrast(c, readableOn(c)), c).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the meeting row is legible on the tint mixed from every candidate', () => {
    for (const c of CANDIDATES) {
      const { bg, fg } = rowTone(c);
      expect(contrast(bg, fg), c).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the row keeps the full colour as its edge, so close tints stay distinguishable', () => {
    // Two blues a person might plausibly pick for the two halves mix to near-identical
    // tints — the edge is what still tells them apart.
    const a = rowTone('#1E3A8A');
    const b = rowTone('#1E4A8A');
    expect(contrast(a.bg, b.bg)).toBeLessThan(1.1);
    expect(a.edge).not.toBe(b.edge);
  });
});
