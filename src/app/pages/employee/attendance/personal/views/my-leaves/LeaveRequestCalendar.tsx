import { useMemo, useState, useCallback } from 'react';
import Calendar from 'react-calendar';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import './LeaveRequestCalendar.css';

import { computeLeaveUsage } from './utils/calculations';
import { generateMonthlySuggestions } from './utils/suggestionEngine';
import { resolveTileStates, statesToClassNames } from '@utils/tileStateResolver';
import { computeLeaveBreakdown } from '@utils/leaveCalcEngine';
import RangeStatBar from './RangeStatBar';
import BalanceGauge from './BalanceGauge';

dayjs.extend(isBetween);

interface LeaveRequestCalendarProps {
  fromDate: string;
  toDate: string;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  calculateLeaveCount: (fromDate: string, toDate: string) => void;
  publicHolidays: any[];
  workingAndOffDays: Record<string, any>;
  dateOfJoining: string;
  leaveTypeLabel?: string;
  leaveCount: number;
  countTotalLeaves: number;
  cumulativeSummary?: {
    total: number;
    used: number;
    allowedTillNow: number;
    remaining: number;
  } | null;
  employeeLeavesData?: any[];
}

const formatIsoDate = (date: Date) => dayjs(date).format('YYYY-MM-DD');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const getDayName = (date: Date) => DAY_NAMES[date.getDay()];

const getDateDisplay = (dateStr?: string) => {
  if (!dateStr) return null;
  const d = dayjs(dateStr);
  return { day: d.format('DD'), short: d.format('MMM YYYY'), full: d.format('DD MMM YYYY') };
};

