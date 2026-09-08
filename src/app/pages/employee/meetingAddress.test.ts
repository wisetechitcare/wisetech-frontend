import { describe, test, expect } from 'vitest';
import { joinAddress } from './meetingAddress';

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
