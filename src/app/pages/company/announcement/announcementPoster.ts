/**
 * The announcement poster contract — geometry and ink.
 *
 * The dashboard card is a wide slot, but the posters people actually author are portrait flyers
 * (Canva-shaped), so the card does NOT demand a shape. It fits the whole poster inside itself and
 * fills the leftover width with a blurred, zoomed copy of the same image — see `PosterFrame`.
 * Nothing is ever cropped and nothing is ever stretched, whatever shape is uploaded.
 *
 * That leaves exactly one thing an upload can still get wrong, and one thing the card must work
 * out for itself:
 *
 * 1. **Sharpness.** A poster smaller than the space it lands in gets enlarged and goes soft.
 *    Unrecoverable at render time, so it is refused at upload time. Because the fit is
 *    `contain`, the limit depends on the image's own shape — a tall poster is bounded by the
 *    card's height, a wide one by its width — so the rule is expressed as the scale factor the
 *    image will actually be drawn at, and the error names the exact size THAT file would need.
 *
 * 2. **Legibility.** The card's heading and title sit ON the image. White ink disappears on a
 *    white poster. `usePosterInk` samples the image exactly where the text lands and answers
 *    whether that region needs light ink or dark, so the card can flip its whole palette instead
 *    of relying on a scrim heavy enough to survive the worst case — which would mean permanently
 *    dimming every image to protect against a few.
 */
import { useEffect, useState } from 'react';
import { formatFileSize, validateDocumentFile } from '@utils/fileValidation';

/** What the picker offers. SVG is absent on purpose — the server refuses it (see below). */
export const POSTER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;
export const POSTER_ACCEPT = POSTER_EXTENSIONS.join(',');

/**
 * The byte ceiling for a still. Matches the server's own hard cap in `middlewares/multer.ts`,
 * which aborts the stream mid-flight — this check only exists so the admin is told instantly
 * rather than after a 10MB upload crawls up and comes back rejected.
 *
 * A still can afford the full allowance because the server re-encodes it to WebP and caps its
 * long edge at 2000px, so what is uploaded is not what is stored.
 */
export const MAX_POSTER_BYTES = 10 * 1024 * 1024;

/**
 * The ceiling for a GIF, and it is much tighter for a reason worth stating.
 *
 * `services/imageCompression.ts` deliberately skips GIFs — re-encoding one to WebP would drop
 * every frame after the first — so a GIF is stored byte-for-byte as uploaded, forever, and is
 * re-fetched by every employee on every dashboard load. A 10MB still becomes perhaps 400KB in
 * the bucket; a 10MB GIF stays 10MB. This is the cap that keeps the busiest page in the product
 * from carrying an uncompressed animation.
 */
export const MAX_ANIMATED_POSTER_BYTES = 3 * 1024 * 1024;

/** True for the formats that are stored uncompressed, and so get the tighter ceiling. */
export const isAnimatedPoster = (fileName: string, mimeType?: string) =>
    mimeType === 'image/gif' || /\.gif$/i.test(fileName);

/** The ceiling that applies to this file. */
export const posterByteLimit = (fileName: string, mimeType?: string) =>
    isAnimatedPoster(fileName, mimeType) ? MAX_ANIMATED_POSTER_BYTES : MAX_POSTER_BYTES;

/** The line under the picker, derived so it can never contradict the rule it describes. */
export const POSTER_SIZE_HINT =
    `PNG, JPG or WebP up to ${formatFileSize(MAX_POSTER_BYTES)}`
    + `, or an animated GIF up to ${formatFileSize(MAX_ANIMATED_POSTER_BYTES)}`;

export const POSTER = {
    /** The card's shape. The poster is fitted INSIDE this, never cropped to it. */
    ratioW: 20,
    ratioH: 7,
    /**
     * The card's largest realistic rendering, in CSS pixels — the box a poster is fitted into.
     * The sharpness floor is derived from this, so widening the card automatically raises it.
     */
    cardWidth: 900,
    cardHeight: 320,
    /**
     * Device pixels wanted per CSS pixel. 1.5 rather than a strict 2: it stays crisp on a retina
     * panel without demanding print-resolution art for a dashboard card.
     */
    targetDpr: 1.5,
} as const;

export const POSTER_ASPECT = `${POSTER.ratioW} / ${POSTER.ratioH}`;
/** Guidance for the form. The enforced rule is `judgePoster`, which is shape-aware. */
export const POSTER_HINT = `any shape — portrait, square or wide. Around 1000 px or more on the longest side keeps it sharp`;

export interface PosterVerdict {
    ok: boolean;
    width: number;
    height: number;
    /** Why it was refused — written to say what to do about it, not just that it failed. */
    reason?: string;
}

/** The factor an image of this size is drawn at once fitted inside the card. */
const containScale = (width: number, height: number) =>
    Math.min(POSTER.cardWidth / width, POSTER.cardHeight / height);

/** The rule, applied to dimensions. Exported separately so it can be checked without a File. */
export function judgePoster(width: number, height: number): PosterVerdict {
    if (!width || !height) {
        return { ok: false, width, height, reason: 'That file could not be read as an image.' };
    }

    const scale = containScale(width, height);
    const maxScale = 1 / POSTER.targetDpr;
    if (scale > maxScale) {
        // Scaling this image up by `scale * targetDpr` is exactly what it takes to clear the bar,
        // so the message can name a real target instead of a generic minimum that may not suit
        // this shape at all.
        const factor = scale * POSTER.targetDpr;
        return {
            ok: false, width, height,
            reason: `That image is ${width} × ${height} px — too small for the card, so it would be `
                + `enlarged and look soft. At this shape it needs to be at least `
                + `${Math.ceil(width * factor)} × ${Math.ceil(height * factor)} px.`,
        };
    }

    return { ok: true, width, height };
}

