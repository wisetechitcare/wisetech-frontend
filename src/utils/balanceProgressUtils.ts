import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES } from "@constants/statistics";
import dayjs from "dayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { calculateFiscalMonth } from "@utils/fiscalYearHelper";
import { useState } from "react";

/**
 * How much of a fiscal year's paid entitlement has unlocked as of now.
 *
 * Frontend mirror of wisetech-backend/src/utils/leaveAccrual.accruedTillNow — keep the two in
 * lockstep, they are what make the Apply-Leave preview agree with server enforcement. The window
 * they are measured over comes FROM the server (see {@link accrualWindowAsOf}); this function is
 * only the arithmetic.
 *
 * Paces the entitlement across the employee's OWN months on the books (elapsed / eligible), not a
 * flat Apr–Mar. The entitlement itself is NOT pro-rated by the backend — a part-year employee is
 * granted the same figure and simply unlocks it across the months they are actually employed, so
 * the year still ends with every granted day spendable.
 *
 * Floor keeps it conservative and strictly monotone; the fully-elapsed short-circuit makes sure the
 * last month releases the entitlement exactly rather than leaving a floored remainder (a fractional
 * total like 19.5, left by a half-day encashment, would otherwise lose its half).
 *
 * @param entitlement    - Paid allocation for the fiscal year (from the balance API)
 * @param elapsedMonths  - Eligible accrual months begun as of the day in question
 * @param eligibleMonths - Accrual months on the books this fiscal year (12 = full-year employee)
 */
export function accruedTillNow(entitlement: number, elapsedMonths: number, eligibleMonths: number): number {
    const total = Number(entitlement) || 0;
    if (eligibleMonths <= 0 || total <= 0 || elapsedMonths <= 0) return 0;
    if (elapsedMonths >= eligibleMonths) return total;
    return Math.floor((total * elapsedMonths) / eligibleMonths);
}

export const FISCAL_MONTHS_IN_YEAR = 12;

/**
 * The accrual window as the SERVER resolved it, delivered in the leave-balance response
 * (`data.accrualWindow`). Mirror of wisetech-backend/src/utils/leaveAccrual.AccrualWindowDTO.
 */
export interface ServerAccrualWindow {
    fiscalYear?: string;
    fiscalStartYear: number;
    /** Fiscal months (1=Apr … 12=Mar) the employee is on the books for. */
    months: number[];
    eligibleMonths: number;
    /** Elapsed as of the server's "today" — recomputed here for a picked date. */
    elapsedMonths: number;
    asOf?: string;
}

/** Fiscal month index (1=Apr … 12=Mar) of a 'YYYY-MM-DD' day. */
export const fiscalMonthOfDay = (day: string): number => {
    const m = Number(day.slice(5, 7));
    return m >= 4 ? m - 3 : m + 9;
};

const toDay = (v: unknown): string | null =>
    v == null || v === '' ? null : dayjs(v as any).isValid() ? dayjs(v as any).format('YYYY-MM-DD') : null;

/**
 * Re-measure the server's accrual window as of a chosen day.
 *
 * WHICH months count is decided ONCE, on the server (utils/leaveAccrual): it owns the employment
 * timeline — joining and exit dates, and crucially the REJOIN history, which the browser has never
 * been given. This function only asks how many of those months have begun by the date the employee
 * is picking, which is pure indexing and so cannot drift from policy. Deriving the window here from
 * dateOfJoining/dateOfExit is exactly what used to break: a re-hired employee's primary exit date
 * is the end of an OLD stint, which read as "left years ago" → zero eligible months → the modal
 * quoted a 0 allowance and booked every paid day as unpaid LOP while the server was granting it.
 *
 * FALLBACK — a full fiscal year, never zero. When the server sent no window (older backend), or
 * sent one for a different fiscal year than the date being asked about, the employee is paced across
 * Apr–Mar, which is the behaviour that predates windows entirely. Guessing a NARROWER window from
 * incomplete data is what costs someone their paid leave; guessing a wider one costs nothing, because
 * the per-type balance and the annual cap still bound every request.
 */
