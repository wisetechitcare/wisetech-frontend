import { ILeaves } from "@models/employee";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ILeaveSummary {
    leaveType: string;
    numberOfDays: number;
    leaveTaken: number;
}

interface Leaves {
    personalLeaves: ILeaves[],
    personalLeavesSummary: ILeaveSummary[]
}

const initialState: Leaves = {
    personalLeaves: [],
    personalLeavesSummary: [],
}

export const leavesSlice = createSlice({
    name: 'leaves',
    initialState,
    reducers: {
        savePersonalLeaves: (state, action: PayloadAction<ILeaves[]>) => {
            state.personalLeaves = action.payload;
        },
        savePersonalLeavesSummary: (state, action: PayloadAction<ILeaveSummary[]>) => {
            state.personalLeavesSummary = action.payload;
        },
        clearPersonalLeaves: (state) => {
            state.personalLeaves = [];
        }
    }
});

export const { savePersonalLeaves, savePersonalLeavesSummary, clearPersonalLeaves } = leavesSlice.actions;

export default leavesSlice.reducer;