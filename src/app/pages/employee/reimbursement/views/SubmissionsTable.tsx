import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { MRT_ColumnDef } from 'material-react-table';
import { Modal } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { IReimbursementsUpdate } from '@models/employee';
import ReimbursementEditModal from '../components/ReimbursementEditModal';
import QueryConversationDialog from '../components/QueryConversation';
import {
  fetchReimbursementBatchById,
  deleteEmployeeReimbursement,
  fetchApprovalInstanceByRequest,
  fetchAllReimbursementsForEmployee,
  fetchReimbursementsForEmployee,
  downloadReimbursementBillPdf,
} from '@services/employee';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import { deleteConfirmation, errorConfirmation } from '@utils/modal';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';
import { PeriodAlignment } from '../components/ReimbursementPeriodBar';
import { categoryName } from '../utils/reimbursementChartData';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import StatusFilterChips, { countByStatus } from '../components/StatusFilterChips';
import RecordsEmptyState, { findExpensesElsewhere } from '../components/RecordsEmptyState';
import LoadErrorState from '../components/LoadErrorState';
import { clickableRowProps, CLICKABLE_ROW_SX } from '../utils/rowInteraction';
import { ReimbursementBatchDetail, ReimbursementLine } from '../utils/reimbursementTypes';
import { buildReimbursementLineColumns, withPreviewHandler } from '../components/reimbursementLineColumns';
import { fmtDate, fmtAmount, resolveStatusNum } from '../utils/reimbursementFormat';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { resolveStatusNum as resolveStatus, STATUS, STATUS_LABEL, StatusNum } from '../utils/reimbursementFormat';
import SubmissionMobileCard from '../components/SubmissionMobileCard';
import { SkeletonTable } from '@app/modules/common/components/Skeleton';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Tooltip } from '@mui/material';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { LEGACY_UIKIT as T, tonePair } from '@app/theme/tokens';

// Sentinel batch id for reimbursements that have no batch (batch_id = NULL).
// These are legacy/imported records that were never submitted through the
// batch workflow; we group them into a synthetic "Legacy" submission so they
// can never silently disappear from the UI.
const UNGROUPED_BATCH_ID = '__ungrouped__';

// A batch whose lines were decided individually is neither approved nor rejected as a whole.
//
// This was a local `3`, chosen when the real statuses were 0/1/2 and 3 was genuinely spare.
// NEEDS_INFO then took 3, and the two silently became the same number: a batch whose lines were
// ALL questioned collapses to a single status (3), which this then rendered as "Partly approved"
// — a batch nobody had decided anything about, reported as partly decided.
//
// `STATUS.MIXED` (9) is the module's own display-only sentinel for exactly this, deliberately
// far out of range. One sentinel, defined once.
const MIXED_STATUS = STATUS.MIXED;







// ── Document Preview Modal ─────────────────────────────────────────────────────

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
  ungroupedReimbursements?: ReimbursementLine[];
  /**
   * Ids of the lines the clicked row represents. A batch can span several expense months
   * and the row only covers one of them, so the modal must show exactly this row's lines —
   * otherwise opening a June row lists the batch's July expenses too.
   */
  visibleLineIds?: string[] | null;
}

