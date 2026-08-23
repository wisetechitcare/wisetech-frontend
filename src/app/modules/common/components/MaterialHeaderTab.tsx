import { styled, SvgIconProps, Tab, Tabs } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { T } from './ui/tokens';

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
        // The selected tab is a solid pill (below), so the bottom underline
        // indicator is not needed — it was invisible anyway, being the same
        // #1E3A8A as the bar it sat on.
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
        // Inactive: near-white on the navy bar (~5.2:1).
        color: 'rgba(255, 255, 255, 0.86)',
        fontSize: '13px',
        letterSpacing: '0.01em',
        /* The icon is a single-layer Bootstrap glyph (see the render function for
         * why it is not a duotone keenicon here). `color: inherit` is the point:
         * icon and label then share one alpha in every state, so the pair reads as
         * one object and no state needs its own icon rule. `marginRight` is the gap
         * the icon never had — MUI's icon margins are reset above for the row
         * layout, and nothing put one back. */
        '& .mht-icon': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
            marginRight: '9px',
            color: 'inherit',
            '& i': { fontSize: '17px', lineHeight: 1 },
        },
        // Selected: a flat surface-white pill with navy ink. Highest contrast the bar
        // can offer in both directions (6.5:1 either way), and the active tab reads as
        // a physical chip lifted off the gradient rather than as brighter text. The
        // pill stays white in dark mode ON PURPOSE — the bar itself is fixed brand
        // chrome, so `background.paper` would put dark-on-dark ink here.
        '&.Mui-selected': {
            color: T.color.brand,
            fontWeight: '700',
            backgroundColor: T.color.surface,
            borderColor: T.color.surface,
            boxShadow: '0 1px 2px rgba(6,12,35,0.3), 0 6px 16px -6px rgba(6,12,35,0.55)',
        },
        // Inactive hover: the pill's ghost, so the target is felt before it is taken.
        '&:hover': {
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderColor: 'rgba(255, 255, 255, 0.16)',
        },
        // Hovering the selected tab tints the pill instead of swapping it out.
        '&.Mui-selected:hover': {
            color: T.color.brand,
            backgroundColor: T.color.brandSoft,
            borderColor: T.color.brandSoft,
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
                                /* The one place in the app that deliberately does NOT go through
                                 * AppIcon/KTIcon — for the same reason `brandIcons` exists (see
                                 * ui/README.md). A duotone keenicon is DEFINED against a light
                                 * surface: it paints its body layer at `opacity: .3`, which is
                                 * ~3:1 as dark ink on white but only 1.9:1 as white ink on this
                                 * navy bar — under WCAG 1.4.11's 3:1 floor for graphical objects,
                                 * i.e. genuinely invisible. No opacity value fixes it either:
                                 * raise the body layer to full white and the detail paths, being
                                 * the same white, vanish INTO it — `calendar-tick` becomes a white
                                 * blob. A duotone needs two tones, and this bar only has one.
                                 * Bootstrap Icons are already loaded app-wide (style.react.scss),
                                 * are single-layer monoline, and are exactly the names the call
                                 * sites already pass — so the glyph renders at full strength with
                                 * no mapping table and no new dependency.
                                 * The wrapping span is ON PURPOSE: MUI's Tab clones the icon and
                                 * merges `MuiTab-iconWrapper` into its className, so `.mht-icon`
                                 * survives as the hook the CSS above sizes and colours. */
                                ? <span className="mht-icon"><i className={`bi ${tabItem.icon.replace(/^bi /, '')}`} aria-hidden="true" /></span>
                                : <img src={tabItem.icon} alt={tabItem.title} width={24} height={24} style={{ marginRight: '1px' }} />)
                            : (() => {
                                const Icon = tabItem.icon as React.ElementType<SvgIconProps>;
                                return <Icon />;
                            })());

                    const hasBadge = typeof tabItem.badge === 'number' && tabItem.badge > 0;
                    const isSelected = value === index;
                    // Title text always sits in .mht-label, so a label-only treatment
                    // can never catch the icon or the badge.
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
                                    // tab rather than a floating chip: it inverts against the
                                    // white pill on the active tab, and is a soft translucent
                                    // white on the inactive ones.
                                    background: isSelected ? T.color.brand : 'rgba(255, 255, 255, 0.25)',
                                    color: '#ffffff',
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
