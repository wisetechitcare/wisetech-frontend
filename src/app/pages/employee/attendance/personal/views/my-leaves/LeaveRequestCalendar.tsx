import { useMemo, useState, useCallback } from 'react';

import dayjs, { Dayjs } from 'dayjs';

import isBetween from 'dayjs/plugin/isBetween';

import './LeaveRequestCalendar.css';



import { computeLeaveBreakdown } from '@utils/leaveCalcEngine';

import { generateSmartSuggestions, generatePersonalizedSuggestions } from './utils/suggestionEngine';

import { Status } from '@constants/statistics';

import { LeaveCalendarGrid } from './leave/LeaveCalendarGrid';

import { InlineAlerts } from './leave/InlineAlerts';

import { SmartSuggestionsPanel } from './leave/SmartSuggestionsPanel';

import { useLeaveValidation } from './leave/useLeaveValidation';

import { LeaveImpactCard } from './leave/LeaveImpactCard';

import { SandwichRuleBanner } from './leave/SandwichRuleBanner';

import { previewSandwichImpact, getSandwichRiskDateSet } from './leave/sandwichPreview';

import type { Holiday, LeaveRecord, SelectionPhase, CumulativeSummary } from './leave/leaveTypes';



dayjs.extend(isBetween);



interface LeaveRequestCalendarProps {

  fromDate: string;

  toDate: string;

  setFieldValue: (field: string, value: string, shouldValidate?: boolean) => void;

  calculateLeaveCount: (fromDate: string, toDate: string) => void;

  publicHolidays: any[];

  workingAndOffDays: Record<string, string>;

  dateOfJoining: string;

  leaveTypeLabel?: string;

  leaveCount: number;

  countTotalLeaves: number;

  cumulativeSummary?: CumulativeSummary | null;

  employeeLeavesData?: any[];

  isUnpaidType?: boolean;

  editingLeaveId?: string;

  inlineFormWarning?: string;

  sandwichLeaveEnabled?: boolean;

}



const formatIso = (d: Dayjs | Date) => dayjs(d).format('YYYY-MM-DD');



