import { describe, test, expect } from 'vitest';
import { toTitleCase } from './text';

/**
 * `toTitleCase` now runs on every heading and row label in the configuration module, not
 * just the ui kit. That is only safe because it refuses to rewrite a word that already
 * carries a capital — so the strings the app already ships pass through untouched, and the
 * change enforces a convention rather than restyling the product.
 *
 * The cases below are REAL strings taken from the config screens. If the helper ever starts
 * mangling them, this fails here rather than on someone's settings page.
 */

describe('toTitleCase — real config headings pass through unchanged', () => {
    const untouched = [
        'Attendance Configuration',
        'Daily Shift Time',
        'Break Deductions',
        'Default Shift Rules',
        'Show Data Up to Today',
        'Enable Lunch Deduction Time',
        'On-site, Holiday & Weekend Late Settings',
        'Site & Hybrid Attendance Approval',
        'Restrict Attendance Requests',
        'Leave Types & Balance',
        'Sandwich Leave Rules',
        'Addon Leaves Allowance',
    ];

    for (const value of untouched) {
        test(`"${value}" is unchanged`, () => {
            expect(toTitleCase(value)).toBe(value);
        });
    }

    test('keeps a minor word lowercase in the middle', () => {
        expect(toTitleCase('Annual Leaves per Month')).toBe('Annual Leaves per Month');
    });
});

describe('toTitleCase — what it actually fixes', () => {
    test('capitalises an all-lowercase heading', () => {
        expect(toTitleCase('break deductions')).toBe('Break Deductions');
    });

    test('lowercases minor words but never the first or last', () => {
        expect(toTitleCase('rules of the road')).toBe('Rules of the Road');
        expect(toTitleCase('the end')).toBe('The End');
    });

    test('never rewrites an acronym or proper noun', () => {
        expect(toTitleCase('WISETECH MEP Pvt. Ltd.')).toBe('WISETECH MEP Pvt. Ltd.');
        expect(toTitleCase('FAQ sections')).toBe('FAQ Sections');
    });

    test('leaves an empty or whitespace value alone rather than throwing', () => {
        expect(toTitleCase('')).toBe('');
        expect(toTitleCase('   ')).toBe('   ');
    });

    test('preserves the original spacing verbatim', () => {
        expect(toTitleCase('check-in  distance')).toBe('Check-in  Distance');
    });
});
