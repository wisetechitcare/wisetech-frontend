import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeRounded from '@mui/icons-material/HomeRounded';
import {
  DOCK_DIVIDER, DOCK_HOME_GLYPH, DOCK_HOME_LABEL, DOCK_HOME_LINK, DOCK_HOME_ROW,
  TILE_ICON_SIZE_DOCKED,
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
function DockHomeLinkBase({ to, trailing }: { to: string; trailing?: ReactNode }) {
  return (
    <>
      {/* `trailing` is a SLOT, same arrangement as AppDock's `leading`: the row is the top
          of the rail and the natural home for a rail-wide control, but this component does
          not get to decide what that control is. It must sit BESIDE the link, never inside
          it — an interactive element nested in an anchor is unreachable by keyboard.
          `data-dock-text` so the collapsed rail drops it with the labels; there is no room
          for a second glyph beside Home at 84px. */}
      <div className={DOCK_HOME_ROW}>
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
          <span data-dock-text className={DOCK_HOME_LABEL}>Home</span>
        </MotionLink>
        {trailing && <span data-dock-text className="shrink-0">{trailing}</span>}
      </div>
      <span className={DOCK_DIVIDER} aria-hidden="true" />
    </>
  );
}

export const DockHomeLink = memo(DockHomeLinkBase);
