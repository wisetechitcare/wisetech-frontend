import React from 'react';
import { Tooltip } from '@mui/material';
import type { TooltipProps } from '@mui/material';

/**
 * WtTooltip — the app's tooltip.
 *
 * MUI's `Tooltip` was imported directly by ~17 page files, each passing its own `arrow`,
 * `placement` and delays, so the same hint appeared above one control and below the next, some
 * with an arrow and some without. This fixes the presentation in one place: arrow, top
 * placement, a short enter delay so a tooltip does not flash while the pointer crosses a row,
 * and no delay on re-entry within a group.
 *
 * TWO THINGS IT DOES THAT A RAW `Tooltip` DOES NOT:
 *
 * 1. **An empty title renders nothing at all.** MUI keeps the wrapper and the listeners for an
 *    empty string, so a conditional hint left an invisible interaction attached to the element.
 *    Here `title` may be null/undefined/'' and the child is returned untouched.
 *
 * 2. **A disabled child still shows its tooltip.** A disabled button fires no pointer events, so
 *    MUI never sees the hover — which is exactly when someone most needs to be told why the
 *    control is unavailable. `wrap` puts the child in a `<span>` that does receive them. Call
 *    sites were doing this by hand (`<span><Chip …/></span>`), or forgetting to.
 *
 * For an icon button, reach for `ActionIconButton` instead — it already carries a tooltip and an
 * accessible name. This is for everything else: a chart bar, a chip, a truncated label.
 *
 * Do NOT put a tooltip on a native `title` attribute: it never appears on touch, cannot be
 * themed and duplicates whatever this renders.
 */
export interface WtTooltipProps extends Omit<TooltipProps, 'title' | 'children'> {
    /** Nothing renders when this is empty — no wrapper, no listeners. */
    title?: React.ReactNode;
    children: React.ReactElement;
    /**
     * Wrap the child in a `<span>` so a DISABLED control still triggers the tooltip. Use it for
     * a disabled button, and for anything that does not forward refs or DOM props.
     */
    wrap?: boolean;
}

export const WtTooltip: React.FC<WtTooltipProps> = ({
    title, children, wrap = false, arrow = true, placement = 'top', enterDelay = 350, enterNextDelay = 100, ...rest
}) => {
    const empty = title === null || title === undefined || title === '';
    if (empty) return children;
    return (
        <Tooltip
            title={title}
            arrow={arrow}
            placement={placement}
            enterDelay={enterDelay}
            enterNextDelay={enterNextDelay}
            {...rest}
        >
            {wrap ? <span>{children}</span> : children}
        </Tooltip>
    );
};

export default WtTooltip;
