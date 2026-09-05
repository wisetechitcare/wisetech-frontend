/**
 * The resolver's precedence rules, pinned.
 *
 * These are the rules the tile, the legend swatch, the tooltip and the detail
 * header all read through, so a regression here shows up in four places at
 * once and in none of them obviously.
 */
import { describe, expect, it } from 'vitest';
import { resolveDayVisual, resolveLegendVisual } from './dayTokens';

const PINK = '#db2777';

describe('regularized repaints the fill', () => {
  it('is not the plain present green', () => {
    const present = resolveDayVisual('present', []);
    const regularized = resolveDayVisual('present', ['regularized']);

    expect(regularized.fill).toBe('solid');
    expect(regularized.trio.c).toBe(PINK);
    expect(regularized.trio.c).not.toBe(present.trio.c);
  });

  it('does not also spend a dot on itself', () => {
    expect(resolveDayVisual('present', ['regularized']).dots).toHaveLength(0);
  });

  it('leaves the other modifiers their dot', () => {
    const v = resolveDayVisual('present', ['regularized', 'late_in'], undefined, 20);
    expect(v.trio.c).toBe(PINK);
    expect(v.dots.map((d) => d.key)).toEqual(['late_in']);
  });

  it('takes the admin colour over the built-in pink', () => {
    const v = resolveDayVisual('present', ['regularized'], undefined, null, { regularized: '#ff00c8' });
    expect(v.trio.c).toBe('#ff00c8');
    // The surface pair is DERIVED, never taken raw — that is what stops a pale
    // pick producing an unreadable tile.
    expect(v.trio.bg).not.toBe('#ff00c8');
  });

  it('ignores a malformed admin colour rather than painting garbage', () => {
    expect(resolveDayVisual('present', ['regularized'], undefined, null, { regularized: 'hotpink' }).trio.c).toBe(PINK);
  });

  it('yields to a ring — an unresolved day is unresolved first', () => {
    const v = resolveDayVisual('present', ['regularized', 'request_pending']);
    expect(v.ring).toBe('dashed');
    expect(v.fill).toBe('none');
    expect(v.trio.c).not.toBe(PINK);
  });

  it('never repaints a structural tint', () => {
    const v = resolveDayVisual('weekly_off', ['regularized']);
    expect(v.fill).toBe('tint');
    expect(v.trio.c).not.toBe(PINK);
  });

  it('keeps the split for a regularised half day, recolouring only its own half', () => {
    const v = resolveDayVisual('half_day', ['regularized']);
    expect(v.fill).toBe('split');
    expect(v.trio.c).toBe(PINK);
    expect(v.splitWith?.c).toBeTruthy();
  });
});

describe('the legend swatch cannot drift from the tile', () => {
  it('resolves regularised to the same paint the tile uses', () => {
    const chip = resolveLegendVisual('regularized');
    const tile = resolveDayVisual('present', ['regularized']);
    expect(chip.trio.c).toBe(tile.trio.c);
    expect(chip.fill).toBe(tile.fill);
  });

  it('carries the admin colour into the chip too', () => {
    expect(resolveLegendVisual('regularized', undefined, { regularized: '#ff00c8' }).trio.c).toBe('#ff00c8');
  });

  it('still separates regularised from present', () => {
    expect(resolveLegendVisual('regularized').trio.c).not.toBe(resolveLegendVisual('present').trio.c);
  });
});
