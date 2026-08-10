import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import YearlyKpiCard from '@pages/employee/salary/personal/views/my-salary/Toggle/components/salary/YearlyKpiCard';
import { SkeletonKpiCard } from '@app/modules/common/components/Skeleton';
import PaymentProgressCard from '@pages/employee/salary/personal/views/my-salary/Toggle/components/salary/PaymentProgressCard';
import { formatINR } from '../utils/reimbursementFormat';

/**
 * The KPI row: four cards.
 *
 * There were ten values here, rendered as ten tiles — five count/amount pairs split apart, so
 * "24 approved" and "₹98,000 approved" sat in different boxes and the reader had to pair them up.
 * `YearlyKpiCard` already renders a value with a footer strip beneath it, so each pair collapses
 * into a single card and the row halves in width without losing a number.
 *
 * The card component, its tones and its shell come from the salary module unchanged — this file
 * chooses which four numbers matter and what they are called, and nothing else.
 *
 * Card order is deliberate: it follows an expense's life. Submitted → Approved → Awaiting →
 * Paid Out. "Awaiting You" carries the action badge because it is the only card the employee can
 * do anything about.
 */

export interface ReimbursementKpis {
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

const KPI_GRID = {
    display: 'grid',
    gap: 1.25,
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
} as const;

export default function ReimbursementKpiRow({
    kpis,
    loading = false,
    showSensitiveData = true,
}: ReimbursementKpiRowProps) {
    if (loading) {
        return (
            <Box sx={KPI_GRID}>
                {[0, 1, 2, 3].map((i) => <SkeletonKpiCard key={i} />)}
            </Box>
        );
    }

    // Percentages are only meaningful against a non-zero base, and "NaN%" on a fresh account is
    // a worse answer than no percentage at all.
    const approvedPct = kpis.totalAmount > 0
        ? Math.round((kpis.approvedAmount / kpis.totalAmount) * 100)
        : null;

    return (
        <Box sx={KPI_GRID}>
            <YearlyKpiCard
                label="Submitted"
                value={formatINR(kpis.totalAmount)}
                footer={`${kpis.totalRequests} request${kpis.totalRequests === 1 ? '' : 's'}`}
                tone="blue"
                icon={<KTIcon iconName="document" className="fs-4" />}
                showSensitiveData={showSensitiveData}
            />
            <YearlyKpiCard
                label="Approved"
                value={formatINR(kpis.approvedAmount)}
                footer={approvedPct === null
                    ? `${kpis.approvedCount} approved`
                    : `${kpis.approvedCount} approved · ${approvedPct}%`}
                tone="green"
                icon={<KTIcon iconName="check-circle" className="fs-4" />}
                showSensitiveData={showSensitiveData}
            />
            <YearlyKpiCard
                label="Awaiting approval"
                value={formatINR(kpis.pendingAmount)}
                footer={`${kpis.pendingCount} pending`}
                // The badge appears only when there is something to act on. A permanent badge is
                // decoration; a conditional one is a signal.
                badge={kpis.pendingCount > 0 ? 'Awaiting approver' : undefined}
                tone="amber"
                icon={<KTIcon iconName="time" className="fs-4" />}
                showSensitiveData={showSensitiveData}
            />
            <YearlyKpiCard
                label="Paid out"
                value={formatINR(kpis.paidAmount)}
                footer={`of ${formatINR(kpis.approvedAmount)} approved`}
                tone="purple"
                icon={<KTIcon iconName="wallet" className="fs-4" />}
                showSensitiveData={showSensitiveData}
            />
        </Box>
    );
}

/**
 * "₹76,000 of ₹98,000 approved has been paid."
 *
 * The four cards answer "how much", one number at a time. This answers the question people
 * actually arrive with — am I owed anything, and how much of it is still coming — which the
 * cards can only express by making the reader divide one by another.
 *
 * `PaymentProgressCard` already existed in the salary module with ZERO callers: finished,
 * reviewed, and never wired to anything. Adopting it beat writing a second one.
 */
export function ReimbursementPaymentProgress({
    approvedAmount,
    paidAmount,
    periodLabel,
}: {
    approvedAmount: number;
    paidAmount: number;
    periodLabel?: string;
}) {
    // Nothing approved means nothing to be owed — a 0% bar would read as "you have been paid
    // nothing", which is a different and alarming statement.
    if (!approvedAmount || approvedAmount <= 0) return null;

    const percentPaid = Math.round((paidAmount / approvedAmount) * 100);
    const remaining = Math.max(0, approvedAmount - paidAmount);

    return (
        <PaymentProgressCard
            title="Reimbursement paid"
            subtitle={periodLabel ? `Approved expenses, ${periodLabel}` : 'Approved expenses'}
            percentPaid={percentPaid}
            paidAmount={formatINR(paidAmount)}
            remainingAmount={formatINR(remaining)}
        />
    );
}
