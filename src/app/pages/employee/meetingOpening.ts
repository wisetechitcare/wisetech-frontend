import dayjs from 'dayjs';

/**
 * Where a meeting form opens.
 *
 * Its own module rather than a private helper inside MeetingFormBody, because this is the one
 * piece of that form with a rule worth checking and the component drags the whole app layout in
 * behind it. Same reason meetingLimits and meetingAddress live out here.
 */

/**
 * Calendar drag-selection, so a meeting drawn on the grid opens on those times.
 *
 * Typed loosely on purpose: what the calendar hands over is FullCalendar's own selection
 * object, which carries `startStr`/`endStr` alongside the Date pair. Both spellings are
 * accepted rather than making the caller reshape it at every call site.
 */
export interface SelectedDateTimeInfo {
    start?: string | Date; end?: string | Date; allDay?: boolean;
    startStr?: string; endStr?: string;
}

/**
 * Opening times. A meeting drawn on the calendar — or picked out of the month grid's day
 * dialog — keeps its slot; anything else starts in an hour, because a meeting scheduled for
 * the moment it was created is nobody's intent.
 *
 * A slot that has already passed falls forward to now + 1h rather than opening in the past.
 */
export const openingRange = (info?: SelectedDateTimeInfo | null) => {
    const now = dayjs();
    const rawStart = info?.start ?? info?.startStr;
    const rawEnd = info?.end ?? info?.endStr;
    let start = rawStart ? dayjs(rawStart) : null;
    if (!start || start.isBefore(now)) start = now.add(1, 'hour');
    else if (info?.allDay) start = start.isSame(now, 'day') ? now.add(1, 'hour') : start.hour(9).minute(0);

    let end = rawEnd && !info?.allDay ? dayjs(rawEnd) : null;
    if (!end || end.isBefore(start)) end = start.add(1, 'hour');
    return { start: start.toISOString(), end: end.toISOString() };
};
