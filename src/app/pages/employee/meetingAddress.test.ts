import { describe, test, it, expect } from 'vitest';
import { joinAddress, mapsUrl } from './meetingAddress';

/**
 * The rows below are real `additional_details` values from the database, which is where the
 * duplication came from: some carry a complete geocoded string AND the city/state/zip that
 * are already inside it, others carry only the parts.
 */
describe('joinAddress', () => {
    test('a geocoded address does not repeat its own city, state and country', () => {
        expect(joinAddress([
            'Thakurwadi, Matheran, Karjat Taluka, Raigad, Maharashtra, 410102, India',
            '', '', 'Maharashtra', '410102', 'India',
        ])).toBe('Thakurwadi, Matheran, Karjat Taluka, Raigad, Maharashtra, 410102, India');
    });

    test('parts alone still assemble, for the rows that carry no full string', () => {
        expect(joinAddress(['', 'Mira Road', 'Thane', 'Maharashtra', '', 'India']))
            .toBe('Mira Road, Thane, Maharashtra, India');
    });

    test('keeps a part the full string genuinely omits', () => {
        expect(joinAddress([
            'Uran, Uran Subdistrict, Raigad, Maharashtra, 400702, India',
            'Beach Side', '', 'Maharashtra', '400702', 'India',
        ])).toBe('Uran, Uran Subdistrict, Raigad, Maharashtra, 400702, India, Beach Side');
    });

    test('blanks, nulls and undefined contribute nothing', () => {
        expect(joinAddress([null, undefined, '  ', ''])).toBe('');
        expect(joinAddress([])).toBe('');
    });

    test('is case-insensitive about repeats', () => {
        expect(joinAddress(['Mumbai, Maharashtra', 'MUMBAI', 'maharashtra'])).toBe('Mumbai, Maharashtra');
    });
});

describe('mapsUrl', () => {
    it('encodes the address as a maps query', () => {
        const url = mapsUrl('Sector 30A, Vashi, Navi Mumbai, Maharashtra 400703');
        // The commas and spaces have to survive as escapes, or Maps reads the tail as
        // separate URL parameters and searches for the street alone.
        expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Sector%2030A%2C%20Vashi%2C%20Navi%20Mumbai%2C%20Maharashtra%20400703');
    });

    it('has no link for a missing or blank address', () => {
        expect(mapsUrl('')).toBeNull();
        expect(mapsUrl('   ')).toBeNull();
        expect(mapsUrl(null)).toBeNull();
        expect(mapsUrl(undefined)).toBeNull();
    });
});
