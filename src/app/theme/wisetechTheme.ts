import { createTheme } from '@mui/material/styles';
import { T } from '@app/modules/common/components/ui/tokens';

/**
 * Branded Material UI theme — single source of truth for the app's MUI look.
 * Encodes the brand design tokens so every MUI component (Tooltip, Button,
 * Menu, Chip, …) is on-brand and consistent app-wide via one theme.
 *
 * NOTE: applied through <ThemeProvider> only (no <CssBaseline/>) so it does not
 * disturb the Metronic/Bootstrap global styles used by the rest of the app.
 */
export const wisetechTheme = createTheme({
  palette: {
    primary: { main: T.color.brand, dark: T.color.brandHover, light: T.color.brandSoft, contrastText: '#ffffff' },
    secondary: { main: T.color.accent, contrastText: '#ffffff' },
    error: { main: T.color.danger },
    success: { main: T.color.success },
    warning: { main: T.color.warning },
    info: { main: T.color.indigo },
    text: { primary: T.color.ink, secondary: T.color.inkSoft },
    divider: T.color.line,
    background: { paper: T.color.surface, default: T.color.panel },
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
        paper: { borderRadius: 12, border: `1px solid ${T.color.line}`, boxShadow: T.shadow.pop },
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

export default wisetechTheme;
