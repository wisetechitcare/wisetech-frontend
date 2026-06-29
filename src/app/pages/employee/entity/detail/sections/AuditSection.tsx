import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { DetailCard } from '@/app/modules/detail-page/DetailPageComponents';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType, AuditV2Api } from '@/modules/revisions/v2/auditV2.service';
import { AuditTimeline } from '@/modules/revisions/v2/AuditTimeline';
import { ComparePanel } from '@/modules/revisions/v2/ComparePanel';
import { ResetModal } from '@/modules/revisions/v2/ResetModal';
import { AuditInsights } from '@/modules/revisions/v2/AuditInsights';
import { useAuditViewer } from '@/modules/revisions/v2/hooks';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

type Mode = 'timeline' | 'compare' | 'insights';

/**
 * Audit tab — Change Intelligence v2 surface.
 *
 * Replaces the legacy inline implementation. Consumes the authorized /api/v2/audit
 * API, reuses the app's detail-page design system, and offers two modes:
 *   • Timeline — infinite, expandable ChangeSet feed with actor/device context
 *   • Compare  — diff any two revisions (unified / side-by-side)
 */

interface AuditSectionProps {
  leadId?: string;
  isProject?: boolean;
  projectId?: string;
  /** Called after a reset rewinds the entity, so the parent page can refetch. */
  onChanged?: () => void;
}

const KEYFRAMES = `
  @keyframes ciFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ciPulse  { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
  @keyframes ciSpin   { to { transform: rotate(360deg); } }
  .ci-fade-in { animation: ciFadeIn .25s ease; }
  .ci-pulse   { animation: ciPulse 1.2s ease-in-out infinite; }
  .ci-spin    { display: inline-block; animation: ciSpin .8s linear infinite; }
  .ci-card    { transition: box-shadow .2s ease, border-color .2s ease; }
  .ci-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
  @media (prefers-reduced-motion: reduce) {
    .ci-fade-in, .ci-pulse, .ci-spin { animation: none !important; }
  }
`;

const ModeToggle: React.FC<{ mode: Mode; onChange: (m: Mode) => void }> = ({
  mode,
  onChange,
}) => {
  const btn = (key: Mode, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => onChange(key)}
      aria-pressed={mode === key}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        border: 'none',
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        fontFamily: FONT.body,
        fontSize: 12.5,
        fontWeight: 600,
        backgroundColor: mode === key ? C.bgCard : 'transparent',
        color: mode === key ? C.primary : C.textSecondary,
        boxShadow: mode === key ? C.shadowSm : 'none',
      }}
    >
      <i className={icon} style={{ fontSize: 12 }} aria-hidden />
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 3, backgroundColor: C.bgSection, padding: 3, borderRadius: RADIUS.md }}>
      {btn('timeline', 'bi bi-list-ul', 'Timeline')}
      {btn('compare', 'bi bi-file-earmark-diff', 'Compare')}
      {btn('insights', 'bi bi-bar-chart', 'Insights')}
    </div>
  );
};

const AuditSection: React.FC<AuditSectionProps> = ({ leadId, projectId, onChanged }) => {
  // Lead-as-master: a project IS a Received lead, audited under the LEAD entity. The
  // entity always has a lead id (a `projectId` here is that same lead's id), so audit
  // reads are always scoped to LEAD — the PROJECT audit entity type has been retired.
  const entityType: AuditEntityType = 'LEAD';
  const entityId = leadId ?? projectId;

  const [mode, setMode] = useState<Mode>('timeline');
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [resetTarget, setResetTarget] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const viewer = useAuditViewer();
  const canReset = !!viewer.data?.isAdmin;

  const handleCompare = (rev: number) => {
    setFrom(Math.max(0, rev - 1));
    setTo(rev);
    setMode('compare');
  };

  // Admin-only tamper check: recompute the hash chain and report any break.
  const handleVerify = async () => {
    if (!entityId || verifying) return;
    setVerifying(true);
    try {
      const res = await AuditV2Api.verifyChain(entityType, entityId);
      if (res.intact) {
        toast.success(
          `Audit chain intact — ${res.verified} revision(s) verified` +
            (res.unhashed ? `, ${res.unhashed} pre-chain` : ''),
        );
      } else {
        const first = res.breaks[0];
        toast.error(
          `Tamper detected: ${res.breaks.length} break(s)` +
            (first ? ` — first at Version ${first.revisionNumber} (${first.reason})` : ''),
        );
      }
    } catch (e: any) {
      toast.error(e?.message || 'Chain verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const Actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {canReset && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          title="Recompute the audit hash chain to detect any tampering"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md,
            cursor: verifying ? 'default' : 'pointer',
            fontFamily: FONT.body,
            fontSize: 12.5,
            fontWeight: 600,
            backgroundColor: 'transparent',
            color: C.textSecondary,
            opacity: verifying ? 0.6 : 1,
          }}
        >
          <i className={verifying ? 'bi bi-arrow-repeat ci-spin' : 'bi bi-shield-check'} aria-hidden />
          {verifying ? 'Verifying…' : 'Verify integrity'}
        </button>
      )}
      <ModeToggle mode={mode} onChange={setMode} />
    </div>
  );

  if (!entityId) {
    return (
      <DetailCard title="Audit Trail" subtitle="Change history" icon="bi bi-file-earmark-diff" accentColor="primary">
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          No record selected.
        </div>
      </DetailCard>
    );
  }

  return (
    <DetailCard
      title="Audit Trail"
      subtitle="Who changed what, when & why"
      icon="bi bi-file-earmark-diff"
      accentColor="primary"
      actions={Actions}
    >
      <style>{KEYFRAMES}</style>
      {resetTarget != null && (
        <ResetModal
          type={entityType}
          id={entityId}
          targetVersion={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => {
            // The entity was rewound — make the whole detail page (header revision
            // number, Summary, form) refetch immediately, no manual refresh needed.
            // Direct callback is the guaranteed path; the event bus is a backup for
            // any other open listeners (lists, badges).
            onChanged?.();
            eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId || entityId });
            eventBus.emit(EVENT_KEYS.projectUpdated, { id: projectId || entityId });
          }}
        />
      )}
      <div style={{ paddingTop: 6 }}>
        {mode === 'timeline' && (
          <AuditTimeline
            type={entityType}
            id={entityId}
            onCompare={handleCompare}
            onReset={canReset ? setResetTarget : undefined}
          />
        )}
        {mode === 'compare' && (
          <ComparePanel
            type={entityType}
            id={entityId}
            from={from}
            to={to}
            onApply={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
            onReset={setResetTarget}
            canReset={canReset}
          />
        )}
        {mode === 'insights' && <AuditInsights type={entityType} id={entityId} />}
      </div>
    </DetailCard>
  );
};

export default AuditSection;
