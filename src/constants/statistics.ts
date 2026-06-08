import { fetchAppSettings } from "@redux/slices/appSettings";
import { store } from "@redux/store";
import { fetchConfiguration } from "@services/company";

const shiftHours: number = 9;
const shiftMinutes: number = 30;

export const MAX_FILE_SIZE = 3 * 1024 * 1024;

export const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword", // .doc
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
];
  
export const totalShiftTimeMins: number = (shiftHours * 60) + shiftMinutes;
// change it here
export let totalWorkingHour: number = store.getState().appSettings.workingHours || 0;

export const checkInTime = '04:00';
export const checkOutTime = '12:00';

export const TOTAL_WORKING_DAYS = 'Total Working Days';
export const EARLY_CHECKIN = 'Early CheckIn';
export const LATE_CHECKIN = 'Late CheckIn';
export const EARLY_CHECKOUT = 'Early CheckOut';
export const LATE_CHECKOUT = 'Late CheckOut';
export const MISSING_CHECKOUT = 'Missing CheckOut';

export const PRESENT = 'Present';
export const ON_LEAVE = 'On Leave';
export const EXTRA_DAYS = 'Extra Days';
export const ABSENT = 'Absent';
export const HOLIDAYS = 'Holidays';
export const CHECK_IN_MISSING = 'Check In Missing';
export const CHECK_OUT_MISSING = 'Check Out Missing';
export const WEEKEND = 'Weekend';

export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const monthDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

export const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export const HEATMAPLABELS = {
    PRESENT: 0,
    ABSENT: 1,
    ON_LEAVE: 2,
    EXTRA_DAY: 3,
    HOLIDAY: 4,
    NA: 5,
    CHECK_OUT_MISSING: 6,
    WEEKEND: 7,
};

export const ANNUAL_LEAVES = 'Annual Leaves';
export const SICK_LEAVES = 'Sick Leaves';
export const FLOATER_LEAVES = 'Floater Leaves';
export const MATERNAL_LEAVES= 'Maternal Leaves'
export const CASUAL_LEAVES = 'Casual Leaves';
export const UNPAID_LEAVES= 'Unpaid Leaves'

export const TOTAL_ANNUAL_LEAVES = 12;
export const TOTAL_SICK_LEAVES = 6;
export const TOTAL_FLOATER_LEAVES = 3;

export const YEAR = "Year";
export const MONTH = "Month";

export const REQUEST_RAISE_DISABLE_MESSAGE = 'You have reached the maximum number of requests limit for this month.';

export const workingDaysMapWithDay: { [key: number]: string } = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
};

export const ShareWith = {
    EVERYONE: 'EVERYONE',
    DEPARTMENT: 'DEPARTMENT',
    SELECTED_MEMBERS: 'SELECTED_MEMBERS'
}

export const Status = {
    ApprovalNeeded: 0,
    Approved: 1,
    Rejected: 2,
}

export const LeaveApprovedStatus ={
    Approved:'Approved',
    Pending:'Approval Pending'
}


// use below contant only with  has permissionn function
export const permissionConstToUseWithHasPermission = {
    readOthers: "readOthers",
    readOwn: "readOwn",
    create: "create",
    editOthers: "updateOthers",
    editOwn: "updateOwn",
    deleteOthers: "deleteOthers",
    deleteOwn: "deleteOwn"
}

// use everything in lower case only for key
export const ResourceMapWithName = {
    attendancerequest: "Attendance Request",
    attendancereport: "Attendance Report",
    reimbursement: "Reimbursement",
    leave: "Leave",
}

