import { useMemo } from 'react';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import { Employee } from '@redux/slices/employee';
import { PayrollTableRow } from '../types/payroll.types';
import { sumBreakdownEarnings, parseCurrencyString, formatINR2 } from '../utils/payrollFormatters';
import { PAYMENT_STATUS } from '../constants/payroll.constants';
import dayjs from 'dayjs';

const getProfessionalFeesAmount = (fixedBreakdown: Record<string, any> | undefined) => {
    const entry = Object.entries(fixedBreakdown || {}).find(([key, item]: [string, any]) => {
        const amount = Number(item?.earned ?? item?.value ?? item ?? 0);
        return key.toLowerCase().includes('professional fees') && item?.isActive !== false && amount > 0;
    });

    if (!entry) return 0;
    const item: any = entry[1];
    return Number(item?.earned ?? item?.value ?? item ?? 0);
};

const isProfessionalFeesPayment = (payment: any) => {
    const type = String(payment?.type || payment?.paymentType || '').toUpperCase();
    const deductionType = String(payment?.deductionType || payment?.remarks || '').toLowerCase();
    return type === 'GOVERNMENT' && deductionType.includes('professional fees');
};

const getPaymentAmount = (payment: any) => {
    const rawAmount = payment?.amount ?? payment?.amountPaid ?? payment?.paidAmount ?? 0;
    const amount = typeof rawAmount === 'number' ? rawAmount : parseCurrencyString(String(rawAmount));
    return Number.isFinite(amount) ? amount : 0;
};

