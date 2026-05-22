import { useEffect, useState, useCallback } from 'react';
import { fetchApprovalStatus } from '@services/employee';
import { getSocket } from '@utils/socketClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestDetails {
  subType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  reason?: string | null;
  description?: string | null;
}

interface StepData {
  id: string;
  level: number;
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  actedAt?: string | null;
  comments?: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  actorName: string;
  level?: number | null;
  comments?: string | null;
  createdAt: string;
}

interface InstanceStatus {
  instance: {
    id: string;
    workflowType: string;
    currentLevel: number;
    totalLevels: number;
    status: string;
    createdAt: string;
    requesterName: string;
    requestDetails?: RequestDetails | null;
  };
  steps: StepData[];
  auditLogs: AuditEntry[];
}

interface Props {
  instanceId: string;
  compact?: boolean;          // smaller variant used inside the reject modal
  showAuditLog?: boolean;     // show the audit section below the stepper
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#50cd89',
  rejected: '#f1416c',
  pending: '#009ef7',
};

const WORKFLOW_LABELS: Record<string, string> = {
  leave: 'Leave',
  attendance: 'Attendance',
  reimbursement: 'Reimbursement',
  conveyance: 'Conveyance',
};

// ─── Step node ────────────────────────────────────────────────────────────────

function StepNode({ step, isCurrent, compact }: { step: StepData; isCurrent: boolean; compact: boolean }) {
  const isApproved = step.status === 'approved';
  const isRejected = step.status === 'rejected';
  const isPending = step.status === 'pending';

  let circleColor = '#e4e6ef';
  let iconContent: React.ReactNode = <span style={{ color: '#a1a5b7', fontWeight: 700, fontSize: compact ? 11 : 13 }}>{step.level}</span>;

  if (isApproved) {
    circleColor = '#50cd89';
    iconContent = <span style={{ color: 'white', fontWeight: 700, fontSize: compact ? 11 : 14 }}>✓</span>;
  } else if (isRejected) {
    circleColor = '#f1416c';
    iconContent = <span style={{ color: 'white', fontWeight: 700, fontSize: compact ? 11 : 14 }}>✕</span>;
  } else if (isCurrent) {
    circleColor = '#009ef7';
    iconContent = <span style={{ color: 'white', fontWeight: 700, fontSize: compact ? 11 : 13 }}>{step.level}</span>;
  }

  const circleSize = compact ? 30 : 38;

  return (
    <div style={{ display: 'flex', gap: compact ? 10 : 14, alignItems: 'flex-start', marginBottom: compact ? 10 : 16 }}>
      {/* Circle + connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: circleSize, height: circleSize, borderRadius: '50%',
          backgroundColor: circleColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isCurrent && isPending ? `0 0 0 4px rgba(0,158,247,0.15)` : 'none',
          transition: 'box-shadow 0.3s ease',
          animation: isCurrent && isPending ? 'pulse-ring 2s infinite' : 'none',
        }}>
          {iconContent}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: compact ? 8 : 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: compact ? 12 : 14, color: '#181c32' }}>
            Level {step.level} — {step.approverName}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            backgroundColor: isApproved ? '#e8fff3' : isRejected ? '#fff5f8' : isCurrent ? '#f1faff' : '#f5f5f5',
            color: isApproved ? '#50cd89' : isRejected ? '#f1416c' : isCurrent ? '#009ef7' : '#a1a5b7',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {isCurrent && isPending ? 'Awaiting' : step.status}
          </span>
        </div>

        {step.actedAt && (
          <div style={{ fontSize: compact ? 11 : 12, color: '#a1a5b7', marginTop: 2 }}>
            {fmt(step.actedAt)}
          </div>
        )}

        {!step.actedAt && isCurrent && (
          <div style={{ fontSize: compact ? 11 : 12, color: '#009ef7', marginTop: 2 }}>
            Pending action from {step.approverName}
          </div>
        )}

        {isRejected && step.comments && (
          <div style={{
            marginTop: 6, padding: compact ? '6px 10px' : '8px 12px',
            backgroundColor: '#fff5f8', border: '1px solid #f1416c33',
            borderRadius: 6, borderLeft: '3px solid #f1416c',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f1416c', textTransform: 'uppercase', marginBottom: 2 }}>
              Rejection Reason
            </div>
            <div style={{ fontSize: compact ? 11 : 12, color: '#3f4254' }}>{step.comments}</div>
          </div>
        )}

        {isApproved && step.comments && (
          <div style={{
            marginTop: 6, padding: compact ? '5px 10px' : '6px 12px',
            backgroundColor: '#e8fff3', borderRadius: 6,
            fontSize: compact ? 11 : 12, color: '#3f4254',
            borderLeft: '3px solid #50cd89',
          }}>
            {step.comments}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function ApprovalStatusTracker({ instanceId, compact = false, showAuditLog = false }: Props) {
  const [data, setData] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetchApprovalStatus(instanceId);
      setData(res?.data ?? res ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => { load(); }, [load]);

  // Real-time refresh when this instance changes
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: any) => {
      if (payload?.instanceId === instanceId) load();
    };
    socket.on('approval:updated', handler);
    return () => { socket.off('approval:updated', handler); };
  }, [instanceId, load]);

  if (loading) {
    return (
      <div style={{ padding: compact ? '12px 0' : '20px 0', textAlign: 'center' }}>
        <span className='spinner-border spinner-border-sm text-primary me-2' />
        <span style={{ fontSize: 13, color: '#a1a5b7' }}>Loading status...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '12px 0', color: '#a1a5b7', fontSize: 13 }}>
        Status unavailable
      </div>
    );
  }

  const { instance, steps, auditLogs } = data;
  const overallStatus = instance.status;
  const rd = instance.requestDetails;

  const overallColor = STATUS_COLORS[overallStatus] ?? '#a1a5b7';
  const overallLabel = overallStatus === 'pending'
    ? `Level ${instance.currentLevel} of ${instance.totalLevels}`
    : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1);

  return (
    <div>
      {/* ── Header ── */}
      {!compact && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #eff2f5',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            backgroundColor: '#f1faff', color: '#009ef7', textTransform: 'uppercase',
          }}>
            {WORKFLOW_LABELS[instance.workflowType] ?? instance.workflowType}
          </span>

          {rd?.subType && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              backgroundColor: '#f5f5f5', color: '#3f4254',
            }}>
              {rd.subType}
            </span>
          )}

          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            backgroundColor: overallStatus === 'approved' ? '#e8fff3'
              : overallStatus === 'rejected' ? '#fff5f8' : '#f1faff',
            color: overallColor,
            textTransform: 'uppercase', marginLeft: 'auto',
          }}>
            {overallLabel}
          </span>
        </div>
      )}

      {/* ── Request summary ── */}
      {!compact && rd && (rd.dateFrom || rd.reason || rd.description) && (
        <div style={{
          background: '#f8f9fa', borderRadius: 8, padding: '10px 14px',
          marginBottom: 16, fontSize: 12, color: '#3f4254',
          display: 'flex', gap: 20, flexWrap: 'wrap',
        }}>
          {rd.dateFrom && (
            <div>
              <span style={{ color: '#a1a5b7', fontWeight: 600 }}>From: </span>
              <span>{fmtDate(rd.dateFrom)}</span>
            </div>
          )}
          {rd.dateTo && rd.dateTo !== rd.dateFrom && (
            <div>
              <span style={{ color: '#a1a5b7', fontWeight: 600 }}>To: </span>
              <span>{fmtDate(rd.dateTo)}</span>
            </div>
          )}
          {(rd.reason || rd.description) && (
            <div>
              <span style={{ color: '#a1a5b7', fontWeight: 600 }}>Reason: </span>
              <span>{rd.reason ?? rd.description}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Stepper ── */}
      <div style={{ position: 'relative' }}>
        {/* Vertical connector line */}
        <div style={{
          position: 'absolute',
          left: compact ? 14 : 18,
          top: compact ? 15 : 19,
          bottom: compact ? 15 : 19,
          width: 2,
          backgroundColor: '#eff2f5',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {steps.map((step) => (
            <StepNode
              key={step.id}
              step={step}
              isCurrent={step.level === instance.currentLevel && overallStatus === 'pending'}
              compact={compact}
            />
          ))}
        </div>
      </div>

      {/* ── Terminal banner ── */}
      {overallStatus === 'approved' && (
        <div style={{
          marginTop: 8, padding: compact ? '8px 12px' : '12px 16px',
          backgroundColor: '#e8fff3', borderRadius: 8,
          border: '1px solid #50cd8933',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#50cd89', fontSize: 18 }}>✓</span>
          <span style={{ color: '#50cd89', fontWeight: 600, fontSize: compact ? 12 : 14 }}>
            Request fully approved
          </span>
        </div>
      )}

      {overallStatus === 'rejected' && (
        <div style={{
          marginTop: 8, padding: compact ? '8px 12px' : '12px 16px',
          backgroundColor: '#fff5f8', borderRadius: 8,
          border: '1px solid #f1416c33',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#f1416c', fontSize: 18 }}>✕</span>
          <span style={{ color: '#f1416c', fontWeight: 600, fontSize: compact ? 12 : 14 }}>
            Request rejected
          </span>
        </div>
      )}

      {/* ── Audit log summary ── */}
      {showAuditLog && auditLogs.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#a1a5b7', textTransform: 'uppercase',
            letterSpacing: '0.5px', marginBottom: 8,
          }}>
            Audit Trail
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                fontSize: 12, color: '#3f4254', padding: '6px 0',
                borderBottom: '1px solid #f5f5f5',
              }}>
                <span style={{ color: '#a1a5b7', minWidth: 130 }}>{fmt(log.createdAt)}</span>
                <span style={{ fontWeight: 600, minWidth: 100 }}>{log.actorName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  backgroundColor: log.action === 'approved' ? '#e8fff3'
                    : log.action === 'rejected' ? '#fff5f8'
                    : log.action === 'created' ? '#f1faff' : '#f5f5f5',
                  color: log.action === 'approved' ? '#50cd89'
                    : log.action === 'rejected' ? '#f1416c'
                    : log.action === 'created' ? '#009ef7' : '#a1a5b7',
                  textTransform: 'uppercase', minWidth: 64, textAlign: 'center',
                }}>
                  {log.action}
                </span>
                {log.comments && (
                  <span style={{ color: '#a1a5b7', fontStyle: 'italic', fontSize: 11 }}>
                    "{log.comments}"
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pulse animation for current-level indicator */}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(0,158,247,0.3); }
          70% { box-shadow: 0 0 0 8px rgba(0,158,247,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,158,247,0); }
        }
      `}</style>
    </div>
  );
}

export default ApprovalStatusTracker;
