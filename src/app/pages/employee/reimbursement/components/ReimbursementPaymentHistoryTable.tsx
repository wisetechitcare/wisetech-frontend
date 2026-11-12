import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { IReimbursementPayment } from '@models/employee';
import { fetchReimbursementPayments, fetchApprovalInstanceByRequest } from '@services/employee';
import { BatchDetailModal } from '../shared/ReimbursementBatchShared';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { fmtAmount } from '../utils/reimbursementFormat';
import PaymentDetailPanel from './PaymentDetailPanel';
import LoadErrorState from './LoadErrorState';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { currencyPrefix } from '@utils/currency';
import { cn } from '@/ds/lib/utils';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { EmptyState } from '@/ds/patterns/empty-state';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';

type PeriodFilter = 'monthly' | 'yearly' | 'allTime';

interface ReimbursementPaymentHistoryTableProps {
    employeeId: string;
    employeeCode?: string;
    employeeName?: string;
    refreshKey?: number;
    /**
     * The page's period — required, so this table can never describe a different window
     * from the KPI cards and records above it.
     */
    period: PeriodFilter;
    periodDate: dayjs.Dayjs;
}

interface BatchRow {
    id: string;
    batchId: string;
    submissionId: string;
    employeeCode: string;
    employeeName: string;
    totalRequests: number;
    totalRequestAmount: number;
    totalAmountPaid: number;
    totalRemainingAmount: number;
    approvalInstanceId: string | null;
    payments: (IReimbursementPayment & Record<string, any>)[];
}

/** One figure, one format: rows, footers, cards and the export all print money through this. */
const money = (n: number) => `${currencyPrefix()}${fmtAmount(n)}`;

