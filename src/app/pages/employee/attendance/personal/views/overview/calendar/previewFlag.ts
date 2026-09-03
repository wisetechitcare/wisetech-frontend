/**
 * Which attendance calendar renders.
 *
 * **On this branch the re-platformed calendar is the DEFAULT.** The legacy
 * `AttendanceCalendar` is still mounted and one query param away, so this is a
 * switch, not a deletion.
 *
 *   (no param)          → new calendar
 *   ?calendar=legacy    → old calendar, remembered for this browser
 *   ?calendar=next      → new calendar, remembered (clears a previous opt-out)
 *
 * ── Why the default flipped ────────────────────────────────────────────────
 * It was opt-IN via `?calendar=next`, which never worked in practice: something
 * on this route drops the query string before `OverviewView` mounts, so the
 * flag was read from a URL that no longer had it and never reached the
 * localStorage fallback. Rather than chase that redirect, the useful state —
 * seeing the thing — became the default, and opting OUT is the explicit act.
 *
 * The read is also hoisted to module load (see `INITIAL`), so the param is
 * captured the moment this module is first evaluated rather than whenever a
 * component happens to call in.
 *
 * DELETE THIS FILE when the migration lands. A flag that outlives its rollout
 * is a second code path nobody tests.
 */
const KEY = 'wt_attendance_calendar_preview';

export type CalendarVariant = 'next' | 'legacy';

/**
 * Captured at module evaluation, before any routing or redirect can strip the
 * query string. Reading it later — inside a component's first render — is what
 * made the opt-in flag unreachable.
 */
const INITIAL: CalendarVariant = (() => {
    if (typeof window === 'undefined') return 'next';
    try {
        const param = new URLSearchParams(window.location.search).get('calendar');
        if (param === 'next' || param === 'legacy') {
            window.localStorage.setItem(KEY, param);
            return param;
        }
        // No param: honour a remembered opt-out, otherwise the new calendar.
        return window.localStorage.getItem(KEY) === 'legacy' ? 'legacy' : 'next';
    } catch {
        // Private mode / blocked storage. The new calendar degrades to an error
        // card if its endpoint fails, so defaulting to it is safe.
        return 'next';
    }
})();

export function resolveCalendarVariant(): CalendarVariant {
    return INITIAL;
}

/** Forget the remembered choice — the next load follows the default again. */
export function clearCalendarVariant(): void {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        /* no-op */
    }
}
