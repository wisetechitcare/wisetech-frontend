/* eslint-disable no-console */
import dayjs from 'dayjs';
import { buildTrend, buildStatusSlices, buildCategories, buildInsight, buildCycleTimes, STALE_AFTER_DAYS } from './reimbursementChartData';
import { summariseReimbursements } from './reimbursementSummary';

/**
 * Runnable self-check for the chart aggregations.
 *
 * The frontend has no test runner (see CHECKLIST → Tests), so this follows the convention already
 * used by `reimbursementDateRange.check.ts`: a plain module with asserts, runnable via
 * `npx tsx <this file>`. It exists because the stated risk is charts disagreeing with the KPI
 * cards — the one property worth pinning down mechanically — and now also that the three period
 * grains bucket into the right axis.
 *
 *   npx tsx src/app/pages/employee/reimbursement/utils/reimbursementChartData.check.ts
 */

function assert(condition: unknown, message: string): void {
    if (!condition) throw new Error(`FAILED: ${message}`);
    console.log(`  ok · ${message}`);
}

const anchor = dayjs('2026-08-01');
const d = (day: string) => `2026-08-${day}`;

const rows = [
    { id: 'a', expenseDate: d('03'), amount: 1000, status: 1, paymentStatus: 'PAID', reimbursementType: { type: 'Taxi' } },
    { id: 'b', expenseDate: d('09'), amount: 500, status: 0, paymentStatus: 'UNPAID', reimbursementType: { type: 'Train' } },
    { id: 'c', expenseDate: d('27'), amount: 250, status: 2, paymentStatus: 'UNPAID', reimbursementType: { type: 'Taxi' } },
    { id: 'e', expenseDate: d('28'), amount: 800, status: 1, paymentStatus: 'UNPAID', reimbursementType: { type: 'Bus' } },
    { id: 'f', expenseDate: '2026-05-04', amount: 400, status: 1, paymentStatus: 'PAID', reimbursementType: { type: 'Bus' } },
    { id: 'g', expenseDate: '2025-11-04', amount: 300, status: 3, paymentStatus: null, reimbursementType: { type: 'Food' } },
];

console.log('\nreimbursementChartData\n');

// ── The headline risk: charts must agree with the KPI cards ──────────────────
const summary = summariseReimbursements(rows);
const slices = buildStatusSlices(rows);
const slicesTotal = slices.reduce((s, x) => s + x.value, 0);
assert(
    slicesTotal === summary.totalAmount,
    'the donut partitions the WHOLE claimed total — paid + awaiting payment + pending + needs info + rejected',
);
assert(
    (slices.find((s) => s.name === 'Paid')?.value ?? 0) === summary.paidAmount,
    'the Paid slice equals the Paid Out KPI exactly',
);
assert(
    (slices.find((s) => s.name === 'Paid')?.value ?? 0) + (slices.find((s) => s.name === 'Awaiting payment')?.value ?? 0)
    === summary.approvedAmount,
    'paid and awaiting payment split the approved money instead of both counting it',
);
assert(slices.find((s) => s.name === 'Needs info')?.value === 300, 'needs-info is its own slice, not silently dropped');

// ── Monthly grain buckets into the weeks of the selected month ───────────────
const weekly = buildTrend(rows, 'monthly', anchor);
assert(weekly.length === 5, 'a 31-day month has five week buckets');
assert(weekly[0].label === 'Week 1' && weekly[4].label === 'Week 5', 'weeks are labelled Week 1..n');
assert(weekly[0].approved === 1000, 'day 3 lands in Week 1');
assert(weekly[1].pending === 500, 'day 9 lands in Week 2');
assert(weekly[3].rejected === 250 && weekly[3].approved === 800, 'days 27-28 land in Week 4');
assert(weekly[2].approved === null, 'a week with nothing is null, not 0 — recharts draws a gap, not a false floor');
assert(weekly.every((p) => p.key === null), 'a week is not a period the page can open, so it has no nav key');
assert(
    weekly.reduce((s, p) => s + (p.total ?? 0), 0) === 1000 + 500 + 250 + 800,
    'the weeks total August only — May and last November stay out of the selected month',
);

