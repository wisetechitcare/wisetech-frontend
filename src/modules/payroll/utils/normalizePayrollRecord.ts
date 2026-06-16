/**
 * Canonical salary record normalizer (frontend mirror of backend normalizeSalaryRecord).
 *
 * The backend now ships pre-normalized fields (salaryPaid, salaryPending, paymentHistory, status, ...)
 * on each payroll.salaryRecords[] item. This helper guarantees the canonical shape even if the
 * frontend hits a legacy response that has not been normalized yet.
 *
 * RULES (must match backend):
 *   salaryPaid    = SUM(salaryPayments.amount)   OR amountPaid   OR 0
 *   lastPaymentAt = latest(salaryPayments.paymentDate) OR paidAt OR createdAt
 *   governmentPaid= SUM(govtPayments.paidAmount) OR governmentPaid OR 0
 *   status        = derived from salaryPaid vs finalNetSalary
 *   paymentHistory= real payments OR a single synthetic LEGACY row
 */

export type NormalizedStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type PaymentSource = 'TRANSACTIONAL' | 'LEGACY';

export interface NormalizedPaymentEntry {
    id?: string;
    amount: number;
    paymentDate: string | Date | null;
    paymentMethod?: string | null;
    transactionId?: string | null;
    remarks?: string | null;
    source: PaymentSource;
    status?: 'PENDING' | 'PARTIAL' | 'PAID' | 'PAID_EXTRA';
    remainingBefore?: number;
    remainingAfter?: number;
}

export interface NormalizedPayrollRecord {
    id: string;
    employeeId: string;
    month: number;
    year: number;

    grossPay: number;
    variableDeductions: number;
    intermediateSalary: number;
    fixedDeductions: number;
    finalNetSalary: number;

    salaryPaid: number;
    salaryPending: number;
    lastPaymentAt: string | Date | null;
    lastSalaryPaymentAt: string | Date | null;
    lastGovtPaymentAt: string | Date | null;

    governmentPaid: number;
    governmentPending: number;

    status: NormalizedStatus;

    paymentHistory: NormalizedPaymentEntry[];
    hasLegacyFallback: boolean;

    employee: any;
    payrollId: string | null;
    deductionBreakdown: any;
    raw: any;
}

const num = (v: any): number => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const deriveStatus = (salaryPaid: number, netSalary: number, govPaid: number, fixedDeductions: number): NormalizedStatus => {
    const isSalaryPaid = netSalary <= 0 ? true : salaryPaid >= netSalary;
    const isGovPaid = fixedDeductions <= 0 ? true : govPaid >= fixedDeductions;

    if (isSalaryPaid && isGovPaid) return 'PAID';
    if (salaryPaid > 0 || govPaid > 0) return 'PARTIAL';
    return 'PENDING';
};

