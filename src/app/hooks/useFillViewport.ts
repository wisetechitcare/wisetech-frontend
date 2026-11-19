/**
 * useFillViewport — give an element exactly the height that is left below it.
 *
 * A workspace screen (Kanban board, split inbox, map, a document beside its sidebar) is supposed to
 * END at the bottom of the window: its panes scroll internally, the page itself does not. Getting
 * there normally means a hardcoded `calc(100vh - 220px)` somewhere, and that number is a lie the
 * moment the header wraps on a laptop, a breadcrumb bar appears, the OS font size changes, or a
 * phone's URL bar slides away. Every screen then picks its own slightly-wrong constant.
 *
 * So the height is MEASURED, not written down, against whatever actually scrolls — the window on a
 * routed page, the dialog when the screen is hosted in a full-screen dialog:
 *   - where the element starts inside that scroller (everything above it), and
 *   - how much the scroller still lays out after it (content padding, footer — everything below),
 * and the rest of the scroller's visible height is published as a CSS custom property (`--wt-fill-h`
 * by default). Consumers stay declarative and Tailwind-native:
 *
 *     const fillRef = useFillViewport();
 *     <div ref={fillRef} className="flex h-[var(--wt-fill-h)] flex-col overflow-hidden"> … </div>
 *
 * "Everything below" is measured by PROBING rather than by walking the DOM and guessing which
 * nodes count: the element is briefly made very tall, so the scroller is certainly longer than its
 * view, and what the scroller lays out past the element's end is then simply read off. Nothing is
 * painted in between — the probe and the final value are written in the same frame.
 *
 * Below `minViewportWidth` the property is set to `auto` — on a phone the panes stack, and a
 * stacked layout should scroll with the page rather than fight for one screenful.
 */
import { useLayoutEffect, useState } from 'react';

export interface UseFillViewportOptions {
    /** Never shrink past this (px). Below it the page is allowed to scroll instead. */
    minHeight?: number;
    /** Extra breathing room under the element. */
    bottomGap?: number;
    /**
     * Chrome pinned over the bottom with `position: fixed` whose height must be left free. An
     * in-flow footer needs no listing: everything laid out below the element is measured anyway.
     */
    reserveSelector?: string | null;
    /** The custom property to publish on the element. */
    varName?: string;
    /** Below this viewport width the element goes back to `height: auto`. Matches MUI's `lg`. */
    minViewportWidth?: number;
}

/** Tall enough that no real layout above or below the element can be longer. */
const PROBE = 100_000;

const pageScroller = () => (document.scrollingElement ?? document.documentElement) as HTMLElement;

/** The nearest ancestor that actually scrolls (overflow auto/scroll and taller inside than out), else the page. */
const scrollerOf = (el: HTMLElement): HTMLElement => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return node;
    }
    return pageScroller();
};

export const useFillViewport = <T extends HTMLElement = HTMLDivElement>({
    minHeight = 420,
    bottomGap = 0,
    reserveSelector = '#kt_footer',
    varName = '--wt-fill-h',
    minViewportWidth = 1200,
}: UseFillViewportOptions = {}) => {
    // A callback ref, not useRef: a screen that first renders a loading state mounts the element
    // LATER, and the measuring effect has to run when it appears, not only on the first render.
    const [el, setEl] = useState<T | null>(null);

    // Layout effect, not effect: the property must exist before the browser paints, or the board
    // flashes at its natural height on every mount.
    useLayoutEffect(() => {
        if (!el) return;

        let frame = 0;
        let last = '';

        const write = (value: string) => {
            el.style.setProperty(varName, value);
            last = value;
        };

        const measure = () => {
            frame = 0;
            if (window.innerWidth < minViewportWidth) {
                if (last !== 'auto') write('auto');
                return;
            }

            // Probe: with the element this tall, the scroller is longer than its view, so its
            // scrollHeight is exactly above + element + below — no slack hiding in it.
            el.style.setProperty(varName, `${PROBE}px`);
            const scroller = scrollerOf(el);
            const isPage = scroller === pageScroller();
            const viewHeight = isPage ? window.innerHeight : scroller.clientHeight;
            const viewTop = isPage ? 0 : scroller.getBoundingClientRect().top;
            const rect = el.getBoundingClientRect();
            // Position inside the scroller's content, so a scrolled page reads the same as an unscrolled one.
            const above = rect.top - viewTop + scroller.scrollTop;
            const below = Math.max(0, scroller.scrollHeight - above - rect.height);

            const pinned = reserveSelector ? document.querySelector<HTMLElement>(reserveSelector) : null;
            const reserved = pinned && getComputedStyle(pinned).position === 'fixed' ? pinned.getBoundingClientRect().height : 0;

            const available = viewHeight - above - below - reserved - bottomGap;
            // Always written: the probe replaced the value, even when the answer is unchanged.
            write(`${Math.round(Math.max(minHeight, available))}px`);
        };

        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(measure);
        };

        measure();

        // What can move the element's start or what sits below it: the page, the element's own
        // container (a header that wraps), and the scroller (a dialog resizing). The element's own
        // height is what we set, so its observer callbacks settle after one pass.
        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        if (el.parentElement) observer.observe(el.parentElement);
        const scroller = scrollerOf(el);
        if (scroller !== pageScroller()) observer.observe(scroller);

        window.addEventListener('resize', schedule);
        window.addEventListener('orientationchange', schedule);
        // Mobile browsers change the visual viewport (URL bar, on-screen keyboard) without
        // firing a window resize.
        window.visualViewport?.addEventListener('resize', schedule);

        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('orientationchange', schedule);
            window.visualViewport?.removeEventListener('resize', schedule);
        };
    }, [el, minHeight, bottomGap, reserveSelector, varName, minViewportWidth]);

    return setEl;
};

export default useFillViewport;
