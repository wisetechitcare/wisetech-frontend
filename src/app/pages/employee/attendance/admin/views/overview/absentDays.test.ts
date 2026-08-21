import { describe, test, expect } from 'vitest';
import dayjs from 'dayjs';
import { computeAbsentEntries, computeLeaveDaysByDate } from './absentDays';

/**
 * The three defects this function was extracted to make testable. Each test below fails
 * against the version that shipped before: future days counted, holidays and off-Saturdays
 * counted, and nothing stopping either.
 *
 * August 2026: the 8th and 29th are the alternate off-Saturdays, the 15th is Independence
 * Day, Sundays are the weekly off. Today is the 17th (a Monday).
 */

const TODAY = dayjs('2026-08-17');

const ROSTER = [{ _id: 'e1', name: 'Aabid' }, { _id: 'e2', name: 'Kaif' }];

const OFF_DATES = new Set(['2026-08-08', '2026-08-29', '2026-08-15']);
const isNonWorking = (d: Date) => {
    const day = dayjs(d);
    return day.day() === 0 || OFF_DATES.has(day.format('YYYY-MM-DD'));
};

const run = (
    start: string,
    end: string,
    present: Record<string, string[]> = {},
    leave: Record<string, string[]> = {},
    today = TODAY,
) =>
    computeAbsentEntries({
        start: dayjs(start),
        end: dayjs(end),
        today,
        isNonWorking,
        presentByDay: new Map(Object.entries(present).map(([k, v]) => [k, new Set(v)])),
        leaveByDay: new Map(
            Object.entries(leave).map(([k, v]) => [k, new Map(v.map((id) => [id, {}]))]),
        ),
        roster: ROSTER,
    });

const datesFor = (id: string, entries: ReturnType<typeof run>) =>
    entries.filter((e) => e._id === id).map((e) => e._absentDate.format('YYYY-MM-DD'));

describe('computeAbsentEntries — future days', () => {
    test('a range ending after today stops at today', () => {
        // 17 Aug is a Monday; 18-31 have not happened.
        const dates = datesFor('e1', run('2026-08-17', '2026-08-31'));
        expect(dates).toEqual(['2026-08-17']);
    });

    test('a range entirely in the future yields nothing', () => {
        expect(run('2026-09-01', '2026-09-30')).toHaveLength(0);
    });

    test('today itself still counts — it has happened', () => {
        expect(datesFor('e1', run('2026-08-17', '2026-08-17'))).toEqual(['2026-08-17']);
    });
});

describe('computeAbsentEntries — non-working days', () => {
    test('skips the alternate off-Saturday, the case that reported 32 absences', () => {
        expect(datesFor('e1', run('2026-08-08', '2026-08-08'))).toEqual([]);
    });

    test('skips a public holiday', () => {
        expect(datesFor('e1', run('2026-08-15', '2026-08-15'))).toEqual([]);
    });

    test('skips the weekly off but keeps a WORKING Saturday', () => {
        // 22 Aug is a Saturday that is NOT one of the two off-Saturdays, so it counts.
        expect(datesFor('e1', run('2026-08-16', '2026-08-16'))).toEqual([]); // Sunday
        expect(datesFor('e1', run('2026-08-22', '2026-08-22', {}, {}, dayjs('2026-08-31'))))
            .toEqual(['2026-08-22']);
    });
});

describe('computeAbsentEntries — present and on leave', () => {
    test('someone with attendance is not absent', () => {
        const dates = datesFor('e1', run('2026-08-17', '2026-08-17', { '2026-08-17': ['e1'] }));
        expect(dates).toEqual([]);
    });

    test('someone on approved leave is not absent', () => {
        const dates = datesFor('e1', run('2026-08-17', '2026-08-17', {}, { '2026-08-17': ['e1'] }));
        expect(dates).toEqual([]);
    });

    test('one present does not excuse the other', () => {
        const entries = run('2026-08-17', '2026-08-17', { '2026-08-17': ['e1'] });
        expect(entries.map((e) => e._id)).toEqual(['e2']);
    });
});

