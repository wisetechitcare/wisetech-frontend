import dayjs, { Dayjs } from 'dayjs';
import { summariseReimbursements } from './reimbursementSummary';
import { formatINR, resolveStatusNum, STATUS } from './reimbursementFormat';

/**
 * Chart data, derived from the rows the page already has.
 *
 * The KPI cards and every chart are computed from the SAME in-memory rows by the SAME
 * `summariseReimbursements` used everywhere else, so disagreement is not merely unlikely, it is
 * unrepresentable. A second endpoint would have been the thing that creates the drift.
 *
 * Every bucket is keyed on `expenseDate` — when the money was spent. Bucketing on submission date
 * is the original reported bug, and a chart is where a wrong month is least likely to be noticed
 * and most likely to be believed.
 *
 * One shape, three aggregations: the period toggle changes the buckets (week / month / year), not
 * the chart. Pure functions, no React and no fetching, so the numbers are testable without a
 * browser.
 */

export type PeriodGrain = 'monthly' | 'yearly' | 'allTime';

export interface TrendPoint {
    label: string;
    /**
     * Where clicking this bar goes: `YYYY-MM` opens that month, `YYYY` opens that year, `null`
     * means the bucket is smaller than any period the page can show (a week).
     */
    key: string | null;
    /**
     * Amounts are `null`, never `0`, for a bucket with nothing in it.
     *
     * recharts renders a gap for null and a floor-hugging bar for zero, and the two mean
     * completely different things: "you filed nothing in March" versus "you filed ₹0 in March".
     */
    approved: number | null;
    pending: number | null;
    rejected: number | null;
    /** Paid-out money. A SUBSET of approved, so it is drawn as a line and never stacked. */
    paid: number | null;
    count: number;
    total: number;
}

export interface StatusSlice {
    name: string;
    value: number;
    count: number;
    /** The status filter this slice maps to, so clicking it can filter the tables. */
    status: number;
    color: string;
}

export interface CategoryBar {
    name: string;
    value: number;
    count: number;
    /** Share of the period's total spend, 0–100. */
    pct: number;
}

const num = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
};

/** The one rule for what an expense is "for". Shared with the records table so both agree. */
export const categoryName = (row: any): string =>
    String(row?.reimbursementType?.type ?? row?.category ?? 'Uncategorised');

const expenseDay = (row: any): Dayjs | null => {
    const d = dayjs(row?.expenseDate);
    return d.isValid() ? d : null;
};

const pointFor = (label: string, key: string | null, bucket: any[]): TrendPoint => {
    if (bucket.length === 0) {
        return { label, key, approved: null, pending: null, rejected: null, paid: null, count: 0, total: 0 };
    }
    const s = summariseReimbursements(bucket);
    return {
        label,
        key,
        approved: s.approvedAmount,
        pending: s.pendingAmount,
        rejected: s.rejectedAmount,
        paid: s.paidAmount,
        count: s.totalRequests,
        total: s.totalAmount,
    };
};

/**
 * The trend, bucketed to match the selected period:
 *   monthly  → Week 1..n of the selected month
 *   yearly   → the twelve months of the selected financial year
 *   allTime  → one bar per year the employee actually filed in
 *
 * `fyStart` is the financial year's first month (April for most Indian orgs). It comes from the
 * org's configured fiscal year rather than being assumed here.
 */
