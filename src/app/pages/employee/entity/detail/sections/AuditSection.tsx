import React, { useState } from 'react';
import { DetailCard } from '@/app/modules/detail-page/DetailPageComponents';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from '@/modules/revisions/v2/auditV2.service';
import { AuditTimeline } from '@/modules/revisions/v2/AuditTimeline';
import { DiffViewer, DiffMode } from '@/modules/revisions/v2/DiffViewer';
import { RestoreDrawer } from '@/modules/revisions/v2/RestoreDrawer';
import { AuditInsights } from '@/modules/revisions/v2/AuditInsights';
import { useAuditDiff, useAuditTimeline, useAuditViewer } from '@/modules/revisions/v2/hooks';

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
}

const KEYFRAMES = `
  @keyframes ciFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ciPulse  { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
  @keyframes ciSpin   { to { transform: rotate(360deg); } }
  .ci-fade-in { animation: ciFadeIn .25s ease; }
  .ci-pulse   { animation: ciPulse 1.2s ease-in-out infinite; }
  .ci-spin    { display: inline-block; animation: ciSpin .8s linear infinite; }
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

const ComparePanel: React.FC<{
  type: AuditEntityType;
  id: string;
  from: number | null;
  to: number | null;
  onApply: (from: number, to: number) => void;
  onRestore: (rev: number) => void;
}> = ({ type, id, from, to, onApply, onRestore }) => {
  const [inFrom, setInFrom] = useState(from != null ? String(from) : '0');
  const [inTo, setInTo] = useState(to != null ? String(to) : '');
  const [diffMode, setDiffMode] = useState<DiffMode>('unified');
  const timeline = useAuditTimeline(type, id);
  const diff = useAuditDiff(type, id, from, to);

  const allRevisions = timeline.data?.pages.flatMap((p) => p.changeSets) ?? [];
  const revisions = allRevisions.map((cs) => cs.revisionNumber).sort((a, b) => a - b) ?? [];
  const currentRevision = allRevisions.length > 0 ? allRevisions[0]?.revisionNumber : null;

  const dropdownStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: RADIUS.md,
    fontFamily: FONT.body,
    fontSize: 13,
    color: C.textPrimary,
    minWidth: 140,
    backgroundColor: C.bgCard,
    cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ backgroundColor: C.bgSection, borderRadius: RADIUS.lg, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary }}>
            <div style={{ marginBottom: 6, fontWeight: 600, color: C.textPrimary }}>From revision</div>
            <select value={inFrom} onChange={(e) => setInFrom(e.target.value)} style={dropdownStyle}>
              <option value="0">Original (R0)</option>
              {revisions.map((rev) => (
                <option key={rev} value={String(rev)}>
                  R{rev}
                </option>
              ))}
            </select>
          </label>
          <i className="bi bi-arrow-right" style={{ color: C.primary, marginBottom: 2, fontSize: 16 }} aria-hidden />
          <label style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary }}>
            <div style={{ marginBottom: 6, fontWeight: 600, color: C.textPrimary }}>To revision</div>
            <select value={inTo} onChange={(e) => setInTo(e.target.value)} style={dropdownStyle}>
              <option value="">-- Select --</option>
              {revisions.map((rev) => (
                <option key={rev} value={String(rev)}>
                  R{rev}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            style={{ ...BTN.primary, marginBottom: 0, padding: '10px 20px' }}
            disabled={inFrom === '' || inTo === ''}
            onClick={() => onApply(parseInt(inFrom, 10) || 0, parseInt(inTo, 10) || 0)}
          >
            <i className="bi bi-arrow-left-right" aria-hidden /> Compare
          </button>
        </div>
      </div>

      {from == null || to == null ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          <i className="bi bi-file-earmark-diff" style={{ fontSize: 26, display: 'block', marginBottom: 8 }} aria-hidden />
          Pick two revisions to compare.
        </div>
      ) : diff.isLoading ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
          <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Computing diff…
        </div>
      ) : diff.isError ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: C.danger, fontFamily: FONT.body, fontSize: 13 }}>
          Couldn't compute the diff (check the revision range).
        </div>
      ) : diff.data ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            {from != null && from >= 0 && from !== currentRevision && (
              <button
                type="button"
                onClick={() => onRestore(from)}
                title={
                  from === 0
                    ? 'Revert to the original values (before the first change)'
                    : `Restore the record to revision ${from}`
                }
                style={{
                  background: 'transparent',
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.md,
                  padding: '6px 12px',
                  fontFamily: FONT.body,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> {from === 0 ? 'Restore to original' : `Restore to R${from}`}
              </button>
            )}
            {to != null && to >= 1 && to !== currentRevision && (
              <button
                type="button"
                onClick={() => onRestore(to)}
                title={`Restore the record to revision ${to}`}
                style={{
                  background: 'transparent',
                  color: C.primary,
                  border: `1px solid ${C.primary}`,
                  borderRadius: RADIUS.md,
                  padding: '6px 12px',
                  fontFamily: FONT.body,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> Restore to R{to}
              </button>
            )}
          </div>
          <DiffViewer result={diff.data} mode={diffMode} onModeChange={setDiffMode} />
        </>
      ) : null}
    </div>
  );
};

const AuditSection: React.FC<AuditSectionProps> = ({ leadId, projectId }) => {
  const entityType: AuditEntityType = !leadId && projectId ? 'PROJECT' : 'LEAD';
  const entityId = entityType === 'PROJECT' ? projectId : leadId;

  const [mode, setMode] = useState<Mode>('timeline');
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [restoreRev, setRestoreRev] = useState<number | null>(null);

  const handleCompare = (rev: number) => {
    setFrom(Math.max(0, rev - 1));
    setTo(rev);
    setMode('compare');
  };

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
      actions={<ModeToggle mode={mode} onChange={setMode} />}
    >
      <style>{KEYFRAMES}</style>
      {restoreRev != null && (
        <RestoreDrawer
          type={entityType}
          id={entityId}
          targetRev={restoreRev}
          onClose={() => setRestoreRev(null)}
        />
      )}
      <div style={{ paddingTop: 6 }}>
        {mode === 'timeline' && (
          <AuditTimeline type={entityType} id={entityId} onCompare={handleCompare} onRestore={setRestoreRev} />
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
            onRestore={setRestoreRev}
          />
        )}
        {mode === 'insights' && <AuditInsights type={entityType} id={entityId} />}
      </div>
    </DetailCard>
  );
};

export default AuditSection;