// ── Yearly grain buckets into the twelve months of the financial year ────────
const monthly = buildTrend(rows, 'yearly', anchor, dayjs('2026-04-01'));
assert(monthly.length === 12, 'the FY axis always has twelve months, however few have data');
assert(monthly[0].label === 'Apr' && monthly[11].label === 'Mar', 'the FY runs Apr → Mar');
assert(monthly[1].approved === 400, 'the May expense buckets into May');
assert(monthly[4].total === 2550, 'August holds all four August rows');
assert(monthly[4].key === '2026-08', 'a month bucket carries the key that opens that month');
assert(monthly[0].approved === null, 'an empty month is a gap');

// ── All time buckets by year, and only years with activity ───────────────────
const yearly = buildTrend(rows, 'allTime', anchor);
assert(yearly.length === 2, 'only the years the employee actually filed in get a bar');
assert(yearly[0].label === '2025' && yearly[1].label === '2026', 'years run oldest first');
assert(yearly[1].total === 2950, '2026 totals its four August rows plus May');
assert(yearly[0].key === '2025', 'a year bucket carries the key that opens that year');

// ── Buckets are keyed on expense date, which is the whole reported bug ───────
const crossMonth = [{ id: 'x', expenseDate: '2026-07-30', submittedAt: '2026-08-02', amount: 999, status: 1 }];
assert(
    buildTrend(crossMonth, 'monthly', anchor).every((p) => p.approved === null),
    'an expense submitted in August but incurred in July stays out of August — the reported bug',
);

// ── Categories: sorted, complete, and carrying their share ───────────────────
const { items, total } = buildCategories(rows);
assert(items[0].value >= items[1].value, 'categories are sorted by spend, biggest first');
assert(items.reduce((s, c) => s + c.value, 0) === total, 'the categories total the raw rows — nothing is dropped');
assert(total === summary.totalAmount, 'the category total equals the KPI total');
assert(Math.round(items.reduce((s, c) => s + c.pct, 0)) === 100, 'the percentages add to 100');
assert(buildCategories([]).items.length === 0, 'no rows means no categories, and the caller renders an empty state');

// ── Cycle times: only rows that reached a stage count towards its average ────
const cycled = [
    // submitted → approved in 2 days, approved → paid in 3 more.
    {
        id: 'p1', status: 1, amount: 100,
        submittedAt: '2026-08-01T09:00:00Z', approvedAt: '2026-08-03T09:00:00Z',
        reimbursementPayment: { paymentDate: '2026-08-06T09:00:00Z' },
    },
    // submitted → approved in 4 days, not paid yet.
    { id: 'p2', status: 1, amount: 100, submittedAt: '2026-08-01T09:00:00Z', approvedAt: '2026-08-05T09:00:00Z' },
    // still pending — no approval time at all, and must not count as zero.
    { id: 'p3', status: 0, amount: 100, submittedAt: '2026-08-01T09:00:00Z' },
];
const cycle = buildCycleTimes(cycled);
assert(cycle.approval === 3, 'approval time averages the two approved rows (2 and 4 days), ignoring the pending one');
assert(cycle.approvalCount === 2, 'a pending claim contributes no approval time — counting it as 0 would report the queue as instant');
assert(cycle.payment === 3, 'payment time measures approved → paid, over the rows that were actually paid');
assert(cycle.total === 5, 'total processing is measured end to end, not by adding the two averages');
assert(buildCycleTimes([]).approval === null, 'no data reads as em dash, not 0.0 days');
assert(
    buildCycleTimes([{ id: 'x', status: 1, submittedAt: '2026-08-09T09:00:00Z', approvedAt: '2026-08-01T09:00:00Z' }]).approval === null,
    'an approval dated before its submission is dropped rather than reported as negative days',
);

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

const allDone = [{ id: 'p', expenseDate: d('01'), amount: 700, status: 1, paymentStatus: 'PAID' }];
assert(buildInsight(allDone).icon === '✅', 'with nothing outstanding the insight says the good news rather than nothing');
assert(buildInsight([]).text.length > 0, 'an empty period still renders a sentence, never an empty strip');

console.log('\nAll chart-data checks passed.\n');
