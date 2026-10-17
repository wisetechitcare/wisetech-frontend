// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
    menuGeometryInBoundary,
    menuPropsInside,
    popperInside,
    useDropdownBoundary,
} from './dropdownBoundary';

afterEach(cleanup);

/**
 * A dropdown must stay inside the sheet it belongs to.
 *
 * The bug these pin: opening the Project picker in the meeting dialog and then scrolling left
 * the list clamped to the TOP OF THE PAGE — over the header, clear of the modal, with its own
 * field nowhere in sight. Popper's default boundary is the viewport, and a modal is much
 * smaller than one.
 */

/** The boundary each modifier was handed. */
const boundaries = (slotProps: ReturnType<typeof popperInside>) =>
    Object.fromEntries(slotProps.popper.modifiers.map((m: any) => [m.name, m.options.boundary]));

describe('popperInside', () => {
    test('constrains BOTH flip and preventOverflow to the given element', () => {
        // Only preventOverflow keeps a list off the page header; only flip makes it open
        // upward when the field sits near the footer. Bounding one and not the other fixes
        // half the bug.
        const el = document.createElement('div');
        expect(boundaries(popperInside(el))).toEqual({ flip: el, preventOverflow: el });
    });

    test('no scrolling ancestor falls back to popper’s own default, not to nothing', () => {
        // A picker on an ordinary page has no sheet to stay inside. `clippingParents` is the
        // right answer there — passing null would unbound it entirely.
        expect(boundaries(popperInside(null)))
            .toEqual({ flip: 'clippingParents', preventOverflow: 'clippingParents' });
    });

    test('hides the list once the field has scrolled out of the boundary', () => {
        // Popper sets `data-popper-reference-hidden` itself; clamping alone would leave the
        // list pinned to the top of the sheet, reading as a menu for whatever it covers.
        expect((popperInside(null).popper.sx as any)['&[data-popper-reference-hidden]'])
            .toEqual({ visibility: 'hidden', pointerEvents: 'none' });
    });
});

/** Reports which element the hook resolved, so the walk-up can be asserted on. */
function Probe() {
    const { ref, slotProps } = useDropdownBoundary();
    const found = slotProps.popper.modifiers[0].options.boundary as HTMLElement | string;
    return (
        <div ref={ref} data-testid="probe">
            {typeof found === 'string' ? found : found.id || 'unnamed'}
        </div>
    );
}

describe('useDropdownBoundary', () => {
    test('walks up to the nearest SCROLLING ancestor, not just the parent', () => {
        // The dialog's scroll port is two levels up from the form body in the real tree, so
        // taking `parentElement` would bound the list to a box that does not scroll.
        render(
            <div id="page">
                <div id="port" style={{ overflowY: 'auto' }}>
                    <div id="inner">
                        <Probe />
                    </div>
                </div>
            </div>,
        );
        expect(screen.getByTestId('probe').textContent).toBe('port');
    });

    test('nothing scrolls, nothing is bounded — the list is free on a plain page', () => {
        render(<div id="page"><Probe /></div>);
        expect(screen.getByTestId('probe').textContent).toBe('clippingParents');
    });
});

describe('menuPropsInside', () => {
    test('mounts the Select menu into the scroll port when one exists', () => {
        const el = document.createElement('div');
        expect(menuPropsInside(el).container).toBe(el);
        expect(menuPropsInside(null).container).toBeUndefined();
    });

    test('flips anchor origin when the field sits near the bottom of the sheet', () => {
        const props = menuPropsInside(null, { anchorOriginVertical: 'top', maxHeight: 180 });
        expect(props.anchorOrigin.vertical).toBe('top');
        expect(props.transformOrigin.vertical).toBe('bottom');
        expect(props.PaperProps.sx.maxHeight).toBe(180);
    });
});

describe('menuGeometryInBoundary', () => {
    test('opens upward and caps height when more room sits above the control', () => {
        const anchor = { top: 400, bottom: 440, left: 0, right: 100, width: 100, height: 40, x: 0, y: 400, toJSON: () => ({}) } as DOMRect;
        const boundary = { top: 100, bottom: 480, left: 0, right: 400, width: 400, height: 380, x: 0, y: 100, toJSON: () => ({}) } as DOMRect;
        const geo = menuGeometryInBoundary(anchor, boundary, 260);
        expect(geo.menuPlacement).toBe('top');
        expect(geo.maxMenuHeight).toBeLessThanOrEqual(260);
        expect(geo.maxMenuHeight).toBeGreaterThanOrEqual(96);
    });
});
