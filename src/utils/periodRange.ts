import type { Dayjs } from "dayjs";
import type { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import { toWireDate } from "@utils/dateFormats";

/**
 * periodRange — turns the shared `PeriodFilter`'s selection into the wire params every
 * range-aware list endpoint accepts, and into a stable key for cache/pagination resets.
 *
 * This exists so a page wires the filter into N sections without each one re-deciding
 * what "the selected period" means on the network. The backend counterpart is
 * `wisetech-backend/src/utils/queryDateRange.ts`, which validates the same pair — the
 * two files are the contract, so keep the param names in step.
 *
 * WIRE, not DISPLAY: `YYYY-MM-DD` ISO. The API parses these; they must never be
 * reformatted to the company's dotted display standard (see utils/dateFormats.ts).
 */

export interface PeriodWireParams {
    /** Inclusive first business day, ISO `YYYY-MM-DD`. */
    startDate: string;
    /** Inclusive last business day, ISO `YYYY-MM-DD`. */
    endDate: string;
}

/**
 * Wire params for a period, or `undefined` for "no window" — which every endpoint
 * treats as all-time.
 *
 * `undefined` is returned for the All-Time mode and for a half-filled Custom range.
 * Sending one half of a window would be worse than sending none: the backend rejects a
 * lone bound (deliberately), and a table labelled with a period must never quietly show
 * everything.
 */
export function toPeriodParams(range: PeriodRange | null | undefined): PeriodWireParams | undefined {
    if (!range?.start || !range?.end) return undefined;
    const startDate = toWireDate(range.start);
    const endDate = toWireDate(range.end);
    if (!startDate || !endDate) return undefined;
    return { startDate, endDate };
}

/**
 * Stable identity for a period — `"2026-07-01:2026-07-31"`, or `"all"` when unbounded.
 *
 * Use as a dependency/reset key instead of the `PeriodRange` object: `PeriodFilter`
 * rebuilds that object (and its Dayjs instances) on every render, so depending on it
 * directly re-fires effects forever. Two selections that mean the same window produce
 * the same string, so nothing refetches when the user reselects the period they are
 * already on.
 */
export function periodKey(range: PeriodRange | null | undefined): string {
    const params = toPeriodParams(range);
    return params ? `${params.startDate}:${params.endDate}` : "all";
}

/** True when the period covers more than a single day — i.e. lists should roll up. */
export function isMultiDay(range: PeriodRange | null | undefined): boolean {
    const params = toPeriodParams(range);
    return !!params && params.startDate !== params.endDate;
}

/**
 * Non-weekend days inside the period, per the branch's working-days config.
 *
 * This is the denominator behind every "absent" and "target hours" number on the
 * Overview, so it lives here rather than being re-looped per section — three
 * independently-written copies of this loop is three chances to disagree about whether
 * the range end is inclusive.
 *
 * @param weekends Branch `workingAndOffDays` map, lowercase weekday → "0" for an off day.
 */
export function countWorkingDays(
    range: PeriodRange | null | undefined,
    weekends: Record<string, string> | null | undefined,
    /**
     * Optional clip to ONE employee's employment inside the range.
     *
     * Without it this is the period's own working-day count, which is what a
     * heading like "22 working days in August" wants. As a per-employee
     * DENOMINATOR it is wrong for anyone who joined or left mid-period: August
     * has 22 working days, but someone who left on the 14th had 10, and
     * charging them the difference invents twelve absences.
     */
    isEmployedOn?: (day: Dayjs) => boolean,
): number {
    if (!range?.start || !range?.end) return 0;
    let count = 0;
    let cursor = range.start.startOf("day");
    const last = range.end.startOf("day");
    // Inclusive of both ends — a Mon–Sun week is 5 working days, not 4.
    while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
        if (weekends?.[cursor.format("dddd").toLowerCase()] !== "0" && (!isEmployedOn || isEmployedOn(cursor))) count += 1;
        cursor = cursor.add(1, "day");
    }
    return count;
}
