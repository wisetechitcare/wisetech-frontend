import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { Check, CircleCheck, CircleX, X } from 'lucide-react';
import { cn } from '@/ds/lib/utils';
import { toneStyle, type Tone } from '@/ds/lib/tone';
import { Alert, AlertDescription, AlertTitle } from '@/ds/ui/alert';
import { Badge } from '@/ds/ui/badge';
import { Spinner } from '@/ds/ui/spinner';
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
  compact?: boolean;          // smaller variant used inside dialogs and side rails
  showAuditLog?: boolean;     // show the audit section below the stepper
  /** When provided, overrides the terminal banner status so the UI reflects the actual
   *  batch outcome even when the approval workflow instance has a different status
   *  (e.g. workflow approved but individual items were rejected). */
  overrideStatus?: 'approved' | 'rejected';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "05 Oct 2026, 11:39" — the same output the tracker always printed. */
const fmt = (d?: string | null) => (d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '—');
const fmtDate = (d?: string | null) => (d ? dayjs(d).format('DD MMM YYYY') : '—');

/** Status → kit tone (Badge variant / toneStyle). Pending is the brand blue it always was. */
const STATUS_TONE: Record<string, Tone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'info',
};

const ACTION_TONE: Record<string, Tone> = {
  approved: 'success',
  rejected: 'danger',
  created: 'info',
};

