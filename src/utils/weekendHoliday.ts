/**
 * ============================================================================
 * WEEKEND & HOLIDAY MARKING — one implementation, one date rule
 * ============================================================================
 *
 * Decides, for each attendance-ish row, whether its day is a non-working day —
 * a configured weekly off, an alternate weekend, or a public holiday — and
 * relabels a holiday row's status accordingly.
 *
 * ---------------------------------------------------------------------------
 * WHY IT MOVED HERE
 * ---------------------------------------------------------------------------
 * There were two copies of this in `utils/statistics.ts`, `markWeekendOrHoliday`
 * and `markWeekendOrHolidayForReportsTable`, byte-identical apart from a stray
 * commented-out line. Both carried the same date bug, so fixing one would have
 * left the other wrong — and the two feed the two tables that sit one above the
 * other on the same screen.
 *
 * ---------------------------------------------------------------------------
 * THE DATE BUG THIS FIXES
 * ---------------------------------------------------------------------------
 * The holiday branch did:
 *
 *     const entryDate = new Date(entry.date);              // "15 Sept 2026"
 *     const formatted = dayjs.utc(entryDate).format(...);  // read back as UTC
 *
 * `new Date("15 Sept 2026")` is LOCAL midnight. In IST that is
 * 2026-09-14T18:30:00Z, so reading it back as UTC yields "2026-09-14" — every
 * row's holiday lookup ran one day early. 14 Sept's Ganesh Chaturthi appeared on
 * the 15 Sept row, and the 14th lost the holiday it genuinely had.
 *
 * The alternate-weekend branch three lines above compared `dayjs(h.date)` to
 * `dayjs(entry.date)` — local on BOTH sides, so the shifts cancelled and weekends
 * came out right. That asymmetry is why only holidays were visibly wrong, and why
 * the bug survived: the code around it demonstrably worked.
 *
 * Both comparisons now go through `toCalendarKey`, which never constructs a Date
 * from a calendar string at all.
 */

import { parseWorkingDays } from '@utils/workingDays';
import { toCalendarKey } from '@utils/calendarKey';

/** What a row must carry to be marked. Everything else rides along untouched. */
export interface MarkableDay {
    /** The row's business day, in any form `toCalendarKey` reads. */
    date?: string | Date | null;
    /** Weekday name, e.g. "Monday" — matched against the branch's working-days map. */
    day?: string | null;
    status?: unknown;
}

export interface MarkableHoliday {
    date: string | Date;
    /**
     * An "alternate weekend" — a Saturday the branch happens to take off — rather
     * than a public holiday. Kept out of the holiday set so it never relabels a
     * row's status as "Holiday".
     */
    isWeekend?: boolean | null;
}

export type Marked<T> = T & { isWeekendOrHoliday: boolean };

/**
 * Mark each row as falling on a non-working day, and relabel public-holiday rows.
 *
 * Returns new objects; the input is never mutated.
 */
export function markWeekendOrHolidayDays<T extends MarkableDay>(
    rows: T[],
    workingAndOffDays: unknown,
    holidays: MarkableHoliday[] | null | undefined,
): Marked<T>[] {
    const all = holidays ?? [];

    // Public holidays relabel a row's status. Alternate weekends do not — a
    // weekend is a weekend, and calling it "Holiday" would hide whether the
    // employee actually worked it.
    const holidayKeys = new Set(
        all.filter((h) => !h?.isWeekend).map((h) => toCalendarKey(h?.date)).filter(Boolean) as string[],
    );
    const alternateWeekendKeys = new Set(
        all.filter((h) => h?.isWeekend).map((h) => toCalendarKey(h?.date)).filter(Boolean) as string[],
    );

    // `parseWorkingDays`, not JSON.parse: at least one branch stores the literal
    // string "null" in this column and a raw parse throws on it.
    const workingDays = parseWorkingDays(workingAndOffDays);

    return rows.map((row) => {
        const key = toCalendarKey(row?.date);
        const dayKey = row?.day?.toLowerCase() ?? '';

        // `== "0"` rather than `=== "0"`: the map is JSON and the flag has been seen
        // as both a string and a number. Kept loose deliberately.
        // eslint-disable-next-line eqeqeq
        const isConfiguredOff = workingDays[dayKey] == '0';
        const isAlternateWeekend = key !== null && alternateWeekendKeys.has(key);
        const isHoliday = key !== null && holidayKeys.has(key);

        return {
            ...row,
            isWeekendOrHoliday: isHoliday || isConfiguredOff || isAlternateWeekend,
            ...(isHoliday ? { status: 'Holiday' } : {}),
        };
    });
}
