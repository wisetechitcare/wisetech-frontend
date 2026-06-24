import React from 'react';
import { C, FONT, RADIUS, ICON_COLORS } from '@/app/modules/configuration/ConfigDesignSystem';
import { V2FieldChange } from './auditV2.service';
import { categoryMeta, changeTypeMeta, DIFF, resolveValue } from './tokens';

/** Category pill — icon + label, color from the shared palette. */
export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const meta = categoryMeta(category);
  const { bg, color } = ICON_COLORS[meta.accent] ?? ICON_COLORS.primary;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: bg,
        color,
        padding: '3px 9px',
        borderRadius: RADIUS.full,
        fontFamily: FONT.body,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
      }}
    >
      <i className={meta.icon} style={{ fontSize: 11 }} aria-hidden />
      {meta.label}
    </span>
  );
};

/** Added / Removed / Modified chip — never color-only (icon + text). */
export const ChangeTypeChip: React.FC<{ changeType: string }> = ({ changeType }) => {
  const meta = changeTypeMeta(changeType);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: meta.bg,
        color: meta.color,
        padding: '2px 7px',
        borderRadius: RADIUS.sm,
        fontFamily: FONT.body,
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
      }}
      aria-label={meta.label}
    >
      <i className={meta.icon} style={{ fontSize: 10 }} aria-hidden />
      {meta.label}
    </span>
  );
};

/** old → new value rendering with screen-reader text and color+icon (a11y safe). */
export const ValueDelta: React.FC<{ change: V2FieldChange; stacked?: boolean }> = ({
  change,
  stacked,
}) => {
  const oldVal = resolveValue(change.oldValue, change.oldValueFormatted);
  const newVal = resolveValue(change.newValue, change.newValueFormatted);

  const chip = (
    { text, placeholder }: { text: string; placeholder: boolean },
    tone: 'old' | 'new',
    srLabel: string,
  ) => {
    const color = placeholder ? C.textMuted : tone === 'old' ? DIFF.removed : DIFF.added;
    const bg = placeholder ? C.bgSection : tone === 'old' ? DIFF.removedBg : DIFF.addedBg;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: bg,
          color,
          padding: '3px 9px',
          borderRadius: RADIUS.sm,
          fontFamily: FONT.body,
          fontSize: 12.5,
          fontWeight: placeholder ? 500 : 600,
          fontStyle: placeholder ? 'italic' : 'normal',
          textDecoration: tone === 'old' && !placeholder ? 'line-through' : 'none',
          textDecorationColor: `${DIFF.removed}80`,
          border: `1px solid ${color}1f`,
          wordBreak: 'break-word',
          maxWidth: '100%',
          lineHeight: 1.35,
        }}
      >
        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {srLabel}
        </span>
        {text}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {change.changeType !== 'ADDED' && chip(oldVal, 'old', 'changed from')}
      {change.changeType === 'MODIFIED' && (
        <i
          className={stacked ? 'bi bi-arrow-down' : 'bi bi-arrow-right'}
          style={{ color: C.textMuted, fontSize: 11 }}
          aria-hidden
        />
      )}
      {change.changeType !== 'REMOVED' && chip(newVal, 'new', 'changed to')}
    </div>
  );
};