export function accrualWindowAsOf(
    window: ServerAccrualWindow | null | undefined,
    fiscalStartYear: number,
    asOf: Date | string = new Date(),
): PacingMonths {
    const asOfDay = toDay(asOf) ?? `${fiscalStartYear + 1}-03-31`;
    const fyFirst = `${fiscalStartYear}-04-01`;
    const fyLast = `${fiscalStartYear + 1}-03-31`;
    const fiscalMonthIndex = asOfDay < fyFirst ? 0 : asOfDay > fyLast ? FISCAL_MONTHS_IN_YEAR : fiscalMonthOfDay(asOfDay);

    const usable =
        window &&
        Array.isArray(window.months) &&
        window.months.length > 0 &&
        Number(window.fiscalStartYear) === fiscalStartYear;
    if (!usable) {
        return { eligibleMonths: FISCAL_MONTHS_IN_YEAR, elapsedMonths: fiscalMonthIndex, fiscalMonthIndex };
    }

    const months = window!.months;
    return {
        eligibleMonths: months.length,
        elapsedMonths:
            asOfDay < fyFirst ? 0 : asOfDay > fyLast ? months.length : months.filter((m) => m <= fiscalMonthIndex).length,
        fiscalMonthIndex,
    };
}

/** The two month-counts a pacing decision needs. Mirror of leaveAccrual.PacingMonths. */
export interface PacingMonths {
    elapsedMonths: number;
    eligibleMonths: number;
    /** Fiscal month (1=Apr … 12=Mar) of the day in question — position in the CALENDAR year. */
    fiscalMonthIndex: number;
}

/**
 * Paid days unlocked so far — mirror of wisetech-backend/src/utils/leaveAccrual.unlockedTillNow,
 * and the ONE figure both the chip and the preview engine compare against.
 *
 * The lesser of two paces: what the fiscal YEAR has handed out (total/12 per month since April) and
 * what the employee's OWN months on the books have. Taking the minimum is what makes the employment
 * window a narrowing of the original rule and never a loosening — a part-year employee whose window
 * has fully elapsed must not suddenly unlock the whole year's entitlement. Identical arithmetic for
 * a full-year employee, whose numbers therefore do not move at all.
 */
export function unlockedTillNow(entitlement: number, pacing: PacingMonths): number {
    return Math.min(
        accruedTillNow(entitlement, pacing.elapsedMonths, pacing.eligibleMonths),
        accruedTillNow(entitlement, pacing.fiscalMonthIndex, FISCAL_MONTHS_IN_YEAR),
    );
}

/** Fiscal year (April start) a 'YYYY-MM-DD' day belongs to — Jan–Mar belong to the FY that began last April. */
export const fiscalStartYearOfDay = (day: string): number => {
    const [y, m] = day.split('-').map(Number);
    return m >= 4 ? y : y - 1;
};

/**
 * Returns the fiscal month index for today's date.
 * @param fiscalStartMonth - Calendar month the fiscal year starts on (1=Jan … 12=Dec).
 *                           Defaults to 4 (April) for backwards compatibility.
 */
export function getCurrentFiscalMonthIndex(fiscalStartMonth: number = 4): number {
    const month = new Date().getMonth() + 1; // 1-based
    return calculateFiscalMonth(month, fiscalStartMonth);
}

/**
 * Returns the leave type name as stored in the DB.
 * No display-level renaming — "Floater Leaves" is shown as "Floater Leaves" everywhere.
 */
export const getLeaveTypeDisplayName = (leaveType: string): string => {
    return leaveType;
};

/**
 * Calculate total weekends between two dates based on branch working days
 */
