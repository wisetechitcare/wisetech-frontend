import type { ReactNode } from 'react';
import { CircleCheck, Clock, Inbox, Wallet } from 'lucide-react';
import { StatCard } from '@/ds/patterns/stat-card';
import { Skeleton } from '@/ds/ui/skeleton';
import { formatMoney } from '../utils/reimbursementFormat';

/**
 * The KPI row: four cards — Drafts → Pending approval → Approved → Paid out — on the design
 * system's `StatCard` (src/ds).
 *
 * The headline is one amount; its context ("of ₹x", counts, what is still unpaid) is the hint. A
 * "₹a / ₹b" headline wrapped onto two lines in a card this narrow, and a compact card would cut it
 * off — a truncated amount is a wrong amount.
 *
 * Every amount, headline and hint alike, carries the sensitive-data class, so "Show amounts" off
 * hides all of them. The old cards blurred the headline but left "₹0.00 still unpaid" readable.
 */

export interface ReimbursementKpis {
    inboxAmount: number;
    inboxCount: number;
    totalAmount: number;
    totalRequests: number;
    approvedAmount: number;
    approvedCount: number;
    pendingAmount: number;
    pendingCount: number;
    paidAmount: number;
}

interface ReimbursementKpiRowProps {
    kpis: ReimbursementKpis;
    loading?: boolean;
    showSensitiveData?: boolean;
}

const KPI_GRID = 'grid grid-cols-2 gap-3 lg:grid-cols-4';

export default function ReimbursementKpiRow({
    kpis,
    loading = false,
    showSensitiveData = true,
}: ReimbursementKpiRowProps) {
    if (loading) {
        return (
            <div className={KPI_GRID} aria-busy="true">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
        );
    }

    const cls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';
    const money = (n: number): ReactNode => <span className={cls}>{formatMoney(n)}</span>;
    // The headline in the card's own tone, as the old cards had it: hidden, it blurs to a coloured
    // smudge that still says which card is which, rather than a grey box.
    const headline = (n: number): ReactNode => (
        <span className={`${cls} text-(--tone-ink)`}>{formatMoney(n)}</span>
    );
    const none = kpis.totalRequests === 0;
    const unpaid = Math.max(0, kpis.approvedAmount - kpis.paidAmount);

    return (
        <div className={KPI_GRID}>
            <StatCard
                label="Unsubmitted drafts"
                value={headline(kpis.inboxAmount)}
                hint={kpis.inboxCount === 0 ? 'Nothing to submit' : `${kpis.inboxCount} to submit`}
                tone="info"
                icon={<Inbox aria-hidden />}
            />
            <StatCard
                label="Pending approval"
                value={headline(none ? 0 : kpis.pendingAmount)}
                hint={none
                    ? 'No submissions this period'
                    : <>of {money(kpis.totalAmount)} · {kpis.pendingCount} / {kpis.totalRequests} awaiting</>}
                tone="warning"
                icon={<Clock aria-hidden />}
            />
            <StatCard
                label="Approved"
                value={headline(none ? 0 : kpis.approvedAmount)}
                hint={none
                    ? 'No submissions this period'
                    : kpis.approvedCount === 0
                        ? 'None approved yet'
                        : <>of {money(kpis.totalAmount)} · {kpis.approvedCount} / {kpis.totalRequests} approved</>}
                tone="success"
                icon={<CircleCheck aria-hidden />}
            />
            <StatCard
                label="Paid out"
                value={headline(kpis.approvedAmount === 0 ? 0 : kpis.paidAmount)}
                hint={kpis.approvedAmount === 0
                    ? 'No approved balance yet'
                    : <>of {money(kpis.approvedAmount)} · {money(unpaid)} unpaid</>}
                tone="brand"
                icon={<Wallet aria-hidden />}
            />
        </div>
    );
}
