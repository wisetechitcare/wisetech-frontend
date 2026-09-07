import dayjs from 'dayjs';

/**
 * Where an anniversary of `from` falls on the calendar, or `null` if there isn't one yet.
 *
 * The `null` is the point. Every anniversary block on the workspace calendar used to take
 * the date's month and day, drop it into a year and emit an event — which means the day
 * someone JOINS is also their "Work Anniversary", a zeroth anniversary nobody celebrates.
 * The same held for a wedding date: the day of the wedding is not an anniversary of it.
 * So the completed years are counted against the date the event actually lands on, and
 * fewer than one means there is nothing to show.
 *
 * Counted with `diff(from, 'year')`, which floors on WHOLE elapsed years — someone who
 * joined on 2026-08-07 appears on 2027-08-07 and not a day earlier. A date in the future
 * (a joining date entered ahead of time) counts negative and is dropped the same way.
 *
 * `viewYear` preserves the calendar's existing placement rule, which this does not try to
 * change: this year if the day is still ahead, otherwise the year being viewed.
 */
export const anniversaryDateOrNull = (
  from: dayjs.Dayjs,
  viewYear: number,
  today: dayjs.Dayjs = dayjs().startOf('day'),
): dayjs.Dayjs | null => {
  let next = from.year(today.year());
  if (next.isBefore(today, 'day')) next = from.year(viewYear);
  return next.diff(from, 'year') >= 1 ? next : null;
};
