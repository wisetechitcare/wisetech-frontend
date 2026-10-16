import { forwardRef } from 'react';
import { Button, ButtonProps, IconButton, IconButtonProps, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { titleCaseNode } from './text';
import { useIsDark } from './tw/useIsDark';

/**
 * Reusable button primitives for the premium UI kit — single source of truth for CTA physics.
 *
 * **Brand CTA (locked):** navy primary (`tone="primary"`) + white Cancel (`ghost`).
 * Sandwich Add Rule is the visual benchmark. Appearance may theme other chrome;
 * do **not** invent gold Cancel, yellow-on-navy primary, or a second button component.
 *
 * The recipe is the Meridian calendar's Create-Event button (CustomCalendar.premium.css
 * .mrd-createbtn / .mrd-btn--primary), generalized and re-tonable:
 *   • 180deg gradient to a darker shade of the same hue
 *   • triple shadow: crisp 1px + long soft colored glow + inset 1px white top-highlight ("glass" edge)
 *   • hover: -1px lift with a deeper glow · active: scale(.98) press
 *   • spring-ish easing cubic-bezier(.22,.61,.36,1)
 *
 * Recipe matrix:
 *   Create / Save / Submit / Add → `<WtButton>` (default primary)
 *   Cancel / secondary close     → `<WtButton ghost>`
 *   Header Add on gradient       → `<WtButton inverted>`
 *   Delete / destructive         → `<WtButton tone="danger">`
 *   Success confirm              → `<WtButton tone="success">`
 *   Adjacent toolbar CTAs        → `<WtButton flat>` or `size="small"`
 *   Icon-only                    → `WtIconButton` / `ActionIconButton` / `WtCloseButton`
 *   Dialog Cancel + Submit       → `GlassDialogActions` (not hand-rolled DialogActions)
 *
 * Usage:
 *   <WtButton tone="primary">Save</WtButton>
 *   <WtButton tone="danger" startIcon={...}>Delete</WtButton>
 *   <WtButton ghost>Cancel</WtButton>
 *   <WtIconButton title="Edit" color="#2563eb"><KTIcon iconName="pencil" className="fs-3" /></WtIconButton>
 */

export const MRD_EASE = 'cubic-bezier(.22,.61,.36,1)';

/**
 * Control density SSOT (modern SaaS mid-scale).
 *
 * - Default / row (`WT_CONTROL_HEIGHT` = 40): toolbars, list headers, most forms.
 * - Spacious (`WT_CONTROL_HEIGHT_MD` = 44): opt-in dialog forms via `size="md"` / `size="medium"`.
 *
 * Anything that sits in a row with a WtButton should use `controlHeightSx` (or
 * `controlHeightSxFor('md')`) rather than guessing heights per screen.
 */
export const WT_CONTROL_HEIGHT = 40;
export const WT_CONTROL_HEIGHT_MD = 44;

/**
 * Make a MUI input match button height. Applied to the OUTER root and the inner input,
 * because MUI sizes the input element independently of the wrapper — setting only the
 * root leaves the text off-centre.
 */
export const controlHeightSxFor = (density: 'sm' | 'md' = 'sm') => {
  const h = density === 'md' ? WT_CONTROL_HEIGHT_MD : WT_CONTROL_HEIGHT;
  return {
    // Lock height (not only minHeight) so Autocomplete + avatar adornments cannot grow
    // taller than neighbouring plain Selects in the same form row.
    '& .MuiOutlinedInput-root': { minHeight: h, height: h, alignItems: 'center', boxSizing: 'border-box' },
    '& .MuiOutlinedInput-input': {
      paddingTop: 0,
      paddingBottom: 0,
      height: h - 2,
      boxSizing: 'border-box',
      // Real <input>s (Autocomplete / text) center via line-box; keep them optically middle.
      lineHeight: `${h - 2}px`,
    },
    // MUI Select is a div.MuiSelect-select — height alone leaves the label high in the
    // box. Flex-center to match Autocomplete (EmployeePicker / Recruiter gold standard).
    '& .MuiSelect-select': {
      display: 'flex',
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      height: h - 2,
      boxSizing: 'border-box',
      lineHeight: 1.25,
    },
    '& .MuiAutocomplete-inputRoot': { flexWrap: 'nowrap', py: '0 !important' },
  } as const;
};

/** Default (40px) — alias kept so existing imports keep working. */
export const controlHeightSx = controlHeightSxFor('sm');

const buttonHeightSx = (h: number, compact: boolean): SxProps<Theme> => ({
  minHeight: h,
  fontSize: compact ? 13.5 : 14,
  px: compact ? 2 : 2.5,
  py: compact ? 0.75 : 0.9,
  borderRadius: compact ? '11px' : '12px',
});

export type WtCtaTone = 'primary' | 'accent' | 'danger' | 'success';

// Gradient stops per tone. 'primary' = core theme navy; 'accent' = a brighter blue
// variant for secondary emphasis. Both stay within the unified blue theme.
const CTA: Record<WtCtaTone, { from: string; to: string; glow: string }> = {
  primary: { from: '#1E3A8A', to: '#172554', glow: '#1E3A8A' },
  accent:  { from: '#2563EB', to: '#1E3A8A', glow: '#2563EB' },
  danger:  { from: '#e11d48', to: '#9f1239', glow: '#e11d48' },
  success: { from: '#16a34a', to: '#15803d', glow: '#16a34a' },
};

/**
 * The raw sx for a CTA tone — exported for the rare case a plain MUI Button must stay in place.
 *
 * `flat` keeps the colour and the lift/press physics but drops the long coloured glow to a
 * plain neutral elevation. The glow is tuned for ONE hero CTA on a surface; put two of them
 * side by side in a toolbar and the two halos bloom into each other and the row reads as
 * lit up rather than as a pair of buttons. Reach for it whenever CTAs sit adjacent.
 */
export const ctaSx = (tone: WtCtaTone = 'primary', flat = false): SxProps<Theme> => {
  const c = CTA[tone];
  const rest = flat
    ? '0 1px 2px rgba(16,24,40,.10), 0 2px 6px -2px rgba(16,24,40,.10), inset 0 1px 0 rgba(255,255,255,.16)'
    : `0 1px 2px ${c.glow}59, 0 12px 26px -10px ${c.glow}b3, inset 0 1px 0 rgba(255,255,255,.16)`;
  const hover = flat
    ? '0 2px 4px rgba(16,24,40,.12), 0 6px 14px -6px rgba(16,24,40,.18), inset 0 1px 0 rgba(255,255,255,.16)'
    : `0 3px 6px ${c.glow}59, 0 18px 32px -10px ${c.glow}cc, inset 0 1px 0 rgba(255,255,255,.16)`;

  return {
    textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '12px',
    lineHeight: 1.2,
    background: `linear-gradient(135deg, ${c.from}, ${c.to})`, color: '#fff',
    boxShadow: rest,
    transition: `transform .16s ${MRD_EASE}, box-shadow .2s, filter .15s`,
    '& .MuiButton-startIcon': { mr: 0.9, '& .fs-2, & .fs-3': { fontSize: '1.15rem' } },
    // Keenicons draw a duotone glyph as several stacked <span class="pathN">, and the stylesheet
    // dims all but the first to around 30%. On a white-on-gradient button that reads as a smudge
    // rather than an icon, so on a filled CTA every path is taken up to full strength and to the
    // button's own colour. Stated once here rather than per button.
    '& .ki-duotone, & .ki-solid, & .ki-outline': {
      color: 'inherit',
      '& [class*="path"]': { opacity: 1, color: 'inherit' },
    },
    '&:hover': {
      background: `linear-gradient(135deg, ${c.from}, ${c.to})`, transform: 'translateY(-1.5px)', filter: 'brightness(1.04)',
      boxShadow: hover,
    },
    '&:active': { transform: 'translateY(0) scale(.975)' },
    '&:focus-visible': { outline: `2px solid ${c.glow}`, outlineOffset: 2 },
    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
  };
};

/** Quiet button (mrd-ghost): the standard "Cancel" — now larger + a faint bordered surface so it
 * reads as a real, tappable secondary action (not just text). */
export const ghostSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em', borderRadius: '12px', color: '#334155',
  lineHeight: 1.2,
  // White on a visible border, and a hover that goes DARKER.
  //
  // It used to sit at #F8FAFC behind a #E2E8F0 border and hover to #EEF2F7 — all three within a
  // few percent of the surfaces it sits on. On a dialog footer (a light grey band) the button
  // was barely there at rest, and hovering moved it TOWARDS the footer colour, so it read as
  // disappearing under the cursor. Contrast now increases on hover, which is the direction a
  // hover is supposed to go.
  bgcolor: '#FFFFFF', border: '1px solid #CBD5E1',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .15s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#E2E8F0', borderColor: '#94A3B8', color: '#0F172A', transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(16,24,40,0.10)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #94A3B8', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#F8FAFC', color: '#CBD5E1', borderColor: '#E2E8F0' },
};

