/**
 * The one way to total a set of reimbursements.
 *
 * There were two aggregators, and they disagreed — the same employee showed different approved
 * totals depending on which admin tab you opened. Neither was right:
 *
 *  - `SearchEmployee` branched Pending / Rejected / **else**, so a row with an unrecognised
 *    status (the mappers emit `'-'`) was counted as APPROVED and added to the approved amount.
 *  - `AllEmployee` branched Approved / Pending / Rejected, so the same row landed in NO bucket
 *    while still adding to `totalRequests` — its buckets could never sum to its own total.
 *  - Both treated PARTIAL payments as entirely unpaid, because only `paymentStatus === 'PAID'`
 *    added to the paid figure. A half-paid claim was reported as owing the full amount.
 *
 * Fixing them separately would have re-created the drift. One function, both callers.
 */

export interface ReimbursementSummary {
    totalAmount: number;
    totalRequests: number;
    approvedAmount: number;
    approvedCount: number;
    pendingAmount: number;
    pendingCount: number;
    rejectedAmount: number;
    rejectedCount: number;
    /** Approved money that has actually been paid out. PARTIAL rows contribute what was paid. */
    paidAmount: number;
    /** Approved money still owed. `paidAmount + remainingAmount === approvedAmount`. */
    remainingAmount: number;
    /** Rows whose status we could not classify. Surfaced rather than silently absorbed. */
    unclassifiedCount: number;
}

const EMPTY: ReimbursementSummary = {
    totalAmount: 0, totalRequests: 0,
    approvedAmount: 0, approvedCount: 0,
    pendingAmount: 0, pendingCount: 0,
    rejectedAmount: 0, rejectedCount: 0,
    paidAmount: 0, remainingAmount: 0,
    unclassifiedCount: 0,
};

/** Status arrives as a number from the API and as a string from the statistics mappers. */
const classify = (status: unknown): 'approved' | 'pending' | 'rejected' | 'unknown' => {
    if (status === 1 || status === 'Approved') return 'approved';
    if (status === 0 || status === 'Pending') return 'pending';
    if (status === 2 || status === 'Rejected') return 'rejected';
    return 'unknown';
};

export const summariseReimbursements = (
    rows: Array<{
        id?: string;
        amount?: number | string | null;
        status?: unknown;
        paymentStatus?: string | null;
        amountPaid?: number | string | null;
    }>,
): ReimbursementSummary => {
    const s: ReimbursementSummary = { ...EMPTY };

    for (const row of rows) {
        if (!row?.id) continue;
        const amount = Number(row.amount ?? 0) || 0;
        s.totalAmount += amount;
        s.totalRequests += 1;

        switch (classify(row.status)) {
            case 'approved': {
                s.approvedAmount += amount;
                s.approvedCount += 1;
                // PARTIAL used to fall into the `else` and count as fully unpaid. Where the row
                // carries the amount actually paid we use it; otherwise a PARTIAL row is treated
                // as half-known — counted as owing, but never as fully paid.
                if (row.paymentStatus === 'PAID') {
                    s.paidAmount += amount;
                } else if (row.paymentStatus === 'PARTIAL') {
                    const paid = Number(row.amountPaid ?? 0) || 0;
                    s.paidAmount += paid;
                    s.remainingAmount += Math.max(0, amount - paid);
                } else {
                    s.remainingAmount += amount;
                }
                break;
            }
            case 'pending':
                s.pendingAmount += amount;
                s.pendingCount += 1;
                break;
            case 'rejected':
                s.rejectedAmount += amount;
                s.rejectedCount += 1;
                break;
            default:
                // Counted in the total (it is a real row) and counted here, so the discrepancy is
                // visible rather than being quietly attributed to whichever bucket came last.
                s.unclassifiedCount += 1;
        }
    }

    return s;
};
