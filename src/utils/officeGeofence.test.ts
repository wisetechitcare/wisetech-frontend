/**
 * Twin of the backend's officeGeofence tests — same cases, so the button and the server agree.
 */
import { describe, expect, it } from 'vitest';
import { evaluateOfficeGeofence, isOfficeWorkingMethod, outsideFenceMessage } from './officeGeofence';

// A branch pin, and points due north of it. 0.0001° of latitude is ~11.1 m.
const office = { latitude: 19.076, longitude: 72.8777 };
const north = (metres: number) => ({ latitude: office.latitude + metres / 111_195, longitude: office.longitude });

describe('the radius is exactly what the admin typed', () => {
    it('inside the radius is inside', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(10), radiusMeters: 12 }).verdict).toBe('inside');
    });
    it('exactly on the radius is inside ("within 12 m")', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(11.99), radiusMeters: 12 }).verdict).toBe('inside');
    });
    it('one step past the radius is outside — nothing is added to it', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(13), radiusMeters: 12 }).verdict).toBe('outside');
    });
    it('a 12 m setting fences at 12 m, not 72 m (the hidden ×6 is gone)', () => {
        expect(evaluateOfficeGeofence({ center: office, point: north(60), radiusMeters: 12 }).verdict).toBe('outside');
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
        const r = evaluateOfficeGeofence({ center: office, point: north(140), radiusMeters: 12 });
        expect(outsideFenceMessage(r, 12, 'Andheri')).toBe(
            "You're about 140 m from Andheri. Office check-in works within 12 m of the office. Move closer, or choose another working method.",
        );
    });
});
