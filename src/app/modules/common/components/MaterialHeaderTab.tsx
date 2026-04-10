import { styled, SvgIconProps, Tab, Tabs } from '@mui/material';
import zIndex from '@mui/material/styles/zIndex';
import React, { useState } from 'react';

export type TabItem = {
    title: string;
    icon?: React.ElementType<SvgIconProps> | string | null;
    component: any;
};

interface MaterialTabProps {
    tabItems: TabItem[];
    activeTab?: number;
    onTabChange?: (index: number) => void; 
}

const CustomizedTabs = styled(Tabs)({
    position: 'sticky',
    top: '0px',
    zIndex: 1000,
    backgroundColor: '#9D4141',
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
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

const MaterialHeaderTab = ({ tabItems, onTabChange }: MaterialTabProps) => {
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
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
                scrollButtons="auto"
                style={{"zIndex":"50"}}
            >
                {tabItems.map((tabItem, index) => (<Tab key={index} label={tabItem.title} icon={tabItem.icon ? (typeof tabItem.icon === 'string'
                                    ? <img src={tabItem.icon} alt={tabItem.title} width={24} height={24} style={{ marginRight: '1px' }} />
                                    // : <tabItem.icon /> )
                                    :"")
                                    : undefined
                        }
                    />
                ))}
            </CustomizedTabs>

            <div className="row mt-7"></div>

            {tabItems.map((tabItem, index) => {
                return (
                    <>
                        <div key={index} className='px-lg-9 px-5 py-0'>
                            {value === index && tabItem.component}
                        </div>
                    </>
                )
            })}
        </>
    );
}

export default MaterialHeaderTab;
