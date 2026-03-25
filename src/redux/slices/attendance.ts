import { IAttendance, WorkingMethod } from "@models/employee";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Location {
    latitude: number;
    longitude: number;
}

interface Attendance {
    totalEmployee: number;
    employees:any[],
    disableBtn: boolean;
    openModal: boolean;
    workDuration: string;
    currentAddress: string;
    locationEnabled: boolean;
    btnText: string;
    position: Location;
    employeesAttendance: any[],
    leaveRequests: any[],
    personalAttendance: IAttendance[],
    activeMonth: any,
    workingMethodOptions: WorkingMethod[]
}

const initialState: Attendance = {
    totalEmployee: 0,
    employees:[],
    leaveRequests: [],
    employeesAttendance: [],
    disableBtn: false,
    openModal: false,
    workDuration: "00:00",
    currentAddress: "",
    locationEnabled: false,
    btnText: 'Check in',
    position: {
        latitude: 19.0760,
        longitude: 72.8777
    },
    personalAttendance: [],
    activeMonth: "",
    workingMethodOptions: []
}

export const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        trackMonthChange: (state, action: PayloadAction<any>) => {
            state.activeMonth = action.payload;
        },
        savePersonalAttendance: (state, action: PayloadAction<IAttendance[]>) => {
            state.personalAttendance = action.payload;
        },
        
        saveCoordinates: (state, action: PayloadAction<Location>) => {
            state.position = action.payload;
        },
        saveBtnText: (state, action: PayloadAction<string>) => {
            state.btnText = action.payload;
        },
        toggleLocationPermission: (state, action: PayloadAction<boolean>) => {
            state.locationEnabled = action.payload;
        },
        toggleOpenModal: (state, action: PayloadAction<boolean>) => {
            state.openModal = action.payload;
        },
        toggleDisableBtn: (state, action: PayloadAction<boolean>) => {
            state.disableBtn = action.payload;
        },
        saveCurrentAddress: (state, action: PayloadAction<string>) => {
            state.currentAddress = action.payload;
        },
        saveWorkDuration: (state, action: PayloadAction<string>) => {
            state.workDuration = action.payload;
        },
        saveEmployeesAttendance: (state, action: PayloadAction<any[]>) => {
            state.employeesAttendance = action.payload;
        },
        saveTotalEmployeeCount: (state, action: PayloadAction<number>) => {
            state.totalEmployee = action.payload;
        },
        saveEmplyees:(state,action:PayloadAction<any[]>) =>{
            state.employees = action.payload
        },
        saveLeaveRequests: (state, action: PayloadAction<any[]>) => {
            state.leaveRequests = action.payload;
        },
        saveWorkingMethodOptions: (state, action: PayloadAction<any[]>) => {
            state.workingMethodOptions = action.payload;
        },
    }
});

export const { trackMonthChange, savePersonalAttendance, saveCoordinates, saveBtnText, toggleLocationPermission, saveCurrentAddress
    , saveWorkDuration, toggleOpenModal, toggleDisableBtn, saveEmployeesAttendance, saveTotalEmployeeCount,saveEmplyees, saveLeaveRequests,
    saveWorkingMethodOptions
} = attendanceSlice.actions;

export default attendanceSlice.reducer;