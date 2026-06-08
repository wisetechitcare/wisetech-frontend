import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface User {
    firstName: string,
    lastName: string,
}

interface Designation {
    role: string,
}

interface Branch {
    location: string,
    address: string,
    latitude?: string,
    longitude?: string,
    workingAndOffDays?: string,
    showDateIn12HourFormat?: boolean,
    currency?: string,
    dateFormat?: string,
}

interface Department {
    name: string,
}

export interface Employee {
    id: string,
    anniversary: string,
    dateOfJoining: Date | string,
    companyEmailId: string,
    companyId?: string,
    ctcInLpa: string,
    gender: string,
    companyPhoneNumber: string,
    avatar: string | null,
    dateOfExit: string | null,
    dateOfReJoining: string | null,
    dateOfReExit: string | null,
    employeeType: string,
    employeeCode: string,
    workLocation: string,
    higherEducation: string,
    sourceOfHire: string,
    referredBy: string,
    maritalStatus: string,
    reportsToId: string | null,
    userId: string,
    designationId: string,
    branchId: string,
    departmentId: string,
    isActive: boolean,
    createdAt: Date | string,
    users: User,
    designations: Designation,
    branches: Branch,
    digitalSignaturePath: string,
    departments: Department,
    roles: any[],
    hourlySalary?: number,
    attendanceRequestRaiseLimit: number,
    allowedPerMonth?: number,
    allowOverTime: boolean,
}

interface EmployeeState {
    currentEmployee: Employee,
    selectedEmployee: Employee,
}

const initialState: EmployeeState = {
    currentEmployee: {
        id: "",
        anniversary: "",
        dateOfJoining: "",
        companyEmailId: "",
        companyId:"",
        ctcInLpa: "",
        gender: "",
        companyPhoneNumber: "",
        allowOverTime: false,
        avatar: null,
        dateOfExit: null,
        dateOfReJoining: null,
        dateOfReExit: null,
        employeeType: "",
        employeeCode: "",
        workLocation: "",
        higherEducation: "",
        sourceOfHire: "",
        referredBy: "",
        maritalStatus: "",
        reportsToId: "",
        userId: "",
        designationId: "",
        branchId: "",
        departmentId: "",
        isActive: false,
        createdAt: "",
        digitalSignaturePath: "",
        users: {
            firstName: "",
            lastName: "",
        },
        designations: {
            role: ""
        },
        branches: {
            address: "",
            location: "",
            workingAndOffDays: "",
            showDateIn12HourFormat: false,
            currency: "",
            dateFormat: "",
        },
        departments: {
            name: ""
        },
        roles: [],
        hourlySalary: 0,
        attendanceRequestRaiseLimit: 0
    },
    selectedEmployee:
    {
        id: "",
        anniversary: "",
        dateOfJoining: "",
        companyEmailId: "",
        ctcInLpa: "",
        gender: "",
        allowOverTime: false,
        avatar: null,
        companyPhoneNumber: "",
        dateOfExit: null,
        dateOfReJoining: null,
        dateOfReExit: null,
        employeeType: "",
        employeeCode: "",
        workLocation: "",
        higherEducation: "",
        sourceOfHire: "",
        referredBy: "",
        maritalStatus: "",
        reportsToId: null,
        userId: "",
        designationId: "",
        branchId: "",
        departmentId: "",
        isActive: false,
        createdAt: "",
        users: {
            firstName: "",
            lastName: "",
        },
        designations: {
            role: ""
        },
        branches: {
            location: "",
            address: "",
            showDateIn12HourFormat: false,
            currency: "",
            dateFormat: "",
        },
        digitalSignaturePath: "",
        departments: {
            name: ""
        },
        roles: [],
        hourlySalary: 0,
        attendanceRequestRaiseLimit: 0
    }
}

export const employeeSlice = createSlice({
    name: 'employee',
    initialState,
    reducers: {
        saveCurrentEmployee: (state, action: PayloadAction<any>) => {
            state.currentEmployee = action.payload;
        },
        saveSelectedEmployee: (state, action: PayloadAction<any>) => {
            state.selectedEmployee = action.payload;
        },
        saveHourlySalaryOfCurrentEmployee: (state, action: PayloadAction<any>) => {
            state.currentEmployee.hourlySalary = action.payload;
        },
        saveHourlySalaryOfSelectedEmployee: (state, action: PayloadAction<any>) => {
            state.selectedEmployee.hourlySalary = action.payload;
        }
    }
});

export const { saveCurrentEmployee, saveSelectedEmployee, saveHourlySalaryOfCurrentEmployee, saveHourlySalaryOfSelectedEmployee } = employeeSlice.actions;

export default employeeSlice.reducer;