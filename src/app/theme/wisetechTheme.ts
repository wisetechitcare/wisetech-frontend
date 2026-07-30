import { createTheme, Theme } from '@mui/material/styles';
import { T } from '@app/modules/common/components/ui/tokens';
import { GH_DARK } from './githubDark';

/**
 * Branded Material UI theme — single source of truth for the app's MUI look.
 * `makeWisetechTheme(mode)` returns a light or dark variant so the glass kit and MUI components
 * can respond to the reusable ColorModeProvider (see ui/ColorMode.tsx). The dark variant powers
 * the frosted-glass dark material.
 *
 * NOTE: applied through <ThemeProvider> only (no <CssBaseline/>) so it does not disturb the
 * Metronic/Bootstrap global styles used by the rest of the app.
 */
/** Re-exported for the many existing `import { GH_DARK } from './wisetechTheme'` call sites.
 *  The palette itself now lives in ./githubDark — one definition shared by MUI, the glass kit,
 *  the tw kit, and (via `--gh-*` custom properties) every plain stylesheet. */
export { GH_DARK };

export function makeWisetechTheme(mode: 'light' | 'dark' = 'light'): Theme {
  const dark = mode === 'dark';
  const line = dark ? GH_DARK.border : T.color.line;
  const menuPaper = dark ? GH_DARK.elevated : T.color.surface;
  // The light shadows are blue-grey (rgba(16,24,40,…)); on a near-black canvas they read as haze
  // rather than depth, so dark gets near-black elevation instead.
  const popShadow = dark ? GH_DARK.shadowMd : T.shadow.pop;
  return createTheme({
    palette: {
      mode,
      // Dark brightens the accent: the brand navy (#1E3A8A) sits almost on top of the #0d1117
      // canvas, so links, focus rings and selected states became unreadable. GitHub/VS Code do the
      // same — a brighter blue in dark. Branded CTAs keep their gradient (see ui/buttons.tsx), so
      // this only affects the states that need the contrast.
      primary: dark
        ? { main: GH_DARK.accent, dark: '#1f6feb', light: '#58a6ff', contrastText: '#ffffff' }
        : { main: T.color.brand, dark: T.color.brandHover, light: T.color.brandSoft, contrastText: '#ffffff' },
      secondary: { main: T.color.accent, contrastText: '#ffffff' },
      error: { main: T.color.danger },
      success: { main: T.color.success },
      warning: { main: T.color.warning },
      info: { main: T.color.indigo },
      text: dark
        ? { primary: GH_DARK.fg, secondary: GH_DARK.fgMuted, disabled: GH_DARK.fgSubtle }
        : { primary: T.color.ink, secondary: T.color.inkSoft },
      divider: line,
      background: dark
        ? { paper: GH_DARK.surface, default: GH_DARK.canvas }
        : { paper: T.color.surface, default: T.color.panel },
      ...(dark
        ? { action: { hover: GH_DARK.hover, selected: GH_DARK.selected, disabledBackground: GH_DARK.disabledBg } }
        : {}),
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: T.font.family,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      // The headline unification — every MUI tooltip becomes the dark premium bubble.
      // In dark mode the light-theme ink (#1B2230) is nearly the canvas colour, so the bubble
      // vanishes; there it becomes a bordered elevated surface (the GitHub/VS Code treatment).
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? GH_DARK.elevated : T.color.ink,
            color: dark ? GH_DARK.fg : '#ffffff',
            border: dark ? `1px solid ${GH_DARK.border}` : undefined,
            fontFamily: T.font.family,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: 0.2,
            padding: '5px 9px',
            borderRadius: 7,
            boxShadow: popShadow,
          },
          arrow: { color: dark ? GH_DARK.elevated : T.color.ink },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600, boxShadow: 'none' },
          containedPrimary: { '&:hover': { backgroundColor: T.color.brandHover } },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      // Menus / dropdowns (e.g. the shared ExportButton) — softer surface + radius.
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: 12, backgroundColor: menuPaper, border: `1px solid ${line}`, boxShadow: popShadow },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { fontFamily: T.font.family, fontSize: 13.5, borderRadius: 8, margin: '2px 6px' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontFamily: T.font.family, fontWeight: 600, borderRadius: 999 },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16 } },
      },
    },
  });
}

/** Default (light) branded theme — kept for existing imports. */
export const wisetechTheme = makeWisetechTheme('light');

export default wisetechTheme;