export const getTotalWeekendsBetweenDates = (
    branchWorkingDays: any,
    startDate: string,
    endDate: string
): number => {
    if (!startDate || !endDate || !branchWorkingDays) return 0;

    const weekendDays = Object.keys(branchWorkingDays).filter(
        day => branchWorkingDays[day] === "0"
    );

    let weekendCount = 0;

    const dayNameMap: { [key: number]: string } = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
        const dayName = dayNameMap[current.getDay()];
        if (weekendDays.includes(dayName)) {
            weekendCount++;
        }
        current.setDate(current.getDate() + 1);
    }

    return weekendCount;
};

/**
 * Calculate total leave days for a leave record (excluding off-days and public holidays).
 * B5: Accepts publicHolidays to match the backend getWorkingDays logic.
 * Accepts workingAndOffDays (branch config) to honour branches where Saturday is a working day.
 * Falls back to hardcoded Sat-Sun exclusion when the config is absent.
 */
export const calculateLeaveDays = (
    leave: any,
    publicHolidays: string[] = [],
    workingAndOffDays: Record<string, string> = {}
): number => {
    // Handle both formats: {dateFrom, dateTo} and {date}
    const startDate = leave.dateFrom || leave.date;
    const endDate = leave.dateTo || leave.date;

    if (!startDate || !endDate) {
        return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let dayCount = 0;

    const dayNameMap: { [key: number]: string } = {
        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday',
    };
    const hasWorkingDaysConfig = Object.keys(workingAndOffDays).length > 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        const dayName = dayNameMap[dayOfWeek];
        const dateStr = date.toISOString().split('T')[0];

        const isOffDay = hasWorkingDaysConfig
            ? workingAndOffDays[dayName] === "0"
            : (dayOfWeek === 0 || dayOfWeek === 6);

        if (!isOffDay && !publicHolidays.includes(dateStr)) {
            dayCount++;
        }
    }

    // Half-day leaves always cost 0.5 of a working day (mirrors the backend's
    // getChargeableLeaveDays). Only applies when the day is a working day (dayCount > 0).
    if (leave.isHalfDay && dayCount > 0) {
        return 0.5;
    }

    return dayCount;
};

/**
 * Calculate leaves taken by type from filtered leaves - ONLY count approved leaves.
 * B5: Accepts publicHolidays so day counting is consistent with backend getWorkingDays.
 * Accepts workingAndOffDays to honour branches where Saturday is a working day.
 */
export const calculateLeavesTakenByType = (
    fiscalYearFilteredLeaves: any[],
    publicHolidays: string[] = [],
    workingAndOffDays: Record<string, string> = {},
    includePending: boolean = false
): Record<string, number> => {
    const filterStatus = includePending ? [Status.Approved, Status.ApprovalNeeded] : [Status.Approved];

    const casualLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === CASUAL_LEAVES && filterStatus.includes(leave.status)
    );
    const annualLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === ANNUAL_LEAVES && filterStatus.includes(leave.status)
    );
    const maternalLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === MATERNAL_LEAVES && filterStatus.includes(leave.status)
    );
    const sickLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === SICK_LEAVES && filterStatus.includes(leave.status)
    );
    const floaterLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === FLOATER_LEAVES && filterStatus.includes(leave.status)
    );
    const unpaidLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === UNPAID_LEAVES && filterStatus.includes(leave.status)
    );

    // Calculate total days for each leave type (not just count of records)
    const casualDaysCount = casualLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);
    const annualDaysCount = annualLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);
    const maternalDaysCount = maternalLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);
    const sickDaysCount = sickLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);
    const floaterDaysCount = floaterLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);
    const unpaidDaysCount = unpaidLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays, workingAndOffDays), 0);

    return {
        [CASUAL_LEAVES]: casualDaysCount,
        [ANNUAL_LEAVES]: annualDaysCount,
        [MATERNAL_LEAVES]: maternalDaysCount,
        [SICK_LEAVES]: sickDaysCount,
        [FLOATER_LEAVES]: floaterDaysCount,
        [UNPAID_LEAVES]: unpaidDaysCount,
    };
};

