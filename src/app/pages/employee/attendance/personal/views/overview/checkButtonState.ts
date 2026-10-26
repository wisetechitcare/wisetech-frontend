/**
 * Whether the check-in / check-out button is disabled, as one pure rule.
 *
 * It used to be decided by three effects writing the same Redux flag independently — the GPS
 * geofence, the status fetch, and a localStorage token — so whether an employee could act
 * depended on the order those happened to resolve. Extracted here so the rule can be read and
 * tested without mounting the screen.
 */
import type { GeofenceVerdict } from '@utils/officeGeofence';

/** Today's attendance as the SERVER reports it. 'unknown' means the status fetch has not answered. */
export type DayState = 'unknown' | 'not-in' | 'in';

export interface CheckButtonInput {
    dayState: DayState;
    /** The method selected in the form — not the one stored on any existing punch. */
    isOfficeMethod: boolean;
    /** Where the employee stands against their office fence (`evaluateOfficeGeofence`). */
    fence: GeofenceVerdict;
}

/**
 * GEOFENCING CONSTRAINS ARRIVING, NEVER LEAVING.
 *
 * Being away from the office is a reason to refuse a check-IN. It is never a reason to refuse a
 * check-OUT: blocking the exit does not keep anyone at their desk, it only destroys the record
 * of a day they worked. WT-107 lost 16 and 21 Sept 2026 exactly this way — checked in at the
 * office, left, and met a greyed-out button, so no request was ever sent and no server error
 * exists for either day.
 *
 * The other trap is a radius that has not loaded yet. It used to start at 0, and
 * `distance >= 0` is true everywhere on earth. A fence that is not known yet is 'unconfigured',
 * which never blocks — the server enforces the real one on submit anyway.
 */
export function isCheckButtonDisabled(input: CheckButtonInput): boolean {
    const { dayState, isOfficeMethod, fence } = input;

    // Checked in and still out there — checking out must always be possible, from anywhere.
    if (dayState === 'in') return false;

    // 'not-in' or 'unknown': the pending action is a check-in, so the fence applies.
    return isOfficeMethod && fence === 'outside';
}
