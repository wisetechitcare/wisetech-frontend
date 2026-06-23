import React from 'react';
import { C, FONT, RADIUS, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2FieldChange } from './types';
import { categoryMeta, changeTypeMeta, DIFF } from './designTokens';

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const meta = categoryMeta(category);
  const { bg, color } = ICON_COLORS[meta.accent] ?? ICON_COLORS.primary;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: bg, color,
        padding: '3px 9px', borderRadius: RADIUS.full, fontFamily: FONT.body, fontSize: 11,
        fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap',
      }}
    >
      <i className={meta.icon} style={{ fontSize: 11 }} aria-hidden />
      {meta.label}
    </span>
  );
};

export const ChangeTypeChip: React.FC<{ changeType: string }> = ({ changeType }) => {
  const meta = changeTypeMeta(changeType);
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: meta.bg, color: meta.color,
        padding: '2px 7px', borderRadius: RADIUS.sm, fontFamily: FONT.body, fontSize: 10.5,
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
      }}
      aria-label={meta.label}
    >
      <i className={meta.icon} style={{ fontSize: 10 }} aria-hidden />
      {meta.label}
    </span>
  );
};

function display(value: unknown, formatted: string): string {
  if (formatted && formatted !== '(empty)') return formatted;
  if (value === null || value === undefined || value === '') return '(empty)';
  if (typeof value === 'object') return Array.isArray(value) ? `${value.length} item(s)` : '…';
  return String(value);
}

export const ValueDelta: React.FC<{ change: V2FieldChange; stacked?: boolean }> = ({ change, stacked }) => {
  const oldText = display(change.oldValue, change.oldValueFormatted);
  const newText = display(change.newValue, change.newValueFormatted);

  const chip = (text: string, color: string, bg: string, srLabel: string) => (
    <span
      style={{
        backgroundColor: bg, color, padding: '2px 8px', borderRadius: RADIUS.sm,
        fontFamily: FONT.body, fontSize: 12.5, fontWeight: 500, wordBreak: 'break-word', maxWidth: '100%',
      }}
    >
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{srLabel}</span>
      {text}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', gap: 8, flexWrap: 'wrap' }}>
      {change.changeType !== 'ADDED' && chip(oldText, DIFF.removed, DIFF.removedBg, 'changed from')}
      {!stacked && change.changeType === 'MODIFIED' && (
        <i className="bi bi-arrow-right" style={{ color: C.textMuted, fontSize: 12 }} aria-hidden />
      )}
      {change.changeType !== 'REMOVED' && chip(newText, DIFF.added, DIFF.addedBg, 'changed to')}
    </div>
  );
};
