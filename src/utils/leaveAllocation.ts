import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { getCumulativeAllowedLeaves } from '@utils/balanceProgressUtils';

dayjs.extend(isSameOrBefore);

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Expand an inclusive [from, to] range into chargeable working-day ISO strings, excluding the
 * branch's off-days and public holidays. Mirrors the backend expandChargeableDates so the
 * Apply-Leave preview matches server enforcement.
 */
export function expandChargeableDates(
    fromISO: string,
    toISO: string,
    workingAndOffDays: Record<string, string> = {},
    holidaySet: Set<string> = new Set(),
): string[] {
    if (!fromISO || !toISO) return [];
    const hasCfg = Object.keys(workingAndOffDays).length > 0;
    const out: string[] = [];
    let cur = dayjs(fromISO);
    const end = dayjs(toISO);
    if (!cur.isValid() || !end.isValid() || cur.isAfter(end)) return [];
    while (cur.isSameOrBefore(end, 'day')) {
        const iso = cur.format('YYYY-MM-DD');
        const dayName = DAY_NAMES[cur.day()];
        const isOff = hasCfg ? workingAndOffDays[dayName] === '0' : cur.day() === 0 || cur.day() === 6;
        if (!isOff && !holidaySet.has(iso)) out.push(iso);
        cur = cur.add(1, 'day');
    }
    return out;
}

/**
 * Interior off-days (weekends/holidays) strictly between from and to (exclusive endpoints).
 * These are booked as Unpaid Leave under the sandwich policy.
 * Mirrors leaveAllocationService.expandSandwichDates — keep in lockstep.
 */
export function expandSandwichDates(
    fromISO: string,
    toISO: string,
    workingAndOffDays: Record<string, string> = {},
    holidaySet: Set<string> = new Set(),
): string[] {
    if (!fromISO || !toISO) return [];
    const hasCfg = Object.keys(workingAndOffDays).length > 0;
    const out: string[] = [];
    let cur = dayjs(fromISO).add(1, 'day');
    const end = dayjs(toISO).subtract(1, 'day');
    while (cur.isSameOrBefore(end, 'day')) {
        const iso = cur.format('YYYY-MM-DD');
        const dayName = DAY_NAMES[cur.day()];
        const isOff = hasCfg ? workingAndOffDays[dayName] === '0' : cur.day() === 0 || cur.day() === 6;
        if (isOff || holidaySet.has(iso)) out.push(iso);
        cur = cur.add(1, 'day');
    }
    return out;
}

/** Whether `asOf` (default today) is within the probation window from date of joining. */
export function isWithinProbation(
    dateOfJoining: string | Date | null | undefined,
    durationDays: number,
    asOf: Date = new Date(),
): boolean {
    if (!dateOfJoining || !durationDays) return false;
    const doj = dayjs(dateOfJoining);
    if (!doj.isValid()) return false;
    return dayjs(asOf).isBefore(doj.add(durationDays, 'day'));
}

/**
 * Leave Allocation Engine (frontend mirror of wisetech-backend/src/utils/leaveAllocation.ts).
 *
 * MUST stay equivalent in behaviour to the backend engine so the Apply-Leave preview matches what
 * the server will actually do. Same pattern as getCumulativeAllowedLeaves, mirrored in
 * balanceProgressUtils. Pure — no React, no network.
 *
 * HALF-DAYS: each chargeable date has a WEIGHT — 1.0 full, 0.5 half — a date being half when it is
 * in `halfDayByDate` (→ its AM/PM session). This makes a "long leave with a half boundary" (e.g.
 * Mon–Fri with Friday half = 4.5 days) previewable: the boundary charges 0.5 and competes for paid
 * balance by its real weight while interior days stay full. A half date NEVER merges into a multi-day
 * row — it is always its own single-day row — matching how the server stores + charges it.
 * `unit === 0.5` is the LEGACY single-half mode.
 */

export const UNPAID_LEAVE_LABEL = 'Unpaid Leaves';

const isUnpaidType = (leaveType: string): boolean =>
    String(leaveType || '').toLowerCase().includes('unpaid');

export type HalfDayByDate = Record<string, 'AM' | 'PM'>;

const isHalfDate = (date: string, unit: number, halfDayByDate?: HalfDayByDate): boolean =>
    unit === 0.5 || (halfDayByDate != null && halfDayByDate[date] != null);

const weightOfDate = (date: string, unit: number, halfDayByDate?: HalfDayByDate): number =>
    isHalfDate(date, unit, halfDayByDate) ? 0.5 : 1;

const sumWeights = (dates: string[], unit: number, halfDayByDate?: HalfDayByDate): number =>
    dates.reduce((s, d) => s + weightOfDate(d, unit, halfDayByDate), 0);

const EPS = 1e-9;

export interface TypeBalance {
    leaveType: string;
    available: number;
    isPaid: boolean;
}

export interface CumulativeContext {
    totalPaidAllocated: number;
    usedPlusPendingPaid: number;
    fiscalMonthIndex: number;
    overflow: 'spillToUnpaid' | 'block';
}

export interface AllocationInput {
    chargeableDates: string[];
    /** Interior off-days booked as Unpaid Leave under the sandwich policy. */
    sandwichDates?: string[];
    balances: TypeBalance[];
    priorityOrder: string[];
    probationActive?: boolean;
    /** During probation: true (default) → force Unpaid; false → block leave entirely. */
    probationAllowUnpaid?: boolean;
    unit?: number;
    /** Dates that are half-days (weight 0.5) → their AM/PM session. */
    halfDayByDate?: HalfDayByDate;
    cumulative?: CumulativeContext;
    unpaidLabel?: string;
}

export interface AllocationSegment {
    leaveType: string;
    dates: string[];
    days: number;
    isPaid: boolean;
    dateFrom: string;
    dateTo: string;
    isHalfDay: boolean;
    halfDaySession: 'AM' | 'PM' | null;
}

export interface AllocationResult {
    segments: AllocationSegment[];
    paidDays: number;
    unpaidDays: number;
    totalDays: number;
    notes: string[];
    blocked?: { reason: string };
}

const toSegment = (
    leaveType: string,
    dates: string[],
    unit: number,
    isPaid: boolean,
    halfDayByDate?: HalfDayByDate,
): AllocationSegment => ({
    leaveType,
    dates,
    days: sumWeights(dates, unit, halfDayByDate),
    isPaid,
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
    isHalfDay: false,
    halfDaySession: null,
});

/** Calendar-day gap (b − a) between two YYYY-MM-DD strings. Pure, timezone-free. */
const dayGap = (a: string, b: string): number => {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000;
};

/**
 * Rebuild segments into maximal CONTIGUOUS calendar runs of the same leave type. A half-day date
 * NEVER merges — it is always its own single-day row (isHalfDay=true, days=0.5, session set); full
 * days merge with an adjacent full row of the same type/paid state.
 */
function toContiguousRows(
    segments: AllocationSegment[],
    unit: number,
    halfDayByDate?: HalfDayByDate,
): AllocationSegment[] {
    const typeByDate = new Map<string, { leaveType: string; isPaid: boolean }>();
    for (const seg of segments) {
        for (const d of seg.dates) typeByDate.set(d, { leaveType: seg.leaveType, isPaid: seg.isPaid });
    }
    const rows: AllocationSegment[] = [];
    for (const date of [...typeByDate.keys()].sort()) {
        const info = typeByDate.get(date)!;
        const half = isHalfDate(date, unit, halfDayByDate);
        const w = half ? 0.5 : 1;
        const last = rows[rows.length - 1];
        if (
            !half &&
            last &&
            !last.isHalfDay &&
            last.leaveType === info.leaveType &&
            last.isPaid === info.isPaid &&
            dayGap(last.dateTo, date) === 1
        ) {
            last.dates.push(date);
            last.days += w;
            last.dateTo = date;
        } else {
            rows.push({
                leaveType: info.leaveType,
                dates: [date],
                days: w,
                isPaid: info.isPaid,
                dateFrom: date,
                dateTo: date,
                isHalfDay: half,
                halfDaySession: half ? (halfDayByDate?.[date] ?? null) : null,
            });
        }
    }
    return rows;
}

function finalize(
    segments: AllocationSegment[],
    unit: number,
    notes: string[],
    halfDayByDate?: HalfDayByDate,
    blocked?: { reason: string },
): AllocationResult {
    const rows = toContiguousRows(segments, unit, halfDayByDate);
    const paidDays = rows.filter((s) => s.isPaid).reduce((s, seg) => s + seg.days, 0);
    const unpaidDays = rows.filter((s) => !s.isPaid).reduce((s, seg) => s + seg.days, 0);
    return {
        segments: rows,
        paidDays,
        unpaidDays,
        totalDays: paidDays + unpaidDays,
        notes,
        ...(blocked ? { blocked } : {}),
    };
}

