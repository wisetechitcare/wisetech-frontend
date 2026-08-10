import dayjs from 'dayjs';
import { summariseReimbursements } from './reimbursementSummary';
import { formatINR } from './reimbursementFormat';

/**
 * Chart data, derived from the rows the page already has.
 *
 * The plan's risk table says charts and KPI cards must read the same aggregation or they will
 * disagree. This goes one step further: both are computed from the SAME in-memory rows by the
 * SAME `summariseReimbursements` used everywhere else, so disagreement is not merely unlikely,
 * it is unrepresentable. A second endpoint would have been the thing that creates the drift the
 * mitigation is worried about.
 *
 * Every bucket is keyed on `expenseDate` — when the money was spent. Bucketing on submission
 * date is the original reported bug (65 expenses under the wrong month, 129 invisible in their
 * own), and a chart is where a wrong month is least likely to be noticed and most likely to be
 * believed.
 *
 * Pure functions with no React and no fetching, so the numbers are testable without a browser.
 */

export interface TrendPoint {
    month: string;
    /** Sort/navigation key — `YYYY-MM`, the month the expenses were INCURRED. */
    key: string;
    /**
     * Amounts are `null`, never `0`, for a month with no expenses.
     *
     * recharts renders a gap for null and a floor-hugging bar for zero, and the two mean
     * completely different things: "you filed nothing in March" versus "you filed ₹0 in March".
     * This is the salary module's existing convention (MonthlySalaryComparison).
     */
    approved: number | null;
    pending: number | null;
    rejected: number | null;
    avg: number | null;
}

export interface StatusSlice {
    name: string;
    value: number;
    count: number;
    /** The status filter this slice maps to, so clicking it can filter the table. */
    status: number;
    color: string;
}

export interface CategoryBar {
    name: string;
    value: number;
    count: number;
}

const num = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
};

/** Rows for one calendar month, keyed on when the money was spent. */
const inMonth = (rows: any[], key: string): any[] =>
    rows.filter((r) => dayjs(r?.expenseDate).isValid() && dayjs(r.expenseDate).format('YYYY-MM') === key);

/**
 * Twelve months ending at `endMonth` inclusive.
 *
 * Always twelve points, even when the employee filed in three of them — a trend that silently
 * drops empty months compresses the x-axis and makes a quiet year look busy.
 */
export const buildTrend = (rows: any[], endMonth: dayjs.Dayjs = dayjs()): TrendPoint[] => {
    const points: TrendPoint[] = [];

    for (let back = 11; back >= 0; back -= 1) {
        const m = endMonth.subtract(back, 'month');
        const key = m.format('YYYY-MM');
        const monthRows = inMonth(rows, key);

        if (monthRows.length === 0) {
            points.push({ month: m.format('MMM'), key, approved: null, pending: null, rejected: null, avg: null });
            continue;
        }

        const s = summariseReimbursements(monthRows);
        points.push({
            month: m.format('MMM'),
            key,
            approved: s.approvedAmount,
            pending: s.pendingAmount,
            rejected: s.rejectedAmount,
            // Average per expense, not per month — "you typically claim ₹X at a time" is the
            // useful reading, and it is the one an employee can act on.
            avg: s.totalRequests > 0 ? s.totalAmount / s.totalRequests : null,
        });
    }

    return points;
};

/** The three decision states, as a donut. Empty states are dropped rather than drawn as slivers. */
export const buildStatusSlices = (rows: any[]): StatusSlice[] => {
    const s = summariseReimbursements(rows);
    return [
        { name: 'Approved', value: s.approvedAmount, count: s.approvedCount, status: 1, color: '#16a34a' },
        { name: 'Pending', value: s.pendingAmount, count: s.pendingCount, status: 0, color: '#d97706' },
        { name: 'Rejected', value: s.rejectedAmount, count: s.rejectedCount, status: 2, color: '#dc2626' },
    ].filter((slice) => slice.value > 0);
};

/**
 * Top categories by spend.
 *
 * Everything past the cut is folded into "Other" rather than dropped — a bar chart that silently
 * omits a tail reads as a complete breakdown and its total does not match the KPI card.
 */
export const buildCategoryBars = (rows: any[], top = 6): CategoryBar[] => {
    const byName = new Map<string, { value: number; count: number }>();

    for (const r of rows) {
        const name = String(r?.reimbursementType?.type ?? r?.category ?? 'Uncategorised');
        const entry = byName.get(name) ?? { value: 0, count: 0 };
        entry.value += num(r?.amount);
        entry.count += 1;
        byName.set(name, entry);
    }

    const all = [...byName.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.value - a.value);

    if (all.length <= top) return all;

    const head = all.slice(0, top);
    const tail = all.slice(top);
    head.push({
        name: `Other (${tail.length})`,
        value: tail.reduce((sum, c) => sum + c.value, 0),
        count: tail.reduce((sum, c) => sum + c.count, 0),
    });
    return head;
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
 * Rules from the plan, and they are the whole design: ONE sentence, not a list — pick the single
 * most actionable fact. Name numbers, never adjectives ("5 requests worth ₹21,500", not "several
 * pending"). And if there is nothing worth flagging, say the good news rather than render an
 * empty strip, because a strip that appears only when something is wrong trains people to read
 * its absence as "not loaded yet".
 *
 * Ordered by what the reader can actually do something about: stuck approvals first (chase
 * someone), then unpaid money (chase finance), then rejections (refile), then the good news.
 */
export const buildInsight = (rows: any[]): { icon: string; text: string; tone: 'warn' | 'info' | 'good' } => {
    const s = summariseReimbursements(rows);

    if (s.totalRequests === 0) {
        return { icon: '📄', text: 'No expenses filed for this period yet.', tone: 'info' };
    }

    // 1. Stuck in approval — the only thing here that a human is actively sitting on.
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

    // 2. Approved but unpaid. Nobody is blocking it; it is simply owed.
    if (s.remainingAmount > 0) {
        return {
            icon: '💸',
            tone: 'info',
            text: `${formatINR(s.remainingAmount)} has been approved and is awaiting payment.`,
        };
    }

    // 3. Pending, but not yet stale — worth stating so the reader knows it is moving.
    if (s.pendingCount > 0) {
        return {
            icon: '🕒',
            tone: 'info',
            text: `${s.pendingCount} request${s.pendingCount === 1 ? '' : 's'} worth ` +
                `${formatINR(s.pendingAmount)} ${s.pendingCount === 1 ? 'is' : 'are'} still with your approver.`,
        };
    }

    // 4. Rejections, once nothing is outstanding — actionable as a refile.
    if (s.rejectedCount > 0) {
        return {
            icon: '⚠',
            tone: 'warn',
            text: `${s.rejectedCount} request${s.rejectedCount === 1 ? '' : 's'} worth ` +
                `${formatINR(s.rejectedAmount)} ${s.rejectedCount === 1 ? 'was' : 'were'} rejected this period.`,
        };
    }

    // 5. The good news, said out loud.
    return {
        icon: '✅',
        tone: 'good',
        text: `All ${s.totalRequests} expense${s.totalRequests === 1 ? '' : 's'} for this period ` +
            `(${formatINR(s.totalAmount)}) have been approved and paid.`,
    };
};
