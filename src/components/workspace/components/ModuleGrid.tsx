import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  navIcon, sectionAccent,
  CLUSTER_HEADING, CLUSTER_RULE, CLUSTER_WRAP,
  MODULE_CELL, MODULE_GLYPH, MODULE_GRID, MODULE_ICON_SIZE, MODULE_LABEL, MODULE_TEXT,
  TILE_BADGE,
} from '../shellTokens';
import { cardHover, moduleTileVariants } from '../motion';
import type { WorkspaceApp, WorkspaceModule } from '../types';

const MotionLink = motion.create(Link);

/**
 * An application's modules, rendered INSIDE the workspace.
 *
 * ─── THIS IS WHAT REPLACES THE MODAL ─────────────────────────────────────────
 * The previous shell opened NavSectionDialog on tile click and, for a grouped section
 * (Project Team, Finance, Organization), opened a SECOND level behind a back control inside
 * the same dialog. Both levels collapse into this one surface:
 *   • top-level links  → module cards
 *   • groups           → a labelled cluster of module cards
 * There is no drill-in, no dialog, no back control, and no third level to add later, because
 * WorkspaceModule has no children (see types.ts).
 *
 * ─── HORIZONTAL CARDS, NOT SMALL TILES ───────────────────────────────────────
 * A wrapping row of 56px tiles stranded a large empty gutter on any wide screen and became
 * an unscannable field of near-identical glyphs past a dozen items. Horizontal cards in a
 * responsive grid fill the width intentionally, stay legible at thirty items, and collapse
 * to one comfortable column on a phone.
 *
 * Hierarchy is deliberate: application tiles carry a TINTED plate, module cards a NEUTRAL
 * plate with an accent glyph. The rail and the workspace therefore never compete for the
 * same level of attention.
 *
 * ─── THE CASCADE ─────────────────────────────────────────────────────────────
 * Cards fade up six pixels, in order, 26ms apart, with the count running continuously across
 * the grid AND its clusters so the reveal reads as one wave rather than several competing
 * ones. The stagger is capped (motion.ts) so a thirty-module application reads as one motion
 * instead of a visible queue.
 *
 * Enter-only, and deliberately so. An exit animation would need AnimatePresence keyed on the
 * route, which races the ~65 lazy route chunks: the grid would still be leaving while a
 * Suspense fallback mounted underneath it.
 */

function ModuleCard({
  module, accentIcon, index,
}: { module: WorkspaceModule; accentIcon: string; index: number }) {
  const Icon = navIcon(module.fontIcon);
  return (
    <MotionLink
      variants={moduleTileVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={cardHover}
      to={module.to}
      title={module.title}
      className={MODULE_CELL}
    >
      <span className={MODULE_GLYPH}>
        <Icon sx={{ fontSize: MODULE_ICON_SIZE }} className={accentIcon} />
        {!!module.badgeCount && (
          <span className={TILE_BADGE} aria-label={`${module.badgeCount} pending`}>
            {module.badgeCount > 99 ? '99+' : module.badgeCount}
          </span>
        )}
      </span>
      {/* Title only. A meta line here would be filler — there is no second fact about a
          module worth stating, and inventing one (the route path, a fake description) is how
          cards start looking like a debug view. */}
      <span className={MODULE_TEXT}>
        <span className={MODULE_LABEL}>{module.title}</span>
      </span>
    </MotionLink>
  );
}

export function ModuleGrid({ app }: { app: WorkspaceApp }) {
  const accent = sectionAccent(app.id);
  // One continuous sequence across the whole grid — clusters continue the count rather than
  // restarting it, so the reveal reads as one wave instead of several starting at once.
  let order = 0;

  return (
    <div className="flex flex-col gap-9">
      {app.modules.length > 0 && (
        <div className={MODULE_GRID}>
          {app.modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              accentIcon={accent.icon}
              index={order++}
            />
          ))}
        </div>
      )}

      {app.clusters.map((cluster) => (
        <section key={cluster.id} className={CLUSTER_WRAP} aria-labelledby={`cluster-${cluster.id}`}>
          {/* role="heading" rather than <h2>: Metronic styles h2 unlayered and beats
              Tailwind's layered utilities, so an <h2> rendered at 19.5px however small the
              class said. See shellTokens.ts for the measurements. */}
          <div
            role="heading"
            aria-level={2}
            id={`cluster-${cluster.id}`}
            className={CLUSTER_HEADING}
          >
            {cluster.title}
            <span className={CLUSTER_RULE} aria-hidden="true" />
          </div>
          <div className={MODULE_GRID}>
            {cluster.modules.map((module) => (
              <ModuleCard
                key={module.id}
                // Children carry no icon of their own in the nav tree, so they take the
                // cluster's glyph rather than an invented one.
                module={{ ...module, fontIcon: module.fontIcon ?? cluster.fontIcon }}
                accentIcon={accent.icon}
                index={order++}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
