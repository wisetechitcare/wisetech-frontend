import React from 'react';
import { C, FONT, RADIUS } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2DiffResult, V2FieldChange } from './types';
import { ChangeTypeChip, ValueDelta } from './parts';
import { DIFF } from './designTokens';

export type DiffMode = 'unified' | 'sidebyside';

interface Props {
  result: V2DiffResult;
  mode: DiffMode;
  onModeChange: (m: DiffMode) => void;
}

function valueText(value: unknown, formatted: string): string {
  if (formatted && formatted !== '(empty)') return formatted;
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} item(s)` : '…';
  return String(value);
}

const StatChip: React.FC<{ icon: string; label: string; n: number; color: string }> = ({ icon, label, n, color }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.body, fontSize: 12, fontWeight: 600, color }}>
    <i className={icon} style={{ fontSize: 12 }} aria-hidden />
    {n} {label}
  </span>
);

const ModeBtn: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: RADIUS.md,
      border: 'none', cursor: 'pointer', fontFamily: FONT.body, fontSize: 12, fontWeight: 600,
      backgroundColor: active ? C.bgCard : 'transparent', color: active ? C.primary : C.textSecondary,
      boxShadow: active ? C.shadowSm : 'none',
    }}
  >
    <i className={icon} style={{ fontSize: 12 }} aria-hidden />
    {label}
  </button>
);

const SideCell: React.FC<{ text: string; tone: 'old' | 'new' | 'empty' }> = ({ text, tone }) => {
  const map = {
    old: { color: DIFF.removed, bg: DIFF.removedBg },
    new: { color: DIFF.added, bg: DIFF.addedBg },
    empty: { color: C.textMuted, bg: C.bgSection },
  }[tone];
  return (
    <div style={{ backgroundColor: map.bg, color: map.color, borderRadius: RADIUS.sm, padding: '6px 10px', fontFamily: FONT.body, fontSize: 12.5, fontWeight: 500, wordBreak: 'break-word', minHeight: 30 }}>
      {text}
    </div>
  );
};

const DiffRow: React.FC<{ change: V2FieldChange; mode: DiffMode }> = ({ change, mode }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
    <div style={{ width: 150, flexShrink: 0 }}>
      <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{change.fieldLabel}</div>
      <div style={{ marginTop: 4 }}><ChangeTypeChip changeType={change.changeType} /></div>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      {mode === 'unified' ? (
        <ValueDelta change={change} stacked />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SideCell text={valueText(change.oldValue, change.oldValueFormatted)} tone={change.changeType === 'ADDED' ? 'empty' : 'old'} />
          <SideCell text={valueText(change.newValue, change.newValueFormatted)} tone={change.changeType === 'REMOVED' ? 'empty' : 'new'} />
        </div>
      )}
    </div>
  </div>
);

export const DiffViewer: React.FC<Props> = ({ result, mode, onModeChange }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 14px', backgroundColor: C.bgSection, borderRadius: RADIUS.md, marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>R{result.from} → R{result.to}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{result.summary}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <StatChip icon="bi bi-plus-circle-fill" label="added" n={result.stats.added} color="#16a34a" />
        <StatChip icon="bi bi-dash-circle-fill" label="removed" n={result.stats.removed} color={C.danger} />
        <StatChip icon="bi bi-pencil-fill" label="modified" n={result.stats.modified} color={C.amber} />
      </div>
      <div style={{ display: 'flex', gap: 4, backgroundColor: C.bgSection, padding: 2, borderRadius: RADIUS.md }}>
        <ModeBtn active={mode === 'unified'} onClick={() => onModeChange('unified')} icon="bi bi-list" label="Unified" />
        <ModeBtn active={mode === 'sidebyside'} onClick={() => onModeChange('sidebyside')} icon="bi bi-layout-split" label="Side by side" />
      </div>
    </div>

    {mode === 'sidebyside' && result.diffs.length > 0 && (
      <div style={{ display: 'flex', gap: 12, padding: '0 0 6px 162px' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <span style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted }}>R{result.from}</span>
          <span style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 700, color: C.textMuted }}>R{result.to}</span>
        </div>
      </div>
    )}

    {result.diffs.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '28px 0', color: C.textMuted, fontFamily: FONT.body, fontSize: 13 }}>
        <i className="bi bi-check2-circle" style={{ fontSize: 22, display: 'block', marginBottom: 6 }} aria-hidden />
        No differences between these revisions.
      </div>
    ) : (
      result.diffs.map((d, i) => <DiffRow key={`${d.fieldName}-${i}`} change={d} mode={mode} />)
    )}
  </div>
);

export default DiffViewer;
