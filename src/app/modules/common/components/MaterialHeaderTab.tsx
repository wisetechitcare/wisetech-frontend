import { styled, SvgIconProps, Tab, Tabs } from '@mui/material';
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

// The bar's surface: the brand navy gradient with a soft top-to-bottom sheen over
// it, a hairline highlight on the top edge and a shadow underneath — so the sticky
// bar reads as a raised piece of chrome rather than a flat band of colour. Shared
// by both render paths (HeaderBar owns it when a `headerAction` is present, the
// tabs strip owns it otherwise) so the two can never drift apart.
const BAR_SURFACE = {
    background: `linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 46%, rgba(0,0,0,0.07) 100%), ${T.color.brandGradientLeftToRight}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.07), 0 10px 24px -14px rgba(8,14,40,0.7)',
} as const;

const HeaderBar = styled('div')({
    position: 'sticky',
    top: '0px',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    ...BAR_SURFACE,
    minHeight: '48px',
    "@media (min-width: 480px)": { top: '74px' },
    "@media (max-width: 1024px)": { top: '0px' },
});

const HeaderAction = styled('div')({
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    paddingRight: '14px',
    paddingLeft: '10px',
    gap: '8px',
});

const CustomizedTabs = styled(Tabs)({
    position: 'sticky',
    top: '0px',
    zIndex: 1000,
    ...BAR_SURFACE,
    // Slim bar with a little breathing room so the selected pill sits centred
    // (MUI Tabs default to a tall 48px of pure text).
    minHeight: '48px',
    padding: '0 6px',
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
        display: "none",
    },
    // When nested inside HeaderBar (headerAction present) the bar owns the
    // surface + sticky, so the tabs go transparent and flex to fill the row.
    "&.mht-tabs--in-bar": {
        background: 'transparent',
        boxShadow: 'none',
        position: 'static',
        flex: 1,
        minWidth: 0,
        minHeight: '48px',
    },
    // The scroll arrows sit ON the navy bar and inherit dark ink, which made them
    // invisible against it. Paint them white, and fade rather than hide the
    // disabled one so the affordance stays where the eye last saw it.
    '& .MuiTabs-scrollButtons': {
        color: 'rgba(255, 255, 255, 0.85)',
        width: '28px',
        '&.Mui-disabled': { opacity: 0.22 },
    },
    // Vertically centre the tabs so the selected pill has even top/bottom gaps.
    '& .MuiTabs-flexContainer': {
        alignItems: 'center',
        minHeight: '48px',
        gap: '2px',
    },
    '& .MuiTabs-indicator': {
        // The selected tab is highlighted with a raised glass "pill" (below),
        // mirroring the aside menu's active item — so the bottom underline
        // indicator is not needed (it was invisible anyway: same #1E3A8A
        // colour as the bar background).
        display: 'none',
    },
    '& .MuiTab-root': {
        padding: '4px 14px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '34px',
        borderRadius: '10px',
        border: '1px solid transparent',
        transition: 'background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease',
        '& svg': {
            fontSize: '18px',
            marginRight: '9px',
        },
        // Reset MUI's default icon-wrapper margin (it assumes a stacked top
        // icon and pushes the icon off-centre in our horizontal row layout).
        '& .MuiTab-iconWrapper': {
            marginTop: 0,
            marginBottom: 0,
        },
        // Keyboard users get a ring — ripples are disabled on these tabs, so
        // without this there is no visible focus state at all.
        '&.Mui-focusVisible': {
            outline: '2px solid rgba(255, 255, 255, 0.8)',
            outlineOffset: '1px',
        },
        '@media (max-width: 600px)': { padding: '4px 10px' },
    },
    '& .MuiTab-textColorPrimary': {
        textTransform: 'none',
        fontWeight: '600',
        // Inactive: muted white on the dark-blue bar.
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '13px',
        letterSpacing: '0.01em',
        /* The icon is a KTIcon <i> inside `.mht-icon` — NOT an <svg> and NOT a `.bi`.
         * The two rules written for those shapes never matched anything this component
         * renders, which is why the icons had no size, no spacing and no emphasis of
         * their own. `marginRight` is the gap the icon never had: MUI's default icon
         * margins are reset above for the row layout, and nothing put it back. */
        '& .mht-icon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
            marginRight: '9px',
            // A glyph carries far less ink than a word, so matching the label's alpha
            // makes it read as fainter. It gets a little more at every state.
            color: 'rgba(255, 255, 255, 0.95)',
            /* THE reason these icons looked broken. A duotone keenicon draws its backdrop
             * layer with `opacity: .3` on `.path1:BEFORE` — the pseudo-element, not the
             * span. Overriding the span (`[class*="path"]`) could never lift it, because
             * the two opacities multiply: .72 on the span still landed at ~.22 on screen,
             * while quietly dimming the solid layers to .72. Half of every glyph was
             * effectively invisible on this saturated navy. Target the pseudo-element,
             * and only `.path1` — it is the only layer the duotone sheet fades. */
            '& .path1:before': { opacity: 0.5 },
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
        // Selected: a raised frosted-glass pill — lit top edge, translucent white
        // fill, soft drop shadow — so the active tab looks pressed out of the bar
        // instead of merely being brighter text.
        '&.Mui-selected': {
            color: '#ffffff',
            fontWeight: '700',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.12) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.38), 0 2px 8px rgba(6,12,35,0.3)',
            backdropFilter: 'blur(6px)',
        },
        '&.Mui-selected .mht-label': {
            textDecorationColor: 'rgba(255, 255, 255, 0.92)',
        },
        // Selected/hover: full white AND the backdrop layer comes almost all the
        // way up, so the active tab's icon reads as one solid glyph.
        '&.Mui-selected .mht-icon': {
            color: '#ffffff',
            '& .path1:before': { opacity: 0.85 },
        },
        '&:hover .mht-icon': {
            color: '#ffffff',
            '& .path1:before': { opacity: 0.7 },
        },
        // Subtle feedback when hovering a non-selected tab.
        '&:hover': {
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.14)',
        },
        // Hovering the selected tab lifts the pill a touch rather than swapping it.
        '&.Mui-selected:hover': {
            color: '#ffffff',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.16) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.34)',
        },
    },
    "@media (min-width: 480px)": {
        position: "sticky",
        top: "74px",
    },
    "@media (max-width: 1024px)": {
        position: "sticky",
        top: "0px",
    },
});

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
        <CustomizedTabs
            value={value}
            onChange={handleChange}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons={hideScrollButtons ? false : "auto"}
            className={headerAction ? 'mht-tabs--in-bar' : undefined}
            style={headerAction ? undefined : { zIndex: 50 }}
        >
            {tabItems.map((tabItem, index) => {
                    const key = `${tabItem.title}-${index}`;
                    const icon = !tabItem.icon
                        ? undefined
                        : (typeof tabItem.icon === 'string'
                            ? (tabItem.icon.startsWith('bi-') || tabItem.icon.startsWith('bi ')
                                /* Wrapped in a span ON PURPOSE. MUI's Tab clones the icon element
                                 * and overwrites its `className` with `MuiTab-iconWrapper` — and
                                 * AppIcon takes `className` as its SIZE prop, forwarding it to
                                 * KTIcon. Passing AppIcon directly therefore destroyed `fs-*`, and
                                 * the icon font fell back to the tab's inherited 13px, which is why
                                 * these glyphs were barely legible. The wrapper absorbs MUI's class
                                 * so the size survives. */
                                ? <span className="mht-icon"><AppIcon name={tabItem.icon} className="fs-3" /></span>
                                : <img src={tabItem.icon} alt={tabItem.title} width={24} height={24} style={{ marginRight: '1px' }} />)
                            : (() => {
                                const Icon = tabItem.icon as React.ElementType<SvgIconProps>;
                                return <Icon />;
                            })());

                    const hasBadge = typeof tabItem.badge === 'number' && tabItem.badge > 0;
                    const isSelected = value === index;
                    // Title text always sits in .mht-label so the selected
                    // underline applies to the text only (never icon/badge).
                    const label = hasBadge ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span className="mht-label">{tabItem.title}</span>
                            <span
                                style={{
                                    marginLeft: '6px',
                                    minWidth: '18px',
                                    height: '18px',
                                    padding: '0 5px',
                                    borderRadius: '9px',
                                    // Badge tracks the tab's state so it reads as part of the
                                    // tab rather than a floating chip: solid white on the active
                                    // tab, soft translucent white on inactive tabs.
                                    background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                                    color: isSelected ? '#1E3A8A' : '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {tabItem.badge! > 99 ? '99+' : tabItem.badge}
                            </span>
                        </span>
                    ) : <span className="mht-label">{tabItem.title}</span>;

                    return <Tab key={key} label={label} icon={icon} disableRipple disableFocusRipple />;
                })}
        </CustomizedTabs>
    );

    return (
        <>
            {/* With a headerAction, wrap the strip + action in the sticky gradient
                bar (flex row). Without one, render the strip exactly as before. */}
            {headerAction
                ? (
                    <HeaderBar>
                        {tabsStrip}
                        <HeaderAction>{headerAction}</HeaderAction>
                    </HeaderBar>
                )
                : tabsStrip}

            {aboveContent
                ? <div className="px-lg-9 px-5 pt-5 pb-5">{aboveContent}</div>
                : <div className="row mt-7"></div>
            }

            {tabItems.map((tabItem, index) => {
                return (
                    <div key={`${tabItem.title}-panel-${index}`} className='px-lg-9 px-5 py-0'>
                        {value === index && tabItem.component}
                    </div>
                )
            })}
        </>
    );
}

export default MaterialHeaderTab;
