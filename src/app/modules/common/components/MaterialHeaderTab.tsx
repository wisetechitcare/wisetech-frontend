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

// The sticky gradient bar. When a `headerAction` is present the bar becomes a
// flex row (tabs left, action right); the gradient + sticky positioning live
// here so the action sits ON the bar. When there's no action the tabs render
// exactly as before (the CustomizedTabs still owns its own gradient — see below).
const HeaderBar = styled('div')({
    position: 'sticky',
    top: '0px',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    background: T.color.brandGradientLeftToRight,
    minHeight: '44px',
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
    // Brand gradient (left → right) from the design tokens — bright blue
    // on the left flowing to deep navy on the right.
    background: T.color.brandGradientLeftToRight,
    // Slim bar with a little breathing room so the selected pill sits centred
    // (MUI Tabs default to a tall 48px).
    minHeight: '44px',
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
        display: "none",
    },
    // When nested inside HeaderBar (headerAction present) the bar owns the
    // gradient + sticky, so the tabs go transparent and flex to fill the row.
    "&.mht-tabs--in-bar": {
        background: 'transparent',
        position: 'static',
        flex: 1,
        minWidth: 0,
        minHeight: '44px',
    },
    // Vertically centre the tabs so the selected pill has even top/bottom gaps.
    '& .MuiTabs-flexContainer': {
        alignItems: 'center',
        minHeight: '44px',
    },
    '& .MuiTabs-indicator': {
        // The selected tab is highlighted with a filled "pill" (below),
        // mirroring the aside menu's active item — so the bottom underline
        // indicator is not needed (it was invisible anyway: same #1E3A8A
        // colour as the bar background).
        display: 'none',
    },
    '& .MuiTab-root': {
        paddingTop: '3px',
        paddingBottom: '3px',
        paddingLeft: '16px',
        paddingRight: '16px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '32px',
        margin: '0 3px',
        borderRadius: '8px',
        transition: 'background-color .15s ease, color .15s ease',
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
    },
    '& .MuiTab-textColorPrimary': {
        textTransform: 'none',
        fontWeight: '600',
        // Inactive: muted white on the dark-blue bar.
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        // Every tab icon is a plain glyph, centred in a 26px space.
        // No background boxes — just the glyph color (white when selected,
        // muted white when unselected).
        '& .bi': {
            width: '26px',
            height: '26px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
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
        '&.Mui-selected': {
            color: '#ffffff',
            fontWeight: '700',
        },
        '&.Mui-selected .mht-label': {
            textDecorationColor: '#ffffff',
        },
        '&.Mui-selected .bi': {
            color: '#ffffff',
        },
        // Subtle feedback when hovering a non-selected tab.
        '&:hover': {
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
        },
        // Hovering the selected tab keeps it as-is (no light pill fill).
        '&.Mui-selected:hover': {
            color: '#ffffff',
            backgroundColor: 'transparent',
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
                                // Bootstrap icon (same system as the sidebar). The `.bi` class
                                // also enables the boxed selected-tab styling defined above.
                                ? <i className={`bi ${tabItem.icon}`} />
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

                    return <Tab key={key} label={label} icon={icon} />;
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
