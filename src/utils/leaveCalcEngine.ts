import dayjs from 'dayjs';

export interface LeaveBreakdown {
  totalCalendarDays: number;
  weekendDays: number;
  /** Public holidays that are NOT already counted as weekends. */
  holidayDays: number;
  chargeable: number;
  excluded: number;
}

/**
 * Computes a full leave breakdown for a date range.
 * Accepts a configurable isWeekend function so company-specific working-day
 * config (workingAndOffDays) is respected, not just Sat/Sun.
 */
export function computeLeaveBreakdown(
  start: Date,
  end: Date,
  holidaySet: Set<string>,
  isWeekendFn: (date: Date) => boolean,
): LeaveBreakdown {
  let current = dayjs(start);
  const endD  = dayjs(end);

  let totalCalendarDays = 0;
  let weekendDays       = 0;
  let holidayDays       = 0;

  while (current.isBefore(endD) || current.isSame(endD, 'day')) {
    totalCalendarDays++;
    const dateStr  = current.format('YYYY-MM-DD');
    const isWknd   = isWeekendFn(current.toDate());
    const isHolDay = holidaySet.has(dateStr);

    if (isWknd) {
      weekendDays++;
    } else if (isHolDay) {
      holidayDays++;
    }
    current = current.add(1, 'day');
  }

  const excluded   = weekendDays + holidayDays;
  const chargeable = Math.max(0, totalCalendarDays - excluded);

  return { totalCalendarDays, weekendDays, holidayDays, chargeable, excluded };
}
