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

// Gradient stops per tone. 'primary' = theme navy (logo "WISE"); 'accent' = the brand maroon the
// calendar's Create Event button ships with (logo "TECH").
const CTA: Record<WtCtaTone, { from: string; to: string; glow: string }> = {
  primary: { from: '#1E3A8A', to: '#172554', glow: '#1E3A8A' },
  accent:  { from: '#AA393D', to: '#8f2f33', glow: '#AA393D' },
  danger:  { from: '#e11d48', to: '#9f1239', glow: '#e11d48' },
  success: { from: '#16a34a', to: '#15803d', glow: '#16a34a' },
};

/** The raw sx for a CTA tone — exported for the rare case a plain MUI Button must stay in place. */
export const ctaSx = (tone: WtCtaTone = 'primary'): SxProps<Theme> => {
  const c = CTA[tone];
  return {
    textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em', borderRadius: '12px',
    background: `linear-gradient(180deg, ${c.from}, ${c.to})`, color: '#fff',
    boxShadow: `0 1px 2px ${c.glow}59, 0 10px 22px -10px ${c.glow}a6, inset 0 1px 0 rgba(255,255,255,.14)`,
    transition: `transform .16s ${MRD_EASE}, box-shadow .2s`,
    '&:hover': {
      background: `linear-gradient(180deg, ${c.from}, ${c.to})`, transform: 'translateY(-1px)',
      boxShadow: `0 2px 4px ${c.glow}59, 0 14px 26px -10px ${c.glow}bf, inset 0 1px 0 rgba(255,255,255,.14)`,
    },
    '&:active': { transform: 'translateY(0) scale(.98)' },
    '&.Mui-disabled': { background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none' },
  };
};

/** Quiet text button (mrd-ghost): inset wash on hover, no border — the standard "Cancel". */
export const ghostSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 600, borderRadius: '9px', color: '#5A6573',
  '&:hover': { bgcolor: '#f1f5f9', color: '#1B2230' },
};

/** Inverted pill — white background, navy text: the gradient-header "Add" pill generalized so it
 * also works on light surfaces (thin blue-tinted border + soft shadow). Same lift/press physics. */
export const invertedSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 650, letterSpacing: '-0.01em', borderRadius: '10px',
  bgcolor: '#fff', color: '#1E3A8A', border: '1px solid #dbeafe',
  boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
  transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .2s`,
  '&:hover': { bgcolor: '#EAF0FA', borderColor: '#bfdbfe', transform: 'translateY(-1px)', boxShadow: '0 6px 14px rgba(30,58,138,0.16)' },
  '&:active': { transform: 'translateY(0) scale(.98)' },
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
        width: 40, height: 40, borderRadius: '10px', color,
        bgcolor: `${color}14`, border: `1px solid ${color}3D`,
        transition: `background-color .15s, border-color .15s, transform .16s ${MRD_EASE}, box-shadow .15s`,
        '&:hover': { bgcolor: `${color}30`, borderColor: `${color}66`, transform: 'translateY(-1px)', boxShadow: `0 4px 10px ${color}33` },
        '&:active': { transform: 'translateY(0) scale(.94)' },
      }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    >
      {children}
    </IconButton>
  );
  return title ? <Tooltip title={title}>{btn}</Tooltip> : btn;
});
