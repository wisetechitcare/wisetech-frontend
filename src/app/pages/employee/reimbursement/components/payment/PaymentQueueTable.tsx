import { useMemo } from 'react';
import { SearchX } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { toneStyle } from '@/ds/lib/tone';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/ds/ui/table';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DescriptionList } from '@/ds/patterns/description-list';
import { EmptyState } from '@/ds/patterns/empty-state';
import { PersonCell } from '@/ds/patterns/person';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';
import { fmtDate, formatMoney, PAYMENT_LABEL, resolveStatusNum, STATUS_LABEL } from '../../utils/reimbursementFormat';
import { PaymentBatchRow, PAYMENT_STATE_LABEL, type PaymentState } from './paymentData';
import PaymentEmptyState from './PaymentEmptyState';
import PaymentStateBadge, { PAYMENT_STATE_TONE } from './PaymentStateBadge';

/**
 * The work queue: approved batches with money still owed on them.
 *
 * This is the page's reason to exist, so it carries only the columns a payout decision uses.
 * "Total request amount / total paid / total remaining" used to be three near-identical money
 * columns with no indication of which one to act on; here Remaining is the emphatic one, because
 * it is the number being paid.
 *
 * On the kit DataTable: selection is the table's own (only batches with money owed can be ticked), and the
 * "payment run" is its selection bar — the count, the total being paid, and Process Payment.
 */

export interface PaymentQueueTableProps {
    rows: PaymentBatchRow[];
    loading: boolean;
    canPay: boolean;
    /** Pay these batches as one run. `clear` empties the selection — call it once the run is recorded. */
    onProcessRun: (rows: PaymentBatchRow[], clear: () => void) => void;
    onPay: (row: PaymentBatchRow) => void;
    onView: (row: PaymentBatchRow) => void;
    periodLabel: string;
    /** Set when a status/search filter is narrowing the view — changes what "empty" means. */
    filtered: boolean;
    onClearFilters: () => void;
    /** The org filter row, rendered in the table's toolbar beside the search box. */
    renderFilters?: () => React.ReactNode;
}

const money = (v: number, className?: string) => <span className={cn('tabular', className)}>{formatMoney(v)}</span>;

