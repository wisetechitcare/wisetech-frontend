import { describe, expect, it } from 'vitest';
import { DEFAULT_ICON_PX, hasSizeClass, iconPixelSize } from './size';

describe('hasSizeClass', () => {
    it.each([
        ['size-4', true], ['text-danger size-[18px]', true], ['md:size-5', true], ['!size-4', true],
        ['hover:md:!size-6', true], ['w-4', false], ['text-size-4', false], ['', false], [undefined, false],
    ])('%s -> %s', (cls, expected) => {
        expect(hasSizeClass(cls)).toBe(expected);
    });
});

describe('iconPixelSize', () => {
    it.each([
        ['fs-4', 18], ['fs-1', 26], ['fs-2', 23], ['fs-6', 16], ['fs-10', 8],
        ['fs-2x', 26], ['fs-2qx', 29], ['fs-2hx', 33], ['fs-3x', 39],
        ['me-2 text-danger', 18], [undefined, 18], ['me-1 fs-7 text-muted', 14],
    ])('%s -> %s', (cls, px) => {
        expect(iconPixelSize(cls)).toBe(px);
    });

    it('exposes the default', () => {
        expect(DEFAULT_ICON_PX).toBe(18);
    });
});
