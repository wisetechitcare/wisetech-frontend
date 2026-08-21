import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import ExportButton from '@app/modules/common/components/ExportButton';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { StatusBadge } from '@app/modules/common/components/ui/patterns';
import { fmtDate, formatINR, PAYMENT_TONE } from '../../utils/reimbursementFormat';
import { PaymentBatchRow, PaymentRecord } from './paymentData';
import PaymentEmptyState from './PaymentEmptyState';

/**
 * What has already been paid — one row per payment, not per batch.
 *
 * The old "Payment Done" table was one row per batch with the payments hidden behind an expander,
 * which meant the audit question ("what left the account on the 11th, against which reference?")
 * needed a click per row to answer. A payment run is a list of payments; this is that list.
 *
 * It reads the payments carried on the batch payload, so it cannot disagree with the queue about
 * what has been paid, and it costs no extra request. A payment whose batch was deleted
 * (`batch_id` is nullable) has nothing to attach to and does not appear here.
 */

const trioFor = (color: string) => ({ c: color, bg: color + '1A', bd: color + '44' });

export default function PaymentHistoryTable({
    payments,
    batchById,
    loading,
    periodLabel,
    filtered,
    onClearFilters,
    onView,
    renderFilters,
}: {
    payments: PaymentRecord[];
    batchById: Map<string, PaymentBatchRow>;
    loading: boolean;
    periodLabel: string;
    filtered: boolean;
    onClearFilters: () => void;
    onView: (row: PaymentBatchRow) => void;
    /** The org filter row, rendered inside the table's own toolbar beside the search box. */
    renderFilters?: () => React.ReactNode;
}) {
    const data = useMemo(
        () => payments.map((p) => ({
            id: p.id,
            paymentDate: p.paymentDate,
            submissionId: p.submissionId,
            employeeName: p.employeeName,
            employeeCode: p.employeeCode,
            amountPaid: p.amountPaid,
            status: p.status,
            paymentMethod: (p.paymentMethod || '—').replace(/_/g, ' '),
            transactionId: p.transactionId || '—',
            processedBy: p.processedBy,
            _batchId: p.batchId,
        })),
        [payments],
    );

    const total = useMemo(() => payments.reduce((s, p) => s + p.amountPaid, 0), [payments]);

    const columns = useMemo(() => [
        {
            accessorKey: 'paymentDate',
            header: 'Payment date',
            size: 130,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(renderedCellValue)}</Box>
            ),
            Footer: () => <span style={{ fontWeight: 800 }}>TOTAL</span>,
        },
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
        },
        {
            accessorKey: 'employeeName',
            header: 'Employee',
            size: 190,
            Cell: ({ row }: any) => (
                <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>{row.original.employeeName}</Typography>
                    <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>{row.original.employeeCode}</Typography>
                </Box>
            ),
        },
        {
            accessorKey: 'amountPaid',
            header: 'Amount paid',
            size: 135,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#16a34a' }}>
                    {formatINR(Number(renderedCellValue))}
                </Box>
            ),
            Footer: () => <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatINR(total)}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Payment status',
            size: 140,
            enableSorting: false,
            Cell: ({ renderedCellValue }: any) => {
                const status = String(renderedCellValue);
                return (
                    <StatusBadge
                        trio={trioFor(PAYMENT_TONE[status]?.color ?? '#475569')}
                        // A payment record is PAID or PARTIAL — whether it settled the batch or
                        // part of it. The batch's own state lives in the queue.
                        label={status === 'PARTIAL' ? 'Part payment' : 'Full payment'}
                    />
                );
            },
        },
        {
            accessorKey: 'paymentMethod',
            header: 'Method',
            size: 130,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontSize: 12, textTransform: 'capitalize' }}>
                    {String(renderedCellValue).toLowerCase()}
                </Box>
            ),
        },
        {
            accessorKey: 'transactionId',
            header: 'Reference',
            size: 150,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{
                    fontSize: 11.5, fontFamily: 'monospace',
                    color: renderedCellValue === '—' ? 'text.secondary' : 'text.primary',
                }}>
                    {renderedCellValue}
                </Box>
            ),
        },
        {
            accessorKey: 'processedBy',
            header: 'Recorded by',
            size: 150,
            Cell: ({ renderedCellValue }: any) => (
                <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{renderedCellValue}</Box>
            ),
        },
        {
            id: 'action',
            header: 'Action',
            size: 100,
            enableSorting: false,
            enableColumnFilter: false,
            enableColumnActions: false,
            Cell: ({ row }: any) => {
                const batch = batchById.get(row.original._batchId);
                if (!batch) return null;
                return (
                    <Box onClick={(e) => e.stopPropagation()}>
                        <WtButton ghost size="small" onClick={() => onView(batch)}>View</WtButton>
                    </Box>
                );
            },
        },
    ], [total, batchById, onView]);

    const exportColumns = useMemo(() => [
        { key: 'paymentDate', header: 'Payment Date', type: 'text' as const },
        { key: 'submissionId', header: 'Batch ID', type: 'text' as const },
        { key: 'employeeCode', header: 'Employee ID', type: 'text' as const },
        { key: 'employeeName', header: 'Employee', type: 'text' as const },
        { key: 'amountPaid', header: 'Amount Paid', type: 'currency' as const, showTotal: true },
        { key: 'paymentMethod', header: 'Method', type: 'text' as const },
        { key: 'transactionId', header: 'Reference', type: 'text' as const },
        { key: 'processedBy', header: 'Recorded By', type: 'text' as const },
    ], []);

    if (!loading && data.length === 0) {
        return filtered ? (
            <PaymentEmptyState
                icon="magnifier"
                tone="#2563eb"
                title="No payments found"
                body="Nothing matches the current filters in this period."
                actionLabel="Clear filters"
                onAction={onClearFilters}
            />
        ) : (
            <PaymentEmptyState
                icon="document"
                tone="#64748b"
                title="No payment history"
                body={`No payments were recorded in ${periodLabel}.`}
            />
        );
    }

    return (
        <MaterialTable
            data={data}
            columns={columns}
            tableName="ReimbursementPaymentHistory"
            isLoading={loading}
            showColumnFooter
            enableStatusColorCoding={false}
            searchPlaceholder="Search employee, employee ID, batch ID or reference…"
            renderTopToolbarRightActions={renderFilters}
            renderExportActions={() => (
                <ExportButton
                    data={data}
                    columns={exportColumns}
                    filename={`payment-history-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`}
                    title={`Payment History — ${periodLabel}`}
                    subtitle="Reimbursement payments recorded in this period"
                    sheetName="Payment History"
                    showTotals
                    totalLabel="TOTAL"
                    disabled={data.length === 0}
                />
            )}
            renderMobileCard={({ row }: any) => {
                const r = row.original;
                return (
                    <Box sx={{
                        p: 1.75, borderRadius: '12px', border: '1px solid', borderColor: 'divider',
                        borderLeft: '3px solid #16a34a', bgcolor: 'background.paper',
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontSize: 14, fontWeight: 800 }}>{r.employeeName}</Typography>
                                <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
                                    {r.employeeCode} · {r.submissionId}
                                </Typography>
                            </Box>
                            <Typography sx={{
                                fontSize: 15, fontWeight: 800, color: '#16a34a',
                                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                            }}>
                                {formatINR(r.amountPaid)}
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            {fmtDate(r.paymentDate)} · {String(r.paymentMethod).toLowerCase()}
                            {r.transactionId !== '—' ? ` · ${r.transactionId}` : ''}
                        </Typography>
                    </Box>
                );
            }}
        />
    );
}
