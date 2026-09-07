import type { IEmployeesAttendance } from "@models/employee";

/**
 * attendancePeriodSummary — rolls per-day attendance rows up to one row per employee
 * for the Overview's weekly/monthly period.
 *
 * WHY: the Attendance table is one row per employee per DAY. Over a month across a
 * ~210-person roster that is ~4,600 client-side rows, and the question an admin asks of
 * a month ("who was absent a lot, who worked the most") cannot be read off it. One row
 * per employee with counts answers it directly, and the day-by-day rows stay one click
 * away.
 *
 * Rows come from `DailyAttendance`'s exported `transformAttendance`, so status and
 * duration are decided in exactly one place — a second implementation would drift and
 * the summary would disagree with the drill-in it expands into.
 *
 * Pure: no React, no network, no dayjs. Callers supply the roster and the leave-day
 * tally, which are fetched once by the component.
 *
 * Complexity: O(rows + roster) — one Map probe per row, one pass to seed the roster.
 * Ordering within an employee is by ISO date string, so no date is parsed to compare.
 */

/** Per-employee rollup for the selected period. */
export interface EmployeePeriodSummary {
    employeeId: string;
    name: string;
    code: string;
    avatar?: string | null;
    /** Days with a check-in (worked days, weekend work included). */
    present: number;
    /** Days with a check-in but no check-out — the Check-out Missing card's rows. */
    checkoutMissing: number;
    /** Approved leave days in the window, half-days weighted 0.5. */
    leave: number;
    /**
     * Working days in the window the employee neither worked nor was on leave.
     * Derived, not observed: an absent day produces no attendance row at all, so it can
     * only be `workingDaysFor(employee) - present - leave`, where the denominator is that
     * employee's OWN employed working days. Floored at 0 — a half-day leave that also
     * carries a check-in would otherwise push it negative.
     */
    absent: number;
    /** Σ worked minutes across the window. */
    workedMinutes: number;
    /**
     * Late check-ins, from the SERVER's `countLateCheckins` engine — the product's single
     * definition of lateness (it applies each employee's check-in-deadline override, and
     * salary and KPI read the same function). `null` when the server could not classify
     * this employee; render that as "—", never 0, which would read as "never late".
     */
    lateCheckins: number | null;
    /** Early check-outs, same engine and same null semantics as `lateCheckins`. */
    earlyCheckouts: number | null;
    /** The employee's own rows, ascending by date. Backs the drill-in. */
    days: IEmployeesAttendance[];
}

/** Classification counts as returned by the batch endpoint, keyed by employeeId. */
export interface ClassificationCounts {
    lateCheckins: number;
    earlyCheckouts: number;
}

/** Minimal roster shape — whatever the page already holds is compatible. */
export interface SummaryRosterEntry {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    employeeCode?: string;
    avatar?: string | null;
}

export interface SummarizeOptions {
    /** Everyone who should appear, including employees with zero rows in the window. */
    roster: SummaryRosterEntry[];
    /**
     * Working days in the window FOR THIS EMPLOYEE — the denominator for `absent`.
     *
     * Per-employee, not one number for the period, and required rather than
     * optional. August has ~22 working days, but someone who left on the 14th
     * had 10; charging them the period's figure invented twelve absences for
     * days they were not employed. A single shared number cannot express that,
     * and an optional override would read as a refinement rather than as the
     * thing that makes the count correct.
     */
    workingDaysFor: (employeeId: string) => number;
    /** employeeId → weighted leave days in the window (half-days already 0.5). */
    leaveDaysByEmployee: Map<string, number>;
    /**
     * employeeId → late/early counts from the server's classification engine. Absent
     * entries stay `null` on the summary rather than defaulting to 0. Omit the whole map
     * while the batch call is still in flight.
     */
    classificationByEmployee?: Map<string, ClassificationCounts>;
}

/** A row counts as worked when it has a real check-in. */
const hasCheckIn = (row: IEmployeesAttendance) => !!row.checkIn && row.checkIn !== '-NA-';
const hasCheckOut = (row: IEmployeesAttendance) => !!row.checkOut && row.checkOut !== '-NA-';

