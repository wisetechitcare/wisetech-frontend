import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Company {
    currentCompany: {
        id: string;
        name: string;
        fiscalYear?: string;
        /**
         * The organisation's 12/24h time setting, as the '1'/'0' strings the
         * company forms round-trip (a raw boolean from the API is accepted too).
         * `null` means NOT LOADED YET, which must stay distinct from '0' — see
         * the note on the initial state below.
         */
        showDateIn12HourFormat?: string | boolean | null;
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
        // Not '0'. This slice is populated lazily, and '0' would have read as an
        // explicit '24 hour' for every user until it was — see utils/timeFormat.ts.
        showDateIn12HourFormat: null,
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
