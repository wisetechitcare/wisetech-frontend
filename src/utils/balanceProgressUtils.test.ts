import { describe, test, expect } from 'vitest';
import {
    accrualWindowAsOf,
    accruedTillNow,
    fiscalMonthOfDay,
    fiscalStartYearOfDay,
    unlockedTillNow,
    ServerAccrualWindow,
} from './balanceProgressUtils';

/**
 * The Apply-Leave preview's half of the cumulative pacing contract.
 *
 * These lock the two properties that make preview == enforcement:
 *   1. the window's MONTH SET is whatever the server said (never re-derived here); and
 *   2. an absent or mismatched window paces a full Apr–Mar — never zero, which is what
 *      silently converted a re-hired employee's paid leave into unpaid LOP.
 *
 * accruedTillNow itself is the exact mirror of wisetech-backend/src/utils/leaveAccrual.ts;
 * the cases below are the same ones its test file asserts.
 */

const FY = 2026; // 2026-27
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const serverWindow = (months: number[], fiscalStartYear = FY): ServerAccrualWindow => ({
    fiscalYear: `${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`,
    fiscalStartYear,
    months,
    eligibleMonths: months.length,
    elapsedMonths: months.length,
});

/** The formula this engine replaced, kept as the "never looser than before" oracle. */
const legacyAllowed = (total: number, fiscalMonthIndex: number) => Math.floor((total / 12) * fiscalMonthIndex);
/** Last day of a fiscal month, for walking the year. */
const lastDayOfFiscalMonth = (m: number) => {
    const calMonth = m <= 9 ? m + 3 : m - 9;
    const year = m <= 9 ? FY : FY + 1;
    const last = new Date(Date.UTC(year, calMonth, 0)).getUTCDate();
    return `${year}-${String(calMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

describe('fiscalMonthOfDay / fiscalStartYearOfDay', () => {
    test('April starts the fiscal year and Jan–Mar belong to the one that began last April', () => {
        expect(fiscalMonthOfDay('2026-04-01')).toBe(1);
        expect(fiscalMonthOfDay('2026-08-26')).toBe(5);
        expect(fiscalMonthOfDay('2027-03-31')).toBe(12);
        expect(fiscalStartYearOfDay('2026-08-26')).toBe(2026);
        expect(fiscalStartYearOfDay('2027-02-10')).toBe(2026);
        expect(fiscalStartYearOfDay('2027-04-01')).toBe(2027);
    });
});

describe('accrualWindowAsOf', () => {
    test('THE REGRESSION: a re-joined employee is paced across the full year the server resolved', () => {
        // Server saw the open rejoin stint and returned all 12 months. The browser must not
        // second-guess it from dateOfJoining/dateOfExit — their primary exit is an OLD stint's end.
        const window = accrualWindowAsOf(serverWindow(ALL_MONTHS), FY, '2026-08-26');
        expect(window).toEqual({ eligibleMonths: 12, elapsedMonths: 5, fiscalMonthIndex: 5 });
        // 20 allocated → 8 allowed: exactly what the balance card shows. No spill to unpaid.
        expect(unlockedTillNow(20, window)).toBe(8);
    });

    test('paces a mid-year joiner across their own months', () => {
        const window = accrualWindowAsOf(serverWindow([7, 8, 9, 10, 11, 12]), FY, '2026-12-10');
        expect(window).toEqual({ eligibleMonths: 6, elapsedMonths: 3, fiscalMonthIndex: 9 });
        expect(unlockedTillNow(20, window)).toBe(10); // own pace binds, well under the calendar's 15
    });

    test('skips a gap the employee was not employed for', () => {
        const gapped = serverWindow([1, 2, 3, 7, 8, 9, 10, 11, 12]); // out Jul–Sep
        expect(accrualWindowAsOf(gapped, FY, '2026-06-30').elapsedMonths).toBe(3);
        expect(accrualWindowAsOf(gapped, FY, '2026-09-15').elapsedMonths).toBe(3);
        expect(accrualWindowAsOf(gapped, FY, '2026-10-01').elapsedMonths).toBe(4);
    });

    test('unlocks more for a later requested date', () => {
        const w = serverWindow(ALL_MONTHS);
        expect(accrualWindowAsOf(w, FY, '2027-01-15').elapsedMonths).toBeGreaterThan(
            accrualWindowAsOf(w, FY, '2026-08-26').elapsedMonths,
        );
    });

    test('clamps outside the fiscal year instead of going negative or past the end', () => {
        const w = serverWindow(ALL_MONTHS);
        expect(accrualWindowAsOf(w, FY, '2026-03-31').elapsedMonths).toBe(0);
        expect(accrualWindowAsOf(w, FY, '2027-04-01').elapsedMonths).toBe(12);
    });

    test('NEVER returns a zero window — an unknown one paces a full Apr–Mar', () => {
        const fullYear = { eligibleMonths: 12, elapsedMonths: 5, fiscalMonthIndex: 5 };
        // No window at all (older backend).
        expect(accrualWindowAsOf(null, FY, '2026-08-26')).toEqual(fullYear);
        expect(accrualWindowAsOf(undefined, FY, '2026-08-26')).toEqual(fullYear);
        // A window for a DIFFERENT fiscal year than the date being asked about.
        expect(accrualWindowAsOf(serverWindow(ALL_MONTHS, 2025), FY, '2026-08-26')).toEqual(fullYear);
        // A malformed/empty month set.
        expect(accrualWindowAsOf({ fiscalStartYear: FY, months: [], eligibleMonths: 0, elapsedMonths: 0 }, FY, '2026-08-26'))
            .toEqual(fullYear);
        expect(accrualWindowAsOf({ fiscalStartYear: FY } as ServerAccrualWindow, FY, '2026-08-26')).toEqual(fullYear);
    });

    test('accepts a Date as readily as an ISO day', () => {
        expect(accrualWindowAsOf(serverWindow(ALL_MONTHS), FY, new Date('2026-08-26T00:00:00'))).toEqual(
            accrualWindowAsOf(serverWindow(ALL_MONTHS), FY, '2026-08-26'),
        );
    });
});

describe('unlockedTillNow — paced across the SAME window the entitlement was cut to', () => {
    test('is the retired formula for a full-year employee', () => {
        for (let m = 1; m <= 12; m++) {
            const window = accrualWindowAsOf(serverWindow(ALL_MONTHS), FY, lastDayOfFiscalMonth(m));
            expect(unlockedTillNow(20, window)).toBe(legacyAllowed(20, m));
        }
    });

    test('does NOT pro-rate a second time — the entitlement already carries the window', () => {
        // July joiner: the server sends 15 (of an annual 20) and a 9-month window.
        const joiner = serverWindow([4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(unlockedTillNow(15, accrualWindowAsOf(joiner, FY, '2026-10-31'))).toBe(6); // 15 x 4/9
        expect(unlockedTillNow(15, accrualWindowAsOf(joiner, FY, '2027-03-31'))).toBe(15);
    });

    test('never exceeds the exact share of the annual figure the year has handed out', () => {
        const shapes: Array<[number[], number]> = [
            [ALL_MONTHS, 20],
            [[4, 5, 6, 7, 8, 9, 10, 11, 12], 15], // joined July
            [[7, 8, 9, 10, 11, 12], 10], // joined October
            [[1, 2, 3, 4, 5, 6], 10], // leaving in September
            [[1], 1], // employed only in April
            [[1, 2, 3, 7, 8, 9, 10, 11, 12], 15], // out Jul-Sep
        ];
        for (const [months, entitlement] of shapes) {
            for (let m = 1; m <= 12; m++) {
                const window = accrualWindowAsOf(serverWindow(months), FY, lastDayOfFiscalMonth(m));
                expect(unlockedTillNow(entitlement, window)).toBeLessThanOrEqual((20 * m) / 12 + 1e-9);
            }
        }
    });

    test('skips gap months rather than crediting them', () => {
        const gapped = serverWindow([1, 2, 3, 7, 8, 9, 10, 11, 12]);
        expect(unlockedTillNow(15, accrualWindowAsOf(gapped, FY, '2026-09-30'))).toBe(
            unlockedTillNow(15, accrualWindowAsOf(gapped, FY, '2026-06-30')),
        );
    });
});

describe('accruedTillNow (mirror of the backend engine)', () => {
    test('is the legacy floor(total/12 * month) for every full-year employee', () => {
        for (const total of [0, 1, 5, 12, 13, 20, 21, 30, 45]) {
            for (let m = 1; m <= 11; m++) {
                expect(accruedTillNow(total, m, 12)).toBe(Math.floor((total / 12) * m));
            }
        }
    });

    test('releases the entitlement exactly once fully elapsed', () => {
        expect(accruedTillNow(20, 12, 12)).toBe(20);
        expect(accruedTillNow(19.5, 12, 12)).toBe(19.5); // a half-day encashment leaves fractions
        expect(accruedTillNow(15, 11, 11)).toBe(15); // floor(15/11*11) === 14 in IEEE-754
    });

    test('paces a partial-year employee across their own window', () => {
        expect(accruedTillNow(20, 3, 6)).toBe(10);
        expect(accruedTillNow(20, 6, 6)).toBe(20);
    });

    test('returns 0 for degenerate inputs rather than NaN or a negative', () => {
        expect(accruedTillNow(0, 5, 12)).toBe(0);
        expect(accruedTillNow(20, 0, 12)).toBe(0);
        expect(accruedTillNow(20, 5, 0)).toBe(0);
        expect(accruedTillNow(Number.NaN, 5, 12)).toBe(0);
        expect(accruedTillNow(-5, 5, 12)).toBe(0);
    });
});
