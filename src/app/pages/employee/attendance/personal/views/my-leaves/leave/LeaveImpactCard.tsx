import dayjs from 'dayjs';
import { Check, AlertTriangle } from 'lucide-react';
import type { LeaveBreakdown } from '@utils/leaveCalcEngine';
import type { LeaveAlert } from './leaveTypes';
import type { SandwichPreviewResult } from './sandwichPreview';

interface LeaveImpactCardProps {
  breakdown: LeaveBreakdown | null;
  dateFrom?: string;
  dateTo?: string;
  phase: 'idle' | 'pick-end' | 'committed';
  leaveCount: number;
  countTotalLeaves: number;
  leaveTypeLabel?: string;
  isPreview?: boolean;
  sandwichPreview?: SandwichPreviewResult | null;
  sandwichEnabled?: boolean;
  /** Outcome-only alerts (overlap/quota), not click-time holiday hints */
  outcomeAlerts?: LeaveAlert[];
}

const IMPACT_ALERT_IDS = new Set(['overlap', 'cumulative', 'type-quota', 'type-empty']);

export function LeaveImpactCard({
  breakdown,
  dateFrom,
  dateTo,
  phase,
  leaveCount,
  countTotalLeaves,
  leaveTypeLabel,
  isPreview,
  sandwichPreview,
  sandwichEnabled,
  outcomeAlerts = [],
}: LeaveImpactCardProps) {
  const filteredAlerts = outcomeAlerts.filter((a) => IMPACT_ALERT_IDS.has(a.id));

  if (!breakdown && phase === 'idle') {
    return (
      <div className="lrc-impact-card lrc-impact-card--empty" role="status" aria-live="polite">
        <div className="lrc-impact-card__heading">Leave impact</div>
        <p className="lrc-impact-card__prompt">Select dates on the calendar to see how this leave affects your balance.</p>
      </div>
    );
  }

  if (!breakdown) return null;

  const { totalCalendarDays, weekendDays, holidayDays, chargeable } = breakdown;
  const showRange = phase === 'committed' && dateFrom && dateTo && dateFrom !== dateTo;
  const rangeLabel = showRange
    ? (() => {
        const a = dayjs(dateFrom);
        const b = dayjs(dateTo);
        const start = a.isBefore(b) ? a : b;
        const end = a.isBefore(b) ? b : a;
        return `${start.format('DD MMM')} → ${end.format('DD MMM')}`;
      })()
    : null;

  const effectiveChargeable =
    sandwichEnabled && sandwichPreview && sandwichPreview.sandwichDaysAdded > 0
      ? sandwichPreview.totalChargeable
      : chargeable;

  const afterLeave =
    leaveTypeLabel && phase === 'committed'
      ? Math.max(0, countTotalLeaves - effectiveChargeable)
      : null;

  return (
    <div
      className={`lrc-impact-card${isPreview ? ' lrc-impact-card--preview' : ''}`}
      role="region"
      aria-label="Leave impact summary"
      aria-live="polite"
    >
      <div className="lrc-impact-card__heading">Leave impact</div>

      {rangeLabel && (
        <div className="lrc-impact-card__range">
          Date range: <strong>{rangeLabel}</strong>
          <span className="lrc-impact-card__range-days">
            ({totalCalendarDays} calendar {totalCalendarDays === 1 ? 'day' : 'days'})
          </span>
        </div>
      )}

      <div className="lrc-impact-card__chips">
        <div className="lrc-impact-chip">
          <span className="lrc-impact-chip__val">{totalCalendarDays}</span>
          <span className="lrc-impact-chip__lbl">Total days</span>
        </div>
        <div className="lrc-impact-chip">
          <span className="lrc-impact-chip__val">{weekendDays}</span>
          <span className="lrc-impact-chip__lbl">Weekends</span>
        </div>
        <div className="lrc-impact-chip">
          <span className="lrc-impact-chip__val">{holidayDays}</span>
          <span className="lrc-impact-chip__lbl">Holidays</span>
        </div>
        <div className="lrc-impact-chip lrc-impact-chip--primary">
          <span className="lrc-impact-chip__val">{effectiveChargeable}</span>
          <span className="lrc-impact-chip__lbl">Chargeable</span>
        </div>
      </div>

      <ul className="lrc-impact-card__checks">
        {afterLeave !== null && (
          <li className="lrc-impact-card__check lrc-impact-card__check--ok">
            <Check size={14} aria-hidden="true" />
            After this leave: <strong>{afterLeave}</strong> of {countTotalLeaves} remain
            {leaveTypeLabel ? ` (${leaveTypeLabel.replace(/\s*\([^)]*\)\s*$/, '')})` : ''}
          </li>
        )}
        {sandwichEnabled && sandwichPreview && sandwichPreview.sandwichDaysAdded > 0 && (
          <li className="lrc-impact-card__check lrc-impact-card__check--warn">
            <AlertTriangle size={14} aria-hidden="true" />
            Sandwich rule adds {sandwichPreview.sandwichDaysAdded} day
            {sandwichPreview.sandwichDaysAdded !== 1 ? 's' : ''} ({sandwichPreview.totalChargeable} chargeable total)
          </li>
        )}
        {effectiveChargeable === 0 && totalCalendarDays > 0 && (
          <li className="lrc-impact-card__check lrc-impact-card__check--ok">
            <Check size={14} aria-hidden="true" />
            No chargeable leave days in this range
          </li>
        )}
        {filteredAlerts.map((a) => (
          <li key={a.id} className="lrc-impact-card__check lrc-impact-card__check--warn">
            <AlertTriangle size={14} aria-hidden="true" />
            {a.message.replace(/^⚠️\s*/, '')}
          </li>
        ))}
      </ul>

      {isPreview && (
        <p className="lrc-impact-card__preview-note">Preview — click end date to confirm</p>
      )}
    </div>
  );
}
