/**
 * Class names shared by BOTH kits.
 *
 * The MUI kit and the Tailwind twin (`ui/tw`) are deliberately separate — the twin imports no
 * MUI at all, which is the point of it. But a hover recipe that reaches into a child needs a
 * selector, and if each kit declared its own string they would drift and the selector would
 * quietly stop matching in one of them.
 *
 * This module has no imports on purpose. Anything either kit can depend on belongs here;
 * anything that needs a component does not.
 */

/** Stamped on every `IconBox`, so a hovering surface can animate the glyph inside it. */
export const ICON_BOX_CLASS = 'wt-iconbox';

/** Stamped on a tile's quiet caption, so the same hover recipe can sharpen it. */
export const TILE_LABEL_CLASS = 'wt-tile-label';
