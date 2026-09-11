import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { openingRange } from './meetingOpening';

/**
 * The day dialog's "book this half" hands the form a date, and the form has to KEEP it.
 *
 * This is the whole auto-fill: clicking a free afternoon on the 17th has to open a form
 * already holding the 17th at 14:00, not today. The fallback for a moment that has already
 * passed is tested alongside it, because those two rules share one branch and it would be easy
 * to fix the second by breaking the first.
 */
describe('openingRange', () => {
    it('keeps a picked future day and hour', () => {
        const picked = dayjs().add(8, 'day').startOf('day').hour(14);
        const { start, end } = openingRange({ startStr: picked.toISOString() });
        expect(dayjs(start).format('YYYY-MM-DD HH:mm')).toBe(picked.format('YYYY-MM-DD HH:mm'));
        // An hour long by default — the end is derived, not asked for.
        expect(dayjs(end).diff(dayjs(start), 'minute')).toBe(60);
    });

    it('will not open a meeting in the past', () => {
        const gone = dayjs().subtract(20, 'day').hour(9).toISOString();
        const { start } = openingRange({ startStr: gone });
        expect(dayjs(start).isAfter(dayjs())).toBe(true);
    });

    it('opens an hour out when no day was picked', () => {
        const { start } = openingRange(undefined);
        expect(dayjs(start).diff(dayjs(), 'minute')).toBeGreaterThan(50);
    });
});