describe('computeAbsentEntries — edges', () => {
    test('an end before the start yields nothing rather than looping', () => {
        expect(run('2026-08-17', '2026-08-10')).toHaveLength(0);
    });

    test('a roster entry with no id is skipped, not counted as a phantom absence', () => {
        const entries = computeAbsentEntries({
            start: dayjs('2026-08-17'),
            end: dayjs('2026-08-17'),
            today: TODAY,
            isNonWorking,
            presentByDay: new Map(),
            leaveByDay: new Map(),
            roster: [{ _id: undefined }, { _id: 'e1' }],
        });
        expect(entries).toHaveLength(1);
    });

    test('the roster is taken as given — it does not re-filter who counts', () => {
        // Employment scoping happens at the fetch. If this function also filtered, the two
        // rules could disagree and the card would stop matching its own modal.
        const entries = computeAbsentEntries({
            start: dayjs('2026-08-17'),
            end: dayjs('2026-08-17'),
            today: TODAY,
            isNonWorking,
            presentByDay: new Map(),
            leaveByDay: new Map(),
            roster: [{ _id: 'gone', isActive: false }],
        });
        expect(entries).toHaveLength(1);
    });
});

describe('computeLeaveDaysByDate', () => {
    const leave = (employeeId: string, dateFrom: string, dateTo: string) =>
        ({ employeeId, dateFrom, dateTo });

    const runLeave = (start: string, end: string, leaves: ReturnType<typeof leave>[]) =>
        computeLeaveDaysByDate({
            start: dayjs(start), end: dayjs(end), isNonWorking, leaves,
        });

    const daysFor = (m: ReturnType<typeof runLeave>, id: string) =>
        [...m.entries()].filter(([, v]) => v.has(id)).map(([k]) => k).sort();

    test('SKIPS a public holiday inside the leave span — the bug this fixes', () => {
        // 15 Aug is Independence Day. A leave spanning it must not report that day as
        // on-leave, because the absent walk already treats it as a non-working day.
        const days = daysFor(runLeave('2026-08-13', '2026-08-18', [leave('e1', '2026-08-13', '2026-08-18')]), 'e1');
        expect(days).not.toContain('2026-08-15');
        expect(days).toContain('2026-08-13');
    });

    test('skips the alternate off-Saturday too', () => {
        const days = daysFor(runLeave('2026-08-06', '2026-08-10', [leave('e1', '2026-08-06', '2026-08-10')]), 'e1');
        expect(days).not.toContain('2026-08-08');
    });

    test('skips the weekly off', () => {
        expect(daysFor(runLeave('2026-08-16', '2026-08-16', [leave('e1', '2026-08-16', '2026-08-16')]), 'e1'))
            .toEqual([]);
    });

    test('clips a leave that starts before or ends after the window', () => {
        const days = daysFor(runLeave('2026-08-17', '2026-08-19', [leave('e1', '2026-01-01', '2026-12-31')]), 'e1');
        expect(days).toEqual(['2026-08-17', '2026-08-18', '2026-08-19']);
    });

    test('counts a person once when two approved leaves overlap the same day', () => {
        const m = runLeave('2026-08-17', '2026-08-17', [
            leave('e1', '2026-08-17', '2026-08-17'),
            leave('e1', '2026-08-17', '2026-08-18'),
        ]);
        expect(m.get('2026-08-17')!.size).toBe(1);
    });

    test('ignores a record with no employee or an unparseable date', () => {
        const m = computeLeaveDaysByDate({
            start: dayjs('2026-08-17'), end: dayjs('2026-08-17'), isNonWorking,
            leaves: [
                { employeeId: '', dateFrom: '2026-08-17', dateTo: '2026-08-17' },
                { employeeId: 'e1', dateFrom: 'nonsense', dateTo: 'nonsense' },
            ],
        });
        expect(m.size).toBe(0);
    });
});