export function normalizePayrollRecord(raw: any): NormalizedPayrollRecord {
    // Trust backend-normalized payload when present.
    const pre = raw?.normalized;

    const salaryPayments: any[] = Array.isArray(raw?.salaryPayments) ? raw.salaryPayments : [];
    const govtPayments: any[] = Array.isArray(raw?.govtPayments) ? raw.govtPayments : [];

    const grossPay = num(pre?.grossPay ?? raw?.grossPay);
    const variableDeductions = num(pre?.variableDeductions ?? raw?.variableDeductions);
    const intermediateSalary = num(pre?.intermediateSalary ?? raw?.intermediateSalary) || Math.max(0, grossPay - variableDeductions);
    const fixedDeductions = num(pre?.fixedDeductions ?? raw?.fixedDeductions);
    const finalNetSalary = num(pre?.finalNetSalary ?? raw?.finalNetSalary) || Math.max(0, intermediateSalary - fixedDeductions);

    // Salary paid: transactional sum → master amountPaid → 0
    const transactionalPaid = salaryPayments.reduce((acc, p) => acc + num(p?.amount ?? p?.amountPaid), 0);
    const legacyAmountPaid = num(raw?.amountPaid);
    const hasTransactional = salaryPayments.length > 0;
    const salaryPaid = pre?.salaryPaid !== undefined
        ? num(pre.salaryPaid)
        : (hasTransactional ? transactionalPaid : legacyAmountPaid);

    // Last payment dates
    let lastSalaryPaymentAt: string | Date | null = pre?.lastSalaryPaymentAt ?? null;
    if (!lastSalaryPaymentAt) {
        if (hasTransactional) {
            const ts = salaryPayments
                .map((p) => (p?.paymentDate ? new Date(p.paymentDate).getTime() : 0))
                .filter((t) => t > 0);
            lastSalaryPaymentAt = ts.length ? new Date(Math.max(...ts)) : null;
        } else if (legacyAmountPaid > 0) {
            lastSalaryPaymentAt = raw?.paidAt ?? raw?.createdAt ?? null;
        }
    }

    let lastGovtPaymentAt: string | Date | null = pre?.lastGovtPaymentAt ?? null;
    if (!lastGovtPaymentAt) {
        if (govtPayments.length > 0) {
            const ts = govtPayments
                .map((p) => (p?.paymentDate ? new Date(p.paymentDate).getTime() : 0))
                .filter((t) => t > 0);
            lastGovtPaymentAt = ts.length ? new Date(Math.max(...ts)) : null;
        }
    }

    const allTs = [lastSalaryPaymentAt, lastGovtPaymentAt]
        .filter(Boolean)
        .map(d => new Date(d!).getTime());
    const lastPaymentAt = allTs.length ? new Date(Math.max(...allTs)) : lastSalaryPaymentAt;

    // Government paid
    const transactionalGovt = govtPayments.reduce((acc, p) => acc + num(p?.paidAmount ?? p?.amount), 0);
    const masterGovtPaid = num(raw?.governmentPaid);
    const governmentPaid = pre?.governmentPaid !== undefined
        ? num(pre.governmentPaid)
        : (govtPayments.length > 0 ? transactionalGovt : masterGovtPaid);

    const salaryPending = pre?.salaryPending !== undefined
        ? num(pre.salaryPending)
        : Math.max(0, finalNetSalary - salaryPaid);

    const governmentPending = pre?.governmentPending !== undefined
        ? num(pre.governmentPending)
        : Math.max(0, fixedDeductions - governmentPaid);

    // Payment history
    let paymentHistory: NormalizedPaymentEntry[] = [];
    let hasLegacyFallback = false;

    if (Array.isArray(pre?.paymentHistory)) {
        paymentHistory = pre.paymentHistory;
        hasLegacyFallback = !!pre.hasLegacyFallback;
    } else {
        // Build transactional history from both salary and govt payments
        salaryPayments.forEach((p) => {
            paymentHistory.push({
                id: p?.id,
                amount: num(p?.amount ?? p?.amountPaid),
                paymentDate: p?.paymentDate ?? null,
                paymentMethod: p?.paymentMethod ?? null,
                transactionId: p?.transactionId ?? null,
                remarks: p?.remarks ?? null,
                source: 'TRANSACTIONAL',
            });
        });

        govtPayments.forEach((p) => {
            paymentHistory.push({
                id: p?.id,
                amount: num(p?.paidAmount ?? p?.amount),
                paymentDate: p?.paymentDate ?? null,
                paymentMethod: p?.paymentMethod ?? 'BANK_TRANSFER',
                transactionId: p?.transactionId ?? p?.challanNumber ?? null,
                remarks: `${p?.deductionType || 'Govt Fee'}${p?.remarks ? ` - ${p.remarks}` : ''}`,
                source: 'TRANSACTIONAL',
            });
        });

        if (paymentHistory.length > 0) {
            paymentHistory.sort((a, b) => new Date(a?.paymentDate ?? 0).getTime() - new Date(b?.paymentDate ?? 0).getTime());

            // Calculate individual payment status based on remaining balance
            let cumulativePaid = 0;
            paymentHistory.forEach((payment) => {
                const remainingBefore = Math.max(0, finalNetSalary - cumulativePaid);
                const amount = payment.amount;
                const remainingAfter = Math.max(-amount, remainingBefore - amount);

                let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'PAID_EXTRA';
                if (amount <= 0) {
                    paymentStatus = 'PENDING';
                } else if (amount > remainingBefore) {
                    paymentStatus = 'PAID_EXTRA';
                } else if (amount >= remainingBefore && remainingBefore > 0) {
                    paymentStatus = 'PAID';
                } else {
                    paymentStatus = 'PARTIAL';
                }

                payment.status = paymentStatus;
                payment.remainingBefore = remainingBefore;
                payment.remainingAfter = remainingAfter;

                cumulativePaid += amount;
            });
        } else if (legacyAmountPaid > 0) {
            hasLegacyFallback = true;
            paymentHistory = [
                {
                    amount: legacyAmountPaid,
                    paymentDate: raw?.paidAt ?? raw?.createdAt ?? null,
                    paymentMethod: raw?.paymentMethod ?? null,
                    transactionId: raw?.transactionId ?? null,
                    remarks: raw?.remarks ?? null,
                    source: 'LEGACY',
                    status: legacyAmountPaid >= finalNetSalary ? 'PAID' : (legacyAmountPaid > 0 ? 'PARTIAL' : 'PENDING'),
                    remainingBefore: finalNetSalary,
                    remainingAfter: Math.max(-legacyAmountPaid, finalNetSalary - legacyAmountPaid),
                },
            ];
        }
    }

    const status: NormalizedStatus = (pre?.status as NormalizedStatus) || deriveStatus(salaryPaid, finalNetSalary, governmentPaid, fixedDeductions);

    // Deduction breakdown lives in payrollBreakdownJson on master; legacy v1 records won't have it.
    let deductionBreakdown: any = raw?.deductionBreakdown ?? null;
    if (!deductionBreakdown && raw?.payrollBreakdownJson) {
        try {
            const parsed = typeof raw.payrollBreakdownJson === 'string'
                ? JSON.parse(raw.payrollBreakdownJson)
                : raw.payrollBreakdownJson;
            deductionBreakdown = parsed?.deductionBreakdown ?? null;
        } catch {
            deductionBreakdown = null;
        }
    }

    return {
        id: raw?.id,
        employeeId: raw?.employeeId,
        month: Number(raw?.month),
        year: Number(raw?.year),

        grossPay,
        variableDeductions,
        intermediateSalary,
        fixedDeductions,
        finalNetSalary,

        salaryPaid,
        salaryPending,
        lastPaymentAt,
        lastSalaryPaymentAt,
        lastGovtPaymentAt,

        governmentPaid,
        governmentPending,

        status,

        paymentHistory,
        hasLegacyFallback,

        employee: raw?.employee ?? null,
        payrollId: raw?.payrollId ?? null,
        deductionBreakdown,
        raw,
    };
}