/**
 * Read a picked file's real pixel dimensions and judge them — before anything is uploaded.
 *
 * Works for an animated GIF too: `Image` reports the dimensions of its first frame, which is the
 * size every frame is, so the sharpness rule applies to the animation as a whole. SVG is not
 * handled because the server refuses it outright (`multer.ts` — an SVG is script-bearing markup
 * served from the bucket origin, i.e. stored XSS), so it is not offered in the picker either.
 */
export function inspectPosterFile(file: File): Promise<PosterVerdict> {
    // Type and weight first, and both before a single byte goes over the wire. Reusing the app's
    // file validator rather than re-deriving "too big" here, with the poster's own ceilings.
    const animated = isAnimatedPoster(file.name, file.type);
    const problem = validateDocumentFile(file, {
        extensions: POSTER_EXTENSIONS,
        maxBytes: posterByteLimit(file.name, file.type),
    });
    if (problem) {
        return Promise.resolve({
            ok: false, width: 0, height: 0,
            // A GIF is held to a limit a JPG is not, so say why rather than leaving the admin to
            // wonder whether the number is arbitrary.
            reason: animated && file.size > MAX_ANIMATED_POSTER_BYTES
                ? `${problem} A GIF is stored exactly as uploaded — unlike a PNG or JPG it is never `
                    + `compressed — and it reloads on every employee's dashboard.`
                : problem,
        });
    }

    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(judgePoster(img.naturalWidth, img.naturalHeight));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ ok: false, width: 0, height: 0, reason: 'That file could not be read as an image.' });
        };
        img.src = url;
    });
}

/* ── ink ─────────────────────────────────────────────────────────────────────────────────── */

export type PosterInk = 'light' | 'dark';
export interface PosterInkPair {
    /** For the heading row across the top of the card. */
    top: PosterInk;
    /** For the title, and the panel, along the bottom. */
    bottom: PosterInk;
}

/** Light ink over a dark scrim — what a poster with no image (the brand gradient) needs. */
const DEFAULT_INK: PosterInkPair = { top: 'light', bottom: 'light' };

/** Answers survive the carousel looping and every re-render; the work is once per image, ever. */
const inkCache = new Map<string, PosterInkPair>();

/** Grid the image is sampled on. 24×24 is 576 pixels — enough to characterise a region, free to read. */
const SAMPLE = 24;

/**
 * The luminance above which a region counts as light and needs dark ink.
 *
 * Set at 0.62 rather than the midpoint: white text holds its own on a mid-tone far better than
 * dark text does, so the tie is broken towards leaving the ink light.
 */
const LIGHT_THRESHOLD = 0.62;

/** Mean sRGB relative luminance of a horizontal band, 0 (black) – 1 (white). */
function bandLuminance(data: Uint8ClampedArray, fromRow: number, toRow: number): number {
    let total = 0;
    let count = 0;
    for (let y = fromRow; y < toRow; y++) {
        for (let x = 0; x < SAMPLE; x++) {
            const i = (y * SAMPLE + x) * 4;
            total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
            count++;
        }
    }
    return count ? total / count : 1;
}

function measureInk(img: HTMLImageElement): PosterInkPair | null {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Sample the CENTRE COVER CROP, not the whole file. What sits behind the text is the
        // blurred fill layer, which is this image cover-fitted to the card — for a portrait
        // poster that is a band across its middle, so reading the file's own top and bottom rows
        // would judge the ink from pixels that are never on screen.
        const { naturalWidth: w, naturalHeight: h } = img;
        const cardRatio = POSTER.ratioW / POSTER.ratioH;
        const cropW = Math.min(w, h * cardRatio);
        const cropH = Math.min(h, w / cardRatio);
        ctx.drawImage(img, (w - cropW) / 2, (h - cropH) / 2, cropW, cropH, 0, 0, SAMPLE, SAMPLE);

        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
        // Only the bands the text actually occupies — averaging the whole thing would let a dark
        // sky decide the ink for a caption sitting on pale sand.
        return {
            top: bandLuminance(data, 0, Math.round(SAMPLE * 0.4)) > LIGHT_THRESHOLD ? 'dark' : 'light',
            bottom: bandLuminance(data, Math.round(SAMPLE * 0.6), SAMPLE) > LIGHT_THRESHOLD ? 'dark' : 'light',
        };
    } catch {
        // A cross-origin image with no CORS headers taints the canvas and `getImageData` throws.
        // Nothing to do about it here — the caller keeps the default, which is the palette the
        // card had before any of this existed.
        return null;
    }
}

/**
 * The ink a poster needs, per region. Returns the light-on-dark default until the image has been
 * read, and stays on it if the image cannot be read at all.
 */
export function usePosterInk(src?: string | null): PosterInkPair {
    const [ink, setInk] = useState<PosterInkPair>(() => (src && inkCache.get(src)) || DEFAULT_INK);

    useEffect(() => {
        if (!src) {
            setInk(DEFAULT_INK);
            return;
        }
        const cached = inkCache.get(src);
        if (cached) {
            setInk(cached);
            return;
        }

        setInk(DEFAULT_INK);
        let cancelled = false;
        const img = new Image();
        // Required to read the pixels back. This is a second, off-screen load: if the host serves
        // no CORS headers this one fails and the visible <img> is unaffected.
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const measured = measureInk(img);
            if (!measured) return;
            inkCache.set(src, measured);
            if (!cancelled) setInk(measured);
        };
        img.src = src;

        return () => { cancelled = true; };
    }, [src]);

    return ink;
}
