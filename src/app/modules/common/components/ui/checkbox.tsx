import { forwardRef, type ReactNode } from 'react';
import { Box, Checkbox, FormControlLabel, Typography, type CheckboxProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { CheckIcon, MinusIcon } from 'lucide-react';

/**
 * WtCheckbox — the ONE canonical checkbox for the whole app.
 *
 * Same shape as the design-system checkbox (src/ds/ui/checkbox.tsx, Storybook "Components/Checkbox"):
 * 22px tile, 7px radius, 2px muted border, `--primary` fill + 16px lucide check (stroke 3). Applied app-wide via
 * MUI theme `MuiCheckbox` defaultProps in `wisetechTheme.ts`, so a raw `<Checkbox>` matches too.
 * Raw `<input type="checkbox">` gets the same look from main.css; the toggle bounce for both comes
 * from `installCheckboxBounce` (main.tsx) + main.css.
 */

const tileSx = {
  width: 22,
  height: 22,
  borderRadius: '7px',
  boxSizing: 'border-box',
  border: '2px solid color-mix(in oklch, var(--muted-foreground) 45%, transparent)',
  display: 'grid',
  placeItems: 'center',
  transition: 'box-shadow 150ms ease',
  '.dark &': { bgcolor: 'color-mix(in oklch, var(--input) 30%, transparent)' },
} as const;

function UncheckedIcon() {
  return <Box component="span" aria-hidden data-wt-cb="off" sx={tileSx} />;
}

function FilledIcon({ kind }: { kind: 'check' | 'dash' }) {
  const Glyph = kind === 'check' ? CheckIcon : MinusIcon;
  return (
    <Box
      component="span"
      aria-hidden
      data-wt-cb="on"
      sx={{
        ...tileSx,
        borderColor: 'var(--primary)',
        bgcolor: 'var(--primary)',
        color: 'var(--primary-foreground)',
        '.dark &': { bgcolor: 'var(--primary)' },
      }}
    >
      <Glyph size={16} strokeWidth={3} />
    </Box>
  );
}

/** Icons shared by WtCheckbox and the MUI theme defaultProps (global fallback). */
export function wtCheckboxIcons(): { icon: ReactNode; checkedIcon: ReactNode; indeterminateIcon: ReactNode } {
  return {
    icon: <UncheckedIcon />,
    checkedIcon: <FilledIcon kind="check" />,
    indeterminateIcon: <FilledIcon kind="dash" />,
  };
}

/** Focus / disabled / hit-target recipe — theme + WtCheckbox both use this. */
/** Hit target only — the visible tile is always the ds 22px. */
export type WtCheckboxSize = 'sm' | 'md';
const HIT: Record<WtCheckboxSize, number> = { sm: 32, md: 36 };

// Plain CSS keys (not sx shorthands): this object also feeds the theme's styleOverrides.
export const wtCheckboxSx = (size: WtCheckboxSize = 'md'): SxProps<Theme> => ({
  padding: 0,
  margin: 0,
  flexShrink: 0,
  width: HIT[size],
  height: HIT[size],
  '&.Mui-focusVisible [data-wt-cb]': {
    borderColor: 'var(--ring)',
    boxShadow: '0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent)',
  },
  '&.Mui-disabled': { opacity: 0.5, cursor: 'not-allowed' },
});

/** MUI theme hooks — applied in `wisetechTheme` so every Checkbox inherits the look. */
export function wtCheckboxThemeDefaultProps() {
  return {
    disableRipple: true as const,
    ...wtCheckboxIcons(),
  };
}

export function wtCheckboxThemeRootSx(): SxProps<Theme> {
  return wtCheckboxSx();
}

/**
 * Bounces every non-ds checkbox on toggle (the ds one bounces itself): one delegated `change`
 * listener tags the box with data-bounce="in|out"; main.css animates it; animationend clears it.
 */
export function installCheckboxBounce() {
  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    if (input.matches('[aria-hidden="true"], [role="switch"], .btn-check, .form-switch *')) return;
    (input.closest('.MuiCheckbox-root') ?? input).setAttribute('data-bounce', input.checked ? 'in' : 'out');
  }, true);
  document.addEventListener('animationend', (e) => {
    if (e.animationName.startsWith('checkbox-bounce')) (e.target as Element).closest('[data-bounce]')?.removeAttribute('data-bounce');
  }, true);
}

export interface WtCheckboxProps extends Omit<CheckboxProps, 'size' | 'color' | 'icon' | 'checkedIcon' | 'indeterminateIcon'> {
  /** 'md' (default) for forms; 'sm' for dense rows. */
  size?: WtCheckboxSize;
}

/** Canonical app-wide checkbox — prefer this over raw MUI Checkbox. */
export const WtCheckbox = forwardRef<HTMLButtonElement, WtCheckboxProps>(function WtCheckbox(
  { size = 'md', sx, disableRipple = true, ...rest }, ref,
) {
  return (
    <Checkbox
      ref={ref}
      disableRipple={disableRipple}
      {...wtCheckboxIcons()}
      sx={[wtCheckboxSx(size), ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    />
  );
});

export interface WtCheckboxFieldProps extends WtCheckboxProps {
  /** Primary label — sits beside the box, never under it. */
  label: string;
  /** Optional secondary line under the label. */
  description?: string;
}

/**
 * Labelled checkbox row with safe control→text distance.
 * Use this for salary-exclusion / consent lines so FormControlLabel chrome never crowds the box.
 */
export const WtCheckboxField = forwardRef<HTMLButtonElement, WtCheckboxFieldProps>(function WtCheckboxField(
  { label, description, size = 'md', sx, disabled, ...rest }, ref,
) {
  return (
    <FormControlLabel
      disabled={disabled}
      sx={{
        alignItems: description ? 'flex-start' : 'center',
        m: 0,
        ml: 0,
        mr: 0,
        gap: 1.25,
        width: '100%',
        '& .MuiFormControlLabel-label': { m: '0 !important' },
      }}
      control={<WtCheckbox ref={ref} size={size} sx={sx} disabled={disabled} {...rest} />}
      label={
        <Box sx={{ minWidth: 0, pt: description ? 0.35 : 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: 'text.primary' }}>
            {label}
          </Typography>
          {description && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45, mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
      }
    />
  );
});

/**
 * Shared labelled control row for WtSwitch / WtCheckbox — kills MUI's -11px pull and
 * keeps a middle-distance gap (not cramped, not a wide gutter).
 */
export function WtControlLabel({
  control,
  label,
  sx,
}: {
  control: React.ReactElement;
  label: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <FormControlLabel
      control={control}
      label={label}
      sx={[
        {
          m: 0,
          ml: '0 !important',
          mr: 0,
          gap: 1.25,
          alignItems: 'center',
          '& .MuiFormControlLabel-label': {
            m: '0 !important',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.4,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ] as SxProps<Theme>}
    />
  );
}
