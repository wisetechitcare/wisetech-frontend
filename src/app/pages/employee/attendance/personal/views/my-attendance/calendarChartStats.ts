/**
 * Chart numbers from the server attendance calendar — the same resolved days
 * the personal Overview grid renders.
 *
 * My-Attendance used to re-derive working/weekend/holiday counts in the browser
 * (Mon–Fri fallback + public-holiday fan-out). That disagreed with Overview /
 * KPI / salary whenever a branch used alternate Saturdays or a non-Sat/Sun off
 * pattern. These helpers only COUNT what the server already decided.
 */

import dayjs, { type Dayjs } from "dayjs";
import {
    ABSENT,
    CHECK_OUT_MISSING,
    EXTRA_DAYS,
    HOLIDAYS,
    ON_LEAVE,
    PRESENT,
    WEEKEND,
} from "@constants/statistics";
import type { CalendarDay } from "@app/pages/employee/attendance/personal/views/overview/calendar/types";

export interface CalendarChartStats {
    /** Expected working days in the window (excludes weekly off, holiday, not employed). */
    workingDays: number;
    /** Donut slices — same keys `donutaDataLabel` used to emit. */
    donut: Map<string, number>;
}

/** YYYY-MM values that cover an inclusive [from, to] window. */
export function monthsCoveringRange(from: Dayjs | string, to: Dayjs | string): string[] {
    const start = dayjs(from).startOf("month");
    const end = dayjs(to).startOf("month");
    if (!start.isValid() || !end.isValid() || start.isAfter(end, "month")) return [];
    const out: string[] = [];
    let cursor = start;
    while (cursor.isBefore(end, "month") || cursor.isSame(end, "month")) {
        out.push(cursor.format("YYYY-MM"));
        cursor = cursor.add(1, "month");
    }
    return out;
}

/**
 * Roll calendar days into chart stats, optionally clipped to [fromISO, toISO]
 * and optionally dropping future days (current-period "through today" mode).
 */
export function chartStatsFromCalendarDays(
    days: readonly CalendarDay[],
    opts: {
        fromISO?: string;
        toISO?: string;
        /** When true, `future` days are excluded from the working-day denominator. */
        throughToday?: boolean;
    } = {},
): CalendarChartStats {
    const { fromISO, toISO, throughToday = false } = opts;
    const donut = new Map<string, number>([
        [PRESENT, 0],
        [ABSENT, 0],
        [ON_LEAVE, 0],
        [EXTRA_DAYS, 0],
        [CHECK_OUT_MISSING, 0],
        [HOLIDAYS, 0],
        [WEEKEND, 0],
    ]);

    let workingDays = 0;

    for (const day of days) {
        if (!day.inMonth) continue;
        if (fromISO && day.date < fromISO) continue;
        if (toISO && day.date > toISO) continue;
        if (day.status === "not_employed") continue;

        const workedOff = day.modifiers.includes("worked_on_off_day");
        const missingCheckout = day.modifiers.includes("missing_check_out");
        const isStructuralOff =
            day.status === "weekly_off" ||
            day.status === "holiday" ||
            workedOff;

        if (!isStructuralOff && !(throughToday && day.status === "future")) {
            workingDays += 1;
        }

        if (day.status === "weekly_off") {
            donut.set(WEEKEND, (donut.get(WEEKEND) || 0) + 1);
            continue;
        }
        if (day.status === "holiday") {
            donut.set(HOLIDAYS, (donut.get(HOLIDAYS) || 0) + 1);
            continue;
        }
        if (day.status === "future" || day.status === "pending") {
            continue;
        }

        // Leave weight: full leave = 1; half-day leave (status half_day with leave) = 0.5.
        if (day.status === "leave") {
            donut.set(ON_LEAVE, (donut.get(ON_LEAVE) || 0) + 1);
            continue;
        }
        if (day.status === "half_day" && day.leave && !day.actual?.checkIn) {
            donut.set(ON_LEAVE, (donut.get(ON_LEAVE) || 0) + (day.leave.fraction === 0.5 ? 0.5 : 1));
            continue;
        }

        // Worked a weekly-off / holiday — Extra Days only (not also Present), matching
        // the prior donut which moved the day out of WEEKEND/HOLIDAYS into EXTRA_DAYS.
        if (workedOff) {
            donut.set(EXTRA_DAYS, (donut.get(EXTRA_DAYS) || 0) + 1);
            if (day.status === "half_day" && day.leave) {
                donut.set(ON_LEAVE, (donut.get(ON_LEAVE) || 0) + (day.leave.fraction === 0.5 ? 0.5 : 1));
            }
            continue;
        }

        if (day.status === "absent") {
            donut.set(ABSENT, (donut.get(ABSENT) || 0) + 1);
            continue;
        }

        if (missingCheckout) {
            donut.set(CHECK_OUT_MISSING, (donut.get(CHECK_OUT_MISSING) || 0) + 1);
            continue;
        }

        if (day.status === "present" || day.status === "half_day") {
            if (day.status === "half_day" && day.leave) {
                donut.set(ON_LEAVE, (donut.get(ON_LEAVE) || 0) + (day.leave.fraction === 0.5 ? 0.5 : 1));
            }
            donut.set(PRESENT, (donut.get(PRESENT) || 0) + 1);
        }
    }

    // Round leave so 0.5 weights stay tidy in the donut.
    const leave = donut.get(ON_LEAVE) || 0;
    donut.set(ON_LEAVE, Math.round(leave * 100) / 100);

    return { workingDays, donut };
}