/**
 * Calculate transferred leaves from approved transfer requests
 */
export const calculateTransferredLeaves = async (
    transferRequests: any[],
    startDateNew: string,
    endDateNew: string
): Promise<Record<string, number>> => {
    const transferredLeaves: Record<string, number> = {};

    // Calculate previous fiscal year end date
    const currentFiscalStart = dayjs(startDateNew);
    const previousFiscalEnd = currentFiscalStart.subtract(1, 'day').format('YYYY-MM-DD');
    const previousFiscalStart = currentFiscalStart.subtract(1, 'year').format('YYYY-MM-DD');

    // Get approved TRANSFER requests (status = 1, NOT ENCASH) from previous fiscal year only
    const approvedTransfers = transferRequests.filter(
        (req: any) => {
            const isApprovedTransfer = req.status === 1 && req.managementType === 'TRANSFER';
            const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
            const isFromPreviousFiscalYear = createdDate >= previousFiscalStart && createdDate <= previousFiscalEnd;

            return isApprovedTransfer && isFromPreviousFiscalYear;
        }
    );

    // Calculate transferred leave counts by type
    approvedTransfers.forEach((transfer: any) => {
        if (transfer.leaveTypeIds && Array.isArray(transfer.leaveTypeIds)) {
            transfer.leaveTypeIds.forEach((leaveTypeItem: any) => {
                const leaveType = leaveTypeItem.leaveType;
                const count = leaveTypeItem.count || 0;
                transferredLeaves[leaveType] = (transferredLeaves[leaveType] || 0) + count;
            });
        }
    });

    return transferredLeaves;
};

/**
 * Days ENCASHED per leave type, straight from the balance summary the server sends.
 *
 * The card and the pacing pool are both drawn from the ENTITLEMENT, not from availableBalance, so an
 * encashed day stayed visible on them long after the server had taken it out of what can be booked.
 *
 * Read, never re-derived: the rule for what counts (CASH, not rejected, not revoked, this fiscal
 * year) lives in the backend's encashedDaysForType, and a second copy of it here is exactly how the
 * screens and the enforcement drift apart.
 */
export const encashedByType = (leavesSummary: any[] = []): Record<string, number> => {
    const encashed: Record<string, number> = {};
    (leavesSummary || []).forEach((summary: any) => {
        const days = Number(summary?.encashedDays) || 0;
        if (summary?.leaveType && days > 0) encashed[summary.leaveType] = days;
    });
    return encashed;
};

/**
 * Check if there's a pending or approved encash/transfer request
 */
export const hasPendingOrApprovedEncashTransfer = async (
    transferRequests: any[],
    startDateNew: string,
    endDateNew: string
): Promise<boolean> => {
    // Get the actual current fiscal year (where today's date falls)
    const todayDate = dayjs().format('YYYY-MM-DD');
    const { startDate: actualCurrentFiscalStart, endDate: actualCurrentFiscalEnd } = await generateFiscalYearFromGivenYear(dayjs());

    // Check if there's a PENDING/APPROVED ENCASH/TRANSFER in the actual current fiscal year (where today is)
    const hasRequestInActualCurrentFiscal = transferRequests.some((req: any) => {
        if (req.managementType !== 'TRANSFER' && req.managementType !== 'CASH') return false;
        if (req.status !== 0 && req.status !== 1) return false;

        const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
        return createdDate >= actualCurrentFiscalStart && createdDate <= actualCurrentFiscalEnd;
    });

    // Check if the viewing fiscal year is current or previous compared to today
    const isViewingCurrentOrPreviousFiscal = endDateNew <= actualCurrentFiscalEnd;

    // Check if there's a request in the fiscal year being viewed
    const hasRequestInViewingFiscal = transferRequests.some((req: any) => {
        if (req.managementType !== 'TRANSFER' && req.managementType !== 'CASH') return false;
        if (req.status !== 0 && req.status !== 1) return false;

        const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
        return createdDate >= startDateNew && createdDate <= endDateNew;
    });

    return (hasRequestInActualCurrentFiscal && isViewingCurrentOrPreviousFiscal) || hasRequestInViewingFiscal;
};

