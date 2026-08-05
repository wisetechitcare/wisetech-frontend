import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  navIcon, sectionAccent,
  TILE_ACTIVE_BAR, TILE_BADGE,
  TILE_CELL_ACTIVE, TILE_CELL_DOCKED, TILE_CELL_HOME,
  TILE_GLYPH_DOCKED, TILE_GLYPH_HOME,
  TILE_ICON_SIZE_DOCKED, TILE_ICON_SIZE_HOME,
  TILE_LABEL_DOCKED, TILE_LABEL_HOME,
  TILE_META_DOCKED, TILE_META_HOME,
  TILE_TEXT_DOCKED, TILE_TEXT_HOME,
} from '../shellTokens';
import {
  cardHover, GLYPH_RADIUS, homewardSpring, navigationSpring, pressAnimation, railDelay,
} from '../motion';
import type { DockApp, ShellMode } from '../types';

/**
 * Created ONCE at module scope. Building a motion component inside render would produce a
 * new component type every render, remounting the tile and destroying the very layout
 * continuity this file exists to provide.
 */
const MotionLink = motion.create(Link);

/**
 * One application — a launcher CARD at Home, a rail ROW when docked.
 *
 * ─── THIS IS THE MORPH ───────────────────────────────────────────────────────
 * There is no fade, no crossfade, no `layoutId` bridge and no second component. This is ONE
 * persistent DOM node whose CSS layout changes; `layout` measures it before and after the
 * commit and animates the difference (FLIP). "Nothing disappears, nothing duplicates" is
 * therefore structurally true rather than simulated — the node is never unmounted.
 *
 * That only holds because both modes render the SAME elements, in the SAME order, with the
 * SAME nesting — including the meta line, which is why it is never conditionally mounted.
 * A future change that renders different markup per mode silently converts this into a
 * cross-fade and takes tab order and focus continuity with it.
 *
 * ─── WHY THE CARD GOT BIGGER ─────────────────────────────────────────────────
 * The morph previously travelled an 80px bare square into a 36px bare square, which is
 * technically a transformation and perceptually nothing. A 200×150 card with a tinted plate,
 * a title and a meta line collapsing into a 40px rail row is the same motion code reading as
 * an actual transformation. The visual weight IS the drama.
 *
 * ─── THE RIPPLE ──────────────────────────────────────────────────────────────
 * `railDelay` measures distance from the card you PRESSED, not from index 0, so movement
 * propagates outward from the point of contact. Neighbours react; they do not queue.
 *
 * Three details that keep it clean:
 *   • The PLATE carries `layout` (position + size); the TEXT BLOCK carries
 *     `layout="position"`. Text must move without being scaled — a scaled label squishes and
 *     is the single most obvious tell of a naive layout animation.
 *   • `borderRadius` comes through `style`, not a class, so framer can counter-scale it.
 *   • The ICON has no motion at all. It scales with its plate for free, and the icon:plate
 *     ratio is identical in both modes so it lands exactly. See motion.ts → GLYPH_SIZE.
 *
 * Reduced motion is handled centrally by MotionConfig in WorkspaceLayout: framer drops the
 * transform and layout animations and keeps opacity, so the layout changes instantly. There
 * is deliberately no per-component branch here.
 *
 * Pure UI otherwise: reads no context, computes no routes, knows no permissions, and takes a
 * `DockApp` that structurally cannot carry module data.
 */
function AppTileBase({
  app, mode, active, index, activeIndex,
}: {
  app: DockApp;
  mode: ShellMode;
  active: boolean;
  index: number;
  activeIndex: number;
}) {
  const home = mode === 'home';
  const accent = sectionAccent(app.id);
  const Icon = navIcon(app.icon);

  // Outbound (Home → Workspace) breathes and ripples: the cards are the subject, so they get
  // a beat and a sequence. Inbound is synchronised and stiffer — a staggered exit reads as
  // hesitant, a synchronised one reads as decisive.
  const transition = home
    ? homewardSpring
    : { ...navigationSpring, delay: railDelay(index, activeIndex) };

  return (
    // The anchor is a bare layout wrapper: Bootstrap's Reboot styles `a`, and its unlayered
    // rules outrank Tailwind's layered utilities. Keeping every visual class on the inner
    // elements sidesteps that entirely.
    <MotionLink
      layout
      transition={transition}
      whileHover={home ? cardHover : undefined}
      whileTap={pressAnimation}
      to={app.path}
      title={app.title}
      aria-current={active ? 'page' : undefined}
      className={[
        home ? TILE_CELL_HOME : TILE_CELL_DOCKED,
        !home && active ? TILE_CELL_ACTIVE : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Accent bar on the selected rail row. `bg-current` takes its colour from the section
          accent's text class, so there is no second per-application colour map to drift. */}
      {!home && active && (
        <span className={`${accent.icon} ${TILE_ACTIVE_BAR}`} aria-hidden="true" />
      )}

      <motion.span
        layout
        transition={transition}
        className={`${home ? TILE_GLYPH_HOME : TILE_GLYPH_DOCKED} ${accent.iconWrap}`}
        style={{ borderRadius: home ? GLYPH_RADIUS.home : GLYPH_RADIUS.docked }}
      >
        <Icon sx={{ fontSize: home ? TILE_ICON_SIZE_HOME : TILE_ICON_SIZE_DOCKED }} />
        {!!app.badgeTotal && (
          <span className={TILE_BADGE} aria-label={`${app.badgeTotal} pending`}>
            {app.badgeTotal > 99 ? '99+' : app.badgeTotal}
          </span>
        )}
      </motion.span>

      <motion.span
        layout="position"
        transition={transition}
        className={home ? TILE_TEXT_HOME : TILE_TEXT_DOCKED}
      >
        <span className={home ? TILE_LABEL_HOME : TILE_LABEL_DOCKED}>{app.title}</span>
        <span className={home ? TILE_META_HOME : TILE_META_DOCKED}>
          {app.moduleCount} {app.moduleCount === 1 ? 'module' : 'modules'}
        </span>
      </motion.span>
    </MotionLink>
  );
}

export const AppTile = memo(AppTileBase);
