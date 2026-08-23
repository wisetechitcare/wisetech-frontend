/**
 * Menu behaviour every `react-select` on this app should have.
 *
 * A bare `<Select>` renders its menu as a child of the control, so two things go wrong the
 * moment the control is inside a card, a dialog, or a wizard step:
 *
 *   1. Any ancestor with `overflow: hidden` (every glass dialog, every rounded card) CLIPS
 *      the menu — options are simply not there. Portalling the menu to <body> is the only
 *      reliable escape; no amount of z-index fixes a clipped box.
 *   2. The menu always drops DOWNWARD, so a control near the bottom of the viewport opens
 *      into no space at all and the list is unreachable. `menuPlacement: 'auto'` flips it
 *      above the control when below cannot fit — the behaviour Atlassian's dropdown and
 *      Semantic UI both ship by default.
 *
 * `menuPosition: 'fixed'` pairs with the portal so the menu stays glued to its control while
 * an ancestor scrolls, and `maxMenuHeight` gives the list its own scrollbar instead of
 * letting a long list run off-screen.
 *
 * zIndex 1500 clears MUI's Dialog/Modal layer (1300) and Metronic's modal (~1055), so the
 * menu is never painted behind the surface that owns it.
 *
 * Usage: `<Select {...FLOATING_MENU_PROPS} … />`. If the call site passes its own `styles`,
 * spread these first and merge `menuPortal` yourself so the z-index survives.
 */
/**
 * Behaviour only — no `styles`. Use this at a call site that passes its OWN `styles` prop,
 * together with MENU_PORTAL_STYLE merged into that object. Spreading the full
 * FLOATING_MENU_PROPS there would either drop the site's styles or lose the portal
 * z-index, depending on prop order — a silent, order-dependent bug.
 */
export const FLOATING_MENU_BEHAVIOUR = {
    menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
    menuPosition: 'fixed' as const,
    menuPlacement: 'auto' as const,
    maxMenuHeight: 260,
};

/** Merge into an existing `styles` object: `{ ...yourStyles, ...MENU_PORTAL_STYLE }`. */
export const MENU_PORTAL_STYLE = {
    menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 1500 }),
};

/** Behaviour + portal z-index. For call sites that pass no `styles` of their own. */
export const FLOATING_MENU_PROPS = {
    ...FLOATING_MENU_BEHAVIOUR,
    styles: MENU_PORTAL_STYLE,
};
