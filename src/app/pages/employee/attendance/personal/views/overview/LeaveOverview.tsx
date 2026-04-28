import { savePersonalLeavesSummary } from "@redux/slices/leaves";
import { RootState } from "@redux/store";
import { fetchEmployeeLeaveBalance } from "@services/employee";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
interface LeaveStats {
    type: string;
    count: number;
}

function LeaveOverview() {
    const [stats, setStats] = useState<LeaveStats[]>([]);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const leaves = useSelector((state: RootState) => state.attendanceStats.filteredLeaves);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!employeeId) return;

        async function fetchLeaveStats() {
            const stats: LeaveStats[] = [];
            const { data: { leavesTaken, totalLeaves, leavesSummary } } = await fetchEmployeeLeaveBalance(employeeId);

            stats.push({ type: "Total Leaves", count: totalLeaves });
            stats.push({ type: "Leaves Taken", count: leaves.length });
            stats.push({ type: "Leave Remaining", count: totalLeaves - leaves.length! });

            setStats(stats);
            dispatch(savePersonalLeavesSummary(leavesSummary));
        }

        fetchLeaveStats();
    }, [employeeId, leaves]);

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