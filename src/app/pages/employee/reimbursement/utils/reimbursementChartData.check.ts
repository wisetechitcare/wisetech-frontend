/* eslint-disable no-console */
import dayjs from 'dayjs';
import { buildTrend, buildStatusSlices, buildCategoryBars, buildInsight, STALE_AFTER_DAYS } from './reimbursementChartData';
import { summariseReimbursements } from './reimbursementSummary';

/**
 * Runnable self-check for the chart aggregations.
 *
 * The frontend has no test runner (see CHECKLIST → Tests), so this follows the convention already
 * used by `reimbursementDateRange.check.ts`: a plain module with asserts, runnable via
 * `npx tsx <this file>`. It exists because the plan's stated risk for this phase is charts
 * disagreeing with the KPI cards — the one property worth pinning down mechanically.
 *
 *   npx tsx src/app/pages/employee/reimbursement/utils/reimbursementChartData.check.ts
 */

function assert(condition: unknown, message: string): void {
    if (!condition) throw new Error(`FAILED: ${message}`);
    console.log(`  ok · ${message}`);
}

const thisMonth = dayjs().format('YYYY-MM-01');
const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM-01');

const rows = [
    { id: 'a', expenseDate: thisMonth, amount: 1000, status: 1, paymentStatus: 'PAID', reimbursementType: { type: 'Taxi' } },
    { id: 'b', expenseDate: thisMonth, amount: 500, status: 0, paymentStatus: 'UNPAID', reimbursementType: { type: 'Train' } },
    { id: 'c', expenseDate: thisMonth, amount: 250, status: 2, paymentStatus: 'UNPAID', reimbursementType: { type: 'Taxi' } },
    { id: 'd', expenseDate: lastMonth, amount: 400, status: 1, paymentStatus: 'PAID', reimbursementType: { type: 'Bus' } },
];

console.log('\nreimbursementChartData\n');

// ── The headline risk: charts must agree with the KPI cards ──────────────────
const summary = summariseReimbursements(rows);
const slices = buildStatusSlices(rows);
const slicesTotal = slices.reduce((s, x) => s + x.value, 0);
assert(
    slicesTotal === summary.approvedAmount + summary.pendingAmount + summary.rejectedAmount,
    'donut slices sum to the same total the KPI cards report',
);
assert(
    slices.find((s) => s.name === 'Approved')?.value === summary.approvedAmount,
    'the Approved slice equals the Approved KPI exactly',
);

// ── Empty months are gaps, not zeros ─────────────────────────────────────────
const trend = buildTrend(rows);
assert(trend.length === 12, 'the trend always has 12 points, however few months have data');
const empty = trend.find((p) => p.key !== dayjs().format('YYYY-MM') && p.key !== dayjs().subtract(1, 'month').format('YYYY-MM'));
assert(empty?.approved === null, 'a month with no expenses is null, not 0 — recharts draws a gap, not a false floor');
assert(trend[trend.length - 1].key === dayjs().format('YYYY-MM'), 'the trend ends at the current month');

// ── Buckets are keyed on expense date, which is the whole reported bug ───────
const current = trend.find((p) => p.key === dayjs().format('YYYY-MM'))!;
assert(current.approved === 1000, 'this month buckets by expenseDate: 1000 approved');
assert(current.pending === 500, 'this month buckets by expenseDate: 500 pending');
assert(current.rejected === 250, 'this month buckets by expenseDate: 250 rejected');
assert(current.avg === (1000 + 500 + 250) / 3, 'the average line is per expense, not per month');

// A row dated last month must NOT appear in this month's bucket even if it was submitted today.
const crossMonth = [{ id: 'x', expenseDate: lastMonth, submittedAt: thisMonth, amount: 999, status: 1 }];
const crossTrend = buildTrend(crossMonth);
assert(
    crossTrend.find((p) => p.key === dayjs().format('YYYY-MM'))?.approved === null,
    'an expense submitted this month but incurred last month stays in LAST month — the reported bug',
);

// ── Categories: the tail is folded, never dropped ────────────────────────────
const many = Array.from({ length: 9 }, (_, i) => ({
    id: `c${i}`, expenseDate: thisMonth, amount: (9 - i) * 100, status: 1,
    reimbursementType: { type: `Cat${i}` },
}));
const bars = buildCategoryBars(many, 6);
assert(bars.length === 7, 'more categories than the cut produces 6 bars plus an Other');
assert(bars[6].name.startsWith('Other'), 'the overflow bar is named Other and says how many it holds');
assert(
    bars.reduce((s, b) => s + b.value, 0) === many.reduce((s, r) => s + r.amount, 0),
    'category bars total the same as the raw rows — the tail is folded in, not dropped',
);
assert(bars[0].value >= bars[1].value, 'bars are sorted by spend, biggest first');

// ── The insight sentence ─────────────────────────────────────────────────────
const stale = [{
    id: 's', expenseDate: dayjs().subtract(40, 'day').format('YYYY-MM-DD'),
    submittedAt: dayjs().subtract(STALE_AFTER_DAYS + 6, 'day').toISOString(),
    amount: 21500, status: 0, paymentStatus: 'UNPAID',
}];
const staleInsight = buildInsight(stale);
assert(staleInsight.icon === '⏳', 'a stuck approval leads the insight — it is the only actionable thing');
assert(staleInsight.text.includes('21,500'), 'the insight names the number, not an adjective');
assert(staleInsight.tone === 'warn', 'a stuck approval is a warning tone');

const allDone = [{ id: 'p', expenseDate: thisMonth, amount: 700, status: 1, paymentStatus: 'PAID' }];
const goodInsight = buildInsight(allDone);
assert(goodInsight.icon === '✅', 'with nothing outstanding the insight says the good news rather than nothing');
assert(buildInsight([]).text.length > 0, 'an empty period still renders a sentence, never an empty strip');

console.log('\nAll chart-data checks passed.\n');
