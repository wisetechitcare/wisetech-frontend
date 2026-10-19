import { forwardRef, type ReactNode } from 'react';
import { Box, Checkbox, FormControlLabel, Typography, type CheckboxProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { T } from './tokens';

/**
 * WtCheckbox — the ONE canonical checkbox for the whole app.
 *
 * The visual recipe (rounded tile, brand fill when on, soft border when off) is also applied
 * app-wide via MUI theme `MuiCheckbox` defaultProps in `wisetechTheme.ts`, so a leftover raw
 * `<Checkbox>` still matches. New code should still import WtCheckbox / WtCheckboxField —
 * same contract as WtSwitch: size, tone, labelled field helpers.
 */

export type WtCheckboxSize = 'sm' | 'md';

const BOX: Record<WtCheckboxSize, { px: number; hit: number; radius: number }> = {
  sm: { px: 18, hit: 32, radius: 5 },
  md: { px: 20, hit: 36, radius: 6 },
};

/** Soft bordered tile — off state. */
function UncheckedIcon({ size, radius }: { size: number; radius: number }) {
  return (
    <Box
      component="span"
      aria-hidden
      data-wt-cb="off"
      sx={{
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        boxSizing: 'border-box',
        border: '1.5px solid',
        borderColor: 'rgba(100, 116, 139, 0.55)',
        bgcolor: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.04)',
        display: 'block',
        transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
        'html[data-theme="dark"] &': {
          bgcolor: 'rgba(255,255,255,0.06)',
          borderColor: 'rgba(255,255,255,0.28)',
          boxShadow: 'none',
        },
      }}
    />
  );
}

/** Brand-filled tile + white check / dash — on / indeterminate. */
function FilledIcon({
  size,
  radius,
  tone,
  kind,
}: {
  size: number;
  radius: number;
  tone: string;
  kind: 'check' | 'dash';
}) {
  return (
    <Box
      component="span"
      aria-hidden
      data-wt-cb="on"
      sx={{
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        boxSizing: 'border-box',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, ${tone} 0%, ${tone}cc 100%)`,
        boxShadow: `0 1px 2px ${alpha(tone, 0.35)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
        transition: 'background 160ms ease, box-shadow 160ms ease',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 16 16"
        sx={{ width: size * 0.62, height: size * 0.62, display: 'block' }}
      >
        {kind === 'check' ? (
          <path
            d="M3.2 8.2 6.4 11.4 12.8 4.6"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M3.5 8h9"
            fill="none"
            stroke="#fff"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        )}
      </Box>
    </Box>
  );
}

/** Icons shared by WtCheckbox and the MUI theme defaultProps (global fallback). */
export function wtCheckboxIcons(
  tone: string = T.color.brand,
  size: WtCheckboxSize = 'md',
): { icon: ReactNode; checkedIcon: ReactNode; indeterminateIcon: ReactNode } {
  const s = BOX[size];
  return {
    icon: <UncheckedIcon size={s.px} radius={s.radius} />,
    checkedIcon: <FilledIcon size={s.px} radius={s.radius} tone={tone} kind="check" />,
    indeterminateIcon: <FilledIcon size={s.px} radius={s.radius} tone={tone} kind="dash" />,
  };
}

/** Hover / focus / hit-target recipe — theme + WtCheckbox both use this. */
export const wtCheckboxSx = (tone: string = T.color.brand, size: WtCheckboxSize = 'md'): SxProps<Theme> => {
  const s = BOX[size];
  return {
    p: 0,
    m: 0,
    flexShrink: 0,
    width: s.hit,
    height: s.hit,
    borderRadius: `${s.radius + 2}px`,
    transition: 'background-color 160ms ease',
    '&:hover': { backgroundColor: alpha(tone, 0.08) },
    '&.Mui-focusVisible': {
      outline: `2px solid ${alpha(tone, 0.45)}`,
      outlineOffset: 2,
    },
    '&.Mui-disabled': { opacity: 0.45 },
    '&:hover [data-wt-cb="off"]': {
      borderColor: alpha(tone, 0.55),
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '& [data-wt-cb]': { transition: 'none' },
    },
  };
};

/**
 * MUI theme hooks — applied in `wisetechTheme` so every Checkbox inherits the look.
 * Call sites that need a custom `tone` / `size` still use `<WtCheckbox>`.
 */
export function wtCheckboxThemeDefaultProps(tone: string = T.color.brand) {
  return {
    disableRipple: true as const,
    ...wtCheckboxIcons(tone, 'md'),
  };
}

export function wtCheckboxThemeRootSx(tone: string = T.color.brand): SxProps<Theme> {
  return wtCheckboxSx(tone, 'md');
}

export interface WtCheckboxProps extends Omit<CheckboxProps, 'size' | 'color' | 'icon' | 'checkedIcon' | 'indeterminateIcon'> {
  /** Fill / focus tint when checked (hex). Default = brand navy. */
  tone?: string;
  /** 'md' (default) for forms; 'sm' for dense rows. */
  size?: WtCheckboxSize;
}

/** Canonical app-wide checkbox — prefer this over raw MUI Checkbox. */
export const WtCheckbox = forwardRef<HTMLButtonElement, WtCheckboxProps>(function WtCheckbox(
  { tone = T.color.brand, size = 'md', sx, disableRipple = true, ...rest }, ref,
) {
  const icons = wtCheckboxIcons(tone, size);
  return (
    <Checkbox
      ref={ref}
      disableRipple={disableRipple}
      {...icons}
      sx={[wtCheckboxSx(tone, size), ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
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
  { label, description, tone, size = 'md', sx, disabled, ...rest }, ref,
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
      control={<WtCheckbox ref={ref} tone={tone} size={size} sx={sx} disabled={disabled} {...rest} />}
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