const getPaymentType = (payment: any) => {
    return String(payment?.type || payment?.paymentType || 'SALARY').toUpperCase();
};

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
        let totalProfessionalFees = 0;

        salaryData.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const professionalFees = getProfessionalFeesAmount(item.deductionBreakdown?.fixed);
            const net = Number(item.netAmountInNumber ?? parseCurrencyString(item.netAmount ?? item.netSalaryAmount));
            const history = [...(item.salaryPayments || []), ...(item.govtPayments || []), ...(item.paymentHistory || [])];
            const uniqueHistory = Array.from(new Map(history.map((p: any) => [p.id || `${getPaymentAmount(p)}-${p.paymentDate}-${getPaymentType(p)}`, p])).values());
            const salaryPaidFromHistory = uniqueHistory.reduce((total: number, payment: any) => {
                return getPaymentType(payment) === 'GOVERNMENT' ? total : total + getPaymentAmount(payment);
            }, 0);
            const amountPaidFromRecord = Number(item.amountPaidInNumber ?? parseCurrencyString(item.amountPaid || '0'));
            const amountPaid = amountPaidFromRecord > 0 ? amountPaidFromRecord : salaryPaidFromHistory;
            const govPaid = Number(item.governmentPaidInNumber ?? parseCurrencyString(item.governmentPaid || '0'));

            totalGrossPay += gross;
            totalVariableDeduction += variable;
            totalFixedDeduction += fixed;
            totalDeduction += (variable + fixed);
            netSalary += net;
            salaryPaid += amountPaid;
            totalProfessionalFees += professionalFees;
            governmentPaid += professionalFees > 0 ? govPaid : 0;
        });

        const professionalFeesSum = getProfessionalFeesAmount(apiSalaryData?.deductionBreakdown?.fixed);
        const hasProfessionalFees = professionalFeesSum > 0 || totalProfessionalFees > 0;

        return {
            totalGrossPay: Number(totalGrossPay.toFixed(2)),
            totalVariableDeduction: Number(totalVariableDeduction.toFixed(2)),
            totalFixedDeduction: hasProfessionalFees ? Number(totalProfessionalFees.toFixed(2)) : 0,
            totalDeduction: Number(totalDeduction.toFixed(2)),
            netSalary: Number(netSalary.toFixed(2)),
            salaryPaid: Number(salaryPaid.toFixed(2)),
            salaryPending: Math.max(0, netSalary - salaryPaid),
            governmentPaid: Number(governmentPaid.toFixed(2)),
            governmentPending: hasProfessionalFees ? Math.max(0, totalProfessionalFees - governmentPaid) : 0,
            totalCompanyPayout: Number((salaryPaid + governmentPaid).toFixed(2)),
            activeGovType: hasProfessionalFees ? 'Professional Fees' : ''
        };
    }, [monthlyApiData, apiSalaryData, targetMonth, targetYear]);

    const tableRows: any[] = useMemo(() => {
        const rows: any[] = [];
        const dataToProcess = apiSalaryData ? [apiSalaryData] : (monthlyApiData?.salaryData || []);
        
        dataToProcess.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            const variable = sumBreakdownEarnings(item.deductionBreakdown?.variable);
            const fixed = sumBreakdownEarnings(item.deductionBreakdown?.fixed);
            const professionalFees = getProfessionalFeesAmount(item.deductionBreakdown?.fixed);
            const hasProfessionalFees = professionalFees > 0;
            const net = Number(item.netAmountInNumber ?? parseCurrencyString(item.netAmount ?? item.netSalaryAmount));
            const history = [...(item.salaryPayments || []), ...(item.govtPayments || []), ...(item.paymentHistory || [])];
            
            // Remove duplicates from history if any (by id or properties)
            const uniqueHistory = Array.from(new Map(history.map((p: any) => [p.id || `${getPaymentAmount(p)}-${p.paymentDate}-${getPaymentType(p)}`, p])).values());

            const salaryPaidFromHistory = uniqueHistory.reduce((total: number, payment: any) => {
                return getPaymentType(payment) === 'GOVERNMENT' ? total : total + getPaymentAmount(payment);
            }, 0);
            const amountPaidFromRecord = Number(item.amountPaidInNumber ?? parseCurrencyString(item.amountPaid || '0'));
            const amountPaid = amountPaidFromRecord > 0 ? amountPaidFromRecord : salaryPaidFromHistory;
            const govPaid = hasProfessionalFees ? Number(item.governmentPaidInNumber ?? parseCurrencyString(item.governmentPaid || '0')) : 0;

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
                if (hasProfessionalFees && govPaid > 0) {
                    rows.push({
                        ...item,
                        id: `${item.id}-legacy-gov`,
                        calculatedGrossPay: gross,
                        calculatedVariableDeduction: variable,
                        calculatedFixedDeduction: professionalFees,
                        calculatedNetSalary: professionalFees,
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
                    const paymentType = getPaymentType(p);
                    const isGov = paymentType === 'GOVERNMENT';
                    if (isGov && !isProfessionalFeesPayment(p)) {
                        return;
                    }
                    rows.push({
                        ...item,
                        id: p.id || `${item.id}-${paymentType}-${p.paymentDate}`,
                        calculatedGrossPay: gross,
                        calculatedVariableDeduction: variable,
                        calculatedFixedDeduction: isGov ? professionalFees : fixed,
                        calculatedNetSalary: isGov ? professionalFees : net,
                        calculatedStatus: 'Paid',
                        calculatedPaidAmount: getPaymentAmount(p),
                        paymentType,
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

            const govPending = Math.max(0, professionalFees - govPaid);
            if (hasProfessionalFees && govPending >= 1.0) {
                rows.push({
                    ...item,
                    id: `${item.id}-pending-gov`,
                    calculatedGrossPay: gross,
                    calculatedVariableDeduction: variable,
                    calculatedFixedDeduction: professionalFees,
                    calculatedNetSalary: govPending, // Show only the pending amount
                    calculatedStatus: 'Pending',
                    calculatedPaidAmount: 0,
                    paymentType: 'GOVERNMENT',
                    paymentMethod: '--',
                    displayDate: item.monthEndDate || dayjs().format('YYYY-MM-DD'),
                    item: item,
                    remarks: 'Professional Fees Pending'
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
