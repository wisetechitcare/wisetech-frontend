export interface ShiftTime {
  day: string;
  time: string;
}

export interface DurationRule {
  label: string;
  description?: string;
  value: string;
}

export interface LeaveAllowance {
  years: string;
  leaves: string;
}

export interface SalaryDistributionItem {
  name: string;
  percentage: string;
}

export interface DeductionRule {
  name: string;
  period: string;
  deduction: string;
}

export interface ProfessionalTaxRule {
  salary: string;
  deduction: string;
}

export interface ProvidentFundRule {
  name: string;
  deduction: string;
}

export interface AttendanceRules {
  shiftType: string;
  description: string;
  shiftTimes: ShiftTime[];
  otherDurations: DurationRule[];
}

export interface LeaveRules {
  general: DurationRule[];
  allowances: LeaveAllowance[];
}

export interface SalaryRules {
  deductionRules: DeductionRule[];
  grossPayDistribution: SalaryDistributionItem[];
  professionalTax: ProfessionalTaxRule[];
  providentFund: ProvidentFundRule[];
}

export interface RuleData {
  attendance: AttendanceRules;
  leaves: LeaveRules;
  salary: SalaryRules;
  reimbursement?: any;
}

export type RuleCategory = 'Attendance' | 'Leaves' | 'Reimbursement' | 'Salary';
