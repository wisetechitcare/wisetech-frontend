/**
 * The check-in / check-out button rule.
 *
 * Written against two real incidents: WT-107 lost their checkout on 16 and 21 Sept 2026 —
 * checked in at the office, left, and found the button disabled, so no request was ever sent
 * (there is no server-side error for either day, because nothing was ever asked of it).
 */
import { describe, expect, it } from 'vitest';
import type { GeofenceVerdict } from '@utils/officeGeofence';
import { isCheckButtonDisabled, type DayState } from './checkButtonState';

const at = (over: Partial<Parameters<typeof isCheckButtonDisabled>[0]> = {}) =>
    isCheckButtonDisabled({
        dayState: 'not-in',
        isOfficeMethod: true,
        fence: 'inside',
        ...over,
    });

describe('geofencing constrains arriving, never leaving', () => {
    /** The regression. Checked in at the office, now far away, needs to check out. */
    it('lets a checked-in employee check out from anywhere', () => {
        expect(at({ dayState: 'in', fence: 'outside' })).toBe(false);
    });

    it('still refuses an Office check-in from outside the fence', () => {
        expect(at({ dayState: 'not-in', fence: 'outside' })).toBe(true);
    });

    it('allows an Office check-in inside the fence', () => {
        expect(at({ dayState: 'not-in', fence: 'inside' })).toBe(false);
    });

    /** Hybrid and on-site staff are not fenced at all. */
    it('does not fence a non-Office method', () => {
        expect(at({ dayState: 'not-in', isOfficeMethod: false, fence: 'outside' })).toBe(false);
    });
});

describe('an unknown fence is not a fence of zero', () => {
    /**
     * The radius used to start at 0 while the config loaded, and `distance >= 0` is true
     * everywhere on earth — so an unloaded config disabled the button for anyone whose working
     * method defaulted to Office. Not loaded / not set is 'unconfigured' now.
     */
    it('does not block a check-in before the fence is known', () => {
        expect(at({ dayState: 'not-in', fence: 'unconfigured' })).toBe(false);
    });
});

describe('the day state decides first', () => {
    /**
     * A failed status fetch leaves the day unknown. That must keep the button usable unless the
     * fence actually says outside — the server is what decides whether a punch is valid.
     */
    it('keeps the button usable when the day is unknown and the fence is not refusing', () => {
        expect(at({ dayState: 'unknown', fence: 'unconfigured' })).toBe(false);
    });

    it('never blocks a checkout, whatever the method or fence', () => {
        const fences: GeofenceVerdict[] = ['inside', 'outside', 'unconfigured'];
        for (const isOfficeMethod of [true, false]) {
            for (const fence of fences) {
                expect(at({ dayState: 'in', isOfficeMethod, fence })).toBe(false);
            }
        }
    });

    it('covers every day state without throwing', () => {
        const states: DayState[] = ['unknown', 'not-in', 'in'];
        for (const dayState of states) {
            expect(typeof at({ dayState })).toBe('boolean');
        }
    });
});
