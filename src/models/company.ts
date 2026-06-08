export interface IPublicHoliday {
    date: Date | string,
    holidayId: string,
    isFixed: boolean,
    isActive: boolean,
    isWeekend?: boolean,
    colorCode?: string,
    observedIn?: string,
    companyId?: string;
    from?: string;
    to?: string;
    holiday?: IHoliday;
}

export interface IHoliday {
    name: string,
    isFixed: boolean,
    isActive: boolean,
    colorCode?: string,
    companyId?: string;
}

export interface ICompanyOverview {
    name: string,
    fiscalYear: string,
    logo: string,
    salaryStamp?:string,
    attendanceRequestRaiseLimit?:string,
    monthlyAnnualLeaveLimit?:string,
    showDateIn12HourFormat?:string,
    // workingHrs: string,
    // workingDays: string,
    address: string,
    foundedIn: string,
    contactNumber: string,
    gstNumber: string,
    numberOfEmployees: string,
    websiteUrl: string,
    superAdminEmail: string,
    certificateOfIncorporation?:string,
    panNo?:string,
    tanNo?:string,
    ptecCertificate?:string,
    hsnSacNo?:string,
    beneficiaryName?:string,
    bankNameAndAddress?:string,
    ifscCode?:string,
    accountNo?:string,
    micrCode?:string,
    contactPerson?:string,
    accountantNo?:string,
    additionalplacesofbusiness?:string,
    businessType?:string,
    founder?:string

    accountant?:string
}

export interface ICompanyBranch {
    name: string;
    cityId: string;
    stateId: string;
    address: string;
    postalCode: string;
    latitude: number;
    longitude: number;
}

export interface ICompanyDepartment {
    name: string;
    code: string;
    description?: string;
}

export interface ICompanyDesignation {
    name?: string;
    code?: string;
    description?: string;
    role?: string;
    companyId?: string;
    isActive?: boolean;
}

export interface ICompanyEmployeeTypeUpdate {
    employeeType?: string;
    id?: string;
    companyId?: string;
}

export interface IFaqs {
    id: string,
    question: string,
    answer: string,
    companyId: string,
    type?: string;
}

export interface IConfiguration {
    module: string,
    configuration: any,
}
export interface IBranchWorkingAndOffDays {
    monday: string,
    tuesday: string,
    wednesday: string,
    thursday: string,
    friday: string,
    saturday: string,
    sunday: string,
}

export interface ICompanyBranchUpdate {
    name?: string;
    cityId?: string;
    stateId?: string;
    address?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    workingAndOffDays?: IBranchWorkingAndOffDays;
}
export interface IWeekend {
    monday: boolean,
    tuesday: boolean,
    wednesday: boolean,
    thursday: boolean,
    friday: boolean,
    saturday: boolean,
    sunday: boolean,
}

export interface IPublicHolidayUpdate {
    id: string,
    date: Date | string,
    holidayId: string,
    isFixed: boolean,
    isActive: boolean,
    colorCode?: string,
    observedIn?: string,
    companyId?: string;
    from?: string;
    to?: string;
}

export interface IShareWith {
    EVERYONE?: string;
    SELECTED_MEMBERS?: string;
}

export interface IAnnouncementCreate {
    title: string;
    description: string;
    imageUrl?: string;
    shareWith: IShareWith;
    fromDate: string;
    toDate: string;
    selectedUsers?: any[];
  }
  
  export interface IAnnouncement {
    id: string,
    title: string,
    description: string,
    imageUrl: string,
    shareWith: string,
    departmentId?: string | null,
    fromDate: string,
    toDate: string,
    createdAt?: string,
    isActive?: boolean,
    selectedUsers?: any[];
    department?: null
}

export interface resourseAndView {
    resource: string;
    viewOwn: boolean;
    viewOthers: boolean;
}


// Define the type for the sandwich rules configuration
export interface SandwichRulesConfig {
    isSandwichLeaveFirstEnabled: boolean;   // Friday (Paid) + Monday (Paid) = Weekend (Paid)
    isSandwichLeaveSecondEnabled: boolean;  // Friday (Unpaid) + Monday (Unpaid) = Weekend (Unpaid)
    isSandwichLeaveThirdEnabled: boolean;   // Friday (Paid) + Monday (Unpaid) = Weekend (Paid)
    isSandwichLeaveFourthEnabled: boolean;  // Friday (Unpaid) + Monday (Paid) = Weekend (Paid)
    isSandwichLeaveFifthEnabled?: boolean;  // Optional additional rule
    isSandwichLeaveSixthEnabled?: boolean;  // Optional additional rule
}