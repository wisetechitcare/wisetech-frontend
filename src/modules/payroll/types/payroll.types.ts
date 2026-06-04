import { Attendance, IPayment } from '@models/employee';
import { Employee } from '@redux/slices/employee';
import { IMonthlyApiResponse, IBreakdownData, IBreakdownItem } from '@redux/slices/salaryData';
import { SalaryCalculations } from '@utils/statistics';

export interface SalaryReportProps {
    stats: Attendance[];
    keyword: string;
    date: string;
    employee: Employee;
    year: string;
    month?: string;
    fromAdmin?: boolean;
    isYearly?: boolean;
    hideSummarySection?: boolean;
    showSensitiveData: boolean;
    monthlyApiData?: IMonthlyApiResponse | null;
    isApiDataLoading?: boolean;
    onRefreshSalaryData?: () => void;
    isRefreshing?: boolean;
}

export type Allowance = {
    name: string;
    value: number;
    type: string;
};

export type SalaryStructure = {
    [key: string]: Allowance;
};

export interface PayrollSummary {
    totalGrossPay: number;
    totalVariableDeduction: number;
    totalFixedDeduction: number;
    totalDeduction: number;
    netSalary: number;
    salaryPaid: number;
    salaryPending: number;
    governmentPaid: number;
    governmentPending: number;
    totalCompanyPayout: number;
    activeGovType: string;
}

export type PayrollTableRow = IMonthlyApiResponse['salaryData'][0] & {
    calculatedGrossPay: number;
    calculatedVariableDeduction: number;
    calculatedFixedDeduction: number;
    calculatedTotalDeduction: number;
    calculatedNetSalary: number;
    calculatedStatus: string;
    calculatedPaidAmount: number;
    salaryPaid: number;
    salaryPending: number;
    governmentPaid: number;
    governmentPending: number;
    item: IMonthlyApiResponse['salaryData'][0];
};

export interface DeductionBreakdownProps {
    deductionBreakdown: IBreakdownData;
    grossPay: number;
    showSensitiveData: boolean;
    dailySalary?: number;
}

export interface NetAmountPayableProps {
    grossPay: number;
    deductionBreakdown: IBreakdownData;
    fallbackNetAmount: number;
    showSensitiveData: boolean;
    isApiDataLoaded: boolean;
    payrollTotalDeductions?: number;
}

export interface BreakdownTableProps {
    data: IBreakdownData;
    type: 'gross' | 'deduction';
    title: string;
    showSensitiveData: boolean;
    hourlySalary?: number;
    dailySalary?: number;
}

export interface GrossDistributionData {
    [key: string]: {
        name: string;
        value: number;
        type: string;
        isActive?: boolean;
    };
}

export interface DynamicField {
    id: string;
    name: string;
    value: number;
    type: string;
    isNew?: boolean;
}
