import { useMemo } from 'react';
import { Box, Checkbox, Typography } from '@mui/material';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import ExportButton from '@app/modules/common/components/ExportButton';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { StatusBadge } from '@app/modules/common/components/ui/patterns';
import { fmtDate, formatINR, PAYMENT_TONE } from '../../utils/reimbursementFormat';
import { PaymentBatchRow, PAYMENT_STATE_LABEL, COMPACT_BUTTON_SX } from './paymentData';
import PaymentEmptyState from './PaymentEmptyState';

/**
 * The work queue: approved batches with money still owed on them.
 *
 * This is the page's reason to exist, so it carries only the columns a payout decision uses.
 * "Total request amount / total paid / total remaining" used to be three near-identical money
 * columns with no indication of which one to act on; here Remaining is the emphatic one, because
 * it is the number being paid.
 */

const trioFor = (color: string) => ({ c: color, bg: color + '1A', bd: color + '44' });

const money = (v: number) => (
    <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatINR(v)}</Box>
);

export interface PaymentQueueTableProps {
    rows: PaymentBatchRow[];
    loading: boolean;
    canPay: boolean;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onPay: (row: PaymentBatchRow) => void;
    onView: (row: PaymentBatchRow) => void;
    periodLabel: string;
    /** Set when a status/search filter is narrowing the view — changes what "empty" means. */
    filtered: boolean;
    onClearFilters: () => void;
    /** The org filter row, rendered inside the table's own toolbar beside the search box. */
    renderFilters?: () => React.ReactNode;
}

