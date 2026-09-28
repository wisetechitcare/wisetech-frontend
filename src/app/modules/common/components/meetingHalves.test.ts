import { describe, test, expect } from 'vitest';
import { splitHalves } from './MeetingsList';

/**
 * A meeting belongs to ONE half of the day: the one it starts in.
 *
 * The regression these pin: the split used to count a meeting against every half it
 * OVERLAPPED, so 11:00–12:10 appeared in the morning panel AND the afternoon panel. The same
 * row twice is not a warning that the afternoon is encroached on — it is a row somebody has to
 * work out is the same row, and a day with one meeting reporting two.
 */

/** Minimal rows: the split reads `startDate` and nothing else. */
const at = (start: string, end: string) => ({ startDate: start, endDate: end });

describe('splitHalves', () => {
  test('a meeting that runs past noon stays in the MORNING', () => {
    const { am, pm } = splitHalves([at('2026-09-23T11:00', '2026-09-23T12:10')]);
    expect(am).toHaveLength(1);
    expect(pm).toHaveLength(0);
  });

  test('the end time does not move a meeting, however far it runs', () => {
    // 09:00 to 18:00 is still a meeting you get to at nine.
    const { am, pm } = splitHalves([at('2026-09-23T09:00', '2026-09-23T18:00')]);
    expect(am).toHaveLength(1);
    expect(pm).toHaveLength(0);
  });

  test('noon itself is the AFTERNOON — the boundary belongs to the half it opens', () => {
    const { am, pm } = splitHalves([at('2026-09-23T12:00', '2026-09-23T12:30')]);
    expect(am).toHaveLength(0);
    expect(pm).toHaveLength(1);
  });

  test('11:59 is the morning', () => {
    const { am, pm } = splitHalves([at('2026-09-23T11:59', '2026-09-23T13:00')]);
    expect(am).toHaveLength(1);
    expect(pm).toHaveLength(0);
  });

  test('every meeting lands in exactly one half, and none is lost', () => {
    const list = [
      at('2026-09-23T08:30', '2026-09-23T09:00'),
      at('2026-09-23T11:00', '2026-09-23T12:10'),
      at('2026-09-23T12:00', '2026-09-23T12:30'),
      at('2026-09-23T16:00', '2026-09-23T17:00'),
    ];
    const { am, pm } = splitHalves(list);
    expect(am.length + pm.length).toBe(list.length);
    expect([...am, ...pm].map((m) => m.startDate).sort())
      .toEqual(list.map((m) => m.startDate).sort());
  });

  test('an empty day is two empty halves, not a crash', () => {
    expect(splitHalves([])).toEqual({ am: [], pm: [] });
  });
});