export interface PayrollAggregateSummary {
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
}

export function aggregatePayrollSummary(rows: NormalizedPayrollRecord[]): PayrollAggregateSummary {
    const init: PayrollAggregateSummary = {
        totalGrossPay: 0,
        totalVariableDeduction: 0,
        totalFixedDeduction: 0,
        totalDeduction: 0,
        netSalary: 0,
        salaryPaid: 0,
        salaryPending: 0,
        governmentPaid: 0,
        governmentPending: 0,
        totalCompanyPayout: 0,
    };

    const sum = rows.reduce((acc, r) => {
        acc.totalGrossPay += r.grossPay;
        acc.totalVariableDeduction += r.variableDeductions;
        acc.totalFixedDeduction += r.fixedDeductions;
        acc.netSalary += r.finalNetSalary;
        acc.salaryPaid += r.salaryPaid;
        acc.salaryPending += r.salaryPending;
        acc.governmentPaid += r.governmentPaid;
        acc.governmentPending += r.governmentPending;
        return acc;
    }, init);

    sum.totalDeduction = sum.totalVariableDeduction + sum.totalFixedDeduction;
    sum.totalCompanyPayout = sum.salaryPaid + sum.governmentPaid;

    // Round to 2dp
    (Object.keys(sum) as (keyof PayrollAggregateSummary)[]).forEach((k) => {
        sum[k] = Number(sum[k].toFixed(2));
    });

    return sum;
}
