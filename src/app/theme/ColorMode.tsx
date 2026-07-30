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
const STORAGE_KEY = 'wt-mui-color-mode';

interface ColorModeCtx { mode: Mode; setMode: (m: Mode) => void; toggle: () => void }
const ColorModeContext = createContext<ColorModeCtx | null>(null);

export function useColorMode(): ColorModeCtx {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within <ColorModeProvider>');
  return ctx;
}

export function ColorModeProvider({ children, defaultMode = 'light' }: { children: React.ReactNode; defaultMode?: Mode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* SSR / privacy mode */ }
    return defaultMode;
  });

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => setModeState((prev) => {
    const next = prev === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    return next;
  }), []);

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
  const ctx = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

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
