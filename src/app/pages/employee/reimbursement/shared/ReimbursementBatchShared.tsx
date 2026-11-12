import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { CircleQuestionMark, CircleX, Download, ReceiptText } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { toneStyle, type Tone } from '@/ds/lib/tone';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { Spinner } from '@/ds/ui/spinner';
import { Textarea } from '@/ds/ui/textarea';
import { EmptyState } from '@/ds/patterns/empty-state';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import {
  fetchReimbursementBatchById,
  processBatchRequestAction,
  processApprovalAction,
  downloadReimbursementBillPdf,
} from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { usePermission } from '@hooks/usePermission';
import { fetchQueryTopics, resolveQuery, OTHER_TOPIC, type QueryTopic } from '@services/reimbursementQueries';
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
import { fmtDate, fmtAmount, formatMoney, resolveStatusNum, STATUS, STATUS_LABEL, downloadBlob } from '../utils/reimbursementFormat';
export { fmtDate, fmtAmount };

export function statusBadge(status: number) {
  if (status === 1) return <Badge variant="success" dot>Approved</Badge>;
  if (status === 2) return <Badge variant="danger" dot>Rejected</Badge>;
  // NEEDS_INFO rendered as "Pending" here, so a line the approver had asked a question about
  // looked identical to one nobody had touched — and the employee had no reason to open it.
  if (status === STATUS.NEEDS_INFO) return <Badge variant="warning" dot>{STATUS_LABEL[STATUS.NEEDS_INFO]}</Badge>;
  return <Badge variant="warning" dot>Pending</Badge>;
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
    confirm: 'Confirm Rejection',
  },
  'request-info': {
    title: 'Ask a Question',
    label: 'What Do You Need to Know?',
    placeholder: 'e.g. Which client visit was this taxi for? Please attach the receipt.',
    hint: 'This opens a conversation with the employee. The expense stays where it is — it is not rejected, and approval does not restart.',
    confirm: 'Send Question',
  },
};

