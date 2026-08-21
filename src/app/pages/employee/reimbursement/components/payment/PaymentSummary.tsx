import { Box, ButtonBase, alpha } from '@mui/material';
import { StatTile } from '@app/modules/common/components/ui/patterns';
import { SkeletonKpiCard } from '@app/modules/common/components/Skeleton';
import { formatINR, PAYMENT_TONE } from '../../utils/reimbursementFormat';
import { PaymentKpis, PaymentState, PAYMENT_STATE_LABEL } from './paymentData';

/**
 * The four numbers, then the status rail.
 *
 * The cards are the salary module's `YearlyKpiCard` unchanged — the same component the employee
 * reimbursement screen uses — so a value and its context share one box instead of the eight
 * oversized tiles this page used to open with. This file chooses which four numbers matter and
 * what they are called, and nothing else.
 */

const KPI_GRID = {
    display: 'grid',
    gap: 1.25,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
} as const;

/**
 * Four numbers on one strip, ~64px tall.
 *
 * These were four full-height cards with a value, a footer band and two chips each — a third of
 * the screen spent on four figures, and the queue they exist to introduce pushed below the fold.
 * `StatTile` is the kit's compact version of the same idea; the context that earned its place
 * rides in the value line, and the rest was noise.
 */
function Tile({ label, value, context, tone, icon }: {
    label: string; value: string; context?: string; tone: string; icon: string;
}) {
    return (
        <StatTile
            label={label}
            trio={{ c: tone, bg: tone + '14', bd: tone + '3D' }}
            icon={icon}
            value={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
                    <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Box>
                    {context && (
                        <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {context}
                        </Box>
                    )}
                </Box>
            }
        />
    );
}

export function PaymentKpiCards({ kpis, loading }: { kpis: PaymentKpis; loading?: boolean }) {
    if (loading) {
        return <Box sx={KPI_GRID}>{[0, 1, 2, 3].map((i) => <SkeletonKpiCard key={i} />)}</Box>;
    }

    return (
        <Box sx={KPI_GRID}>
            <Tile
                label="Pending payment"
                value={formatINR(kpis.pendingAmount)}
                context={kpis.pendingBatches > 0 ? `${kpis.pendingBatches} batch${kpis.pendingBatches === 1 ? '' : 'es'}` : undefined}
                tone="#d97706"
                icon="wallet"
            />
            <Tile
                label="Total paid"
                value={formatINR(kpis.paidAmount)}
                context={`${kpis.settledPct}% settled`}
                tone="#16a34a"
                icon="check-circle"
            />
            <Tile
                label="Pending requests"
                value={String(kpis.pendingRequests)}
                context="awaiting payment"
                tone="#2563eb"
                icon="document"
            />
            <Tile
                label="Employees awaiting"
                value={String(kpis.employeesAwaiting)}
                context={kpis.employeesAwaiting === 0 ? 'none' : 'to be paid'}
                tone="#7c3aed"
                icon="profile-user"
            />
        </Box>
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
            title={`${count} ${count === 1 ? 'batch' : 'batches'} · ${formatINR(amount)}`}
            aria-label={`${label}, ${count} ${count === 1 ? 'batch' : 'batches'}, ${formatINR(amount)}`}
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
