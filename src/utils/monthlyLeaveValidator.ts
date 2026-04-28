import dayjs from 'dayjs';
import { fetchCompleteLeaveTrack } from '@services/employee';
import {
    ANNUAL_LEAVES,
    SICK_LEAVES,
    FLOATER_LEAVES,
    CASUAL_LEAVES,
    MATERNAL_LEAVES,
    Status
} from '@constants/statistics';

/**
 * Interface for validation result
 */
export interface MonthlyLeaveValidationResult {
    isValid: boolean;
    exceededMonths: {
        month: string;
        monthName: string;
        alreadyTaken: number;
        requesting: number;
        total: number;
        limit: number;
    }[];
    errorMessage?: string;
}

/**
 * Leave types that count towards the monthly limit
 */
const COUNTED_LEAVE_TYPES = [
    ANNUAL_LEAVES,
    SICK_LEAVES,
    FLOATER_LEAVES,
    CASUAL_LEAVES,
    MATERNAL_LEAVES
];

/**
 * Calculate how many working days are being requested in each month
 * Returns a map of month (YYYY-MM) to number of working days
 */
const calculateRequestedDaysPerMonth = (
    dateFrom: string,
    dateTo: string
): Record<string, number> => {
    const monthlyRequestedLeaves: Record<string, number> = {};
    let currentDate = dayjs(dateFrom);
    const endDate = dayjs(dateTo);

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const monthKey = currentDate.format('YYYY-MM');
        const dayOfWeek = currentDate.day();

        // Count only working days (exclude weekends)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            monthlyRequestedLeaves[monthKey] = (monthlyRequestedLeaves[monthKey] || 0) + 1;
        }

        currentDate = currentDate.add(1, 'day');
    }

    return monthlyRequestedLeaves;
};

/**
 * Calculate how many leaves (working days) the employee has already taken/pending per month
 * Includes both approved and pending leaves for all counted leave types
 */
const calculateTakenDaysPerMonth = (
    employeeLeavesData: any[]
): Record<string, number> => {
    const monthlyTakenLeaves: Record<string, number> = {};

    employeeLeavesData
        .filter((leave: any) => {
            const isCountedType = COUNTED_LEAVE_TYPES.includes(leave.leaveOptions?.leaveType);
            const isApprovedOrPending = leave.status === Status.Approved || leave.status === Status.ApprovalNeeded;
            return isCountedType && isApprovedOrPending;
        })
        .forEach((leave: any) => {
            const leaveFromDate = dayjs(leave.dateFrom);
            const leaveToDate = dayjs(leave.dateTo);
            let leaveDate = leaveFromDate;

            while (leaveDate.isBefore(leaveToDate) || leaveDate.isSame(leaveToDate, 'day')) {
                const monthKey = leaveDate.format('YYYY-MM');
                const dayOfWeek = leaveDate.day();

                // Count only working days
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    monthlyTakenLeaves[monthKey] = (monthlyTakenLeaves[monthKey] || 0) + 1;
                }

                leaveDate = leaveDate.add(1, 'day');
            }
        });

    return monthlyTakenLeaves;
};

/**
 * Validates if an employee can take leave based on monthly limit
 *
 * @param employeeId - The ID of the employee
 * @param dateFrom - Start date of the leave request
 * @param dateTo - End date of the leave request
 * @param allowedPerMonth - Maximum leaves allowed per month (combined across all paid leave types)
 * @returns Validation result with details about exceeded months
 */
