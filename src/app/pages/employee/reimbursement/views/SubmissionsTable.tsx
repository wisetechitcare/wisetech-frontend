import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { MRT_ColumnDef } from 'material-react-table';
import { Modal } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { IReimbursementsUpdate } from '@models/employee';
import ReimbursementEditModal from '../components/ReimbursementEditModal';
import {
  fetchReimbursementBatches,
  fetchReimbursementBatchById,
  deleteEmployeeReimbursement,
  fetchApprovalInstanceByRequest,
  fetchAllReimbursementsForEmployee,
  downloadReimbursementBillPdf,
} from '@services/employee';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import { deleteConfirmation, errorConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { PeriodAlignment } from '../MaterialToggleReimbursement';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Tooltip } from '@mui/material';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

// Sentinel batch id for reimbursements that have no batch (batch_id = NULL).
// These are legacy/imported records that were never submitted through the
// batch workflow; we group them into a synthetic "Legacy" submission so they
// can never silently disappear from the UI.
const UNGROUPED_BATCH_ID = '__ungrouped__';

function fmtDate(d?: string) {
  if (!d) return 'N/A';
  return dayjs(d).format('DD MMM YYYY');
}

function fmtAmount(n: number | string) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function resolveStatusNum(status: any): number {
  if (typeof status === 'number') return status;
  if (status === 'Approved') return 1;
  if (status === 'Rejected') return 2;
  return 0;
}

