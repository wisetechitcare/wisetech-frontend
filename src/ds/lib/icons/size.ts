/**
 * `fs-*` class to pixel size. THIS IS THE CALIBRATION KNOB for every icon in the app.
 *
 * The numeric steps are Metronic's own `$font-sizes` scale rounded to whole pixels, so an
 * icon that replaced a 16.25px `<i>` renders at 16px. Treat that as a starting point, not a
 * final answer: an icon font and an SVG do not put the same ink inside the same box.
 * Keenicons very nearly fill their em box, while a Lucide glyph is drawn inside a 24-unit
 * viewBox with about two units of margin on each side, so it reads roughly 15% smaller at an
 * identical number. If icons look light against their labels, scale `SIZE_SCALE` — one edit
 * moves every icon in the app, which is the entire point of routing them through one table.
 */
const SIZE_PX: Record<string, number> = {
    'fs-1': 23, 'fs-2': 20, 'fs-3': 18, 'fs-4': 16, 'fs-5': 15,
    'fs-6': 14, 'fs-7': 12, 'fs-8': 11, 'fs-9': 10, 'fs-10': 7,
};

/**
 * Metronic's large scale (`fs-2x`, `fs-2qx`, `fs-2hx`, `fs-2tx`, `fs-3x`, `fs-5x`…) is a
 * formula rather than a table — 13px x (N + {0, .25, .5, .75}) — so it is computed instead
 * of transcribed. Getting this wrong is not subtle: before it existed, every `fs-2hx` hero
 * icon silently fell back to 16px, which is a quarter of its intended size.
 */
const LARGE = /^fs-(\d+)(q|h|t)?x$/;
const LARGE_STEP: Record<string, number> = { q: 0.25, h: 0.5, t: 0.75 };

/**
 * Compensates for the viewBox margin described above, so a Lucide glyph lands at about the
 * ink size of the keenicon it replaced. Nudge this one number if the whole app reads small.
 */
const SIZE_SCALE = 1.15;

/** Pixel size when a className carries no `fs-*` token: what `fs-4` resolves to. */
export const DEFAULT_ICON_PX = Math.round(SIZE_PX['fs-4'] * SIZE_SCALE);

/** Pixel size for a className, honouring whichever `fs-*` token it contains. */
function sizeFor(className: string): number | null {
    for (const token of className.split(/\s+/)) {
        if (SIZE_PX[token]) return Math.round(SIZE_PX[token] * SIZE_SCALE);
        const large = LARGE.exec(token);
        if (large) return Math.round(13 * (Number(large[1]) + (LARGE_STEP[large[2]] ?? 0)));
    }
    return null;
}

/** Pixel size for an icon's className; no `fs-*` token falls back to the `fs-4` size (18). */
export function iconPixelSize(className: string | undefined): number {
    return sizeFor(className ?? '') ?? DEFAULT_ICON_PX;
}
