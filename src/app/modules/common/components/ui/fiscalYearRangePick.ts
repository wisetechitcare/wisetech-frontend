import type { Dayjs } from 'dayjs';

export type FiscalRangeBound = 'start' | 'end';

/** Draft state after one calendar day click. */
export type FiscalRangeDraft = {
  from: Dayjs | null;
  to: Dayjs | null;
  /** Which bound is active for the next click. */
  bound: FiscalRangeBound;
};

/**
 * Apply one day click to a fiscal range draft.
 * Restart when there is no start, or both ends are set and the user is not editing End.
 */
export const applyFiscalRangeDayPick = (
  draft: FiscalRangeDraft,
  day: Dayjs,
): FiscalRangeDraft => {
  const d = day.startOf('day');
  const restart = !draft.from || (Boolean(draft.from && draft.to) && draft.bound !== 'end');
  if (restart) {
    return { from: d, to: null, bound: 'end' };
  }
  return { from: draft.from, to: d, bound: 'start' };
};
