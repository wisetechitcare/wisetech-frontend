import { describe, test, expect } from 'vitest';
import { countWords } from './meetingLimits';

/**
 * The agenda cap is counted in WORDS, which is not a thing `maxLength` can express — so the
 * counting is the part that has to be right. These are the shapes real prose arrives in.
 */
describe('countWords', () => {
    test('counts words, not spaces', () => {
        expect(countWords('Discuss the salary revision')).toBe(4);
        expect(countWords('one')).toBe(1);
    });

    test('collapses runs of whitespace, including newlines and tabs', () => {
        expect(countWords('a   b\n\nc\td')).toBe(4);
    });

    test('empty and whitespace-only are zero, never one', () => {
        expect(countWords('')).toBe(0);
        expect(countWords('   \n\t ')).toBe(0);
    });

    test('leading and trailing space does not invent a word', () => {
        expect(countWords('  hello world  ')).toBe(2);
    });

    test('a 200-word agenda is exactly 200', () => {
        expect(countWords(Array(200).fill('word').join(' '))).toBe(200);
        expect(countWords(Array(201).fill('word').join(' '))).toBe(201);
    });
});
