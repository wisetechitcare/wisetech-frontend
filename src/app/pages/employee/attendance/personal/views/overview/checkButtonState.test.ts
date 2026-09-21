/**
 * The check-in / check-out button rule.
 *
 * Written against two real incidents: WT-107 lost their checkout on 16 and 21 Sept 2026 —
 * checked in at the office, left, and found the button disabled, so no request was ever sent
 * (there is no server-side error for either day, because nothing was ever asked of it).
 */
import { describe, expect, it } from 'vitest';
import { isCheckButtonDisabled, type DayState } from './checkButtonState';

const at = (over: Partial<Parameters<typeof isCheckButtonDisabled>[0]> = {}) =>
    isCheckButtonDisabled({
        dayState: 'not-in',
        isOfficeMethod: true,
        distanceFromBranch: 0,
        allowedRadius: 200,
        ...over,
    });

describe('geofencing constrains arriving, never leaving', () => {
    /** The regression. Checked in at the office, now 40km away, needs to check out. */
    it('lets a checked-in employee check out from anywhere', () => {
        expect(at({ dayState: 'in', distanceFromBranch: 40_000 })).toBe(false);
    });

    it('still refuses an Office check-in from outside the radius', () => {
        expect(at({ dayState: 'not-in', distanceFromBranch: 40_000 })).toBe(true);
    });

    it('allows an Office check-in inside the radius', () => {
        expect(at({ dayState: 'not-in', distanceFromBranch: 120, allowedRadius: 200 })).toBe(false);
    });

    /** Hybrid and on-site staff are not fenced at all. */
    it('does not fence a non-Office method', () => {
        expect(at({ dayState: 'not-in', isOfficeMethod: false, distanceFromBranch: 40_000 })).toBe(false);
    });
});

describe('an unknown radius is not a radius of zero', () => {
    /**
     * `allowedRadius` starts at 0 while the config loads, and `distance >= 0` is true
     * everywhere on earth — so an unloaded config used to disable the button for anyone whose
     * working method defaulted to Office.
     */
    it('does not block a check-in before the radius is known', () => {
        expect(at({ dayState: 'not-in', distanceFromBranch: 40_000, allowedRadius: 0 })).toBe(false);
    });

    it('blocks again once a real radius arrives', () => {
        expect(at({ dayState: 'not-in', distanceFromBranch: 40_000, allowedRadius: 200 })).toBe(true);
    });
});

describe('the day state decides first', () => {
    it('closes a finished day', () => {
        expect(at({ dayState: 'done', distanceFromBranch: 0 })).toBe(true);
        expect(at({ dayState: 'done', isOfficeMethod: false })).toBe(true);
    });

    /**
     * A failed status fetch leaves the day unknown. That must keep the button usable — the
     * server is what decides whether a punch is valid, not a fetch that did not answer.
     */
    it('keeps the button usable when the day is unknown', () => {
        expect(at({ dayState: 'unknown', distanceFromBranch: 40_000, allowedRadius: 0 })).toBe(false);
    });

    it('never blocks a checkout, whatever the method or distance', () => {
        const methods = [true, false];
        const distances = [0, 500, 40_000];
        for (const isOfficeMethod of methods) {
            for (const distanceFromBranch of distances) {
                for (const allowedRadius of [0, 50, 5_000]) {
                    expect(at({ dayState: 'in', isOfficeMethod, distanceFromBranch, allowedRadius })).toBe(false);
                }
            }
        }
    });

    it('covers every day state without throwing', () => {
        const states: DayState[] = ['unknown', 'not-in', 'in', 'done'];
        for (const dayState of states) {
            expect(typeof at({ dayState })).toBe('boolean');
        }
    });
});
