/**
 * The board's backdrop — presets, a solid colour, or the user's own wallpaper.
 *
 * The work surface behind the Kanban columns is the one part of this screen that carries no
 * information, which is exactly why it is worth letting people own: a team recognises its own
 * board at a glance, and a wall-mounted board in an office wants a different backdrop from a
 * laptop in a dark room.
 *
 * ### What is stored, and where
 *
 * A single JSON blob in `localStorage`. This is a *preference of this browser*, not company data:
 * it must survive a refresh, must never block the board from rendering, and must never be a
 * network round-trip on a screen whose whole point is to load fast. Moving it server-side later
 * means swapping `load`/`save` — nothing else knows where it lives.
 *
 * ### Why wallpapers are re-encoded before they are stored
 *
 * A phone photo is 4–12 MB; `localStorage` gives roughly 5 MB *of characters*, and base64 inflates
 * by a third. Storing the file as picked would blow the quota on the first upload and throw. So an
 * uploaded image is drawn into a canvas and re-encoded, stepping down through progressively
 * smaller sizes until it fits the budget. A backdrop is scenery — 1920px at JPEG 0.78 is
 * indistinguishable behind opaque cards, and it is the difference between a feature that works and
 * one that throws on the first try.
 *
 * ### Contrast is a property of the background, not a guess
 *
 * Cards are opaque `background.paper`, so they are legible on anything. Everything the board draws
 * DIRECTLY on the backdrop (the "no stages" state, the count) is not — a light theme on a midnight
 * backdrop would paint near-black text on near-black pixels. `boardInk()` answers which way to
 * write, derived from the actual colour (relative luminance) rather than from the app's theme mode.
 */
import { useCallback, useState } from 'react';
import { safeJsonParse } from '@utils/safeJson';

// ─────────────────────────────────────────────────────────────────────────────
// Shape
// ─────────────────────────────────────────────────────────────────────────────

export type BoardBackgroundKind = 'preset' | 'solid' | 'image';

/** How text placed directly on the backdrop has to be written. */
export type BoardInk = 'light' | 'dark';

export interface BoardBackground {
    kind: BoardBackgroundKind;
    /** Used when `kind === 'preset'`. */
    presetId: string;
    /** Hex, used when `kind === 'solid'`. */
    color: string;
    /** `http(s):` or `data:` URL, used when `kind === 'image'`. */
    imageUrl: string;
    /** 0–80 — how far the wallpaper is dimmed so cards keep their weight. */
    dim: number;
    /** 0–16px — softens a busy wallpaper so it stops competing with the cards. */
    blur: number;
}

export interface BoardPreset {
    id: string;
    label: string;
    /** A CSS `background` shorthand. */
    css: string;
    ink: BoardInk;
}

/**
 * The shipped backdrops. Deep, low-chroma surfaces: a board is looked at all day, and a saturated
 * backdrop turns every white card into a glare source. The first entry is the default — the deep
 * navy the board was designed against.
 */
export const BOARD_PRESETS: readonly BoardPreset[] = [
    { id: 'midnight', label: 'Midnight Navy', css: 'linear-gradient(160deg, #16305F 0%, #0D1E42 52%, #080F26 100%)', ink: 'light' },
    { id: 'royal', label: 'WiseTech Navy', css: 'linear-gradient(150deg, #2C56C4 0%, #1E3A8A 55%, #15265C 100%)', ink: 'light' },
    { id: 'graphite', label: 'Graphite', css: 'linear-gradient(160deg, #273244 0%, #1A2230 55%, #0F141C 100%)', ink: 'light' },
    { id: 'teal', label: 'Deep Teal', css: 'linear-gradient(150deg, #0B3B44 0%, #0A2B3A 55%, #071C28 100%)', ink: 'light' },
    { id: 'violet', label: 'Indigo Dusk', css: 'linear-gradient(150deg, #35317E 0%, #3B1F73 55%, #1B1740 100%)', ink: 'light' },
    { id: 'ember', label: 'Ember', css: 'linear-gradient(150deg, #5A2318 0%, #3E1410 55%, #231016 100%)', ink: 'light' },
    { id: 'frost', label: 'Frost', css: 'linear-gradient(160deg, #EEF3FF 0%, #E2E9F8 55%, #D8E2F4 100%)', ink: 'dark' },
    { id: 'canvas', label: 'Paper', css: 'linear-gradient(160deg, #F8FAFC 0%, #F1F4F8 55%, #E8ECF2 100%)', ink: 'dark' },
];

export const DEFAULT_BOARD_BACKGROUND: BoardBackground = {
    kind: 'preset',
    presetId: 'midnight',
    color: '#0D1E42',
    imageUrl: '',
    dim: 38,
    blur: 0,
};

export const findPreset = (id: string): BoardPreset =>
    BOARD_PRESETS.find((p) => p.id === id) ?? BOARD_PRESETS[0];

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const expandHex = (hex: string) => {
    const raw = hex.trim().replace('#', '');
    return raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
};

/**
 * Relative luminance, so "is this dark?" is answered by the colour itself. sRGB is not perceptually
 * linear — a plain average of the channels calls mid-blue "light" and puts grey text on it.
 */