const LeaveRequestCalendar = ({

  fromDate,

  toDate,

  setFieldValue,

  calculateLeaveCount,

  publicHolidays,

  workingAndOffDays,

  dateOfJoining,

  leaveTypeLabel,

  leaveCount,

  countTotalLeaves,

  cumulativeSummary,

  employeeLeavesData = [],

  isUnpaidType = false,

  editingLeaveId,

  inlineFormWarning,

  sandwichLeaveEnabled = false,

}: LeaveRequestCalendarProps) => {

  const [viewMonth, setViewMonth] = useState<Dayjs>(() => dayjs());

  const [twoMonthView, setTwoMonthView] = useState(false);

  const [hoverIso, setHoverIso] = useState<string | null>(null);

  const [focusIso, setFocusIso] = useState(() => dayjs().format('YYYY-MM-DD'));

  const [lastClickedIso, setLastClickedIso] = useState<string | null>(null);



  const holidaySet = useMemo(

    () =>

      new Set(

        (publicHolidays || [])

          .map((h: any) => dayjs(h?.date).format('YYYY-MM-DD'))

          .filter(Boolean),

      ),

    [publicHolidays],

  );



  const holidays: Holiday[] = useMemo(

    () =>

      (publicHolidays || []).map((h: any) => ({

        date: dayjs(h?.date).format('YYYY-MM-DD'),

        name: h?.name || h?.holiday_name || h?.title || 'Holiday',

      })),

    [publicHolidays],

  );



  const existingLeaves: LeaveRecord[] = useMemo(

    () =>

      (employeeLeavesData || [])

        .filter((l: any) => {

          const sn = l.statusNumber ?? l.status;

          if (typeof sn === 'number') {

            return sn === Status.Approved || sn === Status.ApprovalNeeded;

          }

          return true;

        })

        .map((l: any) => ({

          id: l.id,

          dateFrom: l.dateFrom,

          dateTo: l.dateTo,

          status: typeof l.statusNumber === 'number' ? l.statusNumber : Status.ApprovalNeeded,

        })),

    [employeeLeavesData],

  );



  const isWeekend = useCallback(

    (date: Date): boolean => {

      const dayName = DAY_NAMES[date.getDay()];

      if (workingAndOffDays && Object.keys(workingAndOffDays).length > 0) {

        return workingAndOffDays[dayName] === '0';

      }

      return date.getDay() === 0 || date.getDay() === 6;

    },

    [workingAndOffDays],

  );



  const phase: SelectionPhase = useMemo(() => {

    if (!fromDate) return 'idle';

    if (!toDate || fromDate === toDate) return 'pick-end';

    return 'committed';

  }, [fromDate, toDate]);



  const committedRange = useMemo(() => {

    if (phase !== 'committed' || !fromDate || !toDate) return null;

    const a = dayjs(fromDate);

    const b = dayjs(toDate);

    const start = a.isBefore(b) ? a : b;

    const end = a.isBefore(b) ? b : a;

    return [start.toDate(), end.toDate()] as [Date, Date];

  }, [phase, fromDate, toDate]);



  const hoverBreakdown = useMemo(() => {

    if (phase !== 'pick-end' || !fromDate || !hoverIso) return null;

    const a = dayjs(fromDate);

    const b = dayjs(hoverIso);

    const start = a.isBefore(b) ? a : b;

    const end = a.isBefore(b) ? b : a;

    return computeLeaveBreakdown(start.toDate(), end.toDate(), holidaySet, isWeekend);

  }, [phase, fromDate, hoverIso, holidaySet, isWeekend]);



  const committedBreakdown = useMemo(() => {

    if (!committedRange) return null;

    return computeLeaveBreakdown(committedRange[0], committedRange[1], holidaySet, isWeekend);

  }, [committedRange, holidaySet, isWeekend]);

  // Shows the impact card as soon as the first date is clicked, even before hovering to a second date.
  const singleDayBreakdown = useMemo(() => {

    if (phase !== 'pick-end' || !fromDate) return null;

    const d = dayjs(fromDate).toDate();

    return computeLeaveBreakdown(d, d, holidaySet, isWeekend);

  }, [phase, fromDate, holidaySet, isWeekend]);

  const activeBreakdown = committedBreakdown ?? hoverBreakdown ?? singleDayBreakdown;



  const sandwichPreview = useMemo(() => {

    if (!sandwichLeaveEnabled || isUnpaidType) return null;

    const rangeFrom = phase === 'committed' ? fromDate : phase === 'pick-end' && hoverIso ? fromDate : null;

    const rangeTo =

      phase === 'committed'

        ? toDate

        : phase === 'pick-end' && hoverIso

          ? hoverIso

          : null;

    if (!rangeFrom || !rangeTo || rangeFrom === rangeTo) return null;

    return previewSandwichImpact(rangeFrom, rangeTo, holidaySet, isWeekend, holidays);

  }, [sandwichLeaveEnabled, isUnpaidType, phase, fromDate, toDate, hoverIso, holidaySet, isWeekend]);



  const sandwichRiskDates = useMemo(

    () => getSandwichRiskDateSet(sandwichPreview),

    [sandwichPreview],

  );



  const helperText = useMemo(() => {

    if (phase === 'idle') return 'Click start date';

    if (phase === 'pick-end') return 'Click end date';

    if (!fromDate || !toDate) return '';

    const start = dayjs(fromDate);

    const end = dayjs(toDate);

    const a = start.isBefore(end) ? start : end;

    const b = start.isBefore(end) ? end : start;

    return `${a.format('DD MMM YYYY')} → ${b.format('DD MMM YYYY')}`;

  }, [phase, fromDate, toDate]);



  const calendarAlerts = useLeaveValidation({

    clickedIso: lastClickedIso,

    dateFrom: fromDate || null,

    dateTo: phase === 'committed' ? toDate : null,

    phase,

    holidays,

    holidaySet,

    isWeekend,

    minDate: dateOfJoining,

    existingLeaves,

    cumulativeSummary: cumulativeSummary ?? undefined,

    countTotalLeaves,

    isUnpaidType,

    excludeLeaveId: editingLeaveId,

  });



  const clickTimeAlerts = calendarAlerts.filter(

    (a) => a.id.startsWith('holiday-') || a.id === 'weekend' || a.id === 'past',

  );



  const generalSuggestions = useMemo(() => {

    const today = new Date();

    return generateSmartSuggestions({

      windowStart: today,

      windowEnd: dayjs(today).add(90, 'day').toDate(),

      holidays: holidaySet,

      isWeekendFn: isWeekend,

      balanceAvailable: countTotalLeaves || 0,

      capRemaining: cumulativeSummary?.remaining ?? Infinity,

      existingLeaves: existingLeaves.map(l => ({ dateFrom: l.dateFrom, dateTo: l.dateTo })),

    });

  }, [holidaySet, isWeekend, countTotalLeaves, cumulativeSummary, existingLeaves]);

  const leaveHistory = useMemo(
    () =>
      (employeeLeavesData || []).map((l: any) => ({
        dateFrom: l.dateFrom,
        dateTo: l.dateTo,
        statusNumber: typeof l.statusNumber === 'number' ? l.statusNumber : l.status,
      })),
    [employeeLeavesData],
  );

  const isPersonalizedFallback = useMemo(
    () => leaveHistory.filter((l: any) => l.statusNumber === 1).length < 2,
    [leaveHistory],
  );

  const personalizedSuggestions = useMemo(() => {

    const today = new Date();

    return generatePersonalizedSuggestions(

      {

        windowStart: today,

        windowEnd: dayjs(today).add(365, 'day').toDate(),

        holidays: holidaySet,

        isWeekendFn: isWeekend,

        balanceAvailable: countTotalLeaves || 0,

        capRemaining: cumulativeSummary?.remaining ?? Infinity,

        existingLeaves: existingLeaves.map(l => ({ dateFrom: l.dateFrom, dateTo: l.dateTo })),

        leaveHistory,

      },

      generalSuggestions,

      2,

    );

  }, [holidaySet, isWeekend, countTotalLeaves, cumulativeSummary, existingLeaves, leaveHistory, generalSuggestions]);



  const calendarDisabled =

    !leaveTypeLabel || (!isUnpaidType && countTotalLeaves === 0);



  const applyRange = useCallback(

    (start: Date, end: Date) => {

      const from = formatIso(start);

      const to = formatIso(end);

      setFieldValue('dateFrom', from, false);

      setFieldValue('dateTo', to, false);

      calculateLeaveCount(from, to);

      setViewMonth(dayjs(end).startOf('month'));

    },

    [setFieldValue, calculateLeaveCount],

  );



  const handleSelectIso = useCallback(

    (iso: string) => {

      if (calendarDisabled) return;

      setLastClickedIso(iso);

      setFocusIso(iso);



      if (phase === 'idle' || phase === 'committed') {

        setFieldValue('dateFrom', iso, false);

        setFieldValue('dateTo', iso, false);

        setViewMonth(dayjs(iso).startOf('month'));

        return;

      }



      if (phase === 'pick-end' && fromDate) {

        const a = dayjs(fromDate);

        const b = dayjs(iso);

        const from = a.isBefore(b) ? formatIso(a) : formatIso(b);

        const to = a.isBefore(b) ? formatIso(b) : formatIso(a);

        setFieldValue('dateFrom', from, false);

        setFieldValue('dateTo', to, false);

        calculateLeaveCount(from, to);

        if (!dayjs(to).isSame(viewMonth, 'month') && !dayjs(from).isSame(viewMonth, 'month')) {

          setViewMonth(dayjs(to).startOf('month'));

        }

      }

    },

    [calendarDisabled, phase, fromDate, setFieldValue, calculateLeaveCount, viewMonth],

  );



  const clearSelection = () => {

    setFieldValue('dateFrom', '', false);

    setFieldValue('dateTo', '', false);

    setLastClickedIso(null);

  };



  const showSandwichBanner =

    sandwichLeaveEnabled &&

    sandwichPreview &&

    sandwichPreview.sandwichDaysAdded > 0 &&

    phase === 'committed' &&

    fromDate &&

    toDate &&

    fromDate !== toDate;



  return (

    <div

      className={`leave-request-calendar leave-request-calendar--v2${

        phase === 'pick-end' ? ' leave-request-calendar--selecting' : ''

      }`}

    >

      <div className="lrc-helper-row">

        <p className="lrc-helper-text" aria-live="polite">

          {helperText}

        </p>

        {phase === 'committed' && (

          <button

            type="button"

            className="lrc-clear-btn"

            aria-label="Clear date selection"

            onClick={clearSelection}

          >

            Clear

          </button>

        )}

      </div>



      {calendarDisabled && (

        <div className="lrc-alert lrc-alert--warning" role="alert">

          No balance remaining for <strong>{leaveTypeLabel}</strong>. Select a different leave type or contact HR.

        </div>

      )}



      <InlineAlerts alerts={clickTimeAlerts} globalWarning={inlineFormWarning} />



      <div

        className={

          calendarDisabled ? 'lrc-calendar-panel-wrap lrc-calendar-panel-wrap--disabled' : 'lrc-calendar-panel-wrap'

        }

        aria-hidden={calendarDisabled ? true : undefined}

      >

        <LeaveCalendarGrid

          viewMonth={viewMonth}

          twoMonthView={twoMonthView}

          onViewMonthChange={setViewMonth}

          onToggleTwoMonth={() => setTwoMonthView((v) => !v)}

          dateFrom={fromDate}

          dateTo={toDate}

          phase={phase}

          hoverIso={hoverIso}

          focusIso={focusIso}

          onHoverIso={setHoverIso}

          onFocusIso={setFocusIso}

          onSelectIso={handleSelectIso}

          onClearSelection={clearSelection}

          holidaySet={holidaySet}

          holidays={holidays}

          publicHolidaysRaw={publicHolidays}

          isWeekend={isWeekend}

          minDate={dateOfJoining}

          existingLeaves={existingLeaves}

          disabled={calendarDisabled}

          sandwichRiskDates={sandwichRiskDates}

        />

      </div>



      {showSandwichBanner && sandwichPreview && (

        <SandwichRuleBanner preview={sandwichPreview} dateFrom={fromDate} dateTo={toDate} />

      )}



      {!calendarDisabled && (

        <SmartSuggestionsPanel

          general={generalSuggestions}

          personalized={personalizedSuggestions}

          isPersonalizedFallback={isPersonalizedFallback}

          onApply={applyRange}

        />

      )}



      <LeaveImpactCard

        breakdown={activeBreakdown}

        dateFrom={fromDate}

        dateTo={toDate}

        phase={phase}

        leaveCount={leaveCount}

        countTotalLeaves={countTotalLeaves}

        leaveTypeLabel={leaveTypeLabel}

        isPreview={phase === 'pick-end'}

        sandwichPreview={sandwichPreview}

        sandwichEnabled={sandwichLeaveEnabled && !isUnpaidType}

        cumulativeSummary={cumulativeSummary}

        outcomeAlerts={calendarAlerts}

      />

    </div>

  );

};



const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];



export default LeaveRequestCalendar;


