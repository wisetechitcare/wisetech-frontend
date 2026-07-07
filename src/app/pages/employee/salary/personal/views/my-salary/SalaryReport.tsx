import { safeJsonParse } from '@utils/safeJson';
import { resolveActiveOrgId } from '@utils/activeOrg';
import TextInput from '@app/modules/common/inputs/TextInput';
import { CUSTOM_SALARY, DEDUCTIONS, GROSS_PAY, LEAVE_MANAGEMENT, SANDWICH_LEAVE_KEY } from '@constants/configurations-key';
import { HOLIDAYS, LATE_CHECKIN, MONTH, ON_LEAVE, Status, YEAR, LEAVE_MANAGEMENT_TYPE } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { IPayment } from '@models/employee';
import { Attendance } from '@models/employee';
import SalarySlipTemplate from '@pages/employee/salary/SalarySlipTemplate';
import { transformApiDataToSalarySlipProps, SalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { saveLeaves, saveToggleChange } from '@redux/slices/attendanceStats';
import { Employee, saveHourlySalaryOfCurrentEmployee, saveHourlySalaryOfSelectedEmployee } from '@redux/slices/employee';
import { RootState, store } from '@redux/store';
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration, fetchSalaryHistory, updateConfigurationById, fetchSalaryPaymentHistory } from '@services/company';
// import { createNewPayment, createUpdateGrossPayDeductions, deletePaymentById, fetchAllPayments, fetchEmpAttendanceStatistics, fetchEmployeeLeaves, fetchGrossPayDeductions, fetchReimbursementsForEmployee, sendSalarySlipToEmployee, updatePaymentById } from '@services/employee';
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { createNewPayment, createUpdateGrossPayDeductions, fetchAllPayments, fetchEmpAttendanceStatistics, fetchEmployeeLeaves, fetchGrossPayDeductions, fetchReimbursementsForEmployee, sendSalarySlipToEmployee, updatePaymentById, getAllLeaveManagements } from '@services/employee';
import { payrollService } from '@modules/payroll/services/payrollService';
import { uploadUserAsset } from '@services/uploader';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { toast } from 'react-toastify';
import { salaryCalculations, donutaDataLabel, getWorkingDaysInMonth, multipleRadialBarData, totalCheckInCheckOutMinutes, getWorkingDaysInYear, getCountOfMonthsEmployeePresentOrOnLeaveInAYear, getTotalWeekendDaysInMonth, getTotalWeekendsInYear, formatNumber, formatStringINR, filterLeavesPublicHolidays, customLeaves, getTotalDaysInMonth, getTotalDaysInYear, getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate, getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate, SalaryCalculations, geAllDaysInAMonth, getAllDaysInAYear, salaryCalculationsForDays } from '@utils/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { Form, Formik, FormikValues } from 'formik';
import { useEffect, useState, useMemo } from 'react';
import { Card, Container, Row, Col, Button, Modal } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons/index'
import { LeaveStatus } from '@constants/attendance';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { getAllUnPaidLeavesForCurrentYear, getAllUnPaidLeavesCurrentMonth, getAllPaidLeavesCurrentMonth, getAllPaidLeaveOfYear, getAllPaidLeaveOfYearFilteredByStartAndEndDate } from '@utils/sandwhichConfiguration'
import DateInput from '@app/modules/common/inputs/DateInput';
import SalaryIncrementModal from '@app/modules/employee/salary/SalaryIncrementModal';
import { createUpdateGrossPayConfiguration, fetchGrossPayConfiguration, validateGrossPayConfigurationJson } from '@services/employee';
import { DeductionDistributionModal } from './DeductionDistributionModal';

const grossPayDeductionsSchema = Yup.object({
    grossPayOthers: Yup.number().typeError("Gross Pay Others must be a valid number!").required().label('Gross Pay Others'),
    // advancedLoan: Yup.number().typeError("Advanced Loan must be a valid number!").required().label('Advanced Loan'),
    // foodExpenses: Yup.number().typeError("Food Expenses must be a valid number!").required().label('Food Expenses'),
    // retention: Yup.number().typeError("Retention must be a valid number!").required().label('Retention'),
    deductionsOthers: Yup.number().typeError("Deduction Others must be a valid number!").required().label('Deduction Others'),
});

const paymentSchema = Yup.object({
    amountPaid: Yup.number().typeError("Payment must be a valid number!").required().label('Payment')
});

type Allowance = {
    name: string;
    value: number;
    type: string;
};

type SalaryStructure = {
    [key: string]: Allowance;
};

