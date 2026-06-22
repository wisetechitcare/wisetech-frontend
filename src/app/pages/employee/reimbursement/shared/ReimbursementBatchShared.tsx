import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Modal } from 'react-bootstrap';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import {
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import dayjs from 'dayjs';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';

// ── Helpers ────────────────────────────────────────────────────────────────────

export function fmtDate(d?: string) {
  if (!d) return '—';
  return dayjs(d).format('DD MMM YYYY');
}

export function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function statusBadge(status: number) {
  if (status === 1) return <span className='badge badge-light-success fw-semibold fs-8'>Approved</span>;
  if (status === 2) return <span className='badge badge-light-danger fw-semibold fs-8'>Rejected</span>;
  return <span className='badge badge-light-warning fw-semibold fs-8'>Pending</span>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type BatchRow = {
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

// ── Document preview modal ─────────────────────────────────────────────────────

interface DocumentPreviewModalProps {
  url: string;
  onClose: () => void;
}

export function DocumentPreviewModal({ url, onClose }: DocumentPreviewModalProps) {
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

export function RejectReasonModal({ show, onClose, onConfirm, submitting, title = 'Reject Request' }: RejectReasonModalProps) {
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

export function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId }: BatchDetailModalProps) {
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
      enableColumnActions: false,
      Cell: ({ row }: any) => fmtDate(row.original.expenseDate),
    },
    {
      accessorKey: 'day',
      header: 'Day',
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.expenseDate ? dayjs(row.original.expenseDate).format('dddd') : '—',
    },
    {
      accessorKey: 'description',
      header: 'Note',
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || '—',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.reimbursementType?.type || '—',
    },
    {
      accessorKey: 'clientType',
      header: 'Client Type',
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
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.clientCompany?.companyName || '—',
    },
    {
      accessorKey: 'project',
      header: 'Project Name',
      enableColumnActions: false,
      Cell: ({ row }: any) => row.original.project?.title || '—',
    },
    {
      accessorKey: 'fromLocation',
      header: 'From Location',
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
    },
    {
      accessorKey: 'toLocation',
      header: 'To Location',
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue || 'NA',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      enableColumnActions: false,
      Cell: ({ row }: any) => (
        <span style={row.original.isExceedingLimit ? { color: '#ef4444', fontWeight: 600 } : undefined}>
          ₹{fmtAmount(row.original.amount)}
        </span>
      ),
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
  ], [batchIsPending, processingId, handleIndividualAction, handleViewDocument, resolveClientType]);

  const handleBulkAction = async (action: 'approve' | 'reject-all', reason?: string) => {
    if (!batch?.reimbursements?.length) return;
    setBulkProcessing(true);
    try {
      if (action === 'approve' && approvalInstanceId) {
        await processApprovalAction(approvalInstanceId, 'approve');
        successConfirmation('Batch approved!');
      } else if (action === 'reject-all' && approvalInstanceId) {
        await processApprovalAction(approvalInstanceId, 'reject', reason);
        successConfirmation('Batch rejected');
      } else {
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
          {approvalInstanceId && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
              <div className='fs-8 fw-bold text-muted text-uppercase mb-2' style={{ letterSpacing: '0.5px' }}>Approval Progress</div>
              <ApprovalStatusTracker instanceId={approvalInstanceId} compact />
            </div>
          )}

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
                },
                muiTableBodyRowProps: ({ row }: any) => {
                  if (row.original?.isExceedingLimit) {
                    return {
                      sx: {
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        '& td:first-of-type': { borderLeft: '4px solid #ef4444 !important' },
                        transition: 'background-color 0.12s ease',
                        '&:hover td': { backgroundColor: 'rgba(239,68,68,0.14) !important' },
                      },
                    };
                  }
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
