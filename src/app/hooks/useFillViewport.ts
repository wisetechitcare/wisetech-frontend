/**
 * useFillViewport — give an element exactly the height that is left below it.
 *
 * A workspace screen (Kanban board, split inbox, map) is supposed to END at the bottom of the
 * window: its panes scroll internally, the page itself does not. Getting there normally means a
 * hardcoded `calc(100vh - 220px)` somewhere, and that number is a lie the moment the header wraps
 * on a laptop, a breadcrumb bar appears, the OS font size changes, or a phone's URL bar slides
 * away. Every screen then picks its own slightly-wrong constant.
 *
 * So the offset is MEASURED, not written down: the element reports where it actually starts, the
 * footer reports how tall it actually is, and what remains of the viewport is published as a CSS
 * custom property (`--wt-fill-h` by default). Consumers stay declarative and Tailwind-native:
 *
 *     const fillRef = useFillViewport();
 *     <div ref={fillRef} className="flex h-[var(--wt-fill-h)] flex-col overflow-hidden"> … </div>
 *
 * Below `minViewportWidth` the property is set to `auto` — on a phone the panes stack, and a
 * stacked layout should scroll with the page rather than fight for one screenful.
 *
 * The write is skipped when the value has not changed, which is what keeps the ResizeObserver from
 * feeding itself: resizing the element changes the body height, which fires the observer, which
 * measures the same number and writes nothing.
 */
import { useLayoutEffect, useRef } from 'react';

export interface UseFillViewportOptions {
    /** Never shrink past this (px). Below it the page is allowed to scroll instead. */
    minHeight?: number;
    /** Extra breathing room under the element. */
    bottomGap?: number;
    /** Chrome pinned below the content whose height must be left free. Metronic's footer. */
    reserveSelector?: string | null;
    /** The custom property to publish on the element. */
    varName?: string;
    /** Below this viewport width the element goes back to `height: auto`. Matches MUI's `lg`. */
    minViewportWidth?: number;
}

export const useFillViewport = <T extends HTMLElement = HTMLDivElement>({
    minHeight = 420,
    bottomGap = 0,
    reserveSelector = '#kt_footer',
    varName = '--wt-fill-h',
    minViewportWidth = 1200,
}: UseFillViewportOptions = {}) => {
    const ref = useRef<T | null>(null);

    // Layout effect, not effect: the property must exist before the browser paints, or the board
    // flashes at its natural height on every mount.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        let frame = 0;
        let last = '';

        const write = (value: string) => {
            if (value === last) return;
            last = value;
            el.style.setProperty(varName, value);
        };

        const measure = () => {
            frame = 0;
            if (window.innerWidth < minViewportWidth) {
                write('auto');
                return;
            }
            // Document-relative, so a scrolled page can't make the element grow into its own
            // scrollbar: `rect.top` alone shrinks as you scroll, and the element would chase it.
            const top = el.getBoundingClientRect().top + window.scrollY;
            const reserved = reserveSelector
                ? (document.querySelector(reserveSelector)?.getBoundingClientRect().height ?? 0)
                : 0;
            const available = window.innerHeight - top - reserved - bottomGap;
            write(`${Math.round(Math.max(minHeight, available))}px`);
        };

        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(measure);
        };

        measure();

        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        const reserved = reserveSelector ? document.querySelector(reserveSelector) : null;
        if (reserved) observer.observe(reserved);

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
    }, [minHeight, bottomGap, reserveSelector, varName, minViewportWidth]);

    return ref;
};

export default useFillViewport;
