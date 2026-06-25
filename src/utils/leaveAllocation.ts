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

export function allocateLeave(input: AllocationInput): AllocationResult {
    const unit = input.unit ?? 1;
    const unpaidLabel = input.unpaidLabel ?? UNPAID_LEAVE_LABEL;
    const notes: string[] = [];
    const chargeable = [...input.chargeableDates];
    const sandwichDates = input.sandwichDates ?? [];
    const totalDays = chargeable.length * unit;

    if (chargeable.length === 0) {
        return { segments: [], paidDays: 0, unpaidDays: 0, totalDays: 0, notes };
    }

    if (input.probationActive) {
        notes.push('Probation period: paid leave is not allowed yet — booked as Unpaid.');
        const probationSegs = [toSegment(unpaidLabel, chargeable, unit, false)];
        if (sandwichDates.length > 0) {
            notes.push(`${sandwichDates.length} sandwich day(s) booked as Unpaid Leave.`);
            probationSegs.push(toSegment(unpaidLabel, sandwichDates, 1, false));
        }
        const totalUnpaid = totalDays + sandwichDates.length;
        return { segments: probationSegs, paidDays: 0, unpaidDays: totalUnpaid, totalDays: totalUnpaid, notes };
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
                    return {
                        segments,
                        paidDays,
                        unpaidDays: segments.filter((s) => !s.isPaid).reduce((s, seg) => s + seg.days, 0),
                        totalDays,
                        notes,
                        blocked: {
                            reason:
                                `Cumulative limit: only ${allowedRemaining} more paid leave(s) allowed ` +
                                `through this period (used/pending ${usedPlusPendingPaid} of ${allowedTillNow}).`,
                        },
                    };
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

    const unpaidDays = segments.filter((s) => !s.isPaid).reduce((s, seg) => s + seg.days, 0);
    return { segments, paidDays, unpaidDays, totalDays: totalDays + sandwichDates.length, notes };
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
