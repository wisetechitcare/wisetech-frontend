/**
 * App-wide week start = Monday.
 *
 * Import once at boot (`main.tsx`) before any calendar / picker renders. Covers:
 *  - dayjs `startOf('week')` / `endOf('week')` and MUI X `AdapterDayjs` calendars
 *    (weekday headers + month grid alignment)
 *  - Flatpickr default locale (`firstDayOfWeek`)
 *
 * FullCalendar instances should also set `firstDay={1}` (or use `en-gb`); MonthGrid
 * already defaults `weekStartsOn={1}`.
 */
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import localeData from 'dayjs/plugin/localeData';
import flatpickr from 'flatpickr';

/** ISO weekday: 0 = Sunday … 6 = Saturday. Monday = 1. */
export const APP_WEEK_START = 1 as const;

let configured = false;

export function configureWeekStart(): void {
  if (configured) return;
  configured = true;

  dayjs.extend(updateLocale);
  dayjs.extend(localeData);
  dayjs.updateLocale('en', { weekStart: APP_WEEK_START });

  // English Flatpickr defaults to Sunday; patch the shared locale every instance inherits.
  const base = flatpickr.l10ns.default;
  flatpickr.l10ns.default = {
    ...base,
    firstDayOfWeek: APP_WEEK_START,
  };
}
