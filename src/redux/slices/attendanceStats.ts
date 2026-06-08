import { IPublicHoliday } from "@models/company";
import { Attendance, CustomLeaves, IAttendance, IAttendanceRequests } from "@models/employee";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AttendanceStats {
    daily: Attendance[],
    weekly: Attendance[],
    monthly: Attendance[],
    yearly: Attendance[],
    dailyTable: IAttendance[],
    weeklyTable: IAttendance[],
    monthlyTable: IAttendance[],
    yearlyTable: IAttendance[],
    dailyRequestTable: IAttendanceRequests[],
    weeklyRequestTable: IAttendanceRequests[],
    monthyRequestTable: IAttendanceRequests[],
    yearlyRequestTable: IAttendanceRequests[],
    leaves: CustomLeaves[],
    filteredLeaves: CustomLeaves[],
    publicHolidays: IPublicHoliday[],
    filteredPublicHolidays: IPublicHoliday[],
    toggleChange: boolean,
    attendanceRequestRaiseLimit: number
}

const initialState: AttendanceStats = {
    daily: [],
    weekly: [],
    monthly: [],
    yearly: [],
    dailyTable: [],
    weeklyTable: [],
    monthlyTable: [],
    yearlyTable: [],
    dailyRequestTable: [],
    weeklyRequestTable: [],
    monthyRequestTable: [],
    yearlyRequestTable: [],
    leaves: [],
    filteredLeaves: [],
    publicHolidays: [],
    filteredPublicHolidays: [],
    toggleChange: false,
    attendanceRequestRaiseLimit: 0
}

export const attendanceStatsSlice = createSlice({
    name: 'attendanceStats',
    initialState,
    reducers: {
        saveDailyStatistics: (state, action: PayloadAction<any>) => {
            state.daily = action.payload;
        },
        saveWeeklyStatistics: (state, action: PayloadAction<any>) => {
            state.weekly = action.payload;
        },
        saveMonthlyStatistics: (state, action: PayloadAction<any>) => {
            state.monthly = action.payload;
        },
        saveYearlyStatistics: (state, action: PayloadAction<any>) => {
            state.yearly = action.payload;
        },
        saveDailyTable: (state, action: PayloadAction<any>) => {
            state.dailyTable = action.payload;
        },
        saveWeeklyTable: (state, action: PayloadAction<any>) => {
            state.weeklyTable = action.payload;
        },
        saveMonthlyTable: (state, action: PayloadAction<any>) => {
            state.monthlyTable = action.payload;
        },
        saveYearlyTable: (state, action: PayloadAction<any>) => {
            state.yearlyTable = action.payload;
        },
        saveDailyRequestTable: (state, action: PayloadAction<any>) => {
            state.dailyRequestTable = action.payload;
        },
        saveWeeklyRequestTable: (state, action: PayloadAction<any>) => {
            state.weeklyRequestTable = action.payload;
        },
        saveMonthlyRequestTable: (state, action: PayloadAction<any>) => {
            state.monthyRequestTable = action.payload;
        },
        saveYearlyRequestTable: (state, action: PayloadAction<any>) => {
            state.yearlyRequestTable = action.payload;
        },
        saveLeaves: (state, action: PayloadAction<any>) => {
            state.leaves = action.payload;
        },
        saveFilteredLeaves: (state, action: PayloadAction<any>) => {
            state.filteredLeaves = action.payload;
        },
        savePublicHolidays: (state, action: PayloadAction<any>) => {
            state.publicHolidays = action.payload;
        },
        saveFilteredPublicHolidays: (state, action: PayloadAction<any>) => {
            state.filteredPublicHolidays = action.payload;
        },
        saveToggleChange: (state, action: PayloadAction<any>) => {
            state.toggleChange = action.payload;
        },
        saveAttendanceRequestRaiseLimit: (state, action: PayloadAction<any>) => {
            state.attendanceRequestRaiseLimit = action.payload;
        }
    }
});

export const { saveDailyStatistics, saveWeeklyStatistics, saveMonthlyStatistics, saveYearlyStatistics,
    saveDailyTable, saveWeeklyTable, saveMonthlyTable, saveYearlyTable, saveLeaves, saveFilteredLeaves,
    savePublicHolidays, saveFilteredPublicHolidays, saveToggleChange, saveDailyRequestTable, saveWeeklyRequestTable,
    saveMonthlyRequestTable, saveYearlyRequestTable, saveAttendanceRequestRaiseLimit
} = attendanceStatsSlice.actions;

export default attendanceStatsSlice.reducer;