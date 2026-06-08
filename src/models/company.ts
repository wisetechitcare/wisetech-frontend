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

export interface ICustomField {
    id: string;
    label: string;
    value: string;
    required: boolean;
    type?: 'text' | 'number' | 'file';
}

export interface ISystemFieldOverride {
    id: string;       // matches the Formik field name
    type: string;
    required: boolean;
}

export interface ICustomSection {
    id: string;
    title: string;
    fields: ICustomField[];
    builtinKey?: string; // when set, fields are rendered inside the matching built-in section
    systemOverrides?: ISystemFieldOverride[]; // persisted edits to built-in field type/required
}

// ─── Unified, data-driven form schema (the canonical layout store) ─────────────
// A single ordered list of sections describes the entire editable form: section
// order, section titles, field order, field labels, types and required-ness.
// System fields map 1:1 to DB columns (values live in the column via Formik);
// custom fields store their value inline.
export type FormFieldType = 'text' | 'number' | 'file';

export interface IFormField {
    id: string;          // system: the DB column / Formik name; custom: a uuid
    label: string;
    type: FormFieldType;
    required: boolean;
    isSystem: boolean;   // true = built-in column, false = admin-added
    value?: string;      // only custom fields persist their value here
    hidden?: boolean;    // built-in fields can be hidden from the form instead of deleted
                         // (their DB column still exists); custom fields are removed outright
    showOnInfoPage?: boolean; // visible on the read-only Organization Info page.
                              // undefined/true = shown (opt-out only); false = hidden there.
}

export interface IFormSection {
    id: string;          // system: stable key (e.g. "basic_info"); custom: a uuid
    title: string;
    isSystem: boolean;   // built-in section (cannot be deleted)
    fields: IFormField[];
    showOnInfoPage?: boolean; // whole section visible on the Organization Info page.
                              // undefined/true = shown (opt-out only); false = hidden there.
}

// ─── Multi-organization hierarchy ──────────────────────────────────────────────
export interface IOrgBranchNode {
    id: string;
    name: string;
    address?: string;
    isActive?: boolean;
    companyId: string;
    latitude?: number | string;
    longitude?: number | string;
    employeeCount: number;
}

export interface IOrgNode {
    id: string;
    name: string;
    logo?: string;
    businessType?: string;
    parentOrganizationId?: string | null;
    address?: string;
    contactNumber?: string;
    websiteUrl?: string;
    employeeCount: number;
    branchCount: number;
    childCount: number;
    branches: IOrgBranchNode[];
    children: IOrgNode[];
}

export interface IOrgStats {
    totalOrgs: number;
    rootOrgs: number;
    subOrgs: number;
    totalBranches: number;
    totalEmployees: number;
}

export interface ICompanyOverview {
    name: string,
    fiscalYear: string,
    logo: string,
    salaryStamp?:string,
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
    founder?:string,
    customSections?: ICustomSection[],
    sectionConfig?: IFormSection[], // canonical data-driven form layout

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