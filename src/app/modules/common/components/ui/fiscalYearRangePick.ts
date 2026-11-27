import type { CalendarDate } from '@internationalized/date';

export type FiscalRangeBound = 'start' | 'end';

/** Draft state for the kit CalendarDate picker. */
export type FiscalCalendarRangeDraft = {
  from: CalendarDate | null;
  to: CalendarDate | null;
  /** Which bound is active for the next click. */
  bound: FiscalRangeBound;
};

export const EMPTY_FISCAL_DRAFT: FiscalCalendarRangeDraft = { from: null, to: null, bound: 'start' };

/**
 * Apply one day click to a fiscal range draft.
 * Restart when there is no start, or both ends are set and the user is not editing End.
 */
export const applyFiscalCalendarDayPick = (
  draft: FiscalCalendarRangeDraft,
  day: CalendarDate,
): FiscalCalendarRangeDraft => {
  const restart = !draft.from || (draft.to !== null && draft.bound !== 'end');
  if (restart) {
    return { from: day, to: null, bound: 'end' };
  }
  return { from: draft.from, to: day, bound: 'start' };
};
