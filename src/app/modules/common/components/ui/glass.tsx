import { forwardRef } from 'react';
import {
  Box, BoxProps, Dialog, DialogProps, Fade, Grow, IconButton, Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import type { SxProps, Theme } from '@mui/material/styles';
import { T, GlassVariant, VividTone, ThemeMode, label } from './tokens';
import { MRD_EASE } from './buttons';

/** Read the active MUI theme mode as our ThemeMode ('light' | 'dark'). */
function useMode(): ThemeMode {
  return (useTheme().palette.mode as ThemeMode) ?? 'light';
}

// ─── Apple-style dialog transition ────────────────────────────────────────────────────────────
// A gentle scale-up + fade (via MUI Grow) with an ease-out-expo curve on enter and a quick
// accelerate on exit — the "sheet springs in, dismisses crisply" feel. Wrapping Grow (rather than a
// hand-rolled transition) keeps MUI's focus/backdrop syncing correct. Used as GlassDialog's default.
// Apple HIG Reduce Motion: substitute the scale movement with a plain cross-fade (opacity only).
export const GlassTransition = forwardRef<unknown, TransitionProps & { children: React.ReactElement<any, any> }>(
  function GlassTransition(props, ref) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    if (reduceMotion) {
      return <Fade ref={ref} {...props} timeout={{ enter: 200, exit: 140 }} />;
    }
    return (
      <Grow
        ref={ref}
        {...props}
        timeout={{ enter: 360, exit: 220 }}
        easing={{ enter: 'cubic-bezier(0.16, 1, 0.3, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)' }}
        style={{ transformOrigin: 'center 42%', ...props.style }}
      />
    );
  },
);

/**
 * Reusable glassmorphism (Apple/macOS frost) primitives — single source of truth for the frosted
 * surfaces used across the app's modals. Two-layered by design so the SAME look reaches both:
 *   • MUI `<Dialog>` modals (the ~5 premium ones) — via `GlassDialog`
 *   • the ~90 react-bootstrap `<Modal>` bodies — via `GlassSurface` dropped into `Modal.Body`
 *
 * Token values live in `T.glass` (tokens.ts). Intensities: `regular` (shell/header/Dialog Paper —
 * the only surfaces that get an actual backdrop-filter) and `thin` (cards/rows/tiles — translucent
 * tint WITHOUT their own filter, so blur never stacks and stays GPU-cheap).
 */

// ─── glassSx: the frosted-surface sx block ────────────────────────────────────────────────────
export function glassSx(
  variant: GlassVariant = 'thin',
  opts?: { mode?: ThemeMode; tone?: VividTone; radius?: number; disableBlur?: boolean },
): SxProps<Theme> {
  const g = T.glass[opts?.mode ?? 'light'][variant];
  const radius = opts?.radius ?? g.radius;
  const tone = opts?.tone ? T.color.vivid[opts.tone] : undefined;
  // Only `regular` surfaces (shell / header / dialog Paper) apply a real backdrop-filter. `thin`
  // surfaces (cards/rows/tiles) are translucent tint ONLY — they're designed to sit on an
  // already-frosted `regular` surface, so blurring them again would stack GPU cost for no gain.
  const useBlur = variant === 'regular' && !opts?.disableBlur;

  const sx: Record<string, unknown> = {
    borderRadius: `${radius}px`,
    border: g.border,
    boxShadow: `${g.shadow}, ${g.highlight}`,
    // regular+blur and thin both use the translucent tint; regular+disableBlur goes opaque.
    backgroundColor: variant === 'thin' || useBlur ? g.bg : g.fallbackBg,
    // A subtle tone wash (~8% alpha) layered over the glass tint for accented surfaces.
    ...(tone ? { backgroundImage: `linear-gradient(0deg, ${tone}14, ${tone}14)` } : null),
  };

  if (useBlur) {
    const filter = `blur(${g.blur}px) saturate(${g.saturate}%)`;
    sx.backdropFilter = filter;
    sx.WebkitBackdropFilter = filter;
    // Opaque fallback where backdrop-filter is unsupported (Firefox <103 default / old Safari).
    sx['@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))'] = {
      backgroundColor: g.fallbackBg,
    };
    // Respect users who ask for less transparency (accessibility) — go opaque, no blur.
    sx['@media (prefers-reduced-transparency: reduce)'] = {
      backgroundColor: g.fallbackBg,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    };
  }
  return sx as SxProps<Theme>;
}

// ─── GlassSurface: the core frosted surface (framework-agnostic) ──────────────────────────────
// Omit BoxProps' polymorphic `ref` (typed Ref<unknown>) — it collides with the forwardRef
// HTMLDivElement ref and, through GlassCard, produces a Ref<unknown> conflict.
export interface GlassSurfaceProps extends Omit<BoxProps, 'ref'> {
  variant?: GlassVariant;
  tone?: VividTone;
  radius?: number;
  /** Force the opaque fallback (skip backdrop-filter) — for perf-sensitive/low-end contexts. */
  disableBlur?: boolean;
}

