/**
 * App-wide light/dark surface kit — the shared language for M3 picker sheets,
 * popovers, and accent washes.
 *
 * Consume from `makeWisetechTheme` (MUI component overrides) AND from custom
 * dialogs (`TimePickerField`, `FiscalYearRangeField`) so both paths paint from
 * one source. Dark values resolve through {@link GH_DARK}; light through the
 * active MUI palette / kit tokens.
 */
import { alpha, type CSSObject, type Theme } from '@mui/material/styles';
import { GH_DARK } from './githubDark';

/** M3 emphasised easings — dialog enter / exit / month slide. */
export const M3_MOTION = {
  easeIn: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  easeOut: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  easeSlide: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durIn: 300,
  durOut: 200,
  durSlide: 380,
} as const;

export const isDarkMode = (theme: Theme): boolean => theme.palette.mode === 'dark';

/**
 * Solid elevated sheet (picker dialogs, custom M3 modals).
 * Prefer this over translucent white washes — those ghost over glass parent modals.
 */
/**
 * Solid elevated sheet tokens — plain {@link CSSObject} so the same helper can
 * feed both `sx` props and MUI `styleOverrides` (SxProps unions break the latter).
 */
export function sheetSx(theme: Theme): CSSObject {
  const dark = isDarkMode(theme);
  return {
    backgroundImage: 'none',
    backgroundColor: dark ? GH_DARK.elevated : theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: dark ? GH_DARK.shadowMd : '0 24px 64px -12px rgba(0,0,0,0.38)',
  };
}

/** Full-screen dialog scrim — stronger in dark so the sheet separates from the canvas. */
export function scrimSx(theme: Theme): CSSObject {
  return {
    backgroundColor: isDarkMode(theme) ? GH_DARK.scrim : 'rgba(0,0,0,0.32)',
  };
}

/** Soft fill behind segmented caps / range rails. Tracks ink so it works in both modes. */
export function neutralWash(theme: Theme, strength: 'soft' | 'mid' = 'soft'): string {
  const dark = isDarkMode(theme);
  if (strength === 'mid') return alpha(theme.palette.text.primary, dark ? 0.14 : 0.08);
  return alpha(theme.palette.text.primary, dark ? 0.12 : 0.06);
}

/** Accent wash for range rails / selected wells. */
export function accentWash(theme: Theme, accent: string, strength: 'soft' | 'mid' = 'soft'): string {
  const dark = isDarkMode(theme);
  if (strength === 'mid') return alpha(accent, dark ? 0.32 : 0.18);
  return alpha(accent, dark ? 0.28 : 0.14);
}

/** Ink on a solid accent fill — always readable in light and dark. */
export const onAccent = (theme: Theme, accent: string): string =>
  theme.palette.getContrastText(accent);

/** Native &lt;input&gt; colours that don't rely on MUI token path resolution. */
export function nativeFieldColors(theme: Theme, accent: string) {
  const dark = isDarkMode(theme);
  return {
    color: theme.palette.text.primary,
    caretColor: accent,
    bgcolor: dark ? alpha(GH_DARK.fg, 0.06) : neutralWash(theme),
    border: `1px solid ${theme.palette.divider}`,
    placeholder: theme.palette.text.disabled,
    focusRing: alpha(accent, dark ? 0.35 : 0.18),
  };
}