// Import types from Redux slice
import { IBreakdownItem, IBreakdownData, IMonthlyApiResponse } from '@redux/slices/salaryData';
import { IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

interface SalaryReportProps {
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

const formatINRDecimal = (n: number) =>
    `₹${Math.trunc(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const formatINRRounded = (n: number) =>
    `₹${Math.trunc(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const sumEarnings = (entries: Record<string, IBreakdownItem> | undefined) =>
    Object.values(entries || {}).reduce(
        (acc, item: any) => acc + Number(item?.earned || 0),
        0
    );

const DeductionPanel = ({
    deductionBreakdown,
    grossPay,
    showSensitiveData,
}: {
    deductionBreakdown: IBreakdownData;
    grossPay: number;
    showSensitiveData: boolean;
}) => {
    const variableEntries = Object.entries(deductionBreakdown?.variable || {});
    const fixedEntries = Object.entries(deductionBreakdown?.fixed || {});

    const totalVariable = sumEarnings(deductionBreakdown?.variable);
    const totalFixed = sumEarnings(deductionBreakdown?.fixed);
    const intermediateSalary = Math.max(0, grossPay - totalVariable);
    const totalDeductions = totalVariable + totalFixed;

    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';
    const formatAdjustmentFormula = (calculatedAmount: number, extraAmount: number) => {
        const sign = extraAmount < 0 ? '-' : '+';
        return `(${formatINRDecimal(calculatedAmount)} ${sign} ${formatINRDecimal(Math.abs(extraAmount))})`;
    };

    return (
        <div className="deduction-panel ">
            {/* 1. Variable Deductions */}
            <div className="mb-3">
                <h6 className="fw-bold mb-2">1. Variable Deductions</h6>
                <div className="table-responsive ">
                    <table className="table table-sm table-borderless mb-0">
                        <thead>
                            <tr>
                                <th style={{ fontWeight: 600, fontSize: 12 }}>Name</th>
                                <th style={{ fontWeight: 600, fontSize: 12, textAlign: 'center' }}>Value</th>
                                <th style={{ fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Deduction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variableEntries.length === 0 && (
                                <tr style={{ fontSize: 11 }}>
                                    <td colSpan={3} className="text-muted">No variable deductions</td>
                                </tr>
                            )}
                            {variableEntries.map(([key, item]: [string, any]) => (
                                <tr key={key} style={{ fontSize: 11 }}>
                                    <td>{item.name || key}</td>
                                    <td style={{ textAlign: 'center' }} className={sensitiveCls}>
                                        {item.value ?? '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                        {formatINRDecimal(Number(item.earned || 0))}
                                    </td>
                                </tr>
                            ))}
                            <tr
                                style={{
                                    fontSize: 12,
                                    backgroundColor: '#FBF0F1',
                                    borderTop: '1px solid #E5C8CA',
                                }}
                            >
                                <td colSpan={2} className="fw-bold py-2" style={{ color: '#AA393D' }}>
                                    Total Variable Deductions
                                </td>
                                <td
                                    className={`fw-bold py-2 ${sensitiveCls}`}
                                    style={{ textAlign: 'right', color: '#AA393D' }}
                                >
                                    -{formatINRDecimal(totalVariable)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Intermediate Salary (B) box */}
            <div
                className="mb-4 p-3 rounded-3"
                style={{ backgroundColor: '#FBF0F1', border: '1px solid #E5C8CA' }}
            >
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold" style={{ color: '#AA393D' }}>
                            Total Salary After Attendance Adjustments(B)
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                            (Total variable deductions)
                        </div>
                    </div>
                    <div
                        className={`fw-bolder fs-5 px-3 py-1 rounded-2 ${sensitiveCls}`}
                        style={{
                            color: '#AA393D',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5C8CA',
                        }}
                    >
                        {formatINRDecimal(intermediateSalary)}
                    </div>
                </div>
            </div>
            <div className="mb-3">
                <h6 className="fw-bold mb-2">2. Fixed Deductions (Calculated on B)</h6>
                <div className="table-responsive">
                    <table className="table table-sm table-borderless mb-0">
                        <thead>
                            <tr style={{ fontWeight: 600, fontSize: 12 }}>
                                <th>Name</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Rate / Amount</th>
                                <th style={{ textAlign: 'right' }}>Base</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fixedEntries.length === 0 && (
                                <tr style={{ fontSize: 11 }}>
                                    <td colSpan={5} className="text-muted">No fixed deductions</td>
                                </tr>
                            )}
                            {fixedEntries.map(([key, item]: [string, any]) => {
                                const isPct = String(item.type).toLowerCase() === 'percentage';
                                const rate = isPct ? `${item.value}%` : formatINRDecimal(Number(item.value || 0));
                                const typeLabel = isPct ? 'Percentage' : 'Fixed';
                                const extraAmount = Number(item.extraAmount || 0);
                                const calculatedAmount = Number(item.calculatedAmount || 0);
                                const earnedAmount = Math.max(0, Number(item.earned || 0));
                                return (
                                    <tr key={key} style={{ fontSize: 11 }}>
                                        <td>{item.name || key}</td>
                                        <td>{typeLabel}</td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {rate}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {isPct ? formatINRDecimal(intermediateSalary) : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            <div className="d-flex flex-column align-items-end">
                                                <span>{formatINRDecimal(earnedAmount)}</span>
                                                {extraAmount !== 0 && (
                                                    <span className="text-muted" style={{ fontSize: 10 }}>
                                                        {formatAdjustmentFormula(calculatedAmount, extraAmount)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                    </tr>
                                );
                            })}
                            <tr
                                style={{
                                    fontSize: 12,
                                    backgroundColor: '#FBF0F1',
                                    borderTop: '1px solid #E5C8CA',
                                }}
                            >
                                <td colSpan={4} className="fw-bold py-2" style={{ color: '#AA393D' }}>
                                    Total Fixed Deductions
                                </td>
                                <td
                                    className={`fw-bold py-2 ${sensitiveCls}`}
                                    style={{ textAlign: 'right', color: '#AA393D' }}
                                >
                                    -{formatINRDecimal(totalFixed)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div
                        className="mb-4 p-3 rounded-3"
                        style={{ backgroundColor: '#FBF0F1', border: '1px solid #E5C8CA' }}
                    >
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="fw-bold" style={{ color: '#AA393D' }}>
                                    Total Salary After Attendance Adjustments (B)
                                </div>
                                <div className="text-muted" style={{ fontSize: 11 }}>
                                    (Total Earnings − Total Government Deductions)
                                </div>
                            </div>
                            <div
                                className={`fw-bolder fs-5 px-3 py-1 rounded-2 ${sensitiveCls}`}
                                style={{
                                    color: '#AA393D',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E5C8CA',
                                }}
                            >
                                {formatINRDecimal(intermediateSalary)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NetAmountPayable = ({
    grossPay,
    deductionBreakdown,
    fallbackNetAmount,
    showSensitiveData,
    isApiDataLoaded,
}: {
    grossPay: number;
    deductionBreakdown: IBreakdownData;
    fallbackNetAmount: number;
    showSensitiveData: boolean;
    isApiDataLoaded: boolean;
}) => {
    const totalVariable = sumEarnings(deductionBreakdown?.variable);
    const totalFixed = sumEarnings(deductionBreakdown?.fixed);
    const intermediateSalary = Math.max(0, grossPay - totalVariable);
    const net = isApiDataLoaded ? intermediateSalary - totalFixed : fallbackNetAmount;
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    return (
        <div
            className="mt-4 p-4 rounded-3"
            style={{ backgroundColor: '#E8F9F6', border: '1px solid #BDEFE8' }}
        >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div className="d-flex align-items-center">
                    <div
                        className="d-flex align-items-center justify-content-center me-3 rounded-circle"
                        style={{ width: 44, height: 44, backgroundColor: '#008C7C' }}
                    >
                        <img
                            src={miscellaneousIcons.grossPayIcon}
                            alt=""
                            style={{ width: 22, height: 22, filter: 'brightness(0) invert(1)' }}
                        />
                    </div>
                    <div>
                        <div className="fw-bold fs-5" style={{ color: '#008C7C' }}>Net Amount Payable</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                            (Total Salary After Attendance Adjustments - other deductions)
                        </div>
                    </div>
                </div>
                <div
                    className={`fs-2 fw-bolder ${net < 0 ? 'text-danger' : ''} ${sensitiveCls}`}
                    style={{ color: net < 0 ? undefined : '#008C7C' }}
                >
                    {formatINRRounded(Math.abs(net))}
                </div>
            </div>
            {isApiDataLoaded && (
                <div
                    className={`mt-3 d-flex justify-content-center align-items-center gap-2 px-3 py-2 rounded-2 ${sensitiveCls}`}
                    style={{ backgroundColor: '#D6F4EE', fontSize: 13 }}
                >
                    <span className="fw-semibold">{formatINRDecimal(intermediateSalary)}</span>
                    <span className="text-muted">−</span>
                    <span className="fw-semibold">{formatINRDecimal(totalFixed)}</span>
                    <span className="text-muted">=</span>
                    <span className="fw-bolder" style={{ color: '#008C7C' }}>
                        {formatINRRounded(net)}
                    </span>
                </div>
            )}
        </div>
    );
};

const SalaryReport = ({ stats, keyword, date, employee, year, month = dayjs().format('MM'), fromAdmin = false, isYearly = false, hideSummarySection = false, showSensitiveData, monthlyApiData, isApiDataLoading, onRefreshSalaryData, isRefreshing }: SalaryReportProps) => {
    console.log("monthlyapidata:: ", monthlyApiData);

    // Helper function to get effective end date considering employee exit date
    const getEffectiveEndDate = (isYearly: boolean, year: string, month: string, fiscalEndDate: string, dateOfExit?: string) => {
        let endDate = isYearly ? fiscalEndDate : dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        const currentDate = dayjs().format('YYYY-MM-DD');

        if (dateOfExit) {
            const exitDate = dayjs(dateOfExit).format('YYYY-MM-DD');
            endDate = dayjs(endDate).isAfter(exitDate) ? exitDate : endDate;
        }

        return dayjs(endDate).isAfter(currentDate) ? currentDate : endDate;
    };

    const dispatch = useDispatch();
    const [totalWorkingHour, setTotalWorkingHour] = useState(0);
    const allowOverTime = employee?.allowOverTime || false;
    const toggleChange = store.getState().attendanceStats.toggleChange;
    const appSettingWrokingHours = useSelector((state: RootState) => state.appSettings.workingHours);
    const appSettingsDeductionTime = useSelector((state: RootState) => state.appSettings.deductionTime);
    const [employeeReimbursements, setEmployeeReimbursements] = useState([]);
    const userId = employee.userId;
    const employeeId = employee?.id;
    // Scope the display's per-day shifts to the viewed employee so they match payroll
    // (branch override → org → global). No scoped shift = global (unchanged).
    const shiftScope = { companyId: (employee as any)?.companyId, branchId: (employee as any)?.branchId };
    const dateOfJoining = dayjs(new Date(employee.dateOfJoining));
    const [startDateForDaysCount, setStartDateForDaysCount] = useState<Dayjs>()
    const [endDateOdDaysCount, setEndDateOdDaysCount] = useState<Dayjs>()
    const [lateAttendanceStats, setLateAttendanceStats] = useState<Attendance[]>([]);
    const [show, setShow] = useState(false);
    const [paymentShow, setPaymentShow] = useState(false);
    const [salaryIncrementShow, setSalaryIncrementShow] = useState(false);
    const [grossDistributionShow, setGrossDistributionShow] = useState(false);
    const [deductionDistributionShow, setDeductionDistributionShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [grossDistributionLoading, setGrossDistributionLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [paymentId, setPaymentId] = useState('');
    // const [leaveDeduct, setLeaveDeduct] = useState(0);
    // what percent of daily salary to deduct on late checkin
    const [multiLateCheckinDeductionPercent, setMultiLateCheckinDeductionPercent] = useState(0);
    // how many late checkins to consider for deduction eg: 4
    const [multipleLateCheckinCountLimit, setMultipleLateCheckinCountLimit] = useState(0);
    const [sandwhichConfiguration, setsandwhichConfiguration] = useState<any>({});
    const [allowances, setAllowancesDeduct] = useState<SalaryStructure>({});
    const [deductionsRule, setDeductionsRule] = useState({});
    const [payments, setPayments] = useState<IPayment[]>([]);
    const [totalUnpaidLeaves, setTotalUnpaidLeaves] = useState(0);
    const [paidLeaves, setPaidLeaves] = useState(0);
    const [grossPayDeductions, setGrossPayDeductions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalWeekndsCount, setTotalWeekndsCount] = useState<number>(0);
    const [totalWeekendFilteredCount, setTotalWeekendfilteredCount] = useState(0)
    const [publicHolidays, setPublicHolidays] = useState<any[]>([]);
    const [publicHolidaysFiltered, setPublicHolidaysFiltered] = useState([])
    const [totalDaysInMonth, setTotalDaysInMonth] = useState<number>(0);
    const [startDateOfMonthOrYear, setStartDateOfMonthOrYear] = useState("")
    const [totalGrossPayFixed, setTotalGrossPayFixed] = useState<SalaryCalculations[]>();
    const [basicSalary, setBasicSalary] = useState(0)
    const [totalWorkingDay, setTotalWorkingDay] = useState(0)
    const [fiscalStartDate, setFiscalStartDate] = useState('')
    const [fiscalEndDate, setFiscalEndDate] = useState('')
    const [totalGrossPayEarned, setTotalGrossPayEarned] = useState(0)
    const [totalGrossPayEarned2, setTotalGrossPayEarned2] = useState(0)
    const [leaveConfigurations, setLeaveConfigurations] = useState()
    const [totalDaysOfMonthOrYear, setTotalDaysOfMonthOrYear] = useState(0) // used for filtering variable pay based on the monthly working days
    const [totalListOfMonthsPresent, setTotalListOfMonthsPresent] = useState<Set<number>>(new Set())
    const [allDaysForMonthOrYear, setAllDaysForMonthOrYear] = useState(0) // used for filtering variable pay based on the monthly working days
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]); // State for day-wise shifts
    const [leaveEncashments, setLeaveEncashments] = useState<any[]>([]);
    const [totalEncashmentAmount, setTotalEncashmentAmount] = useState(0);
    const [grossDistributionData, setGrossDistributionData] = useState<any>({});
    const [grossDistributionInitialValues, setGrossDistributionInitialValues] = useState<any>({});
    const [dynamicFields, setDynamicFields] = useState<any[]>([]);
    const [fieldCounter, setFieldCounter] = useState(1);
    const [deletedFields, setDeletedFields] = useState<string[]>([]);
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    // Initialize form states with proper typing
    const [totalFinalMonthlyWorkingHour, setTotalFinalMonthlyWorkingHour] = useState(0);

    const [initialState, setInitialState] = useState({
        grossPayOthers: 0.00,
        advancedLoan: 0.00,
        foodExpenses: 0.00,
        retention: 0.00,
        deductionsOthers: 0.00,
    });

    const [paymentInitialState, setPaymentInitialState] = useState({
        amountPaid: 0.00,
        paidAt: dayjs().format('YYYY-MM-DD'),
    });


    // Use data from props instead of internal state
    const apiSalaryData = monthlyApiData?.salaryData?.[0] || null;
    const isApiDataLoaded = !!apiSalaryData;

    // Extract breakdown data from props
    const grossPayBreakdown = apiSalaryData?.grossPayBreakdown || { fixed: {}, variable: {} };
    const deductionBreakdown = apiSalaryData?.deductionBreakdown || { fixed: {}, variable: {} };
    console.log("grossPayBreakdown:: ", grossPayBreakdown);

    // Parse amounts from API data
    const apiTotalGrossPayAmount = parseFloat(
        apiSalaryData?.totalGrossPayAmount?.replace(/[₹,]/g, '') || '0'
    );
    const apiTotalDeductionsAmount = parseFloat(
        apiSalaryData?.totalDeductedAmount?.replace(/[₹,]/g, '') || '0'
    );
    const apiNetAmount = parseFloat(
        apiSalaryData?.netAmount?.replace(/[₹,]/g, '') || '0'
    );
    const apiDueAmount = parseFloat(
        apiSalaryData?.dueAmount?.replace(/[₹,]/g, '') || '0'
    );

    // NEW: Dynamic Breakdown Table Component
    const BreakdownTable = ({
        data,
        type,
        title
    }: {
        data: IBreakdownData;
        type: 'gross' | 'deduction';
        title: string;
    }) => {
        // console.log("grossBreakdownTable:: ",data);

        const formatCurrency = (amount: number) => {
            return `₹${Math.round(amount).toLocaleString('en-IN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })}`;
        };

        const formatValue = (value: any, type?: string) => {
            if (value === null || value === undefined) return '-';
            if (typeof value === 'number') {
                // Format to 0 decimal places
                const formatted = Math.round(value).toString();
                return type === 'percentage' ? `${formatted}%` : formatted;
            }
            return value.toString();
        };

        const hasFixedData = Object.keys(data.fixed || {}).length > 0;
        const hasVariableData = Object.keys(data.variable || {}).length > 0;

        if (!hasFixedData && !hasVariableData) {
            return <div className="text-muted">No {type} data available</div>;
        }

        const sumEarned = (entries: Record<string, IBreakdownItem>) =>
            Object.values(entries).reduce((acc, item) => acc + Number(item?.earned || 0), 0);
        const fixedSubtotal = hasFixedData ? sumEarned(data.fixed) : 0;
        const variableSubtotal = hasVariableData ? sumEarned(data.variable) : 0;

        const isDeduction = type === 'deduction';
        const subtotalColor = isDeduction ? '#AA393D' : '#008C7C';
        const subtotalPrefix = isDeduction ? '-' : '+';
        const fixedSubtotalLabel = isDeduction ? 'Total Fixed Deductions' : `Total Fixed ${title}`;
        const variableSubtotalLabel = isDeduction ? 'Total Variable Deductions' : `Total Variable ${title}`;

        return (
            <div className="breakdown-tables">
                {/* Variable Table - 3 columns: Name, Value, Earned (rendered first for deductions
                    so variable deductions feed naturally into the intermediate-salary transition) */}
                {hasVariableData && (
                    <div className="mb-3">
                        <h6 className="fw-bold mb-2">Variable {title}</h6>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ fontWeight: '600', fontSize: '12px' }}>Name</th>
                                        <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'center' }}>Value</th>
                                        <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'center' }}>Rate</th>
                                        <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'right' }}>Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(data.variable).map(([key, item], index) => {
                                        const isHourly = index < 2;
                                        const hourlySalaryVal = apiSalaryData?.hourlySalary;
                                        const dailySalaryVal = apiSalaryData?.employeeCardDetails?.dailySalary ?? (hourlySalaryVal ? hourlySalaryVal * 8 : undefined);
                                        const rateValue = isHourly ? hourlySalaryVal : dailySalaryVal;
                                        const displayRateValue = rateValue ? Math.floor(rateValue * 100) / 100 : undefined;
                                        const rateLabel = displayRateValue && typeof displayRateValue === 'number' && displayRateValue > 0
                                            ? `${formatCurrency(displayRateValue)} / ${isHourly ? 'Hour' : 'Day'}`
                                            : '-';

                                        return (
                                            <tr key={key} style={{ fontSize: '11px' }}>
                                                <td>{item.name || key}</td>
                                                <td style={{ textAlign: 'center' }} className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatValue(item.value, item.type)}</td>
                                                <td style={{ textAlign: 'center' }} className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{rateLabel}</td>
                                                <td style={{ textAlign: 'right' }} className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatCurrency(item.earned)}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ fontSize: '11px', borderTop: '1px solid #E5E8ED' }}>
                                        <td colSpan={3} className="fw-bold pt-2">{variableSubtotalLabel}</td>
                                        <td
                                            style={{ textAlign: 'right', color: subtotalColor }}
                                            className={`fw-bold pt-2 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}
                                        >
                                            {subtotalPrefix}{formatCurrency(variableSubtotal)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Fixed Table - 2 columns: Name, Earned */}
                {hasFixedData && (
                    <div className="mb-2">
                        <h6 className="fw-bold mb-2">Fixed {title}</h6>
                        <div className="table-responsive">
                            <table className="table table-sm table-borderless mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ fontWeight: '600', fontSize: '12px' }}>Name</th>
                                        <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'right' }}>Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(data.fixed).map(([key, item]) => (
                                        <tr key={key} style={{ fontSize: '11px' }}>
                                            <td>{item.name || key}</td>
                                            <td style={{ textAlign: 'right' }} className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatCurrency(item.earned)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontSize: '11px', borderTop: '1px solid #E5E8ED' }}>
                                        <td className="fw-bold pt-2">{fixedSubtotalLabel}</td>
                                        <td
                                            style={{ textAlign: 'right', color: subtotalColor }}
                                            className={`fw-bold pt-2 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}
                                        >
                                            {subtotalPrefix}{formatCurrency(fixedSubtotal)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // API data is now passed through props, no need for internal API call

    // NEW: API-driven calculation functions using useMemo for performance
    const finalTotalGrossPayAmount = useMemo(() => {
        if (!isApiDataLoaded) {
            // Fallback to existing calculation logic
            console.log('📊 [SalaryReport] Using fallback gross pay calculation');
            return totalGrossPayEarned; // existing calculation
        }

        console.log('📊 [SalaryReport] Using API gross pay amount:', apiTotalGrossPayAmount);
        return apiTotalGrossPayAmount;
    }, [isApiDataLoaded, apiTotalGrossPayAmount, totalGrossPayEarned]);

    const finalTotalDeductionsAmount = useMemo(() => {
        if (!isApiDataLoaded) {
            // Fallback to existing calculation logic  
            console.log('📊 [SalaryReport] Using fallback deductions calculation');
            // This will be calculated later in the component - using totalDeductionsEarned
            return 0; // Will be updated after totalDeductionsEarned is calculated
        }

        console.log('📊 [SalaryReport] Using API deductions amount:', apiTotalDeductionsAmount);
        return apiTotalDeductionsAmount;
    }, [isApiDataLoaded, apiTotalDeductionsAmount]);

    const finalNetAmount = useMemo(() => {
        return finalTotalGrossPayAmount - finalTotalDeductionsAmount;
    }, [finalTotalGrossPayAmount, finalTotalDeductionsAmount]);

    // NEW: Calculate summary data and table rows for the Payment Details section
    const summaryData = useMemo(() => {
        const salaryData = monthlyApiData?.salaryData || [];
        let totalGrossPay = 0; // User term: salary - variable
        let totalVariableDeduction = 0;
        let totalFixedDeduction = 0;
        let totalDeduction = 0;
        let totalPaid = 0;

        salaryData.forEach(item => {
            const salary = parseFloat(item.totalGrossPayAmount?.replace(/[₹,]/g, '') || '0');
            const variable = Object.values(item.deductionBreakdown?.variable || {}).reduce((acc: number, val: any) => acc + (Number(val.earned) || 0), 0);
            const fixed = Object.values(item.deductionBreakdown?.fixed || {}).reduce((acc: number, val: any) => acc + (Number(val.earned) || 0), 0);
            const paid = parseFloat(item.amountPaid?.replace(/[₹,]/g, '') || '0');

            totalGrossPay += (salary - variable);
            totalVariableDeduction += variable;
            totalFixedDeduction += fixed;
            totalDeduction += (variable + fixed);
            totalPaid += paid;
        });

        return {
            totalGrossPay,
            totalVariableDeduction,
            totalFixedDeduction,
            totalDeduction,
            totalPaid,
            pendingAmount: Math.max(0, totalGrossPay - totalFixedDeduction - totalPaid)
        };
    }, [monthlyApiData]);

    const tableRows = useMemo(() => {
        const salaryData = monthlyApiData?.salaryData || [];
        return salaryData.map(item => {
            const salary = parseFloat(item.totalGrossPayAmount?.replace(/[₹,]/g, '') || '0');
            const variable = Object.values(item.deductionBreakdown?.variable || {}).reduce((acc: number, val: any) => acc + (Number(val.earned) || 0), 0);
            const fixed = Object.values(item.deductionBreakdown?.fixed || {}).reduce((acc: number, val: any) => acc + (Number(val.earned) || 0), 0);
            const paid = parseFloat(item.amountPaid?.replace(/[₹,]/g, '') || '0');

            const grossPay = salary - variable;
            const totalDeduction = variable + fixed;
            const netSalary = grossPay - fixed;

            let status: 'Paid' | 'Partial' | 'No Payment' = 'No Payment';
            if (paid >= netSalary && netSalary > 0) status = 'Paid';
            else if (paid > 0) status = 'Partial';

            return {
                ...item,
                calculatedGrossPay: grossPay,
                calculatedVariableDeduction: variable,
                calculatedFixedDeduction: fixed,
                calculatedTotalDeduction: totalDeduction,
                calculatedNetSalary: netSalary,
                calculatedStatus: status,
                calculatedPaidAmount: paid,
                item: item
            };
        });
    }, [monthlyApiData]);


    // async function fetchLeaveConfiguration() {
    //         const { data: { configuration } } = await fetchConfiguration('leave management');
    //         const jsonObject = JSON.parse(configuration.configuration);
    //         setConfiguration(jsonObject);
    //         setRuleId(configuration.id);
    // }

    useEffect(() => {
        if (!fiscalStartDate || !fiscalEndDate) return;

        let startDate = dayjs(fiscalStartDate).format('YYYY-MM-DD');
        let endDate = dayjs(fiscalEndDate).format('YYYY-MM-DD');
        let filteredEndDate = dayjs().format('YYYY-MM-DD');
        let filteredStartDate = dayjs().format('YYYY-MM-DD');

        if (dayjs(startDate).isAfter(dayjs(endDate))) {
            startDate = dayjs(endDate).format('YYYY-MM-DD');
        }

        if (!isYearly) {
            startDate = dayjs(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
            endDate = dayjs(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
            filteredEndDate = dayjs().isSameOrBefore(dayjs(endDate)) ? dayjs().format('YYYY-MM-DD') : dayjs(endDate).format('YYYY-MM-DD');
            filteredStartDate = dayjs(`${year}-${month}-01`).isSameOrBefore(dayjs(dateOfJoining)) ? dayjs(dateOfJoining).format('YYYY-MM-DD') : dayjs(`${year}-${month}-01`).format('YYYY-MM-DD');
        }
        else {
            filteredStartDate = dayjs(startDate).isSameOrBefore(dayjs(dateOfJoining)) ? dayjs(dateOfJoining).format('YYYY-MM-DD') : dayjs(startDate).format('YYYY-MM-DD');
            filteredEndDate = dayjs().isSameOrBefore(dayjs(endDate)) ? dayjs().format('YYYY-MM-DD') : dayjs(endDate).format('YYYY-MM-DD');
        }

        let daysCount = dayjs(filteredEndDate).diff(dayjs(filteredStartDate), 'day') + 1;
        if (daysCount <= 0) {
            daysCount = 0;
        }

        let monthsArray: Set<number> = new Set();
        let tempStartDate = dayjs(filteredStartDate);

        while (tempStartDate.isSameOrBefore(filteredEndDate)) {
            monthsArray.add(new Date(tempStartDate.format('YYYY-MM-DD')).getMonth() + 1);
            const tempDate = new Date(tempStartDate.format('YYYY-MM-DD'))
            tempStartDate = dayjs(tempDate.setMonth(tempDate.getMonth() + 1));
        }
        setTotalListOfMonthsPresent(monthsArray);

        setTotalDaysOfMonthOrYear(daysCount);
        let totalOverAllDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
        setAllDaysForMonthOrYear(totalOverAllDays);

        async function fetchStats() {
            const { data: { empAttendanceStatistics } } = await fetchEmpAttendanceStatistics(employeeId, startDate, endDate);
            setLateAttendanceStats(empAttendanceStatistics);
        };

        fetchStats();
    }, [employeeId, fiscalStartDate, fiscalEndDate, isYearly, startDateOfMonthOrYear, month]);

    // Fetch day-wise shifts
    useEffect(() => {
        async function loadDayWiseShifts() {
            try {
                const response = await fetchDayWiseShifts(shiftScope);
                setDayWiseShifts(response.data || []);
            } catch (error) {
                console.error("Error fetching day-wise shifts:", error);
                setDayWiseShifts([]); // Use empty array as fallback
            }
        }
        loadDayWiseShifts();
    }, [shiftScope.companyId, shiftScope.branchId]);

    // const publicHolidays = donutaDataLabel(stats);
    // const publicHolidays = useSelector((state:RootState)=>state.attendanceStats.filteredPublicHolidays)

    useEffect(() => {
        let finalAmount = totalGrossPayEarned;
        console.log("totalGrossPayEarned:: ", totalGrossPayEarned);
        console.log("totalGrossPayFixed:: ", totalGrossPayFixed);
        totalGrossPayFixed?.map((fixed, index) => {
            if (fixed?.name.toLowerCase() != "basic salary") {
                (fixed?.earned).replace(/[₹,]/g, "")
                finalAmount += Number((fixed?.earned).replace(/[₹,]/g, ""))
            }
        })
        setTotalGrossPayEarned2(finalAmount);
    }, [totalGrossPayEarned, totalGrossPayFixed])

    const resolvedMonth = month === '0' ? dayjs().format('MM') : month;

    // Calculate salary components

    const monthlySalary = isYearly ? (basicSalary || 0) : (basicSalary / 12 || 0); // use yearly salary incase of the yearly toggle

    // const totalWorkingDay = (isYearly ? getWorkingDaysInYear(dayjs(year).format('YYYY')) : getWorkingDaysInMonth(dayjs().format('YYYY'), dayjs().format('MM')));

    useEffect(() => {
        if (!year || !month) {
            return;
        }
        let allDays = 0;

        if (!isYearly) {
            allDays = geAllDaysInAMonth(dayjs().format('YYYY'), dayjs(month).format('MM'));
            setTotalWorkingDay(allDays);

            return;
        }

        if (!fiscalEndDate || !fiscalStartDate) {
            return;
        }

        async function getYearlyCount() {
            allDays = getAllDaysInAYear(dayjs(fiscalStartDate), dayjs(fiscalEndDate));
            setTotalWorkingDay(allDays);
        }
        getYearlyCount();
    }, [isYearly, year, month, fiscalStartDate, fiscalEndDate])

    const holidays = publicHolidays.length || 0;
    const filteredHolidays = publicHolidaysFiltered.length || 0;
    const leavesTaken = paidLeaves + totalUnpaidLeaves;
    const paidLeavesTaken = paidLeaves;
    const unpaidLeavesTaken = totalUnpaidLeaves;

    // const holidays = leavesHolidaysMap.get(HOLIDAYS) || 0;

    const dailySalary = monthlySalary / 30;
    let hourlySalary = totalWorkingHour ? dailySalary / totalWorkingHour : 1;

    hourlySalary = Number(hourlySalary.toFixed(2))

    useEffect(() => {
        if (fromAdmin) {
            dispatch(saveHourlySalaryOfSelectedEmployee(hourlySalary));
        } else {
            dispatch(saveHourlySalaryOfCurrentEmployee(hourlySalary));
        }
    }, [hourlySalary])

    const totalMonthlyWorkingHour = ((!isYearly ? totalDaysOfMonthOrYear : totalDaysInMonth) - filteredHolidays - totalWeekendFilteredCount - paidLeaves) * totalWorkingHour;
    const [deductionHours, deductionMinutes] = appSettingsDeductionTime.split(' ')[0].split(':');
    useEffect(() => {
        setTotalFinalMonthlyWorkingHour(totalMonthlyWorkingHour);
    }, [totalMonthlyWorkingHour]);

    const deductionTimeInMinutes = Number(deductionHours || 0) * 60 + Number(deductionMinutes || 0);
    // Calculate earnings

    const workingTime = Math.floor(totalCheckInCheckOutMinutes(stats, deductionTimeInMinutes, appSettingWrokingHours, true) / 60);

    let workingTimeInMinutes = totalCheckInCheckOutMinutes(stats, deductionTimeInMinutes, appSettingWrokingHours, true);

    const differenceTime = totalMonthlyWorkingHour - workingTime;

    const overTime = differenceTime < 0 ? Math.abs(differenceTime) : 0;
    workingTimeInMinutes = workingTimeInMinutes - overTime * 60;
    const workingTimeEarned = ((workingTimeInMinutes) * (hourlySalary / 60));
    // const workingTimeEarned = (workingTime * (hourlySalary));
    const remainingHours = (workingTimeInMinutes - workingTimeInMinutes % 60) / 60;
    const remainingMinutes = workingTimeInMinutes % 60;

    const overTimeEarned = overTime * hourlySalary;

    const remainingTime = differenceTime > 0 ? differenceTime : 0;
    const remainingTimeEarned = (remainingTime * hourlySalary);
    const holidaysEarned = ((filteredHolidays) * dailySalary);
    const leavesTakenEarned = ((paidLeavesTaken || 0) * dailySalary);

    const totalWeekendEarned = totalWeekendFilteredCount * dailySalary;
    // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
    // const totalReimbursementAmount = employeeReimbursements.reduce(
    //     (acc: number, reimbursement: any) => acc + Number(reimbursement?.amount || 0), 
    //     0
    // );

    // COMMENTED: Legacy totalGrossPayEarnedFinal calculation - now using API data
    /*
    // Calculate total gross pay using current state values
    let totalGrossPayEarnedFinal =
        workingTimeEarned + holidaysEarned + leavesTakenEarned +
        (Number(grossPayDeductions[0]?.grossPayOthers) || 0) + totalWeekendEarned + totalEncashmentAmount
    // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
    // let totalGrossPayEarnedFinal =
    //     workingTimeEarned  + holidaysEarned + leavesTakenEarned +
    //     (Number(grossPayDeductions[0]?.grossPayOthers) || 0) + totalReimbursementAmount + totalWeekendEarned
    if (allowOverTime) {
        totalGrossPayEarnedFinal += overTimeEarned;
    }

    useEffect(() => {
        console.log("totalGrossPayEarnedFinal:: ", totalGrossPayEarnedFinal);
        setTotalGrossPayEarned(totalGrossPayEarnedFinal);
    }, [totalGrossPayEarnedFinal, overTimeEarned])
    */

    // NEW: Fallback calculation for legacy compatibility
    let totalGrossPayEarnedFinal = 0;
    if (!isApiDataLoaded) {
        totalGrossPayEarnedFinal = workingTimeEarned + holidaysEarned + leavesTakenEarned +
            (Number(grossPayDeductions[0]?.grossPayOthers) || 0) + totalWeekendEarned + totalEncashmentAmount;
        if (allowOverTime) {
            totalGrossPayEarnedFinal += overTimeEarned;
        }
    }

    // COMMENTED: Legacy grossPayVariable calculation - now using API breakdown data
    /*
    const grossPayVariable = [
        ...(allowOverTime ? [{ name: 'Working Time', value: `${totalFinalMonthlyWorkingHour} hrs`, earned: `${formatNumber(totalMonthlyWorkingHour * (hourlySalary))}` }] :
            [{ name: 'Working Time', value: `${workingTime} hrs`, earned: `${formatNumber(workingTime * (hourlySalary))}` }]),
        ...(allowOverTime ? [{ name: 'Over Time', value: `${workingTime} - ${totalMonthlyWorkingHour} = ${workingTime - totalMonthlyWorkingHour} hrs`, earned: `${formatNumber((workingTime - totalMonthlyWorkingHour) * hourlySalary)}` }] : []),
        { name: 'Remaining Time', value: `${remainingMinutes} Min`, earned: `${formatNumber(remainingMinutes * hourlySalary / 60)}` },
        { name: 'Holidays', value: `${filteredHolidays} Days`, earned: `${formatNumber(holidaysEarned)}` },
        { name: 'Weekends', value: `${totalWeekendFilteredCount} Days`, earned: `${formatNumber(totalWeekendEarned)}` },
        { name: 'Paid Leaves', value: `${paidLeavesTaken} Days`, earned: `${formatNumber(leavesTakenEarned)}` },
        ...(leaveEncashments.length > 0 ? [{ name: 'Leave Encashment', value: `${leaveEncashments[0]?.leaveCount}`, earned: `${formatNumber(totalEncashmentAmount)}` }] : []),
        { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.grossPayOthers || 0)}` },
        // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
        // ...(employeeReimbursements?.length > 0 ? [{
        //     name: 'Reimbursements',
        //     value: `${employeeReimbursements.length}`,
        //     earned: `${formatNumber(totalReimbursementAmount)}`
        // }] : [])
    ];
    */

    // NEW: Fallback grossPayVariable for legacy compatibility (PDF generation, etc.)
    const grossPayVariable = isApiDataLoaded ? [] : [
        ...(allowOverTime ? [{ name: 'Working Time', value: `${totalFinalMonthlyWorkingHour} hrs`, earned: `${formatNumber(totalMonthlyWorkingHour * (hourlySalary))}` }] :
            [{ name: 'Working Time', value: `${workingTime} hrs`, earned: `${formatNumber(workingTime * (hourlySalary))}` }]),
        ...(allowOverTime ? [{ name: 'Over Time', value: `${workingTime} - ${totalMonthlyWorkingHour} = ${workingTime - totalMonthlyWorkingHour} hrs`, earned: `${formatNumber((workingTime - totalMonthlyWorkingHour) * hourlySalary)}` }] : []),
        { name: 'Remaining Time', value: `${remainingMinutes} Min`, earned: `${formatNumber(remainingMinutes * hourlySalary / 60)}` },
        { name: 'Holidays', value: `${filteredHolidays} Days`, earned: `${formatNumber(holidaysEarned)}` },
        { name: 'Weekends', value: `${totalWeekendFilteredCount} Days`, earned: `${formatNumber(totalWeekendEarned)}` },
        { name: 'Paid Leaves', value: `${paidLeavesTaken} Days`, earned: `${formatNumber(leavesTakenEarned)}` },
        ...(leaveEncashments.length > 0 ? [{ name: 'Leave Encashment', value: `${leaveEncashments[0]?.leaveCount}`, earned: `${formatNumber(totalEncashmentAmount)}` }] : []),
        { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.grossPayOthers || 0)}` },
    ];

    //    const grossPayVariable  = [
    //     { name: 'Working Time', value: `${remainingHours} hrs ${remainingMinutes} mins`, earned: `${formatNumber(workingTimeEarned)}` },
    //     ...(allowOverTime ? [{ name: 'Over Time', value: `${overTime} hrs`, earned: `${formatNumber(overTimeEarned)}` }] : []),
    //     // { name: 'Remaining Time', value: `${remainingTime} hrs`, earned: `${formatNumber(remainingTimeEarned)}` },
    //     { name: 'Holidays', value: `${filteredHolidays} Days`, earned: `${formatNumber(holidaysEarned)}` },
    //     { name: 'Weekends', value: `${totalWeekendFilteredCount} Days`, earned: `${formatNumber(totalWeekendEarned)}` },
    //     { name: 'Paid Leaves', value: `${paidLeavesTaken} Days`, earned: `${formatNumber(leavesTakenEarned)}` },
    //     { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.grossPayOthers || 0)}` },
    //     ...(employeeReimbursements?.length > 0 ? [{
    //         name: 'Reimbursements',
    //         value: `${employeeReimbursements.length}`,
    //         earned: `${formatNumber(totalReimbursementAmount)}`
    //     }] : [])
    // ];



    // --------------------gross pay fixed--------------
    // COMMENTED: Legacy grossPayFixed calculation - now using API breakdown data
    /*
    const grossPayFixed = salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, allowances, parseFloat(employee?.ctcInLpa)/12);
    let totalGrossPayFixedAmount = grossPayFixed.reduce((acc, grossPayFixed) => acc + parseFloat((grossPayFixed.earned).replace(/[₹,]/g, "")), 0);

    useEffect(() => {
        let grossPayFixed = salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, allowances, parseFloat(employee?.ctcInLpa) / 12);
        let finalGrossPayFixed = grossPayFixed.map((grossPayData) => {
            if (grossPayData?.name?.toLocaleLowerCase() == "basic salary") {
                return {
                    ...grossPayData,
                    earned: formatNumber(totalGrossPayEarned)
                }
            }

            return grossPayData
        })
        setTotalGrossPayFixed(finalGrossPayFixed);

    }, [allowances, employee?.ctcInLpa, totalGrossPayEarned]);
    */

    // NEW: Fallback grossPayFixed for legacy compatibility (PDF generation, etc.)
    const grossPayFixed = isApiDataLoaded ? [] : salaryCalculationsForDays(totalDaysOfMonthOrYear, allDaysForMonthOrYear, allowances, parseFloat(employee?.ctcInLpa || '0') / 12);
    let totalGrossPayFixedAmount = isApiDataLoaded ? 0 : (grossPayFixed as any[]).reduce((acc, grossPayFixed) => acc + parseFloat((grossPayFixed.earned).replace(/[₹,]/g, "")), 0);

    // --------------------deductions (Variable)------------------
    const lateAttendance = multipleRadialBarData(stats, dayWiseShifts).get(LATE_CHECKIN);
    const amountToDeductForLateCheckinBasedOnPercentage = Math.floor(dailySalary * (multiLateCheckinDeductionPercent / 100));
    const multipleLateCheckinEarned = parseInt(((Math.floor((lateAttendance || 0) / multipleLateCheckinCountLimit)) * amountToDeductForLateCheckinBasedOnPercentage).toString());

    // ------------------ Fixed Deductions (Calculated on Intermediate Salary) ------------------------
    const countOfMonthsEmployeePresentInAYear = getCountOfMonthsEmployeePresentOrOnLeaveInAYear(stats);

    // Intermediate Salary Base for calculations
    const intermediateSalaryBase = Math.max(0, (isApiDataLoaded ? (apiTotalGrossPayAmount || 0) : totalGrossPayEarnedFinal) - multipleLateCheckinEarned);

    let taxes = salaryCalculationsForDays(
        totalDaysOfMonthOrYear,
        allDaysForMonthOrYear,
        deductionsRule,
        intermediateSalaryBase,
        isYearly,
        countOfMonthsEmployeePresentInAYear,
        true,
        totalListOfMonthsPresent.size
    );

    const totalTaxes = taxes.reduce((acc, tax) => acc + parseFloat((tax.earned).replace(/[₹,]/g, "")), 0);

    const totalDeductionsEarned =
        multipleLateCheckinEarned +
        (Number(grossPayDeductions[0]?.advancedLoan) || 0) +
        (Number(grossPayDeductions[0]?.foodExpenses) || 0) +
        (Number(grossPayDeductions[0]?.retention) || 0) +
        (Number(grossPayDeductions[0]?.deductionsOthers) || 0) +
        totalTaxes;
    // +  unPaidLeavesEarned

    const deductions = [
        { name: "Multiple Late Checkin", value: `${lateAttendance} Days`, earned: `${formatNumber(multipleLateCheckinEarned)}` },
        // { name: 'Late Attendance', value: `${lateAttendance} Days`, earned: `${formatNumber(lateAttendanceEarned)}` },
        // { name: 'Unpaid Leaves', value: `${totalUnpaidLeaves} Days`, earned: `${formatNumber(unPaidLeavesEarned)}` },
        // { name: 'Advanced Loan', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.advancedLoan || 0)}` },
        // { name: 'Food Expenses', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.foodExpenses || 0)}` },
        // { name: 'Retention', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.retention || 0)}` },
        // ...((lateAttendance || 0) >= multipleLateCheckinCountLimit ? [{name:"Multiple Late Checkin", value: `${lateAttendance} Days`, earned: `${formatNumber(multipleLateCheckinEarned)}` }] : []),
        { name: 'Others', value: '-', earned: `${formatNumber(grossPayDeductions[0]?.deductionsOthers || 0)}` },
    ];

    // ------------------- Others ---------------

    const totalPayableDays = (workingTime / totalWorkingHour) + (overTime / totalWorkingHour) + (filteredHolidays || 0) + (paidLeavesTaken || 0) + (totalWeekendFilteredCount || 0);

    const netPayable = Math.round(apiTotalGrossPayAmount - apiTotalDeductionsAmount);

    let totalPayment = payments.reduce((acc: number, payment: IPayment) => {
        const amount = Number(payment.amountPaid);
        return acc + amount;
    }, 0);

    const remainingPayment = netPayable - totalPayment;

    // Handler functions
    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handlePaymentClose = () => {
        setPaymentShow(false);
    }

    const handleSalaryIncrementClose = () => {
        setSalaryIncrementShow(false);
    }

    const handleSalaryIncrementOpen = () => {
        setSalaryIncrementShow(true);
    }

    const handleSalaryIncrementSuccess = () => {
        // Refresh salary data or any other necessary actions
        // You can call any data fetching functions here if needed
        // NEW: Refresh salary data if not in yearly view
        if (onRefreshSalaryData && !isYearly) {
            console.log('🔄 [SalaryReport] Triggering salary data refresh after deduction distribution update');
            onRefreshSalaryData();
        }
        dispatch(saveToggleChange(!toggleChange));
    }

    const handleGrossDistributionClose = () => {
        setGrossDistributionShow(false);
        // Reset form when closing
        resetForm();
    }

    const handleDeductionDistributionOpen = () => {
        setDeductionDistributionShow(true);
    }

    const handleDeductionDistributionClose = () => {
        setDeductionDistributionShow(false);
    }

    const handleDeductionDistributionSuccess = async () => {
        setDeductionDistributionShow(false);

        // NEW: Refresh salary data if not in yearly view
        if (onRefreshSalaryData && !isYearly) {
            console.log('🔄 [SalaryReport] Triggering salary data refresh after deduction distribution update');
            onRefreshSalaryData();
        }

        dispatch(saveToggleChange(!toggleChange));
        // Refresh data if needed
        await fetchLeaveConfiguration();
    }

    const resetForm = () => {
        setDynamicFields([]);
        setFieldCounter(1);
        setDeletedFields([]);
    }

    const addNewField = () => {
        const newField = {
            id: `new_field_${Date.now()}`, // Unique ID for new fields
            name: `Other ${fieldCounter}`,
            value: 0,
            type: "number",
            isNew: true
        };
        setDynamicFields([...dynamicFields, newField]);
        setFieldCounter(fieldCounter + 1);
    };

    const removeField = (fieldId: string, isNew: boolean) => {
        if (isNew) {
            // Remove from dynamic fields
            setDynamicFields(dynamicFields.filter(field => field.id !== fieldId));
        } else {
            // Mark existing field for deletion
            setDeletedFields([...deletedFields, fieldId]);
        }
    };

    const updateFieldName = (fieldId: string, newName: string, isNew: boolean) => {
        console.log("insideupdateFieldName:: ", fieldId, newName, isNew);

        if (isNew) {
            setDynamicFields(dynamicFields.map(field =>
                field.id === fieldId ? { ...field, name: newName } : field
            ));
        } else {
            setGrossDistributionData({
                ...grossDistributionData,
                [fieldId]: {
                    ...grossDistributionData[fieldId],
                    name: newName
                }
            });
        }
    };

    const getDynamicValidationSchema = () => {
        const schemaFields: any = {};

        // Add validation for existing fields
        Object.keys(grossDistributionData)
            .filter(key => !deletedFields.includes(key))
            .forEach(key => {
                schemaFields[key] = Yup.number()
                    .typeError(`${grossDistributionData[key].name} must be a valid number`)
                    .required(`${grossDistributionData[key].name} is required`)
                    .min(0, `${grossDistributionData[key].name} must be greater than or equal to 0`);
            });

        // Add validation for new fields
        dynamicFields.forEach(field => {
            schemaFields[field.id] = Yup.number()
                .typeError(`${field.name} must be a valid number`)
                .required(`${field.name} is required`)
                .min(0, `${field.name} must be greater than or equal to 0`);
        });

        return Yup.object().shape(schemaFields);
    };

    const getDynamicInitialValues = () => {
        const initialValues: any = {};

        // Add existing fields
        Object.entries(grossDistributionData)
            .filter(([key]) => !deletedFields.includes(key))
            .forEach(([key, value]: [string, any]) => {
                initialValues[key] = value.value;
            });

        // Add new fields
        dynamicFields.forEach(field => {
            initialValues[field.id] = field.value;
        });
        console.log("grossDistributionData:: ", grossDistributionData);

        console.log("initialValuesinitialValues:: ", initialValues);

        return initialValues;
    };

    const validateFormFields = (formValues: any, allFields: any[]) => {
        console.log("=== VALIDATING FORM FIELDS ===");
        console.log("Form values:", formValues);
        console.log("All fields:", allFields);

        // Check if there are any fields at all
        if (allFields.length === 0) {
            console.log("❌ No fields available");
            return {
                isValid: false,
                hasFields: false,
                errors: ["No fields available. Please add at least one field."]
            };
        }

        const errors: string[] = [];
        let hasEmptyValues = false;
        let hasEmptyNames = false;

        // Validate each field
        allFields.forEach(field => {
            const fieldValue = formValues[field.id];

            // Check for empty names in dynamic fields
            if (field.isNew && (!field.name || field.name.trim() === '')) {
                hasEmptyNames = true;
                errors.push(`Field name cannot be empty for new field`);
            }

            // Check for empty or invalid values
            if (fieldValue === undefined || fieldValue === null || fieldValue === '' || isNaN(Number(fieldValue))) {
                hasEmptyValues = true;
                errors.push(`Value is required for field: ${field.name || field.id}`);
            }

            // Check for negative values
            if (Number(fieldValue) < 0) {
                errors.push(`Value cannot be negative for field: ${field.name || field.id}`);
            }
        });

        const isValid = !hasEmptyValues && !hasEmptyNames && errors.length === 0;

        console.log(`Validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (errors.length > 0) {
            console.log("Validation errors:", errors);
        }

        return {
            isValid,
            hasFields: true,
            hasEmptyValues,
            hasEmptyNames,
            errors
        };
    };

    const getSubmitButtonState = (formikProps: any, allFields: any[], grossDistributionLoading: boolean) => {
        const validation = validateFormFields(formikProps.values, allFields);

        const isDisabled =
            grossDistributionLoading ||
            !formikProps.isValid ||
            !validation.isValid ||
            !validation.hasFields;

        let disabledReason = '';
        if (grossDistributionLoading) disabledReason = 'Loading...';
        else if (!validation.hasFields) disabledReason = 'No fields available';
        else if (validation.hasEmptyValues) disabledReason = 'Some fields have empty values';
        else if (validation.hasEmptyNames) disabledReason = 'Some fields have empty names';
        else if (!formikProps.isValid) disabledReason = 'Form validation failed';

        return {
            isDisabled,
            disabledReason,
            validation
        };
    };

    const checkForDuplicateFieldNames = (allFields: any[]) => {
        const fieldNames = allFields.map(field => field.name.trim().toLowerCase());
        const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);

        return {
            hasDuplicates: duplicates.length > 0,
            duplicates: [...new Set(duplicates)]
        };
    };

    const handleGrossDistributionOpen = async () => {
        setGrossDistributionShow(true);
        await fetchGrossDistributionData();
    }

    const fetchGrossDistributionData = async () => {
        try {
            setGrossDistributionLoading(true);
            console.log("=== FETCHING GROSS DISTRIBUTION DATA ===");
            console.log(`Employee ID: ${employee.id}, Month: ${month}, Year: ${year}`);

            // PRIORITY 1: Check EmployeeGrossPayConfiguration first
            try {
                const apiResult = await fetchGrossPayConfiguration(employee.id, month, year);
                console.log("API Result from EmployeeGrossPayConfiguration:", apiResult);

                if (!apiResult.hasError && apiResult.data && apiResult.data.configuration) {
                    console.log("✅ Found data in EmployeeGrossPayConfiguration");
                    const jsonObject = apiResult.data.configuration;

                    setGrossDistributionData(jsonObject);

                    // Transform data for form initial values
                    const initialValues: any = {};
                    Object.entries(jsonObject).forEach(([key, value]: [string, any]) => {
                        if (key !== '_fieldOrder') { // Skip metadata (backward compatibility)
                            initialValues[key] = value.value;
                        }
                    });

                    setGrossDistributionInitialValues(initialValues);
                    console.log("Initial values set:", initialValues);
                    return; // Exit early if data found
                } else {
                    console.log("❌ No data found in EmployeeGrossPayConfiguration, falling back to old API");
                }
            } catch (apiError: any) {
                console.log("API Error (expected for first time):", apiError?.message);
                // Continue to fallback - this is expected behavior for first-time users
            }

            // PRIORITY 2: Fallback to old configuration API
            console.log("🔄 Falling back to fetchConfiguration API");
            try {
                const monthStart = `${year}-${month.padStart(2, '0')}-01`;
                const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
                const monthEnd = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

                const response = await fetchConfiguration(GROSS_PAY, monthStart, monthEnd);
                console.log("Fallback API response:", response);

                const jsonObject = safeJsonParse(response.data.configuration.configuration);
                setGrossDistributionData(jsonObject);

                // Transform data for form initial values
                const initialValues: any = {};
                Object.entries(jsonObject).forEach(([key, value]: [string, any]) => {
                    initialValues[key] = value.value;
                });

                setGrossDistributionInitialValues(initialValues);
                console.log("✅ Fallback data loaded successfully");

            } catch (fallbackError) {
                console.log("❌ Fallback API also failed:", fallbackError);
                // Set empty state - user can add fields manually
                setGrossDistributionData({});
                setGrossDistributionInitialValues({});
                console.log("🆕 No data found, starting with empty form");
            }

        } catch (error) {
            console.error("❌ Critical error in fetchGrossDistributionData:", error);
            errorConfirmation("Failed to fetch gross distribution data");
            setGrossDistributionData({});
            setGrossDistributionInitialValues({});
        } finally {
            setGrossDistributionLoading(false);
        }
    }

    const handleGrossDistributionSubmit = async (values: any, actions: FormikValues) => {
        try {
            setGrossDistributionLoading(true);

            console.log("=== FORM SUBMISSION VALUES ===");
            console.log("Raw form values:", values);
            console.log("Existing fields data:", grossDistributionData);
            console.log("Dynamic fields:", dynamicFields);
            console.log("Deleted fields:", deletedFields);

            const transformedData: any = {};

            // Handle existing fields (not deleted)
            Object.entries(grossDistributionData)
                .filter(([key]) => !deletedFields.includes(key) && key?.toLowerCase() !== 'basic salary')
                .forEach(([key, fieldData]: [string, any]) => {
                    console.log("key.toLowerCase:: ", key.toLowerCase());
                    console.log("key no lowercase:: ", key);

                    transformedData[key] = {
                        ...fieldData,
                        value: Number(values[key]),
                        type: "number" // Always set type to number
                    };
                });

            // Handle new dynamic fields
            dynamicFields
                .filter((ele) => ele?.name?.toLowerCase() !== 'basic salary')
                .forEach(field => {
                    // const newKey = field.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, ''); // Remove spaces and special chars for key
                    const newKey = field.name;
                    transformedData[newKey] = {
                        name: field.name,
                        value: Number(values[field.id]),
                        type: "number",
                        isActive: true
                    };
                });

            console.log("=== TRANSFORMED DATA FOR API ===");
            console.log("Final transformed data:", transformedData);

            // Validate final data structure before submission
            const configValidation = validateGrossPayConfigurationJson(transformedData);
            if (!configValidation.isValid) {
                console.error("❌ Final configuration validation failed:", configValidation.error);
                errorConfirmation(`Validation failed: ${configValidation.error}`);
                return;
            }

            // Save to new API endpoint
            const apiPayload = {
                employeeId: employee.id,
                month: parseInt(month),
                year: parseInt(year),
                configuration: transformedData
            };

            console.log("=== API PAYLOAD ===");
            console.log("Payload being sent to API:", apiPayload);

            const result = await createUpdateGrossPayConfiguration(apiPayload as any);
            console.log("✅ API response:", result);

            successConfirmation(`Gross distribution updated successfully! ${Object.keys(transformedData).length} field(s) saved.`);
            setGrossDistributionShow(false);
            resetForm(); // Reset form after successful submission

            // NEW: Refresh salary data if not in yearly view
            if (onRefreshSalaryData && !isYearly) {
                console.log('🔄 [SalaryReport] Triggering salary data refresh after gross distribution update');
                await onRefreshSalaryData();
            }

            // Refresh the page data
            dispatch(saveToggleChange(!toggleChange));
            await fetchLeaveConfiguration();

        } catch (error: any) {
            console.error("❌ Error updating gross distribution:", error);
            errorConfirmation(error.message || "Failed to update gross distribution");
        } finally {
            setGrossDistributionLoading(false);
        }
    }

    const handleEdit = () => {
        setShow(true);
    }

    const handlePaymentEdit = (payment?: IPayment) => {
        setPaymentShow(true);
        if (payment?.id !== undefined) {
            setEditMode(true);
            setPaymentId(payment.id);
            setPaymentInitialState({
                amountPaid: payment.amountPaid,
                paidAt: dayjs(payment.paidAt).format('YYYY-MM-DD')
            });
        } else {
            setPaymentInitialState({
                amountPaid: 0,
                paidAt: dayjs().format('YYYY-MM-DD')
            });
            setEditMode(false);
        }
    }

    const handlePaymentDelete = async (payment: IPayment) => {
        try {
            await payrollService.deletePayment(payment.id);
            successConfirmation('Payment deleted successfully');
            fetchPayments();
            dispatch(saveToggleChange(!toggleChange));
        } catch (e) {
            errorConfirmation('Error Occured');
            console.log(e);
        }
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            const keys = Object.keys(values);
            keys.map((key) => {
                values[key] = parseInt(values[key]);
            });

            values['employeeId'] = employee.id;
            values['month'] = month;
            values['year'] = year;

            setLoading(true);
            await createUpdateGrossPayDeductions(values);
            setLoading(false);
            successConfirmation('Salary Report updated successfully');
            setShow(false);
            getGrossPayDeductions();
        } catch (e) {
            setLoading(false);
            errorConfirmation("Something Went Wrong. Try again after some time!");
            setShow(false);
        }
    }

    const handlePaymentSubmit = async (values: any, actions: FormikValues) => {
        const initialAmountPaid = paymentInitialState?.amountPaid;
        const initialPaidAt = paymentInitialState?.paidAt;

        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = (resolveActiveOrgId(companyOverview) ?? '');
            values = {
                ...values,
                employeeId: employee.id,
                month,
                year,
                companyId,
                paidAt: dayjs(values.paidAt).format('YYYY-MM-DD'),
            };

            const newTotalPayment = (totalPayment + parseFloat(values.amountPaid)) - initialAmountPaid;

            // if (newTotalPayment > netPayable) {
            //     errorConfirmation("Payment should be less than NET PAYABLE ");
            //     return;
            // }

            setPaymentLoading(true);

            if (editMode) {
                await updatePaymentById(paymentId, values);
                setPaymentLoading(false);
                successConfirmation('Payment updated successfully');
                setPaymentShow(false);
                setEditMode(false);
                fetchPayments();
                dispatch(saveToggleChange(!toggleChange));
                return;
            }
            const payload = { ...values };
            await createNewPayment(payload);
            setPaymentLoading(false);
            successConfirmation('Payment created successfully');
            setPaymentShow(false);
            dispatch(saveToggleChange(!toggleChange));
            fetchPayments();
        } catch (err) {
            setPaymentLoading(false);
            errorConfirmation("Something Went Wrong. Try again after some time!");
            setPaymentShow(false);
        }
    }

    async function getStartDateOfMonthOrYearForCalculationOfLeavesHolidays(isYearly: boolean, month: string, year: string, dateOfJoining: string) {
        let startDateOfMonthOrYearForCalculation = dayjs().format('YYYY-MM-DD');
        if (isYearly) {
            const res = await generateFiscalYearFromGivenYear(dayjs(year))
            startDateOfMonthOrYearForCalculation = dayjs(res?.startDate).format('YYYY-MM-DD');
        }
        else {
            startDateOfMonthOrYearForCalculation = dayjs(month).startOf('month').format('YYYY-MM-DD');
        }

        if (dayjs(dateOfJoining).isAfter(dayjs(startDateOfMonthOrYearForCalculation))) {
            startDateOfMonthOrYearForCalculation = dayjs(dateOfJoining).format('YYYY-MM-DD');
        }
        else {
            startDateOfMonthOrYearForCalculation = dayjs(startDateOfMonthOrYearForCalculation).format('YYYY-MM-DD');
        }
        setStartDateOfMonthOrYear(startDateOfMonthOrYearForCalculation);
    }

    useEffect(() => {
        if (!dateOfJoining || !month || !year) return;

        const monthStartDate = `${year}-${month}-01`

        getStartDateOfMonthOrYearForCalculationOfLeavesHolidays(isYearly, monthStartDate, year, dayjs(dateOfJoining).format('YYYY-MM-DD'));

    }, [isYearly, dateOfJoining, year, month])

    useEffect(() => {
        if (!year) return;
        async function generateFiscalYear() {
            const res = await generateFiscalYearFromGivenYear(dayjs(year));
            setFiscalStartDate(res?.startDate);
            setFiscalEndDate(res?.endDate);
        }
        generateFiscalYear();
    }, [year])

    // Data fetching functions
    async function fetchLeaveConfiguration() {
        try {
            // Calculate month boundaries for configuration fetching
            const monthStart = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const monthEnd = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            const [customConfiguration, grossPayConfiguration, deductionsConfiguration, sandwhichConfiguration, leaveConfiguration] = await Promise.all([
                fetchConfiguration(CUSTOM_SALARY, monthStart, monthEnd),
                fetchConfiguration(GROSS_PAY, monthStart, monthEnd),
                fetchConfiguration(DEDUCTIONS, monthStart, monthEnd),
                fetchConfiguration(SANDWICH_LEAVE_KEY, monthStart, monthEnd),
                fetchConfiguration(LEAVE_MANAGEMENT, monthStart, monthEnd)
            ]);

            const jsonObjectGrossPay = safeJsonParse(grossPayConfiguration.data.configuration.configuration);
            const jsonObjectCustom = safeJsonParse(customConfiguration.data.configuration.configuration);
            const jsonObjectDeductions = safeJsonParse(deductionsConfiguration.data.configuration.configuration);
            console.log("jsonObjectGrossPay:: ", jsonObjectGrossPay);
            console.log("jsonObjectCustom:: ", jsonObjectCustom);
            console.log("jsonObjectDeductions:: ", jsonObjectDeductions);

            const jsonObjectSandwhich = safeJsonParse(sandwhichConfiguration.data.configuration.configuration);
            const jsonObjectLeave = safeJsonParse(leaveConfiguration.data.configuration.configuration);

            setAllowancesDeduct(jsonObjectGrossPay);
            setDeductionsRule(jsonObjectDeductions);
            // setLeaveDeduct(jsonObjectCustom["Late Checkin"].value || 0);
            setMultiLateCheckinDeductionPercent(Number(jsonObjectCustom["Late Checkin"].deduction_amount) || 0);
            setMultipleLateCheckinCountLimit(Number(jsonObjectCustom["Late Checkin"].period) || 0);

            setsandwhichConfiguration(jsonObjectSandwhich);
            setLeaveConfigurations(jsonObjectLeave);

        } catch (error) {
            console.error("Error fetching leave configuration:", error);
        }
    }

    async function fetchPayments() {
        if (!employee?.id) {
            console.warn('⚠️ [SalaryReport] Cannot fetch payments: Employee ID is missing');
            return;
        }

        try {
            const { data: { salaries } } = await fetchAllPayments(employee.id, month, year);

            setPayments(salaries);
        } catch (error) {
            console.error("Error fetching payments:", error);
        }
    }



    async function getGrossPayDeductions() {
        if (!employee?.id) {
            console.warn('⚠️ [SalaryReport] Cannot fetch gross pay deductions: Employee ID is missing');
            return;
        }

        try {
            const { data: { gpd } } = await fetchGrossPayDeductions(employee.id, month, year);

            if (gpd.length > 0) {
                setInitialState({
                    grossPayOthers: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.grossPayOthers), 0),
                    advancedLoan: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.advancedLoan), 0),
                    foodExpenses: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.foodExpenses), 0),
                    retention: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.retention), 0),
                    deductionsOthers: gpd.reduce((acc: number, num: any) => acc + parseFloat(num.deductionsOthers), 0)
                });
            } else {
                setInitialState({
                    grossPayOthers: 0.00,
                    advancedLoan: 0.00,
                    foodExpenses: 0.00,
                    retention: 0.00,
                    deductionsOthers: 0.00
                });
            }

            setGrossPayDeductions(gpd);
        } catch (error) {
            console.error("Error fetching gross pay deductions:", error);
        }
    }

    async function fetchLeaveEncashments() {
        try {
            const response = await getAllLeaveManagements(employeeId);
            const allLeaveManagements = response.data.leaveManagements || [];

            // Filter only CASH type and approved (status === 1) for the current month/year
            const cashEncashments = allLeaveManagements.filter((lm: any) => {
                const isApproved = lm.status === 1;
                const isCash = lm.managementType === LEAVE_MANAGEMENT_TYPE.CASH;
                const createdDate = dayjs(lm.createdAt);

                if (isYearly) {
                    // For yearly view, check if it's in the fiscal year
                    return isApproved && isCash &&
                        createdDate.isBetween(fiscalStartDate, fiscalEndDate, null, '[]');
                } else {
                    // For monthly view, check if it's in the current month
                    return isApproved && isCash &&
                        createdDate.format('YYYY-MM') === `${year}-${month}`;
                }
            });

            setLeaveEncashments(cashEncashments);

            // Calculate total encashment amount
            const totalAmount = cashEncashments.reduce((acc: number, lm: any) => {
                return acc + (Number(lm.totalAmount) || 0);
            }, 0);

            setTotalEncashmentAmount(totalAmount);
        } catch (error) {
            console.error("Error fetching leave encashments:", error);
            setLeaveEncashments([]);
            setTotalEncashmentAmount(0);
        }
    }

    async function fetchLeavesAndReimbursements() {
        if (!year || !month || !employeeId || !startDateOfMonthOrYear || !fiscalEndDate) {
            console.error('Missing required parameters for fetching leaves', year, month, employeeId);
            return;
        }

        try {
            setIsLoading(true);

            // Create base date object once for consistency
            const baseDate = dayjs(`${year}-${month}-01`);
            if (!baseDate.isValid()) {
                throw new Error(`Invalid date constructed from year: ${year}, month: ${month}`);
            }

            // Get effective end date considering employee exit date
            const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");

            // Log the processing attempt

            // Prepare all promises 
            const unpaidLeavesPromise = isYearly
                ? getAllUnPaidLeavesForCurrentYear(baseDate, sandwhichConfiguration, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllUnPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), sandwhichConfiguration, fromAdmin, [employee]);

            const paidLeavesPromise = isYearly
                ? getAllPaidLeaveOfYearFilteredByStartAndEndDate(baseDate, sandwhichConfiguration, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), sandwhichConfiguration, fromAdmin, [employee]);

            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // const reimbursementsPromise = isYearly
            //     ? Promise.resolve([])
            //     : (
            //         async () => {
            //         const startDate = baseDate.startOf('month');
            //         const endDate = baseDate.endOf('month');

            //         try {
            //             const { data: { reimbursements } } = await fetchReimbursementsForEmployee(
            //                 employeeId, 
            //                 startDate.format('YYYY-MM-DD'),
            //                 endDate.format('YYYY-MM-DD')
            //             );
            //             return reimbursements?.filter((r: any) => r.status === Status.Approved) || [];
            //         } catch (error) {
            //             console.error("Error fetching reimbursements:", error);
            //             return [];
            //         } 
            //     })();

            // Execute all promises in parallel
            const [unpaidLeaves, paidLeavesResult] = await Promise.all([
                unpaidLeavesPromise,
                paidLeavesPromise,
                // reimbursementsPromise
            ]);

            // Apply additional filtering for employee exit date if needed
            // Note: The utility functions should handle date filtering internally,
            // but if additional filtering is needed based on exit date, it can be added here
            let filteredUnpaidLeaves = Number(unpaidLeaves) || 0;
            let filteredPaidLeaves = Number(paidLeavesResult) || 0;

            if (employee?.dateOfExit) {
                const exitDate = dayjs(employee.dateOfExit);
                // The leave calculation functions already consider date ranges,
                // but if they don't properly handle exit dates, additional filtering logic
                // could be implemented here based on the specific leave data structure
            }

            setTotalUnpaidLeaves(filteredUnpaidLeaves);
            setPaidLeaves(filteredPaidLeaves);
            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // setEmployeeReimbursements(reimbursementsResult || []);
            dispatch(saveToggleChange(!toggleChange));

        } catch (error) {
            console.error("Leaves fetch error:", error);
            setTotalUnpaidLeaves(0);
            setPaidLeaves(0);
            // removed reimbursement from gross pay as per discussion but keeping the commnet just in cases needed in future again
            // setEmployeeReimbursements([]);
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchPayments();
    }, [employee.id, month, year]);

    // useEffect(() => {
    //     let isMounted = true;

    //     const loadSalaryData = async () => {
    //         try {
    //             setIsLoading(true);

    //             // API data is now fetched by parent component and passed as props

    //             // Existing data loading (kept for fallback and additional data)
    //             // 1. Fetch leave configuration (sandwich settings)
    //             await fetchLeaveConfiguration();

    //             // 2. Fetch global app settings (working hours, etc.)
    //             await dispatch(fetchAppSettings() as any);

    //             // 3. Fetch gross pay deductions (depends on app settings) - LEGACY FALLBACK
    //             await getGrossPayDeductions();

    //             // 4. Fetch salary payments (independent)
    //             await fetchPayments();

    //             // 5. Fetch leaves and reimbursements (depends on leave config)
    //             await fetchLeavesAndReimbursements();

    //             // 6. Fetch leave encashments (CASH type only)
    //             await fetchLeaveEncashments();

    //         } catch (error) {
    //             console.error('Error loading salary report data:', error);
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     // Only run if component is still mounted and we have required data
    //     if (isMounted && employee?.id && year && month) {
    //         loadSalaryData();
    //     }

    //     return () => {
    //         // Cleanup to avoid setting state on unmounted component
    //         isMounted = false;
    //     };
    // }, [employeeId, year, month, fromAdmin, dispatch, isYearly, startDateOfMonthOrYear, employee?.dateOfExit, fiscalEndDate, fiscalStartDate]);

    // Fetch leave encashments when fiscal dates change


    useEffect(() => {
        if (!fiscalStartDate || !fiscalEndDate || !employeeId) return;
        fetchLeaveEncashments();
    }, [fiscalStartDate, fiscalEndDate, employeeId, year, month, isYearly]);

    useEffect(() => {
        if (!employee?.ctcInLpa) {
            // console.log("ctc of employee not found");
            return
        };

        const data = allowances["Basic Salary"];
        const value = data?.value;
        const type = data?.type;
        const fixedctc = parseFloat(employee?.ctcInLpa);
        let finalSalary = 0;
        if (type?.toLocaleLowerCase() == "percentage") {
            finalSalary = fixedctc * (Number(value) / 100);

            setBasicSalary(finalSalary);
        } else {
            finalSalary = Number(value);

            setBasicSalary(finalSalary);
        }

        setBasicSalary(finalSalary);
    }, [allowances, employee, isYearly])

    // Update working hours when app settings change
    useEffect(() => {
        setTotalWorkingHour(appSettingWrokingHours);
    }, [appSettingWrokingHours]);

    // Update total weekends count when year or month changes
    useEffect(() => {
        if (!startDateOfMonthOrYear || !fiscalEndDate) return;
        const fetchTotalWeekendsCount = async () => {
            // Get effective end date considering employee exit date
            const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");

            const weekendsMonthlyUnfiltered = await getTotalWeekendDaysInMonth(year, Number(resolvedMonth) - 1);
            const weekendsMonthly = await getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate(year, Number(resolvedMonth) - 1, dayjs(startDateOfMonthOrYear));
            const weekendsYearlyUnfiltered = await getTotalWeekendsInYear(dayjs(year), isYearly);
            const totalWeekendsYearly = await getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate(dayjs(year), isYearly, dayjs(startDateOfMonthOrYear));

            // Apply additional filtering for employee exit date
            let filteredWeekends;
            if (employee?.dateOfExit) {
                const exitDate = dayjs(employee.dateOfExit);
                const baseWeekends = isYearly ? totalWeekendsYearly : weekendsMonthly;

                // Calculate how many weekends fall after the exit date and subtract them
                let weekendsAfterExit = 0;
                const periodStart = dayjs(startDateOfMonthOrYear);
                const periodEnd = isYearly ? dayjs(fiscalEndDate) : dayjs(`${year}-${month}-01`).endOf('month');

                // If exit date is before the period start, no adjustment needed
                if (exitDate.isBefore(periodStart)) {
                    filteredWeekends = 0;
                } else if (exitDate.isAfter(periodEnd)) {
                    // If exit date is after the period end, no adjustment needed
                    filteredWeekends = baseWeekends;
                } else {
                    // Count weekends between exit date and period end
                    let currentDate = exitDate.add(1, 'day'); // Start counting from day after exit
                    while (currentDate.isSameOrBefore(periodEnd)) {
                        if (currentDate.day() === 0 || currentDate.day() === 6) { // Sunday = 0, Saturday = 6
                            weekendsAfterExit++;
                        }
                        currentDate = currentDate.add(1, 'day');
                    }
                    filteredWeekends = baseWeekends - weekendsAfterExit;
                }

                setTotalWeekendfilteredCount(Math.max(0, filteredWeekends));
            } else {
                setTotalWeekendfilteredCount(isYearly ? totalWeekendsYearly : weekendsMonthly);
            }

            setTotalWeekndsCount(isYearly ? weekendsYearlyUnfiltered : weekendsMonthlyUnfiltered);
        };
        fetchTotalWeekendsCount();

    }, [year, resolvedMonth, startDateOfMonthOrYear, fiscalEndDate, employee?.dateOfExit]);


    useEffect(() => {
        if (!startDateOfMonthOrYear || !fiscalEndDate) return;

        const fetchalldata = async () => {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const { startDate, endDate } = await generateFiscalYearFromGivenYear(dayjs(year));
            if (!companyOverview || !(resolveActiveOrgId(companyOverview) ?? '')) {
                throw new Error("Company overview data not available");
            }
            const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', (resolveActiveOrgId(companyOverview) ?? ''));

            // Get effective end date considering employee exit date
            const effectiveEndDate = getEffectiveEndDate(isYearly, year, month, fiscalEndDate, employee?.dateOfExit || "");

            //filter holiday for current month/year
            let filterPublicHolidays = isYearly ? publicHolidays.filter((date: any) => {
                return dayjs(date.date).isBetween(startDate, endDate) && !date?.isWeekend
            }) : publicHolidays.filter((date: any) => {
                return dayjs(date.date).format('MM') === month && !date?.isWeekend
            })
            console.log("filteredHolidaysBasedOnMonth:: ", filterPublicHolidays);

            // Consolidated filtering logic with effective end date
            const filteredbasedOnDateOfExit = filterPublicHolidays.filter((date: any) => {
                return dayjs(date.date).isSameOrAfter(startDateOfMonthOrYear) &&
                    dayjs(date.date).isSameOrBefore(effectiveEndDate) &&
                    !date?.isWeekend &&
                    (!date?.from || date?.from === '') &&
                    (!date?.to || date?.to === '')
            })

            setPublicHolidays(filterPublicHolidays)
            setPublicHolidaysFiltered(filteredbasedOnDateOfExit)
        }
        fetchalldata()
    }, [employeeId, month, isYearly, startDateOfMonthOrYear, employee, fiscalEndDate])


    // get total count of days in a month
    useEffect(() => {
        const fetchTotalCount = async () => {
            const totalDaysInMonth = await getTotalDaysInMonth(year, Number(resolvedMonth) - 1); // month is 0 based index
            const totalDaysInYear = await getTotalDaysInYear(year);
            setTotalDaysInMonth(isYearly ? totalDaysInYear : totalDaysInMonth);
        }
        fetchTotalCount();
    }, [year, resolvedMonth, isYearly])

    // Show loading state while data is being fetched
    if (isLoading) {
        return (
            <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    // <SalarySlipTemplate
    //                             grossPayVariable={grossPayVariable}
    //                             totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
    //                             grossPayFixed={grossPayFixed}
    //                             deductions={deductions}
    //                             totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
    //                             taxes={taxes}
    //                             employee={employee}
    //                             finalAmount={formatNumber(Math.round(Math.abs(totalGrossPayEarned - totalDeductionsEarned)))}
    //                             totalPayableDays={totalPayableDays}
    //                             date={date}
    //                             paidLeaves={paidLeaves}
    //                             unpaidLeaves={0}
    //                         />
    // console.log("SalarySlippaidLeaves:: ",paidLeaves);

    // Fetch payment history
    const [paymentHistory, setPaymentHistory] = useState<any | null>(null);
    const salaryId = (apiSalaryData as any)?.salaryId;

    useEffect(() => {
        if (!salaryId) return;
        fetchSalaryPaymentHistory(salaryId)
            .then((history: any) => setPaymentHistory(history))
            .catch((err: any) => {
                console.warn('Failed to fetch payment history:', err);
                setPaymentHistory(null);
            });
    }, [salaryId]);

    // Transform API data to SalarySlipTemplate props format
    const salarySlipProps = useMemo((): SalarySlipProps | null => {
        if (!isApiDataLoaded || !apiSalaryData) {
            console.warn('📊 [SalaryReport] No API data available for SalarySlipTemplate');
            return null;
        }

        console.log('📊 [SalaryReport] Using API data for SalarySlipTemplate');
        try {
            return transformApiDataToSalarySlipProps(apiSalaryData, employee, paymentHistory, salaryId);
        } catch (error) {
            console.error('📊 [SalaryReport] Error transforming API data:', error);
            return null;
        }
    }, [isApiDataLoaded, apiSalaryData, employee, paymentHistory, salaryId]);

    return (
        <>
            <style jsx>{`
            /* ─── Theme tokens (mirrors _variables.custom.scss) ─── */
            :global(:root) {
                --wt-primary: #AA393D;
                --wt-primary-hover: #7a2124;
                --wt-secondary: #295D8E;
                --wt-surface: #F6F9FC;
                --wt-border: #E5E8ED;
                --wt-text-muted: #6B7280;
                --wt-success: #00CAB4;
                --wt-warn: #E2A03F;
                --wt-danger: #C74E52;
                --wt-info: #0E61B6;
            }

            .sensitive-data-hidden {
                filter: blur(5px);
                user-select: none;
                transition: filter 0.3s ease;
            }
            .sensitive-data-visible {
                filter: none;
                transition: filter 0.3s ease;
            }
            .privacy-toggle {
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: background-color 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .privacy-toggle:hover { background-color: var(--wt-surface); }

            /* ─── Summary cards ─── */
            :global(.payroll-summary-card) {
                background: #fff;
                border: 1px solid var(--wt-border);
                border-radius: 12px;
                padding: 16px;
                height: 100%;
                box-shadow: 0 1px 2px rgba(16,24,40,0.04);
                transition: transform .15s ease, box-shadow .15s ease;
            }
            :global(.payroll-summary-card:hover) {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(16,24,40,0.08);
            }
            :global(.payroll-summary-icon) {
                width: 40px; height: 40px;
                border-radius: 10px;
                display: inline-flex;
                align-items: center; justify-content: center;
                margin-bottom: 10px;
            }

            /* ─── Payment Details table ─── */
            :global(.payroll-table-container) {
                background: #fff;
                border: 1px solid var(--wt-border);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(16,24,40,0.04);
            }
            :global(.payroll-table-container .border-bottom) {
                border-bottom: 1px solid var(--wt-border) !important;
                background: linear-gradient(180deg, #fff 0%, var(--wt-surface) 100%);
            }
            :global(.payroll-table) {
                width: 100%;
                margin: 0;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 14px;
            }
            :global(.payroll-table thead th) {
                background: var(--wt-surface);
                color: var(--wt-text-muted);
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: .04em;
                padding: 12px 16px;
                border-bottom: 1px solid var(--wt-border);
                white-space: nowrap;
            }
            :global(.payroll-table tbody td) {
                padding: 14px 16px;
                border-bottom: 1px solid var(--wt-border);
                vertical-align: middle;
            }
            :global(.payroll-table tbody tr:last-child td) { border-bottom: 0; }
            :global(.payroll-table tbody tr:hover) { background: var(--wt-surface); }
            :global(.payroll-table .text-primary) { color: var(--wt-primary) !important; }

            /* ─── Status badges ─── */
            :global(.status-badge) {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: 600;
                border: 1px solid transparent;
            }
            :global(.status-dot) {
                width: 8px; height: 8px; border-radius: 50%;
            }
            :global(.status-badge-paid) {
                background: rgba(0,202,180,0.10);
                color: #008C7C;
                border-color: rgba(0,202,180,0.30);
            }
            :global(.status-dot-paid) { background: var(--wt-success); }
            :global(.status-badge-partial) {
                background: rgba(226,160,63,0.10);
                color: #B7791F;
                border-color: rgba(226,160,63,0.30);
            }
            :global(.status-dot-partial) { background: var(--wt-warn); }
            :global(.status-badge-none) {
                background: rgba(199,78,82,0.10);
                color: var(--wt-danger);
                border-color: rgba(199,78,82,0.30);
            }
            :global(.status-dot-none) { background: var(--wt-danger); }

            /* ─── Action buttons ─── */
            :global(.payroll-action-btn) {
                width: 32px; height: 32px;
                border: 1px solid var(--wt-border);
                background: #fff;
                color: var(--wt-secondary);
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all .15s ease;
            }
            :global(.payroll-action-btn:hover) {
                color: #fff;
                background: var(--wt-secondary);
                border-color: var(--wt-secondary);
            }
            :global(.payroll-action-btn-danger:hover) {
                background: var(--wt-primary);
                border-color: var(--wt-primary);
            }

            /* ─── Themed primary buttons (Modify / Increment / Email etc.) ─── */
            :global(.wt-btn-primary) {
                background-color: var(--wt-primary) !important;
                border-color: var(--wt-primary) !important;
                color: #fff !important;
                transition: background-color .15s ease, border-color .15s ease;
            }
            :global(.wt-btn-primary:hover),
            :global(.wt-btn-primary:focus),
            :global(.wt-btn-primary:active) {
                background-color: var(--wt-primary-hover) !important;
                border-color: var(--wt-primary-hover) !important;
            }

            /* ─── Gross Pay / Deductions header cards ─── */
            :global(.wt-card-gross) {
                background: linear-gradient(135deg, #F0F7FF 0%, #E6F0FB 100%) !important;
                border: 1px solid rgba(41,93,142,0.18) !important;
                border-radius: 14px !important;
            }
            :global(.wt-card-gross .wt-card-title) { color: var(--wt-secondary); }
            :global(.wt-card-deduction) {
                background: linear-gradient(135deg, #FBF0F1 0%, #F5E2E4 100%) !important;
                border: 1px solid rgba(170,57,61,0.18) !important;
                border-radius: 14px !important;
            }
            :global(.wt-card-deduction .wt-card-title) { color: var(--wt-primary); }

            /* ─── Payment modal ─── */
            :global(.wt-payment-modal .modal-content) {
                border: 0;
                border-radius: 14px;
                overflow: hidden;
                box-shadow: 0 20px 50px rgba(16,24,40,0.18);
            }
            :global(.wt-payment-modal .modal-header) {
                background: linear-gradient(135deg, var(--wt-primary) 0%, var(--wt-primary-hover) 100%);
                color: #fff;
                border-bottom: 0;
                padding: 18px 24px;
            }
            :global(.wt-payment-modal .modal-header .modal-title) {
                color: #fff; font-weight: 700; letter-spacing: .01em;
            }
            :global(.wt-payment-modal .modal-header .btn-close) {
                filter: invert(1) grayscale(1) brightness(2);
            }
        `}</style>
            {!hideSummarySection && (
                <Container fluid className="my-5 w-100 px-0">
                    {/* Summary Cards */}
                    <Row className="g-4 mb-5">
                        {[
                            { label: 'Total Gross Pay', value: summaryData.totalGrossPay, icon: 'wallet', color: '#295D8E', bg: 'rgba(41,93,142,0.10)' },
                            { label: 'Total Variable Deduction', value: summaryData.totalVariableDeduction, icon: 'minus-circle', color: '#B7791F', bg: 'rgba(226,160,63,0.12)' },
                            { label: 'Total Fixed Deduction', value: summaryData.totalFixedDeduction, icon: 'lock', color: '#AA393D', bg: 'rgba(170,57,61,0.10)' },
                            { label: 'Total Deduction', value: summaryData.totalDeduction, icon: 'calculator', color: '#0E61B6', bg: 'rgba(14,97,182,0.10)' },
                            { label: 'Total Paid', value: summaryData.totalPaid, icon: 'check-circle', color: '#008C7C', bg: 'rgba(0,202,180,0.12)' },
                            { label: 'Pending Amount', value: summaryData.pendingAmount, icon: 'clock', color: '#C74E52', bg: 'rgba(199,78,82,0.10)' },
                        ].map((card, idx) => (
                            <Col key={idx} xs={12} sm={6} lg={4} xl={2}>
                                <div className="payroll-summary-card">
                                    <div className="payroll-summary-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                                        <KTIcon iconName={card.icon} className="fs-2" />
                                    </div>
                                    <div className="text-muted fs-7 mb-1">{card.label}</div>
                                    <div className={`fs-4 fw-bolder currency-text ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                        {formatStringINR(card.value.toString())}
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>

                    {/* Payment Details Table */}
                    <div className="payroll-table-container">
                        <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                            <h4 className="fw-bold mb-0">Payment Details</h4>
                            {fromAdmin && (
                                <Button
                                    className="btn btn-sm wt-btn-primary d-inline-flex align-items-center"
                                    onClick={() => handlePaymentEdit()}
                                >
                                    <KTIcon iconName="plus" className="fs-3 me-1" />
                                    Add Payment
                                </Button>
                            )}
                        </div>
                        <div className="table-responsive">
                            <table className="payroll-table">
                                <thead>
                                    <tr>
                                        <th>Payment Date</th>
                                        <th className="text-end">Gross Pay</th>
                                        <th className="text-end">Variable Deduction</th>
                                        <th className="text-end">Fixed Deduction</th>
                                        <th className="text-end">Total Deduction</th>
                                        <th className="text-end">Net Salary</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end">Paid Amount</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-5 text-muted">
                                                <div className="d-flex flex-column align-items-center">
                                                    <KTIcon iconName="information-5" className="fs-1 mb-2" />
                                                    <span>No payroll records available for the selected period.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        tableRows.map((row, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <div className="fw-semibold">
                                                        {row.monthEndDate ? dayjs(row.monthEndDate).format('DD-MM-YYYY') : '--'}
                                                    </div>
                                                    <div className="text-muted fs-7">{row.month}</div>
                                                </td>
                                                <td className="text-end">
                                                    <span className={`currency-text ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        {formatINRDecimal(row.calculatedGrossPay)}
                                                    </span>
                                                </td>
                                                <td className="text-end text-danger">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        -{formatINRDecimal(row.calculatedVariableDeduction)}
                                                    </span>
                                                </td>
                                                <td className="text-end text-danger">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        -{formatINRDecimal(row.calculatedFixedDeduction)}
                                                    </span>
                                                </td>
                                                <td className="text-end fw-bold">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        {formatINRDecimal(row.calculatedTotalDeduction)}
                                                    </span>
                                                </td>
                                                <td className="text-end fw-bolder text-primary">
                                                    <span className={`currency-text ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        {formatINRRounded(row.calculatedNetSalary)}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`status-badge ${row.calculatedStatus === 'Paid' ? 'status-badge-paid' :
                                                        row.calculatedStatus === 'Partial' ? 'status-badge-partial' : 'status-badge-none'
                                                        }`}>
                                                        <span className={`status-dot ${row.calculatedStatus === 'Paid' ? 'status-dot-paid' :
                                                            row.calculatedStatus === 'Partial' ? 'status-dot-partial' : 'status-dot-none'
                                                            }`} />
                                                        {row.calculatedStatus}
                                                    </span>
                                                </td>
                                                <td className="text-end fw-bold text-success">
                                                    <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                                        {formatINRRounded(row.calculatedPaidAmount)}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        {fromAdmin && (
                                                            <>
                                                                <button
                                                                    className="payroll-action-btn"
                                                                    onClick={() => handlePaymentEdit(row.item as any)}
                                                                    title="Edit Payment"
                                                                >
                                                                    <KTIcon iconName="pencil" className="fs-5" />
                                                                </button>
                                                                <button
                                                                    className="payroll-action-btn payroll-action-btn-danger"
                                                                    onClick={() => handlePaymentDelete(row.item as any)}
                                                                    title="Delete Payment"
                                                                >
                                                                    <KTIcon iconName="trash" className="fs-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {!fromAdmin && <span className="text-muted">--</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Container>
            )}
            <Container fluid className="my-4 w-100 px-0">

            </Container>
            <Container fluid className="my-4 w-100 px-0">
                <Card className="p-4 shadow-sm w-100">
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }} className='my-3 mx-1'>
                        <h4 className="fw-bold mb-4">Report</h4>
                        <div className="d-flex justify-content-end mb-4 md:justify-content-center">
                            {salarySlipProps ? (
                                <Button
                                    className="me-2"
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            const blob = await payrollService.downloadSalarySlip(monthlyApiData?.salaryData?.[0]?.id as string);
                                            const url = window.URL.createObjectURL(new Blob([blob]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', `${salarySlipProps.employee?.users?.firstName || ''} ${salarySlipProps.employee?.users?.lastName || ''} Salary Slip ${salarySlipProps.date || ''}.pdf`.trim());
                                            document.body.appendChild(link);
                                            link.click();
                                            link.parentNode?.removeChild(link);
                                        } catch (e) {
                                            console.error(e);
                                            errorConfirmation("Failed to download PDF");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Download Report (Pdf)
                                </Button>
                            ) : (
                                <Button disabled>
                                    No Data Available for PDF
                                </Button>
                            )}
                            {salarySlipProps && <Button className="wt-btn-primary" disabled={loading} onClick={
                                async () => {
                                    setLoading(true);
                                    if (!salarySlipProps) {
                                        alert('No salary data available for PDF generation');
                                        setLoading(false);
                                        return;
                                    }
                                    const blob = await payrollService.downloadSalarySlip(monthlyApiData?.salaryData?.[0]?.id as string);
                                    const form = new FormData();
                                    const fileFinal = new File([blob], `${userId}-SalarySlip-${Date.now()}.pdf`, { type: 'application/pdf' });
                                    form.append("file", fileFinal);
                                    let fileUploadedUrl;
                                    try {
                                        const {
                                            data: { path },
                                        } = await uploadUserAsset(form, userId, "salaryreport", "salary-docs");
                                        fileUploadedUrl = path;
                                    } catch (error) {
                                        console.error("Failed to upload file. Please try again.");
                                    }
                                    try {
                                        const data = {
                                            path: fileUploadedUrl,
                                            employeeId: employee?.id,
                                            salaryData: salarySlipProps
                                        };
                                        const res = await sendSalarySlipToEmployee(data);
                                        if (res?.statusCode == 200 && !res.hasError) {
                                            const email = salarySlipProps.employee?.companyEmailId || 'Employee';
                                            toast.success(
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '0.95rem' }}>Email Sent Successfully</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Salary slip delivered to:</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                                                            <span style={{ marginRight: '8px', fontSize: '1.1em' }}>✉️</span>
                                                            {email}
                                                        </div>
                                                    </div>
                                                </div>,
                                                {
                                                    position: 'bottom-right',
                                                    autoClose: 6000,
                                                    style: {
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                                    }
                                                }
                                            );
                                        }
                                        else {
                                            errorConfirmation("Failed to send salary slip. Please try again.");
                                        }
                                    } catch (error) {
                                        console.error("Failed to send salary slip. Please try again.");
                                        errorConfirmation("Failed to send salary slip. Please try again.");
                                    }
                                    setLoading(false);
                                }}
                            >
                                {loading ? "Please wait..." : "Email Salary Slip"}
                            </Button>}

                            {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                                <Button className='wt-btn-primary ms-2' onClick={() => handleSalaryIncrementOpen()}>
                                    Increment Salary
                                </Button>
                            }

                            {(fromAdmin && keyword == MONTH && !hideSummarySection) && <Button className='wt-btn-primary ms-2' onClick={() => handleGrossDistributionOpen()}>
                                Modify Gross Distribution
                            </Button>}

                            {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                                <Button className='wt-btn-primary ms-2' onClick={handleDeductionDistributionOpen}>
                                    Modify Deduction Distribution
                                </Button>
                            }
                        </div>
                    </div>
                    <Row className="g-4">
                        <Col md={6} className='mb-4 mb-lg-0' >
                            <Card className="h-100 w-100 p-2 wt-card-gross">
                                <Card.Body>
                                    <Card.Title className="fw-bold d-flex align-items-center justify-content-between wt-card-title">
                                        <div className="d-flex align-items-center">
                                            <img src={miscellaneousIcons.grossPayIcon} className="me-1" alt="" />
                                            <div className='p-2'>Gross Pay (A)</div>
                                        </div>
                                        <div className={`fw-bold fs-5 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                            +{formatNumber(finalTotalGrossPayAmount)}
                                        </div>
                                    </Card.Title>

                                    {/* NEW: Dynamic API-driven breakdown */}
                                    {isRefreshing ? (
                                        <div className="d-flex justify-content-center align-items-center py-4">
                                            <div className="spinner-border text-success" role="status">
                                                <span className="visually-hidden">Refreshing data...</span>
                                            </div>
                                            <span className="ms-2 text-muted">Refreshing data...</span>
                                        </div>
                                    ) : isApiDataLoaded ? (
                                        <BreakdownTable
                                            data={grossPayBreakdown}
                                            type="gross"
                                            title="Pay"
                                        />
                                    ) : (
                                        <div>
                                            {/* FALLBACK: Legacy UI for when API data is not available */}
                                            <h6 className="mt-4 fw-bold" style={{ color: '#AA393D' }}>Variable</h6>
                                            <Row className="text-muted">
                                                <Col xs={5} sm={4} className="text-start">Name</Col>
                                                <Col xs={3} sm={3} className="text-center">Value</Col>
                                                <Col xs={4} sm={5} className="text-end">Earned</Col>
                                            </Row>
                                            <div className='mb-3'></div>
                                            {grossPayVariable.map((variable, index) => (
                                                <Row key={index} className="mb-2">
                                                    <Col xs={5} sm={4} className="text-start">
                                                        <span>{variable.name}</span>
                                                    </Col>
                                                    <Col xs={3} sm={3} className="text-center">
                                                        <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{variable.value}</span>
                                                    </Col>
                                                    <Col xs={4} sm={5} className="text-end">
                                                        <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{variable.earned}</span>
                                                    </Col>
                                                </Row>
                                            ))}

                                            <h6 className="mt-6 fw-bold">Fixed</h6>
                                            <p className="text-muted small">Exclusive of below total</p>
                                            <Row className="text-muted">
                                                <Col xs={5} sm={4} className="text-start">Name</Col>
                                                <Col xs={3} sm={3} className="text-center">Value</Col>
                                                <Col xs={4} sm={5} className="text-end">Earned</Col>
                                            </Row>
                                            <div className='mb-3'></div>
                                            {totalGrossPayFixed?.map((fixed, index) => {
                                                if (fixed?.name.toLowerCase() == "basic salary") {
                                                    return (
                                                        <Row key={index} className="mb-2">
                                                            <Col xs={5} sm={4} className="text-start">
                                                                <span>{fixed.name}</span>
                                                            </Col>
                                                            <Col xs={3} sm={3} className="text-center">
                                                                <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{fixed.value}</span>
                                                            </Col>
                                                            <Col xs={4} sm={5} className="text-end">
                                                                <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatStringINR(totalGrossPayEarned.toString())}</span>
                                                            </Col>
                                                        </Row>
                                                    )
                                                }
                                                return (
                                                    <Row key={index} className="mb-2">
                                                        <Col xs={5} sm={4} className="text-start">
                                                            <span>{fixed.name}</span>
                                                        </Col>
                                                        <Col xs={3} sm={3} className="text-center">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{fixed.value}</span>
                                                        </Col>
                                                        <Col xs={4} sm={5} className="text-end">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatStringINR(fixed.earned)}</span>
                                                        </Col>
                                                    </Row>
                                                )
                                            })}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={6} >
                            <Card className="h-100 w-100 p-2 wt-card-deduction">
                                <Card.Body>
                                    <Card.Title className="fw-bold d-flex align-items-center justify-content-between wt-card-title">
                                        <div className="d-flex align-items-center">
                                            <img src={miscellaneousIcons.deductionIcon} alt='icon' className='me-1' />
                                            <div className='p-2'> Deductions (B) </div>
                                        </div>
                                        <div className={`fw-bold fs-5 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>
                                            -{formatNumber(finalTotalDeductionsAmount)}
                                        </div>
                                    </Card.Title>

                                    {/* NEW: Dynamic API-driven breakdown */}
                                    {isRefreshing ? (
                                        <div className="d-flex justify-content-center align-items-center py-4">
                                            <div className="spinner-border text-danger" role="status">
                                                <span className="visually-hidden">Refreshing data...</span>
                                            </div>
                                            <span className="ms-2 text-muted">Refreshing data...</span>
                                        </div>
                                    ) : isApiDataLoaded ? (
                                        <DeductionPanel
                                            deductionBreakdown={deductionBreakdown}
                                            grossPay={apiTotalGrossPayAmount}
                                            showSensitiveData={showSensitiveData}
                                        />
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "90%" }}>
                                            <div>
                                                {/* FALLBACK: Legacy UI for when API data is not available */}
                                                <h6 className="mt-6 fw-bold" style={{ color: '#AA393D' }}>Variable</h6>
                                                <Row className="text-muted ">
                                                    <Col xs={5} sm={4} className="text-start">Name / Type</Col>
                                                    <Col xs={3} sm={3} className="text-center">Value</Col>
                                                    <Col xs={4} sm={5} className="text-end">Deducted Amount</Col>
                                                </Row>
                                                <div className='mb-3'></div>
                                                {deductions.map((deduction, index) => (
                                                    <Row key={index} className="mb-2">
                                                        <Col xs={5} sm={4} className="text-start">
                                                            <span>{deduction.name}</span>
                                                        </Col>
                                                        <Col xs={3} sm={3} className="text-center">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{deduction.value}</span>
                                                        </Col>
                                                        <Col xs={4} sm={5} className="text-end">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{formatStringINR(deduction.earned)}</span>
                                                        </Col>
                                                    </Row>
                                                ))}

                                                {/* <h6 className="mt-6 fw-bold">Taxes</h6>
                                                <Row className="text-muted ">
                                                    <Col xs={5} sm={4} className="text-start">Name / Type</Col>
                                                    <Col xs={3} sm={3} className="text-center">Value</Col>
                                                    <Col xs={4} sm={5} className="text-end">Earned</Col>
                                                </Row>
                                                <div className='mb-3'></div>
                                                {taxes.map((tax, index) => (
                                                    <Row key={index} className="mb-2">
                                                        <Col xs={5} sm={4} className="text-start">
                                                            <span>{tax.name}</span>
                                                        </Col>
                                                        <Col xs={3} sm={3} className="text-center">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{tax.value}</span>
                                                        </Col>
                                                        <Col xs={4} sm={5} className="text-end">
                                                            <span className={`${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>{tax.earned}</span>
                                                        </Col>
                                                    </Row>
                                                ))} */}
                                            </div>
                                            <Row className="mt-9 pt-9 fw-bold">
                                                <Col className='mt-9 pt-9 fs-6'>Total Deducted Amount</Col>
                                                <Col className={`text-end text-danger mt-9 pt-9 fs-6 ${showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}`}>-{formatNumber(totalDeductionsEarned)}</Col>
                                            </Row>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    <NetAmountPayable
                        grossPay={apiTotalGrossPayAmount}
                        deductionBreakdown={deductionBreakdown}
                        fallbackNetAmount={finalNetAmount}
                        showSensitiveData={showSensitiveData}
                        isApiDataLoaded={isApiDataLoaded}
                    />
                    {/* <div className="d-flex justify-content-end mt-4 md:justify-content-center">
                        <PDFDownloadLink document={
                            <SalarySlipTemplate
                                grossPayVariable={grossPayVariable}
                                totalGrossPayEarned={`${formatNumber(totalGrossPayEarned)}`}
                                grossPayFixed={grossPayFixed}
                                deductions={deductions}
                                totalDeductionsEarned={`${formatNumber(totalDeductionsEarned)}`}
                                taxes={taxes}
                                employee={employee}
                                finalAmount={formatNumber(Math.abs(totalGrossPayEarned - totalDeductionsEarned))}
                                totalPayableDays={totalPayableDays}
                                date={date}
                                paidLeaves={paidLeaves}
                                unpaidLeaves={totalUnpaidLeaves}
                            />
                        } fileName={`${employee?.firstName || ''} ${employee?.lastName || ''} Salary Slip ${date || ''}.pdf`.trim()} className="me-2" >
                            <Button>
                                Download Report (Pdf)
                            </Button>
                        </PDFDownloadLink>

                        <Button style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }} onClick={ 
                            async ()=> {
                            setLoading(true);
                            if (!salarySlipProps) {
                                alert('No salary data available for PDF generation');
                                setLoading(false);
                                return;
                            }
                            const blob = await pdf(<SalarySlipTemplate {...salarySlipProps} />).toBlob();
                            const form = new FormData();
                            const fileFinal = new File([blob], `${userId}-SalarySlip-${Date.now()}.pdf`, { type: 'application/pdf' });
                            form.append("file", fileFinal);
                            let fileUploadedUrl;
                            try {
                                const {
                                    data: { path },
                                } = await uploadUserAsset(form, userId, "salaryreport", "salary-docs");
                                fileUploadedUrl = path;
                            } catch (error) {
                                console.error("Failed to upload file. Please try again.");
                            }
                            try {
                                const data = {
                                    path: fileUploadedUrl,
                                    employeeId : employee?.id
                                };
                                const res = await sendSalarySlipToEmployee(data);
                                if(res?.statusCode==200 && !res.hasError){
                                    const email = salarySlipProps.employee?.companyEmailId || 'Employee';
                                    toast.success(
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '0.95rem' }}>Email Sent Successfully</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>Salary slip delivered to:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                                                    <span style={{ marginRight: '8px', fontSize: '1.1em' }}>✉️</span>
                                                    {email}
                                                </div>
                                            </div>
                                        </div>,
                                        {
                                            position: 'bottom-right',
                                            autoClose: 6000,
                                            style: {
                                                borderRadius: '12px',
                                                padding: '16px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                            }
                                        }
                                    );
                                }
                                else{
                                    errorConfirmation("Failed to send salary slip. Please try again.");
                                }
                            } catch (error) {
                                console.error("Failed to send salary slip. Please try again.");
                                errorConfirmation("Failed to send salary slip. Please try again.");
                            }
                            setLoading(false);
                        }}
                        disabled={loading}
                        >
                            {loading ? "Please wait..." : "Email Salary Slip"}
                        </Button>

                        {(fromAdmin && keyword == MONTH && !hideSummarySection) &&
                            <Button style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }} className='ms-2' onClick={() => handleEdit()}>
                                Modify
                            </Button>
                        }
                    </div> */}
                    <div>
                    </div>
                </Card>
            </Container>

            <Modal show={paymentShow} onHide={handlePaymentClose} centered dialogClassName="wt-payment-modal">
                <Modal.Header closeButton>
                    <Modal.Title>Payments</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={paymentInitialState} onSubmit={handlePaymentSubmit} validationSchema={paymentSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form'>
                                    <div className="col-lg" >
                                        <TextInput
                                            isRequired={true}
                                            label="Payment"
                                            margin="mb-7"
                                            formikField="amountPaid" />
                                    </div>
                                    <div className="col-lg mb-7" >
                                        <DateInput
                                            isRequired={true}
                                            inputLabel="Payment Date"
                                            formikField="paidAt"
                                            formikProps={formikProps}
                                            placeHolder="Payment Date"
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <Row className='pr-5'>
                                            Remaining Payment <span className={showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden'}>
                                                {(formatNumber(Math.round(remainingPayment)))}
                                            </span>
                                        </Row>
                                        <button type='submit' className='btn wt-btn-primary' disabled={paymentLoading || !formikProps.isValid}>
                                            {!paymentLoading && 'Save Changes'}
                                            {paymentLoading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Modify Salary Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={grossPayDeductionsSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form'>
                                    <Modal.Title className='mb-6'>
                                        Gross Pay
                                    </Modal.Title>

                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Others"
                                            margin="mb-7"
                                            formikField="grossPayOthers" />
                                    </div>

                                    <Modal.Title className='mb-6'>Deductions</Modal.Title>

                                    <div className="row">
                                        {/* <div className="col-lg-6 mb-7" >
                                            <TextInput
                                                isRequired={true}
                                                label="Advanced Loan"
                                                margin="mb-7"
                                                formikField="advancedLoan" />
                                        </div> */}
                                        {/* 
                                        <div className="col-lg-6 mb-7" >
                                            <TextInput
                                                isRequired={true}
                                                label="Food Expenses"
                                                margin="mb-7"
                                                formikField="foodExpenses" />
                                        </div>

                                        <div className="col-lg-6 mb-sm-7 mb-md-7 mb-7">
                                            <TextInput
                                                isRequired={true}
                                                label="Retention"
                                                margin="mb-7"
                                                formikField="retention" />
                                        </div> */}

                                        <div className="col-lg-12 mb-sm-0 mb-md-0 mb-7">
                                            <TextInput
                                                isRequired={true}
                                                label="Others"
                                                margin="mb-7"
                                                formikField="deductionsOthers" />
                                        </div>
                                    </div>

                                    <div className='d-flex justify-content-end'>
                                        <button type='submit' className='btn wt-btn-primary' disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >

            <Modal show={grossDistributionShow} onHide={handleGrossDistributionClose} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Modify Gross Distribution</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {grossDistributionLoading && (
                        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}

                    {!grossDistributionLoading && (Object.keys(grossDistributionData).length > 0 || dynamicFields.length > 0) && (
                        <Formik
                            initialValues={getDynamicInitialValues()}
                            onSubmit={handleGrossDistributionSubmit}
                            validationSchema={getDynamicValidationSchema()}
                            enableReinitialize={false}
                        >
                            {(formikProps) => {
                                console.log("grossDistributionDatagrossDistributionData:: ", grossDistributionData);

                                // Combine existing and new fields for display
                                const existingFields = Object.entries(grossDistributionData)
                                    .filter(([key]) => !deletedFields.includes(key) && key !== '_fieldOrder' && key !== 'Basic Salary')
                                    // .filter(([key]) => key !== 'Basic Salary')
                                    .map(([key, value]: [string, any]) => ({
                                        id: key,
                                        ...value,
                                        isNew: false
                                    }));

                                const allFields = [...existingFields, ...dynamicFields];

                                return (
                                    <Form className='d-flex flex-column' noValidate>
                                        {/* Add New Field Button */}
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <h6 className="mb-0">Gross Distribution Fields</h6>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary btn-outline-primary"
                                                onClick={addNewField}
                                            >
                                                <KTIcon iconName="cross" className="fs-6 me-1 text-white" />
                                                Add New Field
                                            </button>
                                        </div>

                                        {/* Dynamic Fields */}
                                        <div className="row">
                                            {allFields.map((field) => (
                                                <div key={field.id} className="col-lg-6 mb-4">
                                                    <div className="d-flex align-items-start gap-2">
                                                        <div className="flex-grow-1">
                                                            {/* Field Name Input for new fields */}
                                                            {field.isNew && (
                                                                <div className="mb-2">
                                                                    <label className="form-label">Field Name</label>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={field.name}
                                                                        onChange={(e) => updateFieldName(field.id, e.target.value, field.isNew)}
                                                                        placeholder="Enter field name"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Value Input */}
                                                            <TextInput
                                                                isRequired={true}
                                                                label={field.isNew ? "Value" : (field.name || field.id)}
                                                                formikField={field.id}
                                                                type="number"
                                                            />

                                                            {!field.isNew && (
                                                                <small className="text-muted">
                                                                    Original: {field.value}
                                                                </small>
                                                            )}
                                                        </div>
                                                        <IconButton
                                                            onClick={() => removeField(field.id, field.isNew)}
                                                            sx={{ color: '#C74E52' }}
                                                            title="Remove field"
                                                        >
                                                            <Close />
                                                        </IconButton>
                                                        {/* Remove Button */}
                                                        {/* <button
                                                            type="button"
                                                            className="btn btn-sm mt-4"
                                                            onClick={() => removeField(field.id, field.isNew)}
                                                            title="Remove field"
                                                        >
                                                            <KTIcon iconName="close" className="fs-6 text-primary" />
                                                        </button> */}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Show message when no fields */}
                                        {allFields.length === 0 && (
                                            <div className="text-center py-4">
                                                <p className="text-muted">No fields available. Click "Add New Field" to add a field.</p>
                                            </div>
                                        )}

                                        {/* Form Actions */}
                                        <div className='d-flex justify-content-end mt-4'>
                                            {/* <button
                                                type='button'
                                                className='btn btn-primary me-2'
                                                onClick={handleGrossDistributionClose}
                                            >
                                                Cancel
                                            </button> */}
                                            <button
                                                type='submit'
                                                className='btn wt-btn-primary'
                                                disabled={grossDistributionLoading || !formikProps.isValid || allFields.length === 0}
                                            >
                                                {!grossDistributionLoading && 'Save Changes'}
                                                {grossDistributionLoading && (
                                                    <span className='indicator-progress' style={{ display: 'block' }}>
                                                        Please wait...{' '}
                                                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </Form>
                                );
                            }}
                        </Formik>
                    )}
                </Modal.Body>
            </Modal>

            <SalaryIncrementModal
                show={salaryIncrementShow}
                onHide={handleSalaryIncrementClose}
                employee={employee}
                onSuccess={handleSalaryIncrementSuccess}
                fromAdmin={fromAdmin}
            />

            <DeductionDistributionModal
                show={deductionDistributionShow}
                onClose={handleDeductionDistributionClose}
                employeeId={employee.id}
                month={month}
                year={year}
                onSuccess={handleDeductionDistributionSuccess}
                monthlyApiData={monthlyApiData}
            />
        </>
    );
}

export default SalaryReport;