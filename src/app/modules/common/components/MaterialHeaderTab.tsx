import { styled, SvgIconProps, Tab, Tabs } from '@mui/material';
import zIndex from '@mui/material/styles/zIndex';
import React, { useEffect, useState } from 'react';

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
}

const CustomizedTabs = styled(Tabs)({
    position: 'sticky',
    top: '0px',
    zIndex: 1000,
    backgroundColor: '#9D4141',
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
    display: "none",
  },
    '& .MuiTabs-indicator': {
        backgroundColor: '#9D4141',
    },
    '& .MuiTab-root': {
        paddingLeft: '25px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50px',
        '& svg': {
            fontSize: '25px',
            marginRight: '15px',
        },
    },
    '& .MuiTab-textColorPrimary': {
        textTransform: 'none',
        fontWeight: '600',
        color: '#bfbfbf',
        fontSize: '13px',
        '&.Mui-selected': {
            color: 'white',
            // borderBottom: '4px solid white',
        }
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

const MaterialHeaderTab = ({ tabItems, onTabChange, activeTab, aboveContent, hideScrollButtons }: MaterialTabProps) => {
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

    return (
        <>
            <CustomizedTabs
                value={value}
                onChange={handleChange}
                textColor="primary"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons={hideScrollButtons ? false : "auto"}
                style={{ zIndex: 50 }}
            >
                {tabItems.map((tabItem, index) => {
                    const key = `${tabItem.title}-${index}`;
                    const icon = !tabItem.icon
                        ? undefined
                        : (typeof tabItem.icon === 'string'
                            ? <img src={tabItem.icon} alt={tabItem.title} width={24} height={24} style={{ marginRight: '1px' }} />
                            : (() => {
                                const Icon = tabItem.icon as React.ElementType<SvgIconProps>;
                                return <Icon />;
                            })());

                    const hasBadge = typeof tabItem.badge === 'number' && tabItem.badge > 0;
                    const label = hasBadge ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {tabItem.title}
                            <span
                                style={{
                                    marginLeft: '8px',
                                    minWidth: '18px',
                                    height: '18px',
                                    padding: '0 5px',
                                    borderRadius: '9px',
                                    background: '#ffffff',
                                    color: '#9D4141',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    lineHeight: '18px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {tabItem.badge! > 99 ? '99+' : tabItem.badge}
                            </span>
                        </span>
                    ) : tabItem.title;

                    return <Tab key={key} label={label} icon={icon} />;
                })}
            </CustomizedTabs>

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