export function allocateLeave(input: AllocationInput): AllocationResult {
    const unit = input.unit ?? 1;
    const halfDayByDate = input.halfDayByDate;
    const unpaidLabel = input.unpaidLabel ?? UNPAID_LEAVE_LABEL;
    const notes: string[] = [];
    const chargeable = [...input.chargeableDates];
    const sandwichDates = input.sandwichDates ?? [];

    if (chargeable.length === 0) {
        return { segments: [], paidDays: 0, unpaidDays: 0, totalDays: 0, notes };
    }

    if (input.probationActive) {
        if (input.probationAllowUnpaid === false) {
            return finalize([], unit, notes, halfDayByDate, {
                reason: 'Leave is not allowed during your probation period.',
            });
        }
        notes.push('Probation period: paid leave is not allowed yet — booked as Unpaid.');
        const probationSegs = [toSegment(unpaidLabel, chargeable, unit, false, halfDayByDate)];
        if (sandwichDates.length > 0) {
            notes.push(`${sandwichDates.length} sandwich day(s) booked as Unpaid Leave.`);
            probationSegs.push(toSegment(unpaidLabel, sandwichDates, 1, false));
        }
        return finalize(probationSegs, unit, notes, halfDayByDate);
    }

    const balanceByType = new Map(input.balances.map((b) => [b.leaveType, b]));
    const segments: AllocationSegment[] = [];
    let remaining = [...chargeable];

    for (const leaveType of input.priorityOrder) {
        if (remaining.length === 0) break;
        if (isUnpaidType(leaveType)) continue;
        const bal = balanceByType.get(leaveType);
        if (!bal || bal.isPaid === false) continue;
        let avail = Math.max(0, Number(bal.available) || 0);
        const taken: string[] = [];
        while (remaining.length > 0) {
            const w = weightOfDate(remaining[0], unit, halfDayByDate);
            if (avail + EPS < w) break;
            avail -= w;
            taken.push(remaining.shift()!);
        }
        if (taken.length > 0) {
            segments.push(toSegment(leaveType, taken, unit, true, halfDayByDate));
        }
    }

    let paidDays = segments.reduce((s, seg) => s + seg.days, 0);

    if (remaining.length > 0) {
        notes.push(`${sumWeights(remaining, unit, halfDayByDate)} day(s) booked as Unpaid — paid leave balance is exhausted.`);
        segments.push(toSegment(unpaidLabel, remaining, unit, false, halfDayByDate));
        remaining = [];
    }

    if (input.cumulative && paidDays > 0) {
        const { totalPaidAllocated, usedPlusPendingPaid, fiscalMonthIndex, overflow } = input.cumulative;
        if (totalPaidAllocated > 0) {
            const allowedTillNow = getCumulativeAllowedLeaves(totalPaidAllocated, fiscalMonthIndex);
            const allowedRemaining = Math.max(0, allowedTillNow - usedPlusPendingPaid);
            if (paidDays > allowedRemaining + EPS) {
                const excessDays = paidDays - allowedRemaining;
                if (overflow === 'block') {
                    return finalize(segments, unit, notes, halfDayByDate, {
                        reason:
                            `Cumulative limit: only ${allowedRemaining} more paid leave(s) allowed ` +
                            `through this period (used/pending ${usedPlusPendingPaid} of ${allowedTillNow}).`,
                    });
                }
                const moved = spillPaidToUnpaid(segments, excessDays, unit, unpaidLabel, halfDayByDate);
                if (moved > 0) {
                    notes.push(`${moved} day(s) exceed the cumulative monthly paid limit and were booked as Unpaid.`);
                }
                paidDays = segments.filter((s) => s.isPaid).reduce((s, seg) => s + seg.days, 0);
            }
        }
    }

    // Sandwich policy: interior off-days booked as Unpaid Leave (always full-weight).
    if (sandwichDates.length > 0) {
        notes.push(`${sandwichDates.length} sandwich day(s) booked as Unpaid Leave.`);
        segments.push(toSegment(unpaidLabel, sandwichDates, 1, false));
    }

    return finalize(segments, unit, notes, halfDayByDate);
}

function spillPaidToUnpaid(
    segments: AllocationSegment[],
    excessDays: number,
    unit: number,
    unpaidLabel: string,
    halfDayByDate?: HalfDayByDate,
): number {
    if (excessDays <= 0) return 0;

    const paidSegments = segments.filter((s) => s.isPaid);
    const existingUnpaid = segments.filter((s) => !s.isPaid);
    const paidDates: { date: string; leaveType: string }[] = [];
    for (const seg of paidSegments) {
        for (const d of seg.dates) paidDates.push({ date: d, leaveType: seg.leaveType });
    }

    let movedWeight = 0;
    let keepCount = paidDates.length;
    while (keepCount > 0 && movedWeight + EPS < excessDays) {
        keepCount--;
        movedWeight += weightOfDate(paidDates[keepCount].date, unit, halfDayByDate);
    }
    if (keepCount >= paidDates.length) return 0;

    const kept = paidDates.slice(0, keepCount);
    const movedDates = paidDates.slice(keepCount).map((p) => p.date);

    const rebuilt: AllocationSegment[] = [];
    for (const { date, leaveType } of kept) {
        const last = rebuilt[rebuilt.length - 1];
        if (last && last.leaveType === leaveType) {
            last.dates.push(date);
            last.days += weightOfDate(date, unit, halfDayByDate);
            last.dateTo = date;
        } else {
            rebuilt.push({
                leaveType, dates: [date], days: weightOfDate(date, unit, halfDayByDate),
                isPaid: true, dateFrom: date, dateTo: date, isHalfDay: false, halfDaySession: null,
            });
        }
    }

    const allUnpaidDates = [...existingUnpaid.flatMap((s) => s.dates), ...movedDates].sort();
    const unpaidSeg = allUnpaidDates.length ? [toSegment(unpaidLabel, allUnpaidDates, unit, false, halfDayByDate)] : [];

    segments.length = 0;
    segments.push(...rebuilt, ...unpaidSeg);
    return movedWeight;
}