export default function PaymentQueueTable({
    rows,
    loading,
    canPay,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onPay,
    onView,
    periodLabel,
    filtered,
    onClearFilters,
    renderFilters,
}: PaymentQueueTableProps) {
    const selectable = useMemo(() => rows.filter((r) => r.remainingAmount > 0), [rows]);
    const allSelected = selectable.length > 0 && selectable.every((r) => selectedIds.includes(r.id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const data = useMemo(
        () => rows.map((r) => ({
            id: r.id,
            submissionId: r.submissionId,
            employeeName: r.employeeName,
            employeeCode: r.employeeCode,
            totalRequests: r.totalRequests,
            approvedAmount: r.approvedAmount,
            paidAmount: r.paidAmount,
            remainingAmount: r.remainingAmount,
            state: r.state,
            lastActivityAt: r.lastActivityAt,
            _row: r,
        })),
        [rows],
    );

    const totals = useMemo(() => ({
        approved: rows.reduce((s, r) => s + r.approvedAmount, 0),
        paid: rows.reduce((s, r) => s + r.paidAmount, 0),
        remaining: rows.reduce((s, r) => s + r.remainingAmount, 0),
        requests: rows.reduce((s, r) => s + r.totalRequests, 0),
    }), [rows]);

    const columns = useMemo(() => [
        ...(canPay ? [{
            id: 'select',
            header: '',
            size: 44,
            enableSorting: false,
            enableColumnFilter: false,
            enableColumnActions: false,
            Header: () => (
                <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={onToggleSelectAll}
                    inputProps={{ 'aria-label': 'Select every payable batch' }}
                />
            ),
            Cell: ({ row }: any) => {
                const r: PaymentBatchRow = row.original._row;
                // A settled batch has nothing left to pay, so it cannot join a payment run.
                if (r.remainingAmount <= 0) return null;
                return (
                    <Checkbox
                        size="small"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => onToggleSelect(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        inputProps={{ 'aria-label': `Select ${r.submissionId}` }}
                    />
                );
            },
        }] : []),
        {
            accessorKey: 'submissionId',
            header: 'Batch ID',
            size: 165,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{
                    fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                    px: 1, py: '3px', borderRadius: '6px',
                    bgcolor: 'action.hover', color: 'text.primary',
                }}>
                    {renderedCellValue}
                </Box>
            ),
            Footer: () => <span style={{ fontWeight: 800 }}>TOTAL</span>,
        },
        {
            accessorKey: 'employeeName',
            header: 'Employee',
            size: 190,
            Cell: ({ row }: any) => (
                <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                        {row.original.employeeName}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {row.original.employeeCode}
                    </Typography>
                </Box>
            ),
        },
        {
            accessorKey: 'totalRequests',
            header: 'Requests',
            size: 100,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {renderedCellValue}
                </Box>
            ),
            Footer: () => <span style={{ fontWeight: 800 }}>{totals.requests}</span>,
        },
        {
            accessorKey: 'approvedAmount',
            header: 'Approved',
            size: 130,
            Cell: ({ renderedCellValue }: any) => money(Number(renderedCellValue)),
            Footer: () => <span style={{ fontWeight: 800 }}>{formatINR(totals.approved)}</span>,
        },
        {
            accessorKey: 'paidAmount',
            header: 'Already paid',
            size: 130,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#16a34a' }}>
                    {formatINR(Number(renderedCellValue))}
                </Box>
            ),
            Footer: () => <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatINR(totals.paid)}</span>,
        },
        {
            accessorKey: 'remainingAmount',
            header: 'Remaining',
            size: 135,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{
                    fontVariantNumeric: 'tabular-nums', fontWeight: 800,
                    color: Number(renderedCellValue) > 0 ? '#1E3A8A' : '#16a34a',
                }}>
                    {formatINR(Number(renderedCellValue))}
                </Box>
            ),
            Footer: () => <span style={{ fontWeight: 800, color: '#1E3A8A' }}>{formatINR(totals.remaining)}</span>,
        },
        {
            accessorKey: 'state',
            header: 'Payment status',
            size: 140,
            enableSorting: false,
            Cell: ({ row }: any) => {
                const state = row.original.state as PaymentBatchRow['state'];
                return (
                    <StatusBadge
                        trio={trioFor(PAYMENT_TONE[state]?.color ?? '#475569')}
                        label={PAYMENT_STATE_LABEL[state]}
                    />
                );
            },
        },
        {
            accessorKey: 'lastActivityAt',
            header: 'Last updated',
            size: 120,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {fmtDate(renderedCellValue)}
                </Box>
            ),
        },
        {
            id: 'action',
            header: 'Action',
            size: 110,
            enableSorting: false,
            enableColumnFilter: false,
            enableColumnActions: false,
            Cell: ({ row }: any) => {
                const r: PaymentBatchRow = row.original._row;
                const payable = canPay && r.remainingAmount > 0;
                return (
                    <Box onClick={(e) => e.stopPropagation()}>
                        <WtButton
                            size="small"
                            ghost={!payable}
                            sx={COMPACT_BUTTON_SX}
                            onClick={() => (payable ? onPay(r) : onView(r))}
                        >
                            {payable ? 'Pay' : 'View'}
                        </WtButton>
                    </Box>
                );
            },
        },
    ], [canPay, allSelected, someSelected, selectedIds, onToggleSelect, onToggleSelectAll, onPay, onView, totals]);

    const exportColumns = useMemo(() => [
        { key: 'submissionId', header: 'Batch ID', type: 'text' as const },
        { key: 'employeeCode', header: 'Employee ID', type: 'text' as const },
        { key: 'employeeName', header: 'Employee', type: 'text' as const },
        { key: 'totalRequests', header: 'Requests', type: 'number' as const, showTotal: true },
        { key: 'approvedAmount', header: 'Approved', type: 'currency' as const, showTotal: true },
        { key: 'paidAmount', header: 'Already Paid', type: 'currency' as const, showTotal: true },
        { key: 'remainingAmount', header: 'Remaining', type: 'currency' as const, showTotal: true },
        { key: 'state', header: 'Payment Status', type: 'text' as const },
    ], []);

    if (!loading && rows.length === 0) {
        return filtered ? (
            <PaymentEmptyState
                icon="magnifier"
                tone="#2563eb"
                title="No payments found"
                body="Nothing matches the current status filter or search in this period."
                actionLabel="Clear filters"
                onAction={onClearFilters}
            />
        ) : (
            <PaymentEmptyState
                title="You're all caught up"
                body={`No reimbursements are awaiting payment in ${periodLabel}.`}
            />
        );
    }

    return (
        <MaterialTable
            data={data}
            columns={columns}
            tableName="ReimbursementPaymentQueue"
            isLoading={loading}
            showColumnFooter
            enableStatusColorCoding={false}
            searchPlaceholder="Search employee, employee ID or batch ID…"
            defaultSorting={[{ id: 'remainingAmount', desc: true }]}
            renderTopToolbarRightActions={renderFilters}
            renderExportActions={() => (
                <ExportButton
                    data={data}
                    columns={exportColumns}
                    filename={`payment-queue-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`}
                    title={`Payment Queue — ${periodLabel}`}
                    subtitle="Approved reimbursement batches awaiting payment"
                    sheetName="Payment Queue"
                    showTotals
                    totalLabel="TOTAL"
                    disabled={data.length === 0}
                />
            )}
            renderDetailPanel={({ row }: any) => {
                const r: PaymentBatchRow = row.original._row;
                return <QueueRowDetail row={r} />;
            }}
            renderMobileCard={({ row }: any) => {
                const r: PaymentBatchRow = row.original._row ?? row.original;
                return (
                    <PaymentMobileCard
                        row={r}
                        canPay={canPay}
                        onPay={onPay}
                        onView={onView}
                    />
                );
            }}
            muiTableProps={{
                muiTableBodyRowProps: ({ row }: any) => ({
                    onClick: () => onView(row.original._row),
                    sx: { cursor: 'pointer' },
                }),
            }}
        />
    );
}

/**
 * The expanded row: the payment arithmetic, then the expenses behind it.
 *
 * Deliberately not a copy of the parent row — repeating the same seven columns one indent deeper
 * is what the old expandable panels did, and it told the reader nothing they had not just read.
 */
