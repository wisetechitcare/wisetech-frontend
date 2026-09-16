import { describe, it, expect } from 'vitest';
import { toCalendarKey } from './calendarKey';

/**
 * A business day is a CALENDAR DATE, not an instant, and the moment one is routed
 * through `new Date()` it acquires a timezone it never had.
 *
 * That is the whole of the "15 Sept shows Holiday" bug. `markWeekendOrHoliday` did:
 *
 *     const entryDate  = new Date(entry.date);              // "15 Sept 2026"
 *     const formatted  = dayjs.utc(entryDate).format(...);  // read back as UTC
 *
 * In IST, `new Date("15 Sept 2026")` is local midnight — 2026-09-14T18:30:00Z —
 * so reading it back as UTC yields "2026-09-14". Every row's holiday lookup was
 * one day early, which put 14 Sept's Ganesh Chaturthi on the 15 Sept row AND
 * stripped the holiday off the day that genuinely had one.
 *
 * These cases are pinned in IST because that is where the product runs and where
 * the bug bites; the implementation never parses, so it holds in any timezone.
 */

describe('toCalendarKey — calendar dates never become instants', () => {
    it('reads the display format the attendance tables carry', () => {
        expect(toCalendarKey('15 Sept 2026')).toBe('2026-09-15');
        expect(toCalendarKey('15 Sep 2026')).toBe('2026-09-15');
        expect(toCalendarKey('01 Jan 2026')).toBe('2026-01-01');
    });

    it('reads the DD/MM/YYYY form the same rows also carry', () => {
        expect(toCalendarKey('15/09/2026')).toBe('2026-09-15');
        expect(toCalendarKey('1/9/2026')).toBe('2026-09-01');
    });

    it('passes an ISO date straight through', () => {
        expect(toCalendarKey('2026-09-15')).toBe('2026-09-15');
    });

    /** Holiday rows arrive as UTC-midnight instants — the storage contract. */
    it('takes the UTC calendar day from a stored holiday instant', () => {
        expect(toCalendarKey('2026-09-14T00:00:00.000Z')).toBe('2026-09-14');
        expect(toCalendarKey(new Date('2026-09-14T00:00:00.000Z'))).toBe('2026-09-14');
    });

    /**
     * THE REGRESSION. Both sides of the comparison must land on their own day —
     * if the row shifted and the holiday did not, they meet on the wrong date.
     */
    it('does not shift a day when the runtime timezone is east of UTC', () => {
        expect(toCalendarKey('15 Sept 2026')).not.toBe('2026-09-14');
        expect(toCalendarKey('14 Sept 2026')).toBe(toCalendarKey('2026-09-14T00:00:00.000Z'));
    });

    it('returns null for something it cannot read, rather than guessing', () => {
        expect(toCalendarKey('')).toBeNull();
        expect(toCalendarKey(null)).toBeNull();
        expect(toCalendarKey(undefined)).toBeNull();
        expect(toCalendarKey('not a date')).toBeNull();
        expect(toCalendarKey('15 Smarch 2026')).toBeNull();
    });
});
