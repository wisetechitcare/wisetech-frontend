import { styled, Tab, Tabs, Button, Dialog, DialogContent } from "@mui/material";
import { useState } from "react";
import LeaveRequestForm from "./LeaveRequestForm";
import Leaves from "./Leaves";
import Balances from "./Balances";
import Rules from "./Rules";
import Holidays from "./Holidays";
import FAQs from "./FAQs";

const CustomizedTabs = styled(Tabs)({
    '& .MuiTabs-indicator': {
        backgroundColor: '#9D4141',
    },
    '& .MuiTab-textColorPrimary': {
        textTransform: 'none',
        fontWeight: 'bold',
        color: 'black',
        fontSize: '1rem',
        '&.Mui-selected': {
            color: '#9D4141',
        }
    }
});

function PersonalLeaves() {
    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <>
            <CustomizedTabs value={value} onChange={handleChange}
                textColor="primary"
                indicatorColor="primary">
                <Tab label="Leaves" />
                <Tab label="Leaves Balance" />
                <Tab label="Leaves Rules" />
                <Tab label="Holidays" />
                <Tab label="FAQs" />
            </CustomizedTabs>

            {value === 0 && <Leaves />}
            {value === 1 && <Balances />}
            {value === 2 && <Rules />}
            {value === 3 && <Holidays />}
            {value === 4 && <FAQs />}

        </>
    );
}

export default PersonalLeaves;