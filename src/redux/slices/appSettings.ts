import { timeToMinutes } from "@pages/employee/attendance/personal/views/information/Rules";
import { store } from "@redux/store";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchConfiguration } from "@services/company";

interface AppSettings {
    workingHours: number;
    checkinTime: string;
    checkoutTime: string;
    deductionTime: string;
    graceTime: string;
    isLoading: boolean;
    error: string | null;
}

const initialState: AppSettings = {
    workingHours: 0,
    checkinTime: '',
    checkoutTime: '',
    deductionTime: '',
    graceTime: '',
    isLoading: false,
    error: null,
}

export const fetchAppSettings = createAsyncThunk(
    "appSettings/fetchAppSettings",
    async () => {        
        // later implement a check here to make sure if the value is already in store donot make api call again
        // if (workingHours) {
        //     return { workingHours };
        // }
        let extractedWorkingHours: number = 0;
        let checkinTime: string = '';
        let checkoutTime: string = '';
        let deductionTime: string = '';
        let graceTime: string = '';
        try {
            const { data: { configuration } } = await fetchConfiguration('leave management');
            const jsonObject = JSON.parse(configuration.configuration);            
            
            const workingTimeString = jsonObject["Working time"];
            deductionTime = jsonObject["Deduction Time"];            
            checkinTime = jsonObject["Check-in time"];
            checkoutTime = jsonObject["Check-out time"];
            graceTime = jsonObject["Grace Time"];

            
            const regex = /^(\d+):\d+\s*Hrs$/;
            // Attempt to match the regex against the working time string
            const match = workingTimeString.match(regex);
            const time = match[0].split(" ")[0].split(":").map(Number);
            const minutes = time[0]*60+time[1];
            const hours = (minutes/60).toFixed(2);
            
            // If a match is found, extract the digit from the first capturing group;
            // otherwise, default to the original string
            extractedWorkingHours = match ? Number(hours) : workingTimeString;
        } catch (error) {
            console.error("error:: ", error);
        }
        return {
            workingHours: Number(extractedWorkingHours) || 0,
            checkinTime: checkinTime,
            checkoutTime: checkoutTime,
            deductionTime: deductionTime,
            graceTime: graceTime,
        };
    }
)

export const appSettingsSlice = createSlice({
    name: "appSettings",
    initialState,
    reducers: {
        saveAppSettings: (state, action: PayloadAction<any>) => {
            state = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchAppSettings.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchAppSettings.fulfilled, (state, action) => {
            state.isLoading = false;
            state.workingHours = action.payload.workingHours || 0;
            state.checkinTime = action.payload.checkinTime || '';
            state.checkoutTime = action.payload.checkoutTime || '';
            state.deductionTime = action.payload.deductionTime || '';
            state.graceTime = action.payload.graceTime || '';
        });
        builder.addCase(fetchAppSettings.rejected, (state, action) => {
            state.isLoading = false;
            state.error =
                action.error.message || "Failed To Fetch App Settings";
        });
    },
});

export const { saveAppSettings } = appSettingsSlice.actions;

export default appSettingsSlice.reducer;