import React from 'react';
import { C, FONT, RADIUS, BTN } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2ChangeSet } from './types';
import { initials, displayActor } from './designTokens';
import { fromNow, fullDateTime } from './time';

interface Props {
  versions: V2ChangeSet[];
  isAdmin: boolean;
  onCompare: (version: number) => void;
  onReset: (version: number) => void;
}

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
      <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: isCurrent ? C.primary : C.bgCard, border: `2px solid ${isCurrent ? C.primary : C.borderDark}`, marginTop: 18, flexShrink: 0 }} />
      {!isLast && <div style={{ flex: 1, width: 2, backgroundColor: C.border, marginTop: 2, minHeight: 24 }} />}
    </div>

    <div style={{ flex: 1, border: `1px solid ${isCurrent ? `${C.primary}40` : C.border}`, borderRadius: RADIUS.lg, backgroundColor: C.bgCard, padding: '12px 16px', marginBottom: 12, boxShadow: isCurrent ? `0 2px 10px ${C.primaryShadow}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.heading, fontWeight: 700, fontSize: 12, flexShrink: 0 }} aria-hidden>
          {actorInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.heading, fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>Version {version}</span>
            {isCurrent && (
              <span style={{ backgroundColor: C.successLight, color: '#0a7d33', fontFamily: FONT.body, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: RADIUS.full, letterSpacing: '0.3px' }}>CURRENT</span>
            )}
            <span title={fullDateTime(changedAt)} style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, marginLeft: 'auto' }}>{fromNow(changedAt)}</span>
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.textSecondary, marginTop: 3 }}>{summary}</div>
          <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, marginTop: 3 }}>by {actor} · {fieldCount} field{fieldCount === 1 ? '' : 's'} changed</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!isCurrent && (
              <button type="button" onClick={onCompare} style={{ ...BTN.outline, padding: '5px 12px', fontSize: 12 }}>
                <i className="bi bi-arrow-left-right" aria-hidden /> Compare
              </button>
            )}
            {canReset && (
              <button type="button" onClick={onReset} title="Reset the record to this version" style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}55`, borderRadius: RADIUS.md, padding: '5px 12px', fontFamily: FONT.body, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <i className="bi bi-arrow-counterclockwise" aria-hidden /> Reset To This Version
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const VersionHistoryView: React.FC<Props> = ({ versions, isAdmin, onCompare, onReset }) => {
  const currentVersion = versions[0]?.revisionNumber ?? 0;
  return (
    <div className="ci-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted }}>{versions.length} versions</span>
        <button type="button" style={{ ...BTN.ghost, padding: '5px 10px', fontSize: 12 }} title="Refresh">
          <i className="bi bi-arrow-clockwise" aria-hidden /> Refresh
        </button>
      </div>

      {versions.map((v, i) => (
        <VersionCard
          key={v.id}
          version={v.revisionNumber}
          isCurrent={v.revisionNumber === currentVersion}
          isLast={i === versions.length - 1}
          actor={displayActor(v.changedByFirstName, v.changedByLastName)}
          actorInitials={initials(v.changedByFirstName, v.changedByLastName)}
          changedAt={v.changedAt}
          summary={v.summary}
          fieldCount={v.changes?.length ?? 0}
          canReset={isAdmin && v.revisionNumber !== currentVersion}
          onCompare={() => onCompare(v.revisionNumber)}
          onReset={() => onReset(v.revisionNumber)}
        />
      ))}
    </div>
  );
};

export default VersionHistoryView;