const ReimbursementPaymentHistoryTable: React.FC<ReimbursementPaymentHistoryTableProps> = ({
    employeeId,
    employeeCode,
    employeeName,
    refreshKey,
    period,
    periodDate,
}) => {
    const { cls: sensitiveCls } = useSensitiveData();
    // The page owns the period. This table carried its own tabs + navigator, which is how the
    // screen ended up showing records for one month next to payments for another.
    const filter = period;
    const currentDate = periodDate;
    const [fiscalYearLabel, setFiscalYearLabel] = useState('');
    const [payments, setPayments] = useState<(IReimbursementPayment & Record<string, any>)[]>([]);
    const [historyError, setHistoryError] = useState(false);
    const [batchSubmissionMap, setBatchSubmissionMap] = useState<Map<string, string>>(new Map());
    const [batchApprovalMap, setBatchApprovalMap] = useState<Map<string, string | null>>(new Map());
    const [loading, setLoading] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [selectedApprovalInstanceId, setSelectedApprovalInstanceId] = useState<string | null>(null);

    const getDateRange = useCallback(async () => {
        if (filter === 'monthly') {
            return {
                startDate: currentDate.startOf('month').toISOString(),
                endDate: currentDate.endOf('month').toISOString(),
            };
        }
        // Fiscal, not calendar (Q2) — this table used the calendar year under a fiscal label.
        if (filter === 'yearly') {
            return generateFiscalYearFromGivenYear(currentDate);
        }
        return { startDate: undefined, endDate: undefined };
    }, [filter, currentDate]);

    const loadPayments = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        // A retry that succeeds must clear the failure — it used to stay on the error screen for good.
        setHistoryError(false);
        try {
            const { startDate, endDate } = await getDateRange();
            const data = await fetchReimbursementPayments(employeeId, startDate, endDate);
            const sorted = (data as any[]).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            setPayments(sorted);

            const uniqueBatchIds = Array.from(
                new Set(sorted.map((p: any) => p.batch?.id || p.batchId).filter(Boolean)),
            ) as string[];

            // Halved: this used to issue TWO requests per batch. The submission id was one of
            // them, and the payment row has carried `batch.submissionId` since Phase 2 added the
            // include — so that fetch was asking the server for a field already in hand. Only the
            // approval instance still needs a round trip.
            const submissionIdByBatch = new Map<string, string>();
            for (const p of sorted as any[]) {
                const id = p.batch?.id || p.batchId;
                if (id && p.batch?.submissionId) submissionIdByBatch.set(id, p.batch.submissionId);
            }

            const entries = await Promise.all(
                uniqueBatchIds.map(async (id) => {
                    const submissionId = submissionIdByBatch.get(id) || id;
                    try {
                        const instanceRes = await fetchApprovalInstanceByRequest('ReimbursementBatch', id);
                        const instance = instanceRes?.data || instanceRes;
                        return { id, submissionId, approvalInstanceId: instance?.id ?? null };
                    } catch {
                        return { id, submissionId, approvalInstanceId: null };
                    }
                }),
            );
            setBatchSubmissionMap(new Map(entries.map((e) => [e.id, e.submissionId])));
            setBatchApprovalMap(new Map(entries.map((e) => [e.id, e.approvalInstanceId])));
        } catch {
            setPayments([]);
            setHistoryError(true);
        } finally {
            setLoading(false);
        }
    }, [employeeId, getDateRange]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments, refreshKey]);

    // Refresh whenever a payment is recorded/updated/deleted on any connected client (WebSocket)
    useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadPayments(); });

    useEffect(() => {
        if (filter !== 'yearly') return;
        generateFiscalYearFromGivenYear(currentDate).then(({ startDate, endDate }) => {
            setFiscalYearLabel(formatFiscalYearLabel(`${startDate} to ${endDate}`));
        });
    }, [currentDate, filter]);

    const periodLabel =
        filter === 'monthly'
            ? currentDate.format('MMM YYYY')
            : filter === 'yearly'
            ? fiscalYearLabel || currentDate.format('YYYY')
            : 'All Time';

    // Group payments by batchId to create one row per batch
    const batchRows = useMemo<BatchRow[]>(() => {
        const map = new Map<string, BatchRow>();
        payments.forEach((p) => {
            const batchId: string = (p as any).batch?.id || (p as any).batchId || p.id;
            const submissionId: string =
                batchSubmissionMap.get(batchId) ||
                (p as any).batch?.submissionId ||
                batchId;
            const paymentMadeBy: string = p.processor?.users
                ? `${p.processor.users.firstName ?? ''} ${p.processor.users.lastName ?? ''}`.trim() || 'N/A'
                : 'N/A';

            if (!map.has(batchId)) {
                map.set(batchId, {
                    id: batchId,
                    batchId,
                    submissionId,
                    employeeCode: employeeCode || 'N/A',
                    employeeName: employeeName || 'N/A',
                    totalRequests: Number(p.totalRequests ?? 0),
                    totalRequestAmount: 0,
                    totalAmountPaid: 0,
                    totalRemainingAmount: 0,
                    approvalInstanceId: batchApprovalMap.get(batchId) ?? null,
                    payments: [],
                });
            }
            const row = map.get(batchId)!;
            row.totalAmountPaid += Number(p.amountPaid || 0);
            row.payments.push({ ...p, _paymentMadeBy: paymentMadeBy });
        });

        // Compute remaining amount: batchTotalAmount - totalAmountPaid
        map.forEach((row) => {
            const batchTotal = Number(row.payments[0]?.totalAmount ?? 0);
            row.totalRequestAmount = batchTotal;
            row.totalRemainingAmount = Math.max(0, batchTotal - row.totalAmountPaid);
        });

        return Array.from(map.values());
    }, [payments, employeeCode, employeeName, batchSubmissionMap, batchApprovalMap]);

    // One pass for the three footers. Rows and footers print through the same `money`, so a footer
    // equals the sum of the rows above it to the paisa (they once used different decimal places).
    const totals = useMemo(
        () => batchRows.reduce(
            (t, r) => ({
                requested: t.requested + r.totalRequestAmount,
                paid: t.paid + r.totalAmountPaid,
                remaining: t.remaining + r.totalRemainingAmount,
            }),
            { requested: 0, paid: 0, remaining: 0 },
        ),
        [batchRows],
    );

    const openBatch = useCallback((r: BatchRow) => {
        setSelectedApprovalInstanceId(r.approvalInstanceId ?? null);
        setSelectedBatchId(r.batchId);
    }, []);

    const columns = useMemo<ColumnDef<BatchRow, any>[]>(() => {
        const amountCell = (n: number, className?: string) => (
            <span className={cn('tabular', className, sensitiveCls)}>{money(n)}</span>
        );
        return [
            {
                accessorKey: 'submissionId',
                meta: { label: 'Batch ID' },
                header: ({ column }) => <SortableHeader column={column} title="Batch ID" />,
                cell: ({ row }) => <Badge variant="brand" className="font-mono tracking-wide">{row.original.submissionId}</Badge>,
                footer: () => <span className="uppercase">Total</span>,
            },
            {
                accessorKey: 'totalRequests',
                meta: { label: 'Total requests' },
                header: ({ column }) => <SortableHeader column={column} title="Total Requests" />,
                // Kept as its own control (the row opens the batch too) so the count reads as a link to the lines.
                cell: ({ row }) => (
                    <Button
                        variant="link"
                        className="tabular h-auto p-0"
                        aria-label={`Open the ${row.original.totalRequests} requests in ${row.original.submissionId}`}
                        onClick={() => openBatch(row.original)}
                    >
                        {row.original.totalRequests}
                    </Button>
                ),
            },
            {
                accessorKey: 'totalRequestAmount',
                meta: { label: 'Total request amount', exportValue: (r) => fmtAmount(r.totalRequestAmount) },
                header: ({ column }) => <SortableHeader column={column} title="Total Request Amount" />,
                cell: ({ row }) => amountCell(row.original.totalRequestAmount, 'text-muted-foreground'),
                footer: () => amountCell(totals.requested),
            },
            {
                accessorKey: 'totalAmountPaid',
                meta: { label: 'Total paid amount', exportValue: (r) => fmtAmount(r.totalAmountPaid) },
                header: ({ column }) => <SortableHeader column={column} title="Total Paid Amount" />,
                cell: ({ row }) => amountCell(row.original.totalAmountPaid, 'font-semibold text-success-foreground'),
                footer: () => amountCell(totals.paid, 'text-success-foreground'),
            },
            {
                accessorKey: 'totalRemainingAmount',
                meta: { label: 'Total remaining amount', exportValue: (r) => fmtAmount(r.totalRemainingAmount) },
                header: ({ column }) => <SortableHeader column={column} title="Total Remaining Amount" />,
                // Settled reads as success; anything still owed stays the plain foreground figure.
                cell: ({ row }) => amountCell(
                    row.original.totalRemainingAmount,
                    row.original.totalRemainingAmount > 0 ? 'font-semibold text-foreground' : 'text-success-foreground',
                ),
                footer: () => amountCell(totals.remaining),
            },
        ];
    }, [totals, sensitiveCls, openBatch]);

    return (
        <>
        <div className="mt-4 lg:mt-8">
            <div className="mb-4 px-3 lg:mb-6 lg:px-0">
                <h2 className="m-0 mb-1 text-base font-bold text-foreground lg:text-lg">Reimbursement Payment History</h2>
                <p className="m-0 text-xs text-muted-foreground">
                    What you were <strong>paid</strong> in {periodLabel} — by payment date. A batch
                    appears here once it has a payment recorded in this window.
                </p>
            </div>
            {historyError && !loading ? (
                <LoadErrorState what="your payment history" onRetry={loadPayments} />
            ) : (
                <DataTable<BatchRow>
                    caption={`Reimbursement payment history, ${periodLabel}`}
                    columns={columns}
                    data={batchRows}
                    getRowId={(r) => r.id}
                    loading={loading}
                    searchPlaceholder="Search payments"
                    stateKey="reimbursement.payment-history"
                    selectable
                    selectionActions={(_rows, _clear, ctx) => <DataTableExport columns={columns} ctx={ctx} filename="Payment history" />}
                    toolbar={(ctx) => <DataTableExport columns={columns} ctx={ctx} filename="Payment history" />}
                    onRowClick={openBatch}
                    rowLabel={(r) => `Open payment details for ${r.submissionId}`}
                    // Same panel the admin Payment tab renders. This markup existed twice and the
                    // copies had already drifted.
                    renderDetail={(r) => (
                        <PaymentDetailPanel
                            payments={(r.payments || []).map((p: any) => ({ ...p, paymentMadeBy: p._paymentMadeBy }))}
                        />
                    )}
                    renderCard={(r) => <PaymentHistoryCard row={r} onOpen={() => openBatch(r)} sensitiveCls={sensitiveCls} />}
                    empty={
                        <EmptyState
                            size="sm"
                            title={`No payments in ${periodLabel}`}
                            description="A batch shows here once a payment against it is recorded in this period."
                        />
                    }
                />
            )}
        </div>

        <BatchDetailModal
            batchId={selectedBatchId}
            onClose={() => setSelectedBatchId(null)}
            onBatchActionDone={() => {}}
            approvalInstanceId={selectedApprovalInstanceId}
            // Was filterStatus={1}: the batch detail showed only approved lines, so pending and
            // rejected siblings inside the same batch were invisible with nothing saying so.
            filterStatus={null}
        />
        </>
    );
};

