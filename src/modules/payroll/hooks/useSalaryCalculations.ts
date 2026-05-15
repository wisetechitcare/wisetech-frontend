import { useMemo } from 'react';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import { Employee } from '@redux/slices/employee';
import { sumBreakdownEarnings, parseCurrencyString, formatINR2 } from '../utils/payrollFormatters';
import { PAYMENT_STATUS } from '../constants/payroll.constants';
import dayjs from 'dayjs';

export const useSalaryCalculations = (
    monthlyApiData: IMonthlyApiResponse | null | undefined,
    employee: Employee,
    isApiDataLoaded: boolean,
    totalGrossPayEarned: number,
) => {
    const apiSalaryData = monthlyApiData?.salaryData?.[0] || null;

    const apiTotalGrossPayAmount = useMemo(() => 
        parseCurrencyString(apiSalaryData?.totalGrossPayAmount), 
    [apiSalaryData]);

    const apiTotalDeductionsAmount = useMemo(() => 
        parseCurrencyString(apiSalaryData?.totalDeductedAmount), 
    [apiSalaryData]);

    const finalTotalGrossPayAmount = useMemo(() => {
        if (!isApiDataLoaded) return totalGrossPayEarned;
        return apiTotalGrossPayAmount;
    }, [isApiDataLoaded, apiTotalGrossPayAmount, totalGrossPayEarned]);

    const summaryData = useMemo(() => {
        const salaryData = monthlyApiData?.salaryData || [];
        let totalGrossPay = 0;
        let totalVariableDeduction = 0;
        let totalFixedDeduction = 0;
        let totalDeduction = 0;
        let totalPaid = 0;

        salaryData.forEach(item => {
            const salary = parseCurrencyString(item.totalGrossPayAmount);
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const paid = parseCurrencyString(item.paidAmount);

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
            const salary = parseCurrencyString(item.totalGrossPayAmount);
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const paid = parseCurrencyString(item.paidAmount);

            const grossPay = salary - variable;
            const totalDeduction = variable + fixed;
            const netSalary = grossPay - fixed;

            let status: 'Paid' | 'Partial' | 'No Payment' = PAYMENT_STATUS.NO_PAYMENT;
            if (paid >= netSalary && netSalary > 0) status = PAYMENT_STATUS.PAID;
            else if (paid > 0) status = PAYMENT_STATUS.PARTIAL;

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

    return {
        finalTotalGrossPayAmount,
        summaryData,
        tableRows,
        apiSalaryData,
        apiTotalGrossPayAmount,
        apiTotalDeductionsAmount
    };
};
