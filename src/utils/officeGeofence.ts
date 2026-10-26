/**
 * The office check-in fence, as one pure rule.
 *
 * Twin of wisetech-backend/src/services/attendance/officeGeofence.ts — the server enforces the
 * same rule on check-in, so this copy only decides whether the button is usable and what the
 * employee is told. Change both together.
 *
 * The radius is what the admin typed, in metres. It used to be multiplied by 6 here (a "12 m"
 * setting fenced at 72 m) — that hidden factor is gone on purpose.
 */
import { distanceInMeters } from '@utils/file';

/** The most GPS error a reading is forgiven, in metres. Mirrors the server. */
export const GPS_ACCURACY_ALLOWANCE_CAP_METERS = 50;

export type GeofenceVerdict = 'inside' | 'outside' | 'unconfigured';

export interface GeoPoint {
    latitude: number;
    longitude: number;
}

export interface GeofenceResult {
    verdict: GeofenceVerdict;
    distanceMeters: number | null;
    allowanceMeters: number;
}

const hasLocation = (p: GeoPoint | null | undefined): p is GeoPoint =>
    !!p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    !(p.latitude === 0 && p.longitude === 0);

/**
 * Inside when the reading's error circle overlaps the office circle:
 * `distance − allowance ≤ radius`. Unconfigured (nobody refused) when there is no radius, no
 * branch pin or no reading. A reading with no reported accuracy gets the full allowance.
 */
export function evaluateOfficeGeofence(input: {
    center: GeoPoint | null | undefined;
    point: GeoPoint | null | undefined;
    radiusMeters: number | null | undefined;
    accuracyMeters?: number | null;
}): GeofenceResult {
    const radius = input.radiusMeters;
    if (!radius || radius <= 0 || !hasLocation(input.center) || !hasLocation(input.point)) {
        return { verdict: 'unconfigured', distanceMeters: null, allowanceMeters: 0 };
    }

    const reported = input.accuracyMeters;
    const allowance =
        typeof reported === 'number' && Number.isFinite(reported) && reported >= 0
            ? Math.min(reported, GPS_ACCURACY_ALLOWANCE_CAP_METERS)
            : GPS_ACCURACY_ALLOWANCE_CAP_METERS;

    const distance = distanceInMeters(
        input.center.latitude, input.center.longitude,
        input.point.latitude, input.point.longitude,
    );
    return {
        verdict: distance - allowance <= radius ? 'inside' : 'outside',
        distanceMeters: Math.round(distance),
        allowanceMeters: Math.round(allowance),
    };
}

/** "Office", "office", " OFFICE " → true. The working-methods table is user-editable. */
export function isOfficeWorkingMethod(type?: string | null): boolean {
    return String(type ?? '').trim().toLowerCase() === 'office';
}

/** The sentence an employee reads when the fence refuses them. Same wording as the server. */
export function outsideFenceMessage(
    result: GeofenceResult,
    radiusMeters: number,
    branchName?: string | null,
    accuracyMeters?: number | null,
): string {
    const where = branchName ? branchName : 'your office';
    const away = result.distanceMeters !== null ? `You're about ${result.distanceMeters} m from ${where}. ` : '';
    const weakFix =
        typeof accuracyMeters === 'number' && accuracyMeters > GPS_ACCURACY_ALLOWANCE_CAP_METERS
            ? ` Your location is only accurate to ±${Math.round(accuracyMeters)} m right now; moving near a window can help.`
            : '';
    return `${away}Office check-in works within ${radiusMeters} m of the office. Move closer, or choose another working method.${weakFix}`;
}
