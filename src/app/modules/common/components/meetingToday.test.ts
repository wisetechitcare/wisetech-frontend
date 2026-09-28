import { describe, test, expect } from 'vitest';
import { contrastRatio, MIN_CONTRAST, todayCellStyle, todayInk } from './MeetingsList';

/**
 * Today is marked with a WASH, not a ring.
 *
 * The grid already spends a 2px ring on the picked day and a 2px dashed one on a drop target;
 * today wearing a third made the three tellable apart only by remembering the key. These pin
 * the two things that make a quiet marker still work: it must not wipe out the cell's own
 * free/busy background, and the number it is attached to must stay legible.
 */
describe('today', () => {
  test('lays its wash OVER the cell background instead of replacing it', () => {
    // The base carries "is this day free"; a marker that overwrote it would make today the one
    // cell that contradicts the reading the whole grid exists for.
    expect(todayCellStyle('#F1F5F9').background).toContain('#F1F5F9');
    expect(todayCellStyle('#FFFFFF').background).toContain('#FFFFFF');
  });

  test('fades out before the meeting chips, so it never competes with the half colours', () => {
    // The last stop is well short of the bottom of the cell.
    expect(todayCellStyle('#FFFFFF').background).toMatch(/78%\)/);
  });

  test('ends on transparent GREEN, never the `transparent` keyword', () => {
    // `transparent` is transparent BLACK, and interpolating toward it greys out the middle of
    // the gradient — the classic washed-out-in-Safari bug.
    const bg = todayCellStyle('#FFFFFF').background;
    expect(bg).toContain('rgba(22,163,74,0)');
    expect(bg).not.toContain('transparent');
  });

  test('keeps a hairline, not a second 2px ring to confuse with the picked day', () => {
    expect(todayCellStyle('#FFFFFF').boxShadow).toContain('inset 0 0 0 1px');
  });

  test('the date numeral stays legible on both backgrounds a cell can have', () => {
    // The raw green is 3.3:1 on white — under AA at 12px. `todayInk` is what fixes that, and
    // this is the assertion that stops somebody "simplifying" it back to the brand green.
    for (const bg of ['#FFFFFF', '#F1F5F9']) {
      expect(contrastRatio(todayInk, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
