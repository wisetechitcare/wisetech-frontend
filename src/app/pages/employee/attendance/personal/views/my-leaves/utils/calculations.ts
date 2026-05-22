import dayjs from 'dayjs';

export const isHoliday = (dateStr: string, holidays: Set<string>) => holidays.has(dateStr);

export const isWeekend = (date: Date) => {
  const day = dayjs(date).day();
  return day === 0 || day === 6;
};

/**
 * Compute leave usage and efficiency for a date range.
 * Returns total calendar days, leave days required (excluding weekends/holidays),
 * total days off (calendar days), and an efficiency score (daysOff / leaveDays).
 */
export function computeLeaveUsage(
  start: Date,
  end: Date,
  holidays: Set<string>
): {
  totalDays: number;
  leaveDays: number;
  daysOff: number;
  efficiencyScore: number;
} {
  const totalDays = dayjs(end).diff(dayjs(start), 'day') + 1;
  let leaveDays = 0;
  for (let i = 0; i < totalDays; i++) {
    const cur = dayjs(start).add(i, 'day').toDate();
    const iso = dayjs(cur).format('YYYY-MM-DD');
    if (isWeekend(cur) || isHoliday(iso, holidays)) continue;
    leaveDays++;
  }
  const daysOff = totalDays;
  const efficiencyScore = leaveDays === 0 ? 0 : daysOff / leaveDays;
  return { totalDays, leaveDays, daysOff, efficiencyScore };
}
