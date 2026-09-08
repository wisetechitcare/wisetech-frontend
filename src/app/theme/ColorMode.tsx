import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { makeWisetechTheme } from './wisetechTheme';
import { ghDarkCssVars, ghDarkCssVarNames } from './githubDark';
import {
  DEFAULT_APPEARANCE,
  normalizeBrand,
  announceSurfaceChange,
  readAppearance,
  readableOn,
  resolveMode,
  shade,
  writeAppearance,
  type AppearanceSettings,
  type BrandPalette,
  type ColorPreference,
  type SurfaceStyle,
  type ThemeMode,
} from './appearance';

/**
 * Reusable MUI color-mode system. Wraps the app once (in App.tsx) and provides the branded
 * light/dark theme to every MUI component + the glass kit (which reads `palette.mode`). Persists
 * the choice to localStorage. Defaults to LIGHT so nothing changes until a user opts in via
 * <ColorModeToggle/> — a full app-wide dark rollout still needs the hardcoded-color migration, but
 * this makes the infrastructure + glass surfaces + MUI screens correctly dark-capable today.
 *
 *   const { mode, toggle } = useColorMode();
 *   <ColorModeToggle />   // drop-in sun/moon button
 */

type Mode = ThemeMode;
export type { ColorPreference, SurfaceStyle, BrandPalette } from './appearance';

const prefersDark = (): boolean => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};

interface ColorModeCtx {
  /** The resolved mode everything paints from. */
  mode: Mode;
  /** What the user actually chose, `system` included. */
  preference: ColorPreference;
  /** The four brand roles. */
  brand: BrandPalette;
  /** Frosted or opaque. */
  surface: SurfaceStyle;
  setPreference: (p: ColorPreference) => void;
  setBrand: (b: BrandPalette) => void;
  setSurface: (s: SurfaceStyle) => void;
  /** Back to the shipped navy, glass, light. */
  reset: () => void;
  setMode: (m: Mode) => void;
  toggle: () => void;
}
const ColorModeContext = createContext<ColorModeCtx | null>(null);

export function useColorMode(): ColorModeCtx {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within <ColorModeProvider>');
  return ctx;
}

/** The app-wide appearance engine. `useColorMode` is kept as the historical name. */
export const useAppearance = useColorMode;

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(readAppearance);
  const [systemDark, setSystemDark] = useState(prefersDark);

  const { preference, brand, surface } = settings;

  // Follow the OS while — and only while — the user asked us to. Registered
  // unconditionally so the answer is already current the moment they switch to
  // `system`, rather than lagging until the next OS change.
  useLayoutEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return; }
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mode: Mode = resolveMode(preference, systemDark);

  const commit = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeAppearance(next);
      return next;
    });
  }, []);

  const setPreference = useCallback((p: ColorPreference) => commit({ preference: p }), [commit]);
  const setBrand = useCallback((b: BrandPalette) => commit({ brand: normalizeBrand(b) }), [commit]);
  const setSurface = useCallback((s: SurfaceStyle) => commit({ surface: s }), [commit]);
  const reset = useCallback(() => commit(DEFAULT_APPEARANCE), [commit]);

  // Unchanged for existing callers: setting an explicit mode pins it.
  const setMode = useCallback((m: Mode) => commit({ preference: m }), [commit]);

  // Flips the RESOLVED mode and pins the result, so one tap from `system` lands
  // on the opposite of what you are looking at — never on the same shade again.
  const toggle = useCallback(() => {
    setSettings((prev) => {
      const resolved = resolveMode(prev.preference, prefersDark());
      const next = { ...prev, preference: (resolved === 'dark' ? 'light' : 'dark') as ColorPreference };
      writeAppearance(next);
      return next;
    });
  }, []);

  // Single source of truth for the whole app's theme. Broadcast the mode to every styling system
  // so there is no split-brain: MUI reads `palette.mode` (via ThemeProvider below), Bootstrap/
  // Metronic chrome reads `data-bs-theme`, the Tailwind (tw/) kit reads the `.dark` class /
  // `data-theme`, and native form controls/scrollbars read `color-scheme`. Default is light, so
  // nothing changes for existing users until they opt into dark.
  //
  // The `--gh-*` custom properties are the CSS half of that broadcast: they carry the GitHub dark
  // palette (theme/githubDark.ts) into plain stylesheets, so premium-layout.css & friends theme
  // themselves from the SAME object the MUI theme uses instead of hardcoding their own hexes.
  // Layout effect, not effect — it runs before paint, so there is no light-flash frame on toggle.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-bs-theme', mode);
    root.setAttribute('data-theme', mode);
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;

    if (mode === 'dark') {
      for (const [name, value] of Object.entries(ghDarkCssVars())) root.style.setProperty(name, value);
    } else {
      for (const name of ghDarkCssVarNames()) root.style.removeProperty(name);
    }

    // Surface treatment travels the same way as the mode: one attribute on the
    // root, so the kit reads it once instead of every call site threading a prop.
    root.setAttribute('data-surface', surface);
    announceSurfaceChange();

    // The brand, as CSS custom properties, for the stylesheets that cannot reach
    // the MUI theme. Derived shades ship alongside the four picks so a hover or
    // a tint is never invented per-screen from a raw hex.
    root.style.setProperty('--wt-brand', brand.primary);
    root.style.setProperty('--wt-brand-hover', shade(brand.primary, -0.15));
    root.style.setProperty('--wt-brand-soft', shade(brand.primary, 0.85));
    root.style.setProperty('--wt-brand-on', readableOn(brand.primary));
    root.style.setProperty('--wt-secondary', brand.secondary);
    root.style.setProperty('--wt-accent', brand.accent);
    root.style.setProperty('--wt-ink', brand.ink);

    // Keep Metronic's own keys in sync so its init() doesn't clobber the attribute on reload.
    try {
      localStorage.setItem('kt_theme_mode_value', mode);
      localStorage.setItem('kt_theme_mode_menu', mode);
    } catch { /* private mode */ }
  }, [mode, surface, brand]);

  const theme = useMemo(() => makeWisetechTheme(mode, brand), [mode, brand]);
  const ctx = useMemo(
    () => ({ mode, preference, brand, surface, setPreference, setBrand, setSurface, reset, setMode, toggle }),
    [mode, preference, brand, surface, setPreference, setBrand, setSurface, reset, setMode, toggle],
  );

  return (
    <ColorModeContext.Provider value={ctx}>
      {/* No CssBaseline — keep Metronic/Bootstrap globals intact (as the app has always done). */}
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}

/** Drop-in sun/moon toggle button. Place it anywhere inside <ColorModeProvider>. */
export function ColorModeToggle(props: IconButtonProps) {
  const { mode, toggle } = useColorMode();
  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={toggle} aria-label="Toggle color mode" {...props}>
        <KTIcon iconName={mode === 'dark' ? 'night-day' : 'moon'} className="fs-3" />
      </IconButton>
    </Tooltip>
  );
}
