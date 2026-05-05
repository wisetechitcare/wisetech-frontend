export interface IAttendance {
  id: string | undefined;
  employeeId: string | undefined;
  formattedDate: string | undefined;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  status: string;
  duration: string;
  workingMethod?: string;
  attendanceRequests?: IAttendanceRequests;
  isWeekendOrHoliday?: boolean;
}

export interface IReimbursementsUpdate {
  amount?: string;
  description?: string;
  document?: string;
  employeeId?: string;
  expenseDate?: string;
  fromLocation?: string;
  id?: string;
  reimbursementTypeId?: string;
  reimbursementType?: {
    id?: string,
    type?: string,
  };
  employee?: {
    employeeCode?: string,
    users?: {
      firstName?: string,
      lastName?: string,
    }
  }
  status?: string | number;
}

export interface IEmployeesAttendance {
  latitude?: number;
  longitude?: number;
  id: string;
  code: string;
  name: string;
  checkIn: string;
  checkOut: string;
  status: string;
  duration: string;
  workingMethod: string;
  location: string;
  day: string;
  employeeId?: string;
  isWeekendOrHoliday?: boolean;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutLocation?: string;
  checkInLocation?: string;
  date?: string;
  leaveType?: string;
  checkoutWorkingMethod?: string;
}

export interface WorkingMethod {
  id?: string,
  type: string,
  companyId?: string
}

export interface Attendance {
  id: string,
  employeeId: string,
  checkIn: string,
  checkOut: string,
  latitude: number,
  longitude: number,
  remarks: string | null,
  leaveTrackedId: string | null,
  checkInLocation: string,
  checkOutLocation?: string,
  checkOutLatitude?: number,
  checkOutLongitude?: number,
  workingMethodId?: string,
  workingMethod: WorkingMethod,
  checkoutWorkingMethodId?:string,
  checkoutWorkingMethod?:WorkingMethod
}

export interface AttendanceRecords {
  totalWorkingTimeMinutes: number,
  totalExtraWorkingDays: number,
  leaveDays: number,
  lateDays: number,
}

export interface LeaveOptions {
  leaveType: string;
  canApprove: string
}

export interface Leaves {
  id: string,
  dateFrom: string,
  dateTo: string,
  employeeId: string,
  leaveTypeId: string,
  reason: string | null,
  status: number,
  leaveOptions: LeaveOptions
}

export interface DynamicFieldConfig {
  name: string;
  value: number;
  type: 'percentage' | 'number';
  isActive?: boolean;
  earned?: number;
}

export interface IGrossPayDeductions {
  employeeId: string,
  month: number,
  year: number,
  advancedLoan?: number,
  deductionsOthers?: number,
  foodExpenses?: number,
  grossPayOthers?: number,
  retention?: number,
  grossPayConfigJson?: Record<string, DynamicFieldConfig>,
  deductionsConfigJson?: Record<string, DynamicFieldConfig>
}

export interface IGrossPayConfiguration {
  employeeId: string;
  month: number;
  year: number;
  configuration: Record<string, DynamicFieldConfig>;
}