export default function PaymentQueueTable({
    rows,
    loading,
    canPay,
    onProcessRun,
    onPay,
    onView,
    periodLabel,
    filtered,
    onClearFilters,
    renderFilters,
}: PaymentQueueTableProps) {
    const totals = useMemo(() => rows.reduce(
        (t, r) => ({
            approved: t.approved + r.approvedAmount,
            paid: t.paid + r.paidAmount,
            remaining: t.remaining + r.remainingAmount,
            requests: t.requests + r.totalRequests,
        }),
        { approved: 0, paid: 0, remaining: 0, requests: 0 },
    ), [rows]);

    const columns = useMemo<ColumnDef<PaymentBatchRow, any>[]>(() => [
        {
            accessorKey: 'submissionId',
            meta: { label: 'Batch ID' },
            header: ({ column }) => <SortableHeader column={column} title="Batch ID" />,
            cell: ({ row }) => <Badge variant="brand" className="font-mono tracking-wide">{row.original.submissionId}</Badge>,
            footer: () => <span className="uppercase">Total</span>,
        },
        {
            accessorKey: 'employeeName',
            meta: { label: 'Employee' },
            header: ({ column }) => <SortableHeader column={column} title="Employee" />,
            cell: ({ row }) => (
                <PersonCell showAvatar={false} name={row.original.employeeName} inactive={!row.original.isActive} />
            ),
        },
        {
            // Names only on screen (the user's call); a spreadsheet still wants the ID as its own column.
            accessorKey: 'employeeCode',
            meta: { label: 'Employee ID', exportOnly: true },
            header: 'Employee ID',
            enableHiding: false,
        },
        {
            accessorKey: 'totalRequests',
            meta: { label: 'Requests', exportType: 'number', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Requests" />,
            cell: ({ row }) => <span className="tabular">{row.original.totalRequests}</span>,
            footer: () => <span className="tabular">{totals.requests}</span>,
        },
        {
            accessorKey: 'approvedAmount',
            meta: { label: 'Approved', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Approved" />,
            cell: ({ row }) => money(row.original.approvedAmount),
            footer: () => money(totals.approved),
        },
        {
            accessorKey: 'paidAmount',
            meta: { label: 'Already Paid', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Already Paid" />,
            cell: ({ row }) => money(row.original.paidAmount, 'text-success-foreground'),
            footer: () => money(totals.paid, 'text-success-foreground'),
        },
        {
            accessorKey: 'remainingAmount',
            meta: { label: 'Remaining', exportType: 'currency', exportTotal: true },
            header: ({ column }) => <SortableHeader column={column} title="Remaining" />,
            // The number being paid leads; settled reads as success.
            cell: ({ row }) => money(
                row.original.remainingAmount,
                row.original.remainingAmount > 0 ? 'font-bold text-foreground' : 'text-success-foreground',
            ),
            footer: () => money(totals.remaining, 'font-bold'),
        },
        {
            accessorKey: 'state',
            meta: { label: 'Payment Status', exportValue: (r: PaymentBatchRow) => PAYMENT_STATE_LABEL[r.state] },
            header: 'Payment Status',
            enableSorting: false,
            cell: ({ row }) => <PaymentStateBadge state={row.original.state} />,
        },
        {
            accessorKey: 'lastActivityAt',
            meta: { label: 'Last Updated', exportValue: (r: PaymentBatchRow) => fmtDate(r.lastActivityAt) },
            header: ({ column }) => <SortableHeader column={column} title="Last Updated" />,
            cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.lastActivityAt)}</span>,
        },
        {
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            meta: { pin: 'end' },
            header: 'Actions',
            cell: ({ row }) => {
                const r = row.original;
                const payable = canPay && r.remainingAmount > 0;
                // One clear next step per row: Pay when money is owed and you may pay, otherwise View.
                return payable
                    ? <Button size="sm" onClick={() => onPay(r)}>Pay</Button>
                    : <Button size="sm" variant="outline" onClick={() => onView(r)}>View</Button>;
            },
        },
    ], [canPay, onPay, onView, totals]);

    // Nothing owed at all → the page's own empty state. A FILTER that matches nothing stays inside the table
    // (below), so the filters that caused it remain on screen to change — replacing the whole table hid them.
    if (!loading && rows.length === 0 && !filtered) {
        return (
            <PaymentEmptyState
                title="You're all caught up"
                body={`No reimbursements are awaiting payment in ${periodLabel}.`}
            />
        );
    }

    const exportName = `Payment Queue — ${periodLabel}`;

    return (
        <DataTable<PaymentBatchRow>
            caption={`Payment queue, ${periodLabel}`}
            columns={columns}
            data={rows}
            getRowId={(r) => r.id}
            loading={loading}
            searchPlaceholder="Search employee or batch"
            stateKey="reimbursement.payment-queue"
            initialSorting={[{ id: 'remainingAmount', desc: true }]}
            selectable={canPay}
            // A settled batch has nothing left to pay, so it cannot join a payment run.
            canSelectRow={(r) => r.remainingAmount > 0}
            selectionActions={(selected, clear, ctx) => {
                const run = selected.map((s) => s.original);
                const total = run.reduce((sum, r) => sum + r.remainingAmount, 0);
                return (
                    <>
                        <span className="tabular self-center text-sm font-semibold">{formatMoney(total)} to pay</span>
                        <Button size="sm" onClick={() => onProcessRun(run, clear)}>Process Payment</Button>
                        <DataTableExport columns={columns} ctx={ctx} filename={exportName} subtitle="Approved reimbursement batches awaiting payment" size="small" />
                    </>
                );
            }}
            filters={renderFilters?.()}
            toolbar={(ctx) => (
                <DataTableExport columns={columns} ctx={ctx} filename={exportName} subtitle="Approved reimbursement batches awaiting payment" />
            )}
            onRowClick={onView}
            rowLabel={(r) => `Open ${r.submissionId}, ${r.employeeName}`}
            renderDetail={(r) => <QueueRowDetail row={r} />}
            renderCard={(r) => <PaymentMobileCard row={r} canPay={canPay} onPay={onPay} onView={onView} />}
            empty={
                <EmptyState
                    variant="no-match"
                    size="sm"
                    icon={<SearchX aria-hidden />}
                    title="No payments match these filters"
                    description="Nothing in this period matches the status or organization filters."
                    action={<Button size="sm" variant="outline" onClick={onClearFilters}>Clear Filters</Button>}
                />
            }
        />
    );
}

/**
 * The expanded row: the payment arithmetic, then the expenses behind it.
 *
 * Deliberately not a copy of the parent row — repeating the same columns one indent deeper is what the old
 * expandable panels did, and it told the reader nothing they had not just read.
 */
function QueueRowDetail({ row }: { row: PaymentBatchRow }) {
    return (
        <div className="space-y-4 px-2 py-3 sm:px-4">
            <DescriptionList
                rows={[
                    { label: 'Approved Amount', value: formatMoney(row.approvedAmount) },
                    { label: 'Previously Paid', value: <span className="text-success-foreground">{formatMoney(row.paidAmount)}</span> },
                    { label: 'Remaining', value: formatMoney(row.remainingAmount), strong: true },
                    { label: 'Requests', value: row.totalRequests },
                    { label: 'Payment Status', value: PAYMENT_STATE_LABEL[row.state] },
                ]}
            />
            <Table>
                <TableCaption className="sr-only">Expenses in {row.submissionId}</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Expense Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {row.lines.map((line) => (
                        <TableRow key={line.id}>
                            <TableCell>{fmtDate(line.expenseDate)}</TableCell>
                            <TableCell>{line.category}</TableCell>
                            <TableCell className="text-muted-foreground">{line.project}</TableCell>
                            <TableCell>{STATUS_LABEL[resolveStatusNum(line.status)]}</TableCell>
                            <TableCell className="text-muted-foreground">
                                {line.paymentStatus === 'PAID' ? PAYMENT_LABEL.PAID
                                    : line.paymentStatus === 'PARTIAL' ? PAYMENT_LABEL.PARTIAL
                                        : PAYMENT_LABEL.UNPAID}
                            </TableCell>
                            <TableCell className="tabular text-right font-semibold">{formatMoney(line.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * One batch on a phone.
 *
 * Ten columns on a 360px screen is a horizontal scroller in which the reader sees the batch id and half an
 * employee name — and the only thing they came to find out is how much is left. Same tone as the badge.
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
    const payable = canPay && row.remainingAmount > 0;
    const tone = PAYMENT_STATE_TONE[row.state as PaymentState] ?? 'neutral';
    return (
        <div
            style={toneStyle(tone)}
            // OKLab, not OKLCH: a hue mixed into a neutral surface in OKLCH drifts toward pink (the card's hue is 0).
            className="rounded-2xl border bg-[color-mix(in_oklab,var(--tone)_6%,var(--card))] px-4 py-3.5 shadow-[inset_3px_0_0_var(--tone)]"
        >
            <div className="mb-2.5 flex items-start justify-between gap-2">
                <PersonCell showAvatar={false} name={row.employeeName} code={row.submissionId} inactive={!row.isActive} />
                <PaymentStateBadge state={row.state} />
            </div>
            <dl className="grid gap-1 text-sm">
                {[
                    { label: 'Approved', value: row.approvedAmount },
                    { label: 'Paid', value: row.paidAmount },
                    { label: 'Remaining', value: row.remainingAmount, strong: true },
                ].map((f) => (
                    <div key={f.label} className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{f.label}</dt>
                        <dd className={cn('tabular m-0', f.strong ? 'font-bold text-foreground' : 'font-semibold')}>{formatMoney(f.value)}</dd>
                    </div>
                ))}
            </dl>
            <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onView(row)}>View Details</Button>
                {payable && <Button size="sm" onClick={() => onPay(row)}>Pay</Button>}
            </div>
        </div>
    );
}
