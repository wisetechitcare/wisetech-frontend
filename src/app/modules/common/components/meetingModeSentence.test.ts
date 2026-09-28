import { describe, test, expect } from 'vitest';
import { modeSentence } from './MeetingsList';

/**
 * The one-line breakdown under the meeting stat cards.
 *
 * It was a two-branch ternary over an online/in-person pair, which could not phrase a third
 * mode — so a month with two hybrids read "All 5 were held online". These pin the grammar as
 * well as the counting: a comma list, an "and" before the last part, and no zeroes announced.
 */
describe('modeSentence', () => {
  test('names all three when all three happened', () => {
    expect(modeSentence({ onlineCount: 8, inPersonCount: 3, hybridCount: 1 }))
      .toBe('Of these, 8 online, 3 in person and 1 as a hybrid.');
  });

  test('a mode that did not happen is not announced as a zero', () => {
    expect(modeSentence({ onlineCount: 4, inPersonCount: 2, hybridCount: 0 }))
      .toBe('Of these, 4 online and 2 in person.');
  });

  test('one mode covers the lot — no breakdown of a total by itself', () => {
    expect(modeSentence({ onlineCount: 12, inPersonCount: 0 }))
      .toBe('All of these were held online.');
    expect(modeSentence({ onlineCount: 0, inPersonCount: 5 }))
      .toBe('All of these were held in person.');
    expect(modeSentence({ onlineCount: 0, inPersonCount: 0, hybridCount: 3 }))
      .toBe('All of these were held as a hybrid.');
  });

  test('an older server sends no hybrid count, and the sentence still reads', () => {
    expect(modeSentence({ onlineCount: 2, inPersonCount: 1 }))
      .toBe('Of these, 2 online and 1 in person.');
  });

  test('no meetings, no sentence — not "All of these were held undefined"', () => {
    expect(modeSentence({ onlineCount: 0, inPersonCount: 0, hybridCount: 0 })).toBe('');
  });
});