/** Inverted pill — white background, navy text: the gradient-header "Add" pill generalized so it
 * also works on light surfaces (thin blue-tinted border + soft shadow). Same lift/press physics. */
export const invertedSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '12px',
  lineHeight: 1.2,
  bgcolor: '#fff', color: '#1E3A8A', border: '1px solid #dbeafe',
  boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .2s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#EAF0FA', borderColor: '#bfdbfe', transform: 'translateY(-1.5px)', boxShadow: '0 8px 18px rgba(30,58,138,0.18)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #1E3A8A', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0', boxShadow: 'none' },
};

// Dark-mode overrides layered on top of the light recipes above. Only the light-hardcoded
// surfaces (ghost/inverted/disabled) need overriding — the CTA gradients read fine on dark.
const ghostDarkSx: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.78)', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.11)', borderColor: 'rgba(255,255,255,0.26)', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.35)' },
  '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)', borderColor: 'rgba(255,255,255,0.10)' },
};
const invertedDarkSx: SxProps<Theme> = {
  bgcolor: 'rgba(255,255,255,0.10)', color: '#93c5fd', border: '1px solid rgba(147,197,253,0.30)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(147,197,253,0.5)' },
  '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.30)', borderColor: 'rgba(255,255,255,0.10)' },
};
const ctaDarkSx: SxProps<Theme> = {
  '&.Mui-disabled': { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.40)', boxShadow: 'none' },
};

