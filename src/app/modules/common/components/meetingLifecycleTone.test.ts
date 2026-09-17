import { describe, expect, it } from 'vitest';
import {
    LIFECYCLE_DEFAULT_COLORS, MIN_CONTRAST, contrastRatio, lifecycleOf, lifecycleTone, readableOn,
} from './MeetingsList';

/**
 * Which state a meeting row is in.
 *
 * The ordering is the whole point: a cancelled meeting whose clock has passed satisfies both
 * "cancelled" and "held with nothing logged", and reporting it as awaiting a timesheet would
 * ask somebody to log time against a meeting that never happened.
 */
describe('lifecycleOf', () => {
    it('leaves a scheduled meeting untinted', () => {
        expect(lifecycleOf({ lifecycle: 'SCHEDULED' })).toBeNull();
        expect(lifecycleOf({})).toBeNull();
    });

    it('marks a held meeting that has time logged', () => {
        expect(lifecycleOf({ lifecycle: 'COMPLETED', loggedMinutes: 45 })).toBe('held');
    });

    it('marks a held meeting with nothing logged as awaiting', () => {
        expect(lifecycleOf({ lifecycle: 'COMPLETED', loggedMinutes: 0 })).toBe('awaiting');
        expect(lifecycleOf({ lifecycle: 'COMPLETED' })).toBe('awaiting');
    });

    it('marks a cancelled meeting whatever else is true of it', () => {
        expect(lifecycleOf({ lifecycle: 'CANCELLED' })).toBe('cancelled');
        expect(lifecycleOf({ lifecycle: 'CANCELLED', loggedMinutes: 30 })).toBe('cancelled');
    });
});

/**
 * The badge has to stay readable at ANY colour somebody picks in Calendar Configuration.
 *
 * This is the reason the ink is a dark mix of the state's own colour rather than a stored
 * hex: a stored pair only matches the colour it was chosen against, and the moment the colour
 * became a setting that guarantee was gone.
 */
describe('lifecycleTone', () => {
    const HUES = [
        ...Object.values(LIFECYCLE_DEFAULT_COLORS),
        '#000000', '#FFFFFF', '#0EA5E9', '#F8FAFC', '#7C3AED', '#FACC15', '#111827',
    ];

    it('keeps badge ink legible on badge fill for every hue', () => {
        for (const hue of HUES) {
            const { fill, ink } = lifecycleTone(hue);
            expect(contrastRatio(fill, ink), `${hue} -> ${ink} on ${fill}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
    });

    it('keeps the row tint lighter than its hover, and both lighter than the edge', () => {
        for (const hue of HUES) {
            const t = lifecycleTone(hue);
            expect(t.edge).toBe(hue);
            // Rest sits above hover on the white-mix scale, so hovering always darkens.
            expect(contrastRatio(t.row, '#FFFFFF')).toBeLessThanOrEqual(contrastRatio(t.rowHover, '#FFFFFF'));
        }
    });

    it('leaves dark text readable on a tinted row', () => {
        for (const hue of HUES) {
            const { row } = lifecycleTone(hue);
            expect(contrastRatio(row, readableOn(row)), `${hue} row ${row}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
    });
});
