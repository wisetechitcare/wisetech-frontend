import React, { useEffect, useState } from 'react';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { AuditEntityType } from './audit.service';
import { useAuditTimeline, useAuditDiff } from './hooks';
import { DiffViewer, DiffMode } from './DiffViewer';
import { ResetModal } from './ResetModal';
import { initials, displayActor } from './tokens';
import { fromNow, fullDateTime } from './time';

/**
 * Version History — the default, business-user experience.
 *
 * Google-Docs-style: a clean vertical list of versions. Compare any version with
 * the current one; admins can "Reset to this version" (destructive hard reset).
 * No Git / rollback / audit terminology.
 */

interface Props {
  type: AuditEntityType;
  id: string;
  isAdmin: boolean;
}

// ── Compare drawer: Version N → Current ────────────────────────────────────────
const CompareDrawer: React.FC<{
  type: AuditEntityType;
  id: string;
  from: number;
  to: number;
  onClose: () => void;
}> = ({ type, id, from, to, onClose }) => {
  const diff = useAuditDiff(type, id, from, to);
  const [mode, setMode] = useState<DiffMode>('unified');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 1080, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="ci-fade-in"
        style={{ width: 'min(620px, 100%)', height: '100%', backgroundColor: C.bgCard, boxShadow: C.shadowModal, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: FONT.heading, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
            <i className="bi bi-arrow-left-right" style={{ marginRight: 8, color: C.primary }} aria-hidden />
            Version {from} vs Current (Version {to})
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...BTN.ghost, padding: 6, fontSize: 16 }}>
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {diff.isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
              <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Comparing…
            </div>
          ) : diff.isError ? (
            <div style={{ color: C.danger, fontFamily: FONT.body, fontSize: 13 }}>Couldn't compare these versions.</div>
          ) : diff.data ? (
            <DiffViewer result={diff.data} mode={mode} onModeChange={setMode} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── Version card ───────────────────────────────────────────────────────────────
const VersionCard: React.FC<{
  version: number;
  isCurrent: boolean;
  isLast: boolean;
  actor: string;
  actorInitials: string;
  changedAt: string;
  summary: string;
  fieldCount: number;
  canReset: boolean;
  onCompare: () => void;
  onReset: () => void;
}> = ({ version, isCurrent, isLast, actor, actorInitials, changedAt, summary, fieldCount, canReset, onCompare, onReset }) => (
  <div style={{ display: 'flex', gap: 14 }}>
    {/* Rail */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: '50%',
          backgroundColor: isCurrent ? C.primary : C.bgCard,
          border: `2px solid ${isCurrent ? C.primary : C.borderDark}`,
          marginTop: 18,
          flexShrink: 0,
        }}
      />
      {!isLast && <div style={{ flex: 1, width: 2, backgroundColor: C.border, marginTop: 2, minHeight: 24 }} />}
    </div>

    {/* Card */}
    <div
      style={{
        flex: 1,
        border: `1px solid ${isCurrent ? `${C.primary}40` : C.border}`,
        borderRadius: RADIUS.lg,
        backgroundColor: C.bgCard,
        padding: '12px 16px',
        marginBottom: 12,
        boxShadow: isCurrent ? `0 2px 10px ${C.primaryShadow}` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: C.primaryLight, color: C.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.heading, fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}
          aria-hidden
        >
          {actorInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.heading, fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>
              Version {version}
            </span>
            {isCurrent && (
              <span style={{ backgroundColor: C.successLight, color: '#0a7d33', fontFamily: FONT.body, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: RADIUS.full, letterSpacing: '0.3px' }}>
                CURRENT
              </span>
            )}
            <span title={fullDateTime(changedAt)} style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, marginLeft: 'auto' }}>
              {fromNow(changedAt)}
            </span>
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.textSecondary, marginTop: 3 }}>
            {summary}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, marginTop: 3 }}>
            by {actor} · {fieldCount} field{fieldCount === 1 ? '' : 's'} changed
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!isCurrent && (
              <button
                type="button"
                onClick={onCompare}
                style={{ ...BTN.outline, padding: '5px 12px', fontSize: 12 }}
              >
                <i className="bi bi-arrow-left-right" aria-hidden /> Compare
              </button>
            )}
            {canReset && (
              <button
                type="button"
                onClick={onReset}
                title="Reset the record to this version"
                style={{
                  background: 'transparent', color: C.danger, border: `1px solid ${C.danger}55`,
                  borderRadius: RADIUS.md, padding: '5px 12px', fontFamily: FONT.body, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset To This Version
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const VersionHistory: React.FC<Props> = ({ type, id, isAdmin }) => {
  const query = useAuditTimeline(type, id);
  const [compare, setCompare] = useState<{ from: number; to: number } | null>(null);
  const [resetTarget, setResetTarget] = useState<number | null>(null);

  if (query.isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        <i className="bi bi-arrow-repeat ci-spin" style={{ fontSize: 22 }} aria-hidden /> Loading version history…
      </div>
    );
  }
  if (query.isError) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        Couldn't load version history.
        <div><button type="button" style={{ ...BTN.outline, marginTop: 14 }} onClick={() => query.refetch()}><i className="bi bi-arrow-clockwise" aria-hidden /> Retry</button></div>
      </div>
    );
  }

  const versions = query.data?.pages.flatMap((p) => p.changeSets) ?? [];
  const currentVersion = versions.length > 0 ? versions[0].revisionNumber : 0;

  if (versions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: C.textMuted }}>
        <i className="bi bi-clock-history" style={{ fontSize: 30, display: 'block', marginBottom: 10 }} aria-hidden />
        <div style={{ fontFamily: FONT.heading, fontSize: 15, fontWeight: 700, color: C.textSecondary }}>No versions yet</div>
        <div style={{ fontFamily: FONT.body, fontSize: 13, marginTop: 4 }}>A version is saved each time this record is edited.</div>
      </div>
    );
  }

  // If oldest version > 1, insert a "System" placeholder for the initial creation
  const versionsWithSystem: typeof versions = versions;
  const oldestVersion = versions[versions.length - 1]?.revisionNumber ?? 1;
  if (oldestVersion > 1) {
    versionsWithSystem.push({
      id: 'system-init',
      revisionNumber: 1,
      changedAt: versions[versions.length - 1]?.changedAt ?? new Date().toISOString(),
      changedByEmployeeId: 'system',
      changedByFirstName: 'System',
      changedByLastName: '',
      summary: 'Record created',
      category: 'BASIC_INFO',
      changeSource: 'SYSTEM',
      changes: [],
    } as any);
  }

  return (
    <div className="ci-fade-in">
      {compare && (
        <CompareDrawer type={type} id={id} from={compare.from} to={compare.to} onClose={() => setCompare(null)} />
      )}
      {resetTarget != null && (
        <ResetModal
          type={type}
          id={id}
          targetVersion={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => query.refetch()}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted }}>
          {versionsWithSystem.length} version{versionsWithSystem.length === 1 ? '' : 's'}
        </span>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} style={{ ...BTN.ghost, padding: '5px 10px', fontSize: 12 }} title="Refresh">
          <i className={`bi bi-arrow-clockwise ${query.isFetching ? 'ci-spin' : ''}`} aria-hidden /> Refresh
        </button>
      </div>

      {versionsWithSystem.map((v, i) => (
        <VersionCard
          key={v.id}
          version={v.revisionNumber}
          isCurrent={v.revisionNumber === currentVersion}
          isLast={i === versionsWithSystem.length - 1 && !query.hasNextPage}
          actor={displayActor(v.changedByFirstName, v.changedByLastName)}
          actorInitials={initials(v.changedByFirstName, v.changedByLastName)}
          changedAt={v.changedAt}
          summary={v.summary}
          fieldCount={v.changes?.length ?? 0}
          canReset={isAdmin && v.revisionNumber !== currentVersion}
          onCompare={() => setCompare({ from: v.revisionNumber, to: currentVersion })}
          onReset={() => setResetTarget(v.revisionNumber)}
        />
      ))}

      {query.hasNextPage && (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button type="button" style={{ ...BTN.secondary }} disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            {query.isFetchingNextPage ? (
              <><i className="bi bi-arrow-repeat ci-spin" aria-hidden /> Loading…</>
            ) : (
              <><i className="bi bi-arrow-down-circle" aria-hidden /> Show older versions</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionHistory;
