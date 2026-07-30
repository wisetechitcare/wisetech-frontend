/**
 * GitHub / VS Code dark palette — THE single source of truth for every dark-mode colour.
 *
 * The app previously carried five competing dark palettes: the MUI theme and glass kit were
 * GitHub Primer (#0d1117 / #161b22 / #30363d), while the actual page canvas and chrome
 * (Metronic sass, premium-layout.css, GlobalSearch.css, glass.css) were a Metronic
 * purple-graphite family (#1c1c28, #16161f, #181824, #1b1b29, #2d2d3a). Dark mode therefore
 * looked like two different products stitched together.
 *
 * This module ends that. Every dark colour in the app — TypeScript *and* CSS — resolves from
 * the `GH_DARK` object below:
 *   • TS consumers import `GH_DARK` (wisetechTheme, theme/tokens glass.dark, tw/tokens DARK).
 *   • CSS consumers use `var(--gh-*)`; those variables are generated from `GH_DARK` by
 *     `ghDarkCssVars()` and stamped onto <html> by ColorModeProvider.
 * There is no second copy of any value to keep in sync — adding a tier here makes it available
 * to both layers at once.
 *
 * Palette basis: GitHub Primer "dark default", the same family VS Code's dark themes use —
 * a cool near-black canvas, flat raised surfaces (no washed-out greys), crisp mid-grey borders
 * that stay visible, and high-contrast foreground tiers.
 */
export const GH_DARK = {
  // ── Surfaces (deepest → most raised) ──
  /** Page background — the app canvas behind everything. */
  canvas: '#0d1117',
  /** Cards, modals, header, sidebar — the primary content surface. */
  surface: '#161b22',
  /** Menus, popovers, inputs, raised rows — one step above `surface`. */
  elevated: '#1c2128',

  // ── Borders ──
  /** Default border + MUI divider. Deliberately light enough to stay visible on `surface`. */
  border: '#30363d',
  /** Subtle inner separators (row dividers inside a card). */
  borderMuted: '#21262d',
  /** Emphasised border — hover/focus outlines on inputs and interactive rows. */
  borderStrong: '#3d444d',

  // ── Foreground tiers ──
  /** Primary text. */
  fg: '#e6edf3',
  /** Secondary text / muted labels. */
  fgMuted: '#7d8590',
  /** Tertiary text / placeholders / disabled. */
  fgSubtle: '#6e7681',

  // ── Accent ──
  /** Links, focus rings, selection. GitHub's dark accent — brighter than the light-mode navy,
   *  which is unreadable on a near-black canvas. */
  accent: '#2f81f7',

  // ── Interaction states (neutral overlays — tint-free so they work on any surface) ──
  hover: 'rgba(177,186,196,0.08)',
  selected: 'rgba(177,186,196,0.12)',
  /** Row fill for unselected list/option rows on a dark surface. */
  rowBg: 'rgba(177,186,196,0.06)',
  disabledBg: 'rgba(110,118,129,0.12)',

  // ── Elevation ──
  /** Shadows are near-black, not the light theme's blue-grey — a blue-tinted shadow on a
   *  near-black canvas reads as haze rather than depth. */
  shadowSm: '0 1px 0 rgba(1,4,9,0.60)',
  shadowMd: '0 8px 24px rgba(1,4,9,0.55)',
  shadowLg: '0 16px 48px rgba(1,4,9,0.65)',
  /** Full-screen dialog scrim. */
  scrim: 'rgba(1,4,9,0.70)',
} as const;

export type GhDarkToken = keyof typeof GH_DARK;

/** camelCase token name → `--gh-kebab-case` custom property name. */
const cssVarName = (token: string) => `--gh-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * The CSS custom properties for dark mode, derived from `GH_DARK` — never hand-written.
 * ColorModeProvider stamps these on <html> in dark and removes them in light, which is what
 * lets plain stylesheets (premium-layout.css, GlobalSearch.css, glass.css, …) theme themselves
 * with `var(--gh-surface)` instead of hardcoding another copy of the palette.
 *
 * Naming: `canvas` → `--gh-canvas`, `borderMuted` → `--gh-border-muted`, etc.
 */
export function ghDarkCssVars(): Record<string, string> {
  return Object.fromEntries(Object.entries(GH_DARK).map(([k, v]) => [cssVarName(k), v]));
}

/** The var names alone — used to clean up when switching back to light. */
export function ghDarkCssVarNames(): string[] {
  return Object.keys(GH_DARK).map(cssVarName);
}