function QueueRowDetail({ row }: { row: PaymentBatchRow }) {
    const cells: { label: string; value: string; tone?: string }[] = [
        { label: 'Approved amount', value: formatINR(row.approvedAmount) },
        { label: 'Previously paid', value: formatINR(row.paidAmount), tone: '#16a34a' },
        { label: 'Remaining', value: formatINR(row.remainingAmount), tone: row.remainingAmount > 0 ? '#1E3A8A' : '#16a34a' },
        { label: 'Requests', value: String(row.totalRequests) },
        { label: 'Payment status', value: PAYMENT_STATE_LABEL[row.state] },
    ];

    return (
        <Box sx={{ px: 3, py: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{
                display: 'grid', gap: 1.5, mb: 2,
                gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(5, minmax(0,1fr))' },
            }}>
                {cells.map((c) => (
                    <Box key={c.label} sx={{ minWidth: 0 }}>
                        <Typography sx={{
                            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                            textTransform: 'uppercase', color: 'text.secondary',
                        }}>
                            {c.label}
                        </Typography>
                        <Typography noWrap sx={{
                            fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                            color: c.tone ?? 'text.primary',
                        }}>
                            {c.value}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box sx={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box component="table" sx={{ width: '100%', minWidth: 620, borderCollapse: 'collapse' }}>
                    <Box component="thead" sx={{ bgcolor: 'action.hover' }}>
                        <Box component="tr">
                            {['Expense date', 'Category', 'Project', 'Approval', 'Payment', 'Amount'].map((h) => (
                                <Box component="th" key={h} sx={{
                                    px: 2, py: 1, textAlign: h === 'Amount' ? 'right' : 'left',
                                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                                    textTransform: 'uppercase', color: 'text.secondary',
                                    borderBottom: '1px solid', borderColor: 'divider', whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                    <Box component="tbody">
                        {row.lines.map((line) => (
                            <Box component="tr" key={line.id} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                                <Box component="td" sx={{ px: 2, py: 1, fontSize: 12.5 }}>{fmtDate(line.expenseDate)}</Box>
                                <Box component="td" sx={{ px: 2, py: 1, fontSize: 12.5 }}>{line.category}</Box>
                                <Box component="td" sx={{ px: 2, py: 1, fontSize: 12.5, color: 'text.secondary' }}>{line.project}</Box>
                                <Box component="td" sx={{ px: 2, py: 1, fontSize: 12 }}>
                                    {line.status === 1 ? 'Approved' : line.status === 2 ? 'Rejected' : 'Pending'}
                                </Box>
                                <Box component="td" sx={{ px: 2, py: 1, fontSize: 12, color: 'text.secondary' }}>
                                    {line.paymentStatus === 'PAID' ? 'Paid'
                                        : line.paymentStatus === 'PARTIAL' ? 'Partially paid'
                                        : 'Unpaid'}
                                </Box>
                                <Box component="td" sx={{
                                    px: 2, py: 1, textAlign: 'right', fontSize: 13, fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {formatINR(line.amount)}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

/**
 * One batch on a phone.
 *
 * Ten columns on a 360px screen is a horizontal scroller in which the reader sees the batch id
 * and half an employee name — and the only thing they came to find out is how much is left.
 */
export function PaymentMobileCard({
    row,
    canPay,
    onPay,
    onView,
}: {
    row: PaymentBatchRow;
    canPay: boolean;
    onPay: (row: PaymentBatchRow) => void;
    onView: (row: PaymentBatchRow) => void;
}) {
    const color = PAYMENT_TONE[row.state]?.color ?? '#475569';
    const payable = canPay && row.remainingAmount > 0;

    return (
        <Box sx={{
            p: 1.75, borderRadius: '12px', border: '1px solid', borderColor: 'divider',
            borderLeft: `3px solid ${color}`, bgcolor: 'background.paper',
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 800 }}>{row.employeeName}</Typography>
                    <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {row.employeeCode} · {row.submissionId}
                    </Typography>
                </Box>
                <StatusBadge trio={trioFor(color)} label={PAYMENT_STATE_LABEL[row.state]} />
            </Box>

            {[
                { label: 'Approved', value: formatINR(row.approvedAmount) },
                { label: 'Paid', value: formatINR(row.paidAmount) },
                { label: 'Remaining', value: formatINR(row.remainingAmount), strong: true },
            ].map((f) => (
                <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{f.label}</Typography>
                    <Typography sx={{
                        fontSize: f.strong ? 14 : 12.5,
                        fontWeight: f.strong ? 800 : 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: f.strong ? '#1E3A8A' : 'text.primary',
                    }}>
                        {f.value}
                    </Typography>
                </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <WtButton ghost size="small" sx={COMPACT_BUTTON_SX} onClick={() => onView(row)}>View details</WtButton>
                {payable && <WtButton size="small" sx={COMPACT_BUTTON_SX} onClick={() => onPay(row)}>Pay</WtButton>}
            </Box>
        </Box>
    );
}
