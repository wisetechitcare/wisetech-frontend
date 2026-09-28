import { describe, it, expect } from 'vitest';
import { markWeekendOrHolidayDays } from './weekendHoliday';

/**
 * Reproduces the reported bug with the real September 2026 shape.
 *
 * MEP Jogeshwari works Saturdays (`saturday: "1"`) and takes Sunday off. The only
 * working-day holiday in the month is 14 Sept, Ganesh Chaturthi. 12 Sept shows as
 * a weekend solely because of an alternate-weekend row.
 *
 * The defect: the holiday lookup ran `new Date("15 Sept 2026")` — local midnight —
 * and read it back with `dayjs.utc()`, landing on 2026-09-14 in IST. So the 15th
 * matched the 14th's holiday and the 14th matched nothing. The alternate-weekend
 * branch beside it compared local-to-local, so the shifts cancelled and weekends
 * stayed correct — which is exactly why only holidays were visibly wrong.
 */

const WORKING_DAYS = {
    monday: '1', tuesday: '1', wednesday: '1', thursday: '1',
    friday: '1', saturday: '1', sunday: '0',
};

/** Stored as UTC midnight, per the holiday storage contract. */
const HOLIDAYS = [
    { date: '2026-09-12T00:00:00.000Z', isWeekend: true, name: 'Saturday' },
    { date: '2026-09-14T00:00:00.000Z', isWeekend: false, name: 'H-Ganesh Chaturthi' },
];

const row = (date: string, day: string, status = 'Pending') => ({ date, day, status });

const mark = (rows: ReturnType<typeof row>[]) =>
    markWeekendOrHolidayDays(rows, WORKING_DAYS, HOLIDAYS);

describe('markWeekendOrHolidayDays — the holiday lands on its own day', () => {
    it('marks 14 Sept as the holiday it actually is', () => {
        const [d] = mark([row('14 Sept 2026', 'Monday')]);
        expect(d.isWeekendOrHoliday).toBe(true);
        expect(d.status).toBe('Holiday');
    });

    /** THE BUG: the 15th was borrowing the 14th's holiday. */
    it('leaves 15 Sept alone and does not overwrite its real status', () => {
        const [d] = mark([row('15 Sept 2026', 'Tuesday', 'Pending')]);
        expect(d.isWeekendOrHoliday).toBe(false);
        expect(d.status).toBe('Pending');
    });

    it('reads DD/MM/YYYY rows identically', () => {
        const [a] = markWeekendOrHolidayDays([{ date: '14/09/2026', day: 'Monday', status: 'x' }], WORKING_DAYS, HOLIDAYS);
        const [b] = markWeekendOrHolidayDays([{ date: '15/09/2026', day: 'Tuesday', status: 'x' }], WORKING_DAYS, HOLIDAYS);
        expect(a.status).toBe('Holiday');
        expect(b.status).toBe('x');
    });
});

describe('markWeekendOrHolidayDays — weekends, which were already right', () => {
    it('marks a configured weekly off by weekday name', () => {
        const [d] = mark([row('13 Sept 2026', 'Sunday')]);
        expect(d.isWeekendOrHoliday).toBe(true);
    });

    /** An alternate weekend is a date, not a weekday — 12 Sept is a WORKING Saturday here. */
    it('marks an alternate weekend on its own date only', () => {
        const [twelfth] = mark([row('12 Sept 2026', 'Saturday')]);
        const [nineteenth] = mark([row('19 Sept 2026', 'Saturday')]);
        expect(twelfth.isWeekendOrHoliday).toBe(true);
        expect(nineteenth.isWeekendOrHoliday).toBe(false);
    });

    /**
     * A weekend is a weekend, but it is not a "Holiday" — overwriting the status
     * would hide whether the employee actually worked it.
     */
    it('does not relabel a weekend row as Holiday', () => {
        const [d] = mark([row('13 Sept 2026', 'Sunday', 'Present')]);
        expect(d.status).toBe('Present');
    });
});

describe('markWeekendOrHolidayDays — defensive edges', () => {
    it('survives a null holiday list and null branch config', () => {
        const [d] = markWeekendOrHolidayDays([row('15 Sept 2026', 'Tuesday')], null, null as never);
        expect(d.isWeekendOrHoliday).toBe(false);
    });

    /**
     * `workingAndOffDays` arrives as the literal string "null" from at least one
     * branch record; parseWorkingDays exists precisely because JSON.parse crashes
     * on it.
     */
    it('survives the literal string "null" as branch config', () => {
        const [d] = markWeekendOrHolidayDays([row('15 Sept 2026', 'Tuesday')], 'null', HOLIDAYS);
        expect(d.isWeekendOrHoliday).toBe(false);
    });

    it('leaves a row with an unreadable date untouched rather than guessing', () => {
        const [d] = markWeekendOrHolidayDays([{ date: 'not a date', day: '', status: 'Present' }], WORKING_DAYS, HOLIDAYS);
        expect(d.isWeekendOrHoliday).toBe(false);
        expect(d.status).toBe('Present');
    });

    it('does not mutate the rows it was given', () => {
        const rows = [row('14 Sept 2026', 'Monday', 'Pending')];
        markWeekendOrHolidayDays(rows, WORKING_DAYS, HOLIDAYS);
        expect(rows[0].status).toBe('Pending');
    });
});
