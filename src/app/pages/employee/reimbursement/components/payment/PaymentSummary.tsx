import { Box, ButtonBase, alpha } from '@mui/material';
import { CircleCheck, FileText, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/ds/patterns/stat-card';
import { Skeleton } from '@/ds/ui/skeleton';
import { formatMoney, PAYMENT_TONE } from '../../utils/reimbursementFormat';
import { PaymentKpis, PaymentState, PAYMENT_STATE_LABEL } from './paymentData';

/**
 * The four numbers, then the status rail.
 *
 * The cards are the design system's `StatCard` (src/ds) — the Storybook benchmark every card
 * follows. This file chooses which four numbers matter and what they are called, and nothing else.
 */

const KPI_GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4';

export function PaymentKpiCards({ kpis, loading }: { kpis: PaymentKpis; loading?: boolean }) {
    if (loading) {
        return (
            <div className={KPI_GRID} aria-busy="true">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className={KPI_GRID}>
            <StatCard
                label="Pending payment"
                value={formatMoney(kpis.pendingAmount)}
                hint={kpis.pendingBatches > 0
                    ? `${kpis.pendingBatches} batch${kpis.pendingBatches === 1 ? '' : 'es'}`
                    : 'nothing owed'}
                tone="warning"
                icon={<Wallet aria-hidden />}
            />
            <StatCard
                label="Total paid"
                value={formatMoney(kpis.paidAmount)}
                hint={`${kpis.settledPct}% settled`}
                tone="success"
                icon={<CircleCheck aria-hidden />}
            />
            <StatCard
                label="Pending requests"
                value={kpis.pendingRequests}
                hint="awaiting payment"
                tone="info"
                icon={<FileText aria-hidden />}
            />
            <StatCard
                label="Employees awaiting"
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
    const allSelected = value === null;

    const segment = (
        key: string,
        label: string,
        count: number,
        amount: number,
        selected: boolean,
        color: string,
        share: number,
        onClick: () => void,
    ) => (
        <ButtonBase
            key={key}
            onClick={onClick}
            aria-pressed={selected}
            title={`${count} ${count === 1 ? 'batch' : 'batches'} · ${formatMoney(amount)}`}
            aria-label={`${label}, ${count} ${count === 1 ? 'batch' : 'batches'}, ${formatMoney(amount)}`}
            sx={(theme) => {
                const dark = theme.palette.mode === 'dark';
                return {
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    flex: '0 0 auto',
                    px: 1.5,
                    height: '100%',
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                    lineHeight: 1,
                    color: selected ? color : 'text.secondary',
                    bgcolor: selected ? alpha(color, dark ? 0.2 : 0.1) : 'transparent',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    '&:first-of-type': { borderLeft: 0 },
                    transition: 'background-color 150ms ease, color 150ms ease',
                    '&:hover': { bgcolor: selected ? alpha(color, dark ? 0.26 : 0.14) : 'action.hover' },
                    '&.Mui-focusVisible': { outline: `2px solid ${color}`, outlineOffset: '-2px' },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                };
            }}
        >
            <Box aria-hidden sx={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                bgcolor: color, opacity: count === 0 && !selected ? 0.35 : 1,
            }} />
            <Box component="span" sx={{ fontWeight: selected ? 700 : 600 }}>{label}</Box>
            {/* Count, not amount. The amounts are already the headline above; repeating them here
                made every segment three numbers wide and the rail unreadable at a glance. The
                amount stays in the tooltip and the aria-label for anyone who needs it. */}
            <Box component="span" sx={{
                fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                color: selected ? 'inherit' : 'text.primary',
                opacity: count === 0 && !selected ? 0.4 : 1,
            }}>
                {count}
            </Box>

            <Box aria-hidden sx={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
                bgcolor: alpha(color, 0.14),
            }}>
                <Box sx={{
                    height: '100%', width: `${Math.round(share * 100)}%`, bgcolor: color,
                    opacity: selected ? 1 : 0.6,
                    transition: 'width 250ms ease, opacity 150ms ease',
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }} />
            </Box>
        </ButtonBase>
    );

    return (
        <Box
            role="group"
            aria-label="Filter the payment queue by status"
            sx={{
                display: 'flex',
                alignItems: 'stretch',
                height: 32,
                maxWidth: '100%',
                width: 'fit-content',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            {segment(
                'all', 'All',
                total,
                order.reduce((s, k) => s + breakdown[k].amount, 0),
                allSelected, '#475569', 1,
                () => onChange(null),
            )}
            {order.map((state) =>
                segment(
                    state,
                    PAYMENT_STATE_LABEL[state],
                    breakdown[state].count,
                    breakdown[state].amount,
                    value === state,
                    PAYMENT_TONE[state]?.color ?? '#475569',
                    total > 0 ? breakdown[state].count / total : 0,
                    () => onChange(value === state ? null : state),
                ),
            )}
        </Box>
    );
}