export const validateMonthlyLeaveLimit = async (
    employeeId: string,
    dateFrom: string,
    dateTo: string,
    allowedPerMonth: number
): Promise<MonthlyLeaveValidationResult> => {
    try {
        // Fetch employee's complete leave track using the comprehensive function
        const completeLeaveTrack = await fetchCompleteLeaveTrack(employeeId);

        if (completeLeaveTrack.hasError || !completeLeaveTrack.data) {
            console.error('[MonthlyLeaveValidator] Failed to fetch complete leave track');
            throw new Error('Failed to fetch employee leave data');
        }

        // Use the all leaves from the complete track
        const employeeLeavesData = completeLeaveTrack.data.leaves.all || [];


        // Count approved and pending leaves separately for clarity
        const approvedCount = employeeLeavesData.filter((l: any) => l.status === Status.Approved).length;
        const pendingCount = employeeLeavesData.filter((l: any) => l.status === Status.ApprovalNeeded).length;
        const rejectedCount = employeeLeavesData.filter((l: any) => l.status === Status.Rejected).length;


        // Calculate leaves being requested per month
        const requestedPerMonth = calculateRequestedDaysPerMonth(dateFrom, dateTo);

        // Calculate leaves already taken/pending per month
        const takenPerMonth = calculateTakenDaysPerMonth(employeeLeavesData);

        // Check each month for violations
        const exceededMonths: MonthlyLeaveValidationResult['exceededMonths'] = [];

        for (const monthKey in requestedPerMonth) {
            const requestedInMonth = requestedPerMonth[monthKey];
            const takenInMonth = takenPerMonth[monthKey] || 0;
            const totalInMonth = requestedInMonth + takenInMonth;

            if (totalInMonth > allowedPerMonth) {
                const monthName = dayjs(monthKey + '-01').format('MMMM YYYY');
                exceededMonths.push({
                    month: monthKey,
                    monthName,
                    alreadyTaken: takenInMonth,
                    requesting: requestedInMonth,
                    total: totalInMonth,
                    limit: allowedPerMonth
                });
            }
        }

        // Build result
        if (exceededMonths.length > 0) {
            // Build professional HTML-formatted error message
            let errorMessage = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding: 16px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 8px; border-left: 4px solid #dc2626;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #991b1b;">Monthly Leave Limit Exceeded</h3>
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: #7f1d1d;">Your leave request cannot be processed at this time</p>
                        </div>
                    </div>
            `;

            exceededMonths.forEach((month, index) => {
                if (index > 0) {
                    errorMessage += '<div style="height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent); margin: 24px 0;"></div>';
                }

                const remainingLeaves = month.limit - month.alreadyTaken;

                errorMessage += `
                    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span style="font-size: 16px; font-weight: 600; color: #374151;">${month.monthName}</span>
                            </div>
                            <div style="background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                                Limit: ${month.limit} ${month.limit === 1 ? 'leave' : 'leaves'}/month
                            </div>
                        </div>
                `;

                // Special message when limit is already full (remaining = 0)
                if (remainingLeaves === 0) {
                    errorMessage += `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: start; gap: 12px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#dc2626" style="flex-shrink: 0; margin-top: 2px;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2"></line>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2"></line>
                                </svg>
                                <div style="flex: 1;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">Leave Quota Exhausted</p>
                                    <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6;">
                                        You have already utilized <strong>${month.alreadyTaken} ${month.alreadyTaken === 1 ? 'leave' : 'leaves'}</strong> in ${month.monthName},
                                        which meets your monthly allocation. No additional leaves can be requested this month.
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (month.alreadyTaken > 0) {
                    errorMessage += `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                            <div style="display: grid; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f0fdf4; border-radius: 4px; border-left: 3px solid #22c55e;">
                                    <span style="font-size: 13px; color: #166534; font-weight: 500;">Currently Used</span>
                                    <span style="font-size: 16px; font-weight: 700; color: #15803d;">${month.alreadyTaken} ${month.alreadyTaken === 1 ? 'leave' : 'leaves'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                                    <span style="font-size: 13px; color: #92400e; font-weight: 500;">Requesting Now</span>
                                    <span style="font-size: 16px; font-weight: 700; color: #b45309;">+ ${month.requesting} ${month.requesting === 1 ? 'leave' : 'leaves'}</span>
                                </div>
                                <div style="height: 1px; background: #e5e7eb;"></div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #fee2e2; border-radius: 4px; border-left: 3px solid #dc2626;">
                                    <span style="font-size: 13px; color: #991b1b; font-weight: 600;">Total Would Be</span>
                                    <span style="font-size: 18px; font-weight: 700; color: #dc2626;">= ${month.total} ${month.total === 1 ? 'leave' : 'leaves'}</span>
                                </div>
                            </div>
                        </div>
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px;">
                            <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12" stroke="white" stroke-width="2"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8" stroke="white" stroke-width="2"></line>
                                </svg>
                                <strong>Available:</strong> You can request up to <strong>${remainingLeaves} more ${remainingLeaves === 1 ? 'leave' : 'leaves'}</strong> in ${month.monthName}
                            </p>
                        </div>
                    `;
                } else {
                    errorMessage += `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fef2f2; border-radius: 4px; border-left: 3px solid #dc2626; margin-bottom: 12px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <div style="flex: 1;">
                                    <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                        Your request for <strong style="color: #dc2626;">${month.requesting} ${month.requesting === 1 ? 'leave' : 'leaves'}</strong>
                                        exceeds the monthly limit of <strong style="color: #dc2626;">${month.limit} ${month.limit === 1 ? 'leave' : 'leaves'}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px;">
                            <p style="margin: 0; font-size: 14px; color: #1e40af;">
                                <strong>Action Required:</strong> Please adjust your request to ${month.limit} or fewer leaves for this month
                            </p>
                        </div>
                    `;
                }

                errorMessage += '</div>';
            });

            errorMessage += `
                    <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                            <strong style="color: #475569;">Note:</strong> The monthly limit applies to all paid leave types combined
                            (Annual, Sick, Casual, Floater, and Maternal leaves). Plan your leaves accordingly across the month.
                        </p>
                    </div>
                </div>
            `;

            return {
                isValid: false,
                exceededMonths,
                errorMessage
            };
        }

        return {
            isValid: true,
            exceededMonths: []
        };

    } catch (error) {
        console.error('[MonthlyLeaveValidator] Validation error:', error);

        return {
            isValid: false,
            exceededMonths: [],
            errorMessage: 'Unable to validate monthly leave limit. Please try again.'
        };
    }
};

