import { Box, SvgIconProps, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { T } from './ui/tokens';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { isTabTurnedOff } from '@utils/can';
import { tabSlug } from '@utils/sectionTabs';

export type TabItem = {
    title: string;
    icon?: React.ElementType<SvgIconProps> | string | null;
    component: any;
    /** Optional count shown as a pill next to the tab title (hidden when 0). */
    badge?: number;
    /** Shorter name for the phone tab bar, where the selected tab shows its name beside its
     *  icon when there is room. Omitted: the full title, truncated if needed. */
    shortTitle?: string;
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
    /** The access section this page belongs to (e.g. "attendance.personal"): tabs turned off for
     * the person under Access → Advanced are left out. Indexes stay the page's own, so a page's
     * activeTab / onTabChange keep working unchanged. */
    accessSection?: string;
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
    // 52px bar around 34px tabs: 9px of air above and below the selected pill. At 44px the
    // pill all but touched both edges of the bar, which is what made it look cramped.
    '& .MuiTabs-flexContainer': { alignItems: 'center', minHeight: 52, gap: '4px', paddingInline: '12px' },
    '& .MuiTabs-indicator': {
        // The selected tab is highlighted with a filled "pill" (below),
        // mirroring the aside menu's active item — so the bottom underline
        // indicator is not needed (it was invisible anyway: same #1E3A8A
        // colour as the bar background).
        display: 'none',
    },
    '& .MuiTab-root': {
        px: { xs: '12px', sm: '14px' },
        py: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 34,
        height: 34,
        minWidth: 0,
        mx: 0,
        borderRadius: '8px',
        transition: 'background-color .15s ease, color .15s ease, box-shadow .15s ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        /* MUI icon (the `icon` prop given a component) — sized to match the Lucide icon
         * below so the two icon shapes never render at two sizes.
         *
         * Scoped to `:not(.mht-icon svg)` DELIBERATELY. While the tab icons were keenicons
         * this was a bare `& svg` and matched only MUI icons, because a keenicon is an `<i>`.
         * A Lucide icon IS an `<svg>`, so the moment the icons moved it silently began
         * matching them too and adding its own 10px on top of `.mht-icon`'s — which is the
         * whole reason the gap between icon and title blew out. Any rule in this file that
         * says `svg` now needs to say which svg it means. */
        '& svg:not(.mht-icon svg)': { fontSize: '19px', marginRight: '10px' },
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
        /* The icon is a Lucide <svg> inside `.mht-icon`. `marginRight` is 8px rather than
         * the 10px the keenicon needed, because a font glyph sat flush against the edge of
         * its advance width while a Lucide glyph is drawn inside a 24-unit viewBox already
         * carrying ~2 units of its own margin — at 10px the two stacked and pushed every
         * label visibly away from its icon. 8px lands at ~10px of measured gap, which keeps
         * the pair reading as one object without crowding the label. 6px was tried and sits
         * too close; if this needs adjusting again, move it in 1px steps rather than
         * halving. */
        '& .mht-icon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
            marginRight: '8px',
            // Full white — 6.5:1 on the lightest end of the bar. A single-tone stroke icon
            // has no backdrop layer to dim, so every point of alpha spent here would be
            // legibility given away for nothing.
            color: '#ffffff',
        },
        // Selected: a soft frosted fill with bold white text. A solid white tab was too loud on
        // the gradient, a hairline border washed out, and an underline bar was one mark too many.
        '&.Mui-selected': {
            color: '#ffffff',
            fontWeight: 700,
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
        },
        // Hover on an unselected tab: a fainter fill than the selection, so the two never read alike.
        '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
        '&.Mui-selected:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.20)' },
    },
};

/** A tab's icon for the phone switcher and its menu. Colour comes from the parent (`currentColor`). */
const switcherIcon = (item: TabItem) => {
    if (!item.icon) return null;
    if (typeof item.icon === 'string') {
        return item.icon.startsWith('bi-') || item.icon.startsWith('bi ')
            ? <AppIcon name={item.icon} className="fs-3" />
            : <img src={item.icon} alt="" width={20} height={20} />;
    }
    const Icon = item.icon as React.ElementType<SvgIconProps>;
    return <Icon fontSize="small" />;
};

const countBadge = (count: number | undefined) =>
    typeof count === 'number' && count > 0 ? (
        <Box
            component="span"
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
            // Deliberately white in BOTH modes: the badge sits on the brand-coloured
            // header bar, which stays dark either way, so a surface token would
            // lose its contrast in dark mode.
            sx={{ bgcolor: 'common.white', color: T.color.brand }}
        >
            {count > 99 ? '99+' : count}
        </Box>
    ) : null;

const MaterialHeaderTab = ({ tabItems, onTabChange, activeTab, aboveContent, hideScrollButtons, headerAction, accessSection }: MaterialTabProps) => {
    /**
     * Phones get a bar that says as much as fits: every tab as icon + name on one line; failing
     * that, bottom-navigation style (icon over name); failing that, icons with the selected tab
     * named; failing that, icons alone. A row of full-width desktop tabs plus an action cannot
     * fit ~360px and scrolled sideways, hiding most sections. Tablet and desktop keep the tab row.
     */
    const theme = useTheme();
    const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

    /**
     * How much the phone row can say, measured from its real width (not guessed), in four steps:
     *   'row'  — every tab fits as icon + name on one line (the names are measured in the bar's font).
     *   'nav'  — room for every tab at NAV_CELL: bottom-navigation style, icon over name, all named.
     *   'icons' — not enough for that: icon squares, and the selected tab also shows its name.
     *   'bare' — not even that (Recruitment: seven tabs and an organisation filter): icons only,
     *            the selected tab marked by its fill.
     * Layout effect, so the first paint is already the right mode.
     */
    const tablistRef = useRef<HTMLDivElement | null>(null);
    const [tablistWidth, setTablistWidth] = useState(0);
    useLayoutEffect(() => {
        const el = tablistRef.current;
        if (!isPhone || !el) return;
        setTablistWidth(el.getBoundingClientRect().width);
        const observer = new ResizeObserver(([entry]) => setTablistWidth(entry.contentRect.width));
        observer.observe(el);
        return () => observer.disconnect();
    }, [isPhone]);
    const ICON_CELL = 36;
    const ICON_GAP = 4;
    const NAME_ROOM = 92;
    const NAV_CELL = 64;
    const gaps = (tabItems.length - 1) * ICON_GAP;
    // One line needs: padding 10+10, icon 20, gap 6, and the name at the bar's bold 12.5px.
    const namesKey = tabItems.map((t) => t.shortTitle ?? t.title).join('|');
    const rowNeeded = useMemo(() => {
        const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
        if (!ctx) return Infinity;
        ctx.font = '700 12.5px Inter, sans-serif';
        return namesKey.split('|').reduce((sum, name) => sum + Math.ceil(ctx.measureText(name).width) + 46, 0);
    }, [namesKey]);
    const phoneMode: 'row' | 'nav' | 'icons' | 'bare' =
        tablistWidth === 0 || tablistWidth >= rowNeeded + gaps ? 'row'
        : tablistWidth >= tabItems.length * NAV_CELL + gaps ? 'nav'
            : tablistWidth >= tabItems.length * ICON_CELL + gaps + NAME_ROOM ? 'icons'
                : 'bare';

    // Seeded from the prop, not 0. Pages that keep the active tab in the URL
    // remount on every back-navigation, and starting at 0 painted — and mounted,
    // and fetched — the first tab for a frame before the effect corrected it.
    const [value, setValue] = useState(activeTab ?? 0);
    useEffect(() => {
        if (typeof activeTab === 'number') {
            setValue(activeTab);
        }
    }, [activeTab]);

    // Tabs turned off for this person (Access → Advanced). Re-renders on a live access change.
    useSelector((s: RootState) => (s as any).authz?.deniedTabs);
    const shown = (item: TabItem) => !accessSection || !isTabTurnedOff(accessSection, tabSlug(item.title));
    // Standing on a tab that just got turned off: move to the first one still open.
    useEffect(() => {
        if (!accessSection || !tabItems[value] || shown(tabItems[value])) return;
        const first = tabItems.findIndex(shown);
        if (first >= 0) { setValue(first); onTabChange?.(first); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    });

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
            className={headerAction ? 'mht-tabs--in-bar min-h-13' : 'min-h-13'}
            sx={tabsSx}
        >
            {tabItems.map((tabItem, index) => {
                    if (!shown(tabItem)) return null;
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
                    // Title text always sits in .mht-label, apart from the icon and badge.
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

                    // `value` = the page's own index, so hidden tabs never shift the others.
                    return <Tab key={key} value={index} label={label} icon={icon} disableRipple disableFocusRipple />;
                })}
        </Tabs>
    );

    const phoneBar = (
        <Box
            className="flex items-center gap-2 px-2"
            // Height in sx, not a utility: 52px bar around 36px tabs leaves 8px above and below the
            // selected pill, so it never runs into the top and bottom edges of the bar.
            sx={{ ...stickySx, background: T.color.brandGradientLeftToRight, minHeight: 52, py: '8px' }}
        >
            <Box
                ref={tablistRef}
                role="tablist"
                aria-label="Sections"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    // Spread across the whole bar when there is spare room, so a module with few
                    // tabs (or no header action) fills the row evenly instead of bunching left.
                    // space-between, not space-evenly: when content overflows it falls back to
                    // flex-start, so the first tab can never be pushed off-screen.
                    justifyContent: phoneMode === 'nav' || phoneMode === 'row' ? 'stretch' : 'space-between',
                    gap: `${ICON_GAP}px`,
                    // Last resort only: more icons than even the icon-only row can hold.
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                {tabItems.map((item, index) => {
                    if (!shown(item)) return null;
                    const selected = index === value;
                    const row = phoneMode === 'row';
                    const nav = phoneMode === 'nav';
                    const named = selected && phoneMode === 'icons';
                    return (
                        <Box
                            key={`${item.title}-phone-${index}`}
                            component="button"
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={item.title}
                            // Icon-only tabs say their name on long-press / hover.
                            title={item.title}
                            onClick={(e: React.MouseEvent<HTMLElement>) => handleChange(e, index)}
                            sx={{
                                // nav: equal share of the row, icon over name.
                                // icons/bare: an icon square; in 'icons' the selected tab widens to
                                // name itself and gives way (ellipsis) before overflowing.
                                // row: icon + name on one line, cells share the spare width.
                                flex: row ? '1 0 auto' : nav ? '1 1 0' : named ? '0 1 auto' : `0 0 ${ICON_CELL}px`,
                                minWidth: row || nav || named ? 0 : ICON_CELL,
                                height: nav ? 'auto' : ICON_CELL,
                                minHeight: ICON_CELL,
                                display: 'flex',
                                flexDirection: nav ? 'column' : 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: nav ? '3px' : row ? '6px' : '8px',
                                px: nav ? '4px' : row ? '10px' : named ? '12px' : 0,
                                py: nav ? '6px' : 0,
                                border: 0,
                                borderRadius: '10px',
                                backgroundColor: selected ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                                color: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.78)',
                                fontFamily: 'inherit',
                                fontSize: row ? 12.5 : 13,
                                fontWeight: row && !selected ? 600 : 700,
                                cursor: 'pointer',
                                transition: 'background-color .15s ease, color .15s ease',
                                '&:active': { backgroundColor: 'rgba(255, 255, 255, 0.24)' },
                                '&:focus-visible': { outline: '2px solid rgba(255, 255, 255, 0.8)', outlineOffset: '-2px' },
                                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                            }}
                        >
                            <Box component="span" sx={{ position: 'relative', display: 'inline-flex', lineHeight: 1, flexShrink: 0 }}>
                                {switcherIcon(item)}
                                {typeof item.badge === 'number' && item.badge > 0 && (
                                    <Box component="span" sx={{ position: 'absolute', top: -7, left: '100%', ml: '-7px' }}>
                                        {countBadge(item.badge)}
                                    </Box>
                                )}
                            </Box>
                            {nav && (
                                <Box
                                    component="span"
                                    sx={{
                                        maxWidth: '100%',
                                        fontSize: 10.5,
                                        fontWeight: selected ? 700 : 600,
                                        lineHeight: 1.15,
                                        textAlign: 'center',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {item.shortTitle ?? item.title}
                                </Box>
                            )}
                            {(named || row) && (
                                <Box
                                    component="span"
                                    sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                    {item.shortTitle ?? item.title}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>

            {headerAction && (
                // The action is a peer of the tabs, not one of them: a hairline divider sets it
                // apart, and it stretches to the tabs' height in whichever mode is active (36px
                // one-line, ~47px icon-over-name) so it never sits as a small square beside tall
                // cells.
                <Box
                    className="mht-phone-action"
                    sx={{
                        display: 'flex',
                        alignSelf: 'stretch',
                        alignItems: 'stretch',
                        flexShrink: 0,
                        pl: '8px',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
                        '& > button': { height: 'auto', minHeight: ICON_CELL },
                    }}
                >
                    {headerAction}
                </Box>
            )}
        </Box>
    );

    return (
        <>
            {/* Phone: the icon row. Otherwise, with a headerAction, wrap the strip + action
                in the sticky gradient bar (flex row); without one, render the strip on its own. */}
            {isPhone ? phoneBar : headerAction
                ? (
                    <Box
                        className="flex min-h-13 items-center"
                        sx={{ ...stickySx, background: T.color.brandGradientLeftToRight }}
                    >
                        {tabsStrip}
                        {/* pr-6: the action lines up with the page content's right edge
                            instead of hugging the end of the bar. */}
                        <div className="flex shrink-0 items-center gap-2 pl-2.5 pr-6">{headerAction}</div>
                    </Box>
                )
                : tabsStrip}

            {aboveContent
                ? <div className="px-3 py-4 sm:px-5 sm:py-5 lg:px-9">{aboveContent}</div>
                : <div className="mt-3 sm:mt-7" />
            }

            {tabItems.map((tabItem, index) => {
                return (
                    <div key={`${tabItem.title}-panel-${index}`} className="px-3 py-0 sm:px-5 lg:px-9">
                        {value === index && shown(tabItem) && tabItem.component}
                    </div>
                )
            })}
        </>
    );
}

export default MaterialHeaderTab;