export const buildTrend = (
    rows: any[],
    grain: PeriodGrain,
    anchor: Dayjs,
    fyStart?: Dayjs | null,
): TrendPoint[] => {
    if (grain === 'monthly') {
        // Calendar weeks of the month: days 1-7, 8-14, ... A 28-day February has four, a 31-day
        // month has five. Empty trailing weeks are kept so the month's shape stays honest.
        const weeks = Math.ceil(anchor.daysInMonth() / 7);
        const key = anchor.format('YYYY-MM');
        const buckets: any[][] = Array.from({ length: weeks }, () => []);
        for (const r of rows) {
            const d = expenseDay(r);
            if (!d || d.format('YYYY-MM') !== key) continue;
            const idx = Math.min(weeks - 1, Math.floor((d.date() - 1) / 7));
            buckets[idx].push(r);
        }
        return buckets.map((bucket, i) => pointFor(`Week ${i + 1}`, null, bucket));
    }

    if (grain === 'yearly') {
        const start = fyStart ?? anchor.month(3).startOf('month'); // April, unless told otherwise
        const byMonth = new Map<string, any[]>();
        for (const r of rows) {
            const d = expenseDay(r);
            if (!d) continue;
            const k = d.format('YYYY-MM');
            if (!byMonth.has(k)) byMonth.set(k, []);
            byMonth.get(k)!.push(r);
        }
        return Array.from({ length: 12 }, (_, i) => {
            const m = start.add(i, 'month');
            const k = m.format('YYYY-MM');
            return pointFor(m.format('MMM'), k, byMonth.get(k) ?? []);
        });
    }

    // All time — one bar per year with activity. An unbroken axis back to 2019 would be mostly
    // empty; the years the employee actually filed in are the story.
    const byYear = new Map<string, any[]>();
    for (const r of rows) {
        const d = expenseDay(r);
        if (!d) continue;
        const k = d.format('YYYY');
        if (!byYear.has(k)) byYear.set(k, []);
        byYear.get(k)!.push(r);
    }
    return [...byYear.keys()].sort().map((y) => pointFor(y, y, byYear.get(y)!));
};

/**
 * The lifecycle as a donut. The slices PARTITION the total claimed — paid and awaiting-payment
 * split the approved money between them rather than both counting it, so the ring adds up to the
 * centre figure and to the KPI cards.
 */
export const buildStatusSlices = (rows: any[]): StatusSlice[] => {
    const s = summariseReimbursements(rows);

    const approved = rows.filter((r) => resolveStatusNum(r?.status) === STATUS.APPROVED);
    const paidCount = approved.filter((r) => r?.paymentStatus === 'PAID' || r?.paymentStatus === 'PARTIAL').length;

    const needsInfo = rows.filter((r) => resolveStatusNum(r?.status) === STATUS.NEEDS_INFO);
    const needsInfoAmount = needsInfo.reduce((sum, r) => sum + num(r?.amount), 0);

    return [
        { name: 'Paid', value: s.paidAmount, count: paidCount, status: STATUS.APPROVED, color: '#16a34a' },
        { name: 'Awaiting payment', value: s.remainingAmount, count: approved.length - paidCount, status: STATUS.APPROVED, color: '#2563eb' },
        { name: 'Awaiting approval', value: s.pendingAmount, count: s.pendingCount, status: STATUS.PENDING, color: '#d97706' },
        { name: 'Needs info', value: needsInfoAmount, count: needsInfo.length, status: STATUS.NEEDS_INFO, color: '#b45309' },
        { name: 'Rejected', value: s.rejectedAmount, count: s.rejectedCount, status: STATUS.REJECTED, color: '#dc2626' },
    ].filter((slice) => slice.value > 0);
};