const LeaveRequestCalendar = ({
  fromDate, toDate, setFieldValue, calculateLeaveCount,
  publicHolidays, workingAndOffDays, dateOfJoining,
  leaveTypeLabel, leaveCount, countTotalLeaves, cumulativeSummary,
}: LeaveRequestCalendarProps) => {

  const [displayMonth,        setDisplayMonth]        = useState<Dayjs>(dayjs());
  const [hoveredDate,         setHoveredDate]         = useState<Date | null>(null);
  const [dismissedComparison, setDismissedComparison] = useState(false);
  const [pulsedHoliday,       setPulsedHoliday]       = useState<string | null>(null);

  // ── Selection phase (derived, not stored) ──────────────────────────────
  const selectionPhase = useMemo<'empty' | 'start-set' | 'committed'>(() => {
    if (!fromDate) return 'empty';
    if (!toDate || fromDate === toDate) return 'start-set';
    return 'committed';
  }, [fromDate, toDate]);

  const committedRange = useMemo<[Date, Date] | null>(() => {
    if (selectionPhase !== 'committed') return null;
    return [new Date(fromDate), new Date(toDate)];
  }, [fromDate, toDate, selectionPhase]);

  const startOnly = useMemo<Date | null>(() => {
    if (selectionPhase !== 'start-set' || !fromDate) return null;
    return new Date(fromDate);
  }, [fromDate, selectionPhase]);

  // ── Holiday set ──────────────────────────────────────────────────────────
  const holidaySet = useMemo(() => new Set(
    (publicHolidays || [])
      .map((h: any) => dayjs(h?.date).format('YYYY-MM-DD'))
      .filter(Boolean)
  ), [publicHolidays]);

  // ── Configurable weekend check ────────────────────────────────────────────
  const isWeekend = useCallback((date: Date): boolean => {
    const dayName = getDayName(date);
    if (workingAndOffDays && Object.keys(workingAndOffDays).length > 0) {
      return workingAndOffDays[dayName] === '0';
    }
    return date.getDay() === 0 || date.getDay() === 6;
  }, [workingAndOffDays]);

  // ── Leave breakdowns ──────────────────────────────────────────────────────
  const committedBreakdown = useMemo(() => {
    if (!committedRange) return null;
    return computeLeaveBreakdown(committedRange[0], committedRange[1], holidaySet, isWeekend);
  }, [committedRange, holidaySet, isWeekend]);

  // Live breakdown during hover (before second click)
  const hoverBreakdown = useMemo(() => {
    if (selectionPhase !== 'start-set' || !startOnly || !hoveredDate) return null;
    const fwd   = dayjs(startOnly).isBefore(dayjs(hoveredDate));
    const start = fwd ? startOnly  : hoveredDate;
    const end   = fwd ? hoveredDate : startOnly;
    return computeLeaveBreakdown(start, end, holidaySet, isWeekend);
  }, [selectionPhase, startOnly, hoveredDate, holidaySet, isWeekend]);

  const activeBreakdown = committedBreakdown ?? hoverBreakdown;

  // ── Date displays ─────────────────────────────────────────────────────────
  const fromDateDisplay = useMemo(() => getDateDisplay(fromDate), [fromDate]);
  const toDateDisplay   = useMemo(() => getDateDisplay(toDate),   [toDate]);

  // ── react-calendar value ──────────────────────────────────────────────────
  // Only pass a committed range to the calendar; visuals for start-set are
  // handled entirely by TileStateResolver so react-calendar default styles
  // don't interfere with the ixigo-style band rendering.
  const calendarValue = useMemo(() => {
    if (selectionPhase === 'committed' && committedRange) return committedRange;
    return undefined;
  }, [selectionPhase, committedRange]);

  // ── Efficiency score (per tile) ───────────────────────────────────────────
  const getSingleDayEfficiency = useCallback((date: Date): number => {
    if (isWeekend(date) || holidaySet.has(formatIsoDate(date))) return 0;
    let backward = 0;
    for (let i = 1; i <= 5; i++) {
      const prev = dayjs(date).subtract(i, 'day').toDate();
      if (isWeekend(prev) || holidaySet.has(formatIsoDate(prev))) backward++;
      else break;
    }
    let forward = 0;
    for (let i = 1; i <= 5; i++) {
      const next = dayjs(date).add(i, 'day').toDate();
      if (isWeekend(next) || holidaySet.has(formatIsoDate(next))) forward++;
      else break;
    }
    return 1 + backward + forward;
  }, [isWeekend, holidaySet]);

  // ── Smart suggestions ─────────────────────────────────────────────────────
  const suggestions = useMemo(
    () => generateMonthlySuggestions(displayMonth.toDate(), holidaySet, countTotalLeaves || 5),
    [displayMonth, holidaySet, countTotalLeaves],
  );

  // ── Upcoming holidays (visible months) ───────────────────────────────────
  const upcomingHolidays = useMemo(() => {
    const visibleStart = displayMonth.startOf('month');
    const visibleEnd   = displayMonth.add(1, 'month').endOf('month');
    return (publicHolidays || [])
      .filter((h: any) => {
        const d = dayjs(h?.date);
        return d.isValid() && !d.isBefore(visibleStart) && !d.isAfter(visibleEnd);
      })
      .sort((a: any, b: any) => dayjs(a.date).diff(dayjs(b.date)))
      .slice(0, 6);
  }, [publicHolidays, displayMonth]);

  // ── Better alternative (comparison engine) ───────────────────────────────
  const betterAlternative = useMemo(() => {
    if (!committedRange || dismissedComparison) return null;
    const current = computeLeaveUsage(committedRange[0], committedRange[1], holidaySet);
    if (current.leaveDays === 0) return null;

    return suggestions.find(s => {
      const overlaps = dayjs(s.start).isBetween(committedRange[0], committedRange[1], 'day', '[]') ||
                       dayjs(s.end).isBetween(committedRange[0], committedRange[1], 'day', '[]');
      const isBetter = (s.leaveDays <= current.leaveDays && s.daysOff > current.daysOff) ||
                       (s.leaveDays < current.leaveDays && s.daysOff >= current.daysOff);
      return !overlaps && isBetter && s.leaveDays <= (countTotalLeaves || 99);
    }) ?? null;
  }, [committedRange, dismissedComparison, suggestions, holidaySet, countTotalLeaves]);

  // ── tileClassName via TileStateResolver ───────────────────────────────────
  const tileClassName = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';

    const states = resolveTileStates(date, {
      committedRange,
      startOnly,
      hoveredDate: selectionPhase === 'start-set' ? hoveredDate : null,
      holidaySet,
      isWeekend,
      isDisabled: (d) => !!(dateOfJoining && dayjs(d).isBefore(dayjs(dateOfJoining), 'day')),
      efficiencyScore: getSingleDayEfficiency,
    });

    const classes = statesToClassNames(states);

    if (pulsedHoliday && formatIsoDate(date) === pulsedHoliday) {
      classes.push('leave-request-calendar__tile--pulsed');
    }

    if (suggestions.length > 0) {
      const top = suggestions[0];
      if (dayjs(date).isBetween(top.start, top.end, 'day', '[]')) {
        classes.push('leave-request-calendar__tile--suggested-highlight');
      }
    }

    return classes;
  }, [committedRange, startOnly, hoveredDate, selectionPhase, holidaySet, isWeekend,
      dateOfJoining, getSingleDayEfficiency, pulsedHoliday, suggestions]);

  // ── tileContent (H/W tags + tooltip) ─────────────────────────────────────
  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const dateStr      = formatIsoDate(date);
    const isHolidayDay = holidaySet.has(dateStr);
    const isWeekendDay = isWeekend(date);

    let badge: JSX.Element | null = null;
    if (isHolidayDay) {
      badge = <div className="leave-request-calendar__tag leave-request-calendar__tag--holiday">H</div>;
    } else if (isWeekendDay) {
      badge = <div className="leave-request-calendar__tag leave-request-calendar__tag--weekend">W</div>;
    }

    const isHovered = hoveredDate && dayjs(date).isSame(hoveredDate, 'day');
    let tooltipText: string | null = null;

    if (isHovered) {
      if (isHolidayDay) {
        const h = publicHolidays.find((p: any) => dayjs(p?.date).format('YYYY-MM-DD') === dateStr);
        tooltipText = `${h?.name || h?.holiday_name || h?.title || 'Public Holiday'} · No leave needed`;
      } else if (isWeekendDay) {
        tooltipText = 'Weekend · Not charged';
      } else if (selectionPhase === 'start-set' && startOnly) {
        const fwd   = dayjs(startOnly).isBefore(dayjs(date));
        const start = fwd ? startOnly : date;
        const end   = fwd ? date      : startOnly;
        const bd    = computeLeaveBreakdown(start, end, holidaySet, isWeekend);
        tooltipText = bd.chargeable === 0
          ? 'No leave needed'
          : `${bd.chargeable} leave${bd.chargeable !== 1 ? 's' : ''} → ${bd.totalCalendarDays} days off`;
      } else {
        const eff = getSingleDayEfficiency(date);
        if (eff >= 3) tooltipText = `${eff} days off for 1 leave`;
      }
    }

    return (
      <div
        className="leave-request-calendar__tile-content-wrapper"
        onMouseEnter={() => setHoveredDate(date)}
        onMouseLeave={() => setHoveredDate(null)}
      >
        {badge}
        {tooltipText && (
          <div className="leave-request-calendar__tooltip" role="tooltip">{tooltipText}</div>
        )}
      </div>
    );
  }, [holidaySet, isWeekend, hoveredDate, selectionPhase, startOnly,
      publicHolidays, getSingleDayEfficiency]);

  // ── Calendar onChange ─────────────────────────────────────────────────────
  const onChange = useCallback((range: any) => {
    const dates = Array.isArray(range) ? range : [range];
    if (!dates[0]) return;
    const start           = dates[0];
    const end             = dates[1] || dates[0];
    const formattedStart  = formatIsoDate(start);
    const formattedEnd    = formatIsoDate(end);

    setFieldValue('dateFrom', formattedStart, true);
    setFieldValue('dateTo',   formattedEnd,   true);
    setDismissedComparison(false); // reset dismiss on new selection

    if (formattedStart && formattedEnd && formattedStart !== formattedEnd) {
      calculateLeaveCount(formattedStart, formattedEnd);
    }
  }, [setFieldValue, calculateLeaveCount]);

  // ── Holiday strip click-to-navigate ──────────────────────────────────────
  const onHolidayChipClick = useCallback((holidayDateStr: string) => {
    setDisplayMonth(dayjs(holidayDateStr).startOf('month'));
    setPulsedHoliday(holidayDateStr);
    setTimeout(() => setPulsedHoliday(null), 1200);
  }, []);

  // ── Derived UI flags ──────────────────────────────────────────────────────
  const isRangeComplete = selectionPhase === 'committed';
  const isBalanceEmpty  = leaveTypeLabel !== undefined && countTotalLeaves === 0;

  // Delta text for comparison banner
  const comparisonDelta = betterAlternative && committedRange
    ? (() => {
        const current = computeLeaveUsage(committedRange[0], committedRange[1], holidaySet);
        const daysGain = betterAlternative.daysOff - current.daysOff;
        const leaveSave = current.leaveDays - betterAlternative.leaveDays;
        if (leaveSave > 0) return `Save ${leaveSave} leave day${leaveSave > 1 ? 's' : ''}`;
        if (daysGain > 0)  return `+${daysGain} day${daysGain > 1 ? 's' : ''} off, same leaves`;
        return null;
      })()
    : null;

  return (
    <div className={`leave-request-calendar${selectionPhase === 'start-set' ? ' leave-request-calendar--selecting' : ''}`}>

      {/* ── Selection header ──────────────────────────────────────────── */}
      {isRangeComplete ? (
        <div
          className="leave-request-calendar__selection-compact"
          aria-label={`Leave dates: ${fromDateDisplay?.full} to ${toDateDisplay?.full}`}
        >
          <span className="leave-request-calendar__date-label">Leave dates</span>
          <span className="leave-request-calendar__selection-range">
            {fromDateDisplay?.full}
            <span className="leave-request-calendar__divider" aria-hidden="true"> → </span>
            {toDateDisplay?.full}
          </span>
          <button
            type="button"
            className="leave-request-calendar__selection-clear"
            aria-label="Clear date selection"
            onClick={() => {
              setFieldValue('dateFrom', '', false);
              setFieldValue('dateTo',   '', false);
              setDismissedComparison(false);
            }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="leave-request-calendar__selection-info">
          <div className="leave-request-calendar__date-block">
            <div className="leave-request-calendar__date-label">From Date</div>
            <div className="leave-request-calendar__date-value">
              {fromDateDisplay ? (
                <>
                  <span className="leave-request-calendar__date-day">{fromDateDisplay.day}</span>
                  <span className="leave-request-calendar__date-text">{fromDateDisplay.short}</span>
                </>
              ) : (
                <span className="leave-request-calendar__date-placeholder">
                  {selectionPhase === 'empty' ? 'Click to select' : 'Selecting…'}
                </span>
              )}
            </div>
          </div>
          <div className="leave-request-calendar__divider" aria-hidden="true">→</div>
          <div className="leave-request-calendar__date-block">
            <div className="leave-request-calendar__date-label">To Date</div>
            <div className="leave-request-calendar__date-value">
              {toDateDisplay && fromDate !== toDate ? (
                <>
                  <span className="leave-request-calendar__date-day">{toDateDisplay.day}</span>
                  <span className="leave-request-calendar__date-text">{toDateDisplay.short}</span>
                </>
              ) : (
                <span className="leave-request-calendar__date-placeholder">
                  {selectionPhase === 'start-set' ? 'Hover to preview' : 'Select date'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Zero-balance alert (before calendar) ──────────────────────── */}
      {isBalanceEmpty && (
        <div className="alert alert-warning py-2 px-3 mb-3" role="alert" style={{ fontSize: '0.85rem' }}>
          No balance remaining for <strong>{leaveTypeLabel}</strong>. Select a different leave type or contact HR.
        </div>
      )}

      {/* ── Comparison banner (post-commit, with delta + dismiss) ─────── */}
      {betterAlternative && isRangeComplete && (
        <div className="leave-request-calendar__comparison-alert" role="alert" aria-live="polite">
          <div className="leave-request-calendar__comparison-header">
            Fewer leaves, more days off
            {comparisonDelta && (
              <span className="leave-request-calendar__comparison-delta">{comparisonDelta}</span>
            )}
          </div>
          <div className="leave-request-calendar__comparison-body">
            Try{' '}
            <strong>
              {dayjs(betterAlternative.start).format('DD MMM')} – {dayjs(betterAlternative.end).format('DD MMM')}
            </strong>
            {' '}· {betterAlternative.leaveDays} leave{betterAlternative.leaveDays !== 1 ? 's' : ''},
            {' '}{betterAlternative.daysOff} days off
          </div>
          <div className="leave-request-calendar__comparison-actions">
            <button
              type="button"
              className="leave-request-calendar__comparison-btn"
              aria-label={`Apply suggested range: ${dayjs(betterAlternative.start).format('DD MMM')} to ${dayjs(betterAlternative.end).format('DD MMM')}`}
              onClick={() => onChange([betterAlternative.start, betterAlternative.end])}
            >
              Apply this range
            </button>
            <button
              type="button"
              className="leave-request-calendar__comparison-dismiss"
              aria-label="Keep current selection"
              onClick={() => setDismissedComparison(true)}
            >
              Keep current
            </button>
          </div>
        </div>
      )}

      {/* ── Calendar ──────────────────────────────────────────────────── */}
      <div
        className={`leave-request-calendar__calendar-wrapper${isBalanceEmpty ? ' leave-request-calendar__calendar-wrapper--disabled' : ''}`}
        aria-hidden={isBalanceEmpty ? 'true' : undefined}
      >
        <Calendar
          onChange={onChange}
          onActiveStartDateChange={({ activeStartDate }) =>
            activeStartDate && setDisplayMonth(dayjs(activeStartDate))
          }
          selectRange
          showDoubleView
          value={calendarValue as any}
          allowPartialRange
          minDate={dateOfJoining ? new Date(dateOfJoining) : undefined}
          tileClassName={tileClassName}
          tileContent={tileContent}
          tileDisabled={isBalanceEmpty ? () => true : undefined}
          showNeighboringMonth={false}
        />
      </div>

      {/* ── Holiday bar ───────────────────────────────────────────────── */}
      {upcomingHolidays.length > 0 && (
        <div className="leave-request-calendar__holiday-bar" role="list" aria-label="Upcoming public holidays">
          {upcomingHolidays.map((h: any, idx: number) => (
            <div
              key={idx}
              className="leave-request-calendar__holiday-chip"
              role="button"
              tabIndex={0}
              aria-label={`${h.name || h.holiday_name || h.title || 'Holiday'} on ${dayjs(h.date).format('DD MMM')} — click to navigate`}
              onClick={() => onHolidayChipClick(dayjs(h.date).format('YYYY-MM-DD'))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onHolidayChipClick(dayjs(h.date).format('YYYY-MM-DD'));
                }
              }}
            >
              <div className="leave-request-calendar__holiday-chip-name">
                {h.name || h.holiday_name || h.title || 'Holiday'}
              </div>
              <div className="leave-request-calendar__holiday-chip-date">
                {dayjs(h.date).format('ddd, DD MMM')} · 1 Day
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Smart suggestions ─────────────────────────────────────────── */}
      {suggestions.length > 0 && !isBalanceEmpty && (
        <div className="leave-request-calendar__suggestions">
          <div className="leave-request-calendar__suggestions-title">Smart Suggestions</div>
          <ul
            role="listbox"
            aria-label="Suggested leave date ranges"
            className="leave-request-calendar__suggestions-list"
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {suggestions.map((s, idx) => (
              <li
                key={idx}
                role="option"
                aria-selected={false}
                tabIndex={0}
                className="leave-request-calendar__suggestion-item"
                onClick={() => onChange([s.start, s.end])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange([s.start, s.end]); }
                }}
              >
                <div className="leave-request-calendar__suggestion-dates">
                  {dayjs(s.start).format('DD MMM')} – {dayjs(s.end).format('DD MMM')}
                </div>
                <div className="leave-request-calendar__suggestion-desc">{s.description}</div>
                <div
                  className="leave-request-calendar__suggestion-badge"
                  title="Days off ÷ leave days used. Higher = more rest per leave day."
                  aria-label={`${s.efficiency.toFixed(1)}x efficiency`}
                >
                  {s.efficiency.toFixed(1)}x Impact
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── RangeStatBar ──────────────────────────────────────────────── */}
      <RangeStatBar
        breakdown={activeBreakdown}
        isPreview={selectionPhase === 'start-set'}
      />

      {/* ── BalanceGauge ──────────────────────────────────────────────── */}
      <BalanceGauge
        leaveTypeLabel={leaveTypeLabel}
        available={countTotalLeaves}
        requesting={leaveCount}
      />

      {/* ── Cumulative summary stat ───────────────────────────────────── */}
      {cumulativeSummary && (
        <div className="leave-request-calendar__cumulative" role="status" aria-live="polite">
          <span className="leave-request-calendar__cumulative-label">Allowed this month</span>
          <span className="leave-request-calendar__cumulative-value">
            {cumulativeSummary.remaining} / {cumulativeSummary.allowedTillNow}
          </span>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div className="leave-request-calendar__legend">
        {[
          { cls: 'selected',  label: 'Selected range' },
          { cls: 'holiday',   label: 'Holiday (H)' },
          { cls: 'weekend',   label: 'Weekend (W)' },
          { cls: 'eff-high',  label: 'High Efficiency' },
          { cls: 'eff-mid',   label: 'Normal' },
          { cls: 'eff-low',   label: 'Low Efficiency' },
        ].map(({ cls, label }) => (
          <span key={cls} className="leave-request-calendar__legend-item">
            <span className={`leave-request-calendar__legend-chip leave-request-calendar__legend-chip--${cls}`} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LeaveRequestCalendar;
