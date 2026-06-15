import { fetchEmployeeLeaves } from '@services/employee';
import { transformLeaves } from '@app/pages/employee/attendance/personal/OverviewView';
import dayjs from 'dayjs';
import { ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES, Status } from '@constants/statistics';

const COUNTED_LEAVE_TYPES = [ANNUAL_LEAVES, SICK_LEAVES, FLOATER_LEAVES, CASUAL_LEAVES, MATERNAL_LEAVES];

/**
 * Debug function to check monthly leave usage for a specific employee and month
 */
export const debugMonthlyLeaveUsage = async (
    employeeId: string,
    month: string, // Format: "2024-12" for December 2024
    allowedPerMonth: number
) => {
    try {
        // Fetch employee leaves
        const { data: { leaves } } = await fetchEmployeeLeaves(employeeId);
        const employeeLeavesData = transformLeaves(leaves || []);

        // Filter leaves for the specific month
        const monthLeaves = employeeLeavesData.filter((leave: any) => {
            const leaveFromDate = dayjs(leave.dateFrom);
            const leaveToDate = dayjs(leave.dateTo);

            // Check if leave overlaps with the target month
            const targetMonthStart = dayjs(month + '-01');
            const targetMonthEnd = targetMonthStart.endOf('month');

            return leaveFromDate.isSameOrBefore(targetMonthEnd) &&
                   leaveToDate.isSameOrAfter(targetMonthStart);
        });

        // Group by status and type
        const leaveDetails: any[] = [];
        let totalWorkingDays = 0;

        monthLeaves.forEach((leave: any) => {
            const leaveType = leave.leaveOptions?.leaveType || 'Unknown';
            const isCountedType = COUNTED_LEAVE_TYPES.includes(leaveType);
            const statusName = leave.status === 0 ? 'Pending' : leave.status === 1 ? 'Approved' : 'Rejected';

            // Calculate working days in this month for this leave
            let workingDays = 0;
            const leaveFromDate = dayjs(leave.dateFrom);
            const leaveToDate = dayjs(leave.dateTo);
            const targetMonthStart = dayjs(month + '-01');
            const targetMonthEnd = targetMonthStart.endOf('month');

            let currentDate = leaveFromDate.isAfter(targetMonthStart) ? leaveFromDate : targetMonthStart;
            const endDate = leaveToDate.isBefore(targetMonthEnd) ? leaveToDate : targetMonthEnd;

            while (currentDate.isSameOrBefore(endDate)) {
                const dayOfWeek = currentDate.day();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
                    workingDays++;
                }
                currentDate = currentDate.add(1, 'day');
            }

            // Count towards monthly limit only if counted type and approved/pending
            const countsTowardsLimit = isCountedType && (leave.status === 0 || leave.status === 1);

            if (countsTowardsLimit) {
                totalWorkingDays += workingDays;
            }

            leaveDetails.push({
                id: leave.id,
                type: leaveType,
                from: leave.dateFrom,
                to: leave.dateTo,
                status: statusName,
                workingDaysInMonth: workingDays,
                countsTowardsLimit: countsTowardsLimit ? ' YES' : ' NO',
                reason: !isCountedType ? 'Not a counted type (Unpaid)' :
                        leave.status === 2 ? 'Rejected' :
                        'Counted'
            });
        });

        return {
            totalLeaves: monthLeaves.length,
            totalWorkingDays,
            allowedPerMonth,
            remaining: Math.max(0, allowedPerMonth - totalWorkingDays),
            exceedsLimit: totalWorkingDays > allowedPerMonth,
            details: leaveDetails
        };

    } catch (error) {
        console.error('Error debugging leave usage:', error);
        throw error;
    }
};

/**
 * Quick debug function - just paste employee ID in console
 */
(window as any).debugLeaves = (employeeId: string, allowedPerMonth: number = 2) => {
    const currentMonth = dayjs().format('YYYY-MM');
    return debugMonthlyLeaveUsage(employeeId, currentMonth, allowedPerMonth);
};

