import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES, Status, UNPAID_LEAVES } from "@constants/statistics";
import dayjs from "dayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { useState } from "react";

/**
 * F2: Map internal leave type names (from DB) to their display names.
 * 'Floater Leaves' is marketed to employees as 'Paid Leaves'.
 */
export const getLeaveTypeDisplayName = (leaveType: string): string => {
    if (leaveType === FLOATER_LEAVES) return 'Paid Leaves';
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
 * Calculate total leave days for a leave record (excluding weekends and public holidays).
 * B5: Accepts publicHolidays to match the backend getWorkingDays logic.
 */
export const calculateLeaveDays = (leave: any, publicHolidays: string[] = []): number => {
    // Handle both formats: {dateFrom, dateTo} and {date}
    const startDate = leave.dateFrom || leave.date;
    const endDate = leave.dateTo || leave.date;

    if (!startDate || !endDate) {
        return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let dayCount = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        // Count weekdays that are not public holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !publicHolidays.includes(dateStr)) {
            dayCount++;
        }
    }

    return dayCount;
};

/**
 * Calculate leaves taken by type from filtered leaves - ONLY count approved leaves.
 * B5: Accepts publicHolidays so day counting is consistent with backend getWorkingDays.
 */
export const calculateLeavesTakenByType = (
    fiscalYearFilteredLeaves: any[],
    publicHolidays: string[] = []
): Record<string, number> => {
    const casualLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === CASUAL_LEAVES && leave.status === Status.Approved
    );
    const annualLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === ANNUAL_LEAVES && leave.status === Status.Approved
    );
    const maternalLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === MATERNAL_LEAVES && leave.status === Status.Approved
    );
    const sickLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === SICK_LEAVES && leave.status === Status.Approved
    );
    const floaterLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === FLOATER_LEAVES && leave.status === Status.Approved
    );
    const unpaidLeavesTaken = fiscalYearFilteredLeaves.filter(
        (leave: any) => leave.leaveOptions.leaveType === UNPAID_LEAVES && leave.status === Status.Approved
    );

    // Calculate total days for each leave type (not just count of records)
    const casualDaysCount = casualLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);
    const annualDaysCount = annualLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);
    const maternalDaysCount = maternalLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);
    const sickDaysCount = sickLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);
    const floaterDaysCount = floaterLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);
    const unpaidDaysCount = unpaidLeavesTaken.reduce((total: any, leave: any) => total + calculateLeaveDays(leave, publicHolidays), 0);

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
 * @param allowedPerMonth - Maximum leaves allowed per month (set by admin per employee)
 * @param tenureMonths - Number of months since employee joined the company (for Annual Leaves)
 */
export const calculateLeaveBalances = (
    branchLeaveBalances: Record<string, number>,
    transferredLeaves: Record<string, number>,
    addonLeaveAllowanceCount: number,
    proRatedMonths: number,
    hasPendingOrApprovedTransfer: boolean,
    allowedPerMonth: number = 1,
    tenureMonths: number = 1
): { balances: Record<string, number>; proRated: Record<string, number> } => {
    const monthsInYear = 12;
    const balances: Record<string, number> = {};
    const proRated: Record<string, number> = {};

    // Always calculate and show actual balances in BalanceProgress
    // LeaveRequestForm handles preventing new leave applications when there's a pending/approved transfer
    Object.keys(branchLeaveBalances).forEach((leaveType: string) => {
        const totalYearlyDays = branchLeaveBalances[leaveType];
        const transferred = transferredLeaves[leaveType] || 0;

        // Apply pro-rating for Casual, Annual, and Maternal leaves
        if (leaveType === CASUAL_LEAVES) {
            const monthlyLeave = totalYearlyDays / monthsInYear;
            // B7: Use direct floor — multiply/divide by 10 introduces floating-point errors
            let proRatedLeaves = Math.floor(monthlyLeave * proRatedMonths);
            // Apply allowedPerMonth cap
            proRatedLeaves = Math.min(proRatedLeaves, allowedPerMonth * proRatedMonths);

            proRated[leaveType] = proRatedLeaves + transferred;
            balances[leaveType] = totalYearlyDays + transferred;
        } else if (leaveType === ANNUAL_LEAVES) {
            // FIX: Use backend-provided `totalYearlyDays` with pro-rating rather than hardcoding with tenureMonths
            const monthlyLeave = totalYearlyDays / monthsInYear;
            let proRatedLeaves = Math.floor(monthlyLeave * proRatedMonths);

            // Apply allowedPerMonth cap
            proRatedLeaves = Math.min(proRatedLeaves, allowedPerMonth * proRatedMonths);

            // Add addon leave allowance (experience-based leaves) and transferred leaves
            const totalWithAddon = proRatedLeaves + addonLeaveAllowanceCount;
            proRated[leaveType] = totalWithAddon + transferred;
            balances[leaveType] = totalYearlyDays + addonLeaveAllowanceCount + transferred;
        } else if (leaveType === MATERNAL_LEAVES) {
            // BUG 4 FIX: Maternal leave is a special-purpose leave (e.g. 90 days at once).
            // It must NOT be pro-rated or capped by allowedPerMonth — the employee gets
            // the full yearly allocation available from day 1.
            proRated[leaveType] = totalYearlyDays + transferred;
            balances[leaveType] = totalYearlyDays + transferred;
        } else {
            // For other leave types, no pro-rating, just add transferred
            balances[leaveType] = totalYearlyDays + transferred;
        }
    });

    return { balances, proRated };
};

/**
 * Build leave data for UI display
 */
// export const buildLeaveData = (
//     leavesTakenCount: Record<string, number>,
//     proRatedBalances: Record<string, number>,
//     leaveBalances: Record<string, number>,
//     allowedPerMonth: number = 1
// ) => {
//     // debugger;
//     // console.log("buildLeaveData called with:", { leavesTakenCount, proRatedBalances, leaveBalances });

//     const paidLeaves = [
//         {
//             label: ANNUAL_LEAVES,
//             used: leavesTakenCount[ANNUAL_LEAVES] || 0,
//             total: proRatedBalances[ANNUAL_LEAVES] || leaveBalances[ANNUAL_LEAVES] || 0,
//             color: '#9D4141',
//             allowedPerMonth, // Only for Annual leaves
//             showAllowedPerMonth: true
//         },
//         {
//             label: SICK_LEAVES,
//             used: leavesTakenCount[SICK_LEAVES] || 0,
//             total: leaveBalances[SICK_LEAVES] || 0,
//             color: '#9D4141',
//             showAllowedPerMonth: false // Not applicable for Sick leaves
//         },
//         {
//             label: FLOATER_LEAVES,
//             used: leavesTakenCount[FLOATER_LEAVES] || 0,
//             total: leaveBalances[FLOATER_LEAVES] || 0,
//             color: '#9D4141',
//             showAllowedPerMonth: false // Not applicable for Floater leaves
//         },
//         {
//             label: CASUAL_LEAVES,
//             used: leavesTakenCount[CASUAL_LEAVES] || 0,
//             total: proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0,
//             color: '#9D4141',
//             allowedPerMonth, // Only for Casual leaves
//             showAllowedPerMonth: true
//         },
//         {
//             label: MATERNAL_LEAVES,
//             used: leavesTakenCount[MATERNAL_LEAVES] || 0,
//             total: proRatedBalances[MATERNAL_LEAVES] || leaveBalances[MATERNAL_LEAVES] || 0,
//             color: '#9D4141',
//             allowedPerMonth, // Only for Maternal leaves
//             showAllowedPerMonth: true
//         },

//     ];
//     const unpaidLeaves = [
//         {
//             label: UNPAID_LEAVES,
//             used: leavesTakenCount[UNPAID_LEAVES] || 0,
//             total: leaveBalances[UNPAID_LEAVES] || 0,
//             color: '#9D4141',
//             showAllowedPerMonth: false // Not applicable for Unpaid leaves
//         },
//     ];

//     return {paidLeaves, unpaidLeaves};
// };

/**
 * Build leave data for UI display - split into paid and unpaid
 */
