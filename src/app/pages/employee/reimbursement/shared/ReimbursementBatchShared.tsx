import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchQueryTopics, resolveQuery, OTHER_TOPIC, type QueryTopic } from '@services/reimbursementQueries';
import { GlassDialog, GlassHeader, WtButton, tonePair } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import QueryConversationDialog from '../components/QueryConversation';
import VersionHistoryDialog from '../components/VersionHistoryDialog';
import {
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
  /** Narrows the topic list — a batch question is not about one expense's receipt. */
  scope?: 'REQUEST' | 'BATCH';
}

const REASON_COPY = {
  reject: {
    title: 'Reject Request',
    label: 'Reason for Rejection',
    placeholder: 'Describe why this request is being rejected…',
    hint: 'The employee sees this.',
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
  // Filing the outcome under a topic is what makes "3 missing receipts this month" answerable
  // later — for a rejection as much as for a question.
  //
  // The list is the admin-managed master (Reimbursement Configuration → Question Topics), with
  // "Something else" appended: it is never a master row, so it cannot be renamed or deleted away.
  const [category, setCategory] = useState(OTHER_TOPIC);
  const [topics, setTopics] = useState<QueryTopic[]>([]);
  const copy = REASON_COPY[variant];
  const trimmed = reason.trim();

  const isQuestion = variant === 'request-info';
  // Only "Something else" needs prose — every other topic already states what this is about, and
  // it is what gets sent as the text when the box is left empty.
  const needsText = category === OTHER_TOPIC;
  const text = trimmed || category;

  useEffect(() => {
    if (!show) { setReason(''); setCategory(OTHER_TOPIC); return; }
    // A failed load leaves the picker with "Something else" alone, which still sends.
    fetchQueryTopics()
      .then((all) => setTopics(all.filter((t) => t.scope === 'BOTH' || t.scope === scope)))
      .catch(() => setTopics([]));
  }, [show, scope]);

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
        <TextField
          select fullWidth size="small" label="What is this about?"
          value={category} onChange={(e) => setCategory(e.target.value)}
          disabled={submitting}
        >
          {topics.map((t) => (
            <MenuItem key={t.id} value={t.label}>{t.label}</MenuItem>
          ))}
          <MenuItem value={OTHER_TOPIC}>{OTHER_TOPIC}</MenuItem>
        </TextField>

        <TextField
          multiline minRows={3} fullWidth size="small" autoFocus
          label={needsText ? copy.label : `${copy.label} (optional)`}
          placeholder={copy.placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          helperText={needsText ? copy.hint : `Optional — “${category}” is what the employee sees. ${copy.hint}`}
        />

        <Stack direction="row" gap={1} justifyContent="flex-end">
          <WtButton ghost onClick={onClose} disabled={submitting}>Cancel</WtButton>
          <WtButton
            tone={variant === 'reject' ? 'danger' : 'primary'}
            disabled={submitting || (needsText && !trimmed)}
            // Empty box + a real topic → the topic IS the text. Every caller downstream (batch
            // reject, reject-all, the approvals queue) still receives non-empty prose, so none of
            // them needed a second code path for "optional".
            onClick={() => onConfirm(text, isQuestion ? category : undefined)}
          >
            {submitting ? 'Sending…' : copy.confirm}
          </WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}

// ── Status summary bar ────────────────────────────────────────────────────────

/** One person, what they owe, and what it is worth. */
interface WaitOwner {
  /** What is being waited for, in the same words the request rows use. */
  reason: string;
  who: string;
  /** Where in the chain that person sits, when the reader needs it to place them. */
  detail: string | null;
  tone: SemanticTone;
  count: number;
  amount: number;
}

interface StatusSummaryBarProps {
  summary: BatchSummaryView;
  /** Every outstanding wait, one row each — see `waits` in BatchDetailModal. */
  waits: WaitOwner[];
  actionableCount: number;
  /** What that decision is worth — the slice of the batch total that is actually yours. */
  actionableAmount: number;
}

/**
 * At-a-glance status breakdown with everyone the batch is actually waiting on.
 *
 * Shows: count breakdown (queries · pending · approved · rejected), a row per outstanding wait
 * naming who owes it, and what is yours to decide.
 *
 * This used to name ONE person, found by scanning the batch's levels for the first with anything
 * pending. Two bugs in one line: on a part-decided batch that finds the level the reader sits at,
 * so the "waiting on others" view printed the reader's own name — and a batch waiting on the
 * employee for a query and the next approver for an approval could only ever name one of them.
 */
function StatusSummaryBar({ summary, waits, actionableCount, actionableAmount }: StatusSummaryBarProps) {
  // Every bucket carries its own money. A batch header reading "5 requests · ₹5.00" says nothing
  // about which part of that total is still yours to decide, which is the number an approver is
  // actually looking for.
  const awaitingLevel = Math.max(0, summary.pending - summary.inProgress);
  const awaitingAmount = Math.max(0, summary.pendingAmount - summary.inProgressAmount);
  const counts: Array<{ label: string; tone: SemanticTone }> = [
    ...(summary.queried > 0 ? [{ label: `${summary.queried} query · ${fmtAmount(summary.queriedAmount)}`, tone: 'cyan' as SemanticTone }] : []),
    ...(awaitingLevel > 0 ? [{ label: `${awaitingLevel} pending · ${fmtAmount(awaitingAmount)}`, tone: 'warning' as SemanticTone }] : []),
    ...(summary.inProgress > 0 ? [{ label: `${summary.inProgress} with next approver · ${fmtAmount(summary.inProgressAmount)}`, tone: 'neutral' as SemanticTone }] : []),
    ...(summary.approved > 0 ? [{ label: `${summary.approved} approved · ${fmtAmount(summary.approvedAmount)}`, tone: 'success' as SemanticTone }] : []),
    ...(summary.rejected > 0 ? [{ label: `${summary.rejected} rejected · ${fmtAmount(summary.rejectedAmount)}`, tone: 'danger' as SemanticTone }] : []),
  ];

  return (
    <Box sx={{
      borderRadius: '10px',
      p: 1.5,
      bgcolor: 'action.hover',
      border: `1px solid`,
      borderColor: 'divider',
    }}>
      <Stack gap={1} sx={{ minWidth: 0 }}>
        {/* First row: count breakdown. `pending` counts every undecided line, so a batch whose
            lines had cleared level 1 still read "5 pending" over five rows saying "L2 now" — the
            part already past a level is split out as its own count instead. */}
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ fontSize: 13, fontWeight: 600 }}>
          {counts.map((c, i) => (
            <Fragment key={c.label}>
              {/* '1px', not 1 — MUI sx reads a number ≤ 1 as a fraction, so `width: 1` was a
                  full-width bar that pushed every count onto a line of its own. */}
              {i > 0 && <Box sx={{ width: '1px', flex: 'none', height: 16, bgcolor: 'divider' }} />}
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 'fit-content' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tonePair(c.tone).fg }} />
                <span>{c.label}</span>
              </Stack>
            </Fragment>
          ))}
        </Stack>

        {/* Second row: one line per outstanding wait, then what is yours to decide. Each row reads
            left to right as the sentence it is — what is waited for, how much of it, who owes it. */}
        {(waits.length > 0 || actionableCount > 0) && (
          <Stack direction="row" alignItems="flex-start" gap={1.5} flexWrap="wrap" sx={{ fontSize: 13 }}>
            {waits.length > 0 && (
              <Stack gap={0.75} sx={{ minWidth: 0 }}>
                {waits.map((w) => (
                  <Stack key={`${w.reason}·${w.who}·${w.detail ?? ''}`} direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                    <Box sx={{
                      px: 0.75,
                      borderRadius: '5px',
                      flex: 'none',
                      fontSize: 10,
                      fontWeight: 800,
                      lineHeight: 1.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      bgcolor: tonePair(w.tone).soft,
                      color: tonePair(w.tone).fg,
                    }}>
                      {w.reason}
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                      {w.count} · {fmtAmount(w.amount)}
                    </Typography>
                    <Box sx={{ color: 'text.disabled', flex: 'none', fontSize: 12 }}>→</Box>
                    <Typography sx={{
                      fontSize: 12, fontWeight: 700, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {w.who}
                    </Typography>
                    {w.detail && (
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', flex: 'none' }}>
                        {w.detail}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}

            {actionableCount > 0 && (
              <>
                <Box sx={{ flex: 1 }} />
                <Box sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: '6px',
                  bgcolor: tonePair('warning').soft,
                  color: tonePair('warning').fg,
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}>
                  {actionableCount} awaiting your decision · {fmtAmount(actionableAmount)}
                </Box>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

/**
 * Is this expense line this viewer's to decide, right now?
 *
 * Approval is per-request since Phase 2, so "status is pending" is not enough: a line that has
 * cleared level 1 is not the level-1 approver's to decide again, and a queried or decided line is
 * nobody's. One predicate, used by both the list and the buttons — two copies of this rule is how
 * a row gets an Approve button the server then refuses.
 */
const canDecideRequest = (r: RequestRowData, viewerEmployeeId?: string): boolean => {
  if (resolveStatusNum(r.status) !== STATUS.PENDING) return false;
  const approval = r.approval;
  if (!approval) return true;
  if (approval.status !== 'pending') return false;
  const activeStep = approval.steps?.find((s: any) => s.level === approval.currentLevel);
  return !!activeStep && activeStep.approverId === viewerEmployeeId;
};

// ── Batch detail ───────────────────────────────────────────────────────────────

interface BatchDetailModalProps {
  batchId: string | null;
  onClose: () => void;
  onBatchActionDone: () => void;
  approvalInstanceId?: string | null;
  /** When 1 or 2, restricts the list to that final status — used when the modal is opened from an
   *  approved- or rejected-group row in the approvals queue. */
  filterStatus?: number | null;
  /**
   * Which half of a part-decided batch to list, when opened from an inbox card:
   * `mine` drops the expenses this viewer has already approved (they are the other tab's card),
   * `in-flight` shows only those. Omitted everywhere else — the batch is listed whole.
   */
  slice?: 'mine' | 'in-flight';
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
export function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId, filterStatus, slice }: BatchDetailModalProps) {
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
   * The requests this modal is ABOUT: what its header counts and its buttons act on.
   *
   * Opened from a queue card, that is the card's own slice — `mine` is what is still in front of
   * this viewer, `in-flight` what has moved on to the next approver or back to the employee.
   * Opened anywhere else (the employee's own screen, the Resolved tab) it is the whole batch.
   * `filterStatus` still narrows to one outcome for the approved- and rejected-group rows.
   */
  const countedRequests = useMemo<RequestRowData[]>(() => {
    const all: RequestRowData[] = batch?.reimbursements ?? [];
    if (filterStatus === 1 || filterStatus === 2) {
      return all.filter((r) => resolveStatusNum(r.status) === filterStatus);
    }
    if (!slice || !viewerEmployeeId || batch?.employeeId === viewerEmployeeId) return all;
    const mine = all.filter((r) => canDecideRequest(r, viewerEmployeeId));
    if (slice === 'mine') return mine;
    return all.filter((r) => {
      const status = resolveStatusNum(r.status);
      if (status === STATUS.NEEDS_INFO) return true;             // with the employee
      return status === STATUS.PENDING && !mine.includes(r);     // with the next approver
    });
  }, [batch?.reimbursements, batch?.employeeId, filterStatus, slice, viewerEmployeeId]);

  /**
   * What the modal LISTS: the slice, plus every decided line for the record.
   *
   * A rejected expense is nobody's action and no longer part of the money in flight, but hiding it
   * outright leaves an approver wondering what happened to the line they refused. It renders after
   * the live rows, and is counted in nothing above.
   *
   * Only on the in-flight card. The "awaiting your decision" card is a work list — a line already
   * decided is off it, and listing it there made a rejection read as part of what is still pending.
   */
  const visibleRequests = useMemo<RequestRowData[]>(() => {
    if (slice !== 'in-flight') return countedRequests;
    const all: RequestRowData[] = batch?.reimbursements ?? [];
    const decided = all.filter((r) => {
      const status = resolveStatusNum(r.status);
      return (status === STATUS.APPROVED || status === STATUS.REJECTED) && !countedRequests.includes(r);
    });
    return [...countedRequests, ...decided];
  }, [countedRequests, batch?.reimbursements, slice]);

  const detailTotal = useMemo(
    () => countedRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [countedRequests],
  );

  /**
   * The headline counts, recomputed from the rows actually listed below.
   *
   * The server's summary describes the whole batch; a sliced list does not, and a header claiming
   * five expenses over a list of two is the bug this closes.
   */
  const shownSummary = useMemo<BatchSummaryView | null>(() => {
    if (!summary) return null;
    if (!slice && !filterStatus) return summary;

    const amt = (rows: RequestRowData[]) => rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const withStatus = (s: number) => countedRequests.filter((r) => resolveStatusNum(r.status) === s);
    // Decided lines are read off the WHOLE batch, not the slice: they are listed below for the
    // record, so the header names them — in their own colour, outside every live total. Matches
    // `visibleRequests`: only the in-flight card carries them, so the counts follow the rows.
    const decidedWith = (s: number) =>
      slice === 'in-flight'
        ? ((batch?.reimbursements ?? []) as RequestRowData[]).filter((r) => resolveStatusNum(r.status) === s)
        : withStatus(s);
    const pendingRows = withStatus(STATUS.PENDING);
    // Inside the in-flight slice every undecided row is, by construction, with the next approver.
    const inFlightRows = slice === 'in-flight' ? pendingRows : [];
    const mineRows = slice === 'in-flight' ? [] : pendingRows;

    return {
      ...summary,
      totalRequests: countedRequests.length,
      totalAmount: detailTotal,
      pending: mineRows.length,
      pendingAmount: amt(mineRows),
      inProgress: inFlightRows.length,
      inProgressAmount: amt(inFlightRows),
      queried: withStatus(STATUS.NEEDS_INFO).length,
      queriedAmount: amt(withStatus(STATUS.NEEDS_INFO)),
      approved: (slice ? decidedWith(STATUS.APPROVED) : withStatus(STATUS.APPROVED)).length,
      approvedAmount: amt(slice ? decidedWith(STATUS.APPROVED) : withStatus(STATUS.APPROVED)),
      rejected: (slice ? decidedWith(STATUS.REJECTED) : withStatus(STATUS.REJECTED)).length,
      rejectedAmount: amt(slice ? decidedWith(STATUS.REJECTED) : withStatus(STATUS.REJECTED)),
    };
  }, [summary, filterStatus, slice, countedRequests, detailTotal, batch?.reimbursements]);

  /**
   * Who owes the next move — one row per person, per reason, over the rows this modal lists.
   *
   * Read off the rows rather than the batch's level ladder, so it can only ever name a wait the
   * list below actually contains. A query and an approval are two different waits owned by two
   * different people, and both get named.
   */
  const waits = useMemo<WaitOwner[]>(() => {
    const groups = new Map<string, WaitOwner>();
    for (const r of countedRequests) {
      const status = resolveStatusNum(r.status);
      const approval = r.approval as any;
      let wait: Omit<WaitOwner, 'count' | 'amount'> | null = null;

      if (status === STATUS.NEEDS_INFO) {
        // A queried line stays QUERIED until the approver acts on the answer, so the line's own
        // status cannot say whose turn it is — the THREAD can. Once every live thread is ANSWERED
        // the ball is back with the approver, and naming the employee there told the reader the
        // exact opposite of what was true.
        const live = (r.queries ?? []).filter((q) => q.status !== 'RESOLVED');
        const withApprover = live.length > 0 && live.every((q) => q.awaitingRole === 'APPROVER');
        const step = approval?.steps?.find((s: any) => s.level === approval?.currentLevel);
        wait = withApprover
          ? {
            reason: 'Reply',
            who: step?.approverId === viewerEmployeeId ? 'You' : (step?.approverName || 'the approver'),
            detail: approval?.currentLevel ? `Level ${approval.currentLevel}` : null,
            tone: 'cyan',
          }
          : { reason: 'Query', who: batch?.employeeName || 'the employee', detail: 'Employee', tone: 'cyan' };
      } else if (status === STATUS.PENDING) {
        const step = approval?.steps?.find((s: any) => s.level === approval?.currentLevel);
        // Your own rows are what the "awaiting your decision" badge beside this list counts —
        // naming yourself here would say the same thing twice in two different shapes.
        if (step?.approverId && step.approverId === viewerEmployeeId) continue;
        wait = {
          reason: 'Approval',
          who: step?.approverName || 'the next approver',
          detail: approval?.currentLevel ? `Level ${approval.currentLevel}` : null,
          tone: 'neutral',
        };
      }
      if (!wait) continue;   // approved and rejected lines are nobody's move

      const key = `${wait.reason}·${wait.who}·${wait.detail ?? ''}`;
      const group = groups.get(key) ?? { ...wait, count: 0, amount: 0 };
      group.count += 1;
      group.amount += Number(r.amount ?? 0);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [countedRequests, batch?.employeeName, viewerEmployeeId]);

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
      if (canDecideRequest(r, viewerEmployeeId)) ids.add(r.id);
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

  /**
   * Which side of a conversation this reader is on.
   *
   * The batch's own employee is the one answering questions; anyone else looking at it is an
   * approver. The thread records which ROLE owes the next message, so without this the row cannot
   * tell whether the person reading it is the one being asked.
   */
  const viewerRole: 'EMPLOYEE' | 'APPROVER' | null = !viewerEmployeeId ? null
    : batch?.employeeId === viewerEmployeeId ? 'EMPLOYEE' : 'APPROVER';

  /** Close the question outright, without opening the thread to type into it. */
  const handleResolveQuery = async (queryId: string) => {
    setProcessingId(queryId);
    try {
      await resolveQuery(queryId);
      successConfirmation('Query resolved');
      await loadBatch();
      onBatchActionDone();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Could not resolve the query');
    } finally {
      setProcessingId(null);
    }
  };

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
              {shownSummary && (
                <BatchSummaryStrip
                  summary={shownSummary}
                  processingStatus={batch.processingStatus ?? 'PENDING'}
                />
              )}

              {shownSummary && levels.length > 0 && (
                <StatusSummaryBar
                  summary={shownSummary}
                  waits={waits}
                  actionableCount={actionableIds.size}
                  actionableAmount={visibleRequests
                    .filter((r) => actionableIds.has(r.id))
                    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)}
                />
              )}


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
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
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
                    viewerRole={viewerRole}
                    onResolveQuery={viewerRole === 'APPROVER' ? handleResolveQuery : undefined}
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