function SubmissionDetailModal({
  batchId,
  onClose,
  onRefresh,
  showEditDeleteOption,
  filterStatus,
  ungroupedReimbursements = [],
  visibleLineIds = null,
}: SubmissionDetailModalProps) {
  const [batch, setBatch] = useState<ReimbursementBatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<IReimbursementsUpdate | null>(null);
  const [approvalCurrentLevel, setApprovalCurrentLevel] = useState<number>(1);
  const [approvalInstanceId, setApprovalInstanceId] = useState<string | null>(null);
  const [pendingEditRow, setPendingEditRow] = useState<IReimbursementsUpdate | null>(null);
  const [showPartialApprovalWarning, setShowPartialApprovalWarning] = useState(false);
  const [downloadingBill, setDownloadingBill] = useState(false);
  /** The query thread for one expense, opened from its "Respond" link. */
  const [conversationFor, setConversationFor] = useState<{ id: string; label: string } | null>(null);

  const isPartiallyApproved = approvalCurrentLevel > 1;

  const reimbursements: ReimbursementLine[] = batch?.reimbursements ?? [];

  // When filterStatus is 1 (approved) or 2 (rejected), show only matching requests so
  // the popup reflects exactly which group was clicked in the submissions table.
  const displayedReimbursements = useMemo(() => {
    // The clicked row covers one expense month of the batch; show exactly its lines.
    if (visibleLineIds?.length) {
      const wanted = new Set(visibleLineIds);
      return reimbursements.filter((r) => wanted.has(r.id));
    }
    if (filterStatus === 1 || filterStatus === 2) {
      return reimbursements.filter((r) => resolveStatusNum(r.status) === filterStatus);
    }
    return reimbursements;
  }, [reimbursements, filterStatus, visibleLineIds]);

  // Say so when the batch holds more than what this row covers, so the totals in the
  // modal and the row can differ without looking like a bug.
  const hiddenLineCount = Math.max(0, reimbursements.length - displayedReimbursements.length);

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

  // The dialog held whatever it fetched when it opened. Replying to a query from inside it
  // refreshed the table BEHIND it, so the row you were looking at kept offering "Respond" to
  // someone who had just responded — until they closed and reopened the whole thing.
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadBatch(); });

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
      // Same ten columns the approver's batch modal renders — one definition, two callers.
      ...buildReimbursementLineColumns(
        { resolveClientType, resolveClientCompany, resolveProject },
        detailTotal,
      ),
      {
        accessorKey: 'status',
        header: 'Status',
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const statusNum = resolveStatusNum(row.original.status);
          if (statusNum === 1) return <span className="badge badge-light-success fw-semibold fs-8">Approved</span>;
          if (statusNum === 2) return <span className="badge badge-light-danger fw-semibold fs-8">Rejected</span>;
          // A questioned line read as "Pending", so the one row the employee had to act on
          // looked exactly like the rows they had to wait on.
          if (statusNum === STATUS.NEEDS_INFO) {
            return <span className="badge badge-light-warning fw-semibold fs-8">Needs info</span>;
          }
          return <span className="badge badge-light-warning fw-semibold fs-8">Pending</span>;
        },
      },
      // Shown for a QUESTION as well as a rejection. Both write the same column on the line, but
      // this keyed on status 2 and then re-checked it inside the cell, so an approver's question
      // was stored, notified — and rendered nowhere the employee could read it.
      ...(displayedReimbursements.some((r) => {
        const n = resolveStatusNum(r.status);
        return n === 2 || n === STATUS.NEEDS_INFO;
      })
        ? [
            {
              accessorKey: 'rejectionReason',
              header: "Approver's note",
              size: 240,
              enableColumnActions: false,
              Cell: ({ row }: any) => {
                const statusNum = resolveStatusNum(row.original.status);
                const reason = row.original.rejectionReason || row.original.rejectReason;
                if (!reason || (statusNum !== 2 && statusNum !== STATUS.NEEDS_INFO)) {
                  return <span className="text-muted">—</span>;
                }
                const asking = statusNum === STATUS.NEEDS_INFO;
                const queries = row.original.queries;
                const hasAwaitingQuery = Array.isArray(queries) && queries.length > 0
                  ? queries.some((q: any) => q.status !== 'RESOLVED' && q.awaitingRole === 'EMPLOYEE')
                  : true;

                return (
                  <div style={{ maxWidth: 240, lineHeight: 1.35 }} className="py-0.5">
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', rowGap: '4px' }}>
                      <span
                        className={`badge badge-light-${asking ? (hasAwaitingQuery ? 'warning' : 'secondary') : 'danger'} fw-bold fs-9 px-1.5 py-0.5 me-1.5`}
                        style={{ display: 'inline-flex', alignSelf: 'center' }}
                      >
                        {asking ? (hasAwaitingQuery ? 'Question' : 'Responded') : 'Rejected'}
                      </span>
                      <span className="text-gray-800 fs-7 fw-normal" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {reason}
                      </span>
                    </div>
                    {asking && (
                      <div className="mt-1">
                        {hasAwaitingQuery ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationFor({ id: row.original.id, label: row.original.description || 'Expense' });
                            }}
                            style={{
                              padding: '2px 8px',
                              border: `1px solid ${T.color.warning}`,
                              borderRadius: `${T.radius.sm}px`,
                              backgroundColor: '#fff',
                              color: T.color.warning,
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none',
                              boxShadow: T.shadow.xs,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease-in-out',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = T.color.warningSoft;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff';
                            }}
                          >
                            <span style={{ color: T.color.warning, display: 'inline-flex' }}>
                              <KTIcon iconName="message-text-2" className="fs-8" />
                            </span>
                            Respond
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationFor({ id: row.original.id, label: row.original.description || 'Expense' });
                            }}
                            style={{
                              padding: '2px 8px',
                              border: `1px solid ${T.color.neutral}`,
                              borderRadius: `${T.radius.sm}px`,
                              backgroundColor: '#fff',
                              color: T.color.neutral,
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none',
                              boxShadow: T.shadow.xs,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease-in-out',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = T.color.neutralSoft;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff';
                            }}
                          >
                            <span style={{ color: T.color.neutral, display: 'inline-flex' }}>
                              <KTIcon iconName="eye" className="fs-8" />
                            </span>
                            View Conversation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                // A questioned line is EDITABLE — that is how the employee answers, and the
                // server allows it (a rejected one it refuses). This treated anything that was
                // not status 0 as decided, so the one row the approver was waiting on said
                // "already been processed and cannot be modified".
                const needsAnswer = statusNum === STATUS.NEEDS_INFO;
                const canAmend = isPending || needsAnswer;
                const isDeleting = deletingId === r.id;

                if (!canAmend) {
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
                  canAmend &&
                  hasPermission(
                    resourceNameMapWithCamelCase.reimbursement,
                    permissionConstToUseWithHasPermission.editOwn,
                    r,
                  );
                // Delete stays on untouched lines only. Answering a question is an amendment;
                // deleting the line the approver asked about just leaves them with no answer.
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
                        aria-label={needsAnswer ? 'Answer the approver' : 'Edit'}
                        title={needsAnswer
                          ? "Answer your approver's question — saving sends it back for approval"
                          : 'Edit'}
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
                        aria-label="Delete" title="Delete"
                        disabled={isDeleting}
                        onClick={() => handleDelete(r.id)}
                      >
                        {isDeleting ? (
                          <span className="spinner-border spinner-border-sm text-danger" />
                        ) : (
                          <i className="bi bi-trash3 fs-4 text-danger" />
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
      {/*
        * `max-width: 90vw; width: 95vw` is not responsive — it is 95% of whatever the screen is.
        * On a 360px phone that is a 342px-wide dialog holding a multi-column table, with the
        * 5% margin the only thing between the content and the edge. `min()` gives a phone the
        * full width it needs and a desktop a dialog that stops growing.
        */}
      <style>{`
        .submission-detail-modal { max-width: min(100%, 1140px) !important; margin: 0.5rem auto; }
        @media (min-width: 576px) { .submission-detail-modal { margin: 1.75rem auto; } }
      `}</style>
      <Modal
        show={!!batchId}
        onHide={onClose}
        centered
        size="xl"
        dialogClassName="submission-detail-modal"
        enforceFocus={false}
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
                  {batch.approvedAt && (
                    <>&nbsp;·&nbsp;Decided {fmtDate(batch.approvedAt)}</>
                  )}
                  {hiddenLineCount > 0 && (
                    <>
                      &nbsp;·&nbsp;
                      <span className="text-primary">
                        {hiddenLineCount} more expense{hiddenLineCount !== 1 ? 's' : ''} in this batch from other months
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {batch && displayedReimbursements.length > 0 && (
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
                title="Download batch slip (all reimbursements)"
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
              data={withPreviewHandler(displayedReimbursements, handleViewDocument)}
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

      {conversationFor && (
        <QueryConversationDialog
          reimbursementId={conversationFor.id}
          requestLabel={conversationFor.label}
          onClose={() => setConversationFor(null)}
          onChanged={() => { loadBatch(); onRefresh?.(); }}
        />
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
  /**
   * Which date the period filters on — the two questions people actually ask:
   *  - 'expense'    : "what did I spend in June?"  → rows are a batch's June lines only,
   *                   so a batch spanning months appears in each month it touches.
   *  - 'submission' : "what did I submit in June?" → one row per batch, whole batch, in
   *                   the month it was submitted.
   * Same data, two axes. Mixing them in one table is what made June expenses look like
   * they belonged to July.
   */
  mode?: 'expense' | 'submission';
  /**
   * Jumps the page period to another month. Supplied by whoever owns the period state, so
   * the empty state can offer "you have 3 in May 2026" as something you can actually click.
   */
  onGoToPeriod?: (date: Dayjs) => void;
  /**
   * Status filter driven from outside — the donut slice click.
   *
   * The chips keep owning the filter; this only pushes a new value in when the caller changes
   * it. Making the filter fully controlled would mean every existing caller has to hold state
   * it does not care about, for one feature.
   */
  externalStatusFilter?: StatusNum | null;
  /** Expense category driven from outside — a "Where It Went" click. Null shows everything. */
  externalCategoryFilter?: string | null;
  /** Clears that filter, from the chip this table renders for it. */
  onClearCategoryFilter?: () => void;
  /** Section heading, rendered on the same line as the status chips. */
  title?: string;
  subtitle?: React.ReactNode;
  /** Hide the entire section if there's no data. */
  hideIfEmpty?: boolean;
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
  mode = 'expense',
  onGoToPeriod,
  externalStatusFilter,
  externalCategoryFilter = null,
  onClearCategoryFilter,
  title,
  subtitle,
  hideIfEmpty = false,
}: SubmissionsTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  // Follows the page's eye toggle. Empty string when no provider is present, so a table used
  // outside a page that offers the toggle renders exactly as it always has.
  const { cls: sensitiveCls } = useSensitiveData();
  // null = All. Defaults to All deliberately: a screen that silently narrows to approved is
  // the bug this replaces.
  const [statusFilter, setStatusFilter] = useState<StatusNum | null>(null);

  // Adopt an externally-chosen filter (a donut slice) without taking ownership of the chips.
  useEffect(() => {
    if (externalStatusFilter !== undefined) setStatusFilter(externalStatusFilter);
  }, [externalStatusFilter]);
  // A failed fetch used to set rows to [], which renders exactly like an empty month.
  const [loadError, setLoadError] = useState(false);
  // Every line the employee has, regardless of period — only used to tell an empty month
  // where its expenses actually are.
  const [allTimeLines, setAllTimeLines] = useState<ReimbursementLine[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  const [detailFilterStatus, setDetailFilterStatus] = useState<number | null>(null);
  // Lines behind the clicked row — the row is one expense month of a batch, not the batch.
  const [detailLineIds, setDetailLineIds] = useState<string[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Reimbursements with no batch (batch_id = NULL) for the current scope/period.
  // Surfaced as a synthetic "Legacy" submission so orphaned records stay visible.
  const [ungroupedReimbursements, setUngroupedReimbursements] = useState<ReimbursementLine[]>([]);

  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  // The period is a range of EXPENSE dates. An expense belongs to the month it was
  // incurred in — not the month its batch happened to be submitted or approved in.
  // Filtering batches by `submittedAt` is what put June expenses under July.
  // Yearly is FISCAL, not calendar (OPEN_QUESTIONS Q2). The label above this table already read
  // "fiscal" while the filter used the calendar year, so the two disagreed for every date in
  // Jan-Mar. `generateFiscalYearFromGivenYear` reads the company's configured fiscal period, so
  // it is async — hence state rather than a useMemo.
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [rangeReady, setRangeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRangeReady(false);
    (async () => {
      let next: { start: string; end: string } | null = null;
      if (period === 'monthly') {
        next = { start: date.startOf('month').format('YYYY-MM-DD'), end: date.endOf('month').format('YYYY-MM-DD') };
      } else if (period === 'yearly') {
        const { startDate, endDate } = await generateFiscalYearFromGivenYear(date);
        next = { start: startDate, end: endDate };
      }
      if (cancelled) return;
      setRange(next); // null for All Time
      setRangeReady(true);
    })();
    return () => { cancelled = true; };
  }, [period, date]);

  const loadBatches = useCallback(async () => {
    setTableLoading(true);
    setLoadError(false);
    const scopedEmpId = selectedEmployeeId || employeeId;
    if (!scopedEmpId) {
      setRows([]);
      setUngroupedReimbursements([]);
      setTableLoading(false);
      return;
    }
    try {
      // Expense mode lets the server filter (the endpoint already filters on expenseDate).
      // Submission mode filters on the BATCH's date, which the line query cannot express,
      // so it pulls the employee's lines and filters the assembled batches below.
      const res = (mode === 'expense' && range)
        ? await fetchReimbursementsForEmployee(scopedEmpId, range.start, range.end)
        : await fetchAllReimbursementsForEmployee(scopedEmpId);
      const lines: any[] = (res?.data?.reimbursements || res?.reimbursements || [])
        .filter((r: any) => r.isActive !== false);

      // Only fetched when the period view came back empty — this is purely so the empty state can
      // say WHERE the expenses are, and it is not worth a second request on the normal path.
      if (lines.length === 0 && range) {
        try {
          const allRes = await fetchAllReimbursementsForEmployee(scopedEmpId);
          setAllTimeLines((allRes?.data?.reimbursements || allRes?.reimbursements || [])
            .filter((r: any) => r.isActive !== false));
        } catch {
          setAllTimeLines([]); // the hint is a nicety; failing to load it must not break the page
        }
      } else {
        setAllTimeLines(lines);
      }

      const built: any[] = [];
      const ungrouped: any[] = [];

      if (mode === 'submission') {
        // One row per BATCH, whole batch, grouped by reimbursement period.
        // Phase 1: Batches now represent exactly one calendar month, so filter by expense period.
        const byBatch = new Map<string, any[]>();
        for (const r of lines) {
          const batchId = r.batch?.id || r.batchId;
          if (!batchId) {
            ungrouped.push(r); // collect unbatched lines as legacy reimbursements
            continue;
          }
          if (!byBatch.has(batchId)) byBatch.set(batchId, []);
          byBatch.get(batchId)!.push(r);
        }

        for (const [batchId, items] of byBatch.entries()) {
          const batch = items[0]?.batch ?? null;
          const submittedAt = batch?.submittedAt ?? null;

          const statuses = new Set(items.map((r) => resolveStatusNum(r.status)));
          // A batch can be decided line by line, so it is not always one status.
          const status = statuses.size === 1 ? [...statuses][0] : MIXED_STATUS;
          const approved = items.filter((r) => resolveStatusNum(r.status) === 1);

          let paymentStatus: string | null = null;
          if (approved.length) {
            const paidCount = approved.filter((r) => r.paymentStatus === 'PAID').length;
            const partialCount = approved.filter((r) => r.paymentStatus === 'PARTIAL').length;
            if (paidCount === approved.length) paymentStatus = 'PAID';
            else if (paidCount > 0 || partialCount > 0) paymentStatus = 'PARTIAL';
            else paymentStatus = 'UNPAID';
          }

          const decidedTimes = items
            .map((r) => r.approvedAt ?? batch?.approvedAt ?? null)
            .filter(Boolean)
            .map((d: string) => new Date(d).getTime());
          const expenseTimes = items
            .map((r) => r.expenseDate)
            .filter(Boolean)
            .map((d: string) => new Date(d).getTime());

          // Phase 1: Filter by batch's reimbursement period (expense date range), not submission date
          if (range && expenseTimes.length) {
            const expenseFrom = dayjs(new Date(Math.min(...expenseTimes))).format('YYYY-MM-DD');
            if (expenseFrom < range.start || expenseFrom > range.end) continue;
          }

          built.push({
            _batchId: batchId,
            _submissionId: batch?.submissionId ?? batchId,
            _submittedAt: submittedAt,
            _approvedAt: decidedTimes.length ? new Date(Math.max(...decidedTimes)).toISOString() : null,
            _status: status,
            _totalRequests: items.length,
            _totalAmount: items.reduce((sum, r) => sum + Number(r.amount || 0), 0),
            _paymentStatus: paymentStatus,
            _rejectReason: items.find((r) => r.rejectReason)?.rejectReason ?? null,
            _ungrouped: false,
            // Whole batch - no month scoping, that is the point of this view.
            _lineIds: null,
            _categories: [...new Set(items.map(categoryName))],
            _expenseFrom: expenseTimes.length ? new Date(Math.min(...expenseTimes)).toISOString() : null,
            _expenseTo: expenseTimes.length ? new Date(Math.max(...expenseTimes)).toISOString() : null,
          });
        }
      } else {
        // Expense mode: group by batch, then by approval status inside it - one row per
        // (batch, status) so a row's status, subtotal and payment state all mean one thing.
        // A batch that spans several months contributes only THIS period's lines here.
        const groups = new Map<string, any[]>();
        for (const r of lines) {
          const batchId = r.batch?.id || r.batchId;
          if (!batchId) {
            ungrouped.push(r); // collect unbatched lines as legacy reimbursements
            continue;
          }
          const key = batchId + '::' + resolveStatusNum(r.status);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(r);
        }

        for (const [key, items] of groups.entries()) {
          const batchId = key.slice(0, key.lastIndexOf('::'));
          const status = Number(key.slice(key.lastIndexOf('::') + 2));
          const batch = items[0]?.batch ?? null;

          let paymentStatus: string | null = null;
          if (status === 1) {
            const paidCount = items.filter((r) => r.paymentStatus === 'PAID').length;
            const partialCount = items.filter((r) => r.paymentStatus === 'PARTIAL').length;
            if (paidCount === items.length) paymentStatus = 'PAID';
            else if (paidCount > 0 || partialCount > 0) paymentStatus = 'PARTIAL';
            else paymentStatus = 'UNPAID';
          }

          const decidedTimes = items
            .map((r) => r.approvedAt ?? batch?.approvedAt ?? null)
            .filter(Boolean)
            .map((d: string) => new Date(d).getTime());
          const expenseTimes = items
            .map((r) => r.expenseDate)
            .filter(Boolean)
            .map((d: string) => new Date(d).getTime());

          built.push({
            _batchId: batchId,
            _submissionId: batch?.submissionId ?? batchId,
            _submittedAt: batch?.submittedAt ?? null,
            _approvedAt: decidedTimes.length ? new Date(Math.max(...decidedTimes)).toISOString() : null,
            _status: status,
            _totalRequests: items.length,
            _totalAmount: items.reduce((sum, r) => sum + Number(r.amount || 0), 0),
            _paymentStatus: paymentStatus,
            _rejectReason: status === 2
              ? items.find((r) => r.rejectReason)?.rejectReason ||
                items.find((r) => r.rejectionReason)?.rejectionReason || null
              : null,
            _ungrouped: false,
            // Ids of the lines this row represents - the detail modal shows exactly these,
            // so opening a row from June never shows the batch's July lines.
            _lineIds: items.map((r) => r.id),
            _categories: [...new Set(items.map(categoryName))],
            _expenseFrom: expenseTimes.length ? new Date(Math.min(...expenseTimes)).toISOString() : null,
            _expenseTo: expenseTimes.length ? new Date(Math.max(...expenseTimes)).toISOString() : null,
          });
        }
      }

      // Show ungrouped (unbatched) reimbursements as a synthetic "Legacy" row if any exist
      if (ungrouped.length) {
        const statuses = new Set(ungrouped.map((r) => resolveStatusNum(r.status)));
        const status = statuses.size === 1 ? [...statuses][0] : MIXED_STATUS;
        const approved = ungrouped.filter((r) => resolveStatusNum(r.status) === 1);

        let paymentStatus: string | null = null;
        if (approved.length) {
          const paidCount = approved.filter((r) => r.paymentStatus === 'PAID').length;
          const partialCount = approved.filter((r) => r.paymentStatus === 'PARTIAL').length;
          if (paidCount === approved.length) paymentStatus = 'PAID';
          else if (paidCount > 0 || partialCount > 0) paymentStatus = 'PARTIAL';
          else paymentStatus = 'UNPAID';
        }

        const expenseTimes = ungrouped
          .map((r) => r.expenseDate)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime());

        built.push({
          _batchId: UNGROUPED_BATCH_ID,
          _submissionId: 'Legacy (Not Submitted)',
          _submittedAt: null,
          _approvedAt: null,
          _status: status,
          _totalRequests: ungrouped.length,
          _totalAmount: ungrouped.reduce((sum, r) => sum + Number(r.amount || 0), 0),
          _paymentStatus: paymentStatus,
          _rejectReason: ungrouped.find((r) => r.rejectReason)?.rejectReason ?? null,
          _ungrouped: true,
          _lineIds: null,
          _categories: [...new Set(ungrouped.map(categoryName))],
          _expenseFrom: expenseTimes.length ? new Date(Math.min(...expenseTimes)).toISOString() : null,
          _expenseTo: expenseTimes.length ? new Date(Math.max(...expenseTimes)).toISOString() : null,
        });
      }

      // Newest first on whichever axis this table is anchored to; unbatched always last.
      built.sort((a, b) => {
        if (a._ungrouped !== b._ungrouped) return a._ungrouped ? 1 : -1;
        const key = mode === 'submission' ? '_submittedAt' : '_expenseFrom';
        return String(b[key] ?? '').localeCompare(String(a[key] ?? ''));
      });

      setUngroupedReimbursements(ungrouped);
      setRows(built);
    } catch {
      setRows([]);
      setUngroupedReimbursements([]);
      setLoadError(true);
    } finally {
      setTableLoading(false);
    }
  }, [mode, range, refreshKey, selectedEmployeeId, employeeId]);

  useEffect(() => {
    // Wait for the (async, fiscal-aware) range before loading. `range` is null both while it is
    // still resolving and for All Time, and loading on the former would fetch every row and then
    // immediately refetch the real period.
    if (!rangeReady) return;
    loadBatches();
  }, [loadBatches, rangeReady]);

  // Refresh when any reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { setRefreshKey((k) => k + 1); });

  const rowsTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r._totalAmount || 0), 0),
    [rows],
  );

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: '_submissionId',
        header: 'Batch ID',
        size: 190,
        Cell: ({ row }: any) => (
          row.original._ungrouped ? (
            <span className="text-muted fs-8 fst-italic">Unbatched</span>
          ) : (
            <span
              style={{
                display: 'inline-block', background: '#eef2ff', color: '#3730a3',
                fontWeight: 700, fontSize: 11, padding: '3px 8px', borderRadius: 6,
                fontFamily: 'monospace', letterSpacing: '0.03em',
              }}
            >
              {row.original._submissionId}
            </span>
          )
        ),
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
      },
      {
        accessorKey: '_submittedAt',
        header: 'Submitted On',
        size: 140,
        Cell: ({ row }: any) => (
          <span className="text-dark fs-7">{fmtDate(row.original._submittedAt)}</span>
        ),
      },
      {
        accessorKey: '_totalRequests',
        header: 'Expenses',
        size: 110,
        Cell: ({ row }: any) => (
          <span className="text-dark fs-7">{row.original._totalRequests}</span>
        ),
      },
      // Only in the submission view: the months this batch's expenses fall in. It is the
      // bridge between the two tables — this is why a batch submitted in August can show
      // up under June in the records table.
      ...(mode === 'submission' ? [{
        accessorKey: '_expenseFrom',
        header: 'Expense Period',
        size: 170,
        Cell: ({ row }: any) => {
          const from = row.original._expenseFrom;
          const to = row.original._expenseTo;
          if (!from) return <span className="text-muted fs-7">-</span>;
          const a = dayjs(from), b = dayjs(to ?? from);
          return (
            <span className="text-dark fs-7">
              {a.isSame(b, 'month') ? a.format('MMM YYYY') : a.format('MMM YYYY') + ' - ' + b.format('MMM YYYY')}
            </span>
          );
        },
      }] : []),
      {
        accessorKey: '_totalAmount',
        header: 'Amount (₹)',
        size: 145,
        Cell: ({ row }: any) => (
          <span className={`fs-7 ${sensitiveCls}`}>₹{fmtAmount(row.original._totalAmount)}</span>
        ),
        Footer: () => <span className={`text-dark fw-bold fs-7 ${sensitiveCls}`}>₹{fmtAmount(rowsTotal)}</span>,
      },
      {
        accessorKey: '_status',
        header: 'Approval Status',
        size: 130,
        Cell: ({ row }: any) => {
          const s = row.original._status;
          if (s === 1) return <span className="badge badge-light-success fw-semibold fs-8">Approved</span>;
          if (s === 2) return <span className="badge badge-light-danger fw-semibold fs-8">Rejected</span>;
          // Every line questioned: the batch is waiting on the EMPLOYEE, not the approver, and
          // saying "Pending" here sent them looking for someone else to chase.
          if (s === STATUS.NEEDS_INFO) {
            return (
              <Tooltip title="Your approver asked a question — open the batch to read it and answer by editing the expense">
                <span className="badge badge-light-warning fw-semibold fs-8">Needs info</span>
              </Tooltip>
            );
          }
          if (s === MIXED_STATUS) {
            return (
              <Tooltip title="Some requests in this batch were approved, others rejected — open it to see which">
                <span className="badge badge-light-info fw-semibold fs-8">Partly approved</span>
              </Tooltip>
            );
          }
          return <span className="badge badge-light-warning fw-semibold fs-8">Pending</span>;
        },
      },
      {
        accessorKey: '_approvedAt',
        header: 'Approved On',
        size: 140,
        Cell: ({ row }: any) => {
          if (row.original._status === 0) return <span className="text-muted fs-7">Awaiting</span>;
          if (!row.original._approvedAt) return <span className="text-muted fs-7">—</span>;
          return <span className="text-dark fs-7">{fmtDate(row.original._approvedAt)}</span>;
        },
      },
      {
        accessorKey: '_paymentStatus',
        header: 'Payment Status',
        size: 145,
        Cell: ({ row }: any) => {
          // Driven by whether anything in the row is approved, not by the row's own
          // status — a partly-approved batch still has approved lines to pay.
          const ps = row.original._paymentStatus;
          if (!ps) return <span className="text-muted fs-7">N/A</span>;
          if (ps === 'PAID')
            return <span className="badge badge-light-success text-success fw-bold px-3 py-2 fs-8">Paid</span>;
          if (ps === 'PARTIAL')
            return <span className="badge badge-light-info text-info fw-bold px-3 py-2 fs-8">Partially Paid</span>;
          return <span className="badge badge-light-warning text-warning fw-bold px-3 py-2 fs-8">Pending</span>;
        },
      },
    ],
    // `sensitiveCls` is a dependency, not an incidental read: without it the columns memo keeps
    // the class captured at first render and the eye toggle does nothing to the amount column.
    [rowsTotal, mode, sensitiveCls],
  );

  // Status is a filter the user controls, defaulting to All. Six screens used to hard-code
  // `status === 1`, which is the "it only shows if it's approved" report — rows were absent with
  // nothing on screen to say so.
  const statusCounts = useMemo(
    () => countByStatus(rows.map((r) => ({ status: r._status })), resolveStatus),
    [rows],
  );

  const visibleRows = useMemo(() => {
    let out = statusFilter === null ? rows : rows.filter((r) => resolveStatus(r._status) === statusFilter);
    if (externalCategoryFilter) {
      out = out.filter((r) => (r._categories as string[] | undefined)?.includes(externalCategoryFilter));
    }
    return out;
  }, [rows, statusFilter, externalCategoryFilter]);

  // Where else this employee has expenses, so an empty month can say so instead of implying
  // the records are gone. Uses the unfiltered all-time set, not the current period.
  const elsewhere = useMemo(
    () => (period === 'monthly' ? findExpensesElsewhere(allTimeLines, date) : []),
    [allTimeLines, period, date],
  );

  const periodLabel = period === 'monthly'
    ? date.format('MMMM YYYY')
    : period === 'yearly' ? `FY ${date.format('YYYY')}` : 'all time';

  // Hide the entire section (heading + filter + table) if there's no data and hideIfEmpty is set.
  if (hideIfEmpty && rows.length === 0) {
    return null;
  }

  return (
    <>
      {/* Heading and status rail share one line — the heading block used to sit in the page
          above with its own margins, leaving a band of empty space beside the chips. */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 gap-lg-3 mb-3 px-3 px-lg-0">
        <div style={{ minWidth: 0 }}>
          {title && <h2 className="mb-0 fs-5 fs-lg-4">{title}</h2>}
          {subtitle && <div className="text-muted fs-9 fs-lg-8">{subtitle}</div>}
        </div>
        <div className="d-flex align-items-center flex-wrap gap-2">
          {/* A filter set from a chart the reader may have scrolled past needs to say so here,
              where the narrowed rows are — and be undoable from the same place. */}
          {externalCategoryFilter && (
            <button
              type="button"
              onClick={onClearCategoryFilter}
              title="Clear category filter"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3',
                borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 600,
                cursor: onClearCategoryFilter ? 'pointer' : 'default',
              }}
            >
              {externalCategoryFilter}
              {onClearCategoryFilter && <span aria-hidden>✕</span>}
            </button>
          )}
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
        </div>
      </div>

      {tableLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : loadError ? (
        <LoadErrorState what="your expenses" onRetry={() => setRefreshKey((k) => k + 1)} />
      ) : visibleRows.length === 0 ? (
        <RecordsEmptyState
          periodLabel={periodLabel}
          elsewhere={elsewhere}
          onGoToPeriod={onGoToPeriod}
          activeStatusFilter={statusFilter === null ? null : STATUS_LABEL[statusFilter]}
          onClearStatusFilter={() => setStatusFilter(null)}
        />
      ) : (
        <MaterialTable
          columns={columns}
          data={visibleRows}
          tableName="Submissions"
          resource={resource}
          viewOwn={viewOwn}
          viewOthers={viewOthers}
          checkOwnWithOthers={checkOwnWithOthers}
          employeeId={employeeId}
          showColumnFooter={true}
          // Narrow screens get cards instead of an eight-column horizontal scroller. Same
          // click target as the wide table, so opening a submission works identically.
          renderMobileCard={({ row }: any) => (
            <SubmissionMobileCard
              row={row.original}
              onOpen={() => {
                setDetailBatchId(row.original._batchId);
                setDetailFilterStatus(row.original._status ?? null);
                setDetailLineIds(row.original._lineIds ?? null);
              }}
            />
          )}
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
                [MIXED_STATUS]: { bg: 'rgba(59,130,246,0.04)', border: '#3b82f6', hover: 'rgba(59,130,246,0.08)' },
              };
              const c = colorMap[s] ?? null;
              return {
                ...clickableRowProps(() => {
                  setDetailBatchId(row.original._batchId);
                  setDetailFilterStatus(row.original._status ?? null);
                  setDetailLineIds(row.original._lineIds ?? null);
                }, `Open submission ${row.original._submissionId ?? ''}`.trim()),
                sx: {
                  ...CLICKABLE_ROW_SX,
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
        visibleLineIds={detailLineIds}
        ungroupedReimbursements={ungroupedReimbursements}
        onClose={() => { setDetailBatchId(null); setDetailFilterStatus(null); setDetailLineIds(null); }}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onEdit={onEdit}
        showEditDeleteOption={showEditDeleteOption}
      />
    </>
  );
}

export default SubmissionsTable;
