import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IFeatureConfiguration {
    disableLaunchDeductionTime: any;
    restrictAttendanceTo7Days?: number;
    leaveManagement: any;
}

const initialState: IFeatureConfiguration = {
    disableLaunchDeductionTime: false,
    restrictAttendanceTo7Days: 1,
    leaveManagement: {},
}

export const featureConfigurationSlice = createSlice({
    name: 'featureConfiguration',
    initialState,
    reducers: {
        setFeatureConfiguration: (state, action: PayloadAction<IFeatureConfiguration>) => {
            state.disableLaunchDeductionTime = action.payload.disableLaunchDeductionTime;
            state.restrictAttendanceTo7Days = Number(action.payload.restrictAttendanceTo7Days);
            state.leaveManagement = action.payload.leaveManagement;
          }
        }
    }
)

export const { setFeatureConfiguration } = featureConfigurationSlice.actions;
export default featureConfigurationSlice.reducer;
