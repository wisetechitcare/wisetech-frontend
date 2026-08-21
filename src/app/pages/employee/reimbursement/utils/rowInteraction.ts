import React from 'react';

/**
 * Makes a table row that acts like a button behave like one.
 *
 * Every drill-down in this module is a bare `onClick` on a `<tr>`: no role, no tabIndex, no key
 * handler. A mouse user can open a batch; a keyboard user cannot reach it at all, and a screen
 * reader is never told the row does anything. The row is the ONLY route to the detail modal on
 * several screens, so this is not a nicety — it is the difference between the feature existing
 * and not.
 *
 * Spread the result into `muiTableBodyRowProps` alongside any `sx` the caller already sets.
 */
export const clickableRowProps = (
    onActivate: () => void,
    label: string,
): {
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: 'button';
    tabIndex: 0;
    'aria-label': string;
} => ({
    onClick: onActivate,
    // Enter and Space are what a button responds to, so a row claiming role="button" must too.
    // Space is prevented from scrolling the page, which is its default on a non-control.
    onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
        }
    },
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
});

/** Focus ring for a keyboard-reachable row — the default outline is clipped by table overflow. */
export const CLICKABLE_ROW_SX = {
    cursor: 'pointer',
    '&:focus-visible': {
        outline: '2px solid #2563eb',
        outlineOffset: '-2px',
    },
} as const;