export interface WtButtonProps extends ButtonProps {
  /** CTA gradient tone. Ignored when `ghost` or `inverted` is set. Default 'primary'. */
  tone?: WtCtaTone;
  /** Quiet text-button variant (the standard Cancel). */
  ghost?: boolean;
  /** White pill with navy text (the gradient-header "Add" pill) — secondary/launch actions. */
  inverted?: boolean;
  /** Same colour, no coloured glow — for toolbars where CTAs sit side by side. */
  flat?: boolean;
}

export const WtButton = forwardRef<HTMLButtonElement, WtButtonProps>(function WtButton(
  { tone = 'primary', ghost = false, inverted = false, flat = false, size, sx, variant, children, ...rest }, ref,
) {
  // Read dark from the html class ColorModeProvider stamps — not MUI useTheme —
  // so CTAs stay mode-aware even when a subtree's ThemeContext is briefly unavailable (HMR).
  const dark = useIsDark();
  // `small` = toolbar / ListHeader (40px + flatter glow). `medium` = spacious (44px).
  // Default = mid density (40px). Toolbar CTAs force flat so glow doesn't bloom beside search.
  const compact = size === 'small';
  const spacious = size === 'medium' || size === 'large';
  const h = spacious ? WT_CONTROL_HEIGHT_MD : WT_CONTROL_HEIGHT;
  const useFlat = flat || compact;
  const base = ghost ? ghostSx : inverted ? invertedSx : ctaSx(tone, useFlat);
  const darkOverride = dark ? (ghost ? ghostDarkSx : inverted ? invertedDarkSx : ctaDarkSx) : null;
  return (
    <Button
      ref={ref}
      size={size}
      variant={ghost ? 'text' : (variant ?? 'contained')}
      // recipe → height → dark override → caller sx, so per-use tweaks always win
      sx={[base, buttonHeightSx(h, compact), darkOverride, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean) as SxProps<Theme>}
      {...rest}
    >
      {/* Labels are title-cased here so every button reads the same without
          each call site remembering. Only a plain string is touched — a caller
          passing nodes has already decided how it looks. WtIconButton is NOT
          wrapped: its children are a glyph, not a label. */}
      {titleCaseNode(children)}
    </Button>
  );
});

export interface WtIconButtonProps extends Omit<IconButtonProps, 'color'> {
  /** Tone hex — tint derives from it via the Devices-modal alpha formula (bg 8%, border 24%). */
  color?: string;
  /** Tooltip label (also used as aria-label). */
  title?: string;
}

/** Tinted-ghost icon button (BiometricDevicesModal action-button pattern) with the same press
 * physics: tint deepens on hover, -1px lift, scale(.94) press. Pass the glyph as children. */
export const WtIconButton = forwardRef<HTMLButtonElement, WtIconButtonProps>(function WtIconButton(
  { color = '#64748b', title, sx, children, ...rest }, ref,
) {
  const btn = (
    <IconButton
      ref={ref}
      aria-label={title}
      sx={[{
        width: 44, height: 44, borderRadius: '12px', color,
        bgcolor: `${color}14`, border: `1px solid ${color}3D`,
        transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .15s`,
        '& .fs-2, & .fs-3': { fontSize: '1.2rem' },
        '&:hover': { bgcolor: `${color}30`, borderColor: `${color}66`, transform: 'translateY(-1.5px)', boxShadow: `0 5px 12px ${color}3D` },
        '&:active': { transform: 'translateY(0) scale(.93)' },
        '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 2 },
        '&.Mui-disabled': { opacity: 0.5 },
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    >
      {children}
    </IconButton>
  );
  return title ? <Tooltip title={title}>{btn}</Tooltip> : btn;
});
