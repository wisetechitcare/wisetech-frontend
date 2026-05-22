import { useMemo, useCallback, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Holiday, LeaveRecord, SelectionPhase } from './leaveTypes';
import { HolidayChipsRow } from './HolidayChipsRow';
import { LeaveLegend } from './LeaveLegend';
import { DateCellTooltip } from './DateCellTooltip';

dayjs.extend(isBetween);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthGrid(month: Dayjs): Dayjs[] {
  const start = month.startOf('month').startOf('week');
  const end = month.endOf('month').endOf('week');
  const days: Dayjs[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    days.push(cur);
    cur = cur.add(1, 'day');
  }
  return days;
}

export interface LeaveCalendarGridProps {
  viewMonth: Dayjs;
  twoMonthView: boolean;
  onViewMonthChange: (m: Dayjs) => void;
  onToggleTwoMonth: () => void;
  dateFrom: string;
  dateTo: string;
  phase: SelectionPhase;
  hoverIso: string | null;
  focusIso: string;
  onHoverIso: (iso: string | null) => void;
  onFocusIso: (iso: string) => void;
  onSelectIso: (iso: string) => void;
  holidaySet: Set<string>;
  holidays: Holiday[];
  publicHolidaysRaw: any[];
  isWeekend: (date: Date) => boolean;
  minDate?: string;
  existingLeaves: LeaveRecord[];
  disabled?: boolean;
  sandwichRiskDates?: Set<string>;
}

