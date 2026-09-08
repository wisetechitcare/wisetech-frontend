import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { makeWisetechTheme } from './wisetechTheme';
import { ghDarkCssVars, ghDarkCssVarNames } from './githubDark';

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

type Mode = 'light' | 'dark';

/**
 * What the USER chose. `system` defers to the OS and keeps following it, which
 * is different from having picked whatever the OS happens to say right now.
 *
 * Kept separate from `mode` — the RESOLVED light/dark that everything paints
 * from — because the two answer different questions and collapsing them is how
 * "follow my system" quietly becomes "pinned to light".
 */
export type ColorPreference = Mode | 'system';
const STORAGE_KEY = 'wt-mui-color-mode';

const prefersDark = (): boolean => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};

const resolve = (pref: ColorPreference): Mode => (pref === 'system' ? (prefersDark() ? 'dark' : 'light') : pref);

interface ColorModeCtx {
  /** The resolved mode everything paints from. */
  mode: Mode;
  /** What the user actually chose, `system` included. */
  preference: ColorPreference;
  setPreference: (p: ColorPreference) => void;
  setMode: (m: Mode) => void;
  toggle: () => void;
}
const ColorModeContext = createContext<ColorModeCtx | null>(null);

export function useColorMode(): ColorModeCtx {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within <ColorModeProvider>');
  return ctx;
}

export function ColorModeProvider({ children, defaultMode = 'light' }: { children: React.ReactNode; defaultMode?: ColorPreference }) {
  const [preference, setPreferenceState] = useState<ColorPreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch { /* SSR / privacy mode */ }
    return defaultMode;
  });

  const [systemDark, setSystemDark] = useState(prefersDark);

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

  const mode: Mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  const setPreference = useCallback((p: ColorPreference) => {
    setPreferenceState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch { /* ignore */ }
  }, []);

  // Unchanged for existing callers: setting an explicit mode pins it.
  const setMode = useCallback((m: Mode) => setPreference(m), [setPreference]);

  // Flips the RESOLVED mode and pins the result, so one tap from `system` lands
  // on the opposite of what you are looking at — never on the same shade again.
  const toggle = useCallback(() => {
    setPreferenceState((prev) => {
      const next: Mode = resolve(prev) === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
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

    // Keep Metronic's own keys in sync so its init() doesn't clobber the attribute on reload.
    try {
      localStorage.setItem('kt_theme_mode_value', mode);
      localStorage.setItem('kt_theme_mode_menu', mode);
    } catch { /* private mode */ }
  }, [mode]);

  const theme = useMemo(() => makeWisetechTheme(mode), [mode]);
  const ctx = useMemo(
    () => ({ mode, preference, setPreference, setMode, toggle }),
    [mode, preference, setPreference, setMode, toggle],
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
