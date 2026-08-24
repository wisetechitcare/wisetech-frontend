/**
 * Theme-aware surface tokens for the Apply-Leave modal.
 *
 * ── The defect this fixes ────────────────────────────────────────────────────────────────────
 * The app has a real, user-toggleable dark mode: ColorModeProvider persists the choice and feeds
 * makeWisetechTheme, and the glass kit reads palette.mode throughout. ApplyLeave read none of it —
 * every surface, rule and text colour was a hardcoded light hex — so the leave modal stayed white
 * while the rest of the app went dark. That is also what the `no-restricted-syntax` lint rule was
 * reporting on the extracted files ("this stays the same in dark mode").
 *
 * ── The rule for this file ───────────────────────────────────────────────────────────────────
 * LIGHT MUST NOT CHANGE. Every light value below is the exact hex the modal already used, so the
 * light rendering stays pixel-identical; dark is purely additive. The modal is an already-designed
 * screen — the job is to make it survive a theme switch, not to restyle it.
 *
 * Brand colours (ACCENT, RED, GREEN, AMBER) stay in ./tokens: they are identity, not surface, and
 * the leave-type colours are admin-configurable, so they must not be theme-swapped behind the
 * admin's back. Only the neutrals move.
 */
import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

export interface LeavePalette {
    /** Card and cell background. */
    surface: string;
    /** Slightly raised/inset panels inside a card. */
    surfaceAlt: string;
    /** Recessed strips — the summary rail, the legend footer. */
    surfaceSunken: string;
    /** Primary text. */
    ink: string;
    /** Secondary text — labels, helper copy. */
    inkMuted: string;
    /** Tertiary text — eyebrow captions, unit suffixes. */
    inkFaint: string;
    /** Unavailable days, disabled controls. */
    inkDisabled: string;
    /** Default hairline. */
    line: string;
    /** Softer divider inside a card. */
    lineSoft: string;
    /** Overlay scrim behind the modal. */
    scrim: string;
    /** Tooltip background — deliberately inverted against the surface. */
    tooltipBg: string;
    tooltipInk: string;
    /** Card shadow. Flat in dark, where elevation reads as a lighter surface instead. */
    shadow: string;
    /** True when the viewer is in dark mode; for the few places that need to branch. */
    dark: boolean;
}

const LIGHT: LeavePalette = {
    surface: '#fff',
    surfaceAlt: '#fbfbfc',
    surfaceSunken: '#f7f8f9',
    ink: '#2b2e30',
    inkMuted: '#727577',
    inkFaint: '#8b8e91',
    inkDisabled: '#a6a8ab',
    line: '#e6e6e8',
    lineSoft: '#f0f0f1',
    scrim: 'rgba(15,23,42,.45)',
    tooltipBg: '#2b2e30',
    tooltipInk: '#fff',
    shadow: '0 18px 48px rgba(43,46,48,.16)',
    dark: false,
};

/**
 * Dark values are chosen to preserve the light design's CONTRAST RELATIONSHIPS rather than to
 * invert its hexes: the same number of steps between surface and ink, and the same ordering of
 * ink / inkMuted / inkFaint / inkDisabled, so type hierarchy reads identically in both themes.
 */
const DARK: LeavePalette = {
    surface: '#1b2027',
    surfaceAlt: '#212832',
    surfaceSunken: '#161a20',
    ink: '#e8eaed',
    inkMuted: '#a8afb8',
    inkFaint: '#868d96',
    inkDisabled: '#5b626b',
    line: '#2e353f',
    lineSoft: '#262c35',
    scrim: 'rgba(0,0,0,.62)',
    // Inverted against the dark surface for the same reason it is dark on light: a tooltip must
    // read as an overlay, not as another panel.
    tooltipBg: '#e8eaed',
    tooltipInk: '#1b2027',
    shadow: '0 18px 48px rgba(0,0,0,.5)',
    dark: true,
};

/**
 * Resolve the modal's neutrals for the viewer's current theme.
 *
 * Memoised on the mode alone — the palettes are constants, so this returns a stable object and does
 * not defeat the React.memo on LeaveCalendar, which compares its props shallowly.
 */
export function useLeavePalette(): LeavePalette {
    const mode = useTheme().palette.mode;
    return useMemo(() => (mode === 'dark' ? DARK : LIGHT), [mode]);
}

/** Non-hook access, for the handful of module-scope style helpers that cannot call a hook. */
export const leavePalette = (dark: boolean): LeavePalette => (dark ? DARK : LIGHT);
