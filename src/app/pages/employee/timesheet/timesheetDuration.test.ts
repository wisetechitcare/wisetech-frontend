import { describe, test, expect } from 'vitest';
import {
    entrySeconds, entryHours, durationConflict, formatSpan, formatSpanExact, totalSpan, logSubject,
    describeSplit, billingMultiplierOf,
} from './timesheetDuration';

/** The entry from the bug report: a 2h log inside a 6:37–7:37 PM window. */
const twoHoursInAnHourWindow = {
    logTimeHours: 2, logTimeMinutes: 0, logTimeSeconds: 0,
    startTime: '2026-09-02T18:37:00.000Z',
    endTime: '2026-09-02T19:37:00.000Z',
};

describe('entrySeconds — the logged figure wins', () => {
    test('reads the logged figure, not the clock window', () => {
        // The table used to answer 3600 here while the invoice answered 7200.
        expect(entrySeconds(twoHoursInAnHourWindow)).toBe(7200);
        expect(entryHours(twoHoursInAnHourWindow)).toBe(2);
    });

    test('falls back to the window when nothing was logged', () => {
        expect(entrySeconds({
            logTimeHours: 0, logTimeMinutes: 0, logTimeSeconds: 0,
            startTime: '2026-09-02T18:00:00.000Z', endTime: '2026-09-02T19:30:00.000Z',
        })).toBe(5400);
    });

    test('a partial log is still a log — minutes alone do not fall through to the window', () => {
        expect(entrySeconds({
            logTimeMinutes: 20,
            startTime: '2026-09-02T18:00:00.000Z', endTime: '2026-09-02T19:00:00.000Z',
        })).toBe(1200);
    });

    test('an inverted or missing window is zero, never negative', () => {
        expect(entrySeconds({ startTime: '2026-09-02T19:00:00.000Z', endTime: '2026-09-02T18:00:00.000Z' })).toBe(0);
        expect(entrySeconds({})).toBe(0);
    });
});

describe('durationConflict', () => {
    test('reports the two figures when they disagree', () => {
        expect(durationConflict(twoHoursInAnHourWindow)).toEqual({ logged: 7200, window: 3600 });
    });

    test('stays quiet when they agree, and when either is missing', () => {
        expect(durationConflict({
            logTimeHours: 1,
            startTime: '2026-09-02T18:00:00.000Z', endTime: '2026-09-02T19:00:00.000Z',
        })).toBeNull();
        expect(durationConflict({ logTimeHours: 1 })).toBeNull();
        expect(durationConflict({ startTime: '2026-09-02T18:00:00.000Z', endTime: '2026-09-02T19:00:00.000Z' })).toBeNull();
    });

    test('tolerates a minute of rounding', () => {
        expect(durationConflict({
            logTimeHours: 1,
            startTime: '2026-09-02T18:00:00.000Z', endTime: '2026-09-02T19:00:30.000Z',
        })).toBeNull();
    });
});

describe('formatting', () => {
    test('drops the hour when there is none, and drops seconds from the short form', () => {
        expect(formatSpan(2700)).toBe('45m');
        expect(formatSpan(7200)).toBe('2h 0m');
        expect(formatSpan(0)).toBe('0m');
        expect(formatSpanExact(7215)).toBe('2h 0m 15s');
    });

    test('totals every entry by the same rule the rows use', () => {
        // 2h logged (window says 1h) + 1h30 from a window with nothing logged.
        expect(totalSpan([
            twoHoursInAnHourWindow,
            { startTime: '2026-09-02T09:00:00.000Z', endTime: '2026-09-02T10:30:00.000Z' },
        ])).toBe('3h 30m');
    });

    test('a non-array is not a crash', () => {
        expect(totalSpan(undefined as any)).toBe('0m');
    });
});

describe('logSubject', () => {
    test('names a meeting, a task, or the project work it actually was', () => {
        expect(logSubject({ meeting: { title: 'Design review' } })).toEqual({ kind: 'meeting', name: 'Design review' });
        expect(logSubject({ task: { taskName: 'Fix the pump' } })).toEqual({ kind: 'task', name: 'Fix the pump' });
        expect(logSubject({})).toEqual({ kind: 'none', name: 'Project work' });
    });

    test('an id with no title still reads as what it is, never as a blank', () => {
        expect(logSubject({ meetingId: 'm1' })).toEqual({ kind: 'meeting', name: 'Meeting' });
        expect(logSubject({ taskId: 't1' })).toEqual({ kind: 'task', name: 'Task' });
    });

    test('a meeting outranks a stale task reference on the same row', () => {
        expect(logSubject({ meeting: { title: 'Standup' }, task: { taskName: 'Fix the pump' } }).kind).toBe('meeting');
    });
});

describe('describeSplit', () => {
    test('names only the kinds that actually appear', () => {
        expect(describeSplit([
            { meeting: { title: 'Standup' }, logTimeHours: 2 },
            { task: { taskName: 'Fix the pump' }, logTimeMinutes: 90 },
        ])).toBe('2h 0m in meetings · 1h 30m on tasks');
    });

    test('is empty when there is nothing to describe', () => {
        expect(describeSplit([])).toBe('');
    });
});

describe('billingMultiplierOf', () => {
    test("uses the project's own multiplier when it has one", () => {
        expect(billingMultiplierOf({ project: { billingRateMultiplier: 2 } }, 1.5)).toBe(2);
    });

    test('falls back to the company default when the project has none', () => {
        expect(billingMultiplierOf({ project: { billingRateMultiplier: null } }, 1.5)).toBe(1.5);
        expect(billingMultiplierOf({ project: {} }, 1.5)).toBe(1.5);
        expect(billingMultiplierOf({}, 1.5)).toBe(1.5);
    });

    test('an explicit 1x is a choice, not an absence — the default must not override it', () => {
        expect(billingMultiplierOf({ project: { billingRateMultiplier: 1 } }, 3)).toBe(1);
    });

    test('reads the un-aliased row too, since both shapes reach the tables', () => {
        expect(billingMultiplierOf({ lead: { billingRateMultiplier: 2.5 } }, 1)).toBe(2.5);
    });

    test('never bills zero or a refund', () => {
        expect(billingMultiplierOf({ project: { billingRateMultiplier: 0 } }, 2)).toBe(2);
        expect(billingMultiplierOf({ project: { billingRateMultiplier: -3 } }, 2)).toBe(2);
        expect(billingMultiplierOf({ project: { billingRateMultiplier: 'abc' } }, 2)).toBe(2);
        // ...and a nonsense default is not a licence to bill zero either.
        expect(billingMultiplierOf({}, 0)).toBe(1);
    });

    test('the worked example: 1h at 83.33 with 2x bills 166.66', () => {
        const rate = 83.3333;
        const hours = entrySeconds({ logTimeHours: 1 }) / 3600;
        const cost = hours * rate * billingMultiplierOf({ project: { billingRateMultiplier: 2 } }, 1);
        expect(cost).toBeCloseTo(166.6666, 3);
    });
});