export function LeaveCalendarGrid({
  viewMonth,
  twoMonthView,
  onViewMonthChange,
  onToggleTwoMonth,
  dateFrom,
  dateTo,
  phase,
  hoverIso,
  focusIso,
  onHoverIso,
  onFocusIso,
  onSelectIso,
  holidaySet,
  holidays,
  publicHolidaysRaw,
  isWeekend,
  minDate,
  existingLeaves,
  disabled,
  sandwichRiskDates = new Set(),
}: LeaveCalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const months = twoMonthView ? [viewMonth, viewMonth.add(1, 'month')] : [viewMonth];

  const committedRange = useMemo(() => {
    if (phase !== 'committed' || !dateFrom || !dateTo) return null;
    const a = dayjs(dateFrom);
    const b = dayjs(dateTo);
    return a.isBefore(b) ? { start: a, end: b } : { start: b, end: a };
  }, [phase, dateFrom, dateTo]);

  const previewRange = useMemo(() => {
    if (phase !== 'pick-end' || !dateFrom) return null;
    const start = dayjs(dateFrom);
    const end = hoverIso ? dayjs(hoverIso) : start;
    return start.isBefore(end) ? { start, end } : { start: end, end: start };
  }, [phase, dateFrom, hoverIso]);

  const activeRange = committedRange ?? previewRange;

  const monthHolidays = useMemo(() => {
    return holidays
      .filter((h) => months.some((m) => dayjs(h.date).isSame(m, 'month')))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [holidays, months]);

  const isExistingLeave = useCallback(
    (d: Dayjs) =>
      existingLeaves.some((l) =>
        d.isBetween(dayjs(l.dateFrom), dayjs(l.dateTo), 'day', '[]'),
      ),
    [existingLeaves],
  );

  const isPast = useCallback(
    (d: Dayjs) => !!(minDate && d.isBefore(dayjs(minDate), 'day')),
    [minDate],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const delta: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (delta[e.key] !== undefined) {
      e.preventDefault();
      const next = dayjs(focusIso).add(delta[e.key], 'day').format('YYYY-MM-DD');
      onFocusIso(next);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectIso(focusIso);
    }
  };

  const renderMonth = (month: Dayjs) => {
    const days = buildMonthGrid(month);
    return (
      <div key={month.format('YYYY-MM')} className="lrc-month">
        <h3 className="lrc-month__title">{month.format('MMMM YYYY')}</h3>
        <div className="lrc-month__weekdays" role="row">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className={`lrc-month__weekday${wd === 'Sun' ? ' lrc-month__weekday--sun' : ''}`}
              role="columnheader"
            >
              {wd}
            </div>
          ))}
        </div>
        <div className="lrc-month__grid" role="rowgroup">
          {days.map((d) => {
            const iso = d.format('YYYY-MM-DD');
            const inMonth = d.isSame(month, 'month');
            const past = isPast(d);
            const inRange =
              activeRange &&
              d.isBetween(activeRange.start, activeRange.end, 'day', '[]');
            const isStart = activeRange && d.isSame(activeRange.start, 'day');
            const isEnd = activeRange && d.isSame(activeRange.end, 'day');
            const isHol = holidaySet.has(iso);
            const isWk = isWeekend(d.toDate());
            const isSun = d.day() === 0;
            const existing = isExistingLeave(d);
            const isSandwich = sandwichRiskDates.has(iso);
            const focused = iso === focusIso;
            const holRecord = publicHolidaysRaw.find(
              (p: any) => dayjs(p?.date).format('YYYY-MM-DD') === iso,
            );
            const holName =
              holRecord?.name || holRecord?.holiday_name || holRecord?.title || 'Holiday';

            if (!inMonth) {
              return <div key={iso} className="lrc-day lrc-day--outside" aria-hidden="true" />;
            }

            const classNames = [
              'lrc-day',
              past && 'lrc-day--disabled',
              inRange && !isStart && !isEnd && 'lrc-day--in-range',
              (isStart || isEnd) && 'lrc-day--endpoint',
              isWk && !inRange && 'lrc-day--weekend',
              isSun && !inRange && 'lrc-day--sunday',
              isHol && 'lrc-day--holiday',
              existing && !inRange && 'lrc-day--existing',
              focused && 'lrc-day--focused',
            ]
              .filter(Boolean)
              .join(' ');

            const dayButton = (
              <button
                type="button"
                role="gridcell"
                className={classNames}
                aria-label={`${d.format('dddd, D MMMM YYYY')}${isHol ? `, ${holName}` : ''}${isWk ? ', weekend' : ''}${isSandwich ? ', sandwich rule may apply' : ''}`}
                aria-selected={!!inRange}
                aria-disabled={past || disabled}
                disabled={past || disabled}
                tabIndex={focused ? 0 : -1}
                onClick={() => onSelectIso(iso)}
                onMouseEnter={() => onHoverIso(iso)}
                onMouseLeave={() => onHoverIso(null)}
                onFocus={() => onFocusIso(iso)}
              >
                <span className="lrc-day__num">{d.format('D')}</span>
                {isHol && (
                  <span className="lrc-day__badge lrc-day__badge--holiday" aria-hidden="true">
                    H
                  </span>
                )}
                {!isHol && isWk && !inRange && (
                  <span className="lrc-day__badge lrc-day__badge--weekend" aria-hidden="true">
                    W
                  </span>
                )}
                {isSandwich && (
                  <span className="lrc-day__badge lrc-day__badge--sandwich" aria-hidden="true">
                    S
                  </span>
                )}
                {isHol && <span className="lrc-day__dot" aria-hidden="true" />}
              </button>
            );

            return (
              <DateCellTooltip
                key={iso}
                iso={iso}
                dayLabel={d.format('dddd, D MMMM YYYY')}
                holidayName={isHol ? holName : undefined}
                isWeekend={isWk}
                hasExistingLeave={existing}
                isSandwichRisk={isSandwich}
                phase={phase}
              >
                {dayButton}
              </DateCellTooltip>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="lrc-calendar-panel">
      <div className="lrc-calendar-panel__nav">
        <button
          type="button"
          className="lrc-nav-btn"
          aria-label="Previous month"
          disabled={disabled}
          onClick={() => onViewMonthChange(viewMonth.subtract(1, 'month'))}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          className="lrc-nav-btn lrc-nav-btn--text"
          aria-pressed={twoMonthView}
          onClick={onToggleTwoMonth}
        >
          {twoMonthView ? 'Single month' : 'Two months'}
        </button>
        <button
          type="button"
          className="lrc-nav-btn"
          aria-label="Next month"
          disabled={disabled}
          onClick={() => onViewMonthChange(viewMonth.add(1, 'month'))}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        ref={gridRef}
        className={`lrc-calendar-panel__body${twoMonthView ? ' lrc-calendar-panel__body--dual' : ''}`}
        role="grid"
        aria-label="Leave date calendar"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        {months.map(renderMonth)}
      </div>

      <HolidayChipsRow
        holidays={monthHolidays}
        onNavigate={(d) => onViewMonthChange(dayjs(d))}
      />
      <LeaveLegend showSandwichHint={sandwichRiskDates.size > 0} />
    </div>
  );
}