/** Spend by category, biggest first. The caller decides how many to show. */
export const buildCategories = (rows: any[]): { items: CategoryBar[]; total: number } => {
    const byName = new Map<string, { value: number; count: number }>();

    for (const r of rows) {
        const name = categoryName(r);
        const entry = byName.get(name) ?? { value: 0, count: 0 };
        entry.value += num(r?.amount);
        entry.count += 1;
        byName.set(name, entry);
    }

    const total = [...byName.values()].reduce((sum, v) => sum + v.value, 0);
    const items = [...byName.entries()]
        .map(([name, v]) => ({ name, ...v, pct: total > 0 ? (v.value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value);

    return { items, total };
};

export interface CycleTimes {
    /** Submitted → approved, in days. Null when nothing has been approved yet. */
    approval: number | null;
    /** Approved → paid, in days. */
    payment: number | null;
    /** Submitted → paid, in days. Measured end to end, not by adding the two averages above —
     *  they cover different sets of rows, so their sum would be a number nothing experienced. */
    total: number | null;
    /** How many rows each average is drawn from, so a 1-row average can be read as one. */
    approvalCount: number;
    paymentCount: number;
}

const daysBetween = (from: unknown, to: unknown): number | null => {
    const a = dayjs(from as string);
    const b = dayjs(to as string);
    if (!from || !to || !a.isValid() || !b.isValid()) return null;
    const days = b.diff(a, 'hour') / 24;
    return days >= 0 ? days : null;
};

const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : xs.reduce((sum, x) => sum + x, 0) / xs.length;

/** When the money landed. The line's payment relation, falling back to nothing rather than guessing. */
const paidOn = (row: any): string | null => row?.reimbursementPayment?.paymentDate ?? row?.paymentDate ?? null;

/**
 * How long a claim takes to clear, in days.
 *
 * Only rows that reached the stage count towards its average — a pending claim has no approval
 * time, and including it as zero would report the queue as instant.
 */
export const buildCycleTimes = (rows: any[]): CycleTimes => {
    const approvalDays: number[] = [];
    const paymentDays: number[] = [];
    const totalDays: number[] = [];

    for (const row of rows) {
        const submitted = row?.submittedAt ?? row?.batch?.submittedAt ?? null;
        const approved = row?.approvedAt ?? row?.batch?.approvedAt ?? null;
        const paid = paidOn(row);

        if (resolveStatusNum(row?.status) === STATUS.APPROVED) {
            const a = daysBetween(submitted, approved);
            if (a !== null) approvalDays.push(a);
        }
        const p = daysBetween(approved, paid);
        if (p !== null) paymentDays.push(p);
        const t = daysBetween(submitted, paid);
        if (t !== null) totalDays.push(t);
    }

    return {
        approval: mean(approvalDays),
        payment: mean(paymentDays),
        total: mean(totalDays),
        approvalCount: approvalDays.length,
        paymentCount: paymentDays.length,
    };
};

/** How many days a row has been waiting for a decision, or null if it is already decided. */
const daysWaiting = (row: any): number | null => {
    const status = Number(row?.status ?? 0);
    if (status !== 0) return null;
    const sent = row?.submittedAt ?? row?.expenseDate;
    const d = dayjs(sent);
    return d.isValid() ? dayjs().diff(d, 'day') : null;
};

export const STALE_AFTER_DAYS = 14;

/**
 * One sentence that does the interpretation the reader currently does by hand.
 *
 * ONE sentence, not a list — the single most actionable fact, with numbers rather than adjectives
 * ("5 requests worth ₹21,500", not "several pending"). When there is nothing to flag it says the
 * good news, because a strip that appears only on bad news trains people to read its absence as
 * "not loaded yet".
 *
 * Ordered by what the reader can act on: stuck approvals (chase someone), unpaid money (chase
 * finance), rejections (refile), then the good news.
 */
export const buildInsight = (rows: any[]): { icon: string; text: string; tone: 'warn' | 'info' | 'good' } => {
    const s = summariseReimbursements(rows);

    if (s.totalRequests === 0) {
        return { icon: '📄', text: 'No expenses filed for this period yet.', tone: 'info' };
    }

    const stale = rows.filter((r) => (daysWaiting(r) ?? 0) >= STALE_AFTER_DAYS);
    if (stale.length > 0) {
        const amount = stale.reduce((sum, r) => sum + num(r?.amount), 0);
        const oldest = Math.max(...stale.map((r) => daysWaiting(r) ?? 0));
        return {
            icon: '⏳',
            tone: 'warn',
            text: `${stale.length} request${stale.length === 1 ? '' : 's'} worth ${formatINR(amount)} ` +
                `${stale.length === 1 ? 'has' : 'have'} been awaiting approval for more than ` +
                `${STALE_AFTER_DAYS} days — the oldest for ${oldest}.`,
        };
    }

    if (s.remainingAmount > 0) {
        return {
            icon: '💸',
            tone: 'info',
            text: `${formatINR(s.remainingAmount)} has been approved and is awaiting payment.`,
        };
    }

    if (s.pendingCount > 0) {
        return {
            icon: '🕒',
            tone: 'info',
            text: `${s.pendingCount} request${s.pendingCount === 1 ? '' : 's'} worth ` +
                `${formatINR(s.pendingAmount)} ${s.pendingCount === 1 ? 'is' : 'are'} still with your approver.`,
        };
    }

    if (s.rejectedCount > 0) {
        return {
            icon: '⚠',
            tone: 'warn',
            text: `${s.rejectedCount} request${s.rejectedCount === 1 ? '' : 's'} worth ` +
                `${formatINR(s.rejectedAmount)} ${s.rejectedCount === 1 ? 'was' : 'were'} rejected this period.`,
        };
    }

    return {
        icon: '✅',
        tone: 'good',
        text: `All ${s.totalRequests} expense${s.totalRequests === 1 ? '' : 's'} for this period ` +
            `(${formatINR(s.totalAmount)}) have been approved and paid.`,
    };
};
