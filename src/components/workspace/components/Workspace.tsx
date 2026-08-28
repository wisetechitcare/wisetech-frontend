import { motion } from 'framer-motion';
import { useWorkspaceShell } from '../WorkspaceShellContext';
import {
  ORDER_WORKSPACE_DOCKED, ORDER_WORKSPACE_HOME,
  WORKSPACE_DOCKED, WORKSPACE_HOME, WORKSPACE_INNER,
} from '../shellTokens';
import { MOTION, workspaceSpring } from '../motion';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceContent } from './WorkspaceContent';

/**
 * The region the dock vacates — and the thing that opens into it.
 *
 * ─── THE EXPANSION ───────────────────────────────────────────────────────────
 * Same element in both modes: at Home a narrow centred column holding the greeting, docked
 * the full working area. It is never created on entry or destroyed on exit, so this is one
 * envelope travelling rather than a panel appearing — which is the difference between
 * "space opened up" and "a page loaded". See the note on `layout="position"` below for why
 * the size deliberately snaps while the position animates.
 *
 * The 90ms lag behind the dock is the whole choreography. Start them together and the two
 * motions cancel each other out perceptually; start the workspace late and the eye follows
 * the tiles first, then discovers the space they left behind. That ordering is why the
 * transition reads as ONE intentional event rather than two things happening at once.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Header and content fade in later still (motion.ts → contentDelay) so the box is mostly
 * settled before anything fills it. Content arriving into a still-growing container is what
 * makes an expansion look like a reflow.
 *
 * Visual position is set with flex `order`, never by reordering the JSX: the dock stays
 * first in the DOM in every mode so the <nav> landmark leads and tab order is stable through
 * the morph.
 */
export function Workspace() {
  const { mode } = useWorkspaceShell();
  const home = mode === 'home';

  return (
    // `layout="position"` — POSITION animates, SIZE snaps. This is deliberate and it is the
    // difference between a premium expansion and a visibly broken one.
    //
    // Framer animates a size change by SCALING the box, and children without `layout` of
    // their own scale with it. This container goes from ~60px tall at Home (one greeting) to
    // 400px+ docked (header + grid) — a starting scaleY of ~0.15. The header would fade in at
    // roughly two-thirds height and stretch to full: squished, stretching text is the single
    // most obvious tell of a naive layout animation.
    //
    // The alternatives were both worse. Giving the children `layout` to counter-scale them
    // would put a layout animation on WorkspaceContent, which wraps the Outlet — so every
    // route change would measure and animate a whole page's box, including the tables and
    // charts that must never animate. Animating nothing would lose the movement entirely.
    // Position-only keeps real motion, costs nothing on navigation, and cannot distort.
    <motion.div
      layout="position"
      transition={{ ...workspaceSpring, delay: home ? 0 : MOTION.workspaceLag }}
      data-workspace-mode={mode}
      className={`${home ? WORKSPACE_HOME : WORKSPACE_DOCKED} ${home ? ORDER_WORKSPACE_HOME : ORDER_WORKSPACE_DOCKED}`}
    >
      {/* Caps the working area on ultrawide so text lines never run to 2000px — the
          difference between "fills the screen" and "was designed for it". */}
      <div className={WORKSPACE_INNER}>
        <WorkspaceHeader />
        <WorkspaceContent />
      </div>
    </motion.div>
  );
}