export const resourceNameMapWithCamelCase = {
    attendanceRequest: "attendancerequest",
    attendanceReport: "attendancereport",
    reimbursement: "reimbursement",
    leave: "leave",
    department: "department",
    designation: "designation",
    announcement: "announcement",
    branch: "branch",
    onboardingDocument: "onboardingdocument",
    employee: "employee",
    holiday: "holiday",
    meeting: "meeting",
    event: "event",
    loan: "loan",
    kpi: "kpi",
    loanInstallment: "loanInstallment",
    salary: "salary",
    birthdays: "birthdays",
    attendanceConfig: "attendanceConfig",
    salaryConfig: "salaryConfig",
    // Dashboard sections
    dashboardAnnouncements: "dashboardannouncements",
    dashboardAttendance: "dashboardattendance",
    dashboardDailyAttendanceOverview: "dashboarddailyattendanceoverview",
    dashboardTasks: "dashboardtasks",
    dashboardUpcomingEvents: "dashboardupcomingevents",
    dashboardTodoCard: "dashboardtodocard",
    dashboardPendingRequests: "dashboardpendingrequests",
    dashboardLeaderboard: "dashboardleaderboard",
    dashboardAnalyticsGraphs: "dashboardanalyticsgraphs",
    dashboardAllLoans: "dashboardallloans",
    dashboardOngoingLoans: "dashboardongoingloans",
    dashboardKpiSection: "dashboardkpisection",
    leaveCashTransfer: "leaveCashTransfer",
    attendanceRequestLimit: "attendanceRequestLimit",
    organisationProfile: "organisationprofile",
}

export const uiControlResourceNameMapWithCamelCase = {
    calendar: "calendar",
    personalUnderAttendanceAndLeaves: "attendanceAndLeaves->personal",
    employeesUnderAttendanceAndLeaves: "attendanceAndLeaves->employees",
    employeesUnderPeople: "people->employees",
    documentsUnderPeople: "people->documents",
    organisationProfileUnderCompany: "company->organisationProfile",
    announcementsUnderCompany: "company->announcements",
    branchesUnderCompany: "company->branches",
    departmentsUnderCompany: "company->departments",
    designationUnderCompany: "company->designation",
    mediaUnderCompany: "company->media",
    onboardingDocumentUnderCompany: "company->onboardingDocument",
    holidaysUnderReports: "reports->holidays",
    reimbursementsUnderFinance: "finance->reimbursements",
    salaryUnderFinance: "finance->salary",
    kpiUnderReports: "reports->kpi",
    loanUnderFinance: "finance-loan",
    leadProjectCompaniesContact: "lead-project->companiesContact",
}

export const LoanType = {
    ONE_TIME: "ONE_TIME",
    EMI: "EMI"
}

export const InstallmentTypeEnum = {
    Upcoming: "Upcoming",
    Custom_Paid: "Custom_Paid",
    Paid: "Paid",
    Skipped: "Skipped"
}

export const InstallmentType = {
    Upcoming: "Upcoming",
    Custom_Paid: "Custom Paid",
    Paid: "Paid",
    Skipped: "Skipped"
}

export const LoanTypeVal = {
    EMI:"EMI",
    ONE_TIME:"One Time"
}

export enum LoanStatus {
    ApprovalPending = 0,
    Approved = 1,
    Rejected = 2
}
 
export enum AnythingStatus {
    ApprovalPending = 0,
    Approved = 1,
    Rejected = 2
}

// Manual status labels for installment status (not loan status)
export const installmentStatusLabels: Record<number, string> = {
    0: "Approval Pending",
    1: "Approved",
    2: "Rejected",
  };

  export const KPI_Module_Name = {
    Attendance: "Attendance",
    Leaves: "Leaves"
  }

export const leadAndProjectTemplateTypeId = {
    newLead: "blank",
    mep: "mep",
    webDev: "web-dev"
}

export const onSiteAndHolidayWeekendSettingsOnOffName = "On-site, Holiday & Weekend Settings for late attendance"

export const prefixIdentifier = {
    "LEAD":"LEAD",
    "PROJECT": "PROJECT",
    "COMPANY": "COMPANY"
}

export const LEAVE_MANAGEMENT_TYPE = {
    TRANSFER: 'TRANSFER',
    CASH: 'CASH'
}

export const LEAVE_MANAGEMENT_TYPE_NAMES = {
    TRANSFER: 'Transfer',
    CASH: 'Encash'
}

export const ADMIN_ROLES = {
    SUPER_ADMIN: 'super admin',
    ADMIN: 'admin'
}