import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { Box, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { KTIcon } from '@metronic/helpers';
import {
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
  downloadReimbursementBillPdf,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { usePermission } from '@hooks/usePermission';
import { QUERY_CATEGORIES } from '@services/reimbursementQueries';
import { GlassDialog, GlassHeader, WtButton, tonePair } from '@app/modules/common/components/ui';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import QueryConversationDialog from '../components/QueryConversation';
import VersionHistoryDialog from '../components/VersionHistoryDialog';
import {
  ApprovalProgressPanel,
  BatchSummaryStrip,
  RequestWorkflowRow,
  type BatchSummaryView,
  type LevelProgressView,
  type QueryView,
  type RequestRowData,
} from '../components/BatchWorkflowPanel';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Re-exported, not re-implemented. Other modules (DomainApprovalQueue) import fmtAmount from
// this file, so the export surface stays while the behaviour comes from the one shared copy.
// `export ... from` alone re-exports without binding locally, and this file uses both.
import { fmtDate, fmtAmount, resolveStatusNum, STATUS, downloadBlob } from '../utils/reimbursementFormat';
export { fmtDate, fmtAmount };

export function statusBadge(status: number) {
  if (status === 1) return <span className='badge badge-light-success fw-semibold fs-8'>Approved</span>;
  if (status === 2) return <span className='badge badge-light-danger fw-semibold fs-8'>Rejected</span>;
  // NEEDS_INFO rendered as "Pending" here, so a line the approver had asked a question about
  // looked identical to one nobody had touched — and the employee had no reason to open it.
  if (status === STATUS.NEEDS_INFO) return <span className='badge badge-light-warning fw-semibold fs-8'>Needs info</span>;
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

// ── Reject / ask-a-question modal ──────────────────────────────────────────────

interface RejectReasonModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (reason: string, category?: string) => void;
  submitting: boolean;
  title?: string;
  /**
   * Which outcome is being written. Rejection ends the request; a question returns it to the
   * employee still alive.
   *
   * The modal used to take only a `title`, so "Ask for more information" opened a dialog whose
   * every other word said rejection — the label, the placeholder, the hint and a red "Confirm
   * Rejection" button. An approver reading that could reasonably believe they were about to
   * reject the claim, which is the opposite of what the button does.
   */
  variant?: 'reject' | 'request-info';
  /** Narrows the category list — a batch question is not about one expense's receipt. */
  scope?: 'REQUEST' | 'BATCH';
}

const REASON_COPY = {
  reject: {
    title: 'Reject Request',
    label: 'Reason for Rejection',
    placeholder: 'Describe why this request is being rejected…',
    hint: 'A rejection reason is required. The employee sees it.',
    confirm: 'Confirm rejection',
  },
  'request-info': {
    title: 'Ask a question',
    label: 'What do you need to know?',
    placeholder: 'e.g. Which client visit was this taxi for? Please attach the receipt.',
    hint: 'This opens a conversation with the employee. The expense stays where it is — it is not rejected, and approval does not restart.',
    confirm: 'Send question',
  },
};

/**
 * Rejection reason / question composer.
 *
 * A react-bootstrap `<Modal>` until now, which opened BEHIND the batch dialog: Bootstrap stacks
 * modals at z-index 1055 and MUI at 1300, so a dialog raised from inside the batch view rendered
 * underneath the thing that raised it. Moved onto `GlassDialog`, where nested dialogs stack in
 * mount order — and off the Bootstrap primitives the UI standard bans anyway.
 */
export function RejectReasonModal({
  show, onClose, onConfirm, submitting, title, variant = 'reject', scope = 'REQUEST',
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  // Filing a question under a category is what makes "3 missing receipts this month" answerable
  // later. Only offered for a question — a rejection reason is prose, not a taxonomy.
  const [category, setCategory] = useState('OTHER');
  const copy = REASON_COPY[variant];
  const trimmed = reason.trim();

  const categories = QUERY_CATEGORIES.filter((c) => c.scope === 'BOTH' || c.scope === scope);

  useEffect(() => { if (!show) { setReason(''); setCategory('OTHER'); } }, [show]);

  return (
    <GlassDialog
      open={show}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      header={
        <GlassHeader
          title={title ?? copy.title}
          icon={<KTIcon iconName={variant === 'reject' ? 'cross-circle' : 'question'} className="fs-1" />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 1.75, sm: 2.25 }, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
        {variant === 'request-info' && (
          <TextField
            select fullWidth size="small" label="What is this about?"
            value={category} onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          >
            {categories.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          multiline minRows={3} fullWidth size="small" autoFocus
          label={copy.label}
          placeholder={copy.placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          helperText={copy.hint}
        />

        <Stack direction="row" gap={1} justifyContent="flex-end">
          <WtButton ghost onClick={onClose} disabled={submitting}>Cancel</WtButton>
          <WtButton
            tone={variant === 'reject' ? 'danger' : 'primary'}
            disabled={!trimmed || submitting}
            onClick={() => onConfirm(trimmed, variant === 'request-info' ? category : undefined)}
          >
            {submitting ? 'Sending…' : copy.confirm}
          </WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}

// ── Batch detail ───────────────────────────────────────────────────────────────

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onBatchActionDone: () => void;
  approvalInstanceId?: string | null;
  /** When 1 or 2, restricts the list to that final status — used when the modal is opened from an
   *  approved- or rejected-group row in the approvals queue. */
  filterStatus?: number | null;
}

/**
 * The batch, as a workflow.
 *
 * This was a MaterialTable of expense lines with a status column. It could not say which LEVEL a
 * request had reached, that a question was open on it, or that it had been edited and resubmitted,
 * because none of that reached the client — and it hid rejected lines outright while a batch was
 * in progress, which is precisely the mixed state the redesign exists to make visible.
 *
 * Now: batch identity and summary, the level-by-level approval breakdown, and one row per request
 * carrying its own status, level, conversation and actions. Requests are decided INDEPENDENTLY —
 * approve one, reject another, question a third, leave the rest — which is what the engine has
 * supported since Phase 2 and what the UI could not express.
 */
export function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId, filterStatus }: BatchDetailModalProps) {
  const [batch, setBatch] = useState<any>(null);
  const [levels, setLevels] = useState<LevelProgressView[]>([]);
  const [summary, setSummary] = useState<BatchSummaryView | null>(null);
  const [batchQueries, setBatchQueries] = useState<QueryView[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Reject and ask-a-question both need a comment, so they share the modal; `action` says which.
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: 'individual' | 'batch-reject-all'; action?: 'reject' | 'request-info' } | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingBill, setDownloadingBill] = useState(false);
  // The conversation, opened from a request row. One request may carry several threads, so the
  // dialog takes the request and focuses the thread that was clicked.
  const [conversation, setConversation] = useState<
    { reimbursementId: string; batchId?: undefined; queryId: string; label: string }
    | { batchId: string; reimbursementId?: undefined; queryId?: string; label: string }
    | null>(null);
  const [versionsFor, setVersionsFor] = useState<{ id: string; label: string } | null>(null);

  // The server refuses these actions unless the caller is the current approver for that SPECIFIC
  // request. This only decides whether to offer the affordance.
  const canApprove = usePermission('approvals.approve.team');
  const viewerEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await fetchReimbursementBatchById(batchId);
      const body = res?.data ?? res;
      setBatch(body?.batch ?? null);
      setLevels(body?.levels ?? []);
      setSummary(body?.summary ?? null);
      setBatchQueries(body?.batchQueries ?? []);
    } catch {
      setBatch(null);
      setLevels([]);
      setSummary(null);
      setBatchQueries([]);
    } finally { setLoading(false); }
  }, [batchId]);

  useEffect(() => { loadBatch(); }, [loadBatch]);
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadBatch(); });

  /**
   * Every request in the batch — including the rejected ones.
   *
   * The old view filtered rejected lines out while the batch was pending, so an employee looking
   * at their own submission could not see what had been refused or why. `filterStatus` still
   * narrows to one outcome when the queue opens the modal from an approved- or rejected-group row.
   */
  const visibleRequests = useMemo<RequestRowData[]>(() => {
    const all: RequestRowData[] = batch?.reimbursements ?? [];
    if (filterStatus === 1 || filterStatus === 2) {
      return all.filter((r) => resolveStatusNum(r.status) === filterStatus);
    }
    return all;
  }, [batch?.reimbursements, filterStatus]);

  const detailTotal = useMemo(
    () => visibleRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [visibleRequests],
  );

  /**
   * The requests this viewer can act on right now.
   *
   * Approval is per-request since Phase 2, so "status is pending" is not enough — a request that
   * has cleared level 1 is not the level-1 approver's to decide again. A request with an open
   * question is not actionable either: it is waiting on the employee.
   */
  const actionableIds = useMemo(() => {
    const ids = new Set<string>();
    // Your own submission is never yours to decide. The server refuses it outright
    // (SELF_APPROVAL_REJECTED), so offering Approve / Reject / Ask here only produces an error the
    // reader did nothing to earn — and this modal is opened from the employee's own screen too.
    if (viewerEmployeeId && batch?.employeeId === viewerEmployeeId) return ids;
    for (const r of visibleRequests) {
      if (resolveStatusNum(r.status) !== STATUS.PENDING) continue;
      if (r.approval && r.approval.status !== 'pending') continue;
      ids.add(r.id);
    }
    return ids;
  }, [visibleRequests, batch?.employeeId, viewerEmployeeId]);

  const handleViewDocument = useCallback((url: string) => { if (url) setPreviewUrl(url); }, []);

  const handleIndividualAction = useCallback(async (requestId: string, action: 'approve' | 'reject' | 'request-info', comments?: string, category?: string) => {
    if (!batchId) return;
    setProcessingId(requestId);
    try {
      const res = await processBatchRequestAction(batchId, requestId, action, comments, category);
      // The server says WHICH level was cleared — "Approved at level 1 of 3". An approval that is
      // not the last one has approved nothing yet, and saying otherwise sets up a wait for money
      // that is not coming.
      const message = res?.message
        ?? (action === 'approve' ? 'Request approved'
          : action === 'reject' ? 'Request rejected'
            : 'Question sent. The expense stays open until the employee replies.');
      successConfirmation(message, action === 'request-info' ? 'Question sent' : undefined);
      loadBatch();
      onBatchActionDone();
    } catch (err: any) {
      errorConfirmation(
        err?.response?.data?.message
        || (action === 'request-info' ? 'Could not send the question' : `Failed to ${action}`),
      );
    } finally {
      setProcessingId(null);
    }
  }, [batchId, loadBatch, onBatchActionDone]);

  /**
   * "Approve all" means "approve everything in front of ME right now" — not "approve the batch",
   * which stopped being a thing when approval became request-level. The instance route fans out
   * server-side and leaves requests at other levels, or with open questions, untouched.
   */
  const handleBulkAction = async (action: 'approve' | 'reject-all', reason?: string) => {
    if (!actionableIds.size || !batchId) return;
    setBulkProcessing(true);
    try {
      if (approvalInstanceId) {
        const res = await processApprovalAction(approvalInstanceId, action === 'approve' ? 'approve' : 'reject', reason);
        successConfirmation(res?.message ?? (action === 'approve' ? 'Requests approved' : 'Requests rejected'));
      } else {
        for (const id of actionableIds) {
          await processBatchRequestAction(batchId, id, action === 'approve' ? 'approve' : 'reject', reason);
        }
        successConfirmation(`${actionableIds.size} request${actionableIds.size === 1 ? '' : 's'} ${action === 'approve' ? 'approved' : 'rejected'}`);
      }
      loadBatch();
      onBatchActionDone();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Action failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleRejectConfirm = async (reason: string, category?: string) => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      if (rejectTarget.type === 'individual') {
        await handleIndividualAction(rejectTarget.id, rejectTarget.action ?? 'reject', reason, category);
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
      downloadBlob(blob, `Reimbursement_Bill_${batch.submissionId || batchId}.pdf`);
    } catch {
      errorConfirmation('Failed to download bill');
    } finally {
      setDownloadingBill(false);
    }
  };

  const hasApproved = visibleRequests.some((r) => resolveStatusNum(r.status) === STATUS.APPROVED);

  return (
    <>
      <GlassDialog
        open={!!batchId}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        header={
          <GlassHeader
            title={`Submission ${batch?.submissionId || ''}`}
            subtitle={batch ? `${batch.employeeName || ''} · submitted ${fmtDate(batch.submittedAt)}` : ''}
            icon={<KTIcon iconName="basket" className="fs-1" />}
            onClose={onClose}
          />
        }
      >
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, maxHeight: '80vh', overflowY: 'auto' }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress size={28} /></Stack>
          ) : !batch ? (
            <Typography sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              This submission could not be loaded.
            </Typography>
          ) : (
            <>
              {summary && (
                <BatchSummaryStrip
                  summary={filterStatus
                    ? { ...summary, totalRequests: visibleRequests.length, totalAmount: detailTotal }
                    : summary}
                  processingStatus={batch.processingStatus ?? 'PENDING'}
                />
              )}

              {levels.length > 0 && <ApprovalProgressPanel levels={levels} />}

              {/* Batch-scope questions, shown apart from the requests because they are about the
                  submission as a whole and — deliberately — block none of them. */}
              {batchQueries.length > 0 && (
                <Box sx={{ borderRadius: '10px', p: 1.5, bgcolor: tonePair('cyan').soft, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Batch queries
                  </Typography>
                  {batchQueries.map((q) => (
                    <Stack key={q.id} direction="row" alignItems="baseline" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, flex: 1, minWidth: 0 }}>
                        {q.lastMessage} <b>({q.status.toLowerCase()})</b>
                      </Typography>
                      <Typography
                        component="button"
                        onClick={() => setConversation({ batchId: batchId!, queryId: q.id, label: `Submission ${batch.submissionId}` })}
                        sx={{
                          fontSize: 11.5, fontWeight: 700, color: 'primary.main',
                          background: 'none', border: 'none', p: 0, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        Open conversation ({q.messageCount})
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              )}

              {actionableIds.size > 0 && canApprove && (
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"
                  sx={{ p: 1.25, borderRadius: '10px', bgcolor: 'action.hover' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    {actionableIds.size} awaiting your decision
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <WtButton size="small" disabled={bulkProcessing} onClick={() => handleBulkAction('approve')}>
                    Approve all ({actionableIds.size})
                  </WtButton>
                  <WtButton size="small" ghost disabled={bulkProcessing}
                    onClick={() => setRejectTarget({ id: 'batch', type: 'batch-reject-all', action: 'reject' })}>
                    Reject all
                  </WtButton>
                </Stack>
              )}

              {hasApproved && (
                <Box>
                  <WtButton size="small" inverted disabled={downloadingBill} onClick={handleDownloadBill}>
                    {downloadingBill ? 'Generating…' : 'Download slip'}
                  </WtButton>
                </Box>
              )}

              <Stack gap={1.25}>
                {visibleRequests.map((request) => (
                  <RequestWorkflowRow
                    key={request.id}
                    request={request}
                    canDecide={canApprove && actionableIds.has(request.id)}
                    busy={processingId === request.id}
                    onApprove={() => handleIndividualAction(request.id, 'approve')}
                    onReject={() => setRejectTarget({ id: request.id, type: 'individual', action: 'reject' })}
                    onQuery={() => setRejectTarget({ id: request.id, type: 'individual', action: 'request-info' })}
                    onOpenConversation={(queryId) => setConversation({
                      reimbursementId: request.id,
                      queryId,
                      label: request.description || 'Expense',
                    })}
                    onOpenVersionHistory={() => setVersionsFor({
                      id: request.id,
                      label: request.description || 'Expense',
                    })}
                    onViewDocument={handleViewDocument}
                  />
                ))}
                {visibleRequests.length === 0 && (
                  <Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                    No requests to show.
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </Box>
      </GlassDialog>

      <RejectReasonModal
        show={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
        variant={rejectTarget?.action === 'request-info' ? 'request-info' : 'reject'}
        title={rejectTarget?.type === 'batch-reject-all' ? 'Reject the requests awaiting you' : undefined}
      />

      {conversation && (
        <QueryConversationDialog
          reimbursementId={conversation.reimbursementId}
          batchId={conversation.batchId}
          focusQueryId={conversation.queryId}
          requestLabel={conversation.label}
          onClose={() => setConversation(null)}
          onChanged={() => { loadBatch(); onBatchActionDone(); }}
        />
      )}

      {versionsFor && (
        <VersionHistoryDialog
          reimbursementId={versionsFor.id}
          requestLabel={versionsFor.label}
          onClose={() => setVersionsFor(null)}
        />
      )}

      {previewUrl && <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  );
}
