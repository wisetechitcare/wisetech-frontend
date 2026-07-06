import { useEffect, useState, useMemo, useCallback } from 'react';
import { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { usePermission } from '@hooks/usePermission';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import { fetchPendingApprovals, fetchAllApprovalInstances, processApprovalAction, fetchReimbursementBatchById } from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Modal } from 'react-bootstrap';
import { getSocket } from '@utils/socketClient';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';
import { BatchDetailModal, fmtAmount } from '@pages/employee/reimbursement/shared/ReimbursementBatchShared';

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
      users: { firstName: string; lastName: string };
    };
  };
};

type TabKey = 'pending' | 'awaiting' | 'completed';
type DomainApprovalQueueProps = {
  domainTypes: string[];
  mode?: 'include' | 'exclude';
};

type BatchStatusSummary = {
  approved: number;
  rejected: number;
  approvedAmt: number;
  rejectedAmt: number;
};

type DisplayStep = ApprovalStep & {
  _uid: string;
  _splitStatus?: 1 | 2;
  _splitCount?: number;
  _splitAmount?: number;
};

const REIMBURSEMENT_BADGE_COLOR = '#50cd89';

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
}

function RejectModal({ step, onClose, onConfirm, submitting }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  useEffect(() => { if (!step) setReason(''); }, [step]);

  return (
    <Modal show={!!step} onHide={onClose} centered size='lg'>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#181c32' }}>
          Reject Request
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
                Reason for Rejection <span style={{ color: '#f1416c' }}>*</span>
              </label>
              <textarea
                rows={3}
                className='form-control'
                placeholder='Describe why this request is being rejected…'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical', fontSize: 13 }}
                disabled={submitting}
              />
              {!trimmed && (
                <div style={{ fontSize: 11, color: '#a1a5b7', marginTop: 4 }}>
                  A rejection reason is required.
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
          className='btn btn-sm btn-danger d-flex align-items-center gap-2'
          onClick={() => onConfirm(trimmed)}
          disabled={!canSubmit}
        >
          {submitting && <span className='spinner-border spinner-border-sm' />}
          Confirm Rejection
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
      <Row label='Check-In' time={checkIn} color='#17c653' />
      <Row label='Check-Out' time={checkOut} color='#f1416c' />
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
        {worked ? (
          <span className='badge' style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 600, fontSize: 11, padding: '5px 10px', borderRadius: 12 }}>
            Worked {worked}
          </span>
        ) : null}
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
}: {
  instanceId: string;
  splitStatus?: 1 | 2;
  workflowType?: string;
  details?: RequestDetails | null;
}) {
  return (
    <div style={{ padding: '16px 20px', background: '#fafafa', borderTop: '1px solid #eff2f5' }}>
      {workflowType === 'attendance' && details ? <AttendanceDetailCard details={details} /> : null}
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
  const [rejectTarget, setRejectTarget] = useState<ApprovalStep | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [batchDetailId, setBatchDetailId] = useState<string | null>(null);
  const [batchDetailInstanceId, setBatchDetailInstanceId] = useState<string | null>(null);
  const [batchDetailsMap, setBatchDetailsMap] = useState<Record<string, BatchStatusSummary>>({});
  const [batchDetailFilterStatus, setBatchDetailFilterStatus] = useState<number | null>(null);

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
    setBatchDetailsMap({});
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

      if (tab === 'completed') {
        const reimbSteps = filtered.filter((s: ApprovalStep) => s.instance.workflowType === 'reimbursement');
        const seen = new Set<string>();
        const batchIds: string[] = [];
        for (const s of reimbSteps) {
          if (!seen.has(s.instance.requestId)) {
            seen.add(s.instance.requestId);
            batchIds.push(s.instance.requestId);
          }
        }
        if (batchIds.length > 0) {
          Promise.allSettled(
            batchIds.map((id: string) =>
              fetchReimbursementBatchById(id).then((r: any) => ({ id, batch: r?.data?.batch || r?.batch }))
            )
          ).then((results) => {
            const map: Record<string, BatchStatusSummary> = {};
            for (const r of results) {
              if (r.status === 'fulfilled' && r.value?.batch) {
                const { id, batch } = r.value;
                const reimbs: any[] = batch.reimbursements ?? [];
                const appr = reimbs.filter((x: any) => x.status === 1);
                const rej = reimbs.filter((x: any) => x.status === 2);
                map[id] = {
                  approved: appr.length,
                  rejected: rej.length,
                  approvedAmt: appr.reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
                  rejectedAmt: rej.reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
                };
              }
            }
            setBatchDetailsMap(map);
          });
        }
      }
    } catch {
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, domainTypes, mode]);

  useEffect(() => { load(activeTab); }, [activeTab]);

  // Auto-refresh when a new approval is pending for this approver
  useEffect(() => {
    const socket = getSocket();
    const handler = () => load();
    socket.on('approval:pending', handler);
    return () => { socket.off('approval:pending', handler); };
  }, [load]);

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

  const isReimbursementFlow = mode === 'include'
    ? domainTypes.includes('reimbursement')
    : !domainTypes.includes('reimbursement');

  const columns = useMemo<MRT_ColumnDef<ApprovalStep>[]>(() => [
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
          const count = ds._splitCount != null ? ds._splitCount : ds.requestDetails?.totalRequests;
          if (count == null) return <span className='text-muted fs-7'>—</span>;
          return (
            <span
              role='button'
              className='fw-bold fs-6 text-primary'
              style={{ cursor: 'pointer' }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setBatchDetailId(ds.instance.requestId);
                setBatchDetailInstanceId(ds.instance.id);
                setBatchDetailFilterStatus(ds._splitStatus ?? null);
              }}
            >
              {count}
            </span>
          );
        },
      } as MRT_ColumnDef<ApprovalStep>,
      {
        accessorKey: 'totalAmount',
        header: 'Total Amount',
        size: 150,
        Cell: ({ row }: any) => {
          const ds = row.original as DisplayStep;
          const amount = ds._splitAmount != null ? ds._splitAmount : ds.requestDetails?.totalAmount;
          if (amount == null) return <span className='text-muted fs-7'>—</span>;
          return <span className='text-dark fw-semibold fs-7'>₹{fmtAmount(amount)}</span>;
        },
      } as MRT_ColumnDef<ApprovalStep>
      
    ] : []),
    {
      accessorKey: 'workflowType',
      header: 'Type',
      size: 185,
      Cell: ({ row }) => {
        const type = row.original.instance.workflowType;
        const subType = row.original.requestDetails?.subType;

        let label: string;
        let color: string;

        // Attendance: a clean, labelled punch stack (Check-In / Check-Out + times) reads far
        // better than a generic "Regularization" badge and tells the approver exactly what's
        // requested at a glance.
        if (type === 'attendance') {
          const { checkIn, checkOut } = row.original.requestDetails ?? {};
          return <AttendancePunchStack checkIn={checkIn} checkOut={checkOut} />;
        }

        if (type === 'leave' && subType) {
          label = subType;
          color = getLeaveTypeColor(subType);
        } else if (type === 'reimbursement') {
          const ds = row.original as DisplayStep;
          if (ds._splitStatus) {
            label = ds._splitStatus === 1
              ? `Approved (${ds._splitCount ?? 0})`
              : `Rejected (${ds._splitCount ?? 0})`;
            color = ds._splitStatus === 1 ? '#10b981' : '#ef4444';
          } else {
            label = subType ?? 'Reimbursement';
            color = REIMBURSEMENT_BADGE_COLOR;
          }
        } else {
          label = subType ?? type;
          color = '#a1a5b7';
        }

        return (
          <span className='badge' style={{
            backgroundColor: color, color: 'white', fontWeight: 500,
            fontSize: 11, padding: '5px 8px', borderRadius: 12,
            display: 'inline-block', minWidth: 60, textAlign: 'center',
          }}>
            {label}
          </span>
        );
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
        const days = leaveDayCount(dateFrom, dateTo, isHalfDay);
        return (
          <div className='d-flex flex-column'>
            <span className='text-dark fw-semibold fs-7'>{from}</span>
            {isRange && <span className='text-muted fs-8'>→ {to}</span>}
            {isHalfDay ? (
              <span className='badge badge-light-primary fw-bold fs-8 mt-1 align-self-start'>
                ½ day{session === 'AM' || session === 'PM' ? ` (${session})` : ''}
              </span>
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
          return (
            <span className='badge badge-light-warning fw-semibold fs-8'>
              Awaiting L{step.instance.currentLevel}
            </span>
          );
        }
        if (activeTab === 'completed') {
          const ds = step as DisplayStep;
          const isApproved = ds._splitStatus === 1 || (ds._splitStatus == null && step.instance.status === 'approved');
          return (
            <span className={`badge ${isApproved ? 'badge-light-success' : 'badge-light-danger'} fw-semibold fs-8`}>
              {isApproved ? 'Approved' : 'Rejected'}
            </span>
          );
        }

        // Pending tab — show delegation badge if applicable
        return (
          <div className='d-flex align-items-center gap-1 flex-wrap'>
            {step.delegatedFrom && (
              <span className='badge badge-light-info fw-semibold fs-9 mb-1 w-100' title={`Delegated from ${step.delegatedFrom}`}>
                🔄 {step.delegatedFrom}
              </span>
            )}
            <button
              className='btn btn-icon btn-sm'
              title='Approve'
              disabled={isProcessing}
              onClick={(e) => { e.stopPropagation(); approve(step); }}
            >
              {isProcessing ? (
                <span className='spinner-border spinner-border-sm text-success' />
              ) : (
                <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt='' />
              )}
            </button>
            <button
              className='btn btn-icon btn-sm'
              title='Reject'
              disabled={isProcessing}
              onClick={(e) => { e.stopPropagation(); setRejectTarget(step); }}
            >
              <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt='' />
            </button>
          </div>
        );
      },
    },
  ], [processingId, leaveTypeColors, activeTab, isReimbursementFlow]);

  const displaySteps = useMemo<DisplayStep[]>(() => {
    if (activeTab !== 'completed') {
      return steps.map((s) => ({ ...s, _uid: s.id }));
    }
    const result: DisplayStep[] = [];
    for (const step of steps) {
      if (step.instance.workflowType !== 'reimbursement') {
        result.push({ ...step, _uid: step.id });
        continue;
      }
      const details = batchDetailsMap[step.instance.requestId];
      if (details && details.approved > 0 && details.rejected > 0) {
        result.push({
          ...step,
          id: `${step.id}-approved`,
          _uid: `${step.id}-approved`,
          _splitStatus: 1,
          _splitCount: details.approved,
          _splitAmount: details.approvedAmt,
        });
        result.push({
          ...step,
          id: `${step.id}-rejected`,
          _uid: `${step.id}-rejected`,
          _splitStatus: 2,
          _splitCount: details.rejected,
          _splitAmount: details.rejectedAmt,
        });
      } else {
        result.push({ ...step, _uid: step.id });
      }
    }
    return result;
  }, [steps, activeTab, batchDetailsMap]);

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

      <MaterialTable
        data={displaySteps}
        columns={columns}
        tableName='Approvals'
        hideFilters={false}
        hideExportCenter
        renderDetailPanel={({ row }: { row: MRT_Row<ApprovalStep> }) => (
          <ExpandedDetail
            instanceId={row.original.instance.id}
            splitStatus={(row.original as DisplayStep)._splitStatus}
            workflowType={row.original.instance.workflowType}
            details={row.original.requestDetails}
          />
        )}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }: any) => ({
            onClick: () => {
              const ds = row.original as DisplayStep;
              setBatchDetailId(ds.instance.requestId);
              setBatchDetailInstanceId(ds.instance.id);
              setBatchDetailFilterStatus(ds._splitStatus ?? null);
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

      <BatchDetailModal
        batchId={batchDetailId}
        onClose={() => { setBatchDetailId(null); setBatchDetailInstanceId(null); setBatchDetailFilterStatus(null); }}
        onBatchActionDone={() => load(activeTab)}
        approvalInstanceId={batchDetailInstanceId}
        filterStatus={batchDetailFilterStatus}
      />
    </>
  );
}

export default DomainApprovalQueue;
