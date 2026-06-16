import { useState, useRef, useEffect } from 'react';
import dayjs from 'dayjs';

interface DateCellTooltipProps {
  iso: string;
  dayLabel: string;
  holidayName?: string;
  isWeekend: boolean;
  hasExistingLeave: boolean;
  isSandwichRisk: boolean;
  phase: 'idle' | 'pick-end' | 'committed';
  children: React.ReactNode;
}

export function DateCellTooltip({
  iso,
  dayLabel,
  holidayName,
  isWeekend,
  hasExistingLeave,
  isSandwichRisk,
  phase,
  children,
}: DateCellTooltipProps) {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [visible]);

  const rangeHint =
    phase === 'idle'
      ? 'Click to start range'
      : phase === 'pick-end'
        ? 'Click to end range'
        : null;

  return (
    <div
      ref={wrapRef}
      className="lrc-day-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="lrc-day-tooltip" role="tooltip">
          <div className="lrc-day-tooltip__title">{dayLabel}</div>
          {holidayName && (
            <div className="lrc-day-tooltip__line">{holidayName} · Public holiday</div>
          )}
          {isWeekend && !holidayName && (
            <div className="lrc-day-tooltip__line">Weekend · Excluded from leave count</div>
          )}
          {hasExistingLeave && (
            <div className="lrc-day-tooltip__line">You have leave on this date</div>
          )}
          {isSandwichRisk && (
            <div className="lrc-day-tooltip__line lrc-day-tooltip__line--warn">
              Sandwich rule may apply
            </div>
          )}
          {rangeHint && <div className="lrc-day-tooltip__hint">{rangeHint}</div>}
        </div>
      )}
    </div>
  );
}