/**
 * Calculate leave balances with pro-rating and transferred leaves
 *
 * @param branchLeaveBalances - Leave balances by type from branch configuration
 * @param transferredLeaves - Leaves transferred from previous fiscal year
 * @param addonLeaveAllowanceCount - Additional leave allowance based on experience
 * @param proRatedMonths - Number of months to use for pro-rating (1-12)
 *                         For mid-year joiners, this is remaining months from join date to FY end
 *                         For employees present since FY start, this is elapsed months
 * @param hasPendingOrApprovedTransfer - Whether there's a pending/approved transfer request
 * @param tenureMonths - Number of months since employee joined the company (for Annual Leaves)
 */
export const calculateLeaveBalances = (
    branchLeaveBalances: Record<string, number>,
    transferredLeaves: Record<string, number>,
    addonLeaveAllowanceCount: number,
    _proRatedMonths: number,
    hasPendingOrApprovedTransfer: boolean,
    _tenureMonths: number = 1
): { balances: Record<string, number>; proRated: Record<string, number> } => {
    const balances: Record<string, number> = {};
    const proRated: Record<string, number> = {};

    // PRO-RATING IS NOT DONE HERE ANY MORE — and must never come back.
    //
    // This function used to re-derive a pro-rated total for Annual and Casual from
    // `proRatedMonths` (months from DOJ to FY end). That was DISPLAY-ONLY: the server stored
    // and enforced the full-year figure, so the card promised a mid-year joiner 9 days while
    // the allocation engine would happily grant 12. The card and the engine disagreed by
    // construction.
    //
    // The backend now pro-rates for real — `leave_balance.totalAllocated` IS the employee's
    // earned entitlement (wisetech-backend/src/utils/leaveAccrual.ts), and `numberOfDays` on
    // the balance API carries it. So the values arriving here are ALREADY pro-rated, and
    // applying the old month-fraction on top would pro-rate a second time: a July joiner's
    // real 9 days would render as floor(9 x 9/12) = 6.
    //
    // `proRated` is still populated (identical to `balances`) because callers index it first
    // and fall back to `balances`; keeping both keys filled leaves every call site working
    // without a coordinated edit. The two parameters that drove the old math are retained and
    // underscore-prefixed so the signature stays stable for existing callers.
    Object.keys(branchLeaveBalances).forEach((leaveType: string) => {
        const totalYearlyDays = branchLeaveBalances[leaveType];
        const transferred = transferredLeaves[leaveType] || 0;
        const total = totalYearlyDays + transferred;
        balances[leaveType] = total;
        proRated[leaveType] = total;
    });

    return { balances, proRated };
};

/**
 * Build leave data for UI display - split into paid and unpaid
 */
