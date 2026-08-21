import dayjs, { Dayjs } from 'dayjs';
import { resolveStatusNum } from '../../utils/reimbursementFormat';

/**
 * Everything the Payment page knows about money, in one place.
 *
 * The page used to derive a batch's payment STATUS from the line-level `paymentStatus` flags
 * while deriving its AMOUNTS from the payment records — two independent readings of the same
 * fact, which is exactly how a row ends up labelled "Paid" next to a non-zero remaining balance.
 * Both now come from one function over one payload, so the badge and the numbers cannot
 * contradict each other on screen.
 *
 * Every input is a backend value. Nothing here invents a status or a total: `remaining` is
 * `approved − paid` (the backend's own definition, see ReimbursementPaymentRepository), and the
 * three states are the same three the backend writes to `reimbursement_batch.paid_status`.
 */

export type PaymentState = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PeriodFilter = 'monthly' | 'yearly' | 'allTime';

/**
 * What each state is called on screen.
 *
 * "Ready to pay" is UNPAID seen from the finance desk — an approved batch nobody has paid yet.
 * It is a label for an existing state, not a new one; nothing is stored under this name.
 */
export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
    UNPAID: 'Ready to pay',
    PARTIAL: 'Partially paid',
    PAID: 'Paid',
};

/**
 * Compact sizing for the page's action buttons.
 *
 * `WtButton size="small"` is still a 40px CTA with 24px of horizontal padding — right for a
 * dialog footer, far too heavy for a button that repeats on every table row and sits inside a
 * 34px toolbar. One height for all of them, so the row, the run bar and the toolbar line up.
 */
export const COMPACT_BUTTON_SX = {
    height: 30,
    minHeight: 30,
    px: 1.75,
    fontSize: 12.5,
    borderRadius: '8px',
    whiteSpace: 'nowrap',
} as const;

/** A payment record is only ever PAID or PARTIAL — those are the two the backend writes. */
const COUNTS_AS_PAYMENT = (p: any) => p?.status === 'PAID' || p?.status === 'PARTIAL';

/** Money is Decimal(12,2) on the wire. Anything under half a paisa is settled. */
const SETTLED_EPSILON = 0.005;

const fullName = (users?: { firstName?: string | null; lastName?: string | null } | null): string =>
    [users?.firstName, users?.lastName].filter(Boolean).join(' ').trim() || 'N/A';

export interface PaymentLine {
    id: string;
    amount: number;
    description: string;
    category: string;
    project: string;
    expenseDate: string | null;
    /** Approval status (0/1/2) — a batch can hold rejected lines that are never payable. */
    status: number;
    paymentStatus: string;
}

export interface PaymentRecord {
    id: string;
    paymentDate: string | null;
    amountPaid: number;
    paymentMethod: string | null;
    transactionId: string | null;
    remarks: string | null;
    status: string;
    /** Resolved name of whoever recorded it. */
    processedBy: string;
    // Carried so the history table can render one row per payment without re-joining.
    batchId: string;
    submissionId: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
}

/**
 * The org facts a finance filter needs, which the batch payload does not carry.
 *
 * `ReimbursementBatch.employee` selects id, code and name and nothing else, so sub-organisation,
 * branch and team are joined in from the employee list — the same source and the same shape the
 * payroll and reimbursement-details toolbars use, so the three pages offer identical options for
 * the same population.
 */
export interface EmployeeOrgDetail {
    subOrganization: string;
    department: string;
    branch: string;
    team: string;
    isActive: boolean;
}

const UNKNOWN_ORG: EmployeeOrgDetail = {
    subOrganization: 'N/A', department: 'N/A', branch: 'N/A', team: 'N/A', isActive: true,
};

