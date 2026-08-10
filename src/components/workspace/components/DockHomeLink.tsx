import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeRounded from '@mui/icons-material/HomeRounded';
import {
  DOCK_DIVIDER, DOCK_HOME_GLYPH, DOCK_HOME_LABEL, DOCK_HOME_LINK, TILE_ICON_SIZE_DOCKED,
} from '../shellTokens';
import { contentRevealTransition, fadeAnimation } from '../motion';

const MotionLink = motion.create(Link);

/**
 * The standing way back to the launcher, shown at the top of the docked rail.
 *
 * Inside the shell the legacy Metronic rail is hidden, so without this the only exits are
 * the browser Back button and the header logo — neither of which reads as "leave this
 * application". A permanent, labelled Home row is the console-style answer, and it sits
 * inside the dock's <nav> landmark so it is discoverable by landmark navigation too.
 *
 * Composed in by WorkspaceLayout through AppDock's `leading` slot rather than being built by
 * the dock: the dock renders application launchers, and this is not one.
 *
 * Fades in AFTER the morph rather than appearing with it. It exists only once you have
 * arrived somewhere, so announcing itself mid-travel would be a second thing competing for
 * attention during the one moment the tiles should own. Opacity only — it must not add a
 * layout animation inside a container that is already reflowing around it.
 */
function DockHomeLinkBase({ to }: { to: string }) {
  return (
    <>
      <MotionLink
        to={to}
        className={DOCK_HOME_LINK}
        title="All applications"
        initial={fadeAnimation.initial}
        animate={fadeAnimation.animate}
        transition={contentRevealTransition}
      >
        <span className={DOCK_HOME_GLYPH}>
          <HomeRounded sx={{ fontSize: TILE_ICON_SIZE_DOCKED }} />
        </span>
        <span className={DOCK_HOME_LABEL}>Home</span>
      </MotionLink>
      <span className={DOCK_DIVIDER} aria-hidden="true" />
    </>
  );
}

export const DockHomeLink = memo(DockHomeLinkBase);
