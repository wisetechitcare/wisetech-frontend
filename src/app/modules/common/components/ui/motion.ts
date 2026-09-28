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

/**
 * A disclosure that GROWS, rather than one that is wiped into view.
 *
 * Pair with MUI's `<Collapse>`: Collapse owns the HEIGHT, this owns what happens to the
 * content inside it. On its own, Collapse slides a clipping mask down over finished content —
 * the panel gets taller but nothing in it moves, which reads as a shutter opening rather than
 * something arriving. Scaling the contents up into the space that is being made for them is
 * what makes the two read as one movement.
 *
 *   <Collapse in={open} timeout={DISCLOSURE.duration} easing={DISCLOSURE.easing}>
 *     <Box sx={disclosureSx(open)}>…</Box>
 *   </Collapse>
 *
 * `0.96`, not something smaller: at 0.9 the text visibly re-flows as it settles, because the
 * glyphs are being scaled through fractional pixel sizes. 4% is enough to register as movement
 * and small enough that the type never looks blurred on the way.
 *
 * `transformOrigin: top` so it expands DOWNWARD from the button that opened it. Centre origin
 * makes the panel appear to push up into the row above, fighting the height animation.
 *
 * Opacity finishes at 60% of the way through — the eye tracks brightness more than size, so a
 * fade that runs the full duration is read as a blink and hides the last of the movement.
 */
export const DISCLOSURE = { duration: duration.standard, easing: easing.standard } as const;

export function disclosureSx(open: boolean): SxProps<Theme> {
  return {
    transformOrigin: 'top center',
    transition: [
      `transform ${duration.standard}ms ${easing.standard}`,
      `opacity ${Math.round(duration.standard * 0.6)}ms ${easing.standard}`,
    ].join(', '),
    transform: open ? 'scale(1)' : 'scale(0.96)',
    opacity: open ? 1 : 0,
    // Promote before the first frame rather than mid-flight, which is where a hitch comes from.
    willChange: open ? 'auto' : 'transform, opacity',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none', transform: 'none', opacity: 1, willChange: 'auto',
    },
  };
}
