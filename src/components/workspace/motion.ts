import type { TargetAndTransition, Transition, Variants } from 'framer-motion';

/**
 * ============================================================================
 * WORKSPACE SHELL — MOTION TOKENS
 * ============================================================================
 * The single source of truth for every duration, spring and delay in the shell.
 * No component hardcodes a number; retuning the feel is editing this file.
 *
 * ─── THE PHYSICAL MODEL: "A WELL-MADE DRAWER" ───────────────────────────────
 * Heavy but frictionless, and CRITICALLY DAMPED — it arrives and stops. Bounce and
 * overshoot read as toy-like, which is the opposite of what a tool used for eight hours a
 * day should feel like. Every spring below is very slightly OVER-damped for that reason:
 * critical damping is 2·√(stiffness·mass), and each `damping` here sits just above it.
 *
 * ─── THE CEILING ────────────────────────────────────────────────────────────
 * Nothing structural exceeds 360ms. Enterprise software is used hundreds of times a day, so
 * every animation is paid for hundreds of times; "premium" means unhesitating, not stately.
 * If something appears to need longer, it is doing too much and should be decomposed.
 */

// ── Durations (seconds — framer's unit) ─────────────────────────────────────

export const MOTION = {
  /** Home ⇄ Workspace. The longest permitted motion in the product. */
  structural: 0.36,
  /** Workspace content swapping. */
  regional: 0.2,
  /** One element changing — indicator, underline, badge. */
  local: 0.16,
  /** Press feedback. Must be imperceptible in duration; this IS perceived latency. */
  press: 0.09,
  /**
   * The "breath" — the beat between the press registering and travel beginning.
   * Movement that starts instantly reads as mechanical; this 40ms pause is most of the
   * difference between "fast" and "expensive". It is deliberately not zero.
   */
  anticipation: 0.04,
  /** The workspace opens AFTER the dock starts, so the eye follows the dock first and then
   *  discovers the space it left behind. Simultaneous reads as one unreadable event. */
  workspaceLag: 0.09,
  /** Content fades in once its container has mostly settled. */
  contentDelay: 0.14,
} as const;

// ── Easing ──────────────────────────────────────────────────────────────────
// Tuple-typed so TypeScript sees a cubic-bezier, not number[].

/** Long ease-out. Entrances: gentle in, long settle. */
export const DECELERATE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Ease-in. Exits are always faster and firmer than entrances. */
export const ACCELERATE: [number, number, number, number] = [0.4, 0, 1, 1];

// ── Springs ─────────────────────────────────────────────────────────────────

/** The dock morph. 2·√420 ≈ 41, so damping 42 is just past critical — zero overshoot. */
export const navigationSpring: Transition = {
  type: 'spring', stiffness: 420, damping: 42, mass: 1,
};

/** Returning Home. ~15% stiffer so the reversal is decisive rather than merely backwards. */
export const homewardSpring: Transition = {
  type: 'spring', stiffness: 500, damping: 46, mass: 1,
};

/** The workspace envelope opening and closing. 2·√380 ≈ 39, so damping 40. */
export const workspaceSpring: Transition = {
  type: 'spring', stiffness: 380, damping: 40, mass: 1,
};

// ── Interaction ─────────────────────────────────────────────────────────────

export const pressTransition: Transition = { duration: MOTION.press, ease: ACCELERATE };

/**
 * Press. 0.985 — felt, not seen. A larger value reads as a consumer-app bounce.
 *
 * The transition is carried INSIDE the target rather than on the element, because an
 * element-level `transition` would also govern its layout animation — the press would
 * quietly overwrite the navigation spring and the morph would run at 90ms.
 */
export const pressAnimation: TargetAndTransition = {
  scale: 0.985,
  transition: pressTransition,
};

// ── Fade ────────────────────────────────────────────────────────────────────

export const fadeAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

export const fadeTransition: Transition = { duration: MOTION.regional, ease: DECELERATE };

/** Content settling into a container that has just finished opening. */
export const contentRevealTransition: Transition = {
  duration: MOTION.regional, ease: DECELERATE, delay: MOTION.contentDelay,
};

// ── Stagger ─────────────────────────────────────────────────────────────────

/**
 * Steps are small and CAPPED on purpose. Uncapped stagger is the classic failure at scale:
 * charming at 5 items, a visible queue at 30. Past the cap everything moves together, which
 * at that count reads as one motion rather than a slow one.
 */
export const staggerConfig = {
  /** Rail tiles during the morph. */
  rail: { step: 0.028, cap: 5 },
  /** Module tiles entering the grid. */
  module: { step: 0.026, cap: 9, base: 0.12 },
} as const;

/**
 * Rail-tile delay, measured as DISTANCE FROM THE CARD YOU CLICKED — not from index 0.
 *
 * This is what makes neighbouring cards *react* rather than merely queue. The card you
 * pressed leaves first; the ones beside it follow, then theirs, so the movement propagates
 * outward from the point of contact like something being pulled. Index-ordered stagger
 * produces the opposite reading — a list animating itself, indifferent to where you clicked.
 *
 * The step is deliberately larger than a conventional stagger (28ms). Below ~20ms the ripple
 * is present in the code and invisible on screen, which is the failure mode this phase exists
 * to correct.
 */
export const railDelay = (index: number, activeIndex: number): number => {
  const distance = activeIndex < 0 ? index : Math.abs(index - activeIndex);
  return MOTION.anticipation + Math.min(distance, staggerConfig.rail.cap) * staggerConfig.rail.step;
};

export const moduleDelay = (index: number): number =>
  staggerConfig.module.base + Math.min(index, staggerConfig.module.cap) * staggerConfig.module.step;

/**
 * Hover lift for launcher cards. Small, and on a motion prop rather than a CSS class —
 * a `hover:-translate-y-1` class would fight framer for the `transform` property the instant
 * the morph starts.
 */
export const cardHoverTransition: Transition = { type: 'spring', stiffness: 520, damping: 34 };
export const cardHover: TargetAndTransition = { y: -3, transition: cardHoverTransition };

// ── Variants ────────────────────────────────────────────────────────────────

/** Module tiles: fade up a few pixels, in order. A table being set, not cards dealt. */
export const moduleTileVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: DECELERATE, delay: moduleDelay(index) },
  }),
};

// ── Layout-animation correction ─────────────────────────────────────────────

/**
 * Corner radii for the app-tile glyph, in PIXELS rather than Tailwind classes.
 *
 * Framer scales an element to animate a size change, which distorts `border-radius` unless
 * the value is passed through `style` so the projection can counter-scale it frame by frame.
 * This is framer's documented API for the problem — it is wiring a value into the animation
 * system, not styling by inline style, and there is no class-based equivalent.
 */
export const GLYPH_RADIUS = { home: 18, docked: 12 } as const;

/**
 * Glyph box sizes, and why the icon sizes in shellTokens are exactly half of each.
 *
 * The icon is NOT animated. When the glyph shrinks 80→36, framer scales the whole box by
 * 36/80, and the icon — which has no `layout` of its own — scales with it for free. Keeping
 * the icon:box ratio identical in both modes (40/80 = 18/36 = 0.5) means the scaled icon
 * lands on exactly the size the other mode renders, so there is no pop at either end.
 *
 * The alternative — animating `fontSize` — would reflow every frame for every tile. This
 * costs nothing and is a pure GPU transform.
 */
export const GLYPH_SIZE = { home: 60, docked: 40 } as const;
