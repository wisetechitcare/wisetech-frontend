/**
 * @vitest-environment jsdom
 *
 * jsdom only because importing the component drags in Metronic's layout store, which
 * reads localStorage at module load. Nothing here renders.
 */
/**
 * The picker's two pure transforms. Everything else in TimePickerField is layout; these
 * two are where a wrong answer is silent — a form that saves 19:00 as 07:00 looks fine
 * until somebody reads the report.
 */
import { describe, expect, it } from 'vitest';
import { parse, to24 } from './TimePickerField';

describe('to24', () => {
    it('maps the midnight and noon corners, where label + 12 is wrong', () => {
        expect(to24(12, true, 'AM')).toBe(0);
        expect(to24(12, true, 'PM')).toBe(12);
    });

    it('maps the rest of the 12-hour face', () => {
        expect(to24(1, true, 'AM')).toBe(1);
        expect(to24(7, true, 'AM')).toBe(7);
        expect(to24(7, true, 'PM')).toBe(19);
        expect(to24(11, true, 'PM')).toBe(23);
    });

    it('passes 24-hour labels straight through', () => {
        expect(to24(0, false, 'AM')).toBe(0);
        expect(to24(19, false, 'AM')).toBe(19);
        expect(to24(23, false, 'PM')).toBe(23);
    });
});

describe('parse', () => {
    it('round-trips the wire format', () => {
        expect(parse('19:05').format('HH:mm')).toBe('19:05');
        expect(parse('00:00').format('HH:mm')).toBe('00:00');
        expect(parse('9:30').format('HH:mm')).toBe('09:30');
    });

    it('falls back to 12:00 rather than NaN when the field is empty or junk', () => {
        expect(parse('').format('HH:mm')).toBe('12:00');
        expect(parse('not a time').format('HH:mm')).toBe('12:00');
    });

    it('clamps an out-of-range stored value instead of rolling into the next day', () => {
        expect(parse('99:99').format('HH:mm')).toBe('23:59');
    });
});
