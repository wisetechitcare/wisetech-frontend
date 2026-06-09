import { useMemo } from 'react';
import { IMonthlyApiResponse } from '@redux/slices/salaryData';
import { Employee } from '@redux/slices/employee';
import { parseCurrencyString } from '../utils/payrollFormatters';

const getProfessionalFeesAmount = (fixedBreakdown: Record<string, any> | undefined) => {
    const entry = Object.entries(fixedBreakdown || {}).find(([key, item]: [string, any]) => {
        return key.toLowerCase().includes('professional') && !key.toLowerCase().includes('fund') && !key.toLowerCase().includes('tax') && Number(item?.earned ?? item?.value ?? 0) > 0;
    });

    if (!entry) return 0;
    const item: any = entry[1];
    return Number(item?.earned ?? item?.value ?? item ?? 0);
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

const getProfessionalTaxAmount = (fixedBreakdown: Record<string, any> | undefined) => {
    const entry = Object.entries(fixedBreakdown || {}).find(([key, item]: [string, any]) => {
        return key.toLowerCase().includes('professional tax') && item?.isActive !== false;
    });

    if (!entry) return 0;
    const item: any = entry[1];
    return Number(item?.earned ?? item?.value ?? item ?? 0);
};

// Build per-type government deduction amounts (includes inactive entries with earned > 0 from modify)
const buildGovTypeAmounts = (fixedBreakdown?: Record<string, any>): { profFees: number; profTax: number } => {
    let profFees = 0;
    let profTax = 0;
    Object.entries(fixedBreakdown || {}).forEach(([key, data]: [string, any]) => {
        const earned = Number(data?.earned ?? data?.value ?? 0);
        // For inactive entries (e.g. PTAX when TDS is active), fall back to extraAmount
        const effective = earned > 0 ? earned : (data?.isActive === false ? Math.max(0, Number(data?.extraAmount || 0)) : 0);
        if (effective <= 0) return;
        const k = key.toLowerCase();
        if (k.includes('professional') && !k.includes('fund') && !k.includes('tax')) {
            profFees = effective;
        } else if (k.includes('professional tax') || k.includes('ptax')) {
            profTax = effective;
        }
    });
    return { profFees, profTax };
};

export const useSalaryCalculations = (
    monthlyApiData: IMonthlyApiResponse | null | undefined,
    _employee: Employee,
    _isApiDataLoaded: boolean,
    _totalGrossPayEarned: number,
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
        let totalProfessionalTax = 0;

        salaryData.forEach(item => {
            const gross = Number(item.totalGrossPayAmountInNumber ?? parseCurrencyString(item.totalGrossPayAmount));
            // Only active deductions should impact totals; some breakdowns keep
            // rows with isActive=false and non-zero earned values.
            const variable = Object.values(item.deductionBreakdown?.variable || {}).reduce((acc: number, v: any) => {
                return v?.isActive === false ? acc : acc + Number(v?.earned || 0);
            }, 0);
            const fixed = Object.values(item.deductionBreakdown?.fixed || {}).reduce((acc: number, v: any) => {
                const earned = Number(v?.earned || 0);
                if (v?.isActive !== false) return acc + earned;
                // Inactive entry with extra amount (e.g. PTAX modified while TDS is active)
                if (earned > 0) return acc + earned;
                return acc + Math.max(0, Number(v?.extraAmount || 0));
            }, 0);
            const professionalFees = getProfessionalFeesAmount(item.deductionBreakdown?.fixed);
            const professionalTax = getProfessionalTaxAmount(item.deductionBreakdown?.fixed);
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
            totalProfessionalTax += professionalTax;
            governmentPaid += govPaid; // Always include government payment
        });

        const professionalFeesSum = getProfessionalFeesAmount(apiSalaryData?.deductionBreakdown?.fixed);
        const hasProfessionalFees = professionalFeesSum > 0 || totalProfessionalFees > 0;
        const professionalTaxSum = getProfessionalTaxAmount(apiSalaryData?.deductionBreakdown?.fixed);
        const hasProfessionalTax = professionalTaxSum > 0 || totalProfessionalTax > 0;

        return {
            totalGrossPay: Number(totalGrossPay.toFixed(2)),
            totalVariableDeduction: Number(totalVariableDeduction.toFixed(2)),
            totalFixedDeduction: Number(totalFixedDeduction.toFixed(2)),
            totalDeduction: Number(totalDeduction.toFixed(2)),
            netSalary: Number(netSalary.toFixed(2)),
            salaryPaid: Number(salaryPaid.toFixed(2)),
            salaryPending: netSalary - salaryPaid,
            governmentPaid: Number(governmentPaid.toFixed(2)),
            governmentPending: totalFixedDeduction - governmentPaid,
            totalCompanyPayout: Number((salaryPaid + governmentPaid).toFixed(2)),
            activeGovType: hasProfessionalFees ? 'Professional Fees' : '',
            hasTDS: hasProfessionalFees,
            hasPTax: hasProfessionalTax
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
                const earned = Number(v?.earned || 0);
                if (v?.isActive !== false) return acc + earned;
                if (earned > 0) return acc + earned;
                return acc + Math.max(0, Number(v?.extraAmount || 0));
            }, 0);
            const { profFees: profFeesAmt, profTax: profTaxAmt } = buildGovTypeAmounts(item.deductionBreakdown?.fixed);
            const hasGovDeductions = profFeesAmt > 0 || profTaxAmt > 0;
            const totalGovDeductions = profFeesAmt + profTaxAmt;
            const net = Number(item.netAmountInNumber ?? parseCurrencyString(item.netAmount ?? item.netSalaryAmount));
            const history = [...(item.salaryPayments || []), ...(item.govtPayments || []), ...(item.paymentHistory || [])];

            // Remove duplicates from history if any (by id or properties)
            const uniqueHistory = Array.from(new Map(history.map((p: any) => [p.id || `${getPaymentAmount(p)}-${getPaymentTimestamp(p)}-${getPaymentType(p)}`, p])).values());

            const salaryPaidFromHistory = uniqueHistory.reduce((total: number, payment: any) => {
                return getPaymentType(payment) === 'GOVERNMENT' ? total : total + getPaymentAmount(payment);
            }, 0);
            const amountPaidFromRecord = Number(item.amountPaidInNumber ?? parseCurrencyString(item.amountPaid || '0'));
            const amountPaid = amountPaidFromRecord > 0 ? amountPaidFromRecord : salaryPaidFromHistory;
            const govPaid = hasGovDeductions ? Number(item.governmentPaidInNumber ?? parseCurrencyString(item.governmentPaid || '0')) : 0;
            const salaryRemainingStart = net;

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
                        calculatedStatus: Math.round(amountPaid) >= Math.round(net) ? 'Full Paid' : 'Partially Paid',
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
                        calculatedNetSalary: totalGovDeductions,
                        calculatedRemainingAmount: totalGovDeductions - govPaid,
                        calculatedStatus: Math.round(govPaid) >= Math.round(totalGovDeductions) ? 'Full Paid' : 'Partially Paid',
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
            // Sort by payment date, then by paidAt/createdAt (server-set exact time) as tiebreaker.
            // If timestamps are still equal, keep the original DB/API insertion order (return 0).
            // Sorting by amount as a tiebreaker broke "Full Paid" rows when an extra payment
            // was added later on the same date (the larger extra payment would sort before the
            // smaller completing payment, inverting the running balance).
            const orderedHistory = [...uniqueHistory].sort((a: any, b: any) => {
                const diff = getPaymentTimestamp(a) - getPaymentTimestamp(b);
                if (diff !== 0) return diff;
                const aPrecise = (a?.paidAt || a?.createdAt) ? new Date(a.paidAt || a.createdAt).getTime() : 0;
                const bPrecise = (b?.paidAt || b?.createdAt) ? new Date(b.paidAt || b.createdAt).getTime() : 0;
                const preciseDiff = aPrecise - bPrecise;
                if (preciseDiff !== 0) return preciseDiff;
                return 0; // keep DB/API creation order when timestamps are equal
            });

            // Build a stable lookup map: deduction key → effective amount
            // Includes inactive entries with extra amounts (e.g. PTAX modified while TDS is active)
            const govTypeMap: Map<string, number> = new Map();
            Object.entries(item.deductionBreakdown?.fixed || {}).forEach(([key, data]: [string, any]) => {
                const earned = Number(data?.earned ?? data?.value ?? 0);
                const effective = earned > 0 ? earned : (data?.isActive === false ? Math.max(0, Number(data?.extraAmount || 0)) : 0);
                if (effective > 0) govTypeMap.set(key, effective);
            });

            // Match a payment's deductionType string to a key in govTypeMap
            const matchGovKey = (deductionType: string): string | null => {
                if (!deductionType) return null;
                const dt = deductionType.toLowerCase().trim();
                for (const key of govTypeMap.keys()) {
                    if (key.toLowerCase() === dt) return key;
                }
                const isTds = dt.includes('tds') || dt.includes('professional fees') || dt.includes('professional fee');
                const isPtax = dt.includes('professional tax') || dt.includes('ptax') || dt === 'pt' || dt.includes('prof. tax');
                for (const key of govTypeMap.keys()) {
                    const k = key.toLowerCase();
                    if (isTds && k.includes('professional') && !k.includes('fund') && !k.includes('tax')) return key;
                    if (isPtax && (k.includes('professional tax') || k.includes('ptax'))) return key;
                }
                return null;
            };

            // Stable cumulative tracking: net payable never changes when new rows are added
            const cumulativePaidByKey: Map<string, number> = new Map();
            let cumulativeSalaryPaid = 0;
            let runningGovernmentRemaining = fixed;

            orderedHistory.forEach((p: any) => {
                const paymentType = getPaymentType(p);
                const isGov = paymentType === 'GOVERNMENT';
                const paymentAmount = getPaymentAmount(p);

                let currentNetPayable: number;
                let matchedKey: string | null = null;

                if (isGov) {
                    // Try multiple field names for the stored deduction type
                    const govTypeHint = p.deductionType || p.govType || p.deductionCategory || '';
                    matchedKey = matchGovKey(String(govTypeHint));

                    // Amount-based fallback: if type string is missing/unrecognised,
                    // match by exact paid amount against each known deduction amount
                    if (!matchedKey) {
                        for (const [key, amt] of govTypeMap.entries()) {
                            if (Math.abs(amt - paymentAmount) < 1) {
                                matchedKey = key;
                                break;
                            }
                        }
                    }

                    currentNetPayable = matchedKey && govTypeMap.has(matchedKey)
                        ? govTypeMap.get(matchedKey)!
                        : runningGovernmentRemaining;
                } else {
                    // Always use full net salary so adding new payments never shifts this row's Net Payable
                    currentNetPayable = salaryRemainingStart;
                }

                let calculatedRemainingAmount: number;
                if (isGov && matchedKey) {
                    // Remaining = typeTotal − all prior same-type payments − this payment
                    const cumPaid = cumulativePaidByKey.get(matchedKey) || 0;
                    calculatedRemainingAmount = Math.round(currentNetPayable - cumPaid - paymentAmount) || 0;
                } else if (!isGov) {
                    // Remaining = full net − all prior salary payments − this payment
                    calculatedRemainingAmount = Math.round(currentNetPayable - cumulativeSalaryPaid - paymentAmount) || 0;
                } else {
                    calculatedRemainingAmount = Math.round(currentNetPayable - paymentAmount) || 0;
                }

                const calculatedStatus = calculatedRemainingAmount < 0 ? 'Paid Extra' : calculatedRemainingAmount === 0 ? 'Full Paid' : 'Partially Paid';
                rows.push({
                    ...item,
                    id: p.id || `${item.id}-${paymentType}-${p.paymentDate}`,
                    calculatedGrossPay: isGov ? paymentAmount : gross,
                    calculatedVariableDeduction: isGov ? 0 : variable,
                    calculatedFixedDeduction: fixed,
                    calculatedNetSalary: currentNetPayable,
                    calculatedRemainingAmount,
                    calculatedStatus,
                    calculatedPaidAmount: paymentAmount,
                    paymentType,
                    paymentMethod: p.paymentMethod,
                    transactionId: p.transactionId,
                    remarks: p.remarks,
                    deductionType: matchedKey || p.deductionType || p.govType || '',
                    displayDate: p.paidAt || p.paymentDate || p.createdAt || p.date,
                    item: item
                });

                if (isGov) {
                    if (matchedKey) {
                        cumulativePaidByKey.set(matchedKey, (cumulativePaidByKey.get(matchedKey) || 0) + paymentAmount);
                    }
                    runningGovernmentRemaining -= paymentAmount;
                } else {
                    cumulativeSalaryPaid += paymentAmount;
                }
            });
            }
        });

        // Display order: SALARY rows first, then GOVERNMENT rows
        rows.sort((a, b) => {
            if (a.paymentType === b.paymentType) return 0;
            return a.paymentType === 'SALARY' ? -1 : 1;
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
