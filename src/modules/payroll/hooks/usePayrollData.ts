import { safeJsonParse } from '@utils/safeJson';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { RootState } from '@redux/store';
import { PayrollService } from '../services/payroll.service';
import { CONFIG_KEYS } from '../constants/payroll.constants';
import { getEffectiveEndDate } from '../utils/payrollCalculations';
import { 
    getTotalWeekendDaysInMonth, 
    getTotalWeekendDaysInMonthFilteredByDOJOrCurrentMonthDate,
    getTotalWeekendsInYear,
    getTotalWeekendsInYearFilteredByDOJOrCurrentYearDate,
    getTotalDaysInMonth,
    getTotalDaysInYear
} from '@utils/statistics';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { 
    getAllUnPaidLeavesForCurrentYear, 
    getAllUnPaidLeavesCurrentMonth, 
    getAllPaidLeavesCurrentMonth, 
    getAllPaidLeaveOfYearFilteredByStartAndEndDate 
} from '@utils/sandwhichConfiguration';
import { saveToggleChange } from '@redux/slices/attendanceStats';

export const usePayrollData = (
    employee: any,
    year: string,
    month: string,
    isYearly: boolean,
    fromAdmin: boolean
) => {
    const dispatch = useDispatch();
    const toggleChange = useSelector((state: RootState) => state.attendanceStats.toggleChange);
    const [isLoading, setIsLoading] = useState(false);
    
    // State for configurations
    const [allowances, setAllowances] = useState<any>({});
    const [deductionsRule, setDeductionsRule] = useState<any>({});
    const [multiLateCheckinDeductionPercent, setMultiLateCheckinDeductionPercent] = useState(0);
    const [multipleLateCheckinCountLimit, setMultipleLateCheckinCountLimit] = useState(0);
    const [sandwhichConfiguration, setSandwhichConfiguration] = useState<any>({});
    const [leaveConfigurations, setLeaveConfigurations] = useState<any>({});
    
    // State for stats
    const [payments, setPayments] = useState<any[]>([]);
    const [grossPayDeductions, setGrossPayDeductions] = useState<any[]>([]);
    const [leaveEncashments, setLeaveEncashments] = useState<any[]>([]);
    const [totalEncashmentAmount, setTotalEncashmentAmount] = useState(0);
    const [totalUnpaidLeaves, setTotalUnpaidLeaves] = useState(0);
    const [paidLeaves, setPaidLeaves] = useState(0);
    
    // Date states
    const [fiscalStartDate, setFiscalStartDate] = useState('');
    const [fiscalEndDate, setFiscalEndDate] = useState('');
    const [startDateOfMonthOrYear, setStartDateOfMonthOrYear] = useState("");
    
    const employeeId = employee?.id;
    const dateOfJoining = employee?.dateOfJoining;

    const fetchConfigurations = useCallback(async () => {
        try {
            const monthStart = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const monthEnd = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

            const [customRes, grossRes, deductRes, sandwichRes, leaveRes] = await Promise.all([
                PayrollService.fetchGlobalConfig(CONFIG_KEYS.CUSTOM_SALARY, monthStart, monthEnd),
                PayrollService.fetchGlobalConfig(CONFIG_KEYS.GROSS_PAY, monthStart, monthEnd),
                PayrollService.fetchGlobalConfig(CONFIG_KEYS.DEDUCTIONS, monthStart, monthEnd),
                PayrollService.fetchGlobalConfig(CONFIG_KEYS.SANDWICH_LEAVE_KEY, monthStart, monthEnd),
                PayrollService.fetchGlobalConfig(CONFIG_KEYS.LEAVE_MANAGEMENT, monthStart, monthEnd)
            ]);

            setAllowances(safeJsonParse(grossRes.data.configuration.configuration));
            setDeductionsRule(safeJsonParse(deductRes.data.configuration.configuration));
            
            const customJson = safeJsonParse(customRes.data.configuration.configuration);
            setMultiLateCheckinDeductionPercent(Number(customJson["Late Checkin"]?.deduction_amount) || 0);
            setMultipleLateCheckinCountLimit(Number(customJson["Late Checkin"]?.period) || 0);

            setSandwhichConfiguration(safeJsonParse(sandwichRes.data.configuration.configuration));
            setLeaveConfigurations(safeJsonParse(leaveRes.data.configuration.configuration));
        } catch (error) {
            console.error("Error fetching configurations:", error);
        }
    }, [year, month]);

    const fetchLeavesAndReimbursements = useCallback(async () => {
        if (!year || !month || !employeeId || !startDateOfMonthOrYear || !fiscalEndDate) return;

        try {
            setIsLoading(true);
            const baseDate = dayjs(`${year}-${month}-01`);
            
            // Pass null (not the sandwich config) so these COUNT the stored leave rows directly and
            // do NOT re-apply the legacy sandwich scenario logic. Sandwich days are now decided
            // once, on the backend (rule-driven booking, SANDWICH_RULES.md §13 / v7.0), and already
            // persisted as the correct paid/unpaid LeaveTracker rows — re-classifying them here was
            // the D-7 divergence between the payslip display and actual payroll.
            const unpaidLeavesPromise = isYearly
                ? getAllUnPaidLeavesForCurrentYear(baseDate, null as any, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllUnPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), null as any, fromAdmin, [employee]);

            const paidLeavesPromise = isYearly
                ? getAllPaidLeaveOfYearFilteredByStartAndEndDate(baseDate, null as any, fromAdmin, [employee], dayjs(startDateOfMonthOrYear))
                : getAllPaidLeavesCurrentMonth(baseDate, dayjs(startDateOfMonthOrYear), null as any, fromAdmin, [employee]);

            const [unpaid, paid] = await Promise.all([unpaidLeavesPromise, paidLeavesPromise]);

            setTotalUnpaidLeaves(Number(unpaid) || 0);
            setPaidLeaves(Number(paid) || 0);
        } catch (error) {
            console.error("Leaves fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [year, month, employeeId, startDateOfMonthOrYear, fiscalEndDate, isYearly, sandwhichConfiguration, fromAdmin, employee]);

    const fetchPayments = useCallback(async () => {
        if (!employeeId) return;
        try {
            const { data: { salaries } } = await PayrollService.fetchPayments(employeeId, month, year);
            setPayments(salaries);
        } catch (error) {
            console.error("Error fetching payments:", error);
        }
    }, [employeeId, month, year]);

    useEffect(() => {
        fetchConfigurations();
        fetchPayments();
    }, [fetchConfigurations, fetchPayments, toggleChange]);

    useEffect(() => {
        if (!year) return;
        generateFiscalYearFromGivenYear(dayjs(year)).then(res => {
            setFiscalStartDate(res?.startDate);
            setFiscalEndDate(res?.endDate);
        });
    }, [year]);

    useEffect(() => {
        if (!dateOfJoining || !month || !year) return;
        const monthStartDate = `${year}-${month}-01`;
        let start = isYearly ? dayjs(fiscalStartDate) : dayjs(monthStartDate).startOf('month');
        
        if (dayjs(dateOfJoining).isAfter(start)) {
            setStartDateOfMonthOrYear(dayjs(dateOfJoining).format('YYYY-MM-DD'));
        } else {
            setStartDateOfMonthOrYear(start.format('YYYY-MM-DD'));
        }
    }, [isYearly, dateOfJoining, year, month, fiscalStartDate]);

    useEffect(() => {
        fetchLeavesAndReimbursements();
    }, [fetchLeavesAndReimbursements]);

    return {
        isLoading,
        allowances,
        deductionsRule,
        multiLateCheckinDeductionPercent,
        multipleLateCheckinCountLimit,
        payments,
        grossPayDeductions,
        leaveEncashments,
        totalEncashmentAmount,
        totalUnpaidLeaves,
        paidLeaves,
        fiscalStartDate,
        fiscalEndDate,
        startDateOfMonthOrYear,
        refreshPayments: fetchPayments
    };
};
