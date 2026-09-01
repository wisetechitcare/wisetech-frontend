import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useWorkspaceShell } from '../WorkspaceShellContext';
import {
  navIcon, sectionAccent,
  HEADER_BACK, HEADER_BACK_TEXT, HEADER_GLYPH, HEADER_IDENTITY, HEADER_RULE, HEADER_WRAP,
  WORKSPACE_SUBTITLE, WORKSPACE_TITLE,
} from '../shellTokens';
import { contentRevealTransition, fadeAnimation } from '../motion';

/**
 * The workspace's own chrome: where you are, what this application is, and what else is in it.
 *
 * ─── WHY THE SHELL OWNS THIS, NOT THE PAGE ───────────────────────────────────
 * Every one of the ~65 pages would otherwise render an identical header, and they would
 * drift. Hoisting it here means an application's identity is stated once, by the shell, and
 * every page inherits it. Pages render only their content.
 *
 * The BREADCRUMB is not here — it renders on the header bar (see DefaultTitle), because two
 * breadcrumbs on one screen is one breadcrumb too many. What is left is the application
 * identity on a landing, and the compact back link.
 *
 * ─── NO MODULE STRIP ─────────────────────────────────────────────────────────
 * There was a horizontal text list of the application's modules here, directly above the
 * icon cards that list the same modules. Two representations of one thing, on one screen,
 * one of them redundant. The icon cards are the better surface — they are scannable, they
 * carry the badge, and they group — so the text strip is gone rather than kept "for later".
 *
 * ─── THE IDENTITY ECHO ───────────────────────────────────────────────────────
 * The header repeats the application's accent plate at 48px. That echo is what ties the
 * workspace back to the card you clicked: the colour and glyph you pressed on the launcher
 * are the colour and glyph now heading the workspace. It costs one element and does most of
 * the work of making the two screens feel like one place.
 *
 * ─── COMPACT ─────────────────────────────────────────────────────────────────
 * Below lg there is no rail, so there is no standing way back. The header grows an explicit
 * back control — a phone is not a desktop with less room, it is a different navigation model
 * where BottomNav remains primary and this is the one affordance the shell must add.
 *
 * Reads context deliberately — this is shell chrome, not reusable UI. The purity rule that
 * governs AppDock exists so NAVIGATION stays independent of CONTENT; this is the content
 * side of that boundary and is expected to know shell state.
 */
export function WorkspaceHeader() {
  const { mode, activeApp, activeModule, homePath } = useWorkspaceShell();

  if (mode === 'home') return null;
  if (!activeApp) return null;

  const accent = sectionAccent(activeApp.id);
  const Icon = navIcon(activeApp.icon);

  return (
    // Opacity only — no layout, no transform. The header is INSIDE the workspace envelope,
    // which is already animating; a second layout animation nested in the first is how a
    // clean expansion turns into a reflow. It waits for the box to settle, then appears.
    <motion.header
      // Inside a module the only child left is the compact back link, which is `lg:hidden`.
      // Hiding the wrapper too at lg reclaims its margin instead of leaving a 24px void, and
      // does it on the SAME breakpoint as the link — a JS check on `isCompact` (992px) would
      // disagree with `lg:` (1024px) and drop the back link between the two.
      className={`${HEADER_WRAP}${activeModule ? ' lg:hidden' : ''}`}
      initial={fadeAnimation.initial}
      animate={fadeAnimation.animate}
      transition={contentRevealTransition}
    >
      {/* Colour on the inner span — Reboot's `a { color }` beats text-* utilities. */}
      <Link to={homePath} className={HEADER_BACK}>
        <ArrowBackRounded sx={{ fontSize: 15 }} />
        <span className={HEADER_BACK_TEXT}>All applications</span>
      </Link>

      {/* Inside a MODULE the page owns its own title and toolbar, and the breadcrumb now
          lives on the header bar — so the shell contributes nothing here. Repeating the name
          would put two headings on one screen, the duplication the module strip went for. */}
      {!activeModule && (
        <>
          <div className={HEADER_IDENTITY}>
            <span className={`${HEADER_GLYPH} ${accent.iconWrap}`} aria-hidden="true">
              <Icon sx={{ fontSize: 24 }} />
            </span>
            {/* role="heading" rather than <h1>: Metronic styles h1 unlayered, which beats
                Tailwind's layered utilities outright — see shellTokens.ts. */}
            <div className="min-w-0">
              <div role="heading" aria-level={1} className={WORKSPACE_TITLE}>
                {activeApp.title}
              </div>
              <div className={WORKSPACE_SUBTITLE}>
                {activeApp.moduleCount} {activeApp.moduleCount === 1 ? 'module' : 'modules'} available
              </div>
            </div>
          </div>
          <div className={HEADER_RULE} />
        </>
      )}
    </motion.header>
  );
}