export const buildLeaveData = (
    leavesTakenCount: Record<string, number>,
    proRatedBalances: Record<string, number>,
    leaveBalances: Record<string, number>,
    allowedPerMonth: number = 1
) => {
    const allPaidLeaves = [
        {
            label: ANNUAL_LEAVES,
            used: leavesTakenCount[ANNUAL_LEAVES] || 0,
            total: proRatedBalances[ANNUAL_LEAVES] || leaveBalances[ANNUAL_LEAVES] || 0,
            color: '#9D4141',
            allowedPerMonth,
            showAllowedPerMonth: true
        },
        {
            label: SICK_LEAVES,
            used: leavesTakenCount[SICK_LEAVES] || 0,
            total: leaveBalances[SICK_LEAVES] || 0,
            color: '#9D4141',
            showAllowedPerMonth: false
        },
        {
            label: 'Paid Leaves',  // Renamed from Floater Leaves
            used: leavesTakenCount[FLOATER_LEAVES] || 0,
            total: leaveBalances[FLOATER_LEAVES] || 0,
            color: '#9D4141',
            showAllowedPerMonth: false
        },
        {
            label: CASUAL_LEAVES,
            used: leavesTakenCount[CASUAL_LEAVES] || 0,
            total: proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0,
            color: '#9D4141',
            allowedPerMonth,
            showAllowedPerMonth: true
        },
        {
            label: MATERNAL_LEAVES,
            used: leavesTakenCount[MATERNAL_LEAVES] || 0,
            total: proRatedBalances[MATERNAL_LEAVES] || leaveBalances[MATERNAL_LEAVES] || 0,
            color: '#9D4141',
            allowedPerMonth,
            showAllowedPerMonth: true
        },
    ];

    // Hide leaves where total = 0 (not allocated)
    const paidLeaves = allPaidLeaves.filter(leave => leave.total > 0);

    // Calculate paid totals
    const totalPaidUsed = paidLeaves.reduce((sum, leave) => sum + leave.used, 0);
    const totalPaidAssigned = paidLeaves.reduce((sum, leave) => sum + leave.total, 0);

    const allUnpaidLeaves = [
        {
            label: UNPAID_LEAVES,
            used: leavesTakenCount[UNPAID_LEAVES] || 0,
            total: leaveBalances[UNPAID_LEAVES] || 0,
            color: '#9D4141',
            showAllowedPerMonth: false
        },
    ];

    // Hide leaves where total = 0 (not allocated)
    const unpaidLeaves = allUnpaidLeaves.filter(leave => leave.total > 0);

    // Calculate unpaid totals
    const totalUnpaidUsed = unpaidLeaves.reduce((sum, leave) => sum + leave.used, 0);
    const totalUnpaidAssigned = unpaidLeaves.reduce((sum, leave) => sum + leave.total, 0);

    return {
        paidLeaves,
        unpaidLeaves,
        totalPaidUsed,
        totalPaidAssigned,
        totalUnpaidUsed,
        totalUnpaidAssigned,
        grandTotalUsed: totalPaidUsed + totalUnpaidUsed,
        grandTotalAssigned: totalPaidAssigned + totalUnpaidAssigned,
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
    // discretionaryLeaveBoolean: boolean,
    // discretionaryLeaveBalance: number
) => {
    // Calculate available = Total - Taken - BeingTransferred
    const annualAvailable = Math.max(0, (proRatedBalances[ANNUAL_LEAVES] || leaveBalances[ANNUAL_LEAVES] || 0) - (leavesTakenCount[ANNUAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[ANNUAL_LEAVES] || 0));
    const casualAvailable = Math.max(0, (proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0) - (leavesTakenCount[CASUAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[CASUAL_LEAVES] || 0));
    const sickAvailable = Math.max(0, (leaveBalances[SICK_LEAVES] || 0) - (leavesTakenCount[SICK_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[SICK_LEAVES] || 0));
    const floaterAvailable = Math.max(0, (leaveBalances[FLOATER_LEAVES] || 0) - (leavesTakenCount[FLOATER_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[FLOATER_LEAVES] || 0));
    const maternalAvailable = Math.max(0, (proRatedBalances[MATERNAL_LEAVES] || leaveBalances[MATERNAL_LEAVES] || 0) - (leavesTakenCount[MATERNAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[MATERNAL_LEAVES] || 0));

    // Treat discretionary casual leaves as part of the total casual bucket before subtracting used/transfer amounts
    // const discretionaryExtra = discretionaryLeaveBoolean === true ? Number(discretionaryLeaveBalance ?? 0) : 0;
    // const casualBaseTotal = proRatedBalances[CASUAL_LEAVES] || leaveBalances[CASUAL_LEAVES] || 0;
    // const casualCombinedTotal = casualBaseTotal + discretionaryExtra;
    // const casualAvailable = Math.max(0, casualCombinedTotal - (leavesTakenCount[CASUAL_LEAVES] || 0) - (transferredLeavesInCurrentFiscal[CASUAL_LEAVES] || 0));

    return {
        totalLeaves: annualAvailable + casualAvailable + sickAvailable + floaterAvailable + maternalAvailable,
        annualLeaves: annualAvailable,
        casualLeaves: casualAvailable,
        sickLeaves: sickAvailable,
        floaterLeaves: floaterAvailable,
        maternalLeaves: maternalAvailable,
    };
};