export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(function GlassSurface(
  { variant = 'thin', tone, radius, disableBlur, sx, ...rest }, ref,
) {
  const mode = useMode();
  return (
    <Box
      ref={ref}
      sx={[glassSx(variant, { mode, tone, radius, disableBlur }), ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
      {...rest}
    />
  );
});

// ─── GlassHeader: generalized from the Sandwich modal's DialogHeader ──────────────────────────
export interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  /** Pass the glyph node, e.g. `<KTIcon iconName="calendar-8" className="fs-1" />`. */
  icon?: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
  /** Custom close glyph (e.g. `<KTIcon iconName="cross" className="fs-3" />`); defaults to `×`. */
  closeIcon?: React.ReactNode;
  /** 'gradient' = the brand navy header band (default, needs nothing behind it);
   *  'frost' = a regular glass surface header for lighter contexts. */
  variant?: 'gradient' | 'frost';
}

export function GlassHeader({ title, subtitle, icon, onClose, action, closeIcon, variant = 'gradient' }: GlassHeaderProps) {
  const gradient = variant === 'gradient';
  const mode = useMode();
  const frostSx = gradient ? {} : glassSx('regular', { mode });
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
      px: { xs: 2, sm: 2.75 }, py: { xs: 1.5, sm: 1.75 },
      ...(gradient
        ? { background: `linear-gradient(135deg, ${T.color.brandHover} 0%, ${T.color.brand} 100%)`, color: '#fff' }
        : { ...frostSx, borderRadius: 0, color: label(mode, 'primary') }),
      borderBottom: `3px solid ${T.color.accent}`, flexShrink: 0,
    }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        {icon && (
          <Box sx={{
            width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, borderRadius: 2.5,
            display: 'grid', placeItems: 'center', flexShrink: 0,
            ...(gradient
              ? { bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }
              : { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : T.color.brandSoft, color: T.color.brand, border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.12)' : T.color.line}` }),
          }}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 15.5, sm: 17 }, lineHeight: 1.25, color: gradient ? '#fff' : label(mode, 'primary') }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: gradient ? 'rgba(255,255,255,0.72)' : label(mode, 'secondary') }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
        {action}
        {onClose && (
          <IconButton onClick={onClose} aria-label="Close" sx={{
            width: 38, height: 38,
            ...(gradient
              ? { color: '#fff', bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.20)' } }
              : { color: label(mode, 'secondary'), bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : T.color.panelAlt, '&:hover': { bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.14)' : T.color.line } }),
            transition: `background-color .15s, transform .12s ${MRD_EASE}`,
            '&:active': { transform: 'scale(.92)' },
          }}>
            {closeIcon ?? <Box component="span" sx={{ fontSize: 20, lineHeight: 1, fontWeight: 400 }}>&times;</Box>}
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

// ─── GlassDialog: MUI Dialog with a frosted Paper + dimmed/blurred backdrop ───────────────────
export interface GlassDialogProps extends Omit<DialogProps, 'title'> {
  /** Rendered flush at the top of the Paper (typically a <GlassHeader/>). */
  header?: React.ReactNode;
  /** Go full-screen on phones. Default true. */
  mobileFullScreen?: boolean;
  /** Skip the Paper's backdrop-filter (perf). */
  disableBlur?: boolean;
}

export function GlassDialog({
  header, mobileFullScreen = true, disableBlur, children,
  PaperProps, slotProps, disableEnforceFocus = true, maxWidth = 'md', fullWidth = true,
  TransitionComponent, ...rest
}: GlassDialogProps) {
  const theme = useTheme();
  const mode = (theme.palette.mode as ThemeMode) ?? 'light';
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const fullScreen = mobileFullScreen && isPhone;
  const scrim = T.glass[mode].scrim;
  const scrimBlur = `blur(${T.glass[mode].scrimBlur}px)`;

  return (
    <Dialog
      {...rest}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      disableEnforceFocus={disableEnforceFocus}
      TransitionComponent={TransitionComponent ?? GlassTransition}
      PaperProps={{
        ...PaperProps,
        sx: [
          glassSx('regular', { mode, disableBlur }),
          { fontFamily: T.font.family, overflow: 'hidden', ...(fullScreen ? { borderRadius: 0 } : null) },
          ...(PaperProps?.sx ? (Array.isArray(PaperProps.sx) ? PaperProps.sx : [PaperProps.sx]) : []),
        ] as SxProps<Theme>,
      }}
      slotProps={{
        ...slotProps,
        backdrop: {
          ...(slotProps?.backdrop as object),
          sx: {
            backgroundColor: scrim,
            backdropFilter: scrimBlur,
            WebkitBackdropFilter: scrimBlur,
          },
        },
      }}
    >
      {header}
      {children}
    </Dialog>
  );
}

// ─── GlassCard: thin-glass card for section / row / tile chrome ───────────────────────────────
export interface GlassCardProps extends GlassSurfaceProps {
  /** Padding + shape preset. */
  preset?: 'section' | 'tile' | 'row';
  /** Adds a hover lift (translateY + shadow). */
  interactive?: boolean;
  /** Tone-colored 4px left keyline (e.g. an enabled indicator). */
  accentEdge?: VividTone | false;
}

const PRESET_SX: Record<NonNullable<GlassCardProps['preset']>, SxProps<Theme>> = {
  section: { p: { xs: 1.5, sm: 2 } },
  tile: { p: 1.5 },
  row: { p: 1.5 },
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { preset = 'section', interactive = false, accentEdge = false, sx, ...rest }, ref,
) {
  const edge = accentEdge ? T.color.vivid[accentEdge] : undefined;
  return (
    <GlassSurface
      ref={ref}
      variant="thin"
      sx={[
        PRESET_SX[preset],
        edge ? { borderLeft: `4px solid ${edge}` } : null,
        interactive
          ? {
              transition: `transform .15s ${MRD_EASE}, box-shadow .15s ease`,
              '&:hover': { transform: 'translateY(-2px)', boxShadow: T.shadow.cardHover },
            }
          : null,
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
      {...rest}
    />
  );
});
