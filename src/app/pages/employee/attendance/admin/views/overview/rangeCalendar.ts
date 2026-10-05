import type { Dayjs } from "dayjs";
import type { PeriodRange } from "@app/modules/common/components/PeriodFilter";

/**
 * Shared helpers for the admin Overview's per-employee work calendar.
 *
 * Cards and the period summary table must classify working/weekend/holiday the
 * same way. Both consume `GET /attendance/range-calendar` (server workCalendar
 * SSOT); this module is the one place that rehydrates that payload and counts
 * working days from it — so the two halves of the screen cannot diverge again.
 */

export interface RangeNonWorking {
    /** "companyId|branchId" → set of non-working YYYY-MM-DD dates. */
    scopes: Record<string, Set<string>>;
    /** employeeId → scope key. */
    employeeScopes: Record<string, string>;
}

/** Rehydrate the range-calendar response into Sets for O(1) non-working lookups. */
export function hydrateNonWorking(calResp: any): RangeNonWorking {
    const rawScopes = (calResp?.data?.scopes ?? {}) as Record<string, string[]>;
    const scopes: Record<string, Set<string>> = {};
    for (const key of Object.keys(rawScopes)) scopes[key] = new Set(rawScopes[key]);
    return {
        scopes,
        employeeScopes: (calResp?.data?.employeeScopes ?? {}) as Record<string, string>,
    };
}

/** True when `dateISO` is non-working for this employee per the server calendar. */
export function isNonWorkingForEmployee(
    cal: RangeNonWorking | null | undefined,
    employeeId: string | undefined,
    dateISO: string,
): boolean {
    if (!cal || !employeeId) return false;
    const key = cal.employeeScopes[employeeId];
    const set = key ? cal.scopes[key] : undefined;
    if (!set) return false;
    return set.has(dateISO);
}

/**
 * Working days in the period for one employee (or the period heading when no
 * employeeId is supplied and a fallback weekend map is used).
 *
 * Prefers the server calendar. Falls back to the branch weekend map only when
 * the calendar has not loaded or does not cover the employee — degraded to the
 * old behaviour, never crashing.
 */
export function countWorkingDaysFromCalendar(
    range: PeriodRange | null | undefined,
    cal: RangeNonWorking | null | undefined,
    opts: {
        employeeId?: string;
        /** Lowercase weekday → "0" for off. Used only when the calendar misses. */
        weekends?: Record<string, string> | null;
        isEmployedOn?: (day: Dayjs) => boolean;
    } = {},
): number {
    if (!range?.start || !range?.end) return 0;
    const { employeeId, weekends, isEmployedOn } = opts;
    let count = 0;
    let cursor = range.start.startOf("day");
    const last = range.end.startOf("day");
    const hasServerScope = !!(
        employeeId &&
        cal?.employeeScopes[employeeId] &&
        cal.scopes[cal.employeeScopes[employeeId]]
    );

    while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
        if (!isEmployedOn || isEmployedOn(cursor)) {
            const dateISO = cursor.format("YYYY-MM-DD");
            const nonWorking = hasServerScope
                ? isNonWorkingForEmployee(cal, employeeId, dateISO)
                : weekends?.[cursor.format("dddd").toLowerCase()] === "0";
            if (!nonWorking) count += 1;
        }
        cursor = cursor.add(1, "day");
    }
    return count;
}
