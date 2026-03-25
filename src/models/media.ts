export interface Role {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

export interface User {
    firstName: string;
    lastName: string;
    createdById: string | null;
    updatedById: string | null;
}

export interface Designation {
    role: string;
}

export interface Branch {
    latitude: string;
    longitude: string;
    address: string;
}

export interface Department {
    code: string;
    name: string;
    color: string | null;
}

export interface Employee {
    id: string;
    nickName: string | null;
    method: number;
    companyId: string;
    allowOverTime: boolean;
    dateOfJoining: string;
    companyEmailId: string;
    ctcInLpa: number | null;
    gender: number;
    avatar: string | null;
    dateOfExit: string | null;
    maritalStatus: number | null;
    isActive: boolean;
    showAppSettings: boolean;
    createdAt: string;
    companyPhoneNumber: string | null;
    companyPhoneExtension: string | null;
    employeeCode: string;
    employeeTypeId: string;
    reportsToId: string | null;
    userId: string;
    designationId: string;
    branchId: string;
    departmentId: string;
    sourceOfHireId: string | null;
    referredById: string | null;
    workingMethodId: string | null;
    employeeStatusId: string | null;
    vegMealPreference: boolean;
    nonVegMealPreference: boolean;
    veganMealPreference: boolean;
    workSchedule: string;
    digitalSignatureHash: string;
    digitalSignaturePath: string;
    aadharNumber: string;
    aadharCardPath: string;
    panNumber: string;
    panCardPath: string;
    attendanceRequestRaiseLimit: number;
    anniversary: string | null;
    levelId: string | null;
    createdById: string | null;
    updatedById: string | null;
    updatedAt: string;
    users?: User;
    designations?: Designation;
    branches?: Branch;
    departments?: Department;
    roles?: Role[];
    teamMemberships?: any[];
}

export interface AdminFolder {
    id: string;
    name: string;
    employeeCount: number;
}

export interface MediaBreadcrumbItem {
    label: string;
    path?: string;
    isActive?: boolean;
}
