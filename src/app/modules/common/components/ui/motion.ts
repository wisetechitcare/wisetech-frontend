import type { SxProps, Theme } from '@mui/material/styles';
import { T } from './tokens';

/**
 * Reusable macOS-style motion helpers — single source of truth for hover/press micro-interactions
 * and spring feel across the app. Compose into any `sx`:
 *   <Paper sx={hoverLiftSx()} />            // -2px lift + shadow on hover
 *   <ButtonBase sx={pressableSx()} />        // scale-down on press
 *   <Card sx={{ ...hoverLiftSx('emphasized'), ...pressableSx() }} />
 * All honor `prefers-reduced-motion` (no transform, instant).
 */

const { easing, duration } = T.motion;

/** Hover lift used by cards/tiles (EmployeeDetailsCard / Devices StatTile physics), tokenised. */
export function hoverLiftSx(intensity: 'subtle' | 'standard' | 'emphasized' = 'standard'): SxProps<Theme> {
  const lift = intensity === 'emphasized' ? -3 : intensity === 'subtle' ? -1 : -2;
  const shadow = intensity === 'emphasized' ? T.shadow.cardHover : T.shadow.card;
  return {
    transition: `transform ${duration.quick}ms ${easing.springSoft}, box-shadow ${duration.quick}ms ease, border-color ${duration.quick}ms ease`,
    '&:hover': { transform: `translateY(${lift}px)`, boxShadow: shadow },
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
  };
}

/** Tap/press feedback — a subtle scale-down (Apple's <100ms press response). */
export function pressableSx(scale = 0.97): SxProps<Theme> {
  return {
    transition: `transform ${duration.quick}ms ${easing.springSoft}`,
    '&:active': { transform: `scale(${scale})` },
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:active': { transform: 'none' } },
  };
}

/** Spring entrance keyframes as a ready-to-inject <style> string (for non-MUI-transition contexts,
 * e.g. a toast that slides+settles from the right). Class names are namespaced `wt-*`. */
export const MOTION_KEYFRAMES = `
  @keyframes wtRiseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes wtSlideInRight { 0% { opacity: 0; transform: translateX(28px); } 60% { opacity: 1; transform: translateX(-3px); } 100% { transform: translateX(0); } }
  @keyframes wtSlideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(28px); } }
  .wt-rise-in       { animation: wtRiseIn ${duration.emphasized}ms ${easing.decelerate} both; }
  .wt-slide-in      { animation: wtSlideInRight ${duration.slow}ms ${easing.spring} both; }
  .wt-slide-out     { animation: wtSlideOutRight ${duration.standard}ms ${easing.accelerate} forwards; }
  @media (prefers-reduced-motion: reduce) {
    .wt-rise-in, .wt-slide-in, .wt-slide-out { animation-duration: 0.01ms !important; }
  }
`;
