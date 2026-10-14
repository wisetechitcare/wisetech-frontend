import { describe, test, expect } from 'vitest';
import { contrastRatio, MIN_CONTRAST, lightOf, todayCellStyle, todayInk, MEETING_TODAY_DEFAULT } from './MeetingsList';

/**
 * Today is marked with a WASH, not a ring.
 *
 * The grid already spends a 2px ring on the picked day and a 2px dashed one on a drop target;
 * today wearing a third made the three tellable apart only by remembering the key. These pin
 * the two things that make a quiet marker still work: the wash must be a visible fill, and the
 * number it is attached to must stay legible.
 */
describe('today', () => {
  test('fills the whole cell with an opaque pastel of the today colour', () => {
    expect(todayCellStyle('#FFFFFF').background).toBe(lightOf(MEETING_TODAY_DEFAULT, 0.82));
    expect(todayCellStyle('#F1F5F9').background).toBe(lightOf(MEETING_TODAY_DEFAULT, 0.82));
    expect(todayCellStyle('#FFFFFF').background).not.toMatch(/linear-gradient/);
  });

  test('keeps a visible inset edge without matching the picked-day 2px ring weight', () => {
    expect(todayCellStyle('#FFFFFF').boxShadow).toContain('inset 0 0 0 2px');
  });

  test('the date numeral stays legible on the today wash', () => {
    const wash = lightOf(MEETING_TODAY_DEFAULT, 0.82);
    expect(contrastRatio(todayInk, wash)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});