const displayName = (emp: SummaryRosterEntry) =>
    `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';

export function summarizeAttendanceByEmployee(
    rows: readonly IEmployeesAttendance[],
    { roster, workingDaysFor, leaveDaysByEmployee, classificationByEmployee }: SummarizeOptions,
): EmployeePeriodSummary[] {
    const byEmployee = new Map<string, EmployeePeriodSummary>();

    const classificationFor = (id: string) => {
        const counts = classificationByEmployee?.get(id);
        return {
            lateCheckins: counts ? counts.lateCheckins : null,
            earlyCheckouts: counts ? counts.earlyCheckouts : null,
        };
    };

    // Seed from the ROSTER, not from the rows. An employee absent every day of the month
    // has no attendance rows at all; seeding from rows would drop exactly the people the
    // admin most needs to see.
    for (const emp of roster) {
        const id = emp._id || emp.id;
        if (!id) continue;
        const leave = leaveDaysByEmployee.get(id) ?? 0;
        byEmployee.set(id, {
            employeeId: id,
            name: displayName(emp),
            code: emp.employeeCode || '',
            avatar: emp.avatar ?? null,
            present: 0,
            checkoutMissing: 0,
            leave,
            absent: 0,
            workedMinutes: 0,
            ...classificationFor(id),
            days: [],
        });
    }

    for (const row of rows) {
        const id = row.employeeId;
        if (!id) continue;
        let summary = byEmployee.get(id);
        if (!summary) {
            // A row for someone outside the roster (deactivated mid-period, or a team
            // filter narrower than the attendance query). Keep them rather than silently
            // dropping worked time from the totals.
            summary = {
                employeeId: id,
                name: row.name || 'Unknown',
                code: row.code || '',
                avatar: row.avatar ?? null,
                present: 0,
                checkoutMissing: 0,
                leave: leaveDaysByEmployee.get(id) ?? 0,
                absent: 0,
                workedMinutes: 0,
                ...classificationFor(id),
                days: [],
            };
            byEmployee.set(id, summary);
        }

        summary.days.push(row);
        if (hasCheckIn(row)) {
            summary.present += 1;
            if (!hasCheckOut(row)) summary.checkoutMissing += 1;
        }
        summary.workedMinutes += row.durationMinutes ?? 0;
    }

    for (const summary of byEmployee.values()) {
        if (summary.days.length > 1) {
            summary.days.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        }
        // Denominator is this employee's own employed working days, so a leaver is
        // not charged for the rest of the month.
        summary.absent = Math.max(0, workingDaysFor(summary.employeeId) - summary.present - summary.leave);
        // 0.5 weights are exact in IEEE-754, but round defensively so a future
        // fractional-day policy can't surface 2.9999999999999996 in a cell.
        summary.leave = Math.round(summary.leave * 100) / 100;
        summary.absent = Math.round(summary.absent * 100) / 100;
    }

    return Array.from(byEmployee.values());
}

/** "142h 10m" — minutes as hours + minutes, never a decimal hour. */
export function formatWorkedMinutes(totalMinutes: number): string {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0h 0m';
    const minutes = Math.round(totalMinutes);
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Inverse of {@link formatWorkedMinutes} — "8h 30m" / "8h" / "8:30 Hrs" → minutes.
 *
 * The daily working-hours target arrives from configuration as a display string, and a
 * weekly/monthly target is that value times the working days in the period. Returns 0 for
 * anything unparseable so a malformed config shows "no target" rather than NaN on screen.
 */
export function parseHoursMinutes(value: string | null | undefined): number {
    if (!value) return 0;
    const hoursAndMinutes = value.match(/(\d+)\s*h[^\d]*(\d+)/i);
    if (hoursAndMinutes) return parseInt(hoursAndMinutes[1], 10) * 60 + parseInt(hoursAndMinutes[2], 10);
    const colonForm = value.match(/^(\d+):(\d+)/);
    if (colonForm) return parseInt(colonForm[1], 10) * 60 + parseInt(colonForm[2], 10);
    const hoursOnly = value.match(/(\d+)\s*h/i);
    if (hoursOnly) return parseInt(hoursOnly[1], 10) * 60;
    return 0;
}
