import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import YearlyKpiCard from '@pages/employee/salary/personal/views/my-salary/Toggle/components/salary/YearlyKpiCard';
import { SkeletonKpiCard } from '@app/modules/common/components/Skeleton';
import { formatMoney } from '../utils/reimbursementFormat';

/**
 * The KPI row: four cards — Drafts → Pending approval → Approved → Paid out.
 *
 * Pending approval uses a ratio layout (awaiting / submitted) so amount and count stay aligned
 * with the records table total.
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

const KPI_GRID = {
    display: 'grid',
    gap: 1.25,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
} as const;

/** Hero: awaiting ₹ / submitted ₹. Footer: awaiting count / submitted count. */
function pendingApprovalDisplay(kpis: ReimbursementKpis): {
    value: string;
    footer: string;
    footerValue?: string;
} {
    if (kpis.totalRequests === 0) {
        return {
            value: formatMoney(0),
            footer: 'No submissions this period',
        };
    }

    return {
        value: `${formatMoney(kpis.pendingAmount)} / ${formatMoney(kpis.totalAmount)}`,
        footer: `${kpis.pendingCount} / ${kpis.totalRequests} awaiting approval`,
    };
}

function approvedDisplay(kpis: ReimbursementKpis): {
    value: string;
    footer: string;
    footerValue?: string;
} {
    if (kpis.totalRequests === 0) {
        return { value: formatMoney(0), footer: 'No submissions this period' };
    }
    if (kpis.approvedCount === 0) {
        return { value: formatMoney(0), footer: 'None approved yet' };
    }

    return {
        value: `${formatMoney(kpis.approvedAmount)} / ${formatMoney(kpis.totalAmount)}`,
        footer: `${kpis.approvedCount} / ${kpis.totalRequests} approved`,
    };
}

function paidDisplay(kpis: ReimbursementKpis): {
    value: string;
    footer: string;
    footerValue?: string;
} {
    if (kpis.approvedAmount === 0) {
        return { value: formatMoney(0), footer: 'No approved balance yet' };
    }

    const unpaid = Math.max(0, kpis.approvedAmount - kpis.paidAmount);
    return {
        value: `${formatMoney(kpis.paidAmount)} / ${formatMoney(kpis.approvedAmount)}`,
        footer: kpis.paidAmount === 0
            ? `Awaiting payout · ${formatMoney(unpaid)} unpaid`
            : `${formatMoney(unpaid)} still unpaid`,
    };
}

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

    const pending = pendingApprovalDisplay(kpis);
    const approved = approvedDisplay(kpis);
    const paid = paidDisplay(kpis);

    const draftsFooter =
        kpis.inboxCount === 0
            ? 'Nothing to submit'
            : `${kpis.inboxCount} to submit`;

    return (
        <Box sx={KPI_GRID}>
            <YearlyKpiCard
                label="Unsubmitted drafts"
                value={formatMoney(kpis.inboxAmount)}
                footer={draftsFooter}
                tone="info"
                icon={<KTIcon iconName="inbox" className="fs-4" />}
                showSensitiveData={showSensitiveData}
                sx={{
                    '& > div > span.sensitive-data-visible, & > div > span.sensitive-data-hidden': {
                        fontSize: { xs: '1.25rem', md: '1.45rem' },
                    },
                }}
            />
            <YearlyKpiCard
                label="Pending approval"
                value={pending.value}
                footer={pending.footer}
                tone="amber"
                icon={<KTIcon iconName="time" className="fs-4" />}
                showSensitiveData={showSensitiveData}
                sx={{
                    '& > div > span.sensitive-data-visible, & > div > span.sensitive-data-hidden': {
                        fontSize: { xs: '1.1rem', md: '1.35rem' },
                    },
                }}
            />
            <YearlyKpiCard
                label="Approved"
                value={approved.value}
                footer={approved.footer}
                tone="green"
                icon={<KTIcon iconName="check-circle" className="fs-4" />}
                showSensitiveData={showSensitiveData}
                sx={{
                    '& > div > span.sensitive-data-visible, & > div > span.sensitive-data-hidden': {
                        fontSize: { xs: '1.1rem', md: '1.35rem' },
                    },
                }}
            />
            <YearlyKpiCard
                label="Paid out"
                value={paid.value}
                footer={paid.footer}
                tone="purple"
                icon={<KTIcon iconName="wallet" className="fs-4" />}
                showSensitiveData={showSensitiveData}
                sx={{
                    '& > div > span.sensitive-data-visible, & > div > span.sensitive-data-hidden': {
                        fontSize: { xs: '1.1rem', md: '1.35rem' },
                    },
                }}
            />
        </Box>
    );
}
