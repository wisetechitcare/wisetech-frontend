import { describe, test, expect } from 'vitest';
import dayjs from 'dayjs';
import { computeAbsentEntries } from './absentDays';

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