/** One paid batch, as it reads on a phone: what was paid leads, then what is still owed. */
function PaymentHistoryCard({ row, onOpen, sensitiveCls }: { row: BatchRow; onOpen: () => void; sensitiveCls: string }) {
    const settled = row.totalRemainingAmount <= 0;
    return (
        <button
            type="button"
            data-wt-control="row"
            onClick={onOpen}
            // A blurred amount must not be read aloud, so the spoken name carries only the batch.
            aria-label={`Open payment details for ${row.submissionId}`}
            className="w-full rounded-2xl border bg-card px-4 py-3.5 text-left shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
            <span className="flex items-start justify-between gap-3">
                <span>
                    <span className={cn('block tabular text-xl leading-tight font-extrabold text-success-foreground', sensitiveCls)}>
                        {money(row.totalAmountPaid)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                        paid · {row.totalRequests} request{row.totalRequests === 1 ? '' : 's'}
                    </span>
                </span>
                <Badge variant="brand" className="font-mono tracking-wide">{row.submissionId}</Badge>
            </span>
            <span className="my-3 block h-px bg-border" aria-hidden />
            <span className="grid grid-cols-2 gap-2 text-xs">
                <span>
                    <span className="block text-muted-foreground">Requested</span>
                    <span className={cn('block tabular font-semibold text-foreground', sensitiveCls)}>{money(row.totalRequestAmount)}</span>
                </span>
                <span>
                    <span className="block text-muted-foreground">Remaining</span>
                    <span className={cn('block tabular font-semibold', settled ? 'text-success-foreground' : 'text-foreground', sensitiveCls)}>
                        {money(row.totalRemainingAmount)}
                    </span>
                </span>
            </span>
        </button>
    );
}

export default ReimbursementPaymentHistoryTable;
