import { useCallback, useEffect, useMemo, useState } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { KTIcon } from '@metronic/helpers';
import {
  fetchReimbursementBatches,
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
  fetchPendingApprovals,
  fetchAllApprovalInstances,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { getSocket } from '@utils/socketClient';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  BatchRow,
  BatchDetailModal,
  RejectReasonModal,
  fmtDate,
  fmtAmount,
  statusBadge,
} from './shared/ReimbursementBatchShared';


type TabKey = 'pending' | 'approved' | 'rejected' | 'completed';
type TabItem = { key: TabKey; label: string };

const TABS: TabItem[] = [
  { key: 'pending', label: 'Pending My Action' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed', label: 'Completed' },
];

function ReimbursementBatchApprovals() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);
  const [detailFilterStatus, setDetailFilterStatus] = useState<number | null>(null);

  const [rejectTarget, setRejectTarget] = useState<BatchRow | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const buildRows = useCallback((batches: any[], approvalSteps: any[]) => {
    const instanceMap: Record<string, string> = {};
    for (const step of approvalSteps) {
      if (step.instance?.requestModel === 'ReimbursementBatch') {
        instanceMap[step.instance.requestId] = step.instance.id;
      }
    }
    return batches.map((b: any) => ({
      ...b,
      approvalInstanceId: instanceMap[b.id] ?? null,
      rejectionReason: b.rejectReason ?? null,
    }));
  }, []);

  // Builds a single grouped-row object from a subset of reimbursements within a batch.
  const buildGroupedRow = useCallback((
    batchMeta: any,
    items: any[],
    status: number,
    instanceMap: Record<string, string>,
  ) => {
    const totalAmount = items.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    let paymentStatus: string | null = null;
    if (status === 1) {
      const paidCount = items.filter((r) => r.paymentStatus === 'PAID').length;
      const partialCount = items.filter((r) => r.paymentStatus === 'PARTIAL').length;
      if (paidCount === items.length) paymentStatus = 'PAID';
      else if (paidCount > 0 || partialCount > 0) paymentStatus = 'PARTIAL';
      else paymentStatus = 'UNPAID';
    }

    const rejectReason =
      status === 2
        ? items.find((r) => r.rejectReason)?.rejectReason ||
          items.find((r) => r.rejectionReason)?.rejectionReason ||
          null
        : null;

    return {
      _batchId: batchMeta.id,
      _submissionId: batchMeta.submissionId,
      _submittedAt: batchMeta.submittedAt,
      _status: status,
      _totalRequests: items.length,
      _totalAmount: totalAmount,
      _paymentStatus: paymentStatus,
      _rejectReason: rejectReason,
      _approvalInstanceId: instanceMap[batchMeta.id] ?? null,
      employee: batchMeta.employee,
    };
  }, []);

  const load = useCallback(async (tab: TabKey = activeTab) => {
    setLoading(true);
    try {
      const [batchRes, approvalRes] = await Promise.all([
        fetchReimbursementBatches(),
        tab === 'pending' ? fetchPendingApprovals() : fetchAllApprovalInstances('completed'),
      ]);

      const allBatches: any[] = batchRes?.data?.batches || batchRes?.batches || [];
      const approvalSteps: any[] = approvalRes?.data ?? approvalRes ?? [];
      const reimbBatchSteps = approvalSteps.filter((s: any) => s.instance?.requestModel === 'ReimbursementBatch');

      // Build instance ID map for attaching to expanded rows
      const instanceMap: Record<string, string> = {};
      for (const step of reimbBatchSteps) {
        if (step.instance?.requestId) {
          instanceMap[step.instance.requestId] = step.instance.id;
        }
      }

      if (tab === 'pending') {
        const pendingBatchIds = new Set(reimbBatchSteps.map((s: any) => s.instance.requestId));
        const filtered = allBatches.filter((b: any) => b.status === 0 || pendingBatchIds.has(b.id));
        const built = buildRows(filtered, reimbBatchSteps);
        setRows(built as BatchRow[]);
        setExpandedRows([]);
      } else {
        // For approved / rejected / completed tabs: fetch detail for all completed batches,
        // then split each batch's reimbursements by their individual approval status.
        const completedBatches = allBatches.filter((b: any) => b.status !== 0);

        const detailResults = await Promise.all(
          completedBatches.map((b: any) =>
            fetchReimbursementBatchById(b.id)
              .then((r: any) => ({ batchMeta: b, batch: r?.data?.batch || r?.batch || null }))
              .catch(() => ({ batchMeta: b, batch: null })),
          ),
        );

        const grouped: any[] = [];

        for (const { batchMeta, batch } of detailResults) {
          const reimbursements: any[] = batch?.reimbursements ?? [];

          if (tab === 'completed') {
            // Show one row per status group so every processed request is visible
            // with its correct final approval status (approved, rejected, or mixed).
            const statusGroups: Record<number, any[]> = {};
            for (const r of reimbursements) {
              const s = typeof r.status === 'number' ? r.status : 0;
              if (s === 0) continue; // skip still-pending items inside a completed batch
              if (!statusGroups[s]) statusGroups[s] = [];
              statusGroups[s].push(r);
            }
            for (const [statusStr, items] of Object.entries(statusGroups)) {
              grouped.push(buildGroupedRow(batchMeta, items, Number(statusStr), instanceMap));
            }
          } else {
            // Approved or Rejected tab: only include the matching status group.
            const statusFilter = tab === 'approved' ? 1 : 2;
            const filtered = reimbursements.filter((r) => {
              const s = typeof r.status === 'number' ? r.status : 0;
              return s === statusFilter;
            });
            if (filtered.length === 0) continue;
            grouped.push(buildGroupedRow(batchMeta, filtered, statusFilter, instanceMap));
          }
        }

        setExpandedRows(grouped);
        setRows([]);
      }
    } catch {
      setRows([]);
      setExpandedRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildRows, buildGroupedRow]);

  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => load();
    socket.on('approval:pending', handler);
    return () => { socket.off('approval:pending', handler); };
  }, [load]);

  // Refresh when any reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

  const handleApprove = async (row: BatchRow) => {
    setProcessingId(row.id);
    try {
      if (row.approvalInstanceId) {
        await processApprovalAction(row.approvalInstanceId, 'approve');
      } else {
        const res = await fetchReimbursementBatchById(row.id);
        const batch = res?.data?.batch || res?.batch;
        const pending = batch?.reimbursements?.filter((r: any) => r.status === 0) || [];
        for (const r of pending) {
          await processBatchRequestAction(row.id, r.id, 'approve');
        }
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      successConfirmation('Batch approved!', 'Approved');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to approve');
    } finally { setProcessingId(null); }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      if (rejectTarget.approvalInstanceId) {
        await processApprovalAction(rejectTarget.approvalInstanceId, 'reject', reason);
      } else {
        const res = await fetchReimbursementBatchById(rejectTarget.id);
        const batch = res?.data?.batch || res?.batch;
        const pending = batch?.reimbursements?.filter((r: any) => r.status === 0) || [];
        for (const r of pending) {
          await processBatchRequestAction(rejectTarget.id, r.id, 'reject', reason);
        }
      }
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      successConfirmation('Batch rejected', 'Rejected');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to reject');
    } finally { setRejectSubmitting(false); }
  };

  const openDetail = useCallback((r: BatchRow) => {
    setDetailBatchId(r.id);
    setDetailInstanceId(r.approvalInstanceId || null);
    setDetailFilterStatus(null); // pending batch — show all requests to the approver
  }, []);

  const openExpandedDetail = useCallback((row: any) => {
    setDetailBatchId(row._batchId);
    setDetailInstanceId(row._approvalInstanceId || null);
    setDetailFilterStatus(row._status ?? null);
  }, []);

  // Columns for the Pending tab (batch-level rows)
  const columns = useMemo<MRT_ColumnDef<BatchRow>[]>(() => [
    {
      accessorKey: 'employeeName',
      header: 'Employee Name',
      size: 200,
      Cell: ({ row }) => {
        const { firstName, lastName } = row.original.employee?.users || {};
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        return (
          <button
            className='btn btn-link p-0 text-primary fw-semibold fs-7'
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            onClick={() => openDetail(row.original)}
            title='View submission details'
          >
            {fullName || 'N/A'}
          </button>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount (₹)',
      size: 150,
      Cell: ({ row }) => <span className='text-dark fs-7'>₹{fmtAmount(row.original.totalAmount)}</span>,
    },
    {
      accessorKey: 'totalRequests',
      header: 'Total Requests',
      size: 130,
      Cell: ({ row }) => (
        <button
          className='btn btn-link p-0 text-primary fw-semibold fs-7'
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          onClick={() => openDetail(row.original)}
          title='View submission details'
        >
          {row.original.totalRequests}
        </button>
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted On',
      size: 140,
      Cell: ({ row }) => <span className='text fs-7'>{fmtDate(row.original.submittedAt)}</span>,
    },
    {
      accessorKey: 'actions',
      header: 'Action',
      size: 120,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const r = row.original;
        const isProcessing = processingId === r.id;
        return (
          <div className='d-flex gap-2 align-items-center'>
            <button
              className='btn btn-icon btn-sm rounded-circle'
              style={{ background: '#10b981', color: 'white', width: 32, height: 32, minWidth: 32, padding: 0 }}
              title='Approve'
              disabled={isProcessing}
              onClick={() => handleApprove(r)}
            >
              {isProcessing
                ? <span className='spinner-border spinner-border-sm' style={{ color: 'white', width: 14, height: 14 }} />
                : <i className='bi bi-check-lg fs-6' style={{ color: 'white' }} />}
            </button>
            <button
              className='btn btn-icon btn-sm rounded-circle'
              style={{ background: '#ef4444', color: 'white', width: 32, height: 32, minWidth: 32, padding: 0 }}
              title='Reject'
              disabled={isProcessing}
              onClick={() => setRejectTarget(r)}
            >
              <i className='bi bi-x-lg fs-6' style={{ color: 'white' }} />
            </button>
          </div>
        );
      },
    },
  ], [processingId, openDetail, handleApprove, setRejectTarget]);

  // Columns for Approved / Rejected tabs (batch-grouped summary rows)
  const expandedColumns = useMemo<MRT_ColumnDef<any>[]>(() => [
    {
      accessorKey: 'employeeName',
      header: 'Employee Name',
      size: 200,
      Cell: ({ row }: any) => {
        const { firstName, lastName } = row.original.employee?.users || {};
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        return (
          <button
            className='btn btn-link p-0 text-primary fw-semibold fs-7'
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            onClick={() => openExpandedDetail(row.original)}
            title='View submission details'
          >
            {fullName || 'N/A'}
          </button>
        );
      },
    },
    {
      accessorKey: '_submissionId',
      header: 'Submission ID',
      size: 160,
      Cell: ({ row }: any) => <span className='text-dark fs-7'>{row.original._submissionId || 'N/A'}</span>,
    },
    {
      accessorKey: '_totalRequests',
      header: 'Total Requests',
      size: 130,
      Cell: ({ row }: any) => <span className='text-dark fs-7'>{row.original._totalRequests}</span>,
    },
    {
      accessorKey: '_totalAmount',
      header: 'Total Amount (₹)',
      size: 145,
      Cell: ({ row }: any) => <span className='text-dark fs-7'>₹{fmtAmount(row.original._totalAmount)}</span>,
    },
    {
      accessorKey: '_submittedAt',
      header: 'Submitted On',
      size: 140,
      Cell: ({ row }: any) => <span className='text fs-7'>{fmtDate(row.original._submittedAt)}</span>,
    },
    {
      accessorKey: '_status',
      header: 'Approval Status',
      size: 130,
      Cell: ({ row }: any) => statusBadge(row.original._status ?? 0),
    },
    {
      id: 'rejectionReason',
      header: 'Rejection Reason',
      size: 220,
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        if (row.original._status !== 2) return <span className='text-muted fs-7'>N/A</span>;
        const reason = row.original._rejectReason;
        return reason
          ? <span className='text-danger fs-7'>{reason}</span>
          : <span className='text-muted fs-7'>N/A</span>;
      },
    },
    ...(activeTab === 'approved' || activeTab === 'completed' ? [{
      accessorKey: '_paymentStatus',
      header: 'Payment Status',
      size: 145,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        if (row.original._status !== 1) return <span className='text-muted fs-7'>N/A</span>;
        const ps = row.original._paymentStatus;
        if (ps === 'PAID') return <span className='badge badge-light-success text-success fw-bold px-3 py-2 fs-8'>Paid</span>;
        if (ps === 'PARTIAL') return <span className='badge badge-light-info text-info fw-bold px-3 py-2 fs-8'>Partially Paid</span>;
        return <span className='badge badge-light-warning text-warning fw-bold px-3 py-2 fs-8'>Pending</span>;
      },
    }] : []),
  ], [activeTab, openExpandedDetail]);

  return (
    <>
      <div className='d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2'>
        <div className='d-flex gap-2 flex-wrap'>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-light'}`}
            >
              {t.label}
              {t.key === 'pending' && rows.length > 0 && activeTab === 'pending' && (
                <span className='badge badge-circle badge-white ms-2 text-primary fw-bold'>
                  {rows.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className='btn btn-sm btn-light-primary d-flex align-items-center gap-2' onClick={() => load(activeTab)} disabled={loading}>
          <KTIcon iconName='arrows-circle' className='fs-5' />{loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {activeTab === 'pending' ? (
        <MaterialTable data={rows} columns={columns} tableName='Reimbursement Approvals' hideFilters={false} hideExportCenter />
      ) : (
        <MaterialTable
          data={expandedRows}
          columns={expandedColumns}
          tableName='Reimbursement Completed'
          hideFilters={false}
          hideExportCenter
          muiTableProps={{
            muiTableBodyRowProps: ({ row }: any) => {
              const s = row.original?._status ?? 0;
              const colorMap: Record<number, { bg: string; border: string; hover: string }> = {
                1: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                2: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
              };
              const c = colorMap[s] ?? null;
              return {
                onClick: () => openExpandedDetail(row.original),
                sx: {
                  cursor: 'pointer',
                  backgroundColor: c ? c.bg : undefined,
                  '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                  transition: 'background-color 0.12s ease',
                  '&:hover td': { backgroundColor: c ? `${c.hover} !important` : '#F8FAFC' },
                },
              };
            },
          }}
        />
      )}

      <BatchDetailModal
        batchId={detailBatchId}
        onClose={() => { setDetailBatchId(null); setDetailInstanceId(null); setDetailFilterStatus(null); }}
        onBatchActionDone={() => load(activeTab)}
        approvalInstanceId={detailInstanceId}
        filterStatus={detailFilterStatus}
      />

      <RejectReasonModal
        show={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
        title='Reject Reimbursement Batch'
      />
    </>
  );
}

export default ReimbursementBatchApprovals;
