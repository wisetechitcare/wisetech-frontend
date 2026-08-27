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

/**
 * Slide-up entrance for freshly-arrived content — put it on the CONTAINER, not on
 * each item.
 *
 *   <AutoGrid key={dataVersion} sx={riseInSx()}>{cards}</AutoGrid>
 *
 * `no-restricted-syntax` bans the `<style>` block the `wtRiseIn` class below needs,
 * so this is the `sx` form; emotion scopes the keyframes to the element.
 *
 * **Deliberately not staggered.** A per-item delay looks good on eight tiles and
 * bad on twenty-five: capping the delay makes everything past the cap fire in one
 * clump, and NOT capping leaves the last card of a 100-row page blank for two
 * seconds, which reads as a failed load. Worse, `both` holds each un-started item
 * at `opacity: 0`, so the grid visibly fills in patches. One transform on one
 * element is a single compositor layer — it cannot judder, and it stays smooth
 * whether the page holds 10 rows or 100.
 *
 * `will-change` is set for the animation's duration only: it promotes the layer
 * before the first frame instead of mid-flight, which is where the hitch comes
 * from. CSS animations only replay on mount, so remount with a `key` to re-run.
 */
export function riseInSx(delayMs = 0): SxProps<Theme> {
  return {
    '@keyframes wtRiseIn': {
      // Opacity is DONE at 40%; the travel keeps going to the end. A fade that runs
      // the full duration is what makes an entrance read as a BLINK rather than a
      // rise — the eye tracks brightness far more than position, so when the two
      // finish together it registers as "the screen flashed", not "it moved up".
      // Resolving the fade early leaves the last 60% as pure movement.
      '0%': { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
      '40%': { opacity: 1 },
      '100%': { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    },
    // `slow` + `springSoft`: long enough to read as movement rather than a flash,
    // on the curve that decelerates hardest at the end so it settles instead of
    // stopping.
    animation: `wtRiseIn ${duration.slow}ms ${easing.springSoft} both`,
    animationDelay: `${delayMs}ms`,
    willChange: 'transform, opacity',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1, willChange: 'auto' },
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
