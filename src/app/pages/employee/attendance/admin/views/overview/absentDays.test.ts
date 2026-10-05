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
// First arg (the employee, or employeeId for leaves) is ignored here: these cases model a
// single branch, so one calendar answers for everyone. The per-employee behaviour has its
// own describe block below.
const isNonWorking = (_who: unknown, d: Date) => {
    const day = dayjs(d);
    return day.day() === 0 || OFF_DATES.has(day.format('YYYY-MM-DD'));
};

const run = (
    start: string,
    end: string,
    present: Record<string, string[]> = {},
    leave: Record<string, string[]> = {},
    today = TODAY,
    // Last employed day per employee id. Default: employed throughout, which is
    // what every pre-existing case assumes.
    employedUntil: Record<string, string> = {},
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
        isEmployedOn: (e, d) => {
            const last = employedUntil[e._id];
            return !last || !d.isAfter(dayjs(last), 'day');
        },
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

describe('computeAbsentEntries — each employee uses their OWN branch calendar', () => {
    // The admin Overview bug: ONE calendar (the viewing admin's branch) was applied to
    // every employee. Here 12 Sep is an alternate off-Saturday for e1's branch but a
    // WORKING Saturday for e2's branch — each must be judged by their own.
    const PAST = dayjs('2026-09-30');
    const offByEmployee: Record<string, Set<string>> = {
        e1: new Set(['2026-09-12']), // e1's branch takes this Saturday off
        e2: new Set<string>(),       // e2's branch works every Saturday
    };
    const perEmployeeNonWorking = (emp: { _id?: string }, d: Date) => {
        const day = dayjs(d);
        if (day.day() === 0) return true; // Sunday is off for everyone
        return emp._id ? offByEmployee[emp._id]?.has(day.format('YYYY-MM-DD')) ?? false : false;
    };

    test('an off-Saturday for one branch is a working day for another', () => {
        const entries = computeAbsentEntries({
            start: dayjs('2026-09-12'),
            end: dayjs('2026-09-12'),
            today: PAST,
            isNonWorking: perEmployeeNonWorking,
            presentByDay: new Map(),
            leaveByDay: new Map(),
            roster: ROSTER,
            isEmployedOn: () => true,
        });
        const absentIds = entries.map((e) => e._id);
        expect(absentIds).toContain('e2');     // works Saturdays, no punch → absent
        expect(absentIds).not.toContain('e1'); // off that Saturday → never absent
    });

    test('daily: a present colleague on a working branch does not mask an off-branch employee', () => {
        // The old DAILY path sampled dayKind org-wide: e2 (works Saturdays) punching in made
        // the whole day "working", which dragged e1 (legitimately off) into absence. Judged
        // per-employee over a single day, neither is absent — this guards the daily reuse.
        const entries = computeAbsentEntries({
            start: dayjs('2026-09-12'),
            end: dayjs('2026-09-12'),
            today: PAST,
            isNonWorking: perEmployeeNonWorking,
            presentByDay: new Map([['2026-09-12', new Set(['e2'])]]),
            leaveByDay: new Map(),
            roster: ROSTER,
            isEmployedOn: () => true,
        });
        expect(entries.map((e) => e._id)).toEqual([]); // e1 off, e2 present → nobody absent
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
            isEmployedOn: () => true,
        });
        expect(entries).toHaveLength(1);
    });

    test('the roster is taken as given — it does not re-filter who counts', () => {
        // MEMBERSHIP scoping happens at the fetch, and the per-DAY question is answered by
        // the injected predicate. If this function also filtered membership, the two
        // rules could disagree and the card would stop matching its own modal.
        const entries = computeAbsentEntries({
            start: dayjs('2026-08-17'),
            end: dayjs('2026-08-17'),
            today: TODAY,
            isNonWorking,
            presentByDay: new Map(),
            leaveByDay: new Map(),
            roster: [{ _id: 'gone', isActive: false }],
            isEmployedOn: () => true,
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

/**
 * The fourth defect, found when the roster started being scoped to a PERIOD rather than
 * to today.
 *
 * Scoping the roster answers "does this person belong in August?" — a SET. Absence is a
 * per-DAY fact, and the two are not the same question. Someone who left on the 14th
 * belongs in August and is absent on none of the days after it; without the per-day
 * check they collected an absence for every remaining working day of the month.
 */
describe('computeAbsentEntries — employment window', () => {
    test('a leaver is not absent after their last day', () => {
        // e1 left on 12 Aug. 13 and 14 are working days; 15 is a holiday.
        const dates = datesFor('e1', run('2026-08-10', '2026-08-17', {}, {}, TODAY, { e1: '2026-08-12' }));
        expect(dates).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
    });

    test('their colleague is unaffected', () => {
        const dates = datesFor('e2', run('2026-08-10', '2026-08-17', {}, {}, TODAY, { e1: '2026-08-12' }));
        expect(dates).toEqual(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-17']);
    });

    test('an exit on a non-working day still ends the run at the last working day', () => {
        // 15 Aug is a holiday, so leaving that day means the 14th is the last one counted.
        const dates = datesFor('e1', run('2026-08-13', '2026-08-17', {}, {}, TODAY, { e1: '2026-08-15' }));
        expect(dates).toEqual(['2026-08-13', '2026-08-14']);
    });
});
