import React from 'react';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2ChangeSet } from './types';
import { CategoryBadge, ChangeTypeChip, ValueDelta } from './parts';
import { initials, displayActor } from './designTokens';
import { fromNow, fullDateTime } from './time';

interface Props {
  cs: V2ChangeSet;
  expanded: boolean;
  onToggle: () => void;
  onCompare: (revisionNumber: number) => void;
  onRestore?: (revisionNumber: number) => void;
}

const PREVIEW_COUNT = 3;

const ContextChip: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.body, fontSize: 11, fontWeight: 500, color: C.textMuted, backgroundColor: C.bgSection, padding: '3px 8px', borderRadius: RADIUS.sm }}>
    <i className={icon} style={{ fontSize: 11 }} aria-hidden />
    {text}
  </span>
);

export const ChangeSetCard: React.FC<Props> = ({ cs, expanded, onToggle, onCompare, onRestore }) => {
  const changes = cs.changes ?? [];
  const shown = expanded ? changes : changes.slice(0, PREVIEW_COUNT);
  const hiddenCount = changes.length - shown.length;

  return (
    <div className="ci-fade-in" style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, backgroundColor: C.bgCard, marginBottom: 12, overflow: 'hidden', transition: 'box-shadow 0.2s ease' }}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT.heading, fontWeight: 700, fontSize: 14 }} aria-hidden>
          {initials(cs.changedByFirstName, cs.changedByLastName)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.body, fontSize: 13.5, fontWeight: 600, color: C.textPrimary }}>
              {displayActor(cs.changedByFirstName, cs.changedByLastName)}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted, backgroundColor: C.bgSection, padding: '1px 7px', borderRadius: RADIUS.sm }}>
              R{cs.revisionNumber}
            </span>
            <CategoryBadge category={cs.category} />
            <span title={fullDateTime(cs.changedAt)} style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.textMuted, marginLeft: 'auto' }}>
              {fromNow(cs.changedAt)}
            </span>
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 500, color: C.textSecondary, marginTop: 4 }}>{cs.summary}</div>
        </div>

        <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ color: C.textMuted, fontSize: 13, marginTop: 4, flexShrink: 0 }} aria-hidden />
      </button>

      <div style={{ padding: '0 16px 12px 66px' }}>
        {shown.map((ch, i) => (
          <div key={ch.id ?? `${ch.fieldName}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}` }}>
            <div style={{ minWidth: 130, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: FONT.body, fontSize: 12.5, fontWeight: 600, color: C.textPrimary }}>{ch.fieldLabel}</span>
                {ch.isSensitive && <i className="bi bi-shield-lock-fill" style={{ fontSize: 10, color: C.purple }} title="Sensitive field" />}
              </div>
              <div style={{ marginTop: 3 }}><ChangeTypeChip changeType={ch.changeType} /></div>
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}><ValueDelta change={ch} /></div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <button type="button" onClick={onToggle} style={{ background: 'none', border: 'none', color: C.primary, fontFamily: FONT.body, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 0 0' }}>
            +{hiddenCount} more change{hiddenCount > 1 ? 's' : ''}
          </button>
        )}

        {expanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {cs.changeSource && <ContextChip icon="bi bi-input-cursor-text" text={cs.changeSource} />}
            {cs.deviceType && <ContextChip icon="bi bi-display" text={cs.deviceType} />}
            {cs.browserName && <ContextChip icon="bi bi-globe2" text={cs.browserName} />}
            {cs.ipAddress && <ContextChip icon="bi bi-hdd-network" text={cs.ipAddress} />}
            {cs.rowHash && (
              <span title={`Tamper-evidence hash: ${cs.rowHash}`} style={{ fontFamily: FONT.body, fontSize: 10.5, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="bi bi-shield-check" style={{ fontSize: 11, color: '#16a34a' }} aria-hidden />
                {cs.rowHash.slice(0, 10)}…
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {onRestore && (
                <button type="button" onClick={() => onRestore(cs.revisionNumber)} style={{ background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: '5px 12px', fontFamily: FONT.body, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }} title="Restore the record to this version">
                  <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 12 }} aria-hidden /> Restore
                </button>
              )}
              <button type="button" onClick={() => onCompare(cs.revisionNumber)} style={{ background: 'transparent', color: C.primary, border: `1px solid ${C.primary}`, borderRadius: RADIUS.md, padding: '5px 12px', fontFamily: FONT.body, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <i className="bi bi-file-earmark-diff" style={{ fontSize: 12 }} aria-hidden /> View this change
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeSetCard;
