import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Modal } from 'react-bootstrap';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import {
  fetchReimbursementBatches,
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
  fetchPendingApprovals,
  fetchAllApprovalInstances,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import { getSocket } from '@utils/socketClient';
import dayjs from 'dayjs';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';


type TabKey = 'pending' | 'approved' | 'rejected';

function fmtDate(d?: string) {
  if (!d) return '—';
  return dayjs(d).format('DD MMM YYYY');
}

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function statusBadge(status: number) {
  if (status === 1) return <span className='badge badge-light-success fw-semibold fs-8'>Approved</span>;
  if (status === 2) return <span className='badge badge-light-danger fw-semibold fs-8'>Rejected</span>;
  return <span className='badge badge-light-warning fw-semibold fs-8'>Pending</span>;
}

// ── Document preview modal ─────────────────────────────────────────────────────

interface DocumentPreviewModalProps {
  url: string;
  onClose: () => void;
}

function DocumentPreviewModal({ url, onClose }: DocumentPreviewModalProps) {
  const cleanUrl = url.split('?')[0].toLowerCase();
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(cleanUrl);
  const isPdf = cleanUrl.endsWith('.pdf');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const modalContent = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label='Document preview'
    >
      <div
        className='d-flex flex-column bg-white rounded shadow overflow-hidden'
        style={{ width: 'min(75vw, 900px)', height: 'min(78vh, 710px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0'>
          <div className='d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate'>
            <KTIcon iconName='document' className='fs-4 text-primary' />
            <span className='text-truncate' style={{ maxWidth: 560 }}>
              {url.split('/').pop()?.split('?')[0] ?? 'Document'}
            </span>
          </div>
          <div className='d-flex align-items-center gap-2 flex-shrink-0'>
            <a href={url} target='_blank' rel='noopener noreferrer'
              className='btn btn-sm btn-light btn-active-light-primary d-flex align-items-center gap-1' title='Open in new tab'>
              <KTIcon iconName='exit-right-corner' className='fs-5' />
              <span className='d-none d-sm-inline'>Open in tab</span>
            </a>
            <button className='btn btn-sm btn-icon btn-light btn-active-light-danger' onClick={onClose} title='Close preview (Esc)'>
              <KTIcon iconName='cross' className='fs-2' />
            </button>
          </div>
        </div>
        <div className='flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center' style={{ minHeight: 0 }}>
          {isImage ? (
            <img src={url} alt='Document preview' style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1rem', userSelect: 'none' }} />
          ) : isPdf ? (
            <iframe src={url} title='PDF preview' style={{ width: '100%', height: '100%', border: 'none' }} allow='fullscreen' />
          ) : (
            <div className='d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100'>
              <iframe src={url} title='Document preview' style={{ width: '100%', flex: 1, border: 'none', borderRadius: 8, minHeight: 0 }} allow='fullscreen' />
              <p className='text-muted fs-7 mb-0'>
                If the document does not display,{' '}
                <a href={url} target='_blank' rel='noopener noreferrer' className='text-primary'>open it in a new tab</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ── Reject-reason modal ────────────────────────────────────────────────────────

interface RejectReasonModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
  title?: string;
}

function RejectReasonModal({ show, onClose, onConfirm, submitting, title = 'Reject Request' }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  useEffect(() => { if (!show) setReason(''); }, [show]);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px 24px' }}>
        <label className='fw-semibold fs-6 mb-2 d-block'>
          Reason for Rejection <span style={{ color: '#f1416c' }}>*</span>
        </label>
        <textarea rows={3} className='form-control' placeholder='Describe why this request is being rejected...'
          value={reason} onChange={(e) => setReason(e.target.value)} style={{ resize: 'vertical', fontSize: 13 }} disabled={submitting} />
        {!trimmed && <div className='fs-8 text-muted mt-1'>A rejection reason is required.</div>}
      </Modal.Body>
      <Modal.Footer>
        <button className='btn btn-sm btn-light' onClick={onClose} disabled={submitting}>Cancel</button>
        <button className='btn btn-sm btn-danger d-flex align-items-center gap-2' disabled={!trimmed || submitting} onClick={() => onConfirm(trimmed)}>
          {submitting && <span className='spinner-border spinner-border-sm' />}
          Confirm Rejection
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Batch detail modal ─────────────────────────────────────────────────────────

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onBatchActionDone: () => void;
  approvalInstanceId?: string | null;
}

function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId }: BatchDetailModalProps) {
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: 'individual' | 'batch-reject-all' } | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pendingCount = batch?.reimbursements?.filter((r: any) => r.status === 0).length || 0;
  const batchIsPending = batch?.status === 0;

  const { resolveClientType } = useReimbursementLookups(batch?.reimbursements ?? []);

  const handleViewDocument = useCallback((documentUrl: string) => {
    if (documentUrl) setPreviewUrl(documentUrl);
  }, []);

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await fetchReimbursementBatchById(batchId);
      setBatch(res?.data?.batch || res?.batch);
    } catch { setBatch(null); } finally { setLoading(false); }
  }, [batchId]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  const handleIndividualAction = useCallback(async (requestId: string, action: 'approve' | 'reject', comments?: string) => {
    if (!batchId) return;
    setProcessingId(requestId);
    try {
      await processBatchRequestAction(batchId, requestId, action, comments);
      successConfirmation(`Request ${action}d`);
      loadBatch();
      onBatchActionDone();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || `Failed to ${action}`);
    } finally {
      setProcessingId(null);
    }
  }, [batchId, loadBatch, onBatchActionDone]);

  const detailColumns = useMemo<MRT_ColumnDef<any>[]>(() => [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => fmtDate(row.original.expenseDate),
    },
    {
      accessorKey: 'day',
      header: 'Day',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.expenseDate ? dayjs(row.original.expenseDate).format('dddd') : '—',
    },
    {
      accessorKey: 'description',
      header: 'Note',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || '—',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.reimbursementType?.type || '—',
    },
    {
      accessorKey: 'clientType',
      header: 'Client Type',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const r = row.original;
        return r.clientCompany?.companyType?.name
          || resolveClientType(r.clientCompany?.companyTypeId || r.clientTypeId);
      },
    },
    {
      accessorKey: 'client',
      header: 'Client Name',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.clientCompany?.companyName || '—',
    },
    {
      accessorKey: 'project',
      header: 'Project Name',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.project?.title || '—',
    },
    {
      accessorKey: 'fromLocation',
      header: 'From Location',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
    },
    {
      accessorKey: 'toLocation',
      header: 'To Location',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => `₹${fmtAmount(row.original.amount)}`,
    },
    {
      accessorKey: 'document',
      header: 'Document',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => (
        <button
          className='btn btn-icon btn-active-color-primary btn-sm w-[20px]'
          onClick={() => handleViewDocument(renderedCellValue)}
          disabled={!renderedCellValue}
          title={renderedCellValue ? 'Preview document' : 'No document attached'}
        >
          {renderedCellValue
            ? <KTIcon iconName='eye' className='fs-3' />
            : <i className='bi bi-file-earmark-x fs-3 text-danger'></i>}
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const r = row.original;
        const isProcessing = processingId === r.id;
        if (!batchIsPending || r.status !== 0) {
          return <span className='text-muted'>No actions available</span>;
        }
        return (
          <div className='d-flex gap-1'>
            <button className='btn btn-icon btn-sm' title='Approve' disabled={isProcessing}
              onClick={() => handleIndividualAction(r.id, 'approve')}>
              {isProcessing
                ? <span className='spinner-border spinner-border-sm text-success' />
                : <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt='' />}
            </button>
            <button className='btn btn-icon btn-sm' title='Reject' disabled={isProcessing}
              onClick={() => setRejectTarget({ id: r.id, type: 'individual' })}>
              <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt='' />
            </button>
          </div>
        );
      },
    },
  ], [batchIsPending, processingId, handleIndividualAction, setRejectTarget, handleViewDocument, resolveClientType]);

  const handleBulkAction = async (action: 'approve' | 'reject-all', reason?: string) => {
    if (!batch?.reimbursements?.length) return;
    setBulkProcessing(true);
    try {
      if (action === 'approve' && approvalInstanceId) {
        // Use existing approval workflow for batch-level approve
        await processApprovalAction(approvalInstanceId, 'approve');
        successConfirmation('Batch approved!');
      } else if (action === 'reject-all' && approvalInstanceId) {
        await processApprovalAction(approvalInstanceId, 'reject', reason);
        successConfirmation('Batch rejected');
      } else {
        // Fallback: approve/reject all individually
        const pending = batch.reimbursements.filter((r: any) => r.status === 0);
        for (const r of pending) {
          await processBatchRequestAction(batchId!, r.id, action === 'approve' ? 'approve' : 'reject', reason);
        }
        successConfirmation(`All requests ${action === 'approve' ? 'approved' : 'rejected'}`);
      }
      loadBatch();
      onBatchActionDone();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Action failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      if (rejectTarget.type === 'individual') {
        await handleIndividualAction(rejectTarget.id, 'reject', reason);
      } else {
        await handleBulkAction('reject-all', reason);
      }
      setRejectTarget(null);
    } finally { setRejectSubmitting(false); }
  };

  return (
    <>
      <style>{`.reimbursement-batch-modal { max-width: 82vw !important; width: 92vw; }`}</style>
      <Modal show={!!batchId} onHide={onClose} centered size='xl' dialogClassName='reimbursement-batch-modal'>
        <Modal.Header closeButton>
          <div>
            <Modal.Title className='fs-4 fw-bold'>
              Submission Details — {batch?.submissionId || ''}
            </Modal.Title>
            {batch && (
              <div className='text-muted fs-7 mt-1'>
                {batch.employee?.users?.firstName} {batch.employee?.users?.lastName} &nbsp;·&nbsp;
                {batch.totalRequests} request{batch.totalRequests !== 1 ? 's' : ''} &nbsp;·&nbsp;
                ₹{fmtAmount(batch.totalAmount)} total &nbsp;·&nbsp;
                Submitted {fmtDate(batch.submittedAt)}
              </div>
            )}
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px', maxHeight: '82vh', overflowY: 'auto' }}>
          {/* Approval progress tracker */}
          {approvalInstanceId && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
              <div className='fs-8 fw-bold text-muted text-uppercase mb-2' style={{ letterSpacing: '0.5px' }}>Approval Progress</div>
              <ApprovalStatusTracker instanceId={approvalInstanceId} compact />
            </div>
          )}

          {/* Bulk action bar */}
          {batchIsPending && pendingCount > 0 && (
            <div className='d-flex gap-3 mb-5 p-3 rounded' style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <span className='fw-semibold fs-7 text-dark align-self-center me-2'>Bulk Actions:</span>
              <button
                className='btn btn-sm d-flex align-items-center gap-2'
                style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', fontWeight: 600 }}
                disabled={bulkProcessing}
                onClick={() => handleBulkAction('approve')}
              >
                {bulkProcessing ? <span className='spinner-border spinner-border-sm' /> : null}
                Approve All ({pendingCount})
              </button>
              <button
                className='btn btn-sm d-flex align-items-center gap-2'
                style={{ backgroundColor: '#fdecea', color: '#c62828', border: '1px solid #ef9a9a', fontWeight: 600 }}
                disabled={bulkProcessing}
                onClick={() => setRejectTarget({ id: 'batch', type: 'batch-reject-all' })}
              >
                Reject All ({pendingCount})
              </button>
            </div>
          )}

          {/* Individual requests table */}
          {loading ? (
            <div className='d-flex justify-content-center py-10'>
              <span className='spinner-border text-primary' />
            </div>
          ) : (
            <MaterialTable
              columns={detailColumns}
              data={batch?.reimbursements ?? []}
              tableName='BatchDetailReimbursements'
              hideFilters={false}
              hideExportCenter={false}
              renderExportActions={() => null}
              muiTableProps={{
                sx: {
                  '& .MuiTableBody-root .MuiTableCell-root': {
                    borderBottom: 'none',
                    paddingY: '5px',
                  },
                  '& .MuiTableBody-root .MuiTableRow-root': {},
                },
                muiTableBodyRowProps: ({ row }: any) => {
                  const statusNum = row.original?.status;
                  const statusStr = statusNum === 1 ? 'approved' : statusNum === 2 ? 'rejected' : 'pending';
                  const colorMap: Record<string, { bg: string; border: string; hover: string }> = {
                    approved: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                    rejected: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
                    pending:  { bg: 'rgba(245,158,11,0.04)', border: '#f59e0b', hover: 'rgba(245,158,11,0.08)' },
                  };
                  const c = colorMap[statusStr] ?? null;
                  return {
                    sx: {
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
        </Modal.Body>

        {batchIsPending && approvalInstanceId && (
          <Modal.Footer>
            <button
              className='btn d-flex align-items-center gap-2'
              style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', fontWeight: 600 }}
              disabled={bulkProcessing}
              onClick={() => handleBulkAction('approve')}
            >
              {bulkProcessing ? <span className='spinner-border spinner-border-sm' /> : null}
              Approve All
            </button>
            <button
              className='btn d-flex align-items-center gap-2'
              style={{ backgroundColor: '#fdecea', color: '#c62828', border: '1px solid #ef9a9a', fontWeight: 600 }}
              disabled={bulkProcessing}
              onClick={() => setRejectTarget({ id: 'batch', type: 'batch-reject-all' })}
            >
              Reject All
            </button>
          </Modal.Footer>
        )}
      </Modal>

      <RejectReasonModal
        show={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
        title={rejectTarget?.type === 'batch-reject-all' ? 'Reject Entire Batch' : 'Reject Request'}
      />

      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  );
}

// ── Batch row type ─────────────────────────────────────────────────────────────

type BatchRow = {
  id: string;
  submissionId: string;
  status: number;
  totalAmount: string | number;
  totalRequests: number;
  submittedAt: string;
  employee: { id: string; employeeCode: string; users: { firstName: string; lastName: string } };
  approvalInstanceId?: string | null;
  rejectionReason?: string | null;
};

// ── Main component ─────────────────────────────────────────────────────────────

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

      // Filter batches by tab
      let filtered: any[];
      if (tab === 'pending') {
        // Show batches that have a pending approval step for me, or batches with status=0
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
            <div className='d-flex align-items-center gap-2'>
              <div className='symbol symbol-30px'>
                {/* <span className='symbol-label bg-light-primary text-primary fw-bold fs-8'>
                  {(firstName?.[0] || '').toUpperCase()}{(lastName?.[0] || '').toUpperCase()}
                </span> */}
              </div>
              {fullName || '—'}
            </div>
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
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const reason = row.original.rejectionReason;
        return reason
          ? <span className='text-danger fs-7'>{reason}</span>
          : <span className='text-muted fs-7'>—</span>;
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
      {/* Tabs + Refresh */}
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

      {/* Batch detail modal */}
      <BatchDetailModal
        batchId={detailBatchId}
        onClose={() => { setDetailBatchId(null); setDetailInstanceId(null); }}
        onBatchActionDone={() => load(activeTab)}
        approvalInstanceId={detailInstanceId}
      />

      {/* Batch-level reject modal */}
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
