import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import ReactDOM from 'react-dom';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Modal } from 'react-bootstrap';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import {
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
  downloadReimbursementBillPdf,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import dayjs from 'dayjs';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { usePermission } from '@hooks/usePermission';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { ReimbursementBatchDetail } from '../utils/reimbursementTypes';
import { buildReimbursementLineColumns, withPreviewHandler } from '../components/reimbursementLineColumns';
import OverLimitChip from '../components/OverLimitChip';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Re-exported, not re-implemented. Other modules (DomainApprovalQueue) import fmtAmount from
// this file, so the export surface stays while the behaviour comes from the one shared copy.
// `export ... from` alone re-exports without binding locally, and this file uses both.
import { fmtDate, fmtAmount } from '../utils/reimbursementFormat';
export { fmtDate, fmtAmount };

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
  /** When set to 1 or 2, restricts the displayed reimbursements to only that approval status.
   *  Used when opening the modal from an approved-group or rejected-group row so only the
   *  matching requests are shown instead of the full batch. */
  filterStatus?: number | null;
}

export function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId, filterStatus }: BatchDetailModalProps) {
  const [batch, setBatch] = useState<ReimbursementBatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Reject and request-info both need a comment, so they share the modal; `action` says which.
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: 'individual' | 'batch-reject-all'; action?: 'reject' | 'request-info' } | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingBill, setDownloadingBill] = useState(false);

  // The server now refuses these actions unless the caller is the batch's current approver (or an
  // active delegate). Gate the buttons too, so the UI stops offering an action that will 403.
  const canApprove = usePermission('approvals.approve.team');

  const pendingCount = batch?.reimbursements?.filter((r: any) => r.status === 0).length || 0;
  const batchIsPending = batch?.status === 0;

  // For pending batches: hide individually-rejected items (already bifurcated from the workflow).
  // For completed batches: when filterStatus is 1 or 2, show only requests that match that
  // final approval status — this ensures the popup reflects exactly which group was clicked.
  const visibleReimbursements = useMemo(() => {
    const all: any[] = batch?.reimbursements ?? [];
    if (batchIsPending) {
      return all.filter((r: any) => r.status !== 2);
    }
    if (filterStatus === 1 || filterStatus === 2) {
      return all.filter((r: any) => {
        const s = typeof r.status === 'number' ? r.status : 0;
        return s === filterStatus;
      });
    }
    return all;
  }, [batch?.reimbursements, batchIsPending, filterStatus]);

  const approvalOverride = useMemo<'approved' | 'rejected' | undefined>(() => {
    if (!approvalInstanceId) return undefined;
    if (filterStatus === 2) return 'rejected';
    const anyRejected = visibleReimbursements.some((r: any) => {
      const s = typeof r.status === 'number' ? r.status : r.status === 'Rejected' ? 2 : 0;
      return s === 2;
    });
    return anyRejected ? 'rejected' : undefined;
  }, [approvalInstanceId, filterStatus, visibleReimbursements]);

  const detailTotal = useMemo(
    () => visibleReimbursements.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0),
    [visibleReimbursements],
  );

  const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(batch?.reimbursements ?? []);

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

  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadBatch(); });

  const handleIndividualAction = useCallback(async (requestId: string, action: 'approve' | 'reject' | 'request-info', comments?: string) => {
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

  const detailColumns = useMemo<MRT_ColumnDef<any>[]>(() => {
    const hasApproved = visibleReimbursements.some((r: any) => {
      const s = typeof r.status === 'number' ? r.status : r.status === 'Approved' ? 1 : 0;
      return s === 1;
    });
    const hasRejected = visibleReimbursements.some((r: any) => {
      const s = typeof r.status === 'number' ? r.status : r.status === 'Rejected' ? 2 : 0;
      return s === 2;
    });

    const paymentStatusCol: MRT_ColumnDef<any> = {
      id: 'paymentStatus',
      header: 'Payment Status',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const ps = row.original.paymentStatus;
        if (ps === 'PAID')
          return <span className='badge badge-light-success fw-semibold fs-8'>Paid</span>;
        if (ps === 'PARTIAL')
          return <span className='badge badge-light-info fw-semibold fs-8'>Partially Paid</span>;
        return <span className='badge badge-light-warning fw-semibold fs-8'>Pending</span>;
      },
    };

    const rejectionReasonCol: MRT_ColumnDef<any> = {
      id: 'rejectionReason',
      header: 'Rejected Reason',
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ row }: any) => {
        const reason = row.original.rejectionReason || row.original.rejectReason;
        return reason ? (
          <span style={{ color: '#ef4444', fontSize: 12 }}>{reason}</span>
        ) : (
          <span className='text-muted'>N/A</span>
        );
      },
    };

    return [
      // The ten line columns are identical in both detail modals — one definition, two callers.
      ...buildReimbursementLineColumns(
        { resolveClientType, resolveClientCompany, resolveProject },
        detailTotal,
      ),
      {
        id: 'rowStatus',
        header: 'Status',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const s = row.original.status;
          const n = typeof s === 'number' ? s : s === 'Approved' ? 1 : s === 'Rejected' ? 2 : 0;
          return statusBadge(n);
        },
      },
      ...(hasApproved ? [paymentStatusCol] : []),
      ...(hasRejected ? [rejectionReasonCol] : []),
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const r = row.original;
          const isProcessing = processingId === r.id;
          if (!batchIsPending || r.status !== 0 || !canApprove) {
            return (
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500, cursor: 'default', userSelect: 'none' }}>
                No Actions Available
              </span>
            );
          }
          return (
            <div className='d-flex gap-1'>
              <button className='btn btn-icon btn-sm' aria-label='Approve' title='Approve' disabled={isProcessing}
                onClick={() => handleIndividualAction(r.id, 'approve')}>
                {isProcessing
                  ? <span className='spinner-border spinner-border-sm text-success' />
                  : <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt='' />}
              </button>
              <button className='btn btn-icon btn-sm' aria-label='Reject' title='Reject' disabled={isProcessing}
                onClick={() => setRejectTarget({ id: r.id, type: 'individual', action: 'reject' })}>
                <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt='' />
              </button>
              {/* Ask, instead of refusing. Without this an approver needing one more detail can
                  only reject — so "what is this for?" and "this is not claimable" were recorded
                  as the same outcome, and the employee had to file the expense again. */}
              <button className='btn btn-icon btn-sm' aria-label='Ask for more information'
                title='Ask for more information' disabled={isProcessing}
                onClick={() => setRejectTarget({ id: r.id, type: 'individual', action: 'request-info' })}>
                <KTIcon iconName='question' className='fs-3 text-warning' />
              </button>
            </div>
          );
        },
      },
    ];
  }, [batchIsPending, canApprove, processingId, handleIndividualAction, handleViewDocument, resolveClientType, detailTotal, visibleReimbursements]);

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
        await handleIndividualAction(rejectTarget.id, rejectTarget.action ?? 'reject', reason);
      } else {
        await handleBulkAction('reject-all', reason);
      }
      setRejectTarget(null);
    } finally { setRejectSubmitting(false); }
  };

  const handleDownloadBill = async () => {
    if (!batch || !batchId) return;
    setDownloadingBill(true);
    try {
      const blob = await downloadReimbursementBillPdf(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reimbursement_Bill_${batch.submissionId || batchId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading bill:', error);
      errorConfirmation('Failed to download bill');
    } finally {
      setDownloadingBill(false);
    }
  };

  return (
    <>
      <style>{`.reimbursement-batch-modal { max-width: 82vw !important; width: 92vw; }`}</style>
      <Modal show={!!batchId} onHide={onClose} centered size='xl' dialogClassName='reimbursement-batch-modal'>
        <Modal.Header closeButton>
          <div className='d-flex align-items-center justify-content-between w-100 me-3'>
            <div>
              <Modal.Title className='fs-4 fw-bold'>
                Submission Details — {batch?.submissionId || ''}
              </Modal.Title>
              {batch && (
                <div className='text-muted fs-7 mt-1'>
                  {batch.employee?.users?.firstName} {batch.employee?.users?.lastName} &nbsp;·&nbsp;
                  {visibleReimbursements.length} request{visibleReimbursements.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                  ₹{fmtAmount(detailTotal)} total &nbsp;·&nbsp;
                  Submitted {fmtDate(batch.submittedAt)}
                </div>
              )}
            </div>
            {batch && visibleReimbursements.some((r: any) => {
              const s = typeof r.status === 'number' ? r.status : r.status === 'Approved' ? 1 : 0;
              return s === 1;
            }) && (
              <button
                className='btn btn-sm d-flex align-items-center gap-2'
                style={{
                  background: '#1E3A8A',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: downloadingBill ? 'not-allowed' : 'pointer',
                }}
                onClick={handleDownloadBill}
                disabled={downloadingBill}
                title='Download Reimbursement Bill'
              >
                {downloadingBill ? (
                  <>
                    <span className='spinner-border spinner-border-sm' />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                      <polyline points='7 10 12 15 17 10' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                      <line x1='12' y1='15' x2='12' y2='3' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/>
                    </svg>
                    <span>Download Slip</span>
                  </>
                )}
              </button>
            )}
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px', maxHeight: '82vh', overflowY: 'auto' }}>
          {approvalInstanceId && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
              <div className='fs-8 fw-bold text-muted text-uppercase mb-2' style={{ letterSpacing: '0.5px' }}>Approval Progress</div>
              <ApprovalStatusTracker instanceId={approvalInstanceId} compact overrideStatus={approvalOverride} />
            </div>
          )}

          {batchIsPending && pendingCount > 0 && canApprove && (
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

          {(filterStatus === 1 || filterStatus === 2) && (
            <div style={{
              padding: '10px 14px',
              marginBottom: 14,
              borderRadius: 6,
              border: `1px solid ${filterStatus === 1 ? '#a7f3d0' : '#fca5a5'}`,
              background: filterStatus === 1 ? '#f0fdf4' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: filterStatus === 1 ? '#10b981' : '#ef4444',
                flexShrink: 0,
                display: 'inline-block',
              }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: filterStatus === 1 ? '#065f46' : '#991b1b' }}>
                {filterStatus === 1 ? 'Approved Requests' : 'Rejected Requests'}
                {' — '}
                {visibleReimbursements.length} {visibleReimbursements.length === 1 ? 'request' : 'requests'}
                {' · ₹'}{fmtAmount(detailTotal)} total
              </span>
            </div>
          )}

          {loading ? (
            <div className='d-flex justify-content-center py-10'>
              <span className='spinner-border text-primary' />
            </div>
          ) : (
            <MaterialTable
              columns={detailColumns}
              data={withPreviewHandler(visibleReimbursements, handleViewDocument)}
              tableName='BatchDetailReimbursements'
              hideFilters={false}
              hideExportCenter={false}
              showColumnFooter={true}
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

      </Modal>

      <RejectReasonModal
        show={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
        title={
          rejectTarget?.action === 'request-info' ? 'Ask for more information'
            : rejectTarget?.type === 'batch-reject-all' ? 'Reject Entire Batch'
            : 'Reject Request'
        }
      />

      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </>
  );
}
