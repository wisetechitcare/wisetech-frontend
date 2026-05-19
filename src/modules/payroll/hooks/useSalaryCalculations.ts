import { useMemo } from 'react';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import { Employee } from '@redux/slices/employee';
import { PayrollTableRow } from '../types/payroll.types';
import { sumBreakdownEarnings, parseCurrencyString, formatINR2 } from '../utils/payrollFormatters';
import { PAYMENT_STATUS } from '../constants/payroll.constants';
import dayjs from 'dayjs';

export const useSalaryCalculations = (
    monthlyApiData: IMonthlyApiResponse | null | undefined,
    employee: Employee,
    isApiDataLoaded: boolean,
    totalGrossPayEarned: number,
    targetMonth?: string | number,
    targetYear?: string | number
) => {
    const apiSalaryData = useMemo(() => {
        const data = monthlyApiData?.salaryData;
        if (!data || data.length === 0) return null;
        
        // If only one record exists, it's almost certainly the one we want
        if (data.length === 1) return data[0];

        // Otherwise, try to match by month and year
        if (targetMonth && targetYear) {
            const tMonth = parseInt(targetMonth.toString(), 10);
            const tYear = parseInt(targetYear.toString(), 10);

            return data.find(s => {
                const sMonth = parseInt(s.month.toString(), 10);
                const sYear = parseInt(s.year.toString(), 10);
                return sMonth === tMonth && sYear === tYear;
            }) || data[0]; // Fallback to first if no match
        }
        
        return data[0];
    }, [monthlyApiData, targetMonth, targetYear]);

    const apiTotalGrossPayAmount = useMemo(() => 
        Number(apiSalaryData?.totalGrossPayAmountInNumber ?? parseCurrencyString(apiSalaryData?.totalGrossPayAmount)), 
    [apiSalaryData]);

    const summaryData = useMemo(() => {
        const salaryData = apiSalaryData ? [apiSalaryData] : (monthlyApiData?.salaryData || []);
        let totalGrossPay = 0;
        let totalVariableDeduction = 0;
        let totalFixedDeduction = 0;
        let totalDeduction = 0;
        let netSalary = 0;
        let salaryPaid = 0;
        let governmentPaid = 0;

        salaryData.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const net = Number(item.netAmountInNumber ?? parseCurrencyString(item.netAmount ?? item.netSalaryAmount));
            const amountPaid = Number(item.amountPaidInNumber ?? parseCurrencyString(item.amountPaid || '0'));
            const govPaid = Number(item.governmentPaidInNumber ?? parseCurrencyString(item.governmentPaid || '0'));

            totalGrossPay += gross;
            totalVariableDeduction += variable;
            totalFixedDeduction += fixed;
            totalDeduction += (variable + fixed);
            netSalary += net;
            salaryPaid += amountPaid;
            governmentPaid += govPaid;
        });

        const fixedSum = sumBreakdownEarnings(apiSalaryData?.deductionBreakdown?.fixed);

        return {
            totalGrossPay: Number(totalGrossPay.toFixed(2)),
            totalVariableDeduction: Number(totalVariableDeduction.toFixed(2)),
            totalFixedDeduction: Number(totalFixedDeduction.toFixed(2)),
            totalDeduction: Number(totalDeduction.toFixed(2)),
            netSalary: Number(netSalary.toFixed(2)),
            salaryPaid: Number(salaryPaid.toFixed(2)),
            salaryPending: Math.max(0, netSalary - salaryPaid),
            governmentPaid: Number(governmentPaid.toFixed(2)),
            governmentPending: Math.max(0, fixedSum - governmentPaid),
            totalCompanyPayout: Number((salaryPaid + governmentPaid).toFixed(2)),
            activeGovType: (apiSalaryData?.deductionBreakdown?.fixed) 
                ? Object.keys(apiSalaryData.deductionBreakdown.fixed)[0] || 'TDS'
                : 'TDS'
        };
    }, [monthlyApiData, apiSalaryData, targetMonth, targetYear]);

    const tableRows: any[] = useMemo(() => {
        const rows: any[] = [];
        const dataToProcess = apiSalaryData ? [apiSalaryData] : (monthlyApiData?.salaryData || []);
        
        dataToProcess.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const net = Number(item.netAmountInNumber ?? parseCurrencyString(item.netAmount ?? item.netSalaryAmount));
            const history = [...(item.salaryPayments || []), ...(item.govtPayments || []), ...(item.paymentHistory || [])];
            
            // Remove duplicates from history if any (by id or properties)
            const uniqueHistory = Array.from(new Map(history.map(p => [p.id || `${p.amount}-${p.paymentDate}-${p.type}`, p])).values());

            const amountPaid = Number(item.amountPaidInNumber ?? parseCurrencyString(item.amountPaid || '0'));
            const govPaid = Number(item.governmentPaidInNumber ?? parseCurrencyString(item.governmentPaid || '0'));

            // 1. Add Paid Rows from History (or synthesize from master if legacy)
            if (history.length === 0 && (amountPaid > 0 || govPaid > 0)) {
                if (amountPaid > 0) {
                    rows.push({
                        ...item,
                        id: `${item.id}-legacy-salary`,
                        calculatedGrossPay: gross,
                        calculatedVariableDeduction: variable,
                        calculatedFixedDeduction: fixed,
                        calculatedNetSalary: net,
                        calculatedStatus: 'Paid',
                        calculatedPaidAmount: amountPaid,
                        paymentType: 'SALARY',
                        paymentMethod: 'BANK_TRANSFER',
                        transactionId: 'LEGACY_RECORD',
                        remarks: 'Historical Payment Record',
                        displayDate: item.paidAt || item.monthEndDate,
                        item: item
                    });
                }
                if (govPaid > 0) {
                    rows.push({
                        ...item,
                        id: `${item.id}-legacy-gov`,
                        calculatedGrossPay: gross,
                        calculatedVariableDeduction: variable,
                        calculatedFixedDeduction: fixed,
                        calculatedNetSalary: fixed,
                        calculatedStatus: 'Paid',
                        calculatedPaidAmount: govPaid,
                        paymentType: 'GOVERNMENT',
                        paymentMethod: 'BANK_TRANSFER',
                        transactionId: 'LEGACY_RECORD',
                        remarks: 'Historical Statutory Payment',
                        displayDate: item.paidAt || item.monthEndDate,
                        item: item
                    });
                }
            } else {
                uniqueHistory.forEach((p: any) => {
                    const isGov = p.type === 'GOVERNMENT';
                    rows.push({
                        ...item,
                        id: p.id || `${item.id}-${p.type}-${p.paymentDate}`,
                        calculatedGrossPay: gross,
                        calculatedVariableDeduction: variable,
                        calculatedFixedDeduction: fixed,
                        calculatedNetSalary: isGov ? fixed : net,
                        calculatedStatus: 'Paid',
                        calculatedPaidAmount: p.amount,
                        paymentType: p.type,
                        paymentMethod: p.paymentMethod,
                        transactionId: p.transactionId,
                        remarks: p.remarks,
                        displayDate: p.paymentDate,
                        item: item
                    });
                });
            }

            // 2. Add Pending Balance Rows if applicable
            const salaryPending = Math.max(0, net - amountPaid);
            if (salaryPending >= 1.0) {
                rows.push({
                    ...item,
                    id: `${item.id}-pending-salary`,
                    calculatedGrossPay: gross,
                    calculatedVariableDeduction: variable,
                    calculatedFixedDeduction: fixed,
                    calculatedNetSalary: salaryPending, // Show only the pending amount
                    calculatedStatus: 'Pending',
                    calculatedPaidAmount: 0,
                    paymentType: 'SALARY',
                    paymentMethod: '--',
                    displayDate: item.monthEndDate || dayjs().format('YYYY-MM-DD'),
                    item: item,
                    remarks: 'Remaining Balance'
                });
            }

            const govPending = Math.max(0, fixed - govPaid);
            if (govPending >= 1.0) {
                rows.push({
                    ...item,
                    id: `${item.id}-pending-gov`,
                    calculatedGrossPay: gross,
                    calculatedVariableDeduction: variable,
                    calculatedFixedDeduction: fixed,
                    calculatedNetSalary: govPending, // Show only the pending amount
                    calculatedStatus: 'Pending',
                    calculatedPaidAmount: 0,
                    paymentType: 'GOVERNMENT',
                    paymentMethod: '--',
                    displayDate: item.monthEndDate || dayjs().format('YYYY-MM-DD'),
                    item: item,
                    remarks: 'Statutory Dues Pending'
                });
            }
        });

        return rows;
    }, [monthlyApiData, apiSalaryData]);

    return {
        summaryData,
        tableRows,
        apiSalaryData,
        finalTotalGrossPayAmount: summaryData.totalGrossPay
    };
};
