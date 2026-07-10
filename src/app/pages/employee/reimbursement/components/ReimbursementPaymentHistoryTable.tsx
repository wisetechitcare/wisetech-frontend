import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import dayjs from 'dayjs';
import { IReimbursementPayment } from '@models/employee';
import { fetchReimbursementPayments, fetchReimbursementBatchById, fetchApprovalInstanceByRequest } from '@services/employee';
import PeriodTabs from '@app/modules/common/components/PeriodTabs';
import PeriodNavigator from '@app/modules/common/components/PeriodNavigator';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { BatchDetailModal } from '../shared/ReimbursementBatchShared';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

type PeriodFilter = 'monthly' | 'yearly' | 'allTime';

interface ReimbursementPaymentHistoryTableProps {
    employeeId: string;
    employeeCode?: string;
    employeeName?: string;
    refreshKey?: number;
}

const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

function fmtAmount(n: number | string) {
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtDate(d?: string) {
    if (!d) return 'N/A';
    return dayjs(d).format('DD MMM YYYY');
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

const ReimbursementPaymentHistoryTable: React.FC<ReimbursementPaymentHistoryTableProps> = ({
    employeeId,
    employeeCode,
    employeeName,
    refreshKey,
}) => {
    const [filter, setFilter] = useState<PeriodFilter>('monthly');
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [fiscalYearLabel, setFiscalYearLabel] = useState('');
    const [payments, setPayments] = useState<(IReimbursementPayment & Record<string, any>)[]>([]);
    const [batchSubmissionMap, setBatchSubmissionMap] = useState<Map<string, string>>(new Map());
    const [batchApprovalMap, setBatchApprovalMap] = useState<Map<string, string | null>>(new Map());
    const [loading, setLoading] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [selectedApprovalInstanceId, setSelectedApprovalInstanceId] = useState<string | null>(null);

    const getDateRange = useCallback(() => {
        if (filter === 'monthly') {
            return {
                startDate: currentDate.startOf('month').toISOString(),
                endDate: currentDate.endOf('month').toISOString(),
            };
        }
        if (filter === 'yearly') {
            return {
                startDate: currentDate.startOf('year').toISOString(),
                endDate: currentDate.endOf('year').toISOString(),
            };
        }
        return { startDate: undefined, endDate: undefined };
    }, [filter, currentDate]);

    const loadPayments = useCallback(async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const { startDate, endDate } = getDateRange();
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

            const entries = await Promise.all(
                uniqueBatchIds.map(async (id) => {
                    try {
                        const [batchRes, instanceRes] = await Promise.all([
                            fetchReimbursementBatchById(id),
                            fetchApprovalInstanceByRequest('ReimbursementBatch', id).catch(() => null),
                        ]);
                        const b = batchRes?.data?.batch || batchRes?.batch;
                        const instance = instanceRes?.data || instanceRes;
                        return { id, submissionId: b?.submissionId || id, approvalInstanceId: instance?.id ?? null };
                    } catch {
                        return { id, submissionId: id, approvalInstanceId: null };
                    }
                }),
            );
            setBatchSubmissionMap(new Map(entries.map((e) => [e.id, e.submissionId])));
            setBatchApprovalMap(new Map(entries.map((e) => [e.id, e.approvalInstanceId])));
        } catch {
            setPayments([]);
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

    const navigate = (dir: -1 | 1) => {
        if (filter === 'monthly') setCurrentDate((d) => d.add(dir, 'month'));
        if (filter === 'yearly') setCurrentDate((d) => d.add(dir, 'year'));
    };

    const handleFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: PeriodFilter | null) => {
        if (!newFilter) return;
        setFilter(newFilter);
        setCurrentDate(dayjs());
    };

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
                            color: '#AA393D',
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
                        style={{ textDecoration: 'none', color: '#AA393D' }}
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
                            color: Number(renderedCellValue) > 0.005 ? '#AA393D' : '#16a34a',
                        }}
                    >
                        ₹{fmtAmount(Number(renderedCellValue))}
                    </span>
                ),
                Footer: () => (
                    <span style={{ color: '#AA393D', fontWeight: 700, fontSize: '1rem' }}>
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
            <h2 className="mb-6">Reimbursement Payment History</h2>
            <div className="card shadow-sm">
                <div className="card-body p-6">
                    <div className="d-flex flex-md-row flex-column justify-content-lg-between align-items-lg-center gap-5 gap-lg-0 mb-3">
                        <PeriodTabs
                            value={filter}
                            options={[
                                { label: 'Monthly', value: 'monthly' },
                                { label: 'Yearly', value: 'yearly' },
                                { label: 'All Time', value: 'allTime' },
                            ]}
                            onChange={(val) => handleFilterChange(null as any, val as PeriodFilter)}
                            ariaLabel="payment history period"
                        />
                        {filter !== 'allTime' && (
                            <PeriodNavigator
                                label={periodLabel}
                                onPrevious={() => navigate(-1)}
                                onNext={() => navigate(1)}
                            />
                        )}
                    </div>

                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center py-12">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
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
                                    onClick: () => {
                                        setSelectedApprovalInstanceId(row.original.approvalInstanceId ?? null);
                                        setSelectedBatchId(row.original.batchId);
                                    },
                                    sx: { cursor: 'pointer', '&:hover td': { backgroundColor: '#F8FAFC' } },
                                }),
                            }}
                            renderDetailPanel={({ row }: any) => {
                                const rowPayments: any[] = row.original.payments || [];
                                if (rowPayments.length === 0) {
                                    return (
                                        <div
                                            style={{
                                                padding: '20px 24px',
                                                backgroundColor: '#fafafa',
                                                borderTop: '1px solid #e0e0e0',
                                                color: '#9e9e9e',
                                                fontSize: 13,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            No payment records found for this period.
                                        </div>
                                    );
                                }

                                const detailHeaders = [
                                    { label: 'Payment Date', width: '28%' },
                                    { label: 'Payment Made By', width: '28%' },
                                    { label: 'Method', width: '22%' },
                                    { label: 'Amount Paid', width: '22%' },
                                ];

                                return (
                                    <div style={{ backgroundColor: '#f5f5f5', borderTop: '2px solid #e0e0e0' }}>
                                        <table
                                            style={{
                                                width: '100%',
                                                borderCollapse: 'collapse',
                                                tableLayout: 'fixed',
                                            }}
                                        >
                                            <thead>
                                                <tr style={{ backgroundColor: '#eeeeee' }}>
                                                    {detailHeaders.map(({ label, width }) => (
                                                        <th
                                                            key={label}
                                                            style={{
                                                                width,
                                                                padding: '9px 16px',
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                color: '#616161',
                                                                letterSpacing: '0.05em',
                                                                textTransform: 'uppercase',
                                                                textAlign: 'left',
                                                                whiteSpace: 'nowrap',
                                                                borderBottom: '1px solid #e0e0e0',
                                                                borderRight: '1px solid #e0e0e0',
                                                            }}
                                                        >
                                                            {label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rowPayments.map((p: any, i: number) => (
                                                    <tr
                                                        key={i}
                                                        style={{
                                                            backgroundColor: '#ffffff',
                                                            borderBottom: '1px solid #eeeeee',
                                                            transition: 'background-color 0.15s ease',
                                                        }}
                                                        onMouseEnter={(e) =>
                                                            (e.currentTarget.style.backgroundColor = '#f5f5f5')
                                                        }
                                                        onMouseLeave={(e) =>
                                                            (e.currentTarget.style.backgroundColor = '#ffffff')
                                                        }
                                                    >
                                                        <td
                                                            style={{
                                                                padding: '10px 16px',
                                                                borderRight: '1px solid #eeeeee',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 10,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        width: 30,
                                                                        height: 30,
                                                                        borderRadius: 6,
                                                                        backgroundColor: '#e8f5e9',
                                                                        flexShrink: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    <KTIcon
                                                                        iconName="calendar-8"
                                                                        className="fs-5 text-success"
                                                                    />
                                                                </div>
                                                                <span
                                                                    style={{
                                                                        fontSize: 13,
                                                                        fontWeight: 600,
                                                                        color: '#212121',
                                                                    }}
                                                                >
                                                                    {fmtDate(p.paymentDate)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: '10px 16px',
                                                                borderRight: '1px solid #eeeeee',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: 500,
                                                                    color: '#424242',
                                                                }}
                                                            >
                                                                {p._paymentMadeBy || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: '10px 16px',
                                                                borderRight: '1px solid #eeeeee',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    display: 'inline-block',
                                                                    padding: '3px 10px',
                                                                    borderRadius: 4,
                                                                    fontSize: 11,
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.04em',
                                                                    backgroundColor: '#e3f2fd',
                                                                    color: '#1565c0',
                                                                    textTransform: 'uppercase',
                                                                }}
                                                            >
                                                                {String(p.paymentMethod || 'CASH').replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            <span
                                                                style={{
                                                                    fontSize: 14,
                                                                    fontWeight: 700,
                                                                    color: '#2e7d32',
                                                                }}
                                                            >
                                                                {formatINR(Number(p.amountPaid || 0))}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            }}
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
            filterStatus={1}
        />
        </>
    );
};

export default ReimbursementPaymentHistoryTable;
