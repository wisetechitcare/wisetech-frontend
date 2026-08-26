import { describe, test, expect } from 'vitest';
import { parseWorkingDays, isNonWorkingWeekday } from './workingDays';

/**
 * The branch shape this codebase actually stores: Saturday is a WORKING day. The two
 * off-Saturdays a month are separate per-date `PublicHolidays` rows, NOT part of the
 * weekly pattern — so anything deriving "weekend" from the weekday alone is wrong here.
 */
const WORKS_SATURDAYS = {
    monday: '1', tuesday: '1', wednesday: '1', thursday: '1',
    friday: '1', saturday: '1', sunday: '0',
};

// 2026-08-08 is the Saturday whose mislabelling started this whole audit.
const SATURDAY = new Date('2026-08-08T00:00:00');
const SUNDAY = new Date('2026-08-09T00:00:00');
const MONDAY = new Date('2026-08-10T00:00:00');

describe('isNonWorkingWeekday', () => {
    test('a branch that works Saturdays treats Saturday as a working day', () => {
        expect(isNonWorkingWeekday(SATURDAY, WORKS_SATURDAYS)).toBe(false);
        expect(isNonWorkingWeekday(SUNDAY, WORKS_SATURDAYS)).toBe(true);
        expect(isNonWorkingWeekday(MONDAY, WORKS_SATURDAYS)).toBe(false);
    });

    test('falls back to Sat+Sun only when the branch has no config', () => {
        expect(isNonWorkingWeekday(SATURDAY, null)).toBe(true);
        expect(isNonWorkingWeekday(SUNDAY, undefined)).toBe(true);
        expect(isNonWorkingWeekday(MONDAY, {})).toBe(false);
    });

    test('handles the JSON-string shape one branch is stored in', () => {
        // BranchesRepository writes this column with JSON.stringify, so some rows arrive
        // as a string rather than an object. Both must resolve identically.
        expect(isNonWorkingWeekday(SATURDAY, JSON.stringify(WORKS_SATURDAYS))).toBe(false);
        expect(isNonWorkingWeekday(SUNDAY, JSON.stringify(WORKS_SATURDAYS))).toBe(true);
    });

    test('the literal string "null" falls back instead of crashing', () => {
        expect(isNonWorkingWeekday(SATURDAY, 'null')).toBe(true);
        expect(parseWorkingDays('null')).toEqual({});
    });

    test('accepts an ISO string as well as a Date', () => {
        expect(isNonWorkingWeekday('2026-08-08T00:00:00', WORKS_SATURDAYS)).toBe(false);
    });
});