export interface PaymentBatchRow {
    id: string;
    submissionId: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    subOrganization: string;
    department: string;
    branch: string;
    team: string;
    /** Whether the employee is still active — a past employee can still be owed money. */
    isActive: boolean;
    /** Approved lines only — a rejected line is not payable and never counts toward a total. */
    totalRequests: number;
    approvedAmount: number;
    paidAmount: number;
    remainingAmount: number;
    state: PaymentState;
    submittedAt: string | null;
    approvedAt: string | null;
    /** Most recent payment date, or the approval date when nothing has been paid yet. */
    lastActivityAt: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    lines: PaymentLine[];
    payments: PaymentRecord[];
    /** Ids the payment endpoint allocates against. Approved lines only. */
    approvedReimbursementIds: string[];
    /** The untouched batch, for the shared BatchDetailModal. */
    raw: any;
}

/**
 * Approved batches, with their money resolved.
 *
 * Only `status === 1` batches appear: an unapproved batch cannot be paid, which is why the
 * payment universe has always been this filter. Batches whose approved total is zero (every
 * line rejected) are dropped too — they are unpayable by definition, and listing them put
 * ₹0.00 rows in a queue of things to do.
 */
export function buildPaymentRows(
    rawBatches: any[],
    orgById?: Map<string, EmployeeOrgDetail>,
): PaymentBatchRow[] {
    const rows: PaymentBatchRow[] = [];

    for (const b of rawBatches ?? []) {
        if (resolveStatusNum(b.status) !== 1) continue;

        const employeeId = b.employee?.id || b.employeeId || '';
        const employeeName = fullName(b.employee?.users);
        const employeeCode = b.employee?.employeeCode || 'N/A';
        const submissionId = b.submissionId || b.id;
        const org = orgById?.get(employeeId) ?? UNKNOWN_ORG;

        const allLines: PaymentLine[] = (b.reimbursements ?? []).map((r: any) => ({
            id: r.id,
            amount: Number(r.amount || 0),
            description: r.description || '',
            category: r.reimbursementType?.type || 'N/A',
            project: r.lead?.title || r.clientCompany?.companyName || 'N/A',
            expenseDate: r.expenseDate ?? null,
            status: resolveStatusNum(r.status),
            paymentStatus: String(r.paymentStatus || 'UNPAID').toUpperCase(),
        }));

        const approvedLines = allLines.filter((l) => l.status === 1);
        const approvedAmount = approvedLines.reduce((s, l) => s + l.amount, 0);
        if (approvedAmount <= 0) continue;

        const payments: PaymentRecord[] = (b.payments ?? [])
            .filter(COUNTS_AS_PAYMENT)
            .map((p: any) => ({
                id: p.id,
                paymentDate: p.paymentDate ?? null,
                amountPaid: Number(p.amountPaid || 0),
                paymentMethod: p.paymentMethod ?? null,
                transactionId: p.transactionId ?? null,
                remarks: p.remarks ?? null,
                status: p.status,
                processedBy: fullName(p.processor?.users),
                batchId: b.id,
                submissionId,
                employeeId,
                employeeName,
                employeeCode,
            }));

        const paidAmount = payments.reduce((s, p) => s + p.amountPaid, 0);
        const remainingAmount = Math.max(0, approvedAmount - paidAmount);

        const state: PaymentState =
            remainingAmount < SETTLED_EPSILON ? 'PAID'
            : paidAmount > 0 ? 'PARTIAL'
            : 'UNPAID';

        const lastPaymentDate = payments
            .map((p) => p.paymentDate)
            .filter(Boolean)
            .sort()
            .pop() ?? null;

        rows.push({
            id: b.id,
            submissionId,
            employeeId,
            employeeName,
            employeeCode,
            subOrganization: org.subOrganization,
            department: org.department,
            branch: org.branch,
            team: org.team,
            isActive: org.isActive,
            totalRequests: approvedLines.length,
            approvedAmount,
            paidAmount,
            remainingAmount,
            state,
            submittedAt: b.submittedAt ?? null,
            approvedAt: b.approvedAt ?? null,
            lastActivityAt: lastPaymentDate ?? b.approvedAt ?? b.submittedAt ?? null,
            periodStart: b.periodStart ?? null,
            periodEnd: b.periodEnd ?? null,
            lines: allLines,
            payments,
            approvedReimbursementIds: approvedLines.map((l) => l.id),
            raw: b,
        });
    }

    return rows;
}