export const isDarkColor = (hex: string): boolean => {
    if (!HEX.test(hex.trim())) return true;
    const value = expandHex(hex);
    const channel = (i: number) => {
        const c = parseInt(value.slice(i * 2, i * 2 + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2) < 0.42;
};

/** The CSS `background` shorthand for a stored background. */
export const boardBackgroundCss = (bg: BoardBackground): string => {
    if (bg.kind === 'solid') return HEX.test(bg.color.trim()) ? bg.color.trim() : DEFAULT_BOARD_BACKGROUND.color;
    if (bg.kind === 'image' && bg.imageUrl) return `url("${bg.imageUrl}") center / cover no-repeat`;
    return findPreset(bg.presetId).css;
};

/** Which way to write text drawn straight onto the backdrop. */
export const boardInk = (bg: BoardBackground): BoardInk => {
    if (bg.kind === 'solid') return isDarkColor(bg.color) ? 'light' : 'dark';
    // A wallpaper can be anything, so the scrim decides: dimmed enough, light text always wins.
    if (bg.kind === 'image' && bg.imageUrl) return bg.dim >= 25 ? 'light' : 'dark';
    return findPreset(bg.presetId).ink;
};

/** True when the backdrop needs the readability scrim drawn over it. */
export const hasWallpaper = (bg: BoardBackground): boolean => bg.kind === 'image' && !!bg.imageUrl;

/** A one-line human summary for the toolbar tooltip. */
export const describeBackground = (bg: BoardBackground): string => {
    if (bg.kind === 'image' && bg.imageUrl) return 'Custom wallpaper';
    if (bg.kind === 'solid') return `Solid ${bg.color.toUpperCase()}`;
    return findPreset(bg.presetId).label;
};

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wt.tasks.boardBackground';

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Never trusts what it reads: a hand-edited or half-written value falls back field by field. */
export const normalizeBackground = (raw: unknown): BoardBackground => {
    const value = (raw ?? {}) as Partial<BoardBackground>;
    const kind: BoardBackgroundKind =
        value.kind === 'solid' || value.kind === 'image' ? value.kind : 'preset';
    const imageUrl = typeof value.imageUrl === 'string' ? value.imageUrl : '';
    return {
        // An image kind with no image left would render nothing — fall back to the preset.
        kind: kind === 'image' && !imageUrl ? 'preset' : kind,
        presetId: findPreset(typeof value.presetId === 'string' ? value.presetId : '').id,
        color: typeof value.color === 'string' && HEX.test(value.color.trim())
            ? value.color.trim()
            : DEFAULT_BOARD_BACKGROUND.color,
        imageUrl,
        dim: clamp(value.dim, 0, 80, DEFAULT_BOARD_BACKGROUND.dim),
        blur: clamp(value.blur, 0, 16, DEFAULT_BOARD_BACKGROUND.blur),
    };
};

export const loadBoardBackground = (): BoardBackground => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_BOARD_BACKGROUND;
        return normalizeBackground(safeJsonParse(raw, null));
    } catch {
        // Private-mode Safari throws on read. A backdrop is never worth a broken board.
        return DEFAULT_BOARD_BACKGROUND;
    }
};

/** `false` when the browser refused to store it — the caller must say so rather than pretend. */
export const saveBoardBackground = (bg: BoardBackground): boolean => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bg));
        return true;
    } catch {
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────────────────────────────────────────

/** Roughly 1.6 MB of characters — comfortably inside a 5 MB `localStorage` budget. */
const MAX_STORED_CHARS = 1_600_000;

/** Size / quality steps, tried in order until one fits the budget. */
const ENCODE_STEPS: ReadonlyArray<readonly [number, number]> = [
    [1920, 0.78], [1600, 0.7], [1280, 0.62], [1024, 0.55],
];

/**
 * Read a picked image and re-encode it small enough to store. Resolves to a `data:` URL; rejects
 * with a message meant for the user, not for a log.
 */
export const fileToWallpaperDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('That file is not an image. Pick a JPG, PNG or WebP.'));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('That file could not be read.'));
        reader.onload = () => {
            const source = String(reader.result || '');
            const image = new Image();
            image.onerror = () => reject(new Error('That image could not be decoded.'));
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(source);
                    return;
                }
                const longest = Math.max(image.naturalWidth, image.naturalHeight) || 1;
                let smallest = source;
                for (const [edge, quality] of ENCODE_STEPS) {
                    const scale = Math.min(1, edge / longest);
                    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    const encoded = canvas.toDataURL('image/jpeg', quality);
                    smallest = encoded;
                    if (encoded.length <= MAX_STORED_CHARS) break;
                }
                if (smallest.length > MAX_STORED_CHARS) {
                    reject(new Error('That image is too large to keep. Try a smaller one, or paste an image link instead.'));
                    return;
                }
                resolve(smallest);
            };
            image.src = source;
        };
        reader.readAsDataURL(file);
    });

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseBoardBackground {
    background: BoardBackground;
    /** Applies immediately; returns `false` if the browser refused to remember it. */
    setBackground: (next: BoardBackground) => boolean;
    resetBackground: () => void;
}

export const useBoardBackground = (): UseBoardBackground => {
    const [background, setState] = useState<BoardBackground>(loadBoardBackground);

    const setBackground = useCallback((next: BoardBackground) => {
        const value = normalizeBackground(next);
        setState(value);
        return saveBoardBackground(value);
    }, []);

    const resetBackground = useCallback(() => {
        setState(DEFAULT_BOARD_BACKGROUND);
        saveBoardBackground(DEFAULT_BOARD_BACKGROUND);
    }, []);

    return { background, setBackground, resetBackground };
};
