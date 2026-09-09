/**
 * How long a timesheet entry took, and what it was spent on.
 *
 * ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * Four places computed an entry's duration and every one of them derived it from the
 * start/end clock, while the backend, the meeting cost analytics and the entry's own detail
 * dialog read the LOGGED figure. So a two-hour entry in a one-hour window showed as "1h 0m 0s"
 * in the table, "2h 0m 0s" in the dialog, and billed as two hours — three answers to one
 * question, on the screen an admin uses to check exactly that.
 *
 * The rule below is the backend's rule (`timesheetDecimalHours` in handlers/taskTime.ts),
 * moved to one place on this side so the table cannot drift from the invoice again:
 *
 *   **the logged figure wins; the clock window is the fallback.**
 *
 * That ordering is not arbitrary. The window says when you were in a thing; the logged figure
 * is the person's own answer to "how long did this actually take", and it is what the money is
 * calculated from. A meeting you left after twenty minutes of an hour-long slot is twenty
 * minutes of cost, and the window would bill the company for three times the work.
 */

export interface TimesheetLike {
    logTimeHours?: number | null;
    logTimeMinutes?: number | null;
    logTimeSeconds?: number | null;
    startTime?: string | Date | null;
    endTime?: string | Date | null;
    task?: { id?: string; taskName?: string | null } | null;
    taskId?: string | null;
    meeting?: { id?: string; title?: string | null } | null;
    meetingId?: string | null;
}

/** Seconds from the logged figure, or `null` when nothing was logged. */
const loggedSeconds = (ts: TimesheetLike): number | null => {
    const h = ts.logTimeHours || 0;
    const m = ts.logTimeMinutes || 0;
    const s = ts.logTimeSeconds || 0;
    if (!h && !m && !s) return null;
    return h * 3600 + m * 60 + s;
};

/** Seconds between start and end, or `null` when the pair is missing or inverted. */
const windowSeconds = (ts: TimesheetLike): number | null => {
    if (!ts.startTime || !ts.endTime) return null;
    const diff = new Date(ts.endTime).getTime() - new Date(ts.startTime).getTime();
    return diff > 0 ? Math.round(diff / 1000) : null;
};

/** The entry's duration in seconds. Logged figure first, clock window second, else zero. */
export const entrySeconds = (ts: TimesheetLike): number =>
    loggedSeconds(ts) ?? windowSeconds(ts) ?? 0;

export const entryHours = (ts: TimesheetLike): number => entrySeconds(ts) / 3600;

/**
 * Whether the logged figure and the clock window disagree, and by how much.
 *
 * Not an error — leaving a meeting early is a real thing to record, and the entry is right to
 * say so. It is worth SHOWING, because an admin comparing a 6:37–7:37 window against a
 * two-hour charge deserves to be told which of the two the money followed rather than left to
 * guess. A minute of slack, so a rounded entry does not raise a flag.
 */
export const durationConflict = (ts: TimesheetLike): { logged: number; window: number } | null => {
    const logged = loggedSeconds(ts);
    const window = windowSeconds(ts);
    if (logged === null || window === null) return null;
    return Math.abs(logged - window) > 60 ? { logged, window } : null;
};

/**
 * `2h 30m`, or `45m`, or `0m`.
 *
 * Seconds are dropped: nobody logs work to the second, and printing "0s" on every row of a
 * table spent three characters per row saying nothing. The detail dialog keeps them, because
 * there the number is the subject rather than a column.
 */
export const formatSpan = (seconds: number): string => {
    const total = Math.max(0, Math.round(seconds / 60));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
};

/** `2h 30m 15s` — the long form, for when the duration is the thing being read. */
export const formatSpanExact = (seconds: number): string => {
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 3600)}h ${Math.floor((s / 60) % 60)}m ${s % 60}s`;
};

/** Every entry's duration, added up and formatted. */
export const totalSpan = (entries: TimesheetLike[] = []): string =>
    formatSpan((Array.isArray(entries) ? entries : []).reduce((sum, e) => sum + entrySeconds(e), 0));

/**
 * What the entry was spent on.
 *
 * A day is tasks AND meetings, and the table only ever asked the task. Meeting entries
 * therefore showed a bare "-" in the column that says what the time was for, which is the one
 * column that has to be filled in for the row to mean anything.
 */
export type LogSubject =
    | { kind: 'task'; name: string }
    | { kind: 'meeting'; name: string }
    | { kind: 'none'; name: string };

export const logSubject = (ts: TimesheetLike): LogSubject => {
    const meeting = (ts.meeting?.title || '').trim();
    if (meeting || ts.meetingId) return { kind: 'meeting', name: meeting || 'Meeting' };
    const task = (ts.task?.taskName || '').trim();
    if (task || ts.taskId) return { kind: 'task', name: task || 'Task' };
    // A project-level entry: real, and not the same thing as a missing name.
    return { kind: 'none', name: 'Project work' };
};

/**
 * The period's total, split by what the time went on.
 *
 * A single "3h 30m logged" answers how much but not what of, and "how much of this week did
 * meetings eat" is the question an admin opens this page with. Parts that are zero are left
 * out rather than printed as "0m", so the line says only what is true of this period.
 */
export const splitByKind = (entries: TimesheetLike[] = []) => {
    const totals = { meeting: 0, task: 0, none: 0 };
    for (const e of Array.isArray(entries) ? entries : []) {
        totals[logSubject(e).kind] += entrySeconds(e);
    }
    return totals;
};

/** e.g. `2h 0m in meetings · 1h 30m on tasks`, or `''` when there is nothing to say. */
export const describeSplit = (entries: TimesheetLike[] = []): string => {
    const t = splitByKind(entries);
    return [
        t.meeting && `${formatSpan(t.meeting)} in meetings`,
        t.task && `${formatSpan(t.task)} on tasks`,
        t.none && `${formatSpan(t.none)} on project work`,
    ].filter(Boolean).join(' · ');
};

/**
 * What this row's PROJECT bills an hour at, as a multiple of what the hour costs the company.
 *
 * The project's own multiplier rides on the row (a column on the lead the timesheet query
 * already includes); `null` there means the project was never given one, so the company
 * default applies. That distinction is why the column is nullable: a project explicitly set to
 * 1x keeps 1x when the default moves, and one left alone follows it.
 *
 * Nothing here touches what the employee is PAID. It scales what the project is charged.
 */
export const billingMultiplierOf = (timesheet: any, companyDefault: number): number => {
    const own = timesheet?.project?.billingRateMultiplier ?? timesheet?.lead?.billingRateMultiplier;
    const n = Number(own);
    // A zero or negative multiplier is a typo or a half-migrated row, never an intention —
    // and either would quietly make a project's work free.
    if (own === null || own === undefined || !Number.isFinite(n) || n <= 0) {
        const fallback = Number(companyDefault);
        return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
    }
    return n;
};
