import { forwardRef } from 'react';
import { Box, Stack, Switch, Typography, type SwitchProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { T } from './tokens';
import { IconBox, type Trio } from './patterns';

/**
 * WtSwitch — the ONE canonical toggle for the whole app.
 *
 * Replaces the copy-pasted per-file `tintedSwitch` sx, raw `<Switch>` variants, and Bootstrap
 * `<Form.Check type="switch">` / `.form-switch`. Every toggle should be a WtSwitch (control only) or a
 * WtSwitchField (labelled, responsive row) so size, physics, colour, focus ring, and reduced-motion
 * behaviour are identical everywhere.
 *
 * Recipe (from the Sandwich/LeavePolicy benchmark): tinted gradient track + shadowed thumb when on,
 * soft grey when off; focus-visible ring; reduced-motion friendly. Two sizes for density/responsive use.
 */

export type WtSwitchSize = 'sm' | 'md';

const SIZES: Record<WtSwitchSize, { w: number; h: number; thumb: number; travel: number; m: number; radius: number }> = {
  sm: { w: 38, h: 22, thumb: 16, travel: 16, m: 3, radius: 11 },
  md: { w: 46, h: 26, thumb: 20, travel: 20, m: 3, radius: 13 },
};

/** The raw sx for the canonical toggle — exported for the rare case a plain MUI Switch must stay in place. */
export const wtSwitchSx = (tone: string = T.color.brand, size: WtSwitchSize = 'md'): SxProps<Theme> => {
  const s = SIZES[size];
  return {
    width: s.w, height: s.h, padding: 0, flexShrink: 0,
    '& .MuiSwitch-switchBase': {
      padding: 0, margin: `${s.m}px`, transitionDuration: '220ms',
      '&.Mui-checked': {
        transform: `translateX(${s.travel}px)`, color: '#fff',
        '& + .MuiSwitch-track': {
          backgroundColor: tone,
          backgroundImage: `linear-gradient(135deg, ${tone} 0%, ${tone}cc 100%)`,
          opacity: 1, border: 0,
        },
      },
      '&.Mui-focusVisible + .MuiSwitch-track': { boxShadow: `0 0 0 3px ${tone}40` },
      '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
    },
    '& .MuiSwitch-thumb': {
      boxSizing: 'border-box', width: s.thumb, height: s.thumb,
      boxShadow: '0 2px 5px rgba(15,23,42,0.28)',
    },
    '& .MuiSwitch-track': {
      borderRadius: s.radius, backgroundColor: '#e4e8ee', opacity: 1,
      transition: 'background-color .3s',
    },
    '@media (prefers-reduced-motion: reduce)': {
      '& .MuiSwitch-switchBase': { transitionDuration: '0ms' },
      '& .MuiSwitch-track': { transition: 'none' },
    },
  };
};

export interface WtSwitchProps extends Omit<SwitchProps, 'size' | 'color'> {
  /** Track tint when on (hex). Default = brand navy. */
  tone?: string;
  /** 'md' (46×26, default) or 'sm' (38×22) for dense rows. */
  size?: WtSwitchSize;
}

/** Canonical app-wide toggle — use everywhere instead of a raw MUI Switch or a Bootstrap form-switch. */
export const WtSwitch = forwardRef<HTMLButtonElement, WtSwitchProps>(function WtSwitch(
  { tone = T.color.brand, size = 'md', sx, ...rest }, ref,
) {
  return (
    <Switch
      ref={ref}
      disableRipple
      // caller sx layered after the recipe so per-use tweaks always win
      sx={[wtSwitchSx(tone, size), ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    />
  );
});

export interface WtSwitchFieldProps extends WtSwitchProps {
  /** Bold primary line. */
  title: string;
  /** Optional secondary description under the title. */
  description?: string;
  /** Optional leading Keenicons glyph name; requires `trio` to render the tinted IconBox. */
  icon?: string;
  /** Colour trio for the leading icon (and the track tint, unless `tone` overrides it). */
  trio?: Trio;
}

/**
 * WtSwitchField — a labelled toggle ROW. Fully responsive: title/description on the left, the switch on
 * the right on ≥sm; stacks cleanly on phones. The switch is `flexShrink:0` so a long label can never
 * squeeze it. Use this for every "setting with a toggle" so spacing + type scale stay identical app-wide.
 */
export const WtSwitchField = forwardRef<HTMLButtonElement, WtSwitchFieldProps>(function WtSwitchField(
  { title, description, icon, trio, tone, size, sx, ...rest }, ref,
) {
  const tint = tone ?? trio?.c ?? T.color.brand;
  return (
    <Box sx={{
      display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between',
      gap: { xs: 1.25, sm: 2 }, width: '100%',
    }}>
      <Stack direction="row" spacing={1.5} alignItems={description ? 'flex-start' : 'center'} sx={{ minWidth: 0, flex: 1 }}>
        {icon && trio && <IconBox icon={icon} trio={trio} size={36} fs="fs-3" />}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.35, letterSpacing: '-0.01em' }}>{title}</Typography>
          {description && <Typography sx={{ fontSize: 13.5, color: '#55606F', mt: 0.4, lineHeight: 1.55 }}>{description}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
        <WtSwitch ref={ref} tone={tint} size={size} sx={sx} {...rest} />
      </Box>
    </Box>
  );
});
