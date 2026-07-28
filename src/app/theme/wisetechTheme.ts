import { createTheme, Theme } from '@mui/material/styles';
import { T } from '@app/modules/common/components/ui/tokens';

/**
 * Branded Material UI theme — single source of truth for the app's MUI look.
 * `makeWisetechTheme(mode)` returns a light or dark variant so the glass kit and MUI components
 * can respond to the reusable ColorModeProvider (see ui/ColorMode.tsx). The dark variant powers
 * the frosted-glass dark material.
 *
 * NOTE: applied through <ThemeProvider> only (no <CssBaseline/>) so it does not disturb the
 * Metronic/Bootstrap global styles used by the rest of the app.
 */
/**
 * GitHub Primer "dark default" surface palette — the app-wide dark benchmark. Cool near-black
 * canvas, slightly lighter surface for cards/modals, an elevated tone for overlays/menus, crisp
 * mid-grey borders, and high-contrast foreground text. Kept here as the single source so the MUI
 * theme, glass tokens, and tw kit all resolve to the same GitHub look.
 */
export const GH_DARK = {
  canvas: '#0d1117',     // page background (bg default)
  surface: '#161b22',    // cards / modals / paper
  elevated: '#1c2128',   // menus / popovers / raised rows
  border: '#30363d',     // default border / divider
  borderMuted: '#21262d',// subtle inner separators
  fg: '#e6edf3',         // primary text
  fgMuted: '#7d8590',    // secondary text
  fgSubtle: '#6e7681',   // tertiary / placeholder
  accent: '#2f81f7',     // links / focus / selection accent
  hover: 'rgba(177,186,196,0.08)',
  selected: 'rgba(177,186,196,0.12)',
} as const;

export function makeWisetechTheme(mode: 'light' | 'dark' = 'light'): Theme {
  const dark = mode === 'dark';
  const line = dark ? GH_DARK.border : T.color.line;
  const menuPaper = dark ? GH_DARK.elevated : T.color.surface;
  return createTheme({
    palette: {
      mode,
      primary: { main: T.color.brand, dark: T.color.brandHover, light: T.color.brandSoft, contrastText: '#ffffff' },
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
        ? { action: { hover: GH_DARK.hover, selected: GH_DARK.selected, disabledBackground: 'rgba(110,118,129,0.12)' } }
        : {}),
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: T.font.family,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      // The headline unification — every MUI tooltip becomes the dark premium bubble.
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            backgroundColor: T.color.ink,
            color: '#ffffff',
            fontFamily: T.font.family,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: 0.2,
            padding: '5px 9px',
            borderRadius: 7,
            boxShadow: T.shadow.pop,
          },
          arrow: { color: T.color.ink },
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
          paper: { borderRadius: 12, backgroundColor: menuPaper, border: `1px solid ${line}`, boxShadow: T.shadow.pop },
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
