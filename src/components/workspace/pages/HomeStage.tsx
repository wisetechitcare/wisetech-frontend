import { motion } from 'framer-motion';
import { useWorkspaceShell } from '../WorkspaceShellContext';
import { contentRevealTransition, fadeAnimation } from '../motion';
import { HERO_EYEBROW, HERO_SUBTITLE, HERO_TITLE, HERO_WRAP } from '../shellTokens';

/**
 * Home — the hero above the launcher.
 *
 * Home stays a DEDICATED experience with its own route element; it just does not own the
 * tiles. Those belong to the dock, which is mounted one level up in the shell so it can
 * persist across this navigation instead of unmounting and being re-created as a rail.
 *
 * ─── WHY A HERO AND NOT A LABEL ──────────────────────────────────────────────
 * Previously this was a 19px "Home" and one grey line — which made the landing screen read
 * as a settings page that happened to have icons on it. An eyebrow, a 38px tightly-tracked
 * title and a single measured sentence is the difference between a page and a product's
 * front door, and it costs three elements.
 *
 * Typographic rhythm is the point: eyebrow (11px, wide tracking) → title (38px, negative
 * tracking) → subtitle (15px, relaxed leading). Three clearly separated levels, each doing
 * one job.
 *
 * ─── WHY role="heading" AND NOT <h1> ─────────────────────────────────────────
 * Metronic ships `h1, .h1 { font-size: calc(1.3rem + 0.6vw) }` unlayered, and unlayered CSS
 * beats Tailwind's layered utilities regardless of specificity — an `<h1>` here rendered at
 * 22.75px no matter what size class it carried. `<p>` has the same problem with
 * `margin-bottom: 1rem`, which fought the flex gap. ARIA gives identical semantics with none
 * of the inherited styling. See shellTokens.ts for the measurements.
 *
 * Opacity only. The greeting is the last thing to arrive on the way back home — a quiet
 * confirmation, not an announcement.
 */
export default function HomeStage() {
  const { isLoading, apps } = useWorkspaceShell();

  return (
    <motion.header
      className={HERO_WRAP}
      initial={fadeAnimation.initial}
      animate={fadeAnimation.animate}
      transition={contentRevealTransition}
    >
      <div className={HERO_EYEBROW}>WiseTech Workspace</div>
      <div role="heading" aria-level={1} className={HERO_TITLE}>
        Where would you like to work?
      </div>
      <div className={HERO_SUBTITLE}>
        {isLoading
          ? 'Preparing your applications…'
          : `${apps.length} applications available to you.`}
      </div>
    </motion.header>
  );
}
