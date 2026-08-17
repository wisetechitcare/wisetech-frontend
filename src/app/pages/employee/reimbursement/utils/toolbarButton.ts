import { CSSProperties } from 'react';

/**
 * The one toolbar button style for this module.
 *
 * There were three copies of it — Download Slip, Add Request, Send for Approval — written inline
 * in two files. They agreed on height and radius by coincidence and disagreed on everything else,
 * and none of them set a `gap`, so every icon sat flush against its own label.
 *
 * The metrics are `PeriodNavigator`'s, not new ones: 36px tall, 8px radius, 12px text. These
 * buttons sit on the same line as the date navigator, so matching it is the entire job — a
 * toolbar where one control is 34px and its neighbour is 36px reads as broken even when nobody
 * can say why.
 */

/** Shared by every variant. Height and radius are the period navigator's, deliberately. */
const BASE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    // The gap all four were missing. Without it the glyph touches the first letter.
    gap: '8px',
    // `border-box` and an explicit 36px on BOTH axes of the box model. The navigator sets
    // height 36 inside a 1.5px border and gets 36px total; a bare <button> inherits Metronic's
    // global padding and line-height and does not, which is why the green button rendered
    // taller than the date navigator sitting beside it.
    boxSizing: 'border-box',
    height: '36px',
    minHeight: '36px',
    maxHeight: '36px',
    padding: '0 16px',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '12px',
    // Fixed, not inherited. A line-height above 1 pushes the text box past 36px and the browser
    // grows the button to fit.
    lineHeight: 1,
    whiteSpace: 'nowrap',
    // Buttons do not inherit the page font by default, and a fallback face at 12px is a
    // different width — which is how two buttons with identical padding end up different sizes.
    fontFamily: 'inherit',
    transition: 'background-color .2s ease, border-color .2s ease, box-shadow .2s ease, opacity .2s ease',
};

/** A filled action. `shadow` is the tone's own colour at low alpha, so it reads as lift not dirt. */
export const solidToolbarButton = (
    background: string,
    shadow: string,
    disabled = false,
): CSSProperties => ({
    ...BASE,
    border: '1.5px solid transparent',
    background,
    color: '#fff',
    boxShadow: `0 2px 6px ${shadow}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.65 : 1,
});

/**
 * A quiet action.
 *
 * The border is 1.5px to match `PeriodNavigator`'s exactly — with `border-box` it costs no
 * height, and a 1px border beside the navigator's 1.5px is visible as a weight difference at
 * this size.
 */
export const outlineToolbarButton = (disabled = false): CSSProperties => ({
    ...BASE,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.65 : 1,
});

/**
 * The row these sit in.
 *
 * They were split across two containers — the period bar and a separate action bar with its own
 * `paddingRight` — so the two rows' right edges never lined up. One row, one gap, wrapping as a
 * unit.
 */
export const TOOLBAR_ROW = 'd-flex align-items-center flex-wrap gap-2';

/** Hover/leave handlers, so a call site does not hand-roll the same two mouse listeners again. */
export const hoverSwap = (enter: Partial<CSSStyleDeclaration>, leave: Partial<CSSStyleDeclaration>) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, enter),
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, leave),
});