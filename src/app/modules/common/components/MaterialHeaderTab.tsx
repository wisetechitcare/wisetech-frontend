import { Box, SvgIconProps, Tab, Tabs } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { T } from './ui/tokens';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

export type TabItem = {
    title: string;
    icon?: React.ElementType<SvgIconProps> | string | null;
    component: any;
    /** Optional count shown as a pill next to the tab title (hidden when 0). */
    badge?: number;
};

interface MaterialTabProps {
    tabItems: TabItem[];
    activeTab?: number;
    onTabChange?: (index: number) => void;
    aboveContent?: React.ReactNode;
    /** Hides the MUI-generated "<"/">" scroll-arrow buttons that appear beside the
     * tab strip when it can scroll — those can look like a stray back button, which
     * is confusing on modules with only a couple of short tabs. The strip stays
     * `scrollable` (swipeable) either way; this only hides the arrow affordance. */
    hideScrollButtons?: boolean;
    /** Optional node rendered on the RIGHT of the tab bar, on the gradient — e.g.
     * a <PremiumButton> primary action ("New", "Create", "Add"). It stays put
     * while the tab strip scrolls, and is vertically centred in the bar. */
    headerAction?: React.ReactNode;
}

/** Sticky offsets: the bar tucks under the masthead where the masthead is fixed, and
 *  sits flush at the top where it is not. Shared so the two render paths
 *  (bar-with-action vs bare strip) can never drift apart.
 *
 *  From 992px up — `media-breakpoint-up(lg)` in sass/layout/_header.scss — `.header`
 *  is `position: fixed` and 74px tall (`$header-config` in that folder's
 *  _variables.scss), so the bar has to clear 74px.
 *
 *  Below 992px the masthead scrolls away with the page, so 0 is correct. It is worth
 *  saying why, because the config claims otherwise: `fixed.tabletAndMobile` is true
 *  and Metronic duly fixes `.header-brand` there — but HeaderWrapper renders that very
 *  element with Bootstrap's `position-relative` utility, whose `!important` outranks
 *  the layout. The compact masthead is `relative` and scrolls; offsetting by its 54px
 *  (premium-layout.css) would leave a dead band at the top of every module.
 *
 *  IN `sx`, NOT TAILWIND — that is the whole point of this const. It used to be a
 *  `sticky top-0` pair plus a `min-[1025px]:` variant carrying the 74px (spelled apart
 *  here on purpose: Tailwind v4 scans comments, so writing that class name whole in
 *  prose keeps shipping the very rule this stopped using). Bootstrap ships its own
 *  `.top-0` utility carrying `!important`, loaded long after Tailwind's layer. Any
 *  element wearing that class is `top: 0 !important` and NO variant can outrank it: the
 *  74px rule was compiled into the bundle and could never apply. So the bar pinned to
 *  the viewport top, and at z-index 1000 against the masthead's 100 it painted OVER
 *  the header instead of tucking under it. `.top-0` does not select an emotion class,
 *  which is why the styled() version this replaced never had the bug — and why any
 *  `top`/`bottom`/`start`/`end` for this bar belongs here rather than in a utility.
 *
 *  Both numbers are measured rather than trusted: .harness/sticky.cjs loads the real
 *  compiled stylesheet, finds whichever strip is fixed at each width, and fails if the
 *  offset here stops matching it. */
const stickySx: SxProps<Theme> = {
    position: 'sticky',
    top: 0,
    '@media (min-width: 992px)': { top: '74px' },
    /**
     * Above the page, below the chrome.
     *
     * This was 1000, which put the bar over every piece of fixed furniture the layout
     * owns — and the masthead's own dropdowns open DOWNWARDS into the bar's band, so
     * the profile menu rendered behind it and lost its lower half. The bar tucks under
     * the masthead now (see `top` above), so it never needs to outrank it.
     *
     * The ceiling is what opens over the bar: `.menu-sub-dropdown` 107, `.wt-aside-toggle`
     * 106, `.bottom-nav`/`.scrolltop` 105, `.aside` 101, `.header` 100. The floor is page
     * content, which sets no z-index at all. 99 clears everything below and stays under
     * everything above, with the whole gap to spare.
     *
     * Lives here rather than as a `z-50` utility so both render paths read one number —
     * and for the reason the `top` note gives at length: Bootstrap owns utility class
     * names too, and this value must not be something a stylesheet can outrank.
     */
    zIndex: 99,
};

/** MUI-internal state selectors (`.Mui-selected`, `.MuiTabs-indicator`) are not
 *  reachable from a utility class, so the tab strip's own chrome lives in `sx`.
 *  Everything that is plain layout is a Tailwind class on the element instead. */
const tabsSx: SxProps<Theme> = {
    ...stickySx,
    // Brand gradient (left → right) from the design tokens — bright blue
    // on the left flowing to deep navy on the right.
    background: T.color.brandGradientLeftToRight,
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    // When nested inside the header bar (headerAction present) the bar owns the
    // gradient + sticky, so the tabs go transparent and flex to fill the row.
    '&.mht-tabs--in-bar': {
        background: 'transparent',
        position: 'static',
        flex: 1,
        minWidth: 0,
    },
    // The scroll arrows are icons on this bar too, and they inherit dark ink —
    // which made them invisible against the gradient. Paint them white, and fade
    // rather than hide the disabled one so the affordance stays where the eye
    // last saw it.
    '& .MuiTabs-scrollButtons': {
        color: 'rgba(255, 255, 255, 0.85)',
        width: 28,
        '&.Mui-disabled': { opacity: 0.22 },
    },
    // Vertically centre the tabs so the selected pill has even top/bottom gaps.
    '& .MuiTabs-flexContainer': { alignItems: 'center', minHeight: 44 },
    '& .MuiTabs-indicator': {
        // The selected tab is highlighted with a filled "pill" (below),
        // mirroring the aside menu's active item — so the bottom underline
        // indicator is not needed (it was invisible anyway: same #1E3A8A
        // colour as the bar background).
        display: 'none',
    },
    '& .MuiTab-root': {
        px: { xs: '11px', sm: '16px' },
        py: '3px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
        mx: '3px',
        borderRadius: '8px',
        transition: 'background-color .15s ease, color .15s ease',
        // MUI icon (the `icon` prop given a component) — sized to match the
        // keenicon below so the two icon shapes never render at two sizes.
        '& svg': { fontSize: '19px', marginRight: '10px' },
        // Reset MUI's default icon-wrapper margin (it assumes a stacked top
        // icon and pushes the icon off-centre in our horizontal row layout).
        '& .MuiTab-iconWrapper': { marginTop: 0, marginBottom: 0 },
        // Keyboard users get a ring — ripples are disabled on these tabs, so
        // without this there is no visible focus state at all.
        '&.Mui-focusVisible': {
            outline: '2px solid rgba(255, 255, 255, 0.8)',
            outlineOffset: '1px',
        },
    },
    '& .MuiTab-textColorPrimary': {
        textTransform: 'none',
        fontWeight: 600,
        // Inactive label: near-white on the dark-blue bar (~5.4:1). The glyph gets
        // more than this (below) — matching them makes the icon read as the weaker
        // half of the pair, because a glyph carries far less ink than a word.
        color: 'rgba(255, 255, 255, 0.88)',
        fontSize: '13px',
        letterSpacing: '0.01em',
        /* The icon is a KTIcon <i> inside `.mht-icon` — NOT an <svg> and NOT a `.bi`.
         * The two rules originally written for those shapes never matched anything
         * this component renders, which is why the icons had no size, no spacing and
         * no emphasis of their own. `marginRight` is the gap the icon never had:
         * MUI's icon margins are reset above for the row layout, and nothing put
         * one back. */
        '& .mht-icon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
            marginRight: '10px',
            // Detail paths at FULL white — 6.5:1 on the lightest end of the bar.
            // These are the strokes that carry the icon's shape; every point of
            // alpha spent here is legibility given away for nothing.
            color: '#ffffff',
            /* And this is what made these glyphs look broken. A duotone keenicon
             * fades its backdrop layer with `opacity: .3` on `.path1:BEFORE` — the
             * PSEUDO-element, not the span. An override aimed at the span
             * (`[class*="path"]`, as an earlier attempt was) can only multiply with
             * that, never replace it: .72 on the span still landed at ~.22 on
             * screen, while quietly dimming the solid strokes to .72. So half of
             * every glyph was under 3:1 and the other half had been dulled.
             * Stock .3 is tuned for dark ink on a white page; on this bar it
             * measures 1.9:1 — under WCAG 1.4.11's 3:1 floor for a graphical object.
             * `.path1` is the only layer the duotone sheet fades (verified across
             * all 357 icons), so nothing else needs touching.
             *
             * .72 measures 4.2:1 against the BRIGHTEST end of the gradient, where the
             * bar fights the glyph hardest, and makes it read as ONE white object
             * with an internal tonal step rather than a white mark floating on a blue
             * one — the "white tone" the bar was asked for. It is also close to the
             * ceiling:
             * the detail strokes are the same white, so past ~.85 they stop
             * separating from the backdrop and the glyph collapses into a
             * silhouette. Two tones is what makes a duotone a shape. */
            '& .path1:before': { opacity: 0.72 },
            // Bootstrap fallback: AppIcon renders a plain `.bi` for any name missing
            // from iconMap, and that one sizes by font-size, not by an `fs-*` class.
            '& .bi': { fontSize: '19px', lineHeight: 1 },
        },
        // Underline lives on the text label ONLY (.mht-label wraps just the
        // title text — never the icon). Always underlined but transparent, so
        // selecting simply fades the underline colour in (line position never
        // jumps, and text-decoration-color is animatable).
        '& .mht-label': {
            textDecoration: 'underline',
            textDecorationColor: 'transparent',
            textDecorationThickness: '2px',
            textUnderlineOffset: '5px',
            transition: 'text-decoration-color 0.25s ease',
        },
        // Selected: white text + white underline under the text only.
        '&.Mui-selected': { color: '#ffffff', fontWeight: 700 },
        '&.Mui-selected .mht-label': { textDecorationColor: '#ffffff' },
        // Selected/hover: the backdrop layer comes up further still, so the active
        // tab's icon reads as the most solid glyph in the row.
        '&.Mui-selected .mht-icon .path1:before': { opacity: 0.85 },
        '&:hover .mht-icon .path1:before': { opacity: 0.85 },
        // Subtle feedback when hovering a non-selected tab.
        '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.12)' },
        // Hovering the selected tab keeps it as-is (no light pill fill).
        '&.Mui-selected:hover': { color: '#ffffff', backgroundColor: 'transparent' },
    },
};

const MaterialHeaderTab = ({ tabItems, onTabChange, activeTab, aboveContent, hideScrollButtons, headerAction }: MaterialTabProps) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (typeof activeTab === 'number') {
            setValue(activeTab);
        }
    }, [activeTab]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (onTabChange) {
            onTabChange(newValue);
        }
    };

    const tabsStrip = (
        <Tabs
            value={value}
            onChange={handleChange}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons={hideScrollButtons ? false : "auto"}
            className={headerAction ? 'mht-tabs--in-bar min-h-11' : 'min-h-11'}
            sx={tabsSx}
        >
            {tabItems.map((tabItem, index) => {
                    const key = `${tabItem.title}-${index}`;
                    const icon = !tabItem.icon
                        ? undefined
                        : (typeof tabItem.icon === 'string'
                            ? (tabItem.icon.startsWith('bi-') || tabItem.icon.startsWith('bi ')
                                /* Wrapped in a span ON PURPOSE. MUI's Tab clones the icon element
                                 * and merges `MuiTab-iconWrapper` into its className — and AppIcon
                                 * takes `className` as its SIZE prop, forwarding it to KTIcon. The
                                 * wrapper both absorbs MUI's class (so `fs-*` survives) and gives
                                 * the `sx` above a `.mht-icon` hook to size and colour.
                                 * `fs-2` (19.5px) rather than the label's inherited 13px: a glyph
                                 * carries far less ink than a word, so an icon matched to the text
                                 * size reads as the weaker of the pair. Every tab icon name across
                                 * all 23 call sites resolves through iconMap to a real keenicon. */
                                ? <span className="mht-icon"><AppIcon name={tabItem.icon} className="fs-2" /></span>
                                : <img src={tabItem.icon} alt={tabItem.title} width={24} height={24} className="mr-px" />)
                            : (() => {
                                const Icon = tabItem.icon as React.ElementType<SvgIconProps>;
                                return <Icon />;
                            })());

                    const hasBadge = typeof tabItem.badge === 'number' && tabItem.badge > 0;
                    const isSelected = value === index;
                    // Title text always sits in .mht-label so the selected
                    // underline applies to the text only (never icon/badge).
                    const label = hasBadge ? (
                        <span className="inline-flex items-center">
                            <span className="mht-label">{tabItem.title}</span>
                            <Box
                                component="span"
                                className="ml-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.25 text-[11px] font-bold leading-none"
                                // Badge tracks the tab's state so it reads as part of the
                                // tab rather than a floating chip: solid white on the active
                                // tab, soft translucent white on inactive tabs. Colours come
                                // from `sx` because they are token-driven, not utilities.
                                sx={{
                                    background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                                    color: isSelected ? T.color.brand : '#ffffff',
                                }}
                            >
                                {tabItem.badge! > 99 ? '99+' : tabItem.badge}
                            </Box>
                        </span>
                    ) : <span className="mht-label">{tabItem.title}</span>;

                    return <Tab key={key} label={label} icon={icon} disableRipple disableFocusRipple />;
                })}
        </Tabs>
    );

    return (
        <>
            {/* With a headerAction, wrap the strip + action in the sticky gradient
                bar (flex row). Without one, render the strip on its own. */}
            {headerAction
                ? (
                    <Box
                        className="flex min-h-11 items-center"
                        sx={{ ...stickySx, background: T.color.brandGradientLeftToRight }}
                    >
                        {tabsStrip}
                        <div className="flex shrink-0 items-center gap-2 pl-2.5 pr-3.5">{headerAction}</div>
                    </Box>
                )
                : tabsStrip}

            {aboveContent
                ? <div className="px-5 py-5 lg:px-9">{aboveContent}</div>
                : <div className="mt-7" />
            }

            {tabItems.map((tabItem, index) => {
                return (
                    <div key={`${tabItem.title}-panel-${index}`} className="px-5 py-0 lg:px-9">
                        {value === index && tabItem.component}
                    </div>
                )
            })}
        </>
    );
}

export default MaterialHeaderTab;