export interface IGrossPayConfigurationResponse {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  configurationJson: Record<string, DynamicFieldConfig>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IGrossPayConfigurationHistoryResponse {
  configurations: IGrossPayConfigurationResponse[];
  totalCount: number;
}

export interface IValidationResult {
  isValid: boolean;
  error?: string;
}

export interface IDeductionConfiguration {
  employeeId: string;
  month: number;
  year: number;
  configuration: Record<string, DynamicFieldConfig>;
}

export interface IDeductionConfigurationResponse {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  configurationJson: Record<string, DynamicFieldConfig>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDeductionConfigurationHistoryResponse {
  configurations: IDeductionConfigurationResponse[];
  totalCount: number;
}

export interface IPayment {
  id: string,
  employeeId: string,
  amountPaid: number,
  month: number,
  year: number,
  companyId: string,
  createdAt: string,
  paidAt: string,
}

export interface CustomLeaves {
  dateFrom?: string;
  dateTo?: any;
  id: string,
  date: string,
  employeeId: string,
  leaveTypeId: string,
  reason: string | null,
  status: number,
  leaveOptions: LeaveOptions
}

export interface ITodayAttendance {
  id: string;
  name: string;
  date: string;
  day: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: string;
  work: string;
  location: string;
}

export interface IWeeklyAttendance {
  id: string;
  name: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
  total: number;
  present: number;
  late: number;
  extra: number;
}

export interface ILeaves {
  date: string;
  day: string;
  type: string;
  remark: string | null;
  status: string;
}

export interface ILeaveBalance {
  types: string;
  available: number;
  used: number;
  remaining: number;
}

export interface ICheckInPayload {
  employeeId: string;
  latitude: number;
  longitude: number;
  checkIn: Date;
}

export interface ICheckOutPayload {
  attendanceId: string | undefined;
  latitude: number;
  longitude: number;
  checkOut: Date;
  checkOutLocation?: string;
}

export interface IValidateTokenInOut {
  id: string;
  token: string;
}

export interface ILeaveRequest {
  employeeId: string;
  leaveTypeId: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
  status: number;
}

export interface IReimbursements {
  id: number;
  ID?: string;
  name?: string;
  date: string;
  day: string;
  note: string;
  type: string;
  amount: number;
  status: string;
}
export interface IReimbursementsCreate {
  reimbursementTypeId: string,
  expenseDate: string,
  fromLocation?: string,
  toLocation?: string,
  connectionType?: string,
  connectedPerson?: string,
  amount: number | undefined,
  document?: string,
  description: string,
}

export interface IReimbursementType {
}

export interface IReimbursementTypeFetch {
  id: string,
  type: string,
  icon?: string,
  isActive?: boolean
}
export interface IReimbursementTypeCreate {
  type: string,
  icon?: string,
}

export interface IReimbursementsFetch {
  amount?: string;
  description?: string;
  document?: string;
  employeeId?: string;
  expenseDate?: string;
  fromLocation?: string;
  id?: string;
  reimbursementTypeId?: string;
  reimbursementType?: {
    id?: string,
    type?: string,
  };
  employee?: {
    employeeCode?: string,
    users?: {
      firstName?: string,
      lastName?: string,
    }
  }
  status: string | number;
}

export enum ReimbursementStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
}

export interface AttendanceRequest {
  id?: string,
  employeeId: string,
  checkIn?: string,
  checkInLocation?: string,
  checkOut?: string,
  checkOutLocation?: string,
  companyId: string,
  latitude: number,
  longitude: number,
  status: number,
  workingMethodId: string,
  remarks?: string
}

export interface IAttendanceRequests {
  id?: string,
  date: string,
  day: string,
  formattedDate: string,
  checkIn: string,
  checkOut: string,
  rawCheckIn?: string,
  rawCheckOut?: string,
  workingMethod: string,
  workingMethodId: string,
  remarks: string,
  employeeId: string,
  employeeCode?: string,
  employeeName?: string,
  status: number,
  latitude?: number,
  longitude?: number
  approvedById?: string,
  rejectedById?: string,
  approvedOrRejectedDate?: string,
  reportsToId?: string | null,
}

export interface ApprovedAttendanceRequest {
  id?: string,
  requestId?: string,
  employeeId: string,
  checkIn: string,
  checkOut?: string,
  latitude: number,
  longitude: number,
  remarks: string,
  workingMethodId: string
}

export interface Factor {
  factor: string;
  calculatedFrom: string;
  maxValue: number;
  employeesValue: number;
  weightage: number;
  unit: string;
  score: number;
}

export interface KpiModule {
  moduleName: string;
  factors: Factor[];
  totalScore: number;
  maxPossibleScore: number;
  rank: number;
  remark: string;
}
export interface KpiResponse {
  hasError: boolean;
  message: string;
  statusCode: number;
  modules: KpiModule[];
  yourPoints: number;
}

export interface KpiStat {
  label: string;
  employeesValue: number;
  maxValue: number;
  unit?: string;
}

export interface KpiStatsResult {
  workingDays: KpiStat;
  totalWorkingHour: KpiStat;
  extraDays: KpiStat;
  overTime: KpiStat;
  onTimeAttendanceDays: KpiStat;
  lateAttendanceDays: KpiStat;
  totalLateHours: KpiStat;
  editRequestRaised: KpiStat;
  attendanceStreak: KpiStat;
  absentDays: KpiStat;
  totalPaidLeavesTaken: KpiStat;
  totalUnpaidLeavesTaken: KpiStat;
}

export interface IEmployeeLevel {
  id?: string;
  name: string;
  order: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateEmployeeLevel {
  name: string;
  order: number;
  isActive?: boolean;
}

export interface IUpdateEmployeeLevel {
  id: string;
  name?: string;
  order?: number;
  isActive?: boolean;
}