/**
 * Get current month's leave usage for display purposes
 * Returns statistics about the current month only
 */
export const getCurrentMonthLeaveUsage = async (
    employeeId: string,
    allowedPerMonth: number
): Promise<{
    hasError: boolean;
    data: {
        currentMonth: string;
        monthName: string;
        used: number;
        limit: number;
        remaining: number;
        percentage: number;
    } | null;
}> => {
    try {
        // Fetch employee's complete leave track using the comprehensive function
        const completeLeaveTrack = await fetchCompleteLeaveTrack(employeeId);

        if (completeLeaveTrack.hasError || !completeLeaveTrack.data) {
            console.error('[MonthlyLeaveValidator] Failed to fetch complete leave track');
            return {
                hasError: true,
                data: null
            };
        }

        // Use the all leaves from the complete track
        const employeeLeavesData = completeLeaveTrack.data.leaves.all || [];

        const currentMonth = dayjs().format('YYYY-MM');
        const monthName = dayjs().format('MMMM YYYY');

        const takenPerMonth = calculateTakenDaysPerMonth(employeeLeavesData);
        const used = takenPerMonth[currentMonth] || 0;
        const remaining = Math.max(0, allowedPerMonth - used);
        const percentage = (used / allowedPerMonth) * 100;

        return {
            hasError: false,
            data: {
                currentMonth,
                monthName,
                used,
                limit: allowedPerMonth,
                remaining,
                percentage
            }
        };
    } catch (error) {
        console.error('[MonthlyLeaveValidator] Error getting current month usage:', error);
        return {
            hasError: true,
            data: null
        };
    }
};
