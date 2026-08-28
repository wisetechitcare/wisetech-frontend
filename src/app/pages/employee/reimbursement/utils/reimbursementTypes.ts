/**
 * The shapes this module actually passes around.
 *
 * The reimbursement folder carries ~350 `any` in a repo whose CLAUDE.md says "TypeScript strict.
 * No `any`". Most of them are not deliberate escape hatches — they are the same four or five
 * shapes that nobody had written down, so every consumer reached for `any` rather than invent a
 * name that would then disagree with the next file's.
 *
 * These are the names. They are intentionally permissive about optionality, because the API
 * genuinely omits fields depending on the endpoint — the value here is knowing WHICH fields
 * exist at all, not pretending they are always present.
 */

/** A dropdown option as the reimbursement pickers use it. */
export interface ReimbursementOption {
    value: string;
    label: string;
    icon?: string | null;
    /** Per-category spend cap, used for live limit feedback at entry. */
    amountLimit?: number | string | null;
}

/** An expense line, as any list endpoint returns it. */
export interface ReimbursementLine {
    id: string;
    employeeId?: string;
    reimbursementTypeId?: string | null;
    reimbursementType?: { id?: string; type?: string | null; icon?: string | null } | null;
    expenseDate?: string | Date | null;
    description?: string | null;
    document?: string | null;
    amount?: number | string | null;
    /** 0 pending · 1 approved · 2 rejected. Arrives stringified from the statistics mappers. */
    status?: number | string | null;
    paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | string | null;
    fromLocation?: string | null;
    toLocation?: string | null;
    clientCompanyId?: string | null;
    clientCompany?: { id?: string; companyName?: string | null } | null;
    clientTypeId?: string | null;
    /** Lead-as-master: the submitted project is resolved to a lead server-side. */
    leadId?: string | null;
    lead?: { id?: string; title?: string | null } | null;
    projectId?: string | null;
    isExceedingLimit?: boolean | null;
    rejectReason?: string | null;
    batchId?: string | null;
    batch?: ReimbursementBatchSummary | null;
    /** The three-date model (Phase 3). */
    submittedAt?: string | null;
    approvedAt?: string | null;
    rejectedAt?: string | null;
    decidedBy?: string | null;
}

/** The batch identity that travels with a line. */
export interface ReimbursementBatchSummary {
    id: string;
    submissionId?: string | null;
    submittedAt?: string | null;
    approvedAt?: string | null;
    status?: number | null;
    /** Expense period the batch covers — min/max of its lines (Phase 3). */
    periodStart?: string | null;
    periodEnd?: string | null;
    paidStatus?: string | null;
}

/**
 * A batch with its lines.
 *
 * `id` is optional because the records table builds a synthetic "Legacy" batch for lines that
 * were never submitted through the batch workflow — they have no batch to have an id.
 *
 * The trailing fields are added client-side by the Payment tab, which enriches each batch with
 * what it computed from the detail fetch. They are declared here rather than cast away at the
 * use site, because a field the code depends on is part of the shape whether or not the server
 * sent it.
 */
export interface ReimbursementBatchDetail extends Omit<ReimbursementBatchSummary, 'id'> {
    id?: string;
    totalAmount?: number | string | null;
    totalRequests?: number | null;
    rejectReason?: string | null;
    employee?: {
        id?: string;
        employeeCode?: string | null;
        users?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
    reimbursements?: ReimbursementLine[];
    payments?: ReimbursementPaymentRecord[];
    // ── Client-side enrichment (Payment tab) ──────────────────────────────────
    /** Derived from the lines' paymentStatus, not sent by the server. */
    paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | string | null;
    paidAmount?: number | string | null;
    remainingAmount?: number | string | null;
    approvalInstanceId?: string | null;
    approvedReimbursementIds?: string[];
}

/** A recorded payout. */
export interface ReimbursementPaymentRecord {
    id: string;
    employeeId?: string;
    batchId?: string | null;
    amountPaid?: number | string | null;
    totalAmount?: number | string | null;
    paymentDate?: string | null;
    paymentMethod?: string | null;
    /** UTR / bank reference. Captured since Phase 5; older rows have none. */
    transactionId?: string | null;
    remarks?: string | null;
    status?: string | null;
    processedBy?: string | null;
    processor?: {
        employeeCode?: string | null;
        users?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
    reimbursements?: ReimbursementLine[];
    batch?: ReimbursementBatchSummary | null;
    createdAt?: string | null;
    // ── Client-side enrichment ────────────────────────────────────────────────
    employeeCode?: string | null;
    employeeName?: string | null;
    paymentMadeBy?: string | null;
    batchRef?: string | null;
    _batchId?: string | null;
}

/** A pending draft — an expense filed but not yet sent for approval. */
export interface ReimbursementDraft {
    id: string;
    employeeId?: string;
    reimbursementTypeId?: string | null;
    expenseDate?: string | Date | null;
    description?: string | null;
    document?: string | null;
    amount?: number | string | null;
    fromLocation?: string | null;
    toLocation?: string | null;
    clientCompanyId?: string | null;
    clientTypeId?: string | null;
    projectId?: string | null;
    isExceedingLimit?: boolean | null;
    createdAt?: string | null;
}

/**
 * The envelope every endpoint in this module answers with. Both spellings are accepted because
 * the callers already handle `res?.data?.x || res?.x` — the interceptor unwraps inconsistently.
 */
export type ApiEnvelope<K extends string, T> = {
    data?: Partial<Record<K, T>>;
} & Partial<Record<K, T>>;

/** Reads a key out of the envelope without every call site repeating the `||` dance. */
export const unwrap = <K extends string, T>(
    res: ApiEnvelope<K, T> | null | undefined,
    key: K,
    fallback: T,
): T => res?.data?.[key] ?? res?.[key] ?? fallback;
