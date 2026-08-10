import { Link } from 'react-router-dom';
import { navIcon } from './navIcons';
import { TILE_CELL, TILE_ICON_SIZE, TILE_LABEL, TILE_SQUARE, type SectionAccent } from './navTheme';

/**
 * App-launcher tiles: a white square holding the glyph, with the label beneath it.
 *
 * Links and openers render at EXACTLY the same size — same square, same label box. A
 * section or group is not visually bigger for holding more; it simply opens a dialog
 * instead of navigating, so every surface stays an even field of tiles.
 */

export interface NavTileVisual {
  title: string;
  /** Bootstrap Icons class from the nav tree; mapped to a Material icon. */
  icon?: string;
  /** Pending-approval alert. Not an item count. */
  badgeCount?: number;
}

/** Corner alert. Absolute, so it can never change the square's size. */
function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 py-0.5 text-[10.5px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function TileFace({ visual, accent }: { visual: NavTileVisual; accent: SectionAccent }) {
  const Icon = navIcon(visual.icon);
  return (
    <>
      <span className={`${TILE_SQUARE} ${accent.hoverBorder}`}>
        <Icon sx={{ fontSize: TILE_ICON_SIZE }} className={accent.icon} />
        {!!visual.badgeCount && <Badge count={visual.badgeCount} />}
      </span>
      <span className={TILE_LABEL}>{visual.title}</span>
    </>
  );
}

/** A destination. */
export function NavLinkTile({
  to, visual, accent, onNavigate,
}: { to: string; visual: NavTileVisual; accent: SectionAccent; onNavigate?: () => void }) {
  return (
    // The anchor is a bare wrapper: Bootstrap's Reboot styles `a`, and its unlayered
    // rules outrank Tailwind's layered utilities. Keeping the visual classes on inner
    // elements sidesteps that entirely.
    <Link to={to} title={visual.title} className={TILE_CELL} onClick={onNavigate}>
      <TileFace visual={visual} accent={accent} />
    </Link>
  );
}

/** An opener — a section on Home, or a group inside a section dialog. Identical tile. */
export function NavOpenerTile({
  visual, accent, onOpen,
}: { visual: NavTileVisual; accent: SectionAccent; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" title={visual.title} className={TILE_CELL}>
      <TileFace visual={visual} accent={accent} />
    </button>
  );
}