/**
 * The two axes, kept apart deliberately.
 *
 *  - 'submission' — the QUEUE: "what do we still owe?". Anchoring the queue on payment date
 *    would drop a partially-paid batch out of every month after its last payment, hiding money
 *    that is still outstanding.
 *  - 'payment' — the HISTORY: "what moved in this period?", matching the employee-facing payment
 *    history contract. A batch paid across two months appears in both, exactly as it does there.
 *
 * Merging them into one date would make one of the two questions unanswerable.
 */
export const inPeriod = (value: string | null | undefined, filter: PeriodFilter, date: Dayjs): boolean => {
    if (filter === 'allTime') return true;
    if (!value) return false;
    const d = dayjs(value);
    if (!d.isValid()) return false;
    return filter === 'monthly'
        ? d.format('YYYY-MM') === date.format('YYYY-MM')
        : d.year() === date.year();
};

/** Queue scope: approved-and-owing, submitted in the period. */
export const filterQueueByPeriod = (rows: PaymentBatchRow[], filter: PeriodFilter, date: Dayjs) =>
    rows.filter((r) => inPeriod(r.submittedAt, filter, date));

/** History scope: one entry per payment recorded in the period. */
export const paymentsInPeriod = (rows: PaymentBatchRow[], filter: PeriodFilter, date: Dayjs): PaymentRecord[] =>
    rows
        .flatMap((r) => r.payments)
        .filter((p) => inPeriod(p.paymentDate, filter, date))
        .sort((a, b) => String(b.paymentDate ?? '').localeCompare(String(a.paymentDate ?? '')));

export interface PaymentKpis {
    pendingAmount: number;
    pendingRequests: number;
    pendingBatches: number;
    paidAmount: number;
    employeesAwaiting: number;
    /** Share of the period's approved money that has actually been paid out. */
    settledPct: number;
}

/**
 * The four headline numbers, over the period-scoped population the tables below show — so the
 * cards and the rows can never describe different months.
 */
export function paymentKpis(queueRows: PaymentBatchRow[], periodPayments: PaymentRecord[]): PaymentKpis {
    const owing = queueRows.filter((r) => r.state !== 'PAID');
    const pendingAmount = owing.reduce((s, r) => s + r.remainingAmount, 0);
    const paidAmount = periodPayments.reduce((s, p) => s + p.amountPaid, 0);
    const approvedInPeriod = queueRows.reduce((s, r) => s + r.approvedAmount, 0);

    return {
        pendingAmount,
        pendingRequests: owing.reduce((s, r) => s + r.totalRequests, 0),
        pendingBatches: owing.length,
        paidAmount,
        employeesAwaiting: new Set(owing.map((r) => r.employeeId).filter(Boolean)).size,
        settledPct: approvedInPeriod > 0
            ? Math.min(100, Math.round((queueRows.reduce((s, r) => s + r.paidAmount, 0) / approvedInPeriod) * 100))
            : 0,
    };
}

/** Counts and amounts per state, for the status rail. */
export function stateBreakdown(rows: PaymentBatchRow[]) {
    const empty = { count: 0, amount: 0 };
    const out: Record<PaymentState, { count: number; amount: number }> = {
        UNPAID: { ...empty },
        PARTIAL: { ...empty },
        PAID: { ...empty },
    };
    for (const r of rows) {
        out[r.state].count += 1;
        // A settled batch's headline number is what it cost; an owing one's is what is left.
        out[r.state].amount += r.state === 'PAID' ? r.paidAmount : r.remainingAmount;
    }
    return out;
}