export const buildLeaveData = (
    leavesTakenCount: Record<string, number>,
    proRatedBalances: Record<string, number>,
    leaveBalances: Record<string, number>,
    /** Days cashed out this fiscal year, per type — no longer part of the entitlement. */
    encashedLeaves: Record<string, number> = {}
) => {
    // An encashed day has left the balance: the employee was paid for it and can no longer take it.
    // Netting it out of the row's total keeps the card's arithmetic identical to the server's
    // availableBalance (allocated − used − encashed), which is what ApplyLeave books against.
    const entitlement = (type: string, allocated: number) =>
        Math.max(0, allocated - (encashedLeaves[type] || 0));

    const allPaidLeaves = [
        {
            label: ANNUAL_LEAVES,
            used: leavesTakenCount[ANNUAL_LEAVES] || 0,
            total: entitlement(ANNUAL_LEAVES, proRatedBalances[ANNUAL_LEAVES] || leaveBalances[ANNUAL_LEAVES] || 0),
            color: '#1E3A8A',
        },
        {
            label: SICK_LEAVES,
            used: leavesTakenCount[SICK_LEAVES] || 0,
            total: entitlement(SICK_LEAVES, leaveBalances[SICK_LEAVES] || 0),
            color: '#1E3A8A',
        },
        {
            // label: 'Paid Leaves',  // Renamed from Floater Leaves
            label: 'Floater Leaves',  // Renamed from Floater Leaves
            used: leavesTakenCount[FLOATER_LEAVES] || 0,
            total: entitlement(FLOATER_LEAVES, leaveBalances[FLOATER_LEAVES] || 0),
            color: '#1E3A8A',
        },
        {
            label: CASUAL_LEAVES,
            used: leavesTakenCount[CASUAL_LEAVES] || 0,
            total: entitlement(CASUAL_LEAVES, proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0),
            color: '#1E3A8A',
        },
        {
            label: MATERNAL_LEAVES,
            used: leavesTakenCount[MATERNAL_LEAVES] || 0,
            total: entitlement(MATERNAL_LEAVES, proRatedBalances[MATERNAL_LEAVES] || leaveBalances[MATERNAL_LEAVES] || 0),
            color: '#1E3A8A',
        },
    ];

    const paidLeaves = [...allPaidLeaves].sort((a, b) => a.label.localeCompare(b.label));

    // Calculate paid totals
    const totalPaidUsed = paidLeaves.reduce((sum, leave) => sum + leave.used, 0);
    const totalPaidAssigned = paidLeaves.reduce((sum, leave) => sum + leave.total, 0);

    // Unpaid leave total is ALWAYS derived — never read from leaveBalances.
    // leaveBalances is now built from leavesSummary (paid types only from the backend),
    // so leaveBalances[UNPAID_LEAVES] will always be 0/undefined. The correct unpaid
    // total is computed below as: 365 − totalPaidAssigned.
    const TOTAL_YEAR_DAYS = 365;
    const derivedUnpaidAssigned = Math.max(0, TOTAL_YEAR_DAYS - totalPaidAssigned);

    // Always show the Unpaid Leaves row — its total is patched to derivedUnpaidAssigned.
    // Do NOT filter by total > 0 before patching (the row starts at 0 since it's not in
    // leavesSummary, but must always be visible as the derived remainder of the year).
    const unpaidLeaves = [
        {
            label: UNPAID_LEAVES,
            used: leavesTakenCount[UNPAID_LEAVES] || 0,
            total: derivedUnpaidAssigned,   // always derived: 365 − totalPaidAssigned
            color: '#1E3A8A',
        },
    ];

    // Calculate unpaid totals
    const totalUnpaidUsed = unpaidLeaves.reduce((sum, leave) => sum + leave.used, 0);

    // cappedUnpaidLeaves kept for API compat — total is already correct
    const cappedUnpaidLeaves = unpaidLeaves;

    return {
        paidLeaves,
        unpaidLeaves: cappedUnpaidLeaves,
        totalPaidUsed,
        totalPaidAssigned,
        totalUnpaidUsed,
        totalUnpaidAssigned: derivedUnpaidAssigned,
        grandTotalUsed: totalPaidUsed + totalUnpaidUsed,
        grandTotalAssigned: TOTAL_YEAR_DAYS,  // Always 365 — never paid+unpaid sum
    };
};

/**
 * Shape returned by buildCumulativeInputs — the single, authoritative input set for
 * the Cumulative Leave Allowance calculation.
 */
export interface CumulativeInputs {
    /** Sum of full annual allocation for the cumulative-paced paid types (Annual + Casual + Sick + Floater). Excludes Maternal & Unpaid. */
    totalNonMaternalPaidAllocated: number;
    /** Per-type used+pending days (leaveTaken + pendingDays), keyed by leave type. Authoritative, from leave_balance. */
    takenIncludingPendingByType: Record<string, number>;
}

