import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Company {
    currentCompany: {
        id: string;
        name: string;
        fiscalYear?: string;
        showDateIn12HourFormat?: string;
    },
    currentBranch: {
        id: string;
        name: string;
    }
}

const initialState: Company = {
    currentCompany: {
        id: "",
        name: "",
        fiscalYear: "",
        showDateIn12HourFormat: "0",
    },
    currentBranch: {
        id: "",
        name: ""
    }
}

const companySlice = createSlice({
    initialState,
    name: 'company',
    reducers: {
        saveCurrentCompanyInfo: (state, action: PayloadAction<any>) => {
            state.currentCompany = action.payload;
        },
        saveCurrentBranchInfo: (state, action: PayloadAction<any>) => {
            state.currentBranch = action.payload;
        }
    }
});

export const { saveCurrentCompanyInfo, saveCurrentBranchInfo } = companySlice.actions;

export default companySlice.reducer;
