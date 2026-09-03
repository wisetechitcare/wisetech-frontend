/**
 * Preview flag for the re-platformed attendance calendar.
 *
 * A URL param rather than an env var or a server-side feature row, on purpose:
 * this needs to be switchable on a deployed build, per person, without a
 * rebuild or a config write — that is the whole point of looking at it against
 * real data before committing to it.
 *
 *   ?calendar=next     → new grid, and remembered for this browser
 *   ?calendar=legacy   → old grid, and remembered
 *
 * The choice persists in localStorage so you don't have to keep the param
 * pinned to the URL while clicking around.
 *
 * DELETE THIS FILE when the migration lands. A flag that outlives its rollout
 * is just a second code path nobody tests.
 */
const KEY = 'wt_attendance_calendar_preview';

export type CalendarVariant = 'next' | 'legacy';

export function resolveCalendarVariant(): CalendarVariant {
  if (typeof window === 'undefined') return 'legacy';

  try {
    const param = new URLSearchParams(window.location.search).get('calendar');
    if (param === 'next' || param === 'legacy') {
      window.localStorage.setItem(KEY, param);
      return param;
    }
    return window.localStorage.getItem(KEY) === 'next' ? 'next' : 'legacy';
  } catch {
    // Private mode / blocked storage — fall back to the shipped behaviour.
    return 'legacy';
  }
}

export function clearCalendarVariant(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
