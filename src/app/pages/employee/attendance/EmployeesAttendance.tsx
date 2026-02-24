// import { useState } from "react";
// import { Tabs, Tab, Box, styled } from "@mui/material";
// import Today from "./views/Today";
// import Weekly from "./views/Weekly";
// import Monthly from "./views/Monthly";
// import Yearly from "./views/Yearly";

// const CustomizedTabs = styled(Tabs)({
//     '& .MuiTabs-indicator': {
//         backgroundColor: '#9D4141',
//     },

//     '& .MuiTab-textColorPrimary': {
//         textTransform: 'none',
//         fontWeight: 'bold',
//         color: 'black',
//         fontSize: '1rem',

//         '&.Mui-selected': {
//             color: '#9D4141',
//         }
//     }
// });

// function EmployeesAttendance() {
//     const [value, setValue] = useState(0);

//     const handleChange = (event: React.SyntheticEvent, newValue: number) => {
//         setValue(newValue);
//     };

//     return (
//         <>
//             <h3 className='pt-5 fw-bold font-barlow'>Employees Attendance</h3>
//             <CustomizedTabs value={value} onChange={handleChange}
//                 textColor="primary"
//                 indicatorColor="primary">
//                 <Tab label="Today" />
//                 <Tab label="Weekly" />
//                 <Tab label="Monthly" />
//                 <Tab label="Yearly" />
//             </CustomizedTabs>

//             {value === 0 && <Today />}
//             {value === 1 && <Weekly />}
//             {value === 2 && <Monthly />}
//             {value === 3 && <Yearly />}
//         </>
//     );
// }

// export default EmployeesAttendance;