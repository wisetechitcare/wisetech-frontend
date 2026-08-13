import { useEffect, useState, useMemo, useCallback } from 'react';
import { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { usePermission } from '@hooks/usePermission';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { KTIcon } from '@metronic/helpers';
import { fetchPendingApprovals, fetchAllApprovalInstances, processApprovalAction, fetchReimbursementBatchById, decideLeaveSegment, processBatchRequestAction } from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Modal } from 'react-bootstrap';
import { getSocket } from '@utils/socketClient';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import { BatchDetailModal, fmtAmount } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { getApprovalDomain } from './domains/registry';
// Direct module import (not the ui/ barrel) — the barrel drags Swal/glass/notifications into this
// file's type+bundle graph for one chip.
import { ToneChip } from '@app/modules/common/components/ui/chips';
import { WtIconButton } from '@app/modules/common/components/ui/buttons';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import { CircularProgress } from '@mui/material';

// A single leave segment within a multi-segment (sandwich) group request — one LeaveTracker row.
type LeaveSegment = {
  id?: string;
  leaveType?: string | null;
  isPaid?: boolean;
  days?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: number; // 0=pending, 1=approved, 2=rejected — per-segment (bifurcation)
};

type RequestDetails = {
  subType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  reason?: string | null;
  description?: string | null;
  isHalfDay?: boolean | null;
  halfDaySession?: string | null;
  totalAmount?: number | string | null;
  totalRequests?: number | null;
  // Attendance (regularization) specifics — the requested punches.
  checkIn?: string | null;
  checkOut?: string | null;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  submittedAt?: string | null;
  // Group leave requests only (workflowType='LeaveRequestGroup', SANDWICH_RULES.md §8 D-4) —
  // a sandwich-bridged leave spans multiple LeaveTracker rows/leave types under one approval.
  segments?: LeaveSegment[] | null;
  totalDays?: number | null;
  paidDays?: number | null;
  unpaidDays?: number | null;
};

type ApprovalStep = {
  id: string;
  instanceId: string;
  level: number;
  status: string;
  delegatedFrom?: string | null;
  requestDetails?: RequestDetails | null;
  instance: {
    id: string;
    workflowType: string;
    requestId: string;
    requestModel: string;
    currentLevel: number;
    totalLevels: number;
    status: string;
    createdAt: string;
    employee: {
      id: string;
      // Sent by approvalService.APPROVAL_EMPLOYEE_SELECT so a domain detail can open the request
      // in the REQUESTER's context (ApplyLeave `target`) instead of falling back to the approver's
      // own branch/DOJ.
      branchId?: string;
      dateOfJoining?: string | Date | null;
      users: { firstName: string; lastName: string };
    };
  };
};

type TabKey = 'pending' | 'awaiting' | 'completed';
type DomainApprovalQueueProps = {
  domainTypes: string[];
  mode?: 'include' | 'exclude';
};

type DisplayStep = ApprovalStep & { _uid: string };

// Semantic, not a pinned hex — reimbursement reads as a "money/positive" identity, so it tracks
// the success tone from the canonical tokens rather than drifting on its own.
const REIMBURSEMENT_BADGE_COLOR = tonePair('success').fg;

const MIN_REASON_LENGTH = 10;

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Like formatDate but prefixes the weekday, e.g. "Thu, 25 Jun 2026".
function formatDateWithDay(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

// Time-only, e.g. "09:15 AM". Used for attendance punches where the time matters.
function formatTimeOnly(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Worked span between check-in and check-out, e.g. "8h 45m". Empty if either is missing.
function formatWorkedDuration(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn || !checkOut) return '';
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (Number.isNaN(ms) || ms <= 0) return '';
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

// Inclusive calendar-day count between two ISO dates. Parses the date-only portion as UTC
// so the diff is exact whole days (no DST/timezone drift). Half-day leaves count as 0.5.
function leaveDayCount(dateFrom?: string | null, dateTo?: string | null, isHalfDay?: boolean | null): number {
  if (!dateFrom) return 0;
  if (isHalfDay) return 0.5;
  const a = Date.parse(String(dateFrom).slice(0, 10));
  const b = Date.parse(String(dateTo || dateFrom).slice(0, 10));
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

interface RejectModalProps {
  step: ApprovalStep | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
  /**
   * 'reject' ends the request. 'request-info' asks the employee a question and leaves it alive.
   *
   * Both need free text and both need the approval context above it, so they are one component
   * with two vocabularies rather than two near-identical modals that drift apart.
   */
  variant?: 'reject' | 'request-info';
}

const MODAL_COPY = {
  reject: {
    title: 'Reject Request',
    label: 'Reason for Rejection',
    placeholder: 'Describe why this request is being rejected…',
    hint: 'A rejection reason is required.',
    confirm: 'Confirm Rejection',
    btnClass: 'btn-danger',
    tone: 'danger' as const,
  },
  'request-info': {
    title: 'Ask for more information',
    label: 'What do you need to know?',
    placeholder: 'e.g. Which client visit was this taxi for? Please attach the receipt.',
    hint: 'A question is required — it is what the employee sees.',
    confirm: 'Send question',
    btnClass: 'btn-warning',
    tone: 'warning' as const,
  },
};

function RejectModal({ step, onClose, onConfirm, submitting, variant = 'reject' }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const copy = MODAL_COPY[variant];
  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  useEffect(() => { if (!step) setReason(''); }, [step]);

  return (
    <Modal show={!!step} onHide={onClose} centered size='lg'>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#181c32' }}>
          {copy.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px 24px' }}>
        {step && (
          <>
            {/* Compact status tracker for context */}
            <div style={{
              background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 20,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#a1a5b7',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
              }}>
                Approval Progress
              </div>
              <ApprovalStatusTracker instanceId={step.instance.id} compact />
            </div>

            {/* Rejection reason */}
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, color: '#181c32', display: 'block', marginBottom: 6 }}>
                {copy.label} <span style={{ color: tonePair(copy.tone).fg }}>*</span>
              </label>
              <textarea
                rows={3}
                className='form-control'
                placeholder={copy.placeholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical', fontSize: 13 }}
                disabled={submitting}
              />
              {!trimmed && (
                <div style={{ fontSize: 11, color: '#a1a5b7', marginTop: 4 }}>
                  {copy.hint}
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer style={{ gap: 8 }}>
        <button className='btn btn-sm btn-light' onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className={`btn btn-sm ${copy.btnClass} d-flex align-items-center gap-2`}
          onClick={() => onConfirm(trimmed)}
          disabled={!canSubmit}
        >
          {submitting && <span className='spinner-border spinner-border-sm' />}
          {copy.confirm}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Expanded row detail ───────────────────────────────────────────────────────

// Detailed attendance-regularization view — shows the requested punch(es) so an approver can
// judge the request without leaving the queue: which day, requested check-in/out times, the
// resulting worked duration, capture locations, and the employee's remarks.
// Premium, scannable punch display used in the Type cell. Aligned labels + semantic dots
// (green = in, rose = out); a punch that wasn't requested reads as a muted "Not requested",
// so the presence/times themselves communicate whether it's a Check-In, Check-Out, or both.
function AttendancePunchStack({ checkIn, checkOut }: { checkIn?: string | null; checkOut?: string | null }) {
  const Row = ({ label, time, color }: { label: string; time?: string | null; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.35 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, backgroundColor: time ? color : '#dbdfe9' }} />
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: '#99a1b7', minWidth: 62 }}>
        {label}
      </span>
      {time ? (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1f2b', fontVariantNumeric: 'tabular-nums' }}>
          {formatTimeOnly(time)}
        </span>
      ) : (
        <span style={{ fontSize: 11, fontStyle: 'italic', color: '#b5b9c9' }}>Not requested</span>
      )}
    </div>
  );
  return (
    <div className='d-flex flex-column' style={{ gap: 5, paddingBlock: 2 }}>
      <Row label='Check-In' time={checkIn} color={tonePair('success').fg} />
      <Row label='Check-Out' time={checkOut} color={tonePair('danger').fg} />
    </div>
  );
}

function AttendanceDetailCard({ details }: { details: RequestDetails }) {
  const { checkIn, checkOut, checkInLocation, checkOutLocation, reason, subType } = details;
  const worked = formatWorkedDuration(checkIn, checkOut);
  const kindLabel = checkIn && checkOut
    ? 'Check-In & Check-Out'
    : checkIn
      ? 'Check-In'
      : checkOut
        ? 'Check-Out'
        : (subType ?? 'Regularization');

  const Punch = ({ label, at, location }: { label: string; at?: string | null; location?: string | null }) => (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: '#a1a5b7' }}>
        {label}
      </div>
      {at ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#181c32', lineHeight: 1.3 }}>{formatTimeOnly(at)}</div>
          <div style={{ fontSize: 12, color: '#5e6278' }}>{formatDateWithDay(at)}</div>
          {location ? (
            <div style={{ fontSize: 11, color: '#a1a5b7', marginTop: 2 }}>📍 {location}</div>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: 14, color: '#a1a5b7', fontStyle: 'italic' }}>Not requested</div>
      )}
    </div>
  );

  return (
    <div style={{
      background: '#fff', border: '1px solid #eff2f5', borderRadius: 10,
      padding: '16px 18px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#181c32' }}>
          Attendance Request — {kindLabel}
        </span>
        {worked ? <ToneChip dense tone='success' label={`Worked ${worked}`} /> : null}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Punch label='Requested Check-In' at={checkIn} location={checkInLocation} />
        <div style={{ width: 1, background: '#eff2f5', alignSelf: 'stretch' }} />
        <Punch label='Requested Check-Out' at={checkOut} location={checkOutLocation} />
      </div>

      {reason ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #eff2f5' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: '#a1a5b7', marginBottom: 3 }}>
            Remarks
          </div>
          <div style={{ fontSize: 13, color: '#3f4254' }}>{reason}</div>
        </div>
      ) : null}
    </div>
  );
}

function ExpandedDetail({
  instanceId,
  splitStatus,
  workflowType,
  details,
  canDecide,
  onDecide,
}: {
  instanceId: string;
  splitStatus?: 1 | 2;
  workflowType?: string;
  details?: RequestDetails | null;
  canDecide?: boolean;
  onDecide?: (segmentId: string, decision: 'approved' | 'rejected') => void;
}) {
  const segments = details?.segments ?? [];
  const isGroupLeave = workflowType === 'leave' && segments.length > 1;
  return (
    <div style={{ padding: '16px 20px', background: '#fafafa', borderTop: '1px solid #eff2f5' }}>
      {workflowType === 'attendance' && details ? <AttendanceDetailCard details={details} /> : null}

      {/* Per-segment decisions (bifurcation): an approver may approve/reject each segment of a
          grouped leave independently; the whole-group Approve/Reject still acts on what's left pending. */}
      {isGroupLeave && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: '#a1a5b7', marginBottom: 8 }}>Segments</div>
          <div className='d-flex flex-column gap-2'>
            {segments.map((s, i) => {
              const pending = (s.status ?? 0) === 0;
              return (
                <div key={s.id ?? i} className='d-flex align-items-center gap-2 flex-wrap' style={{ padding: '8px 12px', border: '1px solid #eceef0', borderRadius: 9, background: '#fff' }}>
                  <span className='fw-semibold fs-8'>{s.leaveType ?? 'Leave'}</span>
                  <span className='fs-8 text-muted'>{typeof s.days === 'number' ? `${s.days}d` : ''}</span>
                  <span className={`badge fs-8 ${s.isPaid ? 'badge-light-success text-success' : 'badge-light-danger text-danger'}`}>{s.isPaid ? 'Paid' : 'Unpaid'}</span>
                  <span className='ms-auto'>
                    {s.status === 1 && <span className='badge badge-light-success text-success fs-8'>✓ Approved</span>}
                    {s.status === 2 && <span className='badge badge-light-danger text-danger fs-8'>✕ Rejected</span>}
                    {pending && canDecide && s.id && onDecide && (
                      <span className='d-inline-flex gap-2'>
                        <button className='btn btn-sm btn-light-success py-1 px-3 fs-8' onClick={() => onDecide(s.id!, 'approved')}>Approve</button>
                        <button className='btn btn-sm btn-light-danger py-1 px-3 fs-8' onClick={() => onDecide(s.id!, 'rejected')}>Reject</button>
                      </span>
                    )}
                    {pending && !canDecide && <span className='badge badge-light-warning text-warning fs-8'>Pending</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ApprovalStatusTracker
        instanceId={instanceId}
        showAuditLog
        overrideStatus={splitStatus === 2 ? 'rejected' : splitStatus === 1 ? 'approved' : undefined}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function DomainApprovalQueue({ domainTypes, mode = 'include' }: DomainApprovalQueueProps) {
  const canApprove = usePermission('approvals.approve.team');
  const leaveTypeColors = useSelector((state: RootState) => (state as any).customColors?.leaveTypes);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ApprovalStep | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [infoTarget, setInfoTarget] = useState<ApprovalStep | null>(null);
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  // Instances this approver has asked a question about during this session. The approval
  // instance itself stays `pending` — deliberately, since nothing has been decided — so there is
  // no server field saying "a question is outstanding". Session-only, and honest about it: a
  // refresh loses the chip, not the question.
  const [infoRequested, setInfoRequested] = useState<Set<string>>(new Set());
  /** Row-click detail — the registry resolves WHICH component renders it. */
  const [detailStep, setDetailStep] = useState<DisplayStep | null>(null);
  const [batchDetailId, setBatchDetailId] = useState<string | null>(null);
  const [batchDetailInstanceId, setBatchDetailInstanceId] = useState<string | null>(null);

  const getLeaveTypeColor = (leaveType: string): string => {
    if (!leaveTypeColors) return '#3498DB';
    const n = leaveType?.toLowerCase() ?? '';
    if (n.includes('sick')) return leaveTypeColors.sickLeaveColor || '#E74C3C';
    if (n.includes('casual')) return leaveTypeColors.casualLeaveColor || '#3498DB';
    if (n.includes('annual')) return leaveTypeColors.annualLeaveColor || '#2ECC71';
    if (n.includes('maternal') || n.includes('maternity')) return leaveTypeColors.maternalLeaveColor || '#9B59B6';
    if (n.includes('floater')) return leaveTypeColors.floaterLeaveColor || '#F39C12';
    if (n.includes('unpaid')) return leaveTypeColors.unpaidLeaveColor || '#95A5A6';
    return '#3498DB';
  };

  const load = useCallback(async (tab: TabKey = activeTab) => {
    setLoading(true);
    try {
      const res = tab === 'pending'
        ? await fetchPendingApprovals()
        : await fetchAllApprovalInstances(tab);
      const raw = res?.data ?? res ?? [];
      const rows = Array.isArray(raw) ? raw : [];
      const filtered = rows.filter((item: ApprovalStep) => {
        const workflowType = (item.instance.workflowType || '').toLowerCase();
        return mode === 'exclude' ? !domainTypes.includes(workflowType) : domainTypes.includes(workflowType);
      });
      setSteps(filtered);

    } catch {
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, domainTypes, mode]);

  useEffect(() => { load(activeTab); }, [activeTab]);

  // Auto-refresh when a new approval is pending for this approver, or when a request is
  // withdrawn/cancelled by the requester (so orphaned rows disappear live).
  useEffect(() => {
    const socket = getSocket();
    const handler = () => load();
    socket.on('approval:pending', handler);
    socket.on('approval:cancelled', handler);
    return () => {
      socket.off('approval:pending', handler);
      socket.off('approval:cancelled', handler);
    };
  }, [load]);

  // Refresh when employee responds to a query or resubmits a reimbursement — this moves items
  // between Pending/Awaiting tabs and updates counts. Only relevant for reimbursement domain.
  useEventBus(EVENT_KEYS.reimbursementChanged, () => { load(); });

  const approve = async (step: ApprovalStep) => {
    setProcessingId(step.id);
    try {
      await processApprovalAction(step.instance.id, 'approve');
      setSteps((prev) => prev.filter((s) => s.id !== step.id));
      successConfirmation('Request has been approved successfully.', 'Approved!');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to approve this request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectSubmitting(true);
    try {
      await processApprovalAction(rejectTarget.instance.id, 'reject', reason);
      setSteps((prev) => prev.filter((s) => s.id !== rejectTarget.id));
      setRejectTarget(null);
      successConfirmation('Request has been rejected.', 'Rejected');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to reject this request.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  /**
   * "Need info" — the third outcome, for reimbursement only.
   *
   * An approver who needed one more detail could previously only reject, which ends the request
   * and makes the employee start over: "what is this for?" and "this is not claimable" produced
   * the same record. NEEDS_INFO returns the lines to the employee with a question, still alive.
   *
   * It writes through the per-line endpoint that already implements this
   * (`PUT /reimbursement/batches/:batchId/requests/:requestId`, action `request-info`) rather
   * than the generic approval-instance endpoint, which only knows approve and reject. Only the
   * PENDING lines are touched — a line already approved or rejected has been decided, and
   * reopening it would undo somebody's decision.
   *
   * The instance stays pending on purpose: nothing has been decided, so the request remains the
   * approver's until the employee answers. That is why the row does not disappear.
   */
  const handleRequestInfoConfirm = async (question: string) => {
    const step = infoTarget;
    if (!step) return;
    setInfoSubmitting(true);
    try {
      const batchId = step.instance.requestId;
      const res = await fetchReimbursementBatchById(batchId);
      const batch = res?.data?.batch || res?.batch;
      const pendingLines: any[] = (batch?.reimbursements ?? []).filter((r: any) => Number(r.status) === 0);

      if (pendingLines.length === 0) {
        errorConfirmation('Every expense in this batch has already been decided, so there is nothing to ask about.');
        return;
      }

      const results = await Promise.allSettled(
        pendingLines.map((line: any) =>
          processBatchRequestAction(batchId, line.id, 'request-info', question)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === results.length) {
        errorConfirmation('Could not send the question. Please try again.');
        return;
      }

      setInfoRequested((prev) => new Set(prev).add(step.instance.id));
      setInfoTarget(null);
      successConfirmation(
        failed > 0
          ? `Question sent for ${results.length - failed} of ${results.length} expenses. It stays in your queue until they reply.`
          : `${[step.instance.employee?.users?.firstName, step.instance.employee?.users?.lastName].filter(Boolean).join(' ').trim() || 'The employee'} has been asked. The request stays in your queue until they reply.`,
        'Question sent',
      );
      load();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Could not send the question. Please try again.');
    } finally {
      setInfoSubmitting(false);
    }
  };

  const isReimbursementFlow = mode === 'include'
    ? domainTypes.includes('reimbursement')
    : !domainTypes.includes('reimbursement');

  const columns = useMemo<MRT_ColumnDef<ApprovalStep>[]>(() => [
    // Selection column, pending tab only — the other tabs have nothing to decide, and a checkbox
    // that does nothing is worse than no checkbox.
    ...(activeTab === 'pending' ? [{
      id: 'select',
      header: '',
      size: 48,
      enableSorting: false,
      enableColumnActions: false,
      Header: () => (
        <input
          type='checkbox'
          className='form-check-input'
          aria-label='Select all requests on this page'
          checked={allSelected}
          onChange={toggleAll}
        />
      ),
      Cell: ({ row }: any) => {
        const ds = row.original as DisplayStep;
        return (
          <input
            type='checkbox'
            className='form-check-input'
            aria-label='Select this request'
            checked={!!selectedIds[ds._uid]}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            onChange={(e) => setSelectedIds((prev) => ({ ...prev, [ds._uid]: e.target.checked }))}
          />
        );
      },
    } as MRT_ColumnDef<ApprovalStep>] : []),
    {
      accessorKey: 'requester',
      header: 'Requested By',
      size: 200,
      Cell: ({ row }) => {
        const { firstName, lastName } = row.original.instance.employee.users;
        return (
          <div className='d-flex align-items-center gap-3'>
            <div className='symbol symbol-35px'>
              <span className='symbol-label bg-light-primary text-primary fw-bold fs-6'>
                {firstName[0]}{lastName[0]}
              </span>
            </div>
            <span className='text-dark fw-semibold fs-6'>{firstName} {lastName}</span>
          </div>
        );
      },
    },
    ...(isReimbursementFlow ? [
      {
        accessorKey: 'totalRequests',
        header: 'Total Requests',
        size: 130,
        Cell: ({ row }: any) => {
          const ds = row.original as DisplayStep;
          const d = ds.requestDetails as any;
          const count = d?.totalRequests;
          if (count == null) return <span className='text-muted fs-7'>—</span>;
          // The batch's real mix, from the server. An approver decides whether a batch is worth
          // opening from this cell, and "5" told them nothing about whether four of those five
          // were already dealt with.
          const pills: Array<{ label: string; tone: SemanticTone }> = [];
          if (d?.pendingCount) pills.push({ label: `${d.pendingCount} pending`, tone: 'warning' });
          if (d?.queriedCount) pills.push({ label: `${d.queriedCount} query`, tone: 'cyan' });
          if (d?.approvedCount) pills.push({ label: `${d.approvedCount} approved`, tone: 'success' });
          if (d?.rejectedCount) pills.push({ label: `${d.rejectedCount} rejected`, tone: 'danger' });
          if (d?.resubmittedCount) pills.push({ label: `${d.resubmittedCount} resubmitted`, tone: 'indigo' });
          return (
            <div
              role='button'
              style={{ cursor: 'pointer' }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setBatchDetailId(ds.instance.requestId);
                setBatchDetailInstanceId(ds.instance.id);
              }}
            >
              <span className='fw-bold fs-6 text-primary'>{count}</span>
              {pills.length > 0 && (
                <div className='d-flex flex-wrap gap-1 mt-1'>
                  {pills.map((p) => <ToneChip key={p.label} dense tone={p.tone} label={p.label} />)}
                </div>
              )}
            </div>
          );
        },
      } as MRT_ColumnDef<ApprovalStep>,
      {
        accessorKey: 'totalAmount',
        header: 'Total Amount',
        size: 150,
        Cell: ({ row }: any) => {
          const ds = row.original as DisplayStep;
          const amount = ds.requestDetails?.totalAmount;
          if (amount == null) return <span className='text-muted fs-7'>—</span>;
          return <span className='text-dark fw-semibold fs-7'>₹{fmtAmount(amount)}</span>;
        },
      } as MRT_ColumnDef<ApprovalStep>
      
    ] : []),
    {
      // Ageing. Nothing in this module could answer "what has been sitting longest" — there was
      // no days-pending column anywhere, and the pending payment table had no date column at all.
      // It needs no new data: `now − submittedAt`.
      id: 'ageing',
      header: 'Waiting',
      size: 120,
      accessorFn: (row: any) => {
        const submitted = row.requestDetails?.submittedAt ?? row.instance?.createdAt;
        return submitted ? dayjs().diff(dayjs(submitted), 'day') : -1;
      },
      sortingFn: 'basic',
      Cell: ({ row }: any) => {
        const submitted = row.original.requestDetails?.submittedAt ?? row.original.instance?.createdAt;
        if (!submitted) return <span className='text-muted fs-7'>—</span>;
        const days = dayjs().diff(dayjs(submitted), 'day');
        // Thresholds, not a gradient: an approver needs to know whether this is fine, slipping,
        // or overdue — three states they can act on, each with a word as well as a colour.
        const tone = days >= 14
          ? { color: '#dc2626', bg: '#fef2f2', label: 'Overdue' }
          : days >= 7
            ? { color: '#d97706', bg: '#fff7e8', label: 'Ageing' }
            : { color: '#15803d', bg: '#ecfdf3', label: '' };
        return (
          <div className='d-flex align-items-center gap-2'>
            <span className='fw-bold fs-7' style={{ color: tone.color }}>
              {days === 0 ? 'Today' : `${days}d`}
            </span>
            {tone.label && (
              <span
                className='fw-bold'
                style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 999,
                  color: tone.color, backgroundColor: tone.bg,
                }}
              >
                {tone.label}
              </span>
            )}
          </div>
        );
      },
    } as MRT_ColumnDef<ApprovalStep>,
    {
      accessorKey: 'workflowType',
      header: 'Type',
      size: 185,
      Cell: ({ row }) => {
        const type = row.original.instance.workflowType;
        const subType = row.original.requestDetails?.subType;
        const segments = row.original.requestDetails?.segments;

        let label: string;
        let color: string | undefined;

        // Attendance: a clean, labelled punch stack (Check-In / Check-Out + times) reads far
        // better than a generic "Regularization" badge and tells the approver exactly what's
        // requested at a glance.
        if (type === 'attendance') {
          const { checkIn, checkOut } = row.original.requestDetails ?? {};
          return <AttendancePunchStack checkIn={checkIn} checkOut={checkOut} />;
        }

        // Multi-segment sandwich leave (SANDWICH_RULES.md §8 D-4): one badge per leave type, not
        // a single merged label — `subType` here is a joined string ("Casual Leaves, Unpaid
        // Leaves") which would otherwise render as one misleadingly-colored chip.
        if (type === 'leave' && segments && segments.length > 1) {
          return (
            <div className='d-flex flex-wrap gap-1'>
              {segments.map((seg, i) => (
                <ToneChip
                  key={`${seg.leaveType}-${i}`}
                  dense
                  color={getLeaveTypeColor(seg.leaveType ?? '')}
                  label={`${seg.leaveType ?? 'Leave'}${typeof seg.days === 'number' ? ` (${seg.days}d)` : ''}`}
                />
              ))}
            </div>
          );
        }

        // Identity colour (admin-configured leave type) vs semantic tone (approved/rejected).
        // Anything unregistered falls back to the domain registry's own label/tone — so a new
        // workflow type renders correctly without touching this cell.
        const domain = getApprovalDomain(type);
        let tone: SemanticTone | undefined;

        if (type === 'leave' && subType) {
          label = subType;
          color = getLeaveTypeColor(subType);
        } else if (type === 'reimbursement') {
          label = subType ?? 'Reimbursement';
          color = REIMBURSEMENT_BADGE_COLOR;
        } else {
          label = subType ?? domain?.label ?? type;
          tone = domain?.tone ?? 'neutral';
        }

        return <ToneChip label={label} color={color} tone={tone} sx={{ minWidth: 60 }} />;
      },
    },
    {
      accessorKey: 'dates',
      header: 'Duration',
      size: 180,
      Cell: ({ row }) => {
        const rd = row.original.requestDetails ?? {};
        const { dateFrom, dateTo, isHalfDay, halfDaySession } = rd;

        // Attendance regularization: show which day is being regularized + the worked span.
        // (The requested In/Out times live in the Type column.)
        if (row.original.instance.workflowType === 'attendance') {
          const { checkIn, checkOut } = rd;
          const worked = formatWorkedDuration(checkIn, checkOut);
          const day = checkIn || checkOut;
          if (!day) return <span className='text-muted fs-7'>—</span>;
          return (
            <div className='d-flex flex-column'>
              <span className='text-dark fw-semibold fs-7'>{formatDateWithDay(day)}</span>
              {worked && (
                <span className='badge badge-light-success fw-bold fs-8 mt-1 align-self-start'>{worked}</span>
              )}
            </div>
          );
        }

        if (!dateFrom) return <span className='text-muted fs-7'>—</span>;
        const from = formatDateWithDay(dateFrom);
        const to = dateTo ? formatDateWithDay(dateTo) : null;
        const session = String(halfDaySession || '').toUpperCase();
        const isRange = !!(to && to !== from);
        // Multi-segment sandwich leave: rd.totalDays is the real chargeable-day sum (paid +
        // sandwich Unpaid) computed backend-side from the segments — a naive dateTo−dateFrom
        // diff on the outer range would over-count by including every calendar day in between,
        // not just chargeable ones (SANDWICH_RULES.md §8 D-4).
        const hasSegments = !!rd.segments && rd.segments.length > 1;
        const days = hasSegments ? (rd.totalDays ?? 0) : leaveDayCount(dateFrom, dateTo, isHalfDay);
        return (
          <div className='d-flex flex-column'>
            <span className='text-dark fw-semibold fs-7'>{from}</span>
            {isRange && <span className='text-muted fs-8'>→ {to}</span>}
            {isHalfDay ? (
              <span className='badge badge-light-primary fw-bold fs-8 mt-1 align-self-start'>
                ½ day{session === 'AM' || session === 'PM' ? ` (${session})` : ''}
              </span>
            ) : hasSegments ? (
              <div className='d-flex flex-wrap gap-1 mt-1'>
                <span className='badge badge-light-primary fw-bold fs-8'>
                  {days} {days === 1 ? 'day' : 'days'} total
                </span>
                {!!rd.paidDays && (
                  <span className='badge badge-light-success fw-bold fs-8'>{rd.paidDays} paid</span>
                )}
                {!!rd.unpaidDays && (
                  <span className='badge badge-light-secondary fw-bold fs-8'>{rd.unpaidDays} unpaid</span>
                )}
              </div>
            ) : (
              <span className='badge badge-light-primary fw-bold fs-8 mt-1 align-self-start'>
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'step',
      header: 'Step',
      size: 90,
      Cell: ({ row }) => {
        const { currentLevel, totalLevels } = row.original.instance;
        return (
          <span className='badge badge-light-primary fw-semibold fs-7'>
            {currentLevel} / {totalLevels}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      size: 120,
      Cell: ({ row }) => (
        <span className='text-muted fs-7'>{formatDate(row.original.instance.createdAt)}</span>
      ),
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      size: 160,
      enableSorting: false,
      Cell: ({ row }) => {
        const step = row.original;
        const isProcessing = processingId === step.id;

        // Awaiting others or completed — read-only
        if (activeTab === 'awaiting') {
          return <ToneChip dense tone='warning' label={`Awaiting L${step.instance.currentLevel}`} />;
        }
        if (activeTab === 'completed') {
          // A reimbursement batch is rarely all one thing. Forcing it to read "Approved" or
          // "Rejected" is what the split-row workaround existed to paper over; the server now
          // says PARTIALLY_PROCESSED outright.
          const processing = (step.requestDetails as any)?.processingStatus as string | undefined;
          if (processing === 'PARTIALLY_PROCESSED') {
            return <ToneChip dense tone='indigo' label='Partially processed' />;
          }
          const isApproved = processing ? processing === 'APPROVED' : step.instance.status === 'approved';
          return (
            <ToneChip
              dense
              tone={isApproved ? 'success' : 'danger'}
              label={isApproved ? 'Approved' : 'Rejected'}
            />
          );
        }

        // Pending tab.
        //
        // A reimbursement batch is NOT a decision. Its requests can sit at different levels, some
        // already approved, one waiting on the employee's answer — so a tick on this row cannot
        // mean "approve it". It means "approve the ones in front of me", which is what the server
        // does, and the label now says that instead of leaving the approver to guess.
        const awaiting = isReimbursementFlow
          ? Number((step.requestDetails as any)?.pendingCount ?? 0)
          : null;
        const approveTitle = awaiting == null
          ? 'Approve'
          : awaiting === 0
            ? 'Nothing on this submission is awaiting your decision — open it to review'
            : `Approve the ${awaiting} request${awaiting === 1 ? '' : 's'} awaiting you`;

        return (
          <div className='d-flex align-items-center gap-1 flex-wrap'>
            {step.delegatedFrom && (
              <ToneChip
                dense
                tone='cyan'
                label={step.delegatedFrom}
                title={`Delegated from ${step.delegatedFrom}`}
                sx={{ width: '100%', mb: 0.5 }}
              />
            )}
            <WtIconButton
              color={tonePair('success').fg}
              title={approveTitle}
              disabled={isProcessing || awaiting === 0}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); approve(step); }}
            >
              {isProcessing
                ? <CircularProgress size={14} sx={{ color: tonePair('success').fg }} />
                : <KTIcon iconName='check' className='fs-4' />}
            </WtIconButton>
            {/* Reimbursement only: it is the one domain with a NEEDS_INFO state and an endpoint
                that writes it. Rendering the button where it cannot work would be worse than
                not having it. */}
            {step.instance.workflowType === 'reimbursement' && (
              <WtIconButton
                color={tonePair('warning').fg}
                title='Need more info — ask the employee a question without rejecting'
                disabled={isProcessing}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setInfoTarget(step); }}
              >
                <KTIcon iconName='question' className='fs-4' />
              </WtIconButton>
            )}
            <WtIconButton
              color={tonePair('danger').fg}
              title={awaiting == null ? 'Reject'
                : awaiting === 0 ? 'Nothing on this submission is awaiting your decision'
                  : `Reject the ${awaiting} request${awaiting === 1 ? '' : 's'} awaiting you`}
              disabled={isProcessing || awaiting === 0}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRejectTarget(step); }}
            >
              <KTIcon iconName='cross' className='fs-4' />
            </WtIconButton>
            {/* Deciding request-by-request is the normal path for a mixed batch, so it gets a
                button rather than being hidden behind a row click. */}
            {isReimbursementFlow && (
              <WtIconButton
                color={tonePair('brand').fg}
                title='Open the submission and decide request by request'
                disabled={isProcessing}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setBatchDetailId(step.instance.requestId);
                  setBatchDetailInstanceId(step.instance.id);
                }}
              >
                <KTIcon iconName='eye' className='fs-4' />
              </WtIconButton>
            )}
            {infoRequested.has(step.instance.id) && (
              <ToneChip
                dense
                tone='warning'
                label='Info requested'
                title='You asked the employee a question. It stays here until they reply.'
                sx={{ width: '100%', mt: 0.5 }}
              />
            )}
          </div>
        );
      },
    },
  ], [processingId, leaveTypeColors, activeTab, isReimbursementFlow, infoRequested]);

  /**
   * One row per approval. Full stop.
   *
   * A mixed reimbursement batch used to be SPLIT into a fake "approved" row and a fake "rejected"
   * row on the Completed tab, because the queue had no way to say a batch was partly one and
   * partly the other. The server now reports `processingStatus` — PARTIALLY_PROCESSED is a real
   * value — so the workaround, and the per-batch fetch that fed it, are both gone.
   */
  const displaySteps = useMemo<DisplayStep[]>(
    () => steps.map((s) => ({ ...s, _uid: s.id })),
    [steps],
  );

  // ── Bulk approve, across employees ──────────────────────────────────────────
  //
  // Bulk approve already existed WITHIN a single batch, so an approver facing thirty ₹60 fares
  // from twelve people still had to open twelve batches to clear them. Selection lives here
  // rather than in the shared MaterialTable because teaching that wrapper about row selection
  // would change every table in the app.
  const selectableSteps = displaySteps;
  const selectedSteps = selectableSteps.filter((s) => selectedIds[s._uid]);
  const allSelected = selectableSteps.length > 0 && selectedSteps.length === selectableSteps.length;

  const toggleAll = () =>
    setSelectedIds(allSelected ? {} : Object.fromEntries(selectableSteps.map((s) => [s._uid, true])));

  const approveSelected = async () => {
    const total = selectedSteps.length;
    if (total === 0) return;
    const confirmed = await Swal.fire({
      title: `Approve ${total} request${total === 1 ? '' : 's'}?`,
      text: 'Every selected request will be approved. This cannot be undone in bulk.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Approve ${total}`,
      cancelButtonText: 'Cancel',
    });
    if (!confirmed.isConfirmed) return;

    setBulkRunning(true);
    // Sequential, not Promise.all: each decision writes an audit row and may settle an approval
    // instance, and a partial failure must leave the successful ones committed rather than
    // ambiguous. Slower, and correct.
    let failed = 0;
    for (const step of selectedSteps) {
      try {
        await processApprovalAction(step.instance.id, 'approve');
      } catch {
        failed += 1;
      }
    }
    setSelectedIds({});
    setBulkRunning(false);
    if (failed === 0) {
      successConfirmation(`${total} request${total === 1 ? '' : 's'} approved.`, 'Approved!');
    } else {
      errorConfirmation(
        `${total - failed} approved, ${failed} could not be. The failures are still in your queue.`,
      );
    }
    await load();
  };

  if (!canApprove) {
    return (
      <div className='card'>
        <div className='card-body d-flex flex-column align-items-center justify-content-center py-20'>
          <KTIcon iconName='lock' className='fs-3x text-muted mb-4' />
          <span className='text-muted fs-6'>You do not have permission to view pending approvals.</span>
        </div>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pending My Action' },
    { key: 'awaiting', label: 'Awaiting Others' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <>
      {/* Tab strip + Refresh */}
      <div className='d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2'>
        <div className='d-flex gap-2 flex-wrap'>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-light'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key === 'pending' && steps.length > 0 && activeTab === 'pending' && (
                <span className='badge badge-circle badge-white ms-2 text-primary fw-bold'>{steps.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className='btn btn-sm btn-light-primary d-flex align-items-center gap-2' onClick={() => load(activeTab)} disabled={loading}>
          <KTIcon iconName='arrows-circle' className='fs-5' />{loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {selectedSteps.length > 0 && (
        <div
          className='d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4'
          style={{ padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #dbeafe' }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>
            {selectedSteps.length} selected
          </span>
          <div className='d-flex align-items-center gap-2'>
            <WtButton ghost size='small' onClick={() => setSelectedIds({})} disabled={bulkRunning}>
              Clear
            </WtButton>
            <WtButton size='small' onClick={approveSelected} disabled={bulkRunning}>
              {bulkRunning ? 'Approving…' : `Approve ${selectedSteps.length}`}
            </WtButton>
          </div>
        </div>
      )}

      <MaterialTable
        data={displaySteps}
        columns={columns}
        tableName='Approvals'
        hideFilters={false}
        hideExportCenter
        renderDetailPanel={({ row }: { row: MRT_Row<ApprovalStep> }) => (
          <ExpandedDetail
            instanceId={row.original.instance.id}
            workflowType={row.original.instance.workflowType}
            details={row.original.requestDetails}
            canDecide={canApprove && activeTab === 'pending'}
            onDecide={async (segmentId, decision) => {
              try {
                await decideLeaveSegment(segmentId, decision);
                await load();
              } catch (err) {
                console.error('Per-segment decision failed', err);
              }
            }}
          />
        )}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }: any) => ({
            onClick: () => {
              const ds = row.original as DisplayStep;
              // Each workflow opens its OWN canonical detail (registry) — leave → ApplyLeave,
              // reimbursement → BatchDetailModal. A domain with no registered Detail (attendance,
              // task, …) carries its detail in the expandable panel, so click toggles that.
              if (getApprovalDomain(ds.instance.workflowType)?.Detail) {
                setDetailStep(ds);
                return;
              }
              row.toggleExpanded?.();
            },
            sx: { cursor: 'pointer' },
          }),
        }}
      />

      <RejectModal
        step={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
      />

      {/* Domain-resolved detail: each workflow renders its own canonical component. */}
      {detailStep && (() => {
        const Detail = getApprovalDomain(detailStep.instance.workflowType)?.Detail;
        if (!Detail) return null;
        return (
          <Detail
            step={detailStep}
            canEdit={canApprove}
            // Decide-in-modal only where the row's own ✓/✕ would act: the Pending tab, with the
            // permission. Approve reuses the queue handler then closes; Reject closes then opens the
            // existing reason modal (which owns the reject API call) — no z-index fight, one path.
            canDecide={canApprove && activeTab === 'pending'}
            onApprove={() => { const s = detailStep; setDetailStep(null); approve(s); }}
            onReject={() => { const s = detailStep; setDetailStep(null); setRejectTarget(s); }}
            onClose={() => setDetailStep(null)}
            onDone={() => load(activeTab)}
          />
        );
      })()}

      {/* The reimbursement "Total Requests" cell opens the batch modal directly (drill-in to a
          split sub-set), independent of the row-click detail above. */}
      <RejectModal
        step={infoTarget}
        variant='request-info'
        onClose={() => setInfoTarget(null)}
        onConfirm={handleRequestInfoConfirm}
        submitting={infoSubmitting}
      />

      <BatchDetailModal
        batchId={batchDetailId}
        onClose={() => { setBatchDetailId(null); setBatchDetailInstanceId(null); }}
        onBatchActionDone={() => load(activeTab)}
        approvalInstanceId={batchDetailInstanceId}
      />
    </>
  );
}

export default DomainApprovalQueue;
