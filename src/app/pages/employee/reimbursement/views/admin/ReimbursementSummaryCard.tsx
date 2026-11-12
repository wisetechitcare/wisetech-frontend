import type { ReactNode } from 'react';
import { CircleCheck, CircleX, Clock, HandCoins, Hourglass, Wallet } from 'lucide-react';
import { StatCard } from '@/ds/patterns/stat-card';
import { Skeleton } from '@/ds/ui/skeleton';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { formatMoney } from '../../utils/reimbursementFormat';

interface ReimbursementSummaryCardProps {
  totalRequestAmount?: number;
  totalApprovedAmount?: number;
  totalPendingAmount?: number;
  totalRejectedAmount?: number;
  totalPaidAmount?: number;
  totalRemainingAmount?: number;
  isLoading?: boolean;
}

/** 2 across on phones, 3 on tablets, all six in one row on wide screens. */
const KPI_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6';

/**
 * The six period totals on Reimbursement Details — on the design system's `StatCard`, the card the
 * Payment and My Reimbursements tabs use, so the three tabs read as one product.
 *
 * Labels are the status alone ("Approved"), the context is the hint ("all approved requests"): the old
 * "TOTAL APPROVED AMOUNT" labels wrapped onto three lines six cards across. Tones follow the charts
 * beside them — approved green, awaiting amber, rejected red, paid blue.
 *
 * Every figure follows the page's "Show amounts" eye, as before.
 */
export default function ReimbursementSummaryCard({
  totalRequestAmount = 0,
  totalApprovedAmount = 0,
  totalPendingAmount = 0,
  totalRejectedAmount = 0,
  totalPaidAmount = 0,
  totalRemainingAmount = 0,
  isLoading = false,
}: ReimbursementSummaryCardProps) {
  const sensitive = useSensitiveData();

  if (isLoading) {
    return (
      <div className={KPI_GRID} aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }

  // The headline in the card's own tone; hidden, it blurs to a coloured smudge that still says which card is which.
  const headline = (n: number): ReactNode => (
    <span className={`${sensitive.cls} text-[1.6rem] font-extrabold tracking-tight text-(--tone-ink)`}>{formatMoney(n)}</span>
  );

  return (
    <div className={KPI_GRID}>
      <StatCard label="Requested" value={headline(totalRequestAmount)} hint="All Requests Combined" tone="brand" icon={<HandCoins aria-hidden />} />
      <StatCard label="Approved" value={headline(totalApprovedAmount)} hint="All Approved Requests" tone="success" icon={<CircleCheck aria-hidden />} />
      <StatCard label="Pending Approval" value={headline(totalPendingAmount)} hint="Awaiting a Decision" tone="warning" icon={<Clock aria-hidden />} />
      <StatCard label="Paid" value={headline(totalPaidAmount)} hint="Payments Disbursed" tone="info" icon={<Wallet aria-hidden />} />
      <StatCard label="Remaining" value={headline(totalRemainingAmount)} hint="Approved, Not Yet Paid" tone="purple" icon={<Hourglass aria-hidden />} />
      <StatCard label="Rejected" value={headline(totalRejectedAmount)} hint="All Rejected Requests" tone="danger" icon={<CircleX aria-hidden />} />
    </div>
  );
}
