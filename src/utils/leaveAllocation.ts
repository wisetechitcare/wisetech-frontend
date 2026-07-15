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
 * MUST stay byte-for-byte equivalent in behaviour to the backend engine so the Apply-Leave
 * preview matches what the server will actually do. Same pattern as getCumulativeAllowedLeaves,
 * which is mirrored in balanceProgressUtils. Pure — no React, no network.
 */

export const UNPAID_LEAVE_LABEL = 'Unpaid Leaves';

const isUnpaidType = (leaveType: string): boolean =>
    String(leaveType || '').toLowerCase().includes('unpaid');

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
}

export interface AllocationResult {
    segments: AllocationSegment[];
    paidDays: number;
    unpaidDays: number;
    totalDays: number;
    notes: string[];
    blocked?: { reason: string };
}

const toSegment = (leaveType: string, dates: string[], unit: number, isPaid: boolean): AllocationSegment => ({
    leaveType,
    dates,
    days: dates.length * unit,
    isPaid,
    dateFrom: dates[0],
    dateTo: dates[dates.length - 1],
});

/** Calendar-day gap (b − a) between two YYYY-MM-DD strings. Pure, timezone-free. */
const dayGap = (a: string, b: string): number => {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000;
};

/**
 * Rebuild segments into maximal CONTIGUOUS calendar runs of the same leave type, so every
 * produced row's [dateFrom, dateTo] contains only its own dates.
 *
 * Without this, a segment whose dates are non-contiguous — sandwich weekends spanning two
 * weeks, or paid days split from unpaid by a cumulative cap — collapses (via toSegment) to a
 * min..max range that OVERLAPS other segments and inflates the day count. Persisted, those
 * become overlapping LeaveTracker rows and corrupt balance/salary accounting.
 *
 * Segments carry disjoint date sets, so a per-date type map has no collisions. Rows come out
 * in chronological order; adjacent same-type days merge into one row (a weekend booked Unpaid
 * under the sandwich rule joins the surrounding Unpaid run, since both are the same type).
 */
function toContiguousRows(segments: AllocationSegment[], unit: number): AllocationSegment[] {
    const typeByDate = new Map<string, { leaveType: string; isPaid: boolean }>();
    for (const seg of segments) {
        for (const d of seg.dates) typeByDate.set(d, { leaveType: seg.leaveType, isPaid: seg.isPaid });
    }
    const rows: AllocationSegment[] = [];
    for (const date of [...typeByDate.keys()].sort()) {
        const info = typeByDate.get(date)!;
        const last = rows[rows.length - 1];
        if (
            last &&
            last.leaveType === info.leaveType &&
            last.isPaid === info.isPaid &&
            dayGap(last.dateTo, date) === 1
        ) {
            last.dates.push(date);
            last.days += unit;
            last.dateTo = date;
        } else {
            rows.push({ leaveType: info.leaveType, dates: [date], days: unit, isPaid: info.isPaid, dateFrom: date, dateTo: date });
        }
    }
    return rows;
}

/**
 * Normalize the raw allocation into contiguous, non-overlapping rows and recompute totals from
 * them. Every return path funnels through here so the invariant holds everywhere.
 */
function finalize(
    segments: AllocationSegment[],
    unit: number,
    notes: string[],
    blocked?: { reason: string },
): AllocationResult {
    const rows = toContiguousRows(segments, unit);
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
    const unpaidLabel = input.unpaidLabel ?? UNPAID_LEAVE_LABEL;
    const notes: string[] = [];
    const chargeable = [...input.chargeableDates];
    const sandwichDates = input.sandwichDates ?? [];

    if (chargeable.length === 0) {
        return { segments: [], paidDays: 0, unpaidDays: 0, totalDays: 0, notes };
    }

    if (input.probationActive) {
        if (input.probationAllowUnpaid === false) {
            return finalize([], unit, notes, {
                reason: 'Leave is not allowed during your probation period.',
            });
        }
        notes.push('Probation period: paid leave is not allowed yet — booked as Unpaid.');
        const probationSegs = [toSegment(unpaidLabel, chargeable, unit, false)];
        if (sandwichDates.length > 0) {
            notes.push(`${sandwichDates.length} sandwich day(s) booked as Unpaid Leave.`);
            probationSegs.push(toSegment(unpaidLabel, sandwichDates, 1, false));
        }
        return finalize(probationSegs, unit, notes);
    }

    const balanceByType = new Map(input.balances.map((b) => [b.leaveType, b]));
    const segments: AllocationSegment[] = [];
    let remaining = [...chargeable];

    for (const leaveType of input.priorityOrder) {
        if (remaining.length === 0) break;
        if (isUnpaidType(leaveType)) continue;
        const bal = balanceByType.get(leaveType);
        if (!bal || bal.isPaid === false) continue;
        const availableDays = Math.max(0, Number(bal.available) || 0);
        const takeable = Math.floor(availableDays / unit);
        const take = Math.min(remaining.length, takeable);
        if (take > 0) {
            segments.push(toSegment(leaveType, remaining.slice(0, take), unit, true));
            remaining = remaining.slice(take);
        }
    }

    let paidDays = segments.reduce((s, seg) => s + seg.days, 0);

    if (remaining.length > 0) {
        notes.push(`${remaining.length * unit} day(s) booked as Unpaid — paid leave balance is exhausted.`);
        segments.push(toSegment(unpaidLabel, remaining, unit, false));
        remaining = [];
    }

    if (input.cumulative && paidDays > 0) {
        const { totalPaidAllocated, usedPlusPendingPaid, fiscalMonthIndex, overflow } = input.cumulative;
        if (totalPaidAllocated > 0) {
            const allowedTillNow = getCumulativeAllowedLeaves(totalPaidAllocated, fiscalMonthIndex);
            const allowedRemaining = Math.max(0, allowedTillNow - usedPlusPendingPaid);
            if (paidDays > allowedRemaining) {
                const excessDays = paidDays - allowedRemaining;
                if (overflow === 'block') {
                    return finalize(segments, unit, notes, {
                        reason:
                            `Cumulative limit: only ${allowedRemaining} more paid leave(s) allowed ` +
                            `through this period (used/pending ${usedPlusPendingPaid} of ${allowedTillNow}).`,
                    });
                }
                const moved = spillPaidToUnpaid(segments, excessDays, unit, unpaidLabel);
                if (moved > 0) {
                    notes.push(`${moved} day(s) exceed the cumulative monthly paid limit and were booked as Unpaid.`);
                }
                paidDays = segments.filter((s) => s.isPaid).reduce((s, seg) => s + seg.days, 0);
            }
        }
    }

    // Sandwich policy: interior off-days booked as Unpaid Leave.
    if (sandwichDates.length > 0) {
        notes.push(`${sandwichDates.length} sandwich day(s) booked as Unpaid Leave.`);
        segments.push(toSegment(unpaidLabel, sandwichDates, 1, false));
    }

    return finalize(segments, unit, notes);
}

function spillPaidToUnpaid(
    segments: AllocationSegment[],
    excessDays: number,
    unit: number,
    unpaidLabel: string,
): number {
    const unitsToMove = Math.round(excessDays / unit);
    if (unitsToMove <= 0) return 0;

    const paidSegments = segments.filter((s) => s.isPaid);
    const existingUnpaid = segments.filter((s) => !s.isPaid);
    const paidDates: { date: string; leaveType: string }[] = [];
    for (const seg of paidSegments) {
        for (const d of seg.dates) paidDates.push({ date: d, leaveType: seg.leaveType });
    }
    const keepCount = Math.max(0, paidDates.length - unitsToMove);
    const kept = paidDates.slice(0, keepCount);
    const movedDates = paidDates.slice(keepCount).map((p) => p.date);

    const rebuilt: AllocationSegment[] = [];
    for (const { date, leaveType } of kept) {
        const last = rebuilt[rebuilt.length - 1];
        if (last && last.leaveType === leaveType) {
            last.dates.push(date);
            last.days += unit;
            last.dateTo = date;
        } else {
            rebuilt.push({ leaveType, dates: [date], days: unit, isPaid: true, dateFrom: date, dateTo: date });
        }
    }

    const allUnpaidDates = [...existingUnpaid.flatMap((s) => s.dates), ...movedDates].sort();
    const unpaidSeg = allUnpaidDates.length ? [toSegment(unpaidLabel, allUnpaidDates, unit, false)] : [];

    segments.length = 0;
    segments.push(...rebuilt, ...unpaidSeg);
    return movedDates.length * unit;
}
