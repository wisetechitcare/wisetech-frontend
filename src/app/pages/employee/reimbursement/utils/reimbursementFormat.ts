/**
 * One source of truth for how the reimbursement module renders dates, money, statuses and
 * missing values.
 *
 * Before this file the module carried `fmtDate` ×4, `fmtAmount` ×5, `formatINR` ×5,
 * `resolveStatusNum` ×2 and five inline re-implementations — copies that had already drifted
 * apart. The visible symptom was a footer rendering 0dp while the rows above it rendered 2dp, so
 * a total literally did not equal the sum of the column it totalled.
 *
 * Everything here is intentionally boring. Formatting decisions belong in one place precisely so
 * nobody has to make them again.
 */

import dayjs from 'dayjs';

/**
 * The single placeholder for "there is no value here".
 *
 * The module used three — `'N/A'`, `'-NA-'` and an empty string — which read as three different
 * conditions to a user who has no way to know they mean the same thing.
 */
export const NO_VALUE = 'N/A';

/** The synthetic grouping for reimbursements that were never submitted through a batch. */
export const LEGACY_SUBMISSION_LABEL = 'Legacy (not submitted)';

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Display format for every date in the module.
 *
 * Takes the raw value, never a pre-formatted string: mappers used to overwrite `expenseDate`
 * with `"05 Jan 2026"` and the table then sorted *that*, so dates ordered alphabetically —
 * every April before every August, every 2025 date interleaved with 2026. Keep the Date, format
 * at the point of render.
 */
export const fmtDate = (value?: string | Date | null): string => {
    if (!value) return NO_VALUE;
    const d = dayjs(value);
    return d.isValid() ? d.format('DD MMM YYYY') : NO_VALUE;
};

/** Month heading used to group the records table by expense month. */
export const fmtMonth = (value?: string | Date | null): string => {
    if (!value) return NO_VALUE;
    const d = dayjs(value);
    return d.isValid() ? d.format('MMMM YYYY') : NO_VALUE;
};

// ── Money ─────────────────────────────────────────────────────────────────────

/**
 * Amounts are `Decimal(10,2)` serialised as strings. Always two decimal places — including in
 * footers and totals, which is where the precision used to diverge from the rows.
 */
export const fmtAmount = (value?: number | string | null): string =>
    Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Same number with the currency symbol, for KPI values and totals. */
export const formatINR = (value?: number | string | null): string =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

/** Sums an amount column without going through float concatenation at the call site. */
export const sumAmounts = (rows: Array<{ amount?: number | string | null }>): number =>
    rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);

// ── Status ────────────────────────────────────────────────────────────────────

export const STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
    /** The approver asked a question. Not a decision — the line is still live and editable. */
    NEEDS_INFO: 3,
    /** Display-only: a batch whose lines were decided differently. Never stored. */
    MIXED: 9,
} as const;
export type StatusNum = (typeof STATUS)[keyof typeof STATUS];

/**
 * Status arrives as a number from the API and as a string from the statistics mappers, which
 * stringify it. Both shapes reach the same tables.
 */
export const resolveStatusNum = (status: unknown): StatusNum => {
    if (typeof status === 'number') return status as StatusNum;
    if (status === 'Approved') return STATUS.APPROVED;
    if (status === 'Rejected') return STATUS.REJECTED;
    if (status === 'Needs Info' || status === 'NEEDS_INFO') return STATUS.NEEDS_INFO;
    return STATUS.PENDING;
};

export const STATUS_LABEL: Record<StatusNum, string> = {
    [STATUS.PENDING]: 'Pending',
    [STATUS.APPROVED]: 'Approved',
    [STATUS.REJECTED]: 'Rejected',
    [STATUS.NEEDS_INFO]: 'Needs info',
    [STATUS.MIXED]: 'Mixed',
};

/**
 * Status colours, from the salary module's chip palette. Every consumer must render the LABEL
 * alongside the colour — colour alone is not a status, and the module previously encoded
 * "over limit" as a red tint with no text at all.
 */
export const STATUS_TONE: Record<StatusNum, { color: string; bg: string }> = {
    [STATUS.PENDING]: { color: '#d97706', bg: '#fff7e8' },
    [STATUS.APPROVED]: { color: '#15803d', bg: '#ecfdf3' },
    [STATUS.REJECTED]: { color: '#dc2626', bg: '#fef2f2' },
    // Amber like pending, because that is what it is — waiting, not refused.
    [STATUS.NEEDS_INFO]: { color: '#b45309', bg: '#fffbeb' },
    [STATUS.MIXED]: { color: '#475569', bg: '#f1f5f9' },
};

export const PAYMENT_TONE: Record<string, { color: string; bg: string }> = {
    PAID: { color: '#15803d', bg: '#ecfdf3' },
    PARTIAL: { color: '#d97706', bg: '#fff7e8' },
    UNPAID: { color: '#dc2626', bg: '#fef2f2' },
};

// ── Names and lookups ─────────────────────────────────────────────────────────

/**
 * Builds a person's display name without rendering the string "undefined undefined".
 *
 * Optional chaining inside a template literal stringifies `undefined`, so
 * `` `${u?.firstName} ${u?.lastName}` `` printed "undefined undefined" for any employee whose
 * user record had not loaded.
 */
export const fullName = (user?: { firstName?: string | null; lastName?: string | null } | null): string => {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return name || NO_VALUE;
};

/**
 * Resolves the project title through the whole chain.
 *
 * `saveReimbursement` resolves the submitted `projectId` to a `leadId` and drops the original
 * key — lead-as-master. Readers that only looked at `project?.title` therefore found nothing and
 * printed "N/A" for every row that had a perfectly good project on it.
 */
export const projectTitle = (row: {
    lead?: { title?: string | null } | null;
    project?: { title?: string | null } | null;
    projectId?: string | null;
    leadId?: string | null;
}, resolve?: (id: string) => string | undefined): string => {
    const direct = row.lead?.title || row.project?.title;
    if (direct) return direct;
    const id = row.leadId || row.projectId;
    return (id && resolve?.(id)) || NO_VALUE;
};

// ── Download ──────────────────────────────────────────────────────────────────

/**
 * Saves a fetched blob. Three copies of this existed, two of them line-for-line identical.
 * The object URL is always revoked — the copies leaked one per download.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
