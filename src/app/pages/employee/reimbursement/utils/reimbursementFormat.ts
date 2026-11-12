/**
 * One source of truth for how the reimbursement module renders dates, money, statuses and
 * missing values.
 *
 * Before this file the module carried `fmtDate` ×4, `fmtAmount` ×5, `formatMoney` ×5,
 * `resolveStatusNum` ×2 and five inline re-implementations — copies that had already drifted
 * apart. The visible symptom was a footer rendering 0dp while the rows above it rendered 2dp, so
 * a total literally did not equal the sum of the column it totalled.
 *
 * Everything here is intentionally boring. Formatting decisions belong in one place precisely so
 * nobody has to make them again.
 */

import dayjs from 'dayjs';
import { formatCurrencyDecimal, getCurrencyLocale } from '@utils/currency';
import { formatDate } from '@utils/dateFormats';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { IST_TZ } from '@constants/timezone';

// The plugins are extended here rather than relying on `@utils/date` (which imports the store). Note `fmtDate` below
// delegates to `@utils/dateFormats`, which does read the store, so this module is not store-free.
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The business month of an expense date, `YYYY-MM` — read in IST, exactly as the server groups drafts into batches
 * (`getMonthYear`). Expense dates are stored as UTC or IST midnight; reading them in the browser's own zone put an
 * IST-midnight expense on the 1st into the previous month for anyone outside India (e.g. the Dubai branch), so the
 * inbox and "Send <month>" could disagree with the server.
 */
export const expenseMonthKey = (value: string | Date | null | undefined): string =>
    value ? dayjs(value).tz(IST_TZ).format('YYYY-MM') : '';

/** "November 2026" for a `YYYY-MM` key. */
export const monthKeyLabel = (key: string): string => dayjs(`${key}-01`).format('MMMM YYYY');

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
 * Display format for every date in the module: the company standard (`formatDate`, YYYY.MM.DD).
 *
 * Takes the raw value, never a pre-formatted string: mappers used to overwrite `expenseDate`
 * with `"05 Jan 2026"` and the table then sorted *that*, so dates ordered alphabetically —
 * every April before every August, every 2025 date interleaved with 2026. Keep the Date, format
 * at the point of render.
 */
export const fmtDate = (value?: string | Date | null): string => {
    return formatDate(value, NO_VALUE);
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
    Number(value ?? 0).toLocaleString(getCurrencyLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Same number with the currency symbol, for KPI values and totals.
 *
 * Named for money rather than for rupees on purpose: it follows the branch now, and a
 * function called formatMoney that returns dirhams is the kind of thing that gets trusted
 * right up until it is wrong.
 */
export const formatMoney = (value?: number | string | null): string =>
    formatCurrencyDecimal(Number(value ?? 0));

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

/**
 * THE colour of each status, for every surface that shows one — table row tint, badge, phone card, filter
 * chip. Three surfaces each had their own map and disagreed (Mixed was blue in the table, grey on the chip,
 * and amber on the phone card, which also painted Needs info blue because it read 3 as "mixed").
 * Needs info is warning: like Pending, it waits on someone — here, the employee. Every consumer renders
 * the LABEL beside the colour: colour alone is not a status. (Replaced a hex palette that had no users left
 * and could not follow dark mode.)
 */
export const STATUS_TONE: Record<StatusNum, 'warning' | 'success' | 'danger' | 'info'> = {
    [STATUS.PENDING]: 'warning',
    [STATUS.NEEDS_INFO]: 'warning',
    [STATUS.APPROVED]: 'success',
    [STATUS.REJECTED]: 'danger',
    [STATUS.MIXED]: 'info',
};

export const STATUS_LABEL: Record<StatusNum, string> = {
    [STATUS.PENDING]: 'Pending',
    [STATUS.APPROVED]: 'Approved',
    [STATUS.REJECTED]: 'Rejected',
    [STATUS.NEEDS_INFO]: 'Needs Info',
    // A batch whose lines were decided differently — the badge, export, card and filter all say this.
    [STATUS.MIXED]: 'Partly Approved',
};

/**
 * Payment state in words — the table badge, the phone card, the chart and exports read THIS (Title Case).
 * The table said "Pending" and "Partially Paid" while the card said "Awaiting payment" and "Part paid" for the
 * same two states.
 */
export const PAYMENT_LABEL = {
    PAID: 'Paid',
    PARTIAL: 'Partially Paid',
    UNPAID: 'Awaiting Payment',
} as const;

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
    lead?: { title?: string | null; originalProjectPrefix?: string | null } | null;
    project?: { title?: string | null } | null;
    projectId?: string | null;
    leadId?: string | null;
}, resolve?: (id: string) => string | undefined): string => {
    // The same label the reimbursement form's project picker shows: "WT/PROJECT/26-27/742 - 5th Floor …".
    // The server attaches `lead` to drafts and submitted claims alike, so a row names its own project.
    const lead = row.lead?.title
        ? (row.lead.originalProjectPrefix ? `${row.lead.originalProjectPrefix} - ${row.lead.title}` : row.lead.title)
        : null;
    const direct = lead || row.project?.title;
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