/**
 * Rejection reason / question composer — the kit FormDialog (small): a topic, the text, and one
 * Send / Confirm button (red for a rejection). Enter in the form submits it; the dialog stacks
 * above the batch dialog that raised it.
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
  const topicItems = [...topics.map((t) => ({ value: t.label, label: t.label })), { value: OTHER_TOPIC, label: OTHER_TOPIC }];
  const formId = 'reimbursement-reason-form';

  useEffect(() => {
    if (!show) { setReason(''); setCategory(OTHER_TOPIC); return; }
    // A failed load leaves the picker with "Something else" alone, which still sends.
    fetchQueryTopics()
      .then((all) => setTopics(all.filter((t) => t.scope === 'BOTH' || t.scope === scope)))
      .catch(() => setTopics([]));
  }, [show, scope]);

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="sm"
      title={title ?? copy.title}
      icon={variant === 'reject' ? <CircleX /> : <CircleQuestionMark />}
      tone={variant === 'reject' ? 'danger' : 'brand'}
      formId={formId}
      submitLabel={copy.confirm}
      submitVariant={variant === 'reject' ? 'destructive' : 'default'}
      submitting={submitting}
      submitDisabled={needsText && !trimmed}
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          if (submitting || (needsText && !trimmed)) return;
          // Empty box + a real topic → the topic IS the text. Every caller downstream (batch
          // reject, reject-all, the approvals queue) still receives non-empty prose, so none of
          // them needed a second code path for "optional".
          onConfirm(text, isQuestion ? category : undefined);
        }}
      >
        <FieldGroup className="gap-6 pt-2">
          <Field>
            <FieldLabel htmlFor="reason-topic">What Is This About?</FieldLabel>
            <Select items={topicItems} value={category} onValueChange={(v) => setCategory(String(v))} disabled={submitting}>
              <SelectTrigger id="reason-topic" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topicItems.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="reason-text">{needsText ? copy.label : `${copy.label} (Optional)`}</FieldLabel>
            <Textarea
              id="reason-text"
              autoFocus
              rows={4}
              placeholder={copy.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            />
            <FieldDescription>{needsText ? copy.hint : `Optional — “${category}” is what the employee sees. ${copy.hint}`}</FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </FormDialog>
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
  tone: Tone;
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
  const counts: Array<{ label: string; tone: Tone }> = [
    ...(summary.queried > 0 ? [{ label: `${summary.queried} query · ${formatMoney(summary.queriedAmount)}`, tone: 'cyan' as Tone }] : []),
    ...(awaitingLevel > 0 ? [{ label: `${awaitingLevel} pending · ${formatMoney(awaitingAmount)}`, tone: 'warning' as Tone }] : []),
    ...(summary.inProgress > 0 ? [{ label: `${summary.inProgress} with next approver · ${formatMoney(summary.inProgressAmount)}`, tone: 'neutral' as Tone }] : []),
    ...(summary.approved > 0 ? [{ label: `${summary.approved} approved · ${formatMoney(summary.approvedAmount)}`, tone: 'success' as Tone }] : []),
    ...(summary.rejected > 0 ? [{ label: `${summary.rejected} rejected · ${formatMoney(summary.rejectedAmount)}`, tone: 'danger' as Tone }] : []),
  ];

  return (
    <section aria-label="Batch status" className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-muted/50 p-3.5">
      {/* First row: count breakdown. `pending` counts every undecided line, so a batch whose
          lines had cleared level 1 still read "5 pending" over five rows saying "L2 now" — the
          part already past a level is split out as its own count instead. */}
      <ul className="m-0 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 text-sm font-semibold">
        {counts.map((c, i) => (
          <li key={c.label} style={toneStyle(c.tone)} className={cn('tabular flex items-center gap-1.5', i > 0 && 'border-l border-border pl-3')}>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--tone)" />
            {c.label}
          </li>
        ))}
      </ul>

      {/* Second row: one line per outstanding wait, then what is yours to decide. Each row reads
          left to right as the sentence it is — what is waited for, how much of it, who owes it. */}
      {(waits.length > 0 || actionableCount > 0) && (
        <div className="flex min-w-0 flex-wrap items-start gap-3 text-xs">
          {waits.length > 0 && (
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
              {waits.map((w) => (
                <li key={`${w.reason}·${w.who}·${w.detail ?? ''}`} className="flex min-w-0 items-center gap-2">
                  <Badge variant={w.tone} className="uppercase tracking-wide">{w.reason}</Badge>
                  <span className="tabular shrink-0 font-semibold">{w.count} · {formatMoney(w.amount)}</span>
                  <span aria-hidden className="shrink-0 text-muted-foreground">→</span>
                  <span className="min-w-0 truncate font-semibold">{w.who}</span>
                  {w.detail && <span className="shrink-0 text-muted-foreground">{w.detail}</span>}
                </li>
              ))}
            </ul>
          )}
          {actionableCount > 0 && (
            <Badge variant="warning" className="tabular ml-auto h-6 px-2.5 text-xs font-semibold">
              {actionableCount} awaiting your decision · {formatMoney(actionableAmount)}
            </Badge>
          )}
        </div>
      )}
    </section>
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
  if (typeof r.viewerCanDecide === 'boolean') return r.viewerCanDecide;
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
  approverOnly?: boolean;
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
export function BatchDetailModal({ batchId, onClose, onBatchActionDone, approvalInstanceId, filterStatus, slice, approverOnly = false }: BatchDetailModalProps) {
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
      const res = await fetchReimbursementBatchById(batchId, approverOnly);
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
  }, [batchId, approverOnly]);

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

  const actionableTotal = visibleRequests
    .filter((r) => actionableIds.has(r.id))
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  return (
    <>
      {/* The kit FormDialog, read-only (xl): icon + title header, a scrolling body, and a footer that
          carries the batch's actions — Download Slip on the left; Reject All / Approve All / Close
          on the right — so they stay in reach however long the list of requests is. */}
      <FormDialog
        open={!!batchId}
        onOpenChange={(open) => { if (!open) onClose(); }}
        size="xl"
        title={`Submission ${batch?.submissionId || ''}`.trim()}
        description={batch ? `${batch.employeeName || ''} · Submitted ${fmtDate(batch.submittedAt)}` : undefined}
        icon={<ReceiptText />}
        footer={(close) => (
          <div className="flex w-full flex-wrap items-center gap-2">
            {hasApproved && (
              <Button variant="outline" loading={downloadingBill} onClick={handleDownloadBill}>
                <Download data-icon="inline-start" aria-hidden /> Download Slip
              </Button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {actionableIds.size > 0 && canApprove && (
                <>
                  <Button
                    variant="outline"
                    disabled={bulkProcessing}
                    onClick={() => setRejectTarget({ id: 'batch', type: 'batch-reject-all', action: 'reject' })}
                  >
                    Reject All
                  </Button>
                  <Button variant="success" loading={bulkProcessing} onClick={() => handleBulkAction('approve')}>
                    Approve All ({actionableIds.size})
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={close}>Close</Button>
            </div>
          </div>
        )}
      >
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="size-7" /></div>
        ) : !batch ? (
          <EmptyState variant="error" size="sm" title="This Submission Could Not Be Loaded" description="Close and open it again, or refresh the page." />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {shownSummary && (
              <BatchSummaryStrip summary={shownSummary} processingStatus={batch.processingStatus ?? 'PENDING'} />
            )}

            {shownSummary && levels.length > 0 && (
              <StatusSummaryBar
                summary={shownSummary}
                waits={waits}
                actionableCount={actionableIds.size}
                actionableAmount={actionableTotal}
              />
            )}

            {/* Batch-scope questions, shown apart from the requests because they are about the
                submission as a whole and — deliberately — block none of them. */}
            {batchQueries.length > 0 && (
              <section aria-label="Batch queries" style={toneStyle('cyan')} className="min-w-0 space-y-2 rounded-2xl bg-[color-mix(in_oklab,var(--tone)_10%,transparent)] p-3.5">
                <h4 className="heading-case m-0 text-xs font-bold text-(--tone-ink)">Batch Queries</h4>
                {batchQueries.map((q) => (
                  <div key={q.id} className="flex flex-wrap items-center gap-2">
                    <p className="m-0 min-w-0 flex-1 text-sm">
                      {q.lastMessage} <b>({q.status.toLowerCase()})</b>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConversation({ batchId: batchId!, queryId: q.id, label: `Submission ${batch.submissionId}` })}
                    >
                      Open Conversation ({q.messageCount})
                    </Button>
                  </div>
                ))}
              </section>
            )}

            <div className="flex flex-col gap-3">
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
                <EmptyState size="sm" title="No Requests to Show" />
              )}
            </div>
          </div>
        )}
      </FormDialog>

      <RejectReasonModal
        show={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
        variant={rejectTarget?.action === 'request-info' ? 'request-info' : 'reject'}
        title={rejectTarget?.type === 'batch-reject-all' ? 'Reject the Requests Awaiting You' : undefined}
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
