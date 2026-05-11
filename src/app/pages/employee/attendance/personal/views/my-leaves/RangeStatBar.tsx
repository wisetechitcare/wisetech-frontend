import React from 'react';
import type { LeaveBreakdown } from '@utils/leaveCalcEngine';

interface RangeStatBarProps {
  breakdown: LeaveBreakdown | null;
  /** True while user is hovering (before second click) — renders in muted preview style. */
  isPreview?: boolean;
}

const RangeStatBar: React.FC<RangeStatBarProps> = ({ breakdown, isPreview }) => {
  if (!breakdown) {
    return (
      <div className="lrc-stat-bar" role="status" aria-live="polite" aria-label="Leave selection stats">
        <span className="lrc-stat-bar__prompt">Click a date to start selecting your leave range</span>
      </div>
    );
  }

  const { totalCalendarDays, chargeable, excluded, weekendDays, holidayDays } = breakdown;

  const excludedParts: string[] = [];
  if (weekendDays > 0) excludedParts.push(`${weekendDays} weekend${weekendDays > 1 ? 's' : ''}`);
  if (holidayDays > 0) excludedParts.push(`${holidayDays} holiday${holidayDays > 1 ? 's' : ''}`);
  const excludedLabel = excludedParts.join(' + ') + ' excluded';

  const ariaLabel = `${totalCalendarDays} calendar ${totalCalendarDays === 1 ? 'day' : 'days'}, ${chargeable} chargeable${excluded > 0 ? `, ${excludedLabel}` : ''}`;

  return (
    <div
      className={`lrc-stat-bar${isPreview ? ' lrc-stat-bar--preview' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className="lrc-stat-bar__segment">
        <span className="lrc-stat-bar__val">{totalCalendarDays}</span>
        <span className="lrc-stat-bar__lbl">calendar {totalCalendarDays === 1 ? 'day' : 'days'}</span>
      </span>

      <span className="lrc-stat-bar__sep" aria-hidden="true">·</span>

      <span className="lrc-stat-bar__segment lrc-stat-bar__segment--primary">
        <span className="lrc-stat-bar__val">{chargeable}</span>
        <span className="lrc-stat-bar__lbl">chargeable</span>
      </span>

      {excluded > 0 && (
        <>
          <span className="lrc-stat-bar__sep" aria-hidden="true">·</span>
          <span className="lrc-stat-bar__segment lrc-stat-bar__segment--muted">
            <span className="lrc-stat-bar__val">{excluded}</span>
            <span className="lrc-stat-bar__lbl">{excludedLabel}</span>
          </span>
        </>
      )}

      {chargeable === 0 && totalCalendarDays > 0 && (
        <span className="lrc-stat-bar__badge" aria-label="No leave days will be deducted">
          No leave needed
        </span>
      )}
    </div>
  );
};

export default RangeStatBar;
