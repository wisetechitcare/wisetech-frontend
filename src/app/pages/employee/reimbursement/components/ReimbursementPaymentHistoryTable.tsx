import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import dayjs from 'dayjs';
import { IReimbursementPayment } from '@models/employee';
import { fetchReimbursementPayments, fetchReimbursementBatchById, fetchApprovalInstanceByRequest } from '@services/employee';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { BatchDetailModal } from '../shared/ReimbursementBatchShared';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { fmtDate, fmtAmount, formatINR } from '../utils/reimbursementFormat';
import PaymentDetailPanel from './PaymentDetailPanel';
import { clickableRowProps, CLICKABLE_ROW_SX } from '../utils/rowInteraction';
import LoadErrorState from './LoadErrorState';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

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

// Rows and footers render the SAME column, so they must agree to the paisa. `formatINR`
// used maximumFractionDigits: 0 while the row formatter used 2 — a footer literally did not
// equal the sum of the rows above it.






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

const ReimbursementPaymentHistoryTable: React.FC<ReimbursementPaymentHistoryTableProps> = ({
    employeeId,
    employeeCode,
    employeeName,
    refreshKey,
    period,
    periodDate,
}) => {
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
        try {
            const { startDate, endDate } = await getDateRange();
            const data = await fetchReimbursementPayments(employeeId, startDate, endDate);
            const sorted = (data as any[]).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            setPayments(sorted);

            // Resolve submissionId for each unique batchId
            const uniqueBatchIds = Array.from(
                new Set(
                    sorted
                        .map((p: any) => p.batch?.id || p.batchId)
                        .filter(Boolean),
                ),
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

    const grandTotalPaid = useMemo(
        () => batchRows.reduce((s, r) => s + r.totalAmountPaid, 0),
        [batchRows],
    );

    const grandTotalRequestAmount = useMemo(
        () => batchRows.reduce((s, r) => s + r.totalRequestAmount, 0),
        [batchRows],
    );

    const grandTotalRemainingAmount = useMemo(
        () => batchRows.reduce((s, r) => s + r.totalRemainingAmount, 0),
        [batchRows],
    );

    const columns = useMemo(
        () => [
            {
                accessorKey: 'submissionId',
                header: 'Batch ID',
                size: 200,
                Cell: ({ renderedCellValue }: any) => (
                    <span
                        style={{
                            display: 'inline-block',
                            background: '#fef2f2',
                            color: '#1E3A8A',
                            fontWeight: 700,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontFamily: 'monospace',
                            letterSpacing: '0.03em',
                        }}
                    >
                        {renderedCellValue}
                    </span>
                ),
                Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
            },
            {
                accessorKey: 'totalRequests',
                header: 'Total Requests',
                size: 140,
                Cell: ({ row, renderedCellValue }: any) => (
                    <button
                        className="btn btn-link p-0 fw-bold fs-7"
                        style={{ textDecoration: 'none', color: '#1E3A8A' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApprovalInstanceId(row.original.approvalInstanceId ?? null);
                            setSelectedBatchId(row.original.batchId);
                        }}
                    >
                        {renderedCellValue}
                    </button>
                ),
            },
            {
                accessorKey: 'totalRequestAmount',
                header: 'Total Request Amount',
                size: 200,
                Cell: ({ renderedCellValue }: any) => (
                    <span className="fw-bold fs-7" style={{ color: '#475569' }}>
                        ₹{fmtAmount(Number(renderedCellValue))}
                    </span>
                ),
                Footer: () => (
                    <span style={{ color: '#475569', fontWeight: 700, fontSize: '1rem' }}>
                        {formatINR(grandTotalRequestAmount)}
                    </span>
                ),
            },
            {
                accessorKey: 'totalAmountPaid',
                header: 'Total Paid Amount',
                size: 185,
                Cell: ({ renderedCellValue }: any) => (
                    <span className="fw-bolder fs-6" style={{ color: '#16a34a' }}>
                        ₹{fmtAmount(Number(renderedCellValue))}
                    </span>
                ),
                Footer: () => (
                    <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>
                        {formatINR(grandTotalPaid)}
                    </span>
                ),
            },
            {
                accessorKey: 'totalRemainingAmount',
                header: 'Total Remaining Amount',
                size: 220,
                Cell: ({ renderedCellValue }: any) => (
                    <span
                        className="fw-bolder fs-6"
                        style={{
                            color: Number(renderedCellValue) > 0 ? '#1E3A8A' : '#16a34a',
                        }}
                    >
                        ₹{fmtAmount(Number(renderedCellValue))}
                    </span>
                ),
                Footer: () => (
                    <span style={{ color: '#1E3A8A', fontWeight: 700, fontSize: '1rem' }}>
                        {formatINR(grandTotalRemainingAmount)}
                    </span>
                ),
            },
        ],
        [grandTotalPaid, grandTotalRequestAmount, grandTotalRemainingAmount],
    );

    return (
        <>
        <div className="mt-10">
            <div className="mb-6">
                <h2 className="mb-1">Reimbursement Payment History</h2>
                <div className="text-muted fs-7">
                    What you were <strong>paid</strong> in {periodLabel} — by payment date. A batch
                    appears here once it has a payment recorded in this window.
                </div>
            </div>
            <div className="card shadow-sm">
                <div className="card-body p-6">
                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center py-12">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    ) : historyError ? (
                        <LoadErrorState what="your payment history" onRetry={loadPayments} />
                    ) : (
                        <MaterialTable
                            data={batchRows}
                            columns={columns}
                            tableName="ReimbursementPaymentHistory"
                            showColumnFooter={true}
                            enableStatusColorCoding={false}
                            isLoading={loading}
                            muiTableProps={{
                                muiTableBodyRowProps: ({ row }: any) => ({
                                    ...clickableRowProps(() => {
                                        setSelectedApprovalInstanceId(row.original.approvalInstanceId ?? null);
                                        setSelectedBatchId(row.original.batchId);
                                    }, `Open payment details for ${row.original.submissionId ?? 'this batch'}`),
                                    sx: { ...CLICKABLE_ROW_SX, '&:hover td': { backgroundColor: '#F8FAFC' } },
                                }),
                            }}
                            renderDetailPanel={({ row }: any) => (
                              // Same panel the admin Payment tab renders. This markup
                              // existed twice and the copies had already drifted.
                              <PaymentDetailPanel
                                payments={(row.original.payments || []).map((p: any) => ({
                                  ...p,
                                  paymentMadeBy: p._paymentMadeBy,
                                }))}
                              />
                            )}
                        />
                    )}
                </div>
            </div>
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

export default ReimbursementPaymentHistoryTable;
