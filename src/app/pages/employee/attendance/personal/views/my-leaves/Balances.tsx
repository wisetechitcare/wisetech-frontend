import { useCallback, useEffect, useMemo } from "react";
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { ILeaveSummary, savePersonalLeavesSummary } from "@redux/slices/leaves";
import { fetchEmployeeLeaveBalance } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

function Balances() {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const personalLeaveBalance = useSelector((state: RootState) => state.leaves.personalLeavesSummary);
    const dispatch = useDispatch();

    const refreshBalances = useCallback(async () => {
        if (!employeeIdCurrent) return;
        try {
            const { data: { leavesSummary } } = await fetchEmployeeLeaveBalance(employeeIdCurrent);
            dispatch(savePersonalLeavesSummary(leavesSummary));
        } catch (err) {
            console.error('Error refreshing leave balances:', err);
        }
    }, [employeeIdCurrent, dispatch]);

    useEffect(() => {
        refreshBalances();
    }, [refreshBalances]);

    useEventBus(EVENT_KEYS.leaveRequestCreated, refreshBalances);
    useEventBus(EVENT_KEYS.leaveRequestUpdated, refreshBalances);
    useEventBus(EVENT_KEYS.leaveOptionsUpdated, refreshBalances);
    useEventBus(EVENT_KEYS.addonLeavesAllowanceUpdated, refreshBalances);
    const mappedData = personalLeaveBalance.map((leave: ILeaveSummary) => ({
        types: leave.leaveType,
        total: leave.numberOfDays,
        remaining: leave.numberOfDays - leave.leaveTaken,
        used: leave.leaveTaken,
    }))
    const columns = useMemo<ColumnDef<{ types: string; total: number; used: number; remaining: number }, any>[]>(() => [
        { accessorKey: "types", header: "Types" },
        { accessorKey: "total", header: "Total", meta: { exportType: "number" } },
        { accessorKey: "used", header: "Used", meta: { exportType: "number" } },
        { accessorKey: "remaining", header: "Remaining", meta: { exportType: "number" } },
    ], []);

    return (
        <>
            <DataTable
                caption="Leave Balances"
                columns={columns}
                data={mappedData}
                getRowId={(_r, i) => String(i)}
                stateKey="attendance.leaveBalances"
                groupableColumns={false}
                tools={false}
                searchPlaceholder="Search balances…"
            />
        </>
    );
}

export default Balances;
