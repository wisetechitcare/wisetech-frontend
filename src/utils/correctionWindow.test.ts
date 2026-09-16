import { describe, it, expect } from 'vitest';
import {
    CORRECTION_WINDOW_MONTHS_KEY,
    DEFAULT_CORRECTION_WINDOW_MONTHS,
    canOfferCorrection,
    earliestCorrectableDate,
    parseCorrectionWindowMonths,
} from './correctionWindow';

/**
 * The CLIENT half of the correction policy — it decides what to OFFER, never what
 * is allowed. `attendanceCorrectionPolicy` on the server is the enforcer and will
 * refuse anything this lets through, so the two must agree or the UI invites a
 * click that fails.
 *
 * What this replaces in the report table:
 *
 *     const isPastDate = dayjs(row.date).isBefore(dayjs(), 'day');
 *     return ... && !isPastDate ? <pencil/> : 'Not Allowed'
 *
 * which offered a correction on TODAY and nothing else — so a check-out forgotten
 * yesterday was already unreachable by the next morning, and every weekend and
 * holiday read "Not Allowed" for a reason that had nothing to do with either.
 */

const TODAY = '2026-09-16';

describe('parseCorrectionWindowMonths — same contract as the server', () => {
    it('defaults when the tenant has not set one', () => {
        expect(parseCorrectionWindowMonths(undefined)).toBe(DEFAULT_CORRECTION_WINDOW_MONTHS);
        expect(parseCorrectionWindowMonths({})).toBe(DEFAULT_CORRECTION_WINDOW_MONTHS);
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: null })).toBe(DEFAULT_CORRECTION_WINDOW_MONTHS);
    });

    it('accepts a number or a numeric string', () => {
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: 3 })).toBe(3);
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: '3' })).toBe(3);
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: 0 })).toBe(0);
    });

    it('ignores garbage rather than widening the window', () => {
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: 'soon' })).toBe(DEFAULT_CORRECTION_WINDOW_MONTHS);
        expect(parseCorrectionWindowMonths({ [CORRECTION_WINDOW_MONTHS_KEY]: -4 })).toBe(DEFAULT_CORRECTION_WINDOW_MONTHS);
    });
});

describe('earliestCorrectableDate — month-aligned, like the server', () => {
    it('one month back is the 1st of last month', () => {
        expect(earliestCorrectableDate('2026-09-16', 1)).toBe('2026-08-01');
        expect(earliestCorrectableDate('2026-09-01', 1)).toBe('2026-08-01');
    });

    it('crosses the year boundary', () => {
        expect(earliestCorrectableDate('2026-01-10', 1)).toBe('2025-12-01');
    });
});

describe('canOfferCorrection — which rows get the pencil', () => {
    const offer = (date: string, status = 'Absent', months = 1) =>
        canOfferCorrection({ date, status, today: TODAY, windowMonths: months });

    it('offers yesterday, which the old rule refused', () => {
        expect(offer('2026-09-15')).toBe(true);
    });

    it('still offers today', () => {
        expect(offer(TODAY)).toBe(true);
    });

    /**
     * The reported gap. A Saturday actually worked with no punch at all stays
     * `Weekend`, which is exactly when it needs reporting.
     */
    it('offers a weekend and a holiday', () => {
        expect(offer('2026-09-12', 'Weekend')).toBe(true);
        expect(offer('2026-09-14', 'Holiday')).toBe(true);
    });

    it('offers a day with a missing punch', () => {
        expect(offer('2026-09-14', 'Check Out Missing')).toBe(true);
        expect(offer('2026-09-14', 'Check In Missing')).toBe(true);
    });

    /** The leave reconciler already owns attendance-overrides-leave. */
    it('refuses a leave day', () => {
        expect(offer('2026-09-10', 'On Leave')).toBe(false);
    });

    it('refuses the future', () => {
        expect(offer('2026-09-17')).toBe(false);
        expect(offer('2026-10-01')).toBe(false);
    });

    it('refuses a day outside the tenant window', () => {
        expect(offer('2026-07-31')).toBe(false);
    });

    it('honours a widened window', () => {
        expect(offer('2026-07-31', 'Absent', 6)).toBe(true);
    });

    /**
     * Placeholder rows for days that have not happened carry `id: "-"` and a `"-"`
     * status from the transform. They are not days, so they get nothing.
     */
    it('refuses a placeholder row', () => {
        expect(offer('2026-09-20', '-')).toBe(false);
    });

    it('refuses a row whose date cannot be read', () => {
        expect(offer('not a date')).toBe(false);
    });
});