/**
 * Build the canonical inputs for the Cumulative Leave Allowance from the backend
 * `leavesSummary` (the per-employee LeaveBalance DTO — the single source of truth that
 * `recalculateBalance` maintains). Both the dashboard (BalanceProgress) and the Apply-Leave
 * modal (LeaveRequestForm) MUST derive cumulative numbers from this one helper so they can
 * never drift apart.
 *
 * Uses authoritative `numberOfDays` (= totalAllocated, addon already merged for Annual),
 * `leaveTaken` (= usedDays) and `pendingDays` straight from the balance API — matching what
 * the backend cumulative gate enforces (`usedDays + pendingDays`). Only the four
 * cumulative-paced types are counted; Maternal (full allocation from day 1) and Unpaid are
 * intentionally excluded, mirroring calculateCumulativeSummary.
 *
 * @param leavesSummary - The `leavesSummary` array from fetchEmployeeLeaveBalance.
 */
export const buildCumulativeInputs = (leavesSummary: any[] = []): CumulativeInputs => {
    // Match the BACKEND cumulative pool exactly (leaveAllocationService.resolveLeaveContext): EVERY
    // paid type (isPaid !== false, by name not "unpaid") that is NOT Maternal — NOT a hardcoded
    // 4-type whitelist. The old whitelist silently dropped any other paid type (e.g. "Privilege" /
    // "Earned Leaves"), making the FE preview cap looser than the server actually enforces.
    let totalNonMaternalPaidAllocated = 0;
    const takenIncludingPendingByType: Record<string, number> = {};

    (leavesSummary || []).forEach((summary: any) => {
        const leaveType = summary?.leaveType;
        const t = String(leaveType || '').toLowerCase();
        const isPaidType = summary?.isPaid !== false && !t.includes('unpaid');
        if (!isPaidType || t.includes('matern')) return;

        // Encashed days have been paid out — they are not spendable, so they leave the paced pool.
        // Server-reported (leavesSummary.encashedDays) rather than re-derived here, so this can never
        // disagree with the balance the allocation engine enforces against.
        totalNonMaternalPaidAllocated += Math.max(
            0,
            (Number(summary.numberOfDays) || 0) - (Number(summary.encashedDays) || 0),
        );
        takenIncludingPendingByType[leaveType] =
            (Number(summary.leaveTaken) || 0) + (Number(summary.pendingDays) || 0);
    });

    return { totalNonMaternalPaidAllocated, takenIncludingPendingByType };
};

/**
 * Centrally calculates the Cumulative Leave Allowance summary.
 * Used by both BalanceProgress (Dashboard) and LeaveRequestForm (Modal).
 *
 * @param totalPaidAllocated     - Full annual allocation for pro-ratable paid leave types
 *                                 (Annual + Casual + Sick + Floater). Must NOT include
 *                                 Maternal or Unpaid leaves.
 * @param leavesTakenIncludingPending - Days taken (approved + pending) keyed by leave type.
 * @param fiscalStartMonth        - Calendar month the fiscal year starts (1–12). Defaults to 4 (April).
 */
