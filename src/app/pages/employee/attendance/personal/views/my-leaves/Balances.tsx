import { ILeaveBalance } from "@models/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useCallback, useEffect, useMemo } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
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
    const columns = useMemo<MRT_ColumnDef<ILeaveBalance>[]>(() => [
        {
            accessorKey: "types",
            header: "Types",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "total",
            header: "Total",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "used",
            header: "Used",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "remaining",
            header: "Remaining",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
    ], []);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={mappedData}
                hideFilters={true}
                hideExportCenter={true}
                tableName="Leave Balances" employeeId={employeeIdCurrent}/>
        </>
    );
}

export default Balances;