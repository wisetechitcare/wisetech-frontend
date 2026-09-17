/**
 * The app-wide APPEARANCE engine — three orthogonal axes that decide how the
 * whole product looks, independent of the status-colour engine in Appearance
 * Settings.
 *
 * The two are deliberately separate and answer different questions:
 *
 *   this engine  →  how the PRODUCT looks   (mode, brand, surface treatment)
 *   status colours →  what a DATUM means     (present is green, absent is red)
 *
 * Mixing them is how a brand refresh ends up repainting "absent", so they keep
 * separate storage, separate screens and separate vocabularies.
 *
 * ── The three axes ────────────────────────────────────────────────────────
 *
 *   1. MODE     light · dark · system
 *   2. BRAND    four colours, taken from the logo
 *   3. SURFACE  glass · material
 *
 * They are orthogonal on purpose: every combination is valid, so the switches
 * can be reasoned about one at a time instead of as twelve named "themes".
 *
 * ── On surface ────────────────────────────────────────────────────────────
 * `material` is NOT a second design system. It is the same kit with the frost
 * turned off: opaque surfaces and a flat elevation instead of a translucent
 * blur. One component tree, one set of components, a parameter — which is the
 * only version of "pick your UI style" that does not double the code and then
 * drift. Screens that predate the kit follow neither setting; they carry their
 * own hardcoded colours until they are migrated.
 */

export type ThemeMode = 'light' | 'dark';
export type ColorPreference = ThemeMode | 'system';
export type SurfaceStyle = 'glass' | 'material';

/**
 * Four roles, because four is what a logo actually yields and what a UI needs:
 * the thing you click, the thing beside it, the thing that must catch the eye,
 * and the ink everything is read against.
 */
export interface BrandPalette {
  /** Primary actions, active nav, focus rings. */
  primary: string;
  /** Secondary actions and supporting accents. */
  secondary: string;
  /** Highlights that must stand out against both of the above. */
  accent: string;
  /** Headings and high-emphasis text. */
  ink: string;
}

export interface AppearanceSettings {
  preference: ColorPreference;
  brand: BrandPalette;
  surface: SurfaceStyle;
}

/** The current WiseTech brand — the navy the app already ships. */
export const DEFAULT_BRAND: BrandPalette = {
  primary: '#1E3A8A',
  secondary: '#0F766E',
  accent: '#D97706',
  ink: '#0F172A',
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  preference: 'light',
  brand: DEFAULT_BRAND,
  surface: 'glass',
};

/** Starting points, so nobody has to invent four coordinated colours from nothing. */
export const BRAND_PRESETS: ReadonlyArray<{ id: string; label: string; brand: BrandPalette }> = [
  { id: 'wisetech', label: 'WiseTech Navy', brand: DEFAULT_BRAND },
  { id: 'teal', label: 'Deep Teal', brand: { primary: '#0F766E', secondary: '#1E3A8A', accent: '#EA580C', ink: '#0F172A' } },
  { id: 'indigo', label: 'Indigo', brand: { primary: '#4338CA', secondary: '#7C3AED', accent: '#DB2777', ink: '#111827' } },
  { id: 'slate', label: 'Graphite', brand: { primary: '#334155', secondary: '#0EA5E9', accent: '#F59E0B', ink: '#020617' } },
];

export const STORAGE_KEY = 'wt-appearance';
/** The pre-existing mode key. Read on migration so nobody's dark mode resets. */
export const LEGACY_MODE_KEY = 'wt-mui-color-mode';

export const isHex6 = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

const isPreference = (v: unknown): v is ColorPreference => v === 'light' || v === 'dark' || v === 'system';
const isSurface = (v: unknown): v is SurfaceStyle => v === 'glass' || v === 'material';

/** Only the roles that are valid hex survive; the rest fall back per-key. */
export function normalizeBrand(raw: unknown): BrandPalette {
  const b = (raw ?? {}) as Partial<Record<keyof BrandPalette, unknown>>;
  return {
    primary: isHex6(b.primary) ? b.primary : DEFAULT_BRAND.primary,
    secondary: isHex6(b.secondary) ? b.secondary : DEFAULT_BRAND.secondary,
    accent: isHex6(b.accent) ? b.accent : DEFAULT_BRAND.accent,
    ink: isHex6(b.ink) ? b.ink : DEFAULT_BRAND.ink,
  };
}

/**
 * Read the saved settings, tolerating anything.
 *
 * Falls back per FIELD rather than wholesale: one bad colour written by an old
 * build should not silently reset someone's dark mode too.
 */
export function readAppearance(): AppearanceSettings {
  let stored: unknown;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { stored = null; }

  const s = (stored ?? {}) as Partial<AppearanceSettings>;

  // Migration: before this engine existed, mode lived alone under its own key.
  let preference: ColorPreference = DEFAULT_APPEARANCE.preference;
  if (isPreference(s.preference)) {
    preference = s.preference;
  } else {
    try {
      const legacy = localStorage.getItem(LEGACY_MODE_KEY);
      if (isPreference(legacy)) preference = legacy;
    } catch { /* private mode */ }
  }

  return {
    preference,
    brand: normalizeBrand(s.brand),
    surface: isSurface(s.surface) ? s.surface : DEFAULT_APPEARANCE.surface,
  };
}

export function writeAppearance(next: AppearanceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Keep the legacy key in step: Metronic's own boot script and the previous
    // provider both still read it, and a stale value there would flash the
    // wrong mode before React mounts.
    localStorage.setItem(LEGACY_MODE_KEY, next.preference);
  } catch { /* private mode — the session still works, it just won't persist */ }
}

/** Resolve `system` against the OS. Everything paints from the result, never from the preference. */
export function resolveMode(preference: ColorPreference, systemDark: boolean): ThemeMode {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

/** Relative luminance → the text colour that actually contrasts with a brand fill. */
export function readableOn(hex: string): string {
  if (!isHex6(hex)) return '#ffffff';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#0f172a' : '#ffffff';
}

/** Mix toward white (`amount` > 0) or black (< 0). Derives hover/soft variants from one pick. */
export function shade(hex: string, amount: number): string {
  if (!isHex6(hex)) return hex;
  const to = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * t).toString(16).padStart(2, '0');
  });
  return `#${ch.join('')}`;
}

/**
 * The current surface treatment, read from the root attribute.
 *
 * A plain read rather than a hook because the consumers are style FUNCTIONS —
 * `glassSx` is called during render, not inside a component — and because the
 * attribute is the same broadcast channel the mode already uses. The provider
 * stamps it in a layout effect, so it is correct before the first paint.
 */
export function currentSurface(): SurfaceStyle {
  try {
    return document.documentElement.getAttribute('data-surface') === 'material' ? 'material' : 'glass';
  } catch {
    return 'glass';
  }
}

export const isMaterial = (): boolean => currentSurface() === 'material';

/**
 * Surface changes as an external store.
 *
 * The Tailwind twin does not consume the MUI theme, so a context change never
 * reaches it — without this, flipping to Material repainted the MUI kit and
 * left every tw card frosted until something else happened to re-render it.
 * One event, `useSyncExternalStore` on the other end, and both kits turn over
 * together.
 */
const SURFACE_EVENT = 'wt-surface-change';

export function announceSurfaceChange(): void {
  try { window.dispatchEvent(new CustomEvent(SURFACE_EVENT)); } catch { /* non-DOM */ }
}

export function subscribeSurface(onChange: () => void): () => void {
  try {
    window.addEventListener(SURFACE_EVENT, onChange);
    return () => window.removeEventListener(SURFACE_EVENT, onChange);
  } catch {
    return () => undefined;
  }
}
