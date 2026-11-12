import { useMemo } from 'react';
import { FileText, SearchX } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { EmptyState } from '@/ds/patterns/empty-state';
import { PersonCell } from '@/ds/patterns/person';
import { SensitiveValue } from '@/ds/patterns/sensitive';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';
import { formatDate } from '@utils/dateFormats';
import { formatMoney } from '../../utils/reimbursementFormat';
import { PaymentBatchRow, PaymentRecord } from './paymentData';
import PaymentEmptyState from './PaymentEmptyState';
import PaymentStateBadge from './PaymentStateBadge';

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
 *
 * On the kit DataTable, like the queue beside it: sortable columns, persisted column prefs, footer total,
 * export, and a card per payment on a phone.
 */

/** One payment, as the table and its phone card read it. */
export interface HistoryRow {
    id: string;
    paymentDate: string | null;
    submissionId: string;
    employeeName: string;
    employeeCode: string;
    amountPaid: number;
    status: string;
    paymentMethod: string;
    transactionId: string;
    processedBy: string;
    _batchId: string;
}

const NO_REFERENCE = '—';

const money = (v: number, className?: string) => (
    <SensitiveValue className={cn('tabular', className)}>{formatMoney(v)}</SensitiveValue>
);

// A payment record is PAID or PARTIAL — whether it settled the batch or part of it. The batch's own state
// lives in the queue.
const paymentLabel = (status: string) => (status === 'PARTIAL' ? 'Part payment' : 'Full payment');

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
    const data = useMemo<HistoryRow[]>(
        () => payments.map((p) => ({
            id: p.id,
            paymentDate: p.paymentDate,
            submissionId: p.submissionId,
            employeeName: p.employeeName,
            employeeCode: p.employeeCode,
            amountPaid: p.amountPaid,
            status: p.status,
            paymentMethod: (p.paymentMethod || '—').replace(/_/g, ' '),
            transactionId: p.transactionId || NO_REFERENCE,
            processedBy: p.processedBy,
            _batchId: p.batchId,
        })),
        [payments],
    );

    const total = useMemo(() => payments.reduce((s, p) => s + p.amountPaid, 0), [payments]);

    const columns = useMemo<ColumnDef<HistoryRow, any>[]>(() => [
        {
            accessorKey: 'paymentDate',
            meta: { label: 'Payment Date', exportValue: (r: HistoryRow) => formatDate(r.paymentDate) },
            header: ({ column }) => <SortableHeader column={column} title="Payment Date" />,
            cell: ({ row }) => <span className="text-[13px] font-semibold">{formatDate(row.original.paymentDate)}</span>,
            footer: () => <span className="font-extrabold uppercase">Total</span>,
        },
        {
            accessorKey: 'submissionId',
            meta: { label: 'Batch ID' },
            header: ({ column }) => <SortableHeader column={column} title="Batch ID" />,
            cell: ({ row }) => <Badge variant="brand" className="font-mono tracking-wide">{row.original.submissionId}</Badge>,
        },
        {
            accessorKey: 'employeeName',
            meta: { label: 'Employee' },
            header: ({ column }) => <SortableHeader column={column} title="Employee" />,
            cell: ({ row }) => <PersonCell showAvatar={false} name={row.original.employeeName} />,
        },
        {
            // Names only on screen; a spreadsheet still wants the ID as its own column.
            accessorKey: 'employeeCode',
            meta: { label: 'Employee ID', exportOnly: true },
            header: 'Employee ID',
            enableHiding: false,
        },
        {
            accessorKey: 'amountPaid',
            meta: { label: 'Amount Paid', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Amount Paid" />,
            cell: ({ row }) => money(row.original.amountPaid, 'font-extrabold text-success-foreground'),
            footer: () => money(total, 'font-extrabold text-success-foreground'),
        },
        {
            accessorKey: 'status',
            header: 'Payment Status',
            enableSorting: false,
            cell: ({ row }) => <PaymentStateBadge state={row.original.status} label={paymentLabel(row.original.status)} />,
        },
        {
            accessorKey: 'paymentMethod',
            meta: { label: 'Method' },
            header: ({ column }) => <SortableHeader column={column} title="Method" />,
            cell: ({ row }) => <span className="text-xs capitalize">{row.original.paymentMethod.toLowerCase()}</span>,
        },
        {
            accessorKey: 'transactionId',
            meta: { label: 'Reference' },
            header: ({ column }) => <SortableHeader column={column} title="Reference" />,
            cell: ({ row }) => (
                <span className={cn('font-mono text-[11.5px]', row.original.transactionId === NO_REFERENCE && 'text-muted-foreground')}>
                    {row.original.transactionId}
                </span>
            ),
        },
        {
            accessorKey: 'processedBy',
            meta: { label: 'Recorded By' },
            header: ({ column }) => <SortableHeader column={column} title="Recorded By" />,
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.processedBy}</span>,
        },
        {
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            meta: { pin: 'end' },
            header: 'Action',
            cell: ({ row }) => {
                const batch = batchById.get(row.original._batchId);
                if (!batch) return null;
                return <Button variant="outline" size="sm" onClick={() => onView(batch)}>View</Button>;
            },
        },
    ], [total, batchById, onView]);

    if (!loading && data.length === 0) {
        return filtered ? (
            <PaymentEmptyState
                icon={<SearchX aria-hidden />}
                title="No payments found"
                body="Nothing matches the current filters in this period."
                actionLabel="Clear filters"
                onAction={onClearFilters}
            />
        ) : (
            <PaymentEmptyState
                icon={<FileText aria-hidden />}
                title="No payment history"
                body={`No payments were recorded in ${periodLabel}.`}
            />
        );
    }

    const exportName = `payment-history-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`;
    const exportTitle = `Payment History — ${periodLabel}`;
    const exportSubtitle = 'Reimbursement payments recorded in this period';

    return (
        <DataTable<HistoryRow>
            caption={`Payment history, ${periodLabel}`}
            columns={columns}
            data={data}
            getRowId={(r) => r.id}
            loading={loading}
            searchPlaceholder="Search employee, employee ID, batch ID or reference…"
            stateKey="reimbursement.payment-history.admin"
            filters={renderFilters?.()}
            toolbar={(ctx) => (
                <DataTableExport
                    columns={columns}
                    ctx={ctx}
                    filename={exportName}
                    title={exportTitle}
                    subtitle={exportSubtitle}
                    disabled={data.length === 0}
                />
            )}
            renderCard={(r) => <PaymentHistoryCard row={r} />}
            empty={
                <EmptyState
                    variant="no-match"
                    size="sm"
                    icon={<SearchX aria-hidden />}
                    title="No payments match your search"
                    description="Nothing in this period matches."
                />
            }
        />
    );
}

/** One payment on a phone: who and how much lead; the date, method and reference follow. */
export function PaymentHistoryCard({ row }: { row: HistoryRow }) {
    return (
        <div className="rounded-2xl border bg-card px-4 py-3.5 shadow-[inset_3px_0_0_var(--success)]">
            <div className="mb-2 flex items-start justify-between gap-2">
                <PersonCell showAvatar={false} name={row.employeeName} code={row.submissionId} />
                {money(row.amountPaid, 'whitespace-nowrap text-[15px] font-extrabold text-success-foreground')}
            </div>
            <div className="text-[11.5px] text-muted-foreground">
                {formatDate(row.paymentDate)} · <span className="capitalize">{row.paymentMethod.toLowerCase()}</span>
                {row.transactionId !== NO_REFERENCE ? ` · ${row.transactionId}` : ''}
            </div>
        </div>
    );
}
