/**
 * Dot-field tunables — the single place the background's feel is set.
 *
 * Every value here is deliberately conservative. The success condition for this background is
 * that a user stops noticing it within a few seconds and never consciously sees it again; it
 * exists so a sparse enterprise screen does not read as a dead one. Anything that draws
 * attention to itself has failed, however pretty it is in isolation.
 */
export const DOT_FIELD = {
  /** Grid pitch in CSS px. Larger = calmer and cheaper; below ~20 it starts to read as noise. */
  spacing: 26,

  /** Resting dot radius in CSS px. Sub-pixel on purpose — the grid should be felt, not read. */
  radius: 1.1,
  /** Radius at full proximity. A ~1.8× swell is legible without becoming a bubble effect. */
  radiusHot: 2.0,

  /** Cursor influence radius in CSS px. */
  influence: 150,

  /**
   * Maximum positional offset toward the cursor, in CSS px.
   * The brief allows <2px. At 1.4 the field feels subtly magnetic; past ~2.5 it becomes a
   * visible ripple and the whole thing starts competing with the interface.
   */
  drift: 1.4,

  /**
   * Energy easing time-constant in ms (exponential approach, so it is frame-rate independent
   * and cannot overshoot). ~70ms lands between "instant and twitchy" and "laggy".
   */
  tau: 70,

  /** Below this, a dot is considered settled and drops out of the active set. */
  epsilon: 0.004,

  /**
   * Device-pixel-ratio ceiling. A 3× phone would otherwise quadruple the fill cost of the
   * base layer for a difference nobody can see on a 1px dot.
   */
  maxDpr: 2,
} as const;

export type DotFieldConfig = typeof DOT_FIELD;
