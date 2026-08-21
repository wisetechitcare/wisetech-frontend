import dayjs from 'dayjs';

/**
 * Who was absent, per day, across a range.
 *
 * Extracted from the Overview so it can be tested: it had three defects at once and none
 * of them were reachable by a test while the loop lived inside a 1400-line component.
 *
 *   · it counted days that had not happened yet
 *   · it skipped only the weekly off-days, so public holidays and the alternate
 *     off-Saturdays were reported as company-wide absences
 *   · it ran over a roster that still contained people who had left
 *
 * The third is fixed at the source (the roster is now requested scoped to the employment
 * window), so this function deliberately takes the roster as given and does not re-filter
 * it — two places deciding who counts is how the cards and their own modal drifted apart
 * in the first place.
 */

export interface AbsentDayOptions<T> {
    /** First day of the range being displayed. */
    start: dayjs.Dayjs;
    /** Last day of the range being displayed. */
    end: dayjs.Dayjs;
    /**
     * Today. Injected rather than read from the clock so the behaviour is testable, and
     * so a caller in another timezone can pass its own notion of the current day.
     */
    today: dayjs.Dayjs;
    /**
     * Is this a day the company does not work — weekly off, public holiday, or a one-off
     * off-Saturday? Injected because the Overview already owns that decision and both it
     * and this function must give the same answer.
     */
    isNonWorking: (date: Date) => boolean;
    /** employeeIds with attendance, keyed YYYY-MM-DD. */
    presentByDay: ReadonlyMap<string, ReadonlySet<string>>;
    /** employeeIds on approved leave, keyed YYYY-MM-DD. */
    leaveByDay: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
    /** The roster to judge, already scoped to who was employed in this window. */
    roster: readonly T[];
}

/**
 * One entry per (employee, absent day) — the shape the Absent modal lists and the Absent
 * card counts, so the two cannot disagree.
 */
export function computeAbsentEntries<T extends { _id?: string }>(
    opts: AbsentDayOptions<T>,
): Array<T & { _absentDate: dayjs.Dayjs }> {
    const entries: Array<T & { _absentDate: dayjs.Dayjs }> = [];

    // Absence is a fact about a day that has HAPPENED. Without this clamp a whole-month
    // view mid-month reports everyone absent for the rest of the month.
    const start = opts.start.startOf('day');
    const rangeEnd = opts.end.startOf('day');
    const today = opts.today.startOf('day');
    const end = rangeEnd.isAfter(today) ? today : rangeEnd;

    for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
        if (opts.isNonWorking(d.toDate())) continue;

        const key = d.format('YYYY-MM-DD');
        const present = opts.presentByDay.get(key);
        const onLeave = opts.leaveByDay.get(key);

        for (const employee of opts.roster) {
            const id = employee?._id;
            if (!id) continue;
            if (present?.has(id)) continue;
            if (onLeave?.has(id)) continue;
            entries.push({ ...employee, _absentDate: d });
        }
    }

    return entries;
}

/** An approved leave overlapping the window, as the board receives it. */
export interface LeaveRecordLike {
    employeeId: string;
    dateFrom: string | Date;
    dateTo: string | Date;
    [key: string]: unknown;
}

export interface LeaveDayOptions {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
    /** Same predicate `computeAbsentEntries` uses — see the note there. */
    isNonWorking: (date: Date) => boolean;
    leaves: readonly LeaveRecordLike[];
}

/**
 * employeeIds on approved leave, per day, across a range.
 *
 * Shares `isNonWorking` with the absent walk on purpose. This used to test only the
 * branch's weekly pattern, so a leave spanning a public holiday or an alternate
 * off-Saturday still counted that day as "on leave" — while the absent walk skipped it
 * entirely. The two halves of the same board disagreed about what a working day is.
 *
 * This is a HEADCOUNT for display, not a charging decision. On a day the company does not
 * work, "N people on leave" is meaningless — nobody was expected in. Whether a holiday
 * inside a leave span is deducted from salary is the sandwich engine's call and is
 * deliberately not reimplemented here.
 *
 * First record wins for a given (day, employee), matching the previous behaviour: two
 * overlapping approved leaves must not count the person twice.
 */
export function computeLeaveDaysByDate(
    opts: LeaveDayOptions,
): Map<string, Map<string, LeaveRecordLike & { _leaveDate: dayjs.Dayjs }>> {
    const byDay = new Map<string, Map<string, LeaveRecordLike & { _leaveDate: dayjs.Dayjs }>>();
    const start = opts.start.startOf('day');
    const end = opts.end.startOf('day');

    for (const leave of opts.leaves) {
        if (!leave?.employeeId) continue;
        let d = dayjs(leave.dateFrom).startOf('day');
        const leaveEnd = dayjs(leave.dateTo).startOf('day');
        if (!d.isValid() || !leaveEnd.isValid()) continue;

        // Clip to the window first so a long leave does not walk the whole year.
        if (d.isBefore(start)) d = start;
        const stop = leaveEnd.isAfter(end) ? end : leaveEnd;

        for (; d.isBefore(stop) || d.isSame(stop, 'day'); d = d.add(1, 'day')) {
            if (opts.isNonWorking(d.toDate())) continue;
            const key = d.format('YYYY-MM-DD');
            if (!byDay.has(key)) byDay.set(key, new Map());
            const slot = byDay.get(key)!;
            if (!slot.has(leave.employeeId)) slot.set(leave.employeeId, { ...leave, _leaveDate: d });
        }
    }

    return byDay;
}
