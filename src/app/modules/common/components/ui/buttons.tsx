import { forwardRef } from 'react';
import { Button, ButtonProps, IconButton, IconButtonProps, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Reusable button primitives for the premium UI kit — single source of truth for CTA physics.
 *
 * The recipe is the Meridian calendar's Create-Event button (CustomCalendar.premium.css
 * .mrd-createbtn / .mrd-btn--primary), generalized and re-tonable:
 *   • 180deg gradient to a darker shade of the same hue
 *   • triple shadow: crisp 1px + long soft colored glow + inset 1px white top-highlight ("glass" edge)
 *   • hover: -1px lift with a deeper glow · active: scale(.98) press
 *   • spring-ish easing cubic-bezier(.22,.61,.36,1)
 *
 * Usage:
 *   <WtButton tone="primary">Save</WtButton>
 *   <WtButton tone="danger" startIcon={...}>Delete</WtButton>
 *   <WtButton ghost>Cancel</WtButton>
 *   <WtIconButton title="Edit" color="#2563eb"><KTIcon iconName="pencil" className="fs-3" /></WtIconButton>
 */

export const MRD_EASE = 'cubic-bezier(.22,.61,.36,1)';

export type WtCtaTone = 'primary' | 'accent' | 'danger' | 'success';

// Gradient stops per tone. 'primary' = core theme navy; 'accent' = a brighter blue
// variant for secondary emphasis. Both stay within the unified blue theme.
const CTA: Record<WtCtaTone, { from: string; to: string; glow: string }> = {
  primary: { from: '#1E3A8A', to: '#172554', glow: '#1E3A8A' },
  accent:  { from: '#2563EB', to: '#1E3A8A', glow: '#2563EB' },
  danger:  { from: '#e11d48', to: '#9f1239', glow: '#e11d48' },
  success: { from: '#16a34a', to: '#15803d', glow: '#16a34a' },
};

/** The raw sx for a CTA tone — exported for the rare case a plain MUI Button must stay in place. */
export const ctaSx = (tone: WtCtaTone = 'primary'): SxProps<Theme> => {
  const c = CTA[tone];
  return {
    textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '13px',
    // Larger, more tappable, more readable — a proper primary CTA.
    fontSize: 14.5, lineHeight: 1.2, minHeight: 46, px: 2.75, py: 1.1,
    background: `linear-gradient(135deg, ${c.from}, ${c.to})`, color: '#fff',
    boxShadow: `0 1px 2px ${c.glow}59, 0 12px 26px -10px ${c.glow}b3, inset 0 1px 0 rgba(255,255,255,.16)`,
    transition: `transform .16s ${MRD_EASE}, box-shadow .2s, filter .15s`,
    '& .MuiButton-startIcon': { mr: 0.9, '& .fs-2, & .fs-3': { fontSize: '1.15rem' } },
    '&:hover': {
      background: `linear-gradient(135deg, ${c.from}, ${c.to})`, transform: 'translateY(-1.5px)', filter: 'brightness(1.04)',
      boxShadow: `0 3px 6px ${c.glow}59, 0 18px 32px -10px ${c.glow}cc, inset 0 1px 0 rgba(255,255,255,.16)`,
    },
    '&:active': { transform: 'translateY(0) scale(.975)' },
    '&:focus-visible': { outline: `2px solid ${c.glow}`, outlineOffset: 2 },
    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
  };
};

/** Quiet button (mrd-ghost): the standard "Cancel" — now larger + a faint bordered surface so it
 * reads as a real, tappable secondary action (not just text). */
export const ghostSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em', borderRadius: '12px', color: '#475569',
  fontSize: 14.5, lineHeight: 1.2, minHeight: 46, px: 2.5, py: 1.1,
  bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .15s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#EEF2F7', borderColor: '#CBD5E1', color: '#1B2230', transform: 'translateY(-1px)', boxShadow: '0 4px 10px rgba(16,24,40,0.06)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #94A3B8', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#F8FAFC', color: '#CBD5E1', borderColor: '#EEF2F7' },
};

/** Inverted pill — white background, navy text: the gradient-header "Add" pill generalized so it
 * also works on light surfaces (thin blue-tinted border + soft shadow). Same lift/press physics. */
export const invertedSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em', borderRadius: '12px',
  fontSize: 14.5, lineHeight: 1.2, minHeight: 46, px: 2.5, py: 1.1,
  bgcolor: '#fff', color: '#1E3A8A', border: '1px solid #dbeafe',
  boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .2s`,
  '& .MuiButton-startIcon': { mr: 0.9 },
  '&:hover': { bgcolor: '#EAF0FA', borderColor: '#bfdbfe', transform: 'translateY(-1.5px)', boxShadow: '0 8px 18px rgba(30,58,138,0.18)' },
  '&:active': { transform: 'translateY(0) scale(.975)' },
  '&:focus-visible': { outline: '2px solid #1E3A8A', outlineOffset: 2 },
  '&.Mui-disabled': { bgcolor: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0', boxShadow: 'none' },
};

export interface WtButtonProps extends ButtonProps {
  /** CTA gradient tone. Ignored when `ghost` or `inverted` is set. Default 'primary'. */
  tone?: WtCtaTone;
  /** Quiet text-button variant (the standard Cancel). */
  ghost?: boolean;
  /** White pill with navy text (the gradient-header "Add" pill) — secondary/launch actions. */
  inverted?: boolean;
}

export const WtButton = forwardRef<HTMLButtonElement, WtButtonProps>(function WtButton(
  { tone = 'primary', ghost = false, inverted = false, sx, variant, ...rest }, ref,
) {
  const base = ghost ? ghostSx : inverted ? invertedSx : ctaSx(tone);
  return (
    <Button
      ref={ref}
      variant={ghost ? 'text' : (variant ?? 'contained')}
      // caller sx layered after the recipe so per-use tweaks (width, margins) always win
      sx={[base, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    />
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
