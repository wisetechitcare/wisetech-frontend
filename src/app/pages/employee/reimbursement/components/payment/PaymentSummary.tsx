import { SegmentedFilter, type SegmentOption, type SegmentTone } from '@/ds/patterns/segmented-filter';
import { CircleCheck, FileText, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/ds/patterns/stat-card';
import { Skeleton } from '@/ds/ui/skeleton';
import { formatMoney } from '../../utils/reimbursementFormat';
import { PaymentKpis, PaymentState, PAYMENT_STATE_LABEL } from './paymentData';

/**
 * The four numbers, then the status rail.
 *
 * The cards are the design system's `StatCard` (src/ds) — the Storybook benchmark every card
 * follows. This file chooses which four numbers matter and what they are called, and nothing else.
 */

const KPI_GRID = 'grid grid-cols-2 gap-3 xl:grid-cols-4';

export function PaymentKpiCards({ kpis, loading }: { kpis: PaymentKpis; loading?: boolean }) {
    if (loading) {
        return (
            <div className={KPI_GRID} aria-busy="true">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className={KPI_GRID}>
            <StatCard
                label="Pending Payment"
                value={formatMoney(kpis.pendingAmount)}
                hint={kpis.pendingBatches > 0
                    ? `${kpis.pendingBatches} batch${kpis.pendingBatches === 1 ? '' : 'es'}`
                    : 'nothing owed'}
                tone="warning"
                icon={<Wallet aria-hidden />}
            />
            <StatCard
                label="Total Paid"
                value={formatMoney(kpis.paidAmount)}
                hint={`${kpis.settledPct}% settled`}
                tone="success"
                icon={<CircleCheck aria-hidden />}
            />
            <StatCard
                // Not "Pending requests" beside "Pending Payment" — two "pending"s counting different things.
                label="Requests Awaiting Payment"
                value={kpis.pendingRequests}
                hint="approved, not yet paid"
                tone="info"
                icon={<FileText aria-hidden />}
            />
            <StatCard
                label="Employees Awaiting"
                value={kpis.employeesAwaiting}
                hint={kpis.employeesAwaiting === 0 ? 'none' : 'to be paid'}
                tone="brand"
                icon={<Users aria-hidden />}
            />
        </div>
    );
}

/**
 * The status rail — one connected control, three segments, each a filter.
 *
 * Same device as the records rail on the employee screen: a dot for which state, weight and tint
 * for which filter is active, and a seat rule filled to that state's share of the period. Only
 * the three states the backend actually writes appear; there is no "failed" payment in this data
 * model, and inventing one would put a filter on screen that can never match a row.
 */
const STATE_TONE: Record<PaymentState, SegmentTone> = {
    UNPAID: 'danger',
    PARTIAL: 'warning',
    PAID: 'success',
};

export function PaymentStatusRail({
    breakdown,
    value,
    onChange,
}: {
    breakdown: Record<PaymentState, { count: number; amount: number }>;
    value: PaymentState | null;
    onChange: (next: PaymentState | null) => void;
}) {
    const order: PaymentState[] = ['UNPAID', 'PARTIAL', 'PAID'];
    const total = order.reduce((s, k) => s + breakdown[k].count, 0);

    // Count, not amount, on the segment: the amounts are the headline above, and three numbers per
    // segment made the rail unreadable at a glance. The amount stays in the tooltip and accessible name.
    const options: SegmentOption[] = [
        {
            value: 'all', label: 'All', count: total, tone: 'neutral', share: 1,
            detail: formatMoney(order.reduce((s, k) => s + breakdown[k].amount, 0)),
        },
        ...order.map((state) => ({
            value: state,
            label: PAYMENT_STATE_LABEL[state],
            count: breakdown[state].count,
            tone: STATE_TONE[state],
            share: total > 0 ? breakdown[state].count / total : 0,
            detail: formatMoney(breakdown[state].amount),
        })),
    ];

    return (
        <SegmentedFilter
            aria-label="Filter the payment queue by status"
            options={options}
            value={value ?? 'all'}
            showShare
            // It sits in the table's filter row beside 40px controls (search, Filters): one height.
            className="h-10"
            onValueChange={(v) => onChange(v === 'all' || v === value ? null : (v as PaymentState))}
        />
    );
}
