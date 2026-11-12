import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { ReimbursementBatchDetail, ReimbursementLine } from '../utils/reimbursementTypes';
import { buildReimbursementLineColumns } from '../components/reimbursementLineColumns';
import { fmtDate, fmtAmount, resolveStatusNum } from '../utils/reimbursementFormat';
import { useSensitiveData } from '@app/modules/common/components/SensitiveData';
import { PAYMENT_LABEL, resolveStatusNum as resolveStatus, STATUS, STATUS_LABEL, STATUS_TONE, StatusNum } from '../utils/reimbursementFormat';
import SubmissionMobileCard from '../components/SubmissionMobileCard';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { getCurrencySymbol, currencyPrefix } from '@utils/currency';
import { useStoredState } from '@app/hooks/useStoredState';
import { Button } from '@/ds/ui/button';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { ConfirmDialog } from '@/ds/patterns/confirm-dialog';
import { Eye, FileDown, MessageSquareText, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import { Badge } from '@/ds/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { usePermittedRows } from '@app/modules/common/components/table/usePermittedRows';
import { DataTableExport } from '@app/modules/common/components/table/DataTableExport';

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

/** The batch's approval outcome in words — the table badge, the export and the tooltip agree. */
const approvalLabel = (s: number): string => STATUS_LABEL[s as StatusNum] ?? STATUS_LABEL[STATUS.PENDING];

/** One expense line's status in words (a line is never "mixed"). */
const lineStatusLabel = (n: number): string =>
  n === MIXED_STATUS ? STATUS_LABEL[STATUS.PENDING] : STATUS_LABEL[n as StatusNum] ?? STATUS_LABEL[STATUS.PENDING];

const paymentLabel = (ps?: string | null): string | null =>
  !ps ? null : ps === 'PAID' ? PAYMENT_LABEL.PAID : ps === 'PARTIAL' ? PAYMENT_LABEL.PARTIAL : PAYMENT_LABEL.UNPAID;

/** "Jun 2026", or "Jun 2026 - Aug 2026" when a batch's expenses span months. */
const expensePeriod = (r: any): string => {
  if (!r?._expenseFrom) return '';
  const a = dayjs(r._expenseFrom), b = dayjs(r._expenseTo ?? r._expenseFrom);
  return a.isSame(b, 'month') ? a.format('MMM YYYY') : `${a.format('MMM YYYY')} - ${b.format('MMM YYYY')}`;
};







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

  // Memoised: a bare `?? []` is a new array every render, which re-ran every memo below on each one.
  const reimbursements = useMemo<ReimbursementLine[]>(() => batch?.reimbursements ?? [], [batch]);

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

  const sensitive = useSensitiveData();

  const detailColumns = useMemo<ColumnDef<any, any>[]>(
    () => [
      ...buildReimbursementLineColumns(
        { resolveClientType, resolveClientCompany, resolveProject },
        { total: detailTotal, onPreview: handleViewDocument, sensitiveCls: sensitive.cls },
      ),
      {
        id: 'status',
        accessorFn: (r: any) => lineStatusLabel(resolveStatusNum(r.status)),
        meta: { label: 'Status' },
        header: 'Status',
        cell: ({ row }) => {
          // A questioned line said "Pending", so the one row the employee had to act on looked exactly like the
          // rows they had to wait on.
          const n = resolveStatusNum(row.original.status) as StatusNum;
          return <Badge variant={STATUS_TONE[n] ?? 'warning'} dot>{lineStatusLabel(n)}</Badge>;
        },
      },
      // Shown for a QUESTION as well as a rejection: both write the same column on the line, and keying on
      // rejection alone stored and notified an approver's question but rendered it nowhere the employee could read.
      ...(displayedReimbursements.some((r) => {
        const n = resolveStatusNum(r.status);
        return n === STATUS.REJECTED || n === STATUS.NEEDS_INFO;
      })
        ? [{
            id: 'note',
            accessorFn: (r: any) => r.rejectionReason || r.rejectReason || '',
            meta: { label: "Approver's note" },
            header: "Approver's Note",
            cell: ({ row }: any) => {
              const n = resolveStatusNum(row.original.status);
              const reason = row.original.rejectionReason || row.original.rejectReason;
              if (!reason || (n !== STATUS.REJECTED && n !== STATUS.NEEDS_INFO)) {
                return <span className="text-muted-foreground">—</span>;
              }
              const asking = n === STATUS.NEEDS_INFO;
              const queries = row.original.queries;
              const awaiting = Array.isArray(queries) && queries.length > 0
                ? queries.some((q: any) => q.status !== 'RESOLVED' && q.awaitingRole === 'EMPLOYEE')
                : true;
              const open = () => setConversationFor({ id: row.original.id, label: row.original.description || 'Expense' });
              return (
                <div className="max-w-64 space-y-1 py-0.5 leading-snug whitespace-normal">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    <Badge variant={asking ? (awaiting ? 'warning' : 'neutral') : 'danger'} className="self-center">
                      {asking ? (awaiting ? 'Question' : 'Responded') : 'Rejected'}
                    </Badge>
                    <span className="text-sm break-words text-foreground">{reason}</span>
                  </div>
                  {asking && (
                    <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={open}>
                      {awaiting
                        ? <><MessageSquareText data-icon="inline-start" aria-hidden className="text-warning-foreground" /> Respond</>
                        : <><Eye data-icon="inline-start" aria-hidden /> View conversation</>}
                    </Button>
                  )}
                </div>
              );
            },
          } as ColumnDef<any, any>]
        : []),
      ...(filterStatus === STATUS.APPROVED
        ? [{
            id: 'paymentStatus',
            accessorFn: (r: any) => (resolveStatusNum(r.status) === STATUS.APPROVED ? paymentLabel(r.paymentStatus) ?? 'Pending' : 'N/A'),
            meta: { label: 'Payment status' },
            header: 'Payment Status',
            cell: ({ row }: any) => {
              if (resolveStatusNum(row.original.status) !== STATUS.APPROVED) return <span className="text-muted-foreground">N/A</span>;
              const ps = row.original.paymentStatus;
              return <Badge variant={ps === 'PAID' ? 'success' : ps === 'PARTIAL' ? 'info' : 'warning'} dot>{paymentLabel(ps) ?? 'Pending'}</Badge>;
            },
          } as ColumnDef<any, any>]
        : []),
      ...(showEditDeleteOption
        ? [{
            id: 'actions',
            enableSorting: false,
            enableHiding: false,
            meta: { pin: 'end' },
            header: 'Actions',
            cell: ({ row }: any) => {
              const r = row.original;
              const n = resolveStatusNum(r.status);
              const isPending = n === STATUS.PENDING;
              // A questioned line is EDITABLE — that is how the employee answers, and the server allows it
              // (a rejected one it refuses).
              const needsAnswer = n === STATUS.NEEDS_INFO;
              const canAmend = isPending || needsAnswer;
              if (!canAmend) {
                return (
                  <Tooltip>
                    <TooltipTrigger render={<span tabIndex={0} className="text-xs text-muted-foreground outline-none focus-visible:underline" />}>
                      No action available
                    </TooltipTrigger>
                    <TooltipContent>This expense has already been processed and cannot be modified.</TooltipContent>
                  </Tooltip>
                );
              }
              const canEdit = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOwn, r);
              // Delete stays on untouched lines only: deleting the line an approver asked about leaves them no answer.
              const canDelete = isPending && hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, r);
              if (!canEdit && !canDelete) return <span className="text-muted-foreground">N/A</span>;
              return (
                // The kit's tinted icon actions (Button story "Tinted"), 8px apart like the drafts inbox.
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Button
                      variant="tinted"
                      size="icon-sm"
                      aria-label={needsAnswer ? 'Answer the approver' : 'Edit'}
                      title={needsAnswer ? "Answer your approver's question — saving sends it back for approval" : 'Edit'}
                      onClick={() => {
                        const cleaned = Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)) as IReimbursementsUpdate;
                        if (isPartiallyApproved) {
                          setPendingEditRow(cleaned);
                          setShowPartialApprovalWarning(true);
                        } else {
                          setEditRow(cleaned);
                        }
                      }}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="tinted" size="icon-sm" className="[--tint:var(--cta-danger)]" aria-label="Delete" title="Delete" loading={deletingId === r.id} onClick={() => handleDelete(r.id)}>
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </div>
              );
            },
          } as ColumnDef<any, any>]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDelete only reads loadBatch/onRefresh (stable)
    [resolveClientType, resolveClientCompany, resolveProject, showEditDeleteOption, handleViewDocument, deletingId,
      detailTotal, isPartiallyApproved, filterStatus, displayedReimbursements, sensitive.cls],
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

  const summary = batch ? [
    `${displayedReimbursements.length} request${displayedReimbursements.length !== 1 ? 's' : ''}`,
    sensitive.visible ? `${currencyPrefix()}${fmtAmount(detailTotal)} total` : null,
    `Submitted ${fmtDate(batch.submittedAt)}`,
    batch.approvedAt ? `Decided ${fmtDate(batch.approvedAt)}` : null,
    hiddenLineCount > 0 ? `${hiddenLineCount} more expense${hiddenLineCount !== 1 ? 's' : ''} in this batch from other months` : null,
  ].filter(Boolean).join(' · ') : undefined;

  return (
    <>
      <FormDialog
        open={!!batchId}
        onOpenChange={(next) => { if (!next) onClose(); }}
        title={`Submission Details${batch?.submissionId ? ` — ${batch.submissionId}` : ''}`}
        description={summary}
        icon={<ReceiptText />}
        size="xl"
      >
        {approvalInstanceId && (
          <section aria-label="Approval progress" className="mb-5 rounded-2xl bg-muted/50 p-4">
            <h3 className="heading-case m-0 mb-3 text-xs font-bold text-muted-foreground">Approval Progress</h3>
            <ApprovalStatusTracker
              instanceId={approvalInstanceId}
              compact
              overrideStatus={filterStatus === STATUS.REJECTED ? 'rejected' : filterStatus === STATUS.APPROVED ? 'approved' : undefined}
            />
          </section>
        )}
        <DataTable<any>
          caption={`Expenses in submission ${batch?.submissionId ?? ''}`.trim()}
          columns={detailColumns}
          data={displayedReimbursements}
          getRowId={(r) => String(r.id)}
          loading={loading}
          searchPlaceholder="Search expenses"
          stateKey="reimbursement.batch-lines"
          selectable
          selectionActions={(_rows, _clear, ctx) => <DataTableExport columns={detailColumns} ctx={ctx} filename={`Submission ${batch?.submissionId ?? ''}`.trim()} />}
          initialSorting={[{ id: 'expenseDate', desc: false }]}
          // Over its cap → danger (the OverLimitChip names it); otherwise the shared status tone. Needs info
          // carries no tint, as before: its badge already says who must act.
          rowTone={(r) => {
            if (r.isExceedingLimit) return 'danger';
            const n = resolveStatusNum(r.status) as StatusNum;
            return n === STATUS.NEEDS_INFO ? undefined : STATUS_TONE[n];
          }}
          toolbar={(ctx) => (
            <>
              {batch?.id && displayedReimbursements.length > 0 && (
                <Button variant="outline" loading={downloadingBill} disabled={loading} onClick={handleDownloadBill} title="Download the batch slip (all its reimbursements)">
                  {!downloadingBill && <FileDown data-icon="inline-start" aria-hidden />}
                  {downloadingBill ? 'Generating…' : 'Download Slip'}
                </Button>
              )}
              <DataTableExport columns={detailColumns} ctx={ctx} filename={`Submission ${batch?.submissionId ?? ''}`.trim()} />
            </>
          )}
        />
      </FormDialog>

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

      {/* Editing a batch an approver already passed resets the whole chain — say so before it happens. */}
      <ConfirmDialog
        open={showPartialApprovalWarning}
        onOpenChange={(next) => {
          if (!next) {
            setShowPartialApprovalWarning(false);
            setPendingEditRow(null);
          }
        }}
        variant="warning"
        title="Editing will reset approval"
        description="This batch has already been approved at one or more levels. Saving changes resets the whole approval and resubmits it from Level 1, so every approver reviews the new details."
        confirmLabel="Edit and reset approval"
        onConfirm={() => {
          setEditRow(pendingEditRow);
          setPendingEditRow(null);
          setShowPartialApprovalWarning(false);
        }}
      />
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
  const [statusFilter, setStatusFilter] = useStoredState<StatusNum | null>('filters:SubmissionsTable:statusFilter', null);

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

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: '_submissionId',
        meta: { label: 'Batch ID' },
        header: ({ column }) => <SortableHeader column={column} title="Batch ID" />,
        cell: ({ row }) => (
          row.original._ungrouped ? (
            <span className="text-xs text-muted-foreground italic">Unbatched</span>
          ) : (
            <Badge variant="brand" className="font-mono tracking-wide">{row.original._submissionId}</Badge>
          )
        ),
        footer: () => <span className="uppercase">Total</span>,
      },
      {
        accessorKey: '_submittedAt',
        meta: { label: 'Submitted on', exportValue: (r: any) => fmtDate(r._submittedAt) },
        header: ({ column }) => <SortableHeader column={column} title="Submitted On" />,
        cell: ({ row }) => fmtDate(row.original._submittedAt),
      },
      {
        accessorKey: '_totalRequests',
        meta: { label: 'Expenses' },
        header: ({ column }) => <SortableHeader column={column} title="Expenses" />,
        cell: ({ row }) => <span className="tabular">{row.original._totalRequests}</span>,
      },
      // Only in the submission view: the months this batch's expenses fall in. It is the
      // bridge between the two tables — this is why a batch submitted in August can show
      // up under June in the records table.
      ...(mode === 'submission' ? [{
        accessorKey: '_expenseFrom',
        meta: { label: 'Expense period', exportValue: (r: any) => expensePeriod(r) },
        header: 'Expense Period',
        cell: ({ row }: any) => expensePeriod(row.original) || <span className="text-muted-foreground">—</span>,
      } as ColumnDef<any, any>] : []),
      {
        accessorKey: '_totalAmount',
        meta: { label: `Amount (${getCurrencySymbol()})`, exportValue: (r: any) => fmtAmount(r._totalAmount) },
        header: ({ column }) => <SortableHeader column={column} title={`Amount (${getCurrencySymbol()})`} />,
        cell: ({ row }) => (
          <span className={`tabular ${sensitiveCls}`}>{currencyPrefix()}{fmtAmount(row.original._totalAmount)}</span>
        ),
        footer: () => <span className={`tabular ${sensitiveCls}`}>{currencyPrefix()}{fmtAmount(rowsTotal)}</span>,
      },
      {
        accessorKey: '_status',
        meta: { label: 'Approval status', exportValue: (r: any) => approvalLabel(r._status) },
        header: 'Approval Status',
        cell: ({ row }) => {
          const s = row.original._status as number;
          const badge = <Badge variant={STATUS_TONE[resolveStatus(s) as StatusNum] ?? 'warning'} dot>{approvalLabel(s)}</Badge>;
          // Every line questioned: the batch waits on the EMPLOYEE, not the approver — saying only "Pending"
          // sent them looking for someone else to chase. Mixed: some lines are already payable.
          const hint = s === STATUS.NEEDS_INFO
            ? 'Your approver asked a question — open the batch to read it and answer by editing the expense'
            : s === MIXED_STATUS
              ? 'This batch has mixed outcomes — some expenses may still be pending, approved, rejected, or awaiting your reply. Open it to see which. Approved lines are already payable on the Payment desk.'
              : null;
          if (!hint) return badge;
          return (
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />}>
                {badge}
              </TooltipTrigger>
              <TooltipContent className="max-w-72">{hint}</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: '_approvedAt',
        meta: { label: 'Approved on', exportValue: (r: any) => (r._status === 0 ? 'Awaiting' : r._approvedAt ? fmtDate(r._approvedAt) : '') },
        header: ({ column }) => <SortableHeader column={column} title="Approved On" />,
        cell: ({ row }) => {
          if (row.original._status === 0) return <span className="text-muted-foreground">Awaiting</span>;
          if (!row.original._approvedAt) return <span className="text-muted-foreground">—</span>;
          return fmtDate(row.original._approvedAt);
        },
      },
      {
        accessorKey: '_paymentStatus',
        meta: { label: 'Payment status', exportValue: (r: any) => paymentLabel(r._paymentStatus) ?? 'N/A' },
        header: 'Payment Status',
        cell: ({ row }) => {
          // Driven by whether anything in the row is approved, not by the row's own
          // status — a partly-approved batch still has approved lines to pay.
          const ps = row.original._paymentStatus;
          if (!ps) return <span className="text-muted-foreground">N/A</span>;
          return (
            <Badge variant={ps === 'PAID' ? 'success' : ps === 'PARTIAL' ? 'info' : 'warning'} dot>
              {paymentLabel(ps)}
            </Badge>
          );
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

  const openBatch = useCallback((r: any) => {
    setDetailBatchId(r._batchId);
    setDetailFilterStatus(r._status ?? null);
    setDetailLineIds(r._lineIds ?? null);
  }, []);

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

  // The ABAC row rule the live MaterialTable applied (table/usePermittedRows), kept on the kit table.
  const permittedRows = usePermittedRows(visibleRows, { resource, viewOwn, viewOthers, checkOwnWithOthers });

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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-3 lg:gap-3 lg:px-0">
        <div className="min-w-0">
          {title && <h2 className="m-0 text-base font-bold text-foreground lg:text-lg">{title}</h2>}
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex w-full max-w-full flex-wrap items-center justify-start gap-2 md:w-auto md:justify-end">
          {/* A filter set from a chart the reader may have scrolled past needs to say so here,
              where the narrowed rows are — and be undoable from the same place. */}
          {externalCategoryFilter && (
            <Button variant="ghost" size="icon-xs"
              type="button"
              onClick={onClearCategoryFilter}
              title="Clear category filter"
            >
              {externalCategoryFilter}
              {onClearCategoryFilter && <span aria-hidden>✕</span>}
            </Button>
          )}
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
        </div>
      </div>

      {loadError && !tableLoading ? (
        <LoadErrorState what="your expenses" onRetry={() => setRefreshKey((k) => k + 1)} />
      ) : !tableLoading && permittedRows.length === 0 ? (
        <RecordsEmptyState
          periodLabel={periodLabel}
          elsewhere={elsewhere}
          onGoToPeriod={onGoToPeriod}
          activeStatusFilter={statusFilter === null ? null : STATUS_LABEL[statusFilter]}
          onClearStatusFilter={() => setStatusFilter(null)}
        />
      ) : (
        <DataTable<any>
          caption={title || 'Submissions'}
          columns={columns}
          data={permittedRows}
          getRowId={(r, i) => String(r._batchId ?? r._submissionId ?? i)}
          loading={tableLoading}
          searchPlaceholder="Search submissions"
          stateKey="reimbursement.submissions"
          selectable
          selectionActions={(_rows, _clear, ctx) => <DataTableExport columns={columns} ctx={ctx} filename={title || 'Submissions'} />}
          initialSorting={[{ id: '_submittedAt', desc: true }]}
          onRowClick={openBatch}
          rowLabel={(r) => `Open submission ${r._submissionId ?? ''}`.trim()}
          // The same tone as the badge and the phone card (STATUS_TONE). Needs info carries no tint, as before:
          // its badge already says who must act.
          rowTone={(r) => (r._status === STATUS.NEEDS_INFO ? undefined : STATUS_TONE[resolveStatus(r._status) as StatusNum])}
          // Narrow screens get cards instead of an eight-column horizontal scroller. Same
          // click target as the wide table, so opening a submission works identically.
          renderCard={(r) => <SubmissionMobileCard row={r} onOpen={() => openBatch(r)} />}
          toolbar={(ctx) => <DataTableExport columns={columns} ctx={ctx} filename={title || 'Submissions'} />}
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
