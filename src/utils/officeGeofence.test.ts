/**
 * Twin of the backend's officeGeofence tests — same cases, so the button and the server agree.
 */
import { describe, expect, it } from 'vitest';
import {
    GPS_ACCURACY_ALLOWANCE_CAP_METERS,
    evaluateOfficeGeofence,
    isOfficeWorkingMethod,
    outsideFenceMessage,
} from './officeGeofence';

// A branch pin, and points due north of it. 0.0001° of latitude is ~11.1 m.
const office = { latitude: 19.076, longitude: 72.8777 };
const north = (metres: number) => ({ latitude: office.latitude + metres / 111_195, longitude: office.longitude });

describe('the radius is what the admin typed', () => {
    it('a 12 m setting fences at 12 m, not 72 m (the hidden ×6 is gone)', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(60), radiusMeters: 12, accuracyMeters: 5 }).verdict).toBe('outside');
    });
    it('a precise reading inside the radius is inside', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(10), radiusMeters: 12, accuracyMeters: 3 }).verdict).toBe('inside');
    });
});

describe('GPS error is forgiven, within a cap', () => {
    it('a reading whose error circle overlaps the office is inside', () => {
        const r = evaluateOfficeGeofence({ center: office, point: north(40), radiusMeters: 12, accuracyMeters: 30 });
        expect(r.verdict).toBe('inside');
        expect(r.allowanceMeters).toBe(30);
    });
    it('a ±2 km fix does not open the fence to the city', () => {
        const r = evaluateOfficeGeofence({ center: office, point: north(1500), radiusMeters: 12, accuracyMeters: 2000 });
        expect(r.verdict).toBe('outside');
        expect(r.allowanceMeters).toBe(GPS_ACCURACY_ALLOWANCE_CAP_METERS);
    });
    it('no reported accuracy gets the cap', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(55), radiusMeters: 12 }).verdict).toBe('inside');
    });
});

describe('nothing to fence around refuses nobody', () => {
    it('no radius, a 0 radius, no branch pin, or no reading', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(9000), radiusMeters: null }).verdict).toBe('unconfigured');
        expect(evaluateOfficeGeofence({ center: office, point: north(9000), radiusMeters: 0 }).verdict).toBe('unconfigured');
        expect(evaluateOfficeGeofence({ center: { latitude: 0, longitude: 0 }, point: north(10), radiusMeters: 12 }).verdict).toBe('unconfigured');
        expect(evaluateOfficeGeofence({ center: office, point: undefined, radiusMeters: 12 }).verdict).toBe('unconfigured');
    });
});

describe('labels and wording', () => {
    it('matches the editable Office label loosely', () => {
        expect(isOfficeWorkingMethod(' OFFICE ')).toBe(true);
        expect(isOfficeWorkingMethod('Hybrid')).toBe(false);
    });
    it('says how far, the limit, and what to do', () => {
        const r = evaluateOfficeGeofence({ center: office, point: north(140), radiusMeters: 12, accuracyMeters: 8 });
        expect(outsideFenceMessage(r, 12, 'Andheri', 8)).toBe(
            "You're about 140 m from Andheri. Office check-in works within 12 m of the office. Move closer, or choose another working method.",
        );
    });
});
