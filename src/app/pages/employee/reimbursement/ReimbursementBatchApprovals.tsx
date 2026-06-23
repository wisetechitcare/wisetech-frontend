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
import {
  BatchRow,
  BatchDetailModal,
  RejectReasonModal,
  fmtDate,
  fmtAmount,
} from './shared/ReimbursementBatchShared';


type TabKey = 'pending' | 'approved' | 'rejected';
type TabItem = { key: TabKey; label: string };

const TABS: TabItem[] = [
  { key: 'pending', label: 'Pending My Action' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function ReimbursementBatchApprovals() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);

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

  const load = useCallback(async (tab: TabKey = activeTab) => {
    setLoading(true);
    try {
      const [batchRes, approvalRes] = await Promise.all([
        fetchReimbursementBatches(),
        tab === 'pending' ? fetchPendingApprovals() : fetchAllApprovalInstances(tab === 'approved' ? 'completed' : 'completed'),
      ]);

      const allBatches: any[] = batchRes?.data?.batches || batchRes?.batches || [];
      const approvalSteps: any[] = approvalRes?.data ?? approvalRes ?? [];
      const reimbBatchSteps = approvalSteps.filter((s: any) => s.instance?.requestModel === 'ReimbursementBatch');

      let filtered: any[];
      if (tab === 'pending') {
        const pendingBatchIds = new Set(reimbBatchSteps.map((s: any) => s.instance.requestId));
        filtered = allBatches.filter((b: any) => b.status === 0 || pendingBatchIds.has(b.id));
      } else if (tab === 'approved') {
        filtered = allBatches.filter((b: any) => b.status === 1);
      } else {
        filtered = allBatches.filter((b: any) => b.status === 2);
      }

      const built = buildRows(filtered, reimbBatchSteps);
      setRows(built as BatchRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildRows]);

  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => load();
    socket.on('approval:pending', handler);
    return () => { socket.off('approval:pending', handler); };
  }, [load]);

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
  }, []);

  const columns = useMemo<MRT_ColumnDef<BatchRow>[]>(() => [
    {
      accessorKey: 'employee.employeeCode',
      header: 'Employee ID',
      size: 130,
      Cell: ({ row }) => (
        <span className='text-dark fw-semibold fs-7'>{row.original.employee?.employeeCode || '—'}</span>
      ),
    },
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
            {fullName || '—'}
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
    ...(activeTab === 'rejected' ? [{
      accessorKey: 'rejectionReason',
      header: 'Reject Reason',
      size: 220,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const reason = row.original.rejectionReason;
        return reason
          ? <span className='text-danger fs-7'>{reason}</span>
          : <span className='text-muted fs-7'>N/A</span>;
      },
    }] : []),
    ...(activeTab === 'pending' ? [{
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
    }] : []),
  ], [processingId, activeTab, openDetail, handleApprove, setRejectTarget]);

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

      <MaterialTable data={rows} columns={columns} tableName='Reimbursement Approvals' hideFilters={false} hideExportCenter />

      <BatchDetailModal
        batchId={detailBatchId}
        onClose={() => { setDetailBatchId(null); setDetailInstanceId(null); }}
        onBatchActionDone={() => load(activeTab)}
        approvalInstanceId={detailInstanceId}
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
