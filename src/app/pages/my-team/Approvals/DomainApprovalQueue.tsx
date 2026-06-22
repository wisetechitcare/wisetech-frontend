import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { usePermission } from '@hooks/usePermission';
import { KTIcon, toAbsoluteUrl } from '@metronic/helpers';
import { fetchPendingApprovals, fetchAllApprovalInstances, processApprovalAction } from '@services/employee';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Modal } from 'react-bootstrap';
import { getSocket } from '@utils/socketClient';
import ApprovalStatusTracker from '@pages/approvals/ApprovalStatusTracker';

type RequestDetails = {
  subType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  reason?: string | null;
  description?: string | null;
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

const ATTENDANCE_BADGE_COLOR = '#f1bc00';
const REIMBURSEMENT_BADGE_COLOR = '#50cd89';
const CONVEYANCE_BADGE_COLOR = '#7239ea';

const MIN_REASON_LENGTH = 10;

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_REASON_LENGTH;
  const canSubmit = trimmed.length >= MIN_REASON_LENGTH && !submitting;

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
                placeholder='Describe why this request is being rejected (min 10 characters)…'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical', fontSize: 13 }}
                disabled={submitting}
              />
              {tooShort && (
                <div style={{ fontSize: 11, color: '#f1416c', marginTop: 4 }}>
                  Reason must be at least {MIN_REASON_LENGTH} characters ({trimmed.length}/{MIN_REASON_LENGTH})
                </div>
              )}
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

function ExpandedDetail({ instanceId }: { instanceId: string }) {
  return (
    <div style={{ padding: '16px 20px', background: '#fafafa', borderTop: '1px solid #eff2f5' }}>
      <ApprovalStatusTracker instanceId={instanceId} showAuditLog />
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
      setSteps(rows.filter((item: ApprovalStep) => {
        const workflowType = (item.instance.workflowType || '').toLowerCase();
        return mode === 'exclude' ? !domainTypes.includes(workflowType) : domainTypes.includes(workflowType);
      }));
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
    {
      accessorKey: 'workflowType',
      header: 'Type',
      size: 170,
      Cell: ({ row }) => {
        const type = row.original.instance.workflowType;
        const subType = row.original.requestDetails?.subType;

        let label: string;
        let color: string;

        if (type === 'leave' && subType) {
          label = subType;
          color = getLeaveTypeColor(subType);
        } else if (type === 'attendance') {
          label = subType ?? 'Regularization';
          color = ATTENDANCE_BADGE_COLOR;
        } else if (type === 'reimbursement') {
          label = subType ?? 'Reimbursement';
          color = REIMBURSEMENT_BADGE_COLOR;
        } else if (type === 'conveyance') {
          label = subType ?? 'Conveyance';
          color = CONVEYANCE_BADGE_COLOR;
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
        const { dateFrom, dateTo } = row.original.requestDetails ?? {};
        if (!dateFrom) return <span className='text-muted fs-7'>—</span>;
        const from = formatDate(dateFrom);
        const to = dateTo ? formatDate(dateTo) : null;
        return (
          <div className='d-flex flex-column'>
            <span className='text-dark fw-semibold fs-7'>{from}</span>
            {to && to !== from && <span className='text-muted fs-8'>→ {to}</span>}
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
          const isApproved = step.instance.status === 'approved';
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
              onClick={() => approve(step)}
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
              onClick={() => setRejectTarget(step)}
            >
              <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt='' />
            </button>
          </div>
        );
      },
    },
  ], [processingId, leaveTypeColors, activeTab]);

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
        data={steps}
        columns={columns}
        tableName='Approvals'
        hideFilters={false}
        hideExportCenter
        renderDetailPanel={({ row }: { row: MRT_Row<ApprovalStep> }) => (
          <ExpandedDetail instanceId={row.original.instance.id} />
        )}
      />

      <RejectModal
        step={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        submitting={rejectSubmitting}
      />
    </>
  );
}

export default DomainApprovalQueue;
