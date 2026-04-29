import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define interfaces locally in the slice file for now
interface IBreakdownItem {
    name?: string;
    value?: number;
    type?: string;
    earned: number;
}

interface IBreakdownData {
    fixed: Record<string, IBreakdownItem>;
    variable: Record<string, IBreakdownItem>;
}

interface ISalaryData {
    month: string;
    grossPayBreakdown: IBreakdownData;
    deductionBreakdown: IBreakdownData;
    totalGrossPayAmount: string;
    totalDeductedAmount: string;
    netAmount: string;
    paidAmount: string;
    due: string;
    status: string;
    annualCTC: number;
    employeeId: string;
    [key: string]: any;
}

interface IMonthlyApiResponse {
    salaryData: ISalaryData[];
    message?: string;
}

interface SalaryDataState {
    monthlyApiData: IMonthlyApiResponse | null;
    isLoading: boolean;
    error: string | null;
    lastFetchedMonth: string | null; // For cache validation
}

const initialState: SalaryDataState = {
    monthlyApiData: null,
    isLoading: false,
    error: null,
    lastFetchedMonth: null
};

export const salaryDataSlice = createSlice({
    name: 'salaryData',
    initialState,
    reducers: {
        setMonthlyApiData: (state, action: PayloadAction<IMonthlyApiResponse>) => {
            state.monthlyApiData = action.payload;
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        setLastFetchedMonth: (state, action: PayloadAction<string>) => {
            state.lastFetchedMonth = action.payload;
        },
        clearSalaryData: (state) => {
            state.monthlyApiData = null;
            state.error = null;
            state.lastFetchedMonth = null;
        }
    }
});

export const { 
    setMonthlyApiData, 
    setLoading, 
    setError, 
    setLastFetchedMonth,
    clearSalaryData 
} = salaryDataSlice.actions;

export default salaryDataSlice.reducer;

// Export types for use in components
export type { IBreakdownItem, IBreakdownData, ISalaryData, IMonthlyApiResponse };