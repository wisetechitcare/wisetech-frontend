import { useMemo } from 'react';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import { Employee } from '@redux/slices/employee';
import { PayrollTableRow } from '../types/payroll.types';
import { sumBreakdownEarnings, parseCurrencyString, formatINR2 } from '../utils/payrollFormatters';
import { PAYMENT_STATUS } from '../constants/payroll.constants';
import dayjs from 'dayjs';

const getProfessionalFeesAmount = (fixedBreakdown: Record<string, any> | undefined) => {
    const entry = Object.entries(fixedBreakdown || {}).find(([key, item]: [string, any]) => {
        return key.toLowerCase().includes('professional') && !key.toLowerCase().includes('fund') && !key.toLowerCase().includes('tax') && item?.isActive !== false;
    });

    if (!entry) return 0;
    const item: any = entry[1];
    return Number(item?.earned ?? item?.value ?? item ?? 0);
};

const isProfessionalFeesPayment = (payment: any) => {
    const typeStr = String(payment?.type || payment?.paymentType || '').toUpperCase();
    const isGovType = payment?.deductionType || typeStr === 'GOVERNMENT';
    const deductionType = String(payment?.deductionType || payment?.remarks || '').toLowerCase();
    return !!isGovType && deductionType.includes('professional fees');
};

const getPaymentAmount = (payment: any) => {
    const rawAmount = payment?.amount ?? payment?.amountPaid ?? payment?.paidAmount ?? 0;
    const amount = typeof rawAmount === 'number' ? rawAmount : parseCurrencyString(String(rawAmount));
    return Number.isFinite(amount) ? amount : 0;
};

const getPaymentType = (payment: any) => {
    if (payment?.deductionType) {
        return 'GOVERNMENT';
    }
    return String(payment?.type || payment?.paymentType || 'SALARY').toUpperCase();
};

const getPaymentTimestamp = (payment: any) => {
    const ts = payment?.paymentDate || payment?.paidAt || payment?.createdAt || payment?.date || null;
    const parsed = ts ? new Date(ts).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
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
            // Only active deductions should impact totals; some breakdowns keep
            // rows with isActive=false and non-zero earned values.
            const variable = Object.values(item.deductionBreakdown?.variable || {}).reduce((acc: number, v: any) => {
                return v?.isActive === false ? acc : acc + Number(v?.earned || 0);
            }, 0);
            const fixed = Object.values(item.deductionBreakdown?.fixed || {}).reduce((acc: number, v: any) => {
                return v?.isActive === false ? acc : acc + Number(v?.earned || 0);
            }, 0);
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
            governmentPaid += govPaid; // Always include government payment
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
            salaryPending: netSalary - salaryPaid,
            governmentPaid: Number(governmentPaid.toFixed(2)),
            governmentPending: hasProfessionalFees ? (totalProfessionalFees - governmentPaid) : 0,
            totalCompanyPayout: Number((salaryPaid + governmentPaid).toFixed(2)),
            activeGovType: hasProfessionalFees ? 'Professional Fees' : ''
        };
    }, [monthlyApiData, apiSalaryData, targetMonth, targetYear]);

    const tableRows: any[] = useMemo(() => {
        const rows: any[] = [];
        const dataToProcess = apiSalaryData ? [apiSalaryData] : (monthlyApiData?.salaryData || []);
        
        dataToProcess.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            const variable = Object.values(item.deductionBreakdown?.variable || {}).reduce((acc: number, v: any) => {
                return v?.isActive === false ? acc : acc + Number(v?.earned || 0);
            }, 0);
            const fixed = Object.values(item.deductionBreakdown?.fixed || {}).reduce((acc: number, v: any) => {
                return v?.isActive === false ? acc : acc + Number(v?.earned || 0);
            }, 0);
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
            const salaryRemainingStart = net;
            const governmentRemainingStart = professionalFees;

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
                        calculatedRemainingAmount: net - amountPaid,
                        calculatedStatus: amountPaid >= net ? 'Full Paid' : 'Partially Paid',
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
                        calculatedFixedDeduction: professionalFees,
                        calculatedNetSalary: professionalFees,
                        calculatedRemainingAmount: professionalFees - govPaid,
                        calculatedStatus: govPaid >= professionalFees ? 'Full Paid' : 'Partially Paid',
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
            // Process each payment history entry in chronological order so the
            // remaining balance reflects earlier partial payments.
            const orderedHistory = [...uniqueHistory].sort((a: any, b: any) => {
                const diff = getPaymentTimestamp(a) - getPaymentTimestamp(b);
                if (diff !== 0) return diff;
                return getPaymentAmount(a) - getPaymentAmount(b);
            });

            let runningSalaryRemaining = salaryRemainingStart;
            let runningGovernmentRemaining = governmentRemainingStart;

            orderedHistory.forEach((p: any) => {
                const paymentType = getPaymentType(p);
                const isGov = paymentType === 'GOVERNMENT';
                const paymentAmount = getPaymentAmount(p);
                const currentNetPayable = isGov ? runningGovernmentRemaining : runningSalaryRemaining;
                // Determine values for row fields based on payment type
                const calculatedGrossPay = isGov ? paymentAmount : gross;
                const calculatedVariableDeduction = isGov ? 0 : variable;
                const calculatedFixedDeduction = isGov ? professionalFees : fixed;
                const calculatedNetSalary = currentNetPayable;
                const calculatedRemainingAmount = currentNetPayable - paymentAmount;
                const calculatedStatus = paymentAmount >= currentNetPayable ? 'Full Paid' : 'Partially Paid';
                rows.push({
                    ...item,
                    id: p.id || `${item.id}-${paymentType}-${p.paymentDate}`,
                    calculatedGrossPay,
                    calculatedVariableDeduction,
                    calculatedFixedDeduction,
                    calculatedNetSalary,
                    calculatedRemainingAmount,
                    calculatedStatus,
                    calculatedPaidAmount: paymentAmount,
                    paymentType,
                    paymentMethod: p.paymentMethod,
                    transactionId: p.transactionId,
                    remarks: p.remarks,
                    displayDate: p.paymentDate,
                    item: item
                });
                if (isGov) {
                    runningGovernmentRemaining = runningGovernmentRemaining - paymentAmount;
                } else {
                    runningSalaryRemaining = runningSalaryRemaining - paymentAmount;
                }
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
