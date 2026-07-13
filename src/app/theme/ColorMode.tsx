import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { makeWisetechTheme } from './wisetechTheme';

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