// ── Document Preview Modal ─────────────────────────────────────────────────────

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
      role="dialog"
      aria-modal="true"
      aria-label="Document preview"
    >
      <div
        className="d-flex flex-column bg-white rounded shadow overflow-hidden"
        style={{ width: 'min(75vw, 900px)', height: 'min(78vh, 710px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-light flex-shrink-0">
          <div className="d-flex align-items-center gap-2 text-gray-700 fw-semibold fs-7 text-truncate">
            <KTIcon iconName="document" className="fs-4 text-primary" />
            <span className="text-truncate" style={{ maxWidth: 560 }}>
              {url.split('/').pop()?.split('?')[0] ?? 'Document'}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-light btn-active-light-primary d-flex align-items-center gap-1"
              title="Open in new tab"
            >
              <KTIcon iconName="exit-right-corner" className="fs-5" />
              <span className="d-none d-sm-inline">Open in tab</span>
            </a>
            <button
              className="btn btn-sm btn-icon btn-light btn-active-light-danger"
              onClick={onClose}
              title="Close preview (Esc)"
            >
              <KTIcon iconName="cross" className="fs-2" />
            </button>
          </div>
        </div>
        <div
          className="flex-grow-1 overflow-hidden bg-light d-flex align-items-center justify-content-center"
          style={{ minHeight: 0 }}
        >
          {isImage ? (
            <img
              src={url}
              alt="Document preview"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '1rem', userSelect: 'none' }}
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title="PDF preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="fullscreen"
            />
          ) : (
            <div className="d-flex flex-column align-items-center gap-3 p-5 text-center w-100 h-100">
              <iframe
                src={url}
                title="Document preview"
                style={{ width: '100%', flex: 1, border: 'none', borderRadius: 8, minHeight: 0 }}
                allow="fullscreen"
              />
              <p className="text-muted fs-7 mb-0">
                If the document does not display,{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary">
                  open it in a new tab
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ── Submission Detail Modal ────────────────────────────────────────────────────

interface SubmissionDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: (row: IReimbursementsUpdate) => void;
  showEditDeleteOption?: boolean;
  /** When 1 or 2, restricts the table to only show reimbursements with that approval status. */
  filterStatus?: number | null;
  /** Raw reimbursements to render when batchId is the UNGROUPED sentinel (no real batch to fetch). */
  ungroupedReimbursements?: any[];
}

function SubmissionDetailModal({
  batchId,
  onClose,
  onRefresh,
  showEditDeleteOption,
  filterStatus,
  ungroupedReimbursements = [],
}: SubmissionDetailModalProps) {
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<IReimbursementsUpdate | null>(null);
  const [approvalCurrentLevel, setApprovalCurrentLevel] = useState<number>(1);
  const [approvalInstanceId, setApprovalInstanceId] = useState<string | null>(null);
  const [pendingEditRow, setPendingEditRow] = useState<IReimbursementsUpdate | null>(null);
  const [showPartialApprovalWarning, setShowPartialApprovalWarning] = useState(false);
  const [downloadingBill, setDownloadingBill] = useState(false);

  const isPartiallyApproved = approvalCurrentLevel > 1;

  const reimbursements: any[] = batch?.reimbursements ?? [];

  // When filterStatus is 1 (approved) or 2 (rejected), show only matching requests so
  // the popup reflects exactly which group was clicked in the submissions table.
  const displayedReimbursements = useMemo(() => {
    if (filterStatus === 1 || filterStatus === 2) {
      return reimbursements.filter((r) => resolveStatusNum(r.status) === filterStatus);
    }
    return reimbursements;
  }, [reimbursements, filterStatus]);

  const detailTotal = useMemo(
    () => displayedReimbursements.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [displayedReimbursements],
  );
  const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(reimbursements);

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    // Legacy records have no real batch — render them directly from the passed list.
    if (batchId === UNGROUPED_BATCH_ID) {
      setBatch({
        submissionId: 'Legacy (No Submission)',
        submittedAt: null,
        reimbursements: ungroupedReimbursements,
      });
      setApprovalCurrentLevel(1);
      setApprovalInstanceId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [batchRes, instanceRes] = await Promise.all([
        fetchReimbursementBatchById(batchId),
        fetchApprovalInstanceByRequest('ReimbursementBatch', batchId).catch(() => null),
      ]);
      setBatch(batchRes?.data?.batch || batchRes?.batch || null);
      const instance = instanceRes?.data || instanceRes;
      setApprovalCurrentLevel(
        instance?.status === 'pending' ? (instance?.currentLevel ?? 1) : 1,
      );
      setApprovalInstanceId(instance?.id ?? null);
    } catch {
      setBatch(null);
      setApprovalCurrentLevel(1);
    } finally {
      setLoading(false);
    }
  }, [batchId, ungroupedReimbursements]);

  useEffect(() => {
    if (batchId) {
      setBatch(null);
      setApprovalInstanceId(null);
      loadBatch();
    }
  }, [batchId, loadBatch]);

  const handleDelete = async (reimbursementId: string) => {
    const confirmed = await deleteConfirmation('Reimbursement Deleted Successfully!');
    if (!confirmed) return;
    setDeletingId(reimbursementId);
    try {
      await deleteEmployeeReimbursement(reimbursementId);
      await loadBatch();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDocument = useCallback((documentUrl: string) => {
    if (documentUrl) setPreviewUrl(documentUrl);
  }, []);

  const detailColumns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'expenseDate',
        header: 'Date',
        size: 150, minSize: 130, maxSize: 180,
        enableColumnActions: false,
        Cell: ({ row }: any) => (
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{fmtDate(row.original.expenseDate) || 'N/A'}</div>
            {row.original.expenseDate && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{dayjs(row.original.expenseDate).format('dddd')}</div>
            )}
          </div>
        ),
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
      },
      {
        accessorKey: 'clientType',
        header: 'Company Type',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const r = row.original;
          return (
            r.clientCompany?.companyType?.name ||
            resolveClientType(r.clientCompany?.companyTypeId || r.clientTypeId)
          );
        },
      },
      {
        accessorKey: 'client',
        header: 'Company Name',
        enableColumnActions: false,
        Cell: ({ row }: any) =>
          row.original.clientCompany?.companyName ||
          resolveClientCompany(row.original.clientCompanyId) ||
          'N/A',
      },
      {
        accessorKey: 'project',
        header: 'Project Name',
        enableColumnActions: false,
        Cell: ({ row }: any) =>
          row.original.project?.title || resolveProject(row.original.projectId) || 'N/A',
      },
      {
        accessorKey: 'type',
        header: 'Type',
        enableColumnActions: false,
        Cell: ({ row }: any) => row.original.reimbursementType?.type || row.original.type || 'N/A',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        enableColumnActions: false,
        Cell: ({ row }: any) => `₹${fmtAmount(row.original.amount)}`,
        Footer: () => <span className="fw-bold">₹{fmtAmount(detailTotal)}</span>,
      },
      {
        accessorKey: 'fromLocation',
        header: 'From Location',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
      },
      {
        accessorKey: 'toLocation',
        header: 'To Location',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
      },
      {
        accessorKey: 'description',
        header: 'Note',
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue || 'N/A',
      },
      {
        accessorKey: 'document',
        header: 'Document',
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => (
          <button
            className="btn btn-icon btn-active-color-primary btn-sm"
            onClick={() => handleViewDocument(renderedCellValue)}
            disabled={!renderedCellValue}
            title={renderedCellValue ? 'Preview document' : 'No document attached'}
          >
            {renderedCellValue ? (
              <KTIcon iconName="eye" className="fs-3" />
            ) : (
              <i className="bi bi-file-earmark-x fs-3 text-danger"></i>
            )}
          </button>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const statusNum = resolveStatusNum(row.original.status);
          if (statusNum === 1) return <span className="badge badge-light-success fw-semibold fs-8">Approved</span>;
          if (statusNum === 2) return <span className="badge badge-light-danger fw-semibold fs-8">Rejected</span>;
          return <span className="badge badge-light-warning fw-semibold fs-8">Pending</span>;
        },
      },
      ...(displayedReimbursements.some((r) => resolveStatusNum(r.status) === 2)
        ? [
            {
              accessorKey: 'rejectionReason',
              header: 'Reject Reason',
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const statusNum = resolveStatusNum(row.original.status);
                if (statusNum !== 2) return <span className="text-muted">N/A</span>;
                const reason = row.original.rejectionReason || row.original.rejectReason;
                return reason ? (
                  <span className="text-danger">{reason}</span>
                ) : (
                  <span className="text-muted">N/A</span>
                );
              },
            },
          ]
        : []),
      ...(filterStatus === 1
        ? [
            {
              accessorKey: 'paymentStatus',
              header: 'Payment Status',
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const statusNum = resolveStatusNum(row.original.status);
                if (statusNum === 2) return <span className="text-muted">N/A</span>;
                if (statusNum !== 1) return <span className="text-muted">N/A</span>;
                const ps = row.original.paymentStatus;
                if (ps === 'PAID')
                  return (
                    <span className="badge badge-light-success text-success fw-bold px-3 py-2">Paid</span>
                  );
                if (ps === 'PARTIAL')
                  return (
                    <span className="badge badge-light-info text-info fw-bold px-3 py-2">Partially Paid</span>
                  );
                return (
                  <span className="badge badge-light-warning text-warning fw-bold px-3 py-2">Pending</span>
                );
              },
            },
          ]
        : []),
      ...(showEditDeleteOption
        ? [
            {
              id: 'actions',
              header: 'Action',
              enableSorting: false,
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const r = row.original;
                const statusNum = resolveStatusNum(r.status);
                const isPending = statusNum === 0;
                const isDeleting = deletingId === r.id;

                if (!isPending) {
                  return (
                    <Tooltip
                      title="This reimbursement has already been processed and cannot be modified."
                      arrow
                      placement="top"
                    >
                      <span
                        style={{
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'default',
                          userSelect: 'none',
                        }}
                      >
                        No Action Available
                      </span>
                    </Tooltip>
                  );
                }

                const resEdit =
                  isPending &&
                  hasPermission(
                    resourceNameMapWithCamelCase.reimbursement,
                    permissionConstToUseWithHasPermission.editOwn,
                    r,
                  );
                const resDelete =
                  isPending &&
                  hasPermission(
                    resourceNameMapWithCamelCase.reimbursement,
                    permissionConstToUseWithHasPermission.deleteOwn,
                    r,
                  );

                return (
                  <div className="flex items-center justify-center space-x-4">
                    {resEdit && (
                      <button
                        className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                        title="Edit"
                        onClick={() => {
                          const cleaned = Object.fromEntries(
                            Object.entries(r).filter(([, v]) => v != null),
                          ) as IReimbursementsUpdate;
                          if (isPartiallyApproved) {
                            setPendingEditRow(cleaned);
                            setShowPartialApprovalWarning(true);
                          } else {
                            setEditRow(cleaned);
                          }
                        }}
                      >
                        <KTIcon iconName="pencil" className="inline fs-4 text-red-500" />
                      </button>
                    )}
                    {resDelete && (
                      <button
                        className="btn btn-icon btn-active-color-primary btn-sm w-4"
                        title="Delete"
                        disabled={isDeleting}
                        onClick={() => handleDelete(r.id)}
                      >
                        {isDeleting ? (
                          <span className="spinner-border spinner-border-sm text-danger" />
                        ) : (
                          <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
                        )}
                      </button>
                    )}
                    {!resEdit && !resDelete && (
                      <span className="text-muted fs-7">N/A</span>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [
      resolveClientType,
      resolveClientCompany,
      resolveProject,
      showEditDeleteOption,
      handleViewDocument,
      deletingId,
      setEditRow,
      detailTotal,
      isPartiallyApproved,
      filterStatus,
      displayedReimbursements,
    ],
  );

  const handleDownloadBill = async () => {
    if (!batch?.id) return;
    setDownloadingBill(true);
    try {
      const blob = await downloadReimbursementBillPdf(batch.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reimbursement_Bill_${batch.submissionId || batch.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ PDF Download Error:', error);
      errorConfirmation('Failed to download reimbursement bill. Please try again.');
    } finally {
      setDownloadingBill(false);
    }
  };

  return (
    <>
      <style>{`.submission-detail-modal { max-width: 90vw !important; width: 95vw; }`}</style>
      <Modal
        show={!!batchId}
        onHide={onClose}
        centered
        size="xl"
        dialogClassName="submission-detail-modal"
      >
        <Modal.Header closeButton>
          <div className="d-flex align-items-center gap-3 flex-grow-1 pe-2">
            <div>
              <Modal.Title className="fs-4 fw-bold">
                Submission Details — {batch?.submissionId || ''}
              </Modal.Title>
              {batch && (
                <div className="text-muted fs-7 mt-1">
                  {displayedReimbursements.length} request{displayedReimbursements.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                  ₹{fmtAmount(detailTotal)} total&nbsp;·&nbsp;Submitted{' '}
                  {fmtDate(batch.submittedAt)}
                </div>
              )}
            </div>
            {batch && displayedReimbursements.some(r => resolveStatusNum(r.status) === 1) && (
              <button
                className="btn d-flex align-items-center gap-2 px-3 ms-auto"
                style={{
                  height: '35px',
                  background: '#1E3A8A',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: downloadingBill ? 'not-allowed' : 'pointer',
                  pointerEvents: 'auto',
                }}
                onClick={handleDownloadBill}
                disabled={downloadingBill || loading}
                title="Download Reimbursement Bill"
              >
                {downloadingBill ? (
                  <>
                    <span className="spinner-border spinner-border-sm" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
              <div className="fs-8 fw-bold text-muted text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>Approval Progress</div>
              <ApprovalStatusTracker
                instanceId={approvalInstanceId}
                compact
                overrideStatus={filterStatus === 2 ? 'rejected' : filterStatus === 1 ? 'approved' : undefined}
              />
            </div>
          )}
          {loading ? (
            <div className="d-flex justify-content-center py-10">
              <span className="spinner-border text-primary" />
            </div>
          ) : (
            <MaterialTable
              columns={detailColumns}
              data={displayedReimbursements}
              tableName="SubmissionDetailReimbursements"
              hideFilters={false}
              hideExportCenter={false}
              showColumnFooter={true}
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
                  const statusNum = resolveStatusNum(row.original?.status);
                  const colorMap: Record<number, { bg: string; border: string; hover: string }> = {
                    1: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                    2: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
                    0: { bg: 'rgba(245,158,11,0.04)', border: '#f59e0b', hover: 'rgba(245,158,11,0.08)' },
                  };
                  const c = colorMap[statusNum] ?? null;
                  return {
                    sx: {
                      backgroundColor: c ? c.bg : undefined,
                      '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                      transition: 'background-color 0.12s ease',
                      '&:hover td': {
                        backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
                      },
                    },
                  };
                },
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      {previewUrl && (
        <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      <ReimbursementEditModal
        show={!!editRow}
        onHide={() => setEditRow(null)}
        reimbursement={editRow}
        onSaved={() => {
          loadBatch();
          onRefresh();
        }}
      />

      {/* Partial-approval reset warning */}
      <Modal show={showPartialApprovalWarning} onHide={() => setShowPartialApprovalWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Editing Will Reset Approval</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '20px 24px' }}>
          <p className="mb-0" style={{ fontSize: 14 }}>
            This batch has already been approved by one or more levels. Saving changes will
            <strong> reset the entire approval process</strong> and resubmit from Level 1
            so all approvers can review the updated details.
          </p>
          <p className="text-muted mt-2 mb-0" style={{ fontSize: 13 }}>
            Are you sure you want to continue?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button
            className="btn btn-sm btn-light"
            onClick={() => {
              setShowPartialApprovalWarning(false);
              setPendingEditRow(null);
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm btn-warning"
            onClick={() => {
              setEditRow(pendingEditRow);
              setPendingEditRow(null);
              setShowPartialApprovalWarning(false);
            }}
          >
            Yes, Edit and Reset Approval
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// ── Submissions Table ──────────────────────────────────────────────────────────

export interface SubmissionsTableProps {
  period: PeriodAlignment;
  date: Dayjs;
  selectedEmployeeId?: string;
  onEdit?: (row: IReimbursementsUpdate) => void;
  showEditDeleteOption?: boolean;
  resource?: string;
  viewOwn?: boolean;
  viewOthers?: boolean;
  checkOwnWithOthers?: boolean;
}

function SubmissionsTable({
  period,
  date,
  selectedEmployeeId,
  onEdit,
  showEditDeleteOption = false,
  resource = '',
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
}: SubmissionsTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailFilterStatus, setDetailFilterStatus] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Reimbursements with no batch (batch_id = NULL) for the current scope/period.
  // Surfaced as a synthetic "Legacy" submission so orphaned records stay visible.
  const [ungroupedReimbursements, setUngroupedReimbursements] = useState<any[]>([]);

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const filterBatches = useCallback(
    (allBatches: any[]) => {
      let filtered = allBatches;

      if (selectedEmployeeId) {
        filtered = filtered.filter(
          (b: any) =>
            b.employee?.id === selectedEmployeeId || b.employeeId === selectedEmployeeId,
        );
      }

      if (period === 'monthly') {
        const monthStr = date.format('YYYY-MM');
        filtered = filtered.filter(
          (b: any) => b.submittedAt && dayjs(b.submittedAt).format('YYYY-MM') === monthStr,
        );
      } else if (period === 'yearly') {
        const targetYear = date.year();
        filtered = filtered.filter(
          (b: any) => b.submittedAt && dayjs(b.submittedAt).year() === targetYear,
        );
      }

      return filtered;
    },
    [period, date, selectedEmployeeId],
  );

  const loadBatches = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetchReimbursementBatches();
      const allBatches: any[] = res?.data?.batches || res?.batches || [];
      const filtered = filterBatches(allBatches);

      const detailResults = await Promise.all(
        filtered.map((b: any) =>
          fetchReimbursementBatchById(b.id)
            .then((r: any) => ({ batchMeta: b, batch: r?.data?.batch || r?.batch || null }))
            .catch(() => ({ batchMeta: b, batch: null })),
        ),
      );

      // Group into batch-level summary rows.
      // Pending batches → 1 row. Completed batches → up to 2 rows (one per final status).
      const groupedRows: any[] = [];
      for (const { batchMeta, batch } of detailResults) {
        const reimbursements: any[] = batch?.reimbursements ?? [];
        const batchCompleted = batchMeta.status !== 0;

        if (!batchCompleted) {
          groupedRows.push({
            _batchId: batchMeta.id,
            _submissionId: batchMeta.submissionId,
            _submittedAt: batchMeta.submittedAt,
            _status: 0,
            _totalRequests: batchMeta.totalRequests ?? reimbursements.length,
            _totalAmount: batchMeta.totalAmount ?? reimbursements.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
            _paymentStatus: null,
            _rejectReason: null,
          });
        } else {
          const statusGroups: Record<number, any[]> = {};
          for (const r of reimbursements) {
            const s = typeof r.status === 'number' ? r.status : 0;
            if (!statusGroups[s]) statusGroups[s] = [];
            statusGroups[s].push(r);
          }

          for (const [statusStr, items] of Object.entries(statusGroups)) {
            const status = Number(statusStr);
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

            groupedRows.push({
              _batchId: batchMeta.id,
              _submissionId: batchMeta.submissionId,
              _submittedAt: batchMeta.submittedAt,
              _status: status,
              _totalRequests: items.length,
              _totalAmount: totalAmount,
              _paymentStatus: paymentStatus,
              _rejectReason: rejectReason,
            });
          }
        }
      }

      // ── Orphaned (legacy) reimbursements: batch_id = NULL ──────────────────
      // These never went through the batch workflow, so the batch iteration
      // above misses them entirely. Fetch reimbursements directly, keep the
      // ones with no batch, and expose them as a synthetic "Legacy" submission.
      const scopedEmpId = selectedEmployeeId || employeeId;
      let orphanList: any[] = [];
      const orphanRows: any[] = [];
      if (scopedEmpId) {
        try {
          const res = await fetchAllReimbursementsForEmployee(scopedEmpId);
          const all: any[] = res?.data?.reimbursements || res?.reimbursements || [];
          orphanList = all.filter((r: any) => r.batchId == null && r.isActive !== false);

          // Match the same period the batch rows are filtered by, but keyed on
          // expenseDate since orphans have no submittedAt.
          if (period === 'monthly') {
            const monthStr = date.format('YYYY-MM');
            orphanList = orphanList.filter(
              (r: any) => r.expenseDate && dayjs(r.expenseDate).format('YYYY-MM') === monthStr,
            );
          } else if (period === 'yearly') {
            const targetYear = date.year();
            orphanList = orphanList.filter(
              (r: any) => r.expenseDate && dayjs(r.expenseDate).year() === targetYear,
            );
          }

          // Group into one summary row per approval status, mirroring completed batches.
          const statusGroups: Record<number, any[]> = {};
          for (const r of orphanList) {
            const s = typeof r.status === 'number' ? r.status : 0;
            if (!statusGroups[s]) statusGroups[s] = [];
            statusGroups[s].push(r);
          }
          for (const [statusStr, items] of Object.entries(statusGroups)) {
            const status = Number(statusStr);
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

            orphanRows.push({
              _batchId: UNGROUPED_BATCH_ID,
              _submissionId: 'Legacy',
              _submittedAt: null,
              _status: status,
              _totalRequests: items.length,
              _totalAmount: totalAmount,
              _paymentStatus: paymentStatus,
              _rejectReason: rejectReason,
              _ungrouped: true,
            });
          }
        } catch {
          // Non-fatal: if the orphan fetch fails, still show the batch rows.
          orphanList = [];
        }
      }

      setUngroupedReimbursements(orphanList);
      setRows([...groupedRows, ...orphanRows]);
    } catch {
      setRows([]);
      setUngroupedReimbursements([]);
    } finally {
      setTableLoading(false);
    }
  }, [filterBatches, refreshKey, period, date, selectedEmployeeId, employeeId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Refresh when any reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { setRefreshKey((k) => k + 1); });

  const rowsTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r._totalAmount || 0), 0),
    [rows],
  );

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: '_submittedAt',
        header: 'Submission Date',
        size: 160,
        Cell: ({ row }: any) => (
          <span className="text-dark fs-7">{fmtDate(row.original._submittedAt)}</span>
        ),
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
      },

      {
        accessorKey: '_totalRequests',
        header: 'Total Requests',
        size: 130,
        Cell: ({ row }: any) => (
          <span className="text-dark fs-7">{row.original._totalRequests}</span>
        ),
      },
      {
        accessorKey: '_totalAmount',
        header: 'Amount (₹)',
        size: 145,
        Cell: ({ row }: any) => (
          <span className="fs-7">₹{fmtAmount(row.original._totalAmount)}</span>
        ),
        Footer: () => <span className="text-dark fw-bold fs-7">₹{fmtAmount(rowsTotal)}</span>,
      },
      {
        accessorKey: '_status',
        header: 'Approval Status',
        size: 130,
        Cell: ({ row }: any) => {
          const s = row.original._status;
          if (s === 1) return <span className="badge badge-light-success fw-semibold fs-8">Approved</span>;
          if (s === 2) return <span className="badge badge-light-danger fw-semibold fs-8">Rejected</span>;
          return <span className="badge badge-light-warning fw-semibold fs-8">Pending</span>;
        },
      },
      {
        accessorKey: '_paymentStatus',
        header: 'Payment Status',
        size: 145,
        Cell: ({ row }: any) => {
          if (row.original._status !== 1) return <span className="text-muted fs-7">N/A</span>;
          const ps = row.original._paymentStatus;
          if (ps === 'PAID')
            return <span className="badge badge-light-success text-success fw-bold px-3 py-2 fs-8">Paid</span>;
          if (ps === 'PARTIAL')
            return <span className="badge badge-light-info text-info fw-bold px-3 py-2 fs-8">Partially Paid</span>;
          return <span className="badge badge-light-warning text-warning fw-bold px-3 py-2 fs-8">Pending</span>;
        },
      },
    ],
    [rowsTotal],
  );

  return (
    <>
      {tableLoading ? (
        <div className="d-flex justify-content-center py-10">
          <span className="spinner-border text-primary" />
        </div>
      ) : (
        <MaterialTable
          columns={columns}
          data={rows}
          tableName="Submissions"
          resource={resource}
          viewOwn={viewOwn}
          viewOthers={viewOthers}
          checkOwnWithOthers={checkOwnWithOthers}
          employeeId={employeeId}
          showColumnFooter={true}
          muiTableProps={{
            sx: {
              '& .MuiTableBody-root .MuiTableCell-root': {
                borderBottom: 'none',
                paddingY: '5px',
              },
            },
            muiTableBodyRowProps: ({ row }: any) => {
              const s = row.original?._status ?? 0;
              const colorMap: Record<number, { bg: string; border: string; hover: string }> = {
                1: { bg: 'rgba(16,185,129,0.04)', border: '#10b981', hover: 'rgba(16,185,129,0.08)' },
                2: { bg: 'rgba(239,68,68,0.04)', border: '#ef4444', hover: 'rgba(239,68,68,0.08)' },
                0: { bg: 'rgba(245,158,11,0.04)', border: '#f59e0b', hover: 'rgba(245,158,11,0.08)' },
              };
              const c = colorMap[s] ?? null;
              return {
                onClick: () => { setDetailBatchId(row.original._batchId); setDetailFilterStatus(row.original._status ?? null); },
                sx: {
                  cursor: 'pointer',
                  backgroundColor: c ? c.bg : undefined,
                  '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                  transition: 'background-color 0.12s ease',
                  '&:hover td': {
                    backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
                  },
                },
              };
            },
          }}
        />
      )}

      <SubmissionDetailModal
        batchId={detailBatchId}
        filterStatus={detailFilterStatus}
        ungroupedReimbursements={ungroupedReimbursements}
        onClose={() => { setDetailBatchId(null); setDetailFilterStatus(null); }}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onEdit={onEdit}
        showEditDeleteOption={showEditDeleteOption}
      />
    </>
  );
}

export default SubmissionsTable;
