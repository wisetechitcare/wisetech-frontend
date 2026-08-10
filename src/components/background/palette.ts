/**
 * Theme adapter.
 *
 * Reads the mode the app has already decided on and returns the numeric colours the canvas
 * renderer needs. It does NOT decide the theme, subscribe to media queries, or store
 * anything — ColorModeProvider is the single source of truth for light/dark, and it
 * broadcasts by stamping `<html>` with `.dark` and `data-bs-theme`. This just listens.
 *
 * Colours are RGB triplets rather than CSS strings because the renderer interpolates between
 * the resting colour and the accent per-dot, per-frame. Parsing a colour string every frame
 * for every dot would be the single most expensive thing in the loop.
 */

export type Rgb = readonly [number, number, number];

export interface DotPalette {
  /**
   * Canvas fill, or null for transparent.
   *
   * NULL, and that is deliberate: the workspace SHELL paints the page colour in both themes
   * (see shellTokens SHELL_HOME / SHELL_DOCKED). One surface owns it, so Home and the docked
   * workspace cannot drift apart — which is exactly what happened when neither of them did.
   * The dots and wash are drawn with alpha over whatever the shell has painted.
   */
  background: string | null;
  /** Resting dot colour. */
  dot: Rgb;
  /** Resting dot alpha — low enough to be texture rather than content. */
  dotAlpha: number;
  /** Colour a dot reaches at full cursor proximity. */
  hot: Rgb;
  /** Alpha at full proximity. */
  hotAlpha: number;
  /**
   * The soft radial wash behind the dots, painted into the same canvas.
   *
   * It lives here rather than as a CSS layer because the canvas is now opaque and would
   * cover any element beneath it. One surface, one paint order, nothing to keep in sync.
   */
  glow: Rgb;
  /**
   * Wash strength at its centre. ZERO in dark on purpose: a blue bloom is what made the dark
   * theme read as navy rather than as the flat, neutral GitHub/VS Code dark it should be.
   * Light keeps a faint one because a pure flat light canvas looks unfinished.
   */
  glowAlpha: number;
}

/** Light: slate dots on the app's light canvas, warming to the brand blue. */
const LIGHT: DotPalette = {
  background: null,
  dot: [100, 116, 139],   // slate-500
  dotAlpha: 0.22,
  hot: [37, 99, 235],     // blue-600
  hotAlpha: 0.85,
  glow: [37, 99, 235],    // blue-600
  glowAlpha: 0.07,
};

/**
 * Dark: low-opacity white on the near-black canvas, warming to a lighter blue.
 * The accent lightens rather than deepens because the brand navy is unreadable on
 * `#0d1117` — the same reason theme/githubDark.ts brightens its accent.
 */
const DARK: DotPalette = {
  background: null,
  dot: [226, 232, 240],   // slate-200
  dotAlpha: 0.10,
  hot: [96, 165, 250],    // blue-400
  hotAlpha: 0.78,
  glow: [56, 116, 203],
  glowAlpha: 0,
};

export const readPalette = (): DotPalette => {
  const root = document.documentElement;
  const dark = root.classList.contains('dark') || root.getAttribute('data-bs-theme') === 'dark';
  return dark ? DARK : LIGHT;
};

/**
 * Calls back whenever the app's theme signal changes. Returns an unsubscribe function.
 *
 * A MutationObserver on the two attributes ColorModeProvider writes, NOT a
 * `prefers-color-scheme` media query — the app's toggle is authoritative and can disagree
 * with the OS. This is the same rule the rest of the codebase follows.
 */
export function observeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-bs-theme'],
  });
  return () => observer.disconnect();
}
