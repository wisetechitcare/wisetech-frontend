import { useCallback, useMemo, useState } from 'react';

/**
 * Keep a dropdown INSIDE the sheet it belongs to.
 *
 * ─── THE PROBLEM THIS EXISTS FOR ─────────────────────────────────────────────────────
 * MUI renders an Autocomplete's or a Select's list in a PORTAL at `document.body`, so nothing
 * about the dialog around the field constrains it. Popper's default boundary is the VIEWPORT,
 * and the viewport is much bigger than a modal — which produces two failures, both of which
 * have been reported as bugs on this product:
 *
 *  1. A field near the bottom opens DOWNWARD and the list runs past the footer and off the
 *     sheet. The list is still inside the viewport, so `flip` never fires.
 *  2. A field scrolled out of view ABOVE takes its list with it — `preventOverflow` clamps the
 *     list to the top of the viewport, so it detaches from its field and lands over the page
 *     header, floating above the modal with nothing to anchor it.
 *
 * Handing Popper the dialog's own SCROLL PORT as the boundary means "stay inside the form": the
 * list flips above the field when there is no room below, and is capped to what remains either
 * way. And `data-popper-reference-hidden` — which Popper already sets once the anchor has
 * scrolled clean out of the boundary — is used to hide the list outright, because a list with
 * no visible field attached to it is not something a person can read an association off.
 *
 * ─── WHY IT IS HERE AND NOT IN A DIALOG ──────────────────────────────────────────────
 * It was written inside the task form, and the meeting form then grew the same bug because the
 * fix was three lines in somebody else's file rather than something to reach for. Both consume
 * this now. Anything with a scroll port and a portalled menu wants it.
 */

/** Overflow values that make an element a scroll container. */
const SCROLLS = /auto|scroll|overlay/;

/**
 * The nearest ancestor that scrolls, or null for "nothing does".
 *
 * Null is a real answer and not a failure: a picker on an ordinary page has no sheet to stay
 * inside, and `clippingParents` — Popper's own default — is the right boundary there.
 */
const scrollParentOf = (node: HTMLElement): HTMLElement | null => {
    for (let el = node.parentElement; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (SCROLLS.test(style.overflowY) || SCROLLS.test(style.overflow)) return el;
    }
    return null;
};

/**
 * `slotProps` for an Autocomplete whose list must stay within `boundary`.
 *
 * Exported on its own for callers that already hold the element — the task form keeps its own
 * ref to its scroll port and passes it straight in.
 */
export const popperInside = (boundary: HTMLElement | null) => ({
    popper: {
        modifiers: [
            { name: 'flip', options: { boundary: boundary ?? 'clippingParents', padding: 8 } },
            { name: 'preventOverflow', options: { boundary: boundary ?? 'clippingParents', padding: 8 } },
        ],
        // Popper sets this once the anchor has scrolled out of the boundary entirely. Hidden
        // rather than clamped: a list pinned to the top of the sheet with its field nowhere in
        // sight reads as a menu belonging to whatever it happens to be covering.
        sx: {
            '&[data-popper-reference-hidden]': { visibility: 'hidden', pointerEvents: 'none' },
        },
    },
});

/**
 * Find the scroll port for yourself, and get the `slotProps` that stay inside it.
 *
 * Put `ref` on any element inside the sheet — the component's own root will do, since MUI
 * forwards a ref to it — and spread `slotProps` onto every Autocomplete that should be
 * constrained.
 *
 * STATE, not a ref, for the boundary. A ref is still null on the first render, so a value read
 * off one has to be rebuilt every render to avoid capturing that null — which is easy to get
 * wrong by memoising it, and the constraint then silently never applies. Resolving into state
 * means the re-render happens once, when the element actually exists.
 */
export const useDropdownBoundary = () => {
    const [boundary, setBoundary] = useState<HTMLElement | null>(null);
    const ref = useCallback((node: HTMLElement | null) => {
        setBoundary(node ? scrollParentOf(node) : null);
    }, []);
    return { ref, slotProps: useMemo(() => popperInside(boundary), [boundary]) };
};
