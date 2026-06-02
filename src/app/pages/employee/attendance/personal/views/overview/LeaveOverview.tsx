import { savePersonalLeavesSummary } from "@redux/slices/leaves";
import { RootState } from "@redux/store";
import { fetchEmployeeLeaveBalance } from "@services/employee";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
interface LeaveStats {
    type: string;
    count: number;
}

function LeaveOverview() {
    const [stats, setStats] = useState<LeaveStats[]>([]);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const leaves = useSelector((state: RootState) => state.attendanceStats.filteredLeaves);
    const dispatch = useDispatch();

    const fetchLeaveStats = useCallback(async () => {
        if (!employeeId) return;
        try {
            const stats: LeaveStats[] = [];
            const { data: { leavesTaken, totalLeaves, leavesSummary } } = await fetchEmployeeLeaveBalance(employeeId);
            stats.push({ type: "Total Leaves", count: totalLeaves });
            stats.push({ type: "Leaves Taken", count: leavesTaken });
            stats.push({ type: "Leave Remaining", count: totalLeaves - leavesTaken });
            setStats(stats);
            dispatch(savePersonalLeavesSummary(leavesSummary));
        } catch (err) {
            console.error('Error fetching leave stats:', err);
        }
    }, [employeeId, dispatch]);

    useEffect(() => {
        fetchLeaveStats();
    }, [employeeId, leaves, fetchLeaveStats]);

    useEventBus(EVENT_KEYS.leaveRequestCreated, fetchLeaveStats);
    useEventBus(EVENT_KEYS.leaveRequestUpdated, fetchLeaveStats);
    useEventBus(EVENT_KEYS.leaveOptionsUpdated, fetchLeaveStats);
    useEventBus(EVENT_KEYS.addonLeavesAllowanceUpdated, fetchLeaveStats);

    return (
        <>
            {stats.map((stat: LeaveStats, index: number) => (
                <div className={`d-flex align-content-center justify-content-between mb-1 ${index !== stats.length ? 'mb-1' : ''}`} key={index}>
                    <div className="text-body">{stat.type}</div>
                    <div className="mx-2">{stat.count}</div>
                </div>
            ))}
        </>
    );
}

export default LeaveOverview;