export const calculateCumulativeSummary = (
    totalPaidAllocated: number,
    leavesTakenIncludingPending: Record<string, number>,
    fiscalStartMonth: number = 4,
    accrual?: PacingMonths
) => {
    // Pace across the SERVER-resolved accrual window when we have it. Without one, fall back to the
    // calendar fiscal month over a full 12 — the behaviour that predates windows entirely, and never
    // a narrower guess. This whole branch is itself a fallback: the backend sends `cumulativeSummary`
    // and BalanceProgress prefers it.
    const window: PacingMonths = accrual ?? {
        elapsedMonths: getCurrentFiscalMonthIndex(fiscalStartMonth),
        eligibleMonths: FISCAL_MONTHS_IN_YEAR,
        fiscalMonthIndex: getCurrentFiscalMonthIndex(fiscalStartMonth),
    };
    const allowedTillNow = unlockedTillNow(totalPaidAllocated, window);

    // Sum EVERY paid non-Maternal type that buildCumulativeInputs already collected (name-agnostic) —
    // NOT a hardcoded {Casual, Annual, Sick, Floater} whitelist. The whitelist silently dropped the
    // *usage* of any type whose name didn't exactly match (renamed/re-cased type, or an extra paid
    // type like "Privilege Leaves") while its *allocation* still counted toward allowedTillNow — so
    // `used` came out too low and "Remaining Allowed" showed phantom capacity even after all paid
    // leaves were used. Maternal/Unpaid are already excluded upstream in buildCumulativeInputs, and
    // this now matches the backend pool (leaveAllocationService.resolveLeaveContext) exactly.
    const paidUsed = Object.values(leavesTakenIncludingPending).reduce(
        (sum: number, v) => sum + (Number(v) || 0),
        0,
    );

    const used = Math.round(paidUsed);
    const remaining = Math.max(0, allowedTillNow - used);

    return {
        total: totalPaidAllocated,
        used,
        allowedTillNow,
        remaining
    };
};

/**
 * Calculate summary counters for paid/unpaid leaves
 */
// export const calculateSummaryCounters = (
//     leaves: any[],
//     holidays: number,
//     weekendCount: number
// ) => {
//     const paidLeaveTypes = [
//         "Sick Leaves",
//         "Casual Leaves",
//         // "Annual Leaves",
//         "Maternal Leaves",
//         "Floater Leaves",
//     ];
//     const unpaidLeaveTypes = ["Unpaid Leaves", "Unpaid"];

//     const approvedLeaves = leaves.filter(leave => leave.status === Status.Approved);

//     const paidCount = approvedLeaves.filter(leave =>
//         paidLeaveTypes.includes(leave.leaveOptions?.leaveType || '')
//     ).length;

//     const unpaidCount = approvedLeaves.filter(leave =>
//         unpaidLeaveTypes.includes(leave.leaveOptions?.leaveType || '')
//     ).length;

//     return [
//         { label: "Paid Leaves", value: paidCount },
//         { label: "Unpaid Leaves", value: unpaidCount },
//         { label: "Holidays", value: holidays },
//         { label: "Weekends", value: weekendCount },
//     ];
// };

/**
 * Calculate total available leaves for modals
 */
export const calculateTotalAvailableLeaves = (
    proRatedBalances: Record<string, number>,
    leaveBalances: Record<string, number>,
    leavesTakenCount: Record<string, number>,
    transferredLeavesInCurrentFiscal: Record<string, number> = {},
) => {
    // Calculate available = Total - Taken - BeingTransferred
    const annualAvailable = Math.max(0, (proRatedBalances[ANNUAL_LEAVES] || leaveBalances[ANNUAL_LEAVES] || 0) - (leavesTakenCount[ANNUAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[ANNUAL_LEAVES] || 0));
    const casualAvailable = Math.max(0, (proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0) - (leavesTakenCount[CASUAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[CASUAL_LEAVES] || 0));
    const sickAvailable = Math.max(0, (leaveBalances[SICK_LEAVES] || 0) - (leavesTakenCount[SICK_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[SICK_LEAVES] || 0));
    const floaterAvailable = Math.max(0, (leaveBalances[FLOATER_LEAVES] || 0) - (leavesTakenCount[FLOATER_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[FLOATER_LEAVES] || 0));
    const maternalAvailable = Math.max(0, (proRatedBalances[MATERNAL_LEAVES] || leaveBalances[MATERNAL_LEAVES] || 0) - (leavesTakenCount[MATERNAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[MATERNAL_LEAVES] || 0));

    return {
        totalLeaves: annualAvailable + casualAvailable + sickAvailable + floaterAvailable + maternalAvailable,
        annualLeaves: annualAvailable,
        casualLeaves: casualAvailable,
        sickLeaves: sickAvailable,
        floaterLeaves: floaterAvailable,
        maternalLeaves: maternalAvailable,
    };
};