const WORKFLOW_LABELS: Record<string, string> = {
  leave: 'Leave',
  attendance: 'Attendance',
  reimbursement: 'Reimbursement',
  billing_request: 'Billing Request',
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Step node ───────────────────────────────────────────────────────────────

function StepNode({ step, isCurrent, compact, last }: { step: StepData; isCurrent: boolean; compact: boolean; last: boolean }) {
  const isApproved = step.status === 'approved';
  const isRejected = step.status === 'rejected';
  const isPending = step.status === 'pending';
  const awaiting = isCurrent && isPending;
  const tone: Tone = isApproved ? 'success' : isRejected ? 'danger' : awaiting ? 'info' : 'neutral';

  return (
    <li data-slot="approval-step" className={cn('relative flex items-start', compact ? 'gap-2.5 pb-3' : 'gap-3.5 pb-4', last && 'pb-0')}>
      {/* The connector to the next step: a rule from this circle down to the next one. */}
      {!last && (
        <span aria-hidden className={cn('absolute w-0.5 bg-border', compact ? 'top-8 bottom-0 left-[14px]' : 'top-10 bottom-0 left-[18px]')} />
      )}
      <span
        aria-hidden
        style={toneStyle(tone)}
        className={cn(
          'relative z-[1] grid shrink-0 place-items-center rounded-full text-xs font-bold',
          compact ? 'size-[30px]' : 'size-[38px] text-sm',
          isApproved || isRejected || awaiting ? 'bg-(--tone) text-white' : 'bg-muted text-muted-foreground',
          // The current level breathes, so the eye finds whose turn it is (still for reduced motion).
          awaiting && 'ring-4 ring-[color-mix(in_oklab,var(--tone)_20%,transparent)] motion-safe:animate-pulse',
        )}
      >
        {isApproved ? <Check className="size-4" strokeWidth={3} /> : isRejected ? <X className="size-4" strokeWidth={3} /> : step.level}
      </span>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
            Level {step.level} — {step.approverName}
          </span>
          <Badge variant={tone}>{awaiting ? 'Awaiting' : titleCase(step.status)}</Badge>
        </div>
        {step.actedAt && (
          <p className={cn('m-0 mt-0.5 text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{fmt(step.actedAt)}</p>
        )}
        {!step.actedAt && awaiting && (
          <p className={cn('m-0 mt-0.5 text-info-foreground', compact ? 'text-[11px]' : 'text-xs')}>
            Pending action from {step.approverName}
          </p>
        )}
        {isRejected && step.comments && (
          <Alert variant="danger" role="note" className="mt-2 py-2">
            <AlertTitle className="text-xs">Rejection Reason</AlertTitle>
            <AlertDescription className="text-xs text-foreground">{step.comments}</AlertDescription>
          </Alert>
        )}
        {isApproved && step.comments && (
          <Alert variant="success" role="note" className="mt-2 py-2">
            <AlertDescription className="text-xs text-foreground">{step.comments}</AlertDescription>
          </Alert>
        )}
      </div>
    </li>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * Where an approval request stands: one row per level (who, their decision, when, their note), the
 * outcome, and — optionally — the audit trail. Live: it reloads on `approval:updated` /
 * `approval:cancelled` for its instance.
 *
 * Shared by every approval surface (leave, attendance, billing, reimbursement, the approvals queue).
 * On the design system: kit Badge / Alert / Spinner and the status tones, light and dark — it was
 * inline styles in fixed Metronic hex colours, a Bootstrap spinner and a `<style>` block.
 */
function ApprovalStatusTracker({ instanceId, compact = false, showAuditLog = false, overrideStatus }: Props) {
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
    socket.on('approval:cancelled', handler);
    return () => {
      socket.off('approval:updated', handler);
      socket.off('approval:cancelled', handler);
    };
  }, [instanceId, load]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center gap-2 text-sm text-muted-foreground', compact ? 'py-3' : 'py-5')}>
        <Spinner className="size-4 text-primary" />
        Loading Status…
      </div>
    );
  }

  if (error || !data) {
    return <p className="m-0 py-3 text-sm text-muted-foreground">Status Unavailable</p>;
  }

  const { instance, steps, auditLogs } = data;
  const overallStatus = instance.status;
  const effectiveStatus = overrideStatus ?? overallStatus;
  const rd = instance.requestDetails;
  const overallLabel = effectiveStatus === 'pending'
    ? `Level ${instance.currentLevel} of ${instance.totalLevels}`
    : titleCase(effectiveStatus);
  const rejectedStep = steps.find((s) => s.status === 'rejected');

  return (
    <div data-slot="approval-status-tracker">
      {/* ── Header ── */}
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <Badge variant="info">{WORKFLOW_LABELS[instance.workflowType] ?? instance.workflowType}</Badge>
          {rd?.subType && <Badge variant="neutral">{rd.subType}</Badge>}
          <Badge variant={STATUS_TONE[effectiveStatus] ?? 'neutral'} dot className="ml-auto">{overallLabel}</Badge>
        </div>
      )}

      {/* ── Request summary ── */}
      {!compact && rd && (rd.dateFrom || rd.reason || rd.description) && (
        <dl className="mb-4 flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-foreground">
          {rd.dateFrom && (
            <div className="flex gap-1"><dt className="font-semibold text-muted-foreground">From:</dt><dd className="m-0">{fmtDate(rd.dateFrom)}</dd></div>
          )}
          {rd.dateTo && rd.dateTo !== rd.dateFrom && (
            <div className="flex gap-1"><dt className="font-semibold text-muted-foreground">To:</dt><dd className="m-0">{fmtDate(rd.dateTo)}</dd></div>
          )}
          {(rd.reason || rd.description) && (
            <div className="flex gap-1"><dt className="font-semibold text-muted-foreground">Reason:</dt><dd className="m-0">{rd.reason ?? rd.description}</dd></div>
          )}
        </dl>
      )}

      {/* ── Stepper ── */}
      <ol aria-label="Approval levels" className="m-0 list-none p-0">
        {steps.map((step, i) => (
          <StepNode
            key={step.id}
            step={step}
            isCurrent={step.level === instance.currentLevel && overallStatus === 'pending'}
            compact={compact}
            last={i === steps.length - 1}
          />
        ))}
      </ol>

      {/* ── Outcome ── */}
      {effectiveStatus === 'approved' && (
        <Alert variant="success" role="status" className="mt-3">
          <CircleCheck aria-hidden />
          <AlertTitle>Request Fully Approved</AlertTitle>
        </Alert>
      )}
      {effectiveStatus === 'rejected' && overallStatus === 'rejected' && (
        <Alert variant="danger" role="status" className="mt-3">
          <CircleX aria-hidden />
          <AlertTitle>
            {rejectedStep ? `Rejected at Level ${rejectedStep.level} by ${rejectedStep.approverName}` : 'Request Rejected'}
          </AlertTitle>
        </Alert>
      )}
      {effectiveStatus === 'rejected' && overallStatus === 'approved' && (
        <Alert variant="danger" role="status" className="mt-3">
          <CircleX aria-hidden />
          <AlertTitle>Items Rejected Individually During Batch Review</AlertTitle>
        </Alert>
      )}

      {/* ── Audit trail ── */}
      {showAuditLog && auditLogs.length > 0 && (
        <section aria-label="Audit trail" className="mt-5">
          <h4 className="heading-case m-0 mb-2 text-xs font-bold text-muted-foreground">Audit Trail</h4>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-xs text-foreground">
                <span className="min-w-32 text-muted-foreground tabular">{fmt(log.createdAt)}</span>
                <span className="min-w-24 font-semibold">{log.actorName}</span>
                <Badge variant={ACTION_TONE[log.action] ?? 'neutral'}>{titleCase(log.action)}</Badge>
                {log.comments && <span className="text-muted-foreground italic">“{log.comments}”</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default ApprovalStatusTracker;
