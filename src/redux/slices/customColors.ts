import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IAttendanceCalendarColor {
    todayColor: string,
    presentColor: string,
    absentColor: string,
    onLeaveColor: string,
    weekendColor: string,
    workingWeekendColor: string,
    markedPresentViaRequestRaisedColor: string,
}

export interface IAttendanceOverviewColor {
    presentColor: string,
    absentColor: string,
    onLeaveColor: string,
    holidayColor: string,
    extraDayColor: string
}

export interface IWorkingPatternColor {
    totalWorkingDaysColor: string,
    checkInColor:string,
    checkoutColor:string,
    earlyCheckinColor: string,
    lateCheckinColor: string,
    earlyCheckoutColor: string,
    lateCheckoutColor: string,
    missingCheckoutColor: string,
}
export interface IWorkingLocationColor {
    officeColor: string,
    onSiteColor: string,
    remoteColor: string,
}
export interface IMomentsThatMatterColor {
    birthdaysColor: string,
    anniversariesColor: string,
}
export interface ILeaveTypesColor {
    sickLeaveColor: string,
    casualLeaveColor: string,
    annualLeaveColor: string,
    maternalLeaveColor: string,
    floaterLeaveColor: string,
    unpaidLeaveColor: string,
}
export interface ICustomColorCode {
    id: string,
    attendanceCalendar: IAttendanceCalendarColor,
    attendanceOverview: IAttendanceOverviewColor,
    workingPattern: IWorkingPatternColor,
    workingLocation: IWorkingLocationColor,
    momentsThatMatter: IMomentsThatMatterColor,
    leaveTypes: ILeaveTypesColor
}

const initialState: ICustomColorCode = {
    id: "",
    attendanceCalendar: {
        todayColor: "#3498DB",
        presentColor: "#2ECC71",
        absentColor: "#E74C3C",
        onLeaveColor: "#FFC300",
        weekendColor: "#9B59B6",
        workingWeekendColor: "#E67E22",
        markedPresentViaRequestRaisedColor: "#1ABC9C",
    },
    attendanceOverview: {
        presentColor: "#2ECC71",
        onLeaveColor: "#FFC300",
        absentColor: "#E74C3C",
        holidayColor: "#9B59B6",
        extraDayColor: "#E67E22",
    },
    workingPattern: {
        totalWorkingDaysColor: '#3498DB',
        checkInColor:'#2ECC71',
        checkoutColor:'#E67E22',
        earlyCheckinColor: '#1ABC9C',
        lateCheckinColor: '#E74C3C',
        earlyCheckoutColor: '#F39C12',
        lateCheckoutColor: '#C0392B',
        missingCheckoutColor: '#95A5A6',
    },
    workingLocation: {
        officeColor: '#3498DB',
        onSiteColor: '#E67E22',
        remoteColor: '#9B59B6',
    },
    momentsThatMatter: {
        birthdaysColor: '#E91E63',
        anniversariesColor: '#9C27B0',
    },
    leaveTypes: {
        sickLeaveColor: '#E74C3C',
        casualLeaveColor: '#3498DB',
        annualLeaveColor: '#2ECC71',
        maternalLeaveColor: '#9B59B6',
        floaterLeaveColor: '#F39C12',
        unpaidLeaveColor: '#95A5A6',
    },
};

export const customColorsSlice = createSlice({
    name: 'customColors',
    initialState,
    reducers: {
        setCustomColors: (state, action: PayloadAction<ICustomColorCode>) => {
            if (action.payload?.id) state.id = action.payload.id;
            if (action.payload?.attendanceCalendar) state.attendanceCalendar = action.payload.attendanceCalendar;
            if (action.payload?.attendanceOverview) state.attendanceOverview = action.payload.attendanceOverview;
            if (action.payload?.workingPattern) state.workingPattern = action.payload.workingPattern;
            if (action.payload?.workingLocation) state.workingLocation = action.payload.workingLocation;
            if (action.payload?.momentsThatMatter) state.momentsThatMatter = action.payload.momentsThatMatter;
            if (action.payload?.leaveTypes) state.leaveTypes = action.payload.leaveTypes;
        },
    }
})

export const { setCustomColors } = customColorsSlice.actions;
export default customColorsSlice.reducer